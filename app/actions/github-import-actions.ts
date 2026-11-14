"use server";

import { auth } from "@/auth";
import { pool } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import { parseAndValidateGithubRepo, fetchGithubRepoData } from "@/lib/github-import";
import { revalidatePath } from "next/cache";

export type ImportGithubResponse = {
  success: boolean;
  repo?: string;
  chunksCount?: number;
  secretsMasked?: number;
  sourceId?: string;
  error?: string;
};

export async function importGithubRepoAction(
  repoInput: string,
  accessTag: "public" | "eng" | "hr" | "finance" = "public",
  projectId?: string
): Promise<ImportGithubResponse> {
  try {
    // 1. Role check: reviewer, admin, leaver
    const session = await auth();
    const user = session?.user;
    if (!user) {
      return { success: false, error: "Please sign in to import data." };
    }

    const allowedRoles = ["reviewer", "admin", "leaver"];
    if (!allowedRoles.includes(user.role)) {
      return {
        success: false,
        error: `Role '${user.role}' is not allowed to import repositories. Only reviewer, admin, or leaver can import.`,
      };
    }

    // 2. Validate input and fetch GitHub data (with strict regex & 200 KB cap)
    const { owner, repo } = parseAndValidateGithubRepo(repoInput);
    const githubData = await fetchGithubRepoData(owner, repo);

    if (githubData.chunks.length === 0) {
      return { success: false, error: "No data could be retrieved from this repository." };
    }

    // 3. Resolve project id (default to Campus Pay if none supplied)
    let targetProjectId = projectId;
    if (!targetProjectId) {
      const proj = await pool.query("SELECT id FROM projects ORDER BY id ASC LIMIT 1");
      targetProjectId = proj.rows[0]?.id;
    }
    if (!targetProjectId) {
      return { success: false, error: "No project found to attach source to." };
    }

    // 4. Save source (kind='github') & chunks into PostgreSQL
    // Re-importing the same repo must NOT duplicate: ON CONFLICT (project_id, title)
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const title = `GitHub: ${githubData.repoName}`;
      const sourceRes = await client.query(
        `INSERT INTO sources (project_id, title, kind, access_tag, redactions, created_by)
         VALUES ($1::bigint, $2, 'github', $3, $4, $5::bigint)
         ON CONFLICT (project_id, title) DO UPDATE
           SET kind = 'github',
               access_tag = EXCLUDED.access_tag,
               redactions = EXCLUDED.redactions,
               created_at = now()
         RETURNING id::text`,
        [targetProjectId, title, accessTag, githubData.totalRedactions, user.id]
      );

      const sourceId = sourceRes.rows[0].id;

      // Clean existing chunks for this source if re-importing
      await client.query("DELETE FROM chunks WHERE source_id = $1::bigint", [sourceId]);

      // Insert new chunks
      for (const [i, chunk] of githubData.chunks.entries()) {
        await client.query(
          `INSERT INTO chunks (source_id, position, content, access_tag)
           VALUES ($1::bigint, $2, $3, $4)`,
          [sourceId, i, chunk.text, accessTag]
        );
      }

      // 5. Write audit_log
      await writeAudit({
        userId: user.id,
        action: "import.github",
        entity: "source",
        entityId: sourceId,
        detail: {
          repo: githubData.repoName,
          access_tag: accessTag,
          chunks_count: githubData.chunks.length,
          secrets_masked: githubData.totalRedactions,
          bytes: githubData.totalBytes,
        },
      });

      await client.query("COMMIT");

      revalidatePath("/capture");
      revalidatePath("/dashboard");

      return {
        success: true,
        repo: githubData.repoName,
        chunksCount: githubData.chunks.length,
        secretsMasked: githubData.totalRedactions,
        sourceId,
      };
    } catch (err: unknown) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: message };
  }
}
