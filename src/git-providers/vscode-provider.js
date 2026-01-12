import { getLanguage } from "./language-detector";
import { getSlides, getChanges } from "./differ";
import { initHighlighter } from "./shiki-tokenizer";

const vscode = window.vscode;

function getPath() {
  return window._PATH;
}

function showLanding() {
  return false;
}

function getCommits(path, last) {
  return new Promise((resolve, reject) => {
    window.addEventListener(
      "message",
      (event) => {
        const commits = event.data;
        commits.forEach((c) => (c.date = new Date(c.date)));
        resolve(commits);
      },
      { once: true },
    );

    vscode.postMessage({
      command: "commits",
      params: {
        path,
        last,
      },
    });
  });
}

async function getVersions(last) {
  const path = getPath();
  const lang = getLanguage(path);

  // Initialize Shiki highlighter (no-op if already initialized)
  const highlighterPromise = initHighlighter();

  const commits = await getCommits(path, last);
  await highlighterPromise;

  const codes = commits.map((commit) => commit.content);
  const slides = await getSlides(codes, lang);
  return commits.map((commit, i) => ({
    commit,
    lines: slides[i],
    changes: getChanges(slides[i]),
  }));
}

export default {
  showLanding,
  getPath,
  getVersions,
};
