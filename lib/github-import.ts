import { z } from "zod";
import { screenText } from "@/lib/screen";

// Strict regex: letters, digits, dots, dashes, underscores only
const REPO_REGEX = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;

export function parseAndValidateGithubRepo(input: string): { owner: string; repo: string } {
  let cleaned = input.trim();

  // Strip protocol / domain if user pasted full github URL
  cleaned = cleaned.replace(/^https?:\/\/(?:www\.)?github\.com\//i, "");
  cleaned = cleaned.replace(/\/$/, "");
  // Strip .git suffix if present
  cleaned = cleaned.replace(/\.git$/i, "");

  if (!REPO_REGEX.test(cleaned)) {
    throw new Error(
      "Invalid GitHub repository format. Use 'owner/repo' or 'https://github.com/owner/repo' (letters, digits, dots, dashes, underscores only)."
    );
  }

  const [owner, repo] = cleaned.split("/");
  return { owner, repo };
}

export type FetchedChunk = {
  content: string;
  kind: "readme" | "issue" | "pull_request" | "comment" | "commit";
};

export type GithubImportResult = {
  repoName: string;
  chunks: { text: string; redactions: number }[];
  totalRedactions: number;
  totalBytes: number;
};

export async function fetchGithubRepoData(owner: string, repo: string): Promise<GithubImportResult> {
  const token = process.env.GITHUB_TOKEN;
  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "ByeByeBrain-Handover-Importer",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  async function apiFetch(endpoint: string) {
    const url = `https://api.github.com/repos/${owner}/${repo}${endpoint}`;
    const res = await fetch(url, { headers });

    if (res.status === 404) {
      throw new Error(`Repository '${owner}/${repo}' not found on GitHub. Make sure it is public.`);
    }
    if (res.status === 403 || res.status === 429) {
      const resetTime = res.headers.get("x-ratelimit-reset");
      const waitMsg = resetTime ? ` Rate limit resets at ${new Date(Number(resetTime) * 1000).toLocaleTimeString()}.` : "";
      throw new Error(`GitHub API rate limit reached (status ${res.status}).${waitMsg} Consider setting GITHUB_TOKEN.`);
    }
    if (!res.ok) {
      throw new Error(`GitHub API error: HTTP ${res.status} ${res.statusText}`);
    }
    return res.json();
  }

  const rawChunks: FetchedChunk[] = [];
  let totalBytes = 0;
  const MAX_BYTES = 200 * 1024; // 200 KB total limit

  function addChunk(content: string, kind: FetchedChunk["kind"]) {
    const trimmed = content.trim();
    if (!trimmed) return;
    const len = Buffer.byteLength(trimmed, "utf8");
    if (totalBytes + len > MAX_BYTES) {
      return; // Cap total text at 200 KB
    }
    totalBytes += len;
    rawChunks.push({ content: trimmed, kind });
  }

  // 1. Fetch README
  try {
    const readmeData = await apiFetch("/readme");
    if (readmeData?.content && readmeData?.encoding === "base64") {
      const decoded = Buffer.from(readmeData.content, "base64").toString("utf8");
      // Truncate huge single readmes to keep room for issues/PRs
      const truncated = decoded.slice(0, 30000);
      addChunk(`README:\n${truncated}`, "readme");
    }
  } catch (err: unknown) {
    // README might not exist in repository, continue
    console.warn(`README not found or inaccessible for ${owner}/${repo}`);
  }

  // 2. Fetch up to 30 recent issues (open & closed)
  try {
    const issues = await apiFetch("/issues?state=all&per_page=30&sort=updated");
    if (Array.isArray(issues)) {
      for (const issue of issues) {
        // Exclude PRs returned in the issues endpoint
        if (issue.pull_request) continue;
        const text = `Issue #${issue.number}: ${issue.title}\nState: ${issue.state}\nAuthor: ${issue.user?.login || "unknown"}\n\n${issue.body || "(No description)"}`;
        addChunk(text, "issue");
      }
    }
  } catch (err: unknown) {
    console.warn("Could not fetch issues:", err);
  }

  // 3. Fetch up to 30 recent PRs with comments
  try {
    const prs = await apiFetch("/pulls?state=all&per_page=30&sort=updated");
    if (Array.isArray(prs)) {
      for (const pr of prs) {
        const prText = `Pull Request #${pr.number}: ${pr.title}\nState: ${pr.state}\nAuthor: ${pr.user?.login || "unknown"}\n\n${pr.body || "(No description)"}`;
        addChunk(prText, "pull_request");

        // Fetch comments for this PR (capped)
        if (pr.comments_url && totalBytes < MAX_BYTES) {
          try {
            const commentsRes = await fetch(pr.comments_url, { headers });
            if (commentsRes.ok) {
              const comments = await commentsRes.json();
              if (Array.isArray(comments)) {
                for (const c of comments.slice(0, 5)) {
                  addChunk(`Comment on PR #${pr.number} by ${c.user?.login || "user"}:\n${c.body}`, "comment");
                }
              }
            }
          } catch {
            // Ignore comment fetch error
          }
        }
      }
    }
  } catch (err: unknown) {
    console.warn("Could not fetch PRs:", err);
  }

  // 4. Fetch up to 30 recent commit messages
  try {
    const commits = await apiFetch("/commits?per_page=30");
    if (Array.isArray(commits)) {
      for (const c of commits) {
        const msg = c.commit?.message || "";
        const author = c.commit?.author?.name || c.author?.login || "committer";
        const text = `Commit by ${author}:\n${msg}`;
        addChunk(text, "commit");
      }
    }
  } catch (err: unknown) {
    console.warn("Could not fetch commits:", err);
  }

  // Run through lib/screen.ts masking BEFORE returning
  let totalRedactions = 0;
  const screenedChunks = rawChunks.map((chunk) => {
    const screened = screenText(chunk.content);
    totalRedactions += screened.count;
    return {
      text: screened.text,
      redactions: screened.count,
    };
  });

  return {
    repoName: `${owner}/${repo}`,
    chunks: screenedChunks,
    totalRedactions,
    totalBytes,
  };
}
