// lib/conflicts.ts
// Conflict and Stale-Work Finder
import { z } from "zod";
import { pool } from "./db";
import { clearanceFor } from "./permissions";

export type ConflictKind = "contradiction" | "stale";
export type DetectedBy = "rule" | "gemini";
export type ConflictStatus = "open" | "resolved" | "dismissed";
export type ConflictResolution = "keep_a" | "keep_b" | "both_valid" | "dismiss";

export const geminiContradictionResponseSchema = z.array(
  z.object({
    pair_id: z.string(),
    contradicts: z.boolean(),
    reason: z.string().optional(),
  })
);

// Stopwords for significant token extraction
const STOPWORDS = new Set([
  "the", "and", "that", "have", "for", "not", "with", "you", "this", "but", "his", "from",
  "they", "more", "will", "would", "there", "their", "what", "about", "which", "when",
  "make", "like", "time", "just", "know", "take", "people", "into", "year", "your", "good",
  "some", "could", "them", "other", "than", "then", "now", "look", "only", "come", "its",
  "over", "think", "also", "back", "after", "use", "two", "how", "our", "work", "first",
  "well", "way", "even", "new", "want", "because", "any", "these", "give", "day", "most", "us",
  "been", "were", "where", "much", "down", "should"
]);

export function extractSignificantTokens(text: string): Set<string> {
  const words = text.toLowerCase().match(/\b[a-z]{4,}\b/g) || [];
  const set = new Set<string>();
  for (const w of words) {
    if (!STOPWORDS.has(w)) {
      set.add(w);
    }
  }
  return set;
}

// Reversal cues
const REVERSAL_CUES = /\b(instead of|no longer|switched to|replaced|reverted|deprecated|rolled back|changed from|not anymore|cancelled)\b/i;

// Opposite/negation verb cues
const NEGATION_VERBS = /\b(don't|do not|cannot|can't|never|won't|disabled|removed|stopped)\b/i;

export type StaleDetectionResult = {
  staleCount: number;
};

export type ContradictionDetectionResult = {
  contradictionsCount: number;
  detectedByRule: number;
  detectedByGemini: number;
  warnings: string[];
};

/**
 * 1. detectStale(projectId, requestingUserRole)
 * Claims with type in ('next_action','blocker') or matching /in progress|ongoing|working on|wip/i,
 * review_state <> 'rejected', and updated_at < now() - interval '14 days'.
 * Only reads claims the requesting user may see (access_tag = ANY(clearance)).
 */
export async function detectStale(
  projectId: string | number,
  requestingUserRole: string
): Promise<StaleDetectionResult> {
  const clearance = clearanceFor(requestingUserRole);

  const { rows } = await pool.query(
    `SELECT c.id::text, c.statement, c.excerpt, c.updated_at,
            ROUND(EXTRACT(EPOCH FROM (now() - c.updated_at)) / 86400) AS days_stale
     FROM claims c
     WHERE c.project_id = $1::bigint
       AND c.access_tag = ANY($2::text[])
       AND c.review_state <> 'rejected'
       AND (
         c.type IN ('next_action', 'blocker')
         OR c.statement ~* '(in progress|ongoing|working on|wip)'
         OR c.excerpt ~* '(in progress|ongoing|working on|wip)'
       )
       AND c.updated_at < (now() - INTERVAL '14 days')
       AND NOT EXISTS (
         SELECT 1 FROM claim_conflicts cc
         WHERE cc.project_id = c.project_id
           AND cc.kind = 'stale'
           AND cc.claim_a_id = c.id
       )`,
    [projectId, clearance]
  );

  let staleCount = 0;
  for (const r of rows) {
    const days = r.days_stale || 14;
    const reason = `Marked in progress but no activity for ${days} days`;

    const ins = await pool.query(
      `INSERT INTO claim_conflicts
         (project_id, kind, claim_a_id, reason, detected_by, status)
       VALUES
         ($1::bigint, 'stale', $2::bigint, $3, 'rule', 'open')
       ON CONFLICT (project_id, claim_a_id) WHERE kind = 'stale'
       DO NOTHING
       RETURNING id`,
      [projectId, r.id, reason]
    );

    if (ins.rows.length > 0) {
      staleCount++;
    }
  }

  return { staleCount };
}

/**
 * 2. detectContradictions(projectId, requestingUserRole)
 * 1. Candidate pairs: claims of same type OR same source sharing >=2 significant tokens,
 *    created at different times, limited to 30 pairs.
 * 2. Rule layer first: reversal cues + shared subject tokens OR verb negation.
 * 3. Gemini layer for remaining pairs batched in ONE call with 15s timeout.
 * 4. Insert contradictions with detected_by='rule'|'gemini'.
 */
export async function detectContradictions(
  projectId: string | number,
  requestingUserRole: string
): Promise<ContradictionDetectionResult> {
  const clearance = clearanceFor(requestingUserRole);
  const warnings: string[] = [];

  // Fetch approved/draft claims visible to this role
  const { rows: claims } = await pool.query(
    `SELECT c.id::text, c.source_id::text, c.type, c.statement, c.excerpt, c.created_at
     FROM claims c
     WHERE c.project_id = $1::bigint
       AND c.access_tag = ANY($2::text[])
       AND c.review_state <> 'rejected'
     ORDER BY c.created_at ASC`,
    [projectId, clearance]
  );

  type CandidatePair = {
    claimA: typeof claims[0];
    claimB: typeof claims[0];
    sharedTokens: string[];
    ruleReason?: string;
  };

  const candidatePairs: CandidatePair[] = [];

  // 1. Find candidate pairs sharing >= 2 significant tokens
  for (let i = 0; i < claims.length; i++) {
    const a = claims[i];
    const tokensA = extractSignificantTokens(a.statement);

    for (let j = i + 1; j < claims.length; j++) {
      const b = claims[j];
      // Must be same type OR same source
      if (a.type !== b.type && a.source_id !== b.source_id) {
        continue;
      }
      // Must be created at different times (or different IDs)
      if (a.id === b.id) {
        continue;
      }

      const tokensB = extractSignificantTokens(b.statement);
      const shared: string[] = [];
      for (const t of tokensA) {
        if (tokensB.has(t)) {
          shared.push(t);
        }
      }

      if (shared.length >= 2) {
        candidatePairs.push({
          claimA: a,
          claimB: b,
          sharedTokens: shared,
        });
      }

      if (candidatePairs.length >= 30) break;
    }
    if (candidatePairs.length >= 30) break;
  }

  const confirmedRuleContradictions: { claimAId: string; claimBId: string; reason: string }[] = [];
  const remainingForGemini: CandidatePair[] = [];

  // 2. Rule layer first
  for (const pair of candidatePairs) {
    const textA = pair.claimA.statement + " " + (pair.claimA.excerpt || "");
    const textB = pair.claimB.statement + " " + (pair.claimB.excerpt || "");

    const hasReversalCueA = REVERSAL_CUES.test(textA);
    const hasReversalCueB = REVERSAL_CUES.test(textB);
    const hasNegationA = NEGATION_VERBS.test(textA);
    const hasNegationB = NEGATION_VERBS.test(textB);

    if (hasReversalCueA || hasReversalCueB) {
      const cueClaim = hasReversalCueB ? "Claim B" : "Claim A";
      confirmedRuleContradictions.push({
        claimAId: pair.claimA.id,
        claimBId: pair.claimB.id,
        reason: `Reversal cue detected in ${cueClaim} referencing shared subject '${pair.sharedTokens.join(", ")}'`,
      });
    } else if ((hasNegationA && !hasNegationB) || (hasNegationB && !hasNegationA)) {
      confirmedRuleContradictions.push({
        claimAId: pair.claimA.id,
        claimBId: pair.claimB.id,
        reason: `Opposing verb negation detected on shared topic '${pair.sharedTokens.join(", ")}'`,
      });
    } else {
      remainingForGemini.push(pair);
    }
  }

  // 3. Gemini layer for remaining pairs (batched in ONE call)
  const confirmedGeminiContradictions: { claimAId: string; claimBId: string; reason: string }[] = [];

  if (remainingForGemini.length > 0) {
    const apiKey = process.env.GEMINI_API_KEY;
    const model = process.env.GEMINI_MODEL || "gemini-3.8-flash";

    if (!apiKey) {
      warnings.push("GEMINI_API_KEY is not set. Gemini contradiction check skipped; rule results retained.");
    } else {
      const pairBatch = remainingForGemini.map((p, idx) => ({
        pair_id: `pair_${idx}_${p.claimA.id}_${p.claimB.id}`,
        claim_a_id: p.claimA.id,
        claim_b_id: p.claimB.id,
        claim_a: p.claimA.statement,
        claim_b: p.claimB.statement,
      }));

      const prompt = `You are a strict technical specification auditor.
For each pair of engineering claims, determine if Claim B directly contradicts, supersedes, or reverses Claim A.
If they simply discuss related details or complementary actions, contradicts is false.

Respond ONLY with valid JSON array:
[
  {
    "pair_id": "pair_0_1_2",
    "contradicts": true | false,
    "reason": "Brief explanation of the contradiction"
  }
]

Candidate Pairs:
${JSON.stringify(pairBatch, null, 2)}`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.1,
              responseMimeType: "application/json",
            },
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          warnings.push(`Gemini API returned status ${response.status}. Rule-based results kept.`);
        } else {
          const data = await response.json();
          const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (rawText) {
            let parsed: unknown;
            try {
              parsed = JSON.parse(rawText.trim());
            } catch {
              const match = rawText.match(/\[[\s\S]*\]/);
              if (match) parsed = JSON.parse(match[0]);
            }

            const val = geminiContradictionResponseSchema.safeParse(parsed);
            if (val.success) {
              const pairMap = new Map(pairBatch.map((p) => [p.pair_id, p]));
              for (const item of val.data) {
                if (item.contradicts) {
                  const match = pairMap.get(item.pair_id);
                  if (match) {
                    confirmedGeminiContradictions.push({
                      claimAId: match.claim_a_id,
                      claimBId: match.claim_b_id,
                      reason: item.reason || "Semantic contradiction detected between statements",
                    });
                  }
                }
              }
            } else {
              warnings.push("Gemini response did not match schema. Rule-based results kept.");
            }
          }
        }
      } catch (err: unknown) {
        clearTimeout(timeoutId);
        warnings.push(`Gemini contradiction check timed out or failed (${err instanceof Error ? err.message : String(err)}). Rule-based results kept.`);
      }
    }
  }

  // 4. Insert contradictions into claim_conflicts
  let insertedCount = 0;

  for (const c of confirmedRuleContradictions) {
    const ins = await pool.query(
      `INSERT INTO claim_conflicts
         (project_id, kind, claim_a_id, claim_b_id, reason, detected_by, status)
       VALUES
         ($1::bigint, 'contradiction', $2::bigint, $3::bigint, $4, 'rule', 'open')
       ON CONFLICT (project_id, LEAST(claim_a_id, claim_b_id), GREATEST(claim_a_id, claim_b_id))
       WHERE kind = 'contradiction' AND claim_b_id IS NOT NULL
       DO NOTHING
       RETURNING id`,
      [projectId, c.claimAId, c.claimBId, c.reason]
    );
    if (ins.rows.length > 0) insertedCount++;
  }

  for (const c of confirmedGeminiContradictions) {
    const ins = await pool.query(
      `INSERT INTO claim_conflicts
         (project_id, kind, claim_a_id, claim_b_id, reason, detected_by, status)
       VALUES
         ($1::bigint, 'contradiction', $2::bigint, $3::bigint, $4, 'gemini', 'open')
       ON CONFLICT (project_id, LEAST(claim_a_id, claim_b_id), GREATEST(claim_a_id, claim_b_id))
       WHERE kind = 'contradiction' AND claim_b_id IS NOT NULL
       DO NOTHING
       RETURNING id`,
      [projectId, c.claimAId, c.claimBId, c.reason]
    );
    if (ins.rows.length > 0) insertedCount++;
  }

  return {
    contradictionsCount: insertedCount,
    detectedByRule: confirmedRuleContradictions.length,
    detectedByGemini: confirmedGeminiContradictions.length,
    warnings,
  };
}
