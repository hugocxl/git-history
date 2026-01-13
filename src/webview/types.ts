import type { DiffsThemeNames } from "@pierre/diffs";

/** Commit data from git log */
export interface Commit {
  hash: string;
  author: string;
  date: string;
  message: string;
  content: string;
}

/** Diff viewer layout mode */
export type DiffLayout = "unified" | "split";

/** Diff viewer settings persisted across sessions */
export interface DiffSettings {
  layout: DiffLayout;
  theme: DiffsThemeNames;
  lineNumbers: boolean;
  background: boolean;
  expandUnchanged: boolean;
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

/** VS Code API interface */
export interface VSCodeAPI {
  postMessage: (message: ToExtensionMessage) => void;
  getState: () => unknown;
  setState: (state: unknown) => void;
}

declare global {
  function acquireVsCodeApi(): VSCodeAPI;
  /** Worker URI passed from extension for @pierre/diffs worker pool */
  var __DIFFS_WORKER_URI__: string | undefined;
}
