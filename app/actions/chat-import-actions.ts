"use server";

import { auth } from "@/auth";
import { pool } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import { parseAndValidateChatJson } from "@/lib/chat-import";
import { revalidatePath } from "next/cache";

export type ImportChatResponse = {
  success: boolean;
  title?: string;
  chunksCount?: number;
  secretsMasked?: number;
  sourceId?: string;
  error?: string;
};

export async function importChatJsonAction(
  titleInput: string,
  rawJsonContent: string,
  accessTag: "public" | "eng" | "hr" | "finance" = "public",
  projectId?: string
): Promise<ImportChatResponse> {
  try {
    // 1. Role check: reviewer, admin, leaver
    const session = await auth();
    const user = session?.user;
    if (!user) {
      return { success: false, error: "Please sign in to import chat data." };
    }

    const allowedRoles = ["reviewer", "admin", "leaver"];
    if (!allowedRoles.includes(user.role)) {
      return {
        success: false,
        error: `Role '${user.role}' is not authorized to import chat files. Only reviewer, admin, or leaver can import.`,
      };
    }

    // 2. Title validation
    const cleanTitle = titleInput.trim();
    if (!cleanTitle) {
      return { success: false, error: "Source title is required." };
    }

    // 3. Validate JSON shape and size (max 1 MB), screen messages
    const parsedChat = parseAndValidateChatJson(rawJsonContent);

    // 4. Resolve project id
    let targetProjectId = projectId;
    if (!targetProjectId) {
      const proj = await pool.query("SELECT id FROM projects ORDER BY id ASC LIMIT 1");
      targetProjectId = proj.rows[0]?.id;
    }
    if (!targetProjectId) {
      return { success: false, error: "No active project found to attach chat import to." };
    }

    // 5. Save source (kind='chat') & chunks
    // Re-importing the same title must not duplicate: ON CONFLICT (project_id, title)
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const sourceTitle = cleanTitle.startsWith("Chat: ") ? cleanTitle : `Chat: ${cleanTitle}`;
      const sourceRes = await client.query(
        `INSERT INTO sources (project_id, title, kind, access_tag, redactions, created_by)
         VALUES ($1::bigint, $2, 'chat', $3, $4, $5::bigint)
         ON CONFLICT (project_id, title) DO UPDATE
           SET kind = 'chat',
               access_tag = EXCLUDED.access_tag,
               redactions = EXCLUDED.redactions,
               created_at = now()
         RETURNING id::text`,
        [targetProjectId, sourceTitle, accessTag, parsedChat.totalRedactions, user.id]
      );

      const sourceId = sourceRes.rows[0].id;

      // Clean existing chunks for this source if re-importing
      await client.query("DELETE FROM chunks WHERE source_id = $1::bigint", [sourceId]);

      // Insert new chunks (one per message)
      for (const [i, chunk] of parsedChat.chunks.entries()) {
        await client.query(
          `INSERT INTO chunks (source_id, position, content, access_tag)
           VALUES ($1::bigint, $2, $3, $4)`,
          [sourceId, i, chunk.text, accessTag]
        );
      }

      // 6. Write audit_log
      await writeAudit({
        userId: user.id,
        action: "import.chat",
        entity: "source",
        entityId: sourceId,
        detail: {
          title: sourceTitle,
          access_tag: accessTag,
          messages_count: parsedChat.messages.length,
          chunks_count: parsedChat.chunks.length,
          secrets_masked: parsedChat.totalRedactions,
        },
      });

      await client.query("COMMIT");

      revalidatePath("/capture");
      revalidatePath("/dashboard");

      return {
        success: true,
        title: sourceTitle,
        chunksCount: parsedChat.chunks.length,
        secretsMasked: parsedChat.totalRedactions,
        sourceId,
      };
    } catch (err: unknown) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}
