// =============================================================================
// Dependencies
// =============================================================================
import { createRoot } from "react-dom/client";
import { MultiFileDiff, WorkerPoolContextProvider } from "@pierre/diffs/react";
import { useCallback, useEffect, useRef, useState } from "react";
import "./styles.css";

// =============================================================================
// Types
// =============================================================================
import type { Commit, ToWebviewMessage, VSCodeAPI } from "./types";

// =============================================================================
// Constants
// =============================================================================
const WORKER_POOL_SIZE = 4;

// Get VS Code API - only available in webview context
let vscode: VSCodeAPI | null = null;
try {
  vscode = acquireVsCodeApi();
} catch {
  // Running outside VS Code (dev mode)
}

// =============================================================================
// Helper Functions
// =============================================================================

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

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return "today";
  }
  if (diffDays === 1) {
    return "yesterday";
  }
  if (diffDays < 7) {
    return `${diffDays} days ago`;
  }
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks} week${weeks > 1 ? "s" : ""} ago`;
  }
  if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    return `${months} month${months > 1 ? "s" : ""} ago`;
  }

  return date.toLocaleDateString();
}

// =============================================================================
// Components
// =============================================================================

interface CommitCarouselProps {
  commits: Commit[];
  currentIndex: number;
  onSelect: (index: number) => void;
  hasMore: boolean;
  onLoadMore: () => void;
}

function CommitCarousel({
  commits,
  currentIndex,
  onSelect,
  hasMore,
  onLoadMore,
}: CommitCarouselProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);

  // Scroll active commit into view when selection changes
  // biome-ignore lint/correctness/useExhaustiveDependencies: currentIndex triggers the scroll
  useEffect(() => {
    activeRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  }, [currentIndex]);

  // Load more when scrolling near end
  const handleScroll = () => {
    const container = containerRef.current;
    if (!container || !hasMore) return;

    const { scrollLeft, scrollWidth, clientWidth } = container;
    if (scrollWidth - scrollLeft - clientWidth < 200) {
      onLoadMore();
    }
  };

  return (
    <div ref={containerRef} className="carousel" onScroll={handleScroll}>
      {commits.slice(0, -1).map((commit, index) => {
        const isActive = index === currentIndex;
        return (
          <button
            key={commit.hash}
            ref={isActive ? activeRef : null}
            type="button"
            className={`commit ${isActive ? "active" : ""}`}
            onClick={() => onSelect(index)}
          >
            <div className="commit-hash">{commit.hash}</div>
            <div className="commit-message" title={commit.message}>
              {commit.message}
            </div>
            <div className="commit-meta">
              <span className="commit-author">{commit.author}</span>
              <span className="commit-date">{formatDate(commit.date)}</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function App() {
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
      <div className="diff-header">
        <div className="diff-header-side">
          <span className="diff-header-hash">{previousCommit.hash}</span>
          <span className="diff-header-author">{previousCommit.author}</span>
          <span className="diff-header-date">
            {new Date(previousCommit.date).toLocaleDateString(undefined, {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          </span>
        </div>
        <div className="diff-header-side">
          <span className="diff-header-hash">{currentCommit.hash}</span>
          <span className="diff-header-author">{currentCommit.author}</span>
          <span className="diff-header-date">
            {new Date(currentCommit.date).toLocaleDateString(undefined, {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          </span>
        </div>
      </div>
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

// =============================================================================
// Root Render
// =============================================================================
const container = document.getElementById("root");
if (container) {
  createRoot(container).render(<App />);
}
