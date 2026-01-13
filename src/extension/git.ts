import { execFile } from "node:child_process";
import * as path from "node:path";
import { promisify } from "node:util";
import type { Commit } from "./types";

const execFileAsync = promisify(execFile);

/**
 * Get commits for a file from git history
 */
export async function getCommits(
  filePath: string,
  limit: number,
  before: string | null
): Promise<{ commits: Commit[]; hasMore: boolean }> {
  const cwd = path.dirname(filePath);
  const fileName = path.basename(filePath);

  // Fetch one extra to check if there are more commits
  const fetchLimit = limit + 1;

  // Get commit metadata
  const { stdout: logOutput } = await execFileAsync(
    "git",
    [
      "log",
      `--max-count=${fetchLimit}`,
      "--pretty=format:%h|%an|%aI|%s",
      ...(before ? [`${before}^`] : ["HEAD"]),
      "--",
      fileName,
    ],
    { cwd, maxBuffer: 10 * 1024 * 1024 }
  );

  const lines = logOutput.trim().split("\n").filter(Boolean);
  const hasMore = lines.length > limit;
  const commitLines = hasMore ? lines.slice(0, limit) : lines;

  // Get file content for each commit in parallel
  const commits = await Promise.all(
    commitLines.map(async (line) => {
      const [hash, author, date, ...messageParts] = line.split("|");
      const message = messageParts.join("|"); // Handle messages with |

      // Get file content at this commit
      const { stdout: content } = await execFileAsync(
        "git",
        ["show", `${hash}:./${fileName}`],
        { cwd, maxBuffer: 10 * 1024 * 1024 }
      );

      return { hash, author, date, message, content };
    })
  );

  return { commits, hasMore };
}
