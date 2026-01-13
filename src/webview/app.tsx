// Deps
import { MultiFileDiff, WorkerPoolContextProvider } from "@pierre/diffs/react";

// Hooks
import { useCallback, useEffect, useState } from "react";

// Components
import { CommitCarousel } from "./commit-carousel";
import { DiffViewer } from "./diff-viewer";

// Types
import type { Commit, ToWebviewMessage, VSCodeAPI } from "./types";

// Constants
const WORKER_POOL_SIZE = 4;

// Get VS Code API - only available in webview context
let vscode: VSCodeAPI | null = null;
try {
  vscode = acquireVsCodeApi();
} catch {
  // Running outside VS Code (dev mode)
}

/**
 * Creates a worker factory for the @pierre/diffs worker pool.
 * For VS Code webviews, we fetch the worker script and create a blob URL
 * since direct script URLs don't work in the webview sandbox.
 */
async function createWorkerBlobUrl(): Promise<string | null> {
  const workerUri = window.__DIFFS_WORKER_URI__;

  if (!workerUri) {
    return null;
  }

  try {
    const response = await fetch(workerUri);
    if (!response.ok) {
      throw new Error(`Failed to fetch worker: ${response.statusText}`);
    }
    const workerCode = await response.text();

    const blob = new Blob([workerCode], { type: "application/javascript" });
    const blobUrl = URL.createObjectURL(blob);
    return blobUrl;
  } catch {
    return null;
  }
}

export function App() {
  const [commits, setCommits] = useState<Commit[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [fileName, setFileName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  // Worker pool state
  const [workerFactory, setWorkerFactory] = useState<(() => Worker) | null>(
    null
  );
  const [workerPoolReady, setWorkerPoolReady] = useState(false);

  // Initialize worker pool
  useEffect(() => {
    let blobUrl: string | null = null;

    createWorkerBlobUrl().then((url) => {
      if (url) {
        blobUrl = url;
        // Create the factory function that returns new workers
        const factory = () => {
          return new Worker(url);
        };
        setWorkerFactory(() => factory);
        setWorkerPoolReady(true);
      } else {
        // Worker pool not available, continue without it
        setWorkerPoolReady(true);
      }
    });

    // Cleanup: revoke blob URL when component unmounts
    return () => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, []);

  // Handle messages from extension
  useEffect(() => {
    const handler = (event: MessageEvent<ToWebviewMessage>) => {
      const message = event.data;

      switch (message.type) {
        case "init":
          setFileName(message.fileName);
          // Request initial commits
          vscode?.postMessage({ type: "loadMore", before: null });
          break;

        case "commits":
          setCommits((prev) => [...prev, ...message.commits]);
          setHasMore(message.hasMore);
          setLoading(false);
          break;

        case "error":
          setError(message.message);
          setLoading(false);
          break;
      }
    };

    window.addEventListener("message", handler);

    // Signal ready to extension
    vscode?.postMessage({ type: "ready" });

    return () => window.removeEventListener("message", handler);
  }, []);

  // Load more commits when reaching end of carousel
  const loadMore = useCallback(() => {
    if (!hasMore || loading) return;

    const lastCommit = commits[commits.length - 1];
    if (lastCommit) {
      setLoading(true);
      vscode?.postMessage({ type: "loadMore", before: lastCommit.hash });
    }
  }, [commits, hasMore, loading]);

  // Handle keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" && currentIndex > 0) {
        setCurrentIndex((i) => i - 1);
      } else if (e.key === "ArrowRight" && currentIndex < commits.length - 1) {
        setCurrentIndex((i) => i + 1);
        // Load more when near end
        if (currentIndex >= commits.length - 4) {
          loadMore();
        }
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [currentIndex, commits.length, loadMore]);

  if (error) {
    return <div className="error">{error}</div>;
  }

  // Wait for worker pool initialization
  if (!workerPoolReady) {
    return <div className="loading">Initializing...</div>;
  }

  if (loading && commits.length === 0) {
    return <div className="loading">Loading history...</div>;
  }

  if (commits.length < 2) {
    return <div className="empty">Not enough commits to show diff</div>;
  }

  const currentCommit = commits[currentIndex];
  const previousCommit = commits[currentIndex + 1];

  const content = (
    <div className="app">
      <CommitCarousel
        commits={commits}
        currentIndex={currentIndex}
        onSelect={setCurrentIndex}
        hasMore={hasMore}
        onLoadMore={loadMore}
      />
      <div className="diff-container">
        <MultiFileDiff
          oldFile={{ contents: previousCommit.content, name: fileName }}
          newFile={{ contents: currentCommit.content, name: fileName }}
          options={{
            diffStyle: "split",
            lineDiffType: "word-alt",
            expandUnchanged: true,
            diffIndicators: "bars",
            theme: "github-dark",
            unsafeCSS: `
          [data-line-type="context-expanded"] {
            --diffs-line-bg: transparent;
          }
          `,
          }}
        />
      </div>
    </div>
  );

  // Wrap with WorkerPoolContextProvider when worker factory is available
  if (workerFactory) {
    return (
      <WorkerPoolContextProvider
        poolOptions={{
          workerFactory,
          poolSize: WORKER_POOL_SIZE,
        }}
        highlighterOptions={{
          theme: "dracula",
        }}
      >
        {content}
      </WorkerPoolContextProvider>
    );
  }

  // Fallback: render without worker pool (main thread highlighting)
  return content;
}
