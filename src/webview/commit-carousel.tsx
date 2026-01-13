import { useEffect, useRef } from "react";
import type { Commit } from "./types";

interface CommitCarouselProps {
  commits: Commit[];
  currentIndex: number;
  onSelect: (index: number) => void;
  hasMore: boolean;
  onLoadMore: () => void;
}

export function CommitCarousel({
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
