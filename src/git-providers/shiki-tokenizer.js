/**
 * Shiki-based syntax tokenizer using @pierre/diffs
 *
 * This module replaces the Prism-based tokenizer with Shiki for better
 * syntax highlighting quality and performance.
 */

import {
  getSharedHighlighter,
  preloadHighlighter,
  disposeHighlighter,
} from "@pierre/diffs";

const newlineRe = /\r\n|\r|\n/;

// Track initialization state
let isInitialized = false;
let initPromise = null;

// Commonly used languages for preloading
const PRELOAD_LANGUAGES = [
  "javascript",
  "typescript",
  "jsx",
  "tsx",
  "json",
  "html",
  "css",
  "python",
  "java",
  "go",
  "rust",
  "c",
  "cpp",
  "markdown",
];

// Map Prism language names to Shiki language names where they differ
const LANGUAGE_MAP = {
  markup: "html",
  clike: "c",
  js: "javascript",
  ts: "typescript",
  py: "python",
  rb: "ruby",
  sh: "bash",
  shell: "bash",
  yml: "yaml",
  md: "markdown",
  objectivec: "objective-c",
  objc: "objective-c",
};

/**
 * Map a Prism language name to Shiki equivalent
 */
function mapLanguage(lang) {
  if (!lang) return "text";
  const mapped = LANGUAGE_MAP[lang.toLowerCase()];
  return mapped || lang.toLowerCase();
}

/**
 * Initialize the Shiki highlighter
 * This should be called before first tokenization
 */
export async function initHighlighter() {
  if (isInitialized) {
    return;
  }

  if (initPromise) {
    return initPromise;
  }

  initPromise = preloadHighlighter({
    themes: ["night-owl"],
    langs: PRELOAD_LANGUAGES,
  })
    .then(() => {
      isInitialized = true;
    })
    .catch((err) => {
      console.warn("Failed to initialize Shiki highlighter:", err);
      // Allow fallback to plain text tokenization
      isInitialized = true;
    });

  return initPromise;
}

/**
 * Dispose the highlighter to free memory
 */
export function dispose() {
  if (isInitialized) {
    disposeHighlighter();
    isInitialized = false;
    initPromise = null;
  }
}

/**
 * Convert Shiki tokens to our internal format
 * Shiki tokens have { color, content, fontStyle? }
 * We convert to { type: 'shiki', color, content, fontStyle? }
 */
function convertShikiTokens(shikiLines) {
  return shikiLines.map((line) => {
    return line.map((token) => ({
      type: "shiki",
      color: token.color || "#d6deeb",
      content: token.content,
      fontStyle: token.fontStyle,
    }));
  });
}

/**
 * Create plain text tokens (fallback when Shiki fails)
 */
function createPlainTextTokens(code) {
  const lines = code.split(newlineRe);
  return lines.map((lineContent) => [
    {
      type: "plain",
      color: "#d6deeb",
      content: lineContent,
    },
  ]);
}

/**
 * Tokenize code using Shiki
 *
 * @param {string} code - Source code to tokenize
 * @param {string} language - Language identifier (Prism or Shiki name)
 * @returns {Promise<Array>} Array of lines, each containing token arrays
 */
export default async function tokenize(code, language = "javascript") {
  // Ensure highlighter is initialized
  if (!isInitialized) {
    await initHighlighter();
  }

  const mappedLang = mapLanguage(language);

  try {
    const highlighter = getSharedHighlighter();

    // Use codeToTokens for raw token access
    const result = highlighter.codeToTokens(code, {
      lang: mappedLang,
      theme: "night-owl",
    });

    // result.tokens is array of lines, each line is array of tokens
    return convertShikiTokens(result.tokens);
  } catch (err) {
    console.warn(
      `Shiki tokenization failed for language "${mappedLang}":`,
      err,
    );
    // Fallback to plain text tokens
    return createPlainTextTokens(code);
  }
}

/**
 * Synchronous tokenization fallback (for compatibility during transition)
 * Returns plain text tokens without syntax highlighting
 */
export function tokenizeSync(code, language = "javascript") {
  return createPlainTextTokens(code);
}
