/**
 * Language detection for syntax highlighting
 *
 * Maps file extensions to Shiki-compatible language identifiers.
 * Shiki handles language loading internally, so we just need to
 * return the correct language name.
 */

const filenameRegex = [
  // JavaScript/TypeScript family
  { lang: "javascript", regex: /\.js$/i },
  { lang: "jsx", regex: /\.jsx$/i },
  { lang: "typescript", regex: /\.ts$/i },
  { lang: "tsx", regex: /\.tsx$/i },

  // Data formats
  { lang: "json", regex: /\.json$|.babelrc$/i },
  { lang: "yaml", regex: /\.yaml$|.yml$/i },
  { lang: "toml", regex: /\.toml$/i },
  { lang: "ini", regex: /\.ini$|.editorconfig$/i },

  // Web technologies
  { lang: "html", regex: /\.html$|\.htm$/i },
  { lang: "xml", regex: /\.xml$|\.svg$|\.mathml$/i },
  { lang: "css", regex: /\.css$/i },
  { lang: "less", regex: /\.less$/i },
  { lang: "scss", regex: /\.scss$/i },
  { lang: "sass", regex: /\.sass$/i },

  // Shell/scripts
  { lang: "bash", regex: /\.sh$|\.bash$/i },
  { lang: "powershell", regex: /\.ps1$|\.psm1$/i },
  { lang: "bat", regex: /\.bat$|\.cmd$/i },

  // Popular languages
  { lang: "python", regex: /\.py$/i },
  { lang: "ruby", regex: /\.rb$/i },
  { lang: "rust", regex: /\.rs$/i },
  { lang: "go", regex: /\.go$/i },
  { lang: "java", regex: /\.java$/i },
  { lang: "kotlin", regex: /\.kt$|\.kts$/i },
  { lang: "scala", regex: /\.scala$/i },
  { lang: "swift", regex: /\.swift$/i },
  { lang: "dart", regex: /\.dart$/i },

  // C family
  { lang: "c", regex: /\.c$|\.h$/i },
  { lang: "cpp", regex: /\.cpp$|\.cc$|\.cxx$|\.hpp$/i },
  { lang: "csharp", regex: /\.cs$/i },
  { lang: "objective-c", regex: /\.m$|\.mm$/i },

  // Functional languages
  { lang: "haskell", regex: /\.hs$/i },
  { lang: "clojure", regex: /\.clj$|\.cljs$|\.cljc$/i },
  { lang: "fsharp", regex: /\.fs$|\.fsx$/i },
  { lang: "scheme", regex: /\.scm$|\.ss$/i },
  { lang: "lisp", regex: /\.lisp$|\.lsp$/i },
  { lang: "ocaml", regex: /\.ml$|\.mli$/i },

  // Other languages
  { lang: "php", regex: /\.php$/i },
  { lang: "perl", regex: /\.pl$|\.pm$/i },
  { lang: "lua", regex: /\.lua$/i },
  { lang: "r", regex: /\.r$/i },
  { lang: "groovy", regex: /\.groovy$/i },
  { lang: "coffeescript", regex: /\.coffee$/i },
  { lang: "elixir", regex: /\.ex$|\.exs$/i },
  { lang: "erlang", regex: /\.erl$/i },

  // Query/Database
  { lang: "sql", regex: /\.sql$/i },
  { lang: "graphql", regex: /\.graphql$|\.gql$/i },

  // DevOps/Config
  { lang: "dockerfile", regex: /dockerfile$/i },
  { lang: "nginx", regex: /nginx\.conf$/i },

  // Documentation
  { lang: "markdown", regex: /\.md$|\.mdx$/i },
  { lang: "latex", regex: /\.tex$/i },

  // Assembly/Low-level
  { lang: "asm", regex: /\.asm$|\.s$/i },
  { lang: "wasm", regex: /\.wasm$/i },

  // Template languages
  { lang: "handlebars", regex: /\.hbs$|\.handlebars$/i },
  { lang: "pug", regex: /\.pug$/i },
  { lang: "vue", regex: /\.vue$/i },
  { lang: "svelte", regex: /\.svelte$/i },

  // Diff
  { lang: "diff", regex: /\.diff$|\.patch$/i },

  // Misc
  { lang: "solidity", regex: /\.sol$/i },
  { lang: "vb", regex: /\.vb$/i },

  // fallback to JavaScript for unknown files
  { lang: "javascript", regex: /.*/i },
];

export function getLanguage(filename) {
  return filenameRegex.find((x) => x.regex.test(filename)).lang;
}

/**
 * No-op function for backward compatibility.
 * Shiki handles language loading internally.
 * @deprecated No longer needed with Shiki-based tokenization
 */
export function loadLanguage(lang) {
  return Promise.resolve();
}
