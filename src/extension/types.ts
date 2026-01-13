/** Commit data from git log */
export interface Commit {
  hash: string;
  author: string;
  date: string;
  message: string;
  content: string;
}

/** Messages sent from extension host to webview */
export type ToWebviewMessage =
  | { type: "init"; filePath: string; fileName: string }
  | { type: "commits"; commits: Commit[]; hasMore: boolean }
  | { type: "error"; message: string };

/** Messages sent from webview to extension host */
export type ToExtensionMessage =
  | { type: "ready" }
  | { type: "loadMore"; before: string | null };
