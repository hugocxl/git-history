// =============================================================================
// Dependencies
// =============================================================================

import type { DiffsThemeNames } from "@pierre/diffs";
import {
  MultiFileDiff,
  useWorkerPool,
  WorkerPoolContextProvider,
} from "@pierre/diffs/react";
import {
  Check,
  Columns2,
  Hash,
  Paintbrush,
  Palette,
  UnfoldVertical,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

// =============================================================================
// Types
// =============================================================================
import type {
  Commit,
  DiffSettings,
  ToWebviewMessage,
  VSCodeAPI,
} from "./types";

// =============================================================================
// Constants
// =============================================================================
const WORKER_POOL_SIZE = 4;
const SETTINGS_KEY = "diffSettings";

const DEFAULT_SETTINGS: DiffSettings = {
  layout: "split",
  theme: "github-dark",
  lineNumbers: true,
  background: true,
  expandUnchanged: true,
};

const THEMES: { id: DiffsThemeNames; label: string; type: "dark" | "light" }[] =
  [
    // Dark themes
    { id: "github-dark", label: "GitHub Dark", type: "dark" },
    { id: "github-dark-dimmed", label: "GitHub Dimmed", type: "dark" },
    { id: "dracula", label: "Dracula", type: "dark" },
    { id: "dracula-soft", label: "Dracula Soft", type: "dark" },
    { id: "one-dark-pro", label: "One Dark Pro", type: "dark" },
    { id: "nord", label: "Nord", type: "dark" },
    { id: "tokyo-night", label: "Tokyo Night", type: "dark" },
    { id: "night-owl", label: "Night Owl", type: "dark" },
    { id: "monokai", label: "Monokai", type: "dark" },
    { id: "vitesse-dark", label: "Vitesse Dark", type: "dark" },
    { id: "vitesse-black", label: "Vitesse Black", type: "dark" },
    { id: "catppuccin-mocha", label: "Catppuccin Mocha", type: "dark" },
    { id: "catppuccin-macchiato", label: "Catppuccin Macchiato", type: "dark" },
    { id: "catppuccin-frappe", label: "Catppuccin Frappé", type: "dark" },
    { id: "rose-pine", label: "Rosé Pine", type: "dark" },
    { id: "rose-pine-moon", label: "Rosé Pine Moon", type: "dark" },
    { id: "material-theme", label: "Material", type: "dark" },
    { id: "material-theme-darker", label: "Material Darker", type: "dark" },
    { id: "material-theme-ocean", label: "Material Ocean", type: "dark" },
    {
      id: "material-theme-palenight",
      label: "Material Palenight",
      type: "dark",
    },
    { id: "ayu-dark", label: "Ayu Dark", type: "dark" },
    { id: "poimandres", label: "Poimandres", type: "dark" },
    { id: "slack-dark", label: "Slack Dark", type: "dark" },
    { id: "solarized-dark", label: "Solarized Dark", type: "dark" },
    { id: "synthwave-84", label: "Synthwave '84", type: "dark" },
    { id: "everforest-dark", label: "Everforest Dark", type: "dark" },
    { id: "gruvbox-dark-medium", label: "Gruvbox Dark", type: "dark" },
    { id: "andromeeda", label: "Andromeeda", type: "dark" },
    { id: "aurora-x", label: "Aurora X", type: "dark" },
    { id: "houston", label: "Houston", type: "dark" },
    { id: "laserwave", label: "Laserwave", type: "dark" },
    { id: "min-dark", label: "Min Dark", type: "dark" },
    { id: "plastic", label: "Plastic", type: "dark" },
    { id: "vesper", label: "Vesper", type: "dark" },
    { id: "dark-plus", label: "Dark+", type: "dark" },
    // Light themes
    { id: "github-light", label: "GitHub Light", type: "light" },
    { id: "vitesse-light", label: "Vitesse Light", type: "light" },
    { id: "catppuccin-latte", label: "Catppuccin Latte", type: "light" },
    { id: "rose-pine-dawn", label: "Rosé Pine Dawn", type: "light" },
    { id: "material-theme-lighter", label: "Material Lighter", type: "light" },
    { id: "solarized-light", label: "Solarized Light", type: "light" },
    { id: "everforest-light", label: "Everforest Light", type: "light" },
    { id: "gruvbox-light-medium", label: "Gruvbox Light", type: "light" },
    { id: "one-light", label: "One Light", type: "light" },
    { id: "slack-ochin", label: "Slack Ochin", type: "light" },
    { id: "snazzy-light", label: "Snazzy Light", type: "light" },
    { id: "min-light", label: "Min Light", type: "light" },
    { id: "light-plus", label: "Light+", type: "light" },
  ];

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

/**
 * Custom hook for persisting diff settings across sessions
 * Uses VS Code webview state API for persistence
 */
function useSettings(): [
  DiffSettings,
  (updates: Partial<DiffSettings>) => void,
] {
  const [settings, setSettingsState] = useState<DiffSettings>(() => {
    // Try to restore settings from VS Code state
    if (vscode) {
      const state = vscode.getState() as {
        [SETTINGS_KEY]?: DiffSettings;
      } | null;
      if (state?.[SETTINGS_KEY]) {
        return { ...DEFAULT_SETTINGS, ...state[SETTINGS_KEY] };
      }
    }
    return DEFAULT_SETTINGS;
  });

  const updateSettings = useCallback((updates: Partial<DiffSettings>) => {
    setSettingsState((prev) => {
      const next = { ...prev, ...updates };
      // Persist to VS Code state
      if (vscode) {
        const currentState =
          (vscode.getState() as Record<string, unknown>) || {};
        vscode.setState({ ...currentState, [SETTINGS_KEY]: next });
      }
      return next;
    });
  }, []);

  return [settings, updateSettings];
}

// =============================================================================
// Components
// =============================================================================

interface DiffSettingsBarProps {
  settings: DiffSettings;
  onUpdate: (updates: Partial<DiffSettings>) => void;
}

function DiffSettingsFooter({ settings, onUpdate }: DiffSettingsBarProps) {
  return (
    <footer className="settings-footer">
      {/* Layout select */}
      <label className="settings-field">
        <Columns2 size={14} />
        <select
          className="settings-select"
          value={settings.layout}
          onChange={(e) =>
            onUpdate({ layout: e.target.value as "unified" | "split" })
          }
        >
          <option value="split">Split</option>
          <option value="unified">Unified</option>
        </select>
      </label>

      {/* Theme select */}
      <label className="settings-field">
        <Palette size={14} />
        <select
          className="settings-select"
          value={settings.theme}
          onChange={(e) =>
            onUpdate({ theme: e.target.value as DiffsThemeNames })
          }
        >
          <optgroup label="Dark">
            {THEMES.filter((t) => t.type === "dark").map((theme) => (
              <option key={theme.id} value={theme.id}>
                {theme.label}
              </option>
            ))}
          </optgroup>
          <optgroup label="Light">
            {THEMES.filter((t) => t.type === "light").map((theme) => (
              <option key={theme.id} value={theme.id}>
                {theme.label}
              </option>
            ))}
          </optgroup>
        </select>
      </label>

      {/* Line numbers checkbox */}
      <label className="settings-field settings-checkbox">
        <Hash size={14} />
        <span className="settings-label">Line numbers</span>
        <input
          type="checkbox"
          checked={settings.lineNumbers}
          onChange={(e) => onUpdate({ lineNumbers: e.target.checked })}
        />
        <span className="checkmark">
          {settings.lineNumbers && <Check size={12} />}
        </span>
      </label>

      {/* Background checkbox */}
      <label className="settings-field settings-checkbox">
        <Paintbrush size={14} />
        <span className="settings-label">Background</span>
        <input
          type="checkbox"
          checked={settings.background}
          onChange={(e) => onUpdate({ background: e.target.checked })}
        />
        <span className="checkmark">
          {settings.background && <Check size={12} />}
        </span>
      </label>

      {/* Expand unchanged checkbox */}
      <label className="settings-field settings-checkbox">
        <UnfoldVertical size={14} />
        <span className="settings-label">Expand</span>
        <input
          type="checkbox"
          checked={settings.expandUnchanged}
          onChange={(e) => onUpdate({ expandUnchanged: e.target.checked })}
        />
        <span className="checkmark">
          {settings.expandUnchanged && <Check size={12} />}
        </span>
      </label>
    </footer>
  );
}

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

interface DiffViewerProps {
  oldFile: { contents: string; name: string };
  newFile: { contents: string; name: string };
  settings: DiffSettings;
}

function DiffViewer({ oldFile, newFile, settings }: DiffViewerProps) {
  const pool = useWorkerPool();

  // Update worker pool theme when settings change
  useEffect(() => {
    if (pool) {
      pool.setRenderOptions({ theme: settings.theme });
    }
  }, [pool, settings.theme]);

  // Build data attributes for line numbers and background
  const dataAttrs: Record<string, string> = {};
  if (!settings.lineNumbers) {
    dataAttrs["data-disable-line-numbers"] = "";
  }
  if (!settings.background) {
    dataAttrs["data-disable-background"] = "";
  }

  return (
    <MultiFileDiff
      oldFile={oldFile}
      newFile={newFile}
      options={{
        diffStyle: settings.layout,
        lineDiffType: "word-alt",
        expandUnchanged: settings.expandUnchanged,
        diffIndicators: "bars",
        theme: settings.theme,
        unsafeCSS: `
          [data-diffs-header], [data-diffs], [data-error-wrapper] {
            --diffs-bg: transparent;
          }
          [data-line-type="context-expanded"] {
            --diffs-line-bg: transparent;
          }
          ${
            !settings.background
              ? `
          [data-line-type="added"], [data-line-type="deleted"], [data-line-type="modified"] {
            --diffs-line-bg: transparent !important;
          }
          `
              : ""
          }
        `,
      }}
      {...dataAttrs}
    />
  );
}

function App() {
  const [commits, setCommits] = useState<Commit[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [fileName, setFileName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [settings, updateSettings] = useSettings();

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
        <DiffViewer
          oldFile={{ contents: previousCommit.content, name: fileName }}
          newFile={{ contents: currentCommit.content, name: fileName }}
          settings={settings}
        />
      </div>
      <DiffSettingsFooter settings={settings} onUpdate={updateSettings} />
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
          theme: settings.theme,
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
