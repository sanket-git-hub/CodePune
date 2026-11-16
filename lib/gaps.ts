// lib/gaps.ts
// Knowledge Gap Finder with Leaver Question Flow
import { pool } from "./db";

export type GapType = "decision_no_reason" | "action_no_owner" | "leaver_only";

export type GapDetectionResult = {
  decisionNoReason: number;
  actionNoOwner: number;
  leaverOnly: number;
  totalNew: number;
};

// Words indicating a justification or rationale in a decision statement/excerpt
const REASON_REGEX = /\b(because|since|due to|so that|in order to|as a result|reason|to avoid|to reduce)\b/i;

// Common stopwords to exclude when checking keyword overlap
const STOPWORDS = new Set([
  "the", "and", "that", "have", "for", "not", "with", "you", "this", "but", "his", "from",
  "they", "more", "will", "would", "there", "their", "what", "about", "which", "when",
  "make", "like", "time", "just", "know", "take", "people", "into", "year", "your", "good",
  "some", "could", "them", "other", "than", "then", "now", "look", "only", "come", "its",
  "over", "think", "also", "back", "after", "use", "two", "how", "our", "work", "first",
  "well", "way", "even", "new", "want", "because", "any", "these", "give", "day", "most", "us",
  "next", "action", "task", "owner", "responsible", "adds", "added", "ship", "ships"
]);

function extractKeywords(text: string): Set<string> {
  const words = text.toLowerCase().match(/\b[a-z]{4,}\b/g) || [];
  const set = new Set<string>();
  for (const w of words) {
    if (!STOPWORDS.has(w)) {
      set.add(w);
    }
  }
  return set;
}

/**
 * 1. detectGaps(projectId)
 * Rules only, all via parameterized SQL:
 * a) decision_no_reason: claims type='decision' whose statement+excerpt contain none of the reason words
 * b) action_no_owner: claims type='next_action' where no claim of type='owner' in the same project
 *    shares a meaningful keyword with it (lowercase, >=1 shared noun-like token of 4+ chars),
 *    and the excerpt has no "@name" or "owner:"/"assigned to" phrase.
 * c) leaver_only: sources whose created_by or whose claims' created_by are only the leaver
 *    of the project's handover and that have no other contributors.
 *
 * Inserts with ON CONFLICT DO NOTHING. Returns counts per type.
 */
export async function detectGaps(projectId: string | number): Promise<GapDetectionResult> {
  let decisionNoReasonCount = 0;
  let actionNoOwnerCount = 0;
  let leaverOnlyCount = 0;

  // Find project leaver from handovers or project_members
  const handoverRes = await pool.query(
    `SELECT leaver_id::text
     FROM handovers
     WHERE project_id = $1::bigint
     ORDER BY created_at DESC
     LIMIT 1`,
    [projectId]
  );

  let leaverId: string | null = handoverRes.rows[0]?.leaver_id || null;
  if (!leaverId) {
    const memRes = await pool.query(
      `SELECT user_id::text
       FROM project_members
       WHERE project_id = $1::bigint AND role = 'leaver'
       LIMIT 1`,
      [projectId]
    );
    leaverId = memRes.rows[0]?.user_id || null;
  }

  // --- Rule A: decision_no_reason ---
  const decisionClaims = await pool.query(
    `SELECT id::text, statement, excerpt, access_tag, created_by::text
     FROM claims
     WHERE project_id = $1::bigint AND type = 'decision'`,
    [projectId]
  );

  for (const row of decisionClaims.rows) {
    const combined = `${row.statement || ""} ${row.excerpt || ""}`;
    if (!REASON_REGEX.test(combined)) {
      const question = `You recorded the decision '${row.statement}'. What was the reason, and what alternatives were rejected?`;
      const title = `Decision without reason: ${row.statement.slice(0, 60)}`;
      const desc = `The recorded decision does not document the underlying rationale, trade-offs, or rejected alternatives.`;

      const ins = await pool.query(
        `INSERT INTO knowledge_gaps
           (project_id, title, description, severity, status, gap_type, question, related_claim_id, suggested_owner_user_id)
         VALUES
           ($1::bigint, $2, $3, 'high', 'open', 'decision_no_reason', $4, $5::bigint, $6::bigint)
         ON CONFLICT (project_id, gap_type, related_claim_id) WHERE related_claim_id IS NOT NULL
         DO NOTHING
         RETURNING id`,
        [projectId, title, desc, question, row.id, leaverId ? Number(leaverId) : null]
      );
      if (ins.rows.length > 0) {
        decisionNoReasonCount++;
      }
    }
  }

  // --- Rule B: action_no_owner ---
  const actionClaims = await pool.query(
    `SELECT id::text, statement, excerpt, access_tag, created_by::text
     FROM claims
     WHERE project_id = $1::bigint AND type = 'next_action'`,
    [projectId]
  );

  const ownerClaims = await pool.query(
    `SELECT id::text, statement, excerpt
     FROM claims
     WHERE project_id = $1::bigint AND type = 'owner'`,
    [projectId]
  );

  // Precompute owner keywords
  const ownerKeywordsList: Set<string>[] = ownerClaims.rows.map((oc) =>
    extractKeywords(`${oc.statement} ${oc.excerpt || ""}`)
  );

  for (const row of actionClaims.rows) {
    const excerpt = row.excerpt || "";
    // Check if excerpt has @name or owner:/assigned to phrases
    const hasExplicitOwnerPhrase = /(@[a-z0-9_-]+|owner\s*:|assigned\s+to\s*:?)/i.test(excerpt);

    if (hasExplicitOwnerPhrase) {
      continue;
    }

    const actionKeywords = extractKeywords(`${row.statement} ${excerpt}`);
    let sharesKeywordWithOwner = false;

    for (const okw of ownerKeywordsList) {
      for (const kw of actionKeywords) {
        if (okw.has(kw)) {
          sharesKeywordWithOwner = true;
          break;
        }
      }
      if (sharesKeywordWithOwner) break;
    }

    if (!sharesKeywordWithOwner) {
      const question = `Who owns '${row.statement}', and what is its status?`;
      const title = `Unassigned next action: ${row.statement.slice(0, 60)}`;
      const desc = `Action item has no designated owner claim or assignee mention.`;

      const ins = await pool.query(
        `INSERT INTO knowledge_gaps
           (project_id, title, description, severity, status, gap_type, question, related_claim_id, suggested_owner_user_id)
         VALUES
           ($1::bigint, $2, $3, 'medium', 'open', 'action_no_owner', $4, $5::bigint, $6::bigint)
         ON CONFLICT (project_id, gap_type, related_claim_id) WHERE related_claim_id IS NOT NULL
         DO NOTHING
         RETURNING id`,
        [projectId, title, desc, question, row.id, leaverId ? Number(leaverId) : null]
      );
      if (ins.rows.length > 0) {
        actionNoOwnerCount++;
      }
    }
  }

  // --- Rule C: leaver_only ---
  if (leaverId) {
    // Find sources touched only by the leaver and having no other contributors
    const sourcesRes = await pool.query(
      `SELECT s.id::text, s.title, s.access_tag, s.created_by::text,
              ARRAY_AGG(DISTINCT c.created_by::text) FILTER (WHERE c.created_by IS NOT NULL) AS claim_creators
       FROM sources s
       LEFT JOIN claims c ON c.source_id = s.id
       WHERE s.project_id = $1::bigint
       GROUP BY s.id, s.title, s.access_tag, s.created_by`,
      [projectId]
    );

    for (const src of sourcesRes.rows) {
      const allCreators = new Set<string>();
      if (src.created_by) allCreators.add(src.created_by);
      if (src.claim_creators && Array.isArray(src.claim_creators)) {
        for (const cid of src.claim_creators) {
          if (cid) allCreators.add(cid);
        }
      }

      // Check if creators consist ONLY of the leaver
      if (allCreators.size === 1 && allCreators.has(leaverId)) {
        const question = `Only you touched '${src.title}'. What should the successor know about it?`;
        const title = `Single-contributor knowledge: ${src.title.slice(0, 60)}`;
        const desc = `Source was authored exclusively by the outgoing leaver with zero secondary contributors.`;

        const ins = await pool.query(
          `INSERT INTO knowledge_gaps
             (project_id, title, description, severity, status, gap_type, question, related_source_id, suggested_owner_user_id)
           VALUES
             ($1::bigint, $2, $3, 'high', 'open', 'leaver_only', $4, $5::bigint, $6::bigint)
           ON CONFLICT (project_id, gap_type, related_source_id) WHERE related_source_id IS NOT NULL
           DO NOTHING
           RETURNING id`,
          [projectId, title, desc, question, src.id, Number(leaverId)]
        );
        if (ins.rows.length > 0) {
          leaverOnlyCount++;
        }
      }
    }
  }

  return {
    decisionNoReason: decisionNoReasonCount,
    actionNoOwner: actionNoOwnerCount,
    leaverOnly: leaverOnlyCount,
    totalNew: decisionNoReasonCount + actionNoOwnerCount + leaverOnlyCount,
  };
}
