import { pool } from "@/lib/db";
import type { Role } from "@/types/next-auth";

export type AccessTag = "public" | "eng" | "hr" | "finance";

// admin=all; reviewer/leaver/incoming=public+eng; outsider=public.
const CLEARANCE: Record<Role, AccessTag[]> = {
  admin: ["public", "eng", "hr", "finance"],
  reviewer: ["public", "eng"],
  leaver: ["public", "eng"],
  incoming: ["public", "eng"],
  outsider: ["public"],
};

// Unknown or tampered roles fall back to the lowest clearance.
export function clearanceFor(role: string): AccessTag[] {
  return Object.hasOwn(CLEARANCE, role) ? CLEARANCE[role as Role] : ["public"];
}

export function hasRole(role: string, allowed: readonly Role[]): boolean {
  return (allowed as readonly string[]).includes(role);
}

export type ReadableChunk = {
  id: string;
  source_id: string;
  position: number;
  content: string;
  access_tag: AccessTag;
};

// The permission filter runs in SQL, before content reaches the AI or a page.
export async function getReadableChunks(
  role: string,
  sourceId?: string,
): Promise<ReadableChunk[]> {
  const { rows } = await pool.query(
    `SELECT id::text, source_id::text, position, content, access_tag
       FROM chunks
      WHERE access_tag = ANY($1::text[])
        AND ($2::bigint IS NULL OR source_id = $2::bigint)
      ORDER BY source_id, position`,
    [clearanceFor(role), sourceId ?? null],
  );
  return rows;
}

export type ReadableClaim = {
  id: string;
  chunk_id: string;
  type: string;
  statement: string;
  excerpt: string;
  access_tag: AccessTag;
  evidence_status: string;
  review_state: string;
  integrity_ok: boolean;
  is_demo: boolean;
  version: number;
};

export async function getReadableClaims(
  role: string,
  opts: { approvedOnly?: boolean } = {},
): Promise<ReadableClaim[]> {
  const { rows } = await pool.query(
    `SELECT id::text, chunk_id::text, type, statement, excerpt, access_tag,
            evidence_status, review_state, integrity_ok, is_demo, version
       FROM claims
      WHERE access_tag = ANY($1::text[])
        AND ($2::boolean = false OR review_state = 'approved')
      ORDER BY type, id`,
    [clearanceFor(role), opts.approvedOnly ?? false],
  );
  return rows;
}

// Count only, never content: powers "N items hidden because you don't have access".
export async function countHiddenClaims(
  role: string,
  opts: { approvedOnly?: boolean } = {},
) {
  const { rows } = await pool.query(
    `SELECT count(*)::int AS n
       FROM claims
      WHERE NOT (access_tag = ANY($1::text[]))
        AND ($2::boolean = false OR review_state = 'approved')`,
    [clearanceFor(role), opts.approvedOnly ?? false],
  );
  return rows[0].n as number;
}
