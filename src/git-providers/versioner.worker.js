import { getLanguage } from "./language-detector";
import { getSlides, getChanges } from "./differ";
import { initHighlighter } from "./shiki-tokenizer";

import github from "./github-commit-fetcher";
import gitlab from "./gitlab-commit-fetcher";
import bitbucket from "./bitbucket-commit-fetcher";
import cli from "./cli-commit-fetcher";
import { SOURCE } from "./sources";

const fetchers = {
  [SOURCE.GITHUB]: github.getCommits,
  [SOURCE.GITLAB]: gitlab.getCommits,
  [SOURCE.BITBUCKET]: bitbucket.getCommits,
  [SOURCE.CLI]: cli.getCommits,
};

export async function getVersions(source, params) {
  const { path } = params;
  const lang = getLanguage(path);

  // Initialize Shiki highlighter (no-op if already initialized)
  const highlighterPromise = initHighlighter();

  const getCommits = fetchers[source];
  const commits = await getCommits(params);
  await highlighterPromise;

  const codes = commits.map((commit) => commit.content);
  const slides = await getSlides(codes, lang);
  return commits.map((commit, i) => ({
    commit,
    lines: slides[i],
    changes: getChanges(slides[i]),
  }));
}
