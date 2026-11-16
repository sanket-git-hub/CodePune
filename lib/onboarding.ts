// lib/onboarding.ts
// Day 1 / 7 / 30 Plan, Readiness Score, and Comprehension Checks
import { z } from "zod";
import { pool } from "./db";
import { clearanceFor } from "./permissions";

export type Horizon = "day1" | "day7" | "day30";

export const planItemSchema = z.object({
  id: z.string(),
  horizon: z.enum(["day1", "day7", "day30"]),
  title: z.string(),
  why: z.string(),
  claim_ids: z.array(z.number()),
});

export const comprehensionCheckSchema = z.object({
  id: z.string(),
  question: z.string(),
  options: z.array(z.string()).length(4),
  correct_index: z.number().int().min(0).max(3),
  claim_id: z.number(),
});

export const planOutputSchema = z.object({
  items: z.array(planItemSchema),
  checks: z.array(comprehensionCheckSchema),
});

export type PlanItem = z.infer<typeof planItemSchema>;
export type ComprehensionCheck = z.infer<typeof comprehensionCheckSchema>;
export type PlanOutput = z.infer<typeof planOutputSchema>;

export type StoredPlan = {
  meta: {
    source: "gemini" | "rules";
    generated_at: string;
    claims_count: number;
  };
  items: PlanItem[];
  checks: ComprehensionCheck[];
};

export type ClaimForPlan = {
  id: number;
  type: string;
  statement: string;
  excerpt?: string;
  access_tag?: string;
};

/**
 * 1. getApprovedClaimsForUser
 * Filter runs in SQL BEFORE any Gemini call, exactly matching the handover clearance logic.
 */
export async function getApprovedClaimsForUser(
  projectId: string | number,
  userId: string | number
): Promise<ClaimForPlan[]> {
  // Look up user's effective role (project role or global role)
  const roleRes = await pool.query(
    `SELECT COALESCE(pm.role, u.role, 'incoming') AS role
     FROM users u
     LEFT JOIN project_members pm ON pm.user_id = u.id AND pm.project_id = $1::bigint
     WHERE u.id = $2::bigint`,
    [projectId, userId]
  );

  const role = roleRes.rows[0]?.role || "incoming";
  const clearance = clearanceFor(role);

  const { rows } = await pool.query(
    `SELECT id::int, type, statement, excerpt, access_tag
     FROM claims
     WHERE project_id = $1::bigint
       AND review_state = 'approved'
       AND access_tag = ANY($2::text[])
     ORDER BY type, id ASC`,
    [projectId, clearance]
  );

  return rows;
}

/**
 * Fallback rule-based plan builder.
 * owner/dependency claims -> day1
 * blocker/risk -> day7
 * decision/next_action -> day30
 * Generates comprehension checks from owner and decision claims by template.
 */
export function buildRuleBasedPlan(claims: ClaimForPlan[]): StoredPlan {
  const items: PlanItem[] = [];
  const checks: ComprehensionCheck[] = [];

  const counts: Record<Horizon, number> = { day1: 0, day7: 0, day30: 0 };

  for (const c of claims) {
    let horizon: Horizon = "day30";
    if (c.type === "owner" || c.type === "dependency") {
      horizon = "day1";
    } else if (c.type === "blocker" || c.type === "risk") {
      horizon = "day7";
    } else if (c.type === "decision" || c.type === "next_action") {
      horizon = "day30";
    }

    if (counts[horizon] < 5) {
      counts[horizon]++;
      items.push({
        id: `rule-item-${c.id}`,
        horizon,
        title: c.statement,
        why: `Grounding context from verified ${c.type} claim #${c.id}.`,
        claim_ids: [c.id],
      });
    }

    // Build checks from owner or decision claims
    if (checks.length < 5 && (c.type === "owner" || c.type === "decision")) {
      const isOwner = c.type === "owner";
      const question = isOwner
        ? `Who owns or is responsible for: "${c.statement}"?`
        : `What key decision was established regarding: "${c.statement}"?`;

      checks.push({
        id: `rule-check-${c.id}`,
        question,
        options: [
          `Verified: ${c.statement}`,
          "Pending team discussion and unapproved draft",
          "Deferred indefinitely with no current assignee",
          "External contractor without internal documentation",
        ],
        correct_index: 0,
        claim_id: c.id,
      });
    }
  }

  // If checks are fewer than 3 and we have any claims, build from first available claims
  if (checks.length < 3) {
    for (const c of claims) {
      if (checks.some((chk) => chk.claim_id === c.id)) continue;
      if (checks.length >= 3) break;
      checks.push({
        id: `rule-check-${c.id}`,
        question: `According to the verified project claims, what is true about: "${c.statement.slice(0, 80)}"?`,
        options: [
          c.statement,
          "This action was rejected during code review",
          "This dependency has been removed from production",
          "Deprecated and no longer maintained",
        ],
        correct_index: 0,
        claim_id: c.id,
      });
    }
  }

  return {
    meta: {
      source: "rules",
      generated_at: new Date().toISOString(),
      claims_count: claims.length,
    },
    items,
    checks,
  };
}

/**
 * 2. generatePlan(claims)
 * Calls Gemini server-side with strict JSON schema.
 * Drops any item or check whose claim_ids are not in the input set.
 * Times out after 15s; falls back to rule-based plan. Never throws to UI.
 */
export async function generatePlan(claims: ClaimForPlan[]): Promise<StoredPlan> {
  if (!claims || claims.length === 0) {
    return {
      meta: {
        source: "rules",
        generated_at: new Date().toISOString(),
        claims_count: 0,
      },
      items: [],
      checks: [],
    };
  }

  const validClaimIds = new Set<number>(claims.map((c) => c.id));
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || "gemini-3.8-flash";

  if (!apiKey) {
    console.warn("[Onboarding] GEMINI_API_KEY missing, using rule-based plan.");
    return buildRuleBasedPlan(claims);
  }

  // Send ONLY id, type, statement to Gemini
  const claimContext = claims
    .map((c) => `{"id": ${c.id}, "type": "${c.type}", "statement": ${JSON.stringify(c.statement)}}`)
    .join("\n");

  const prompt = `You are Baton AI, an onboarding plan generator.
Create a structured Day 1, Day 7, Day 30 onboarding plan and comprehension check questions for an incoming engineer.

Rules:
1. Use ONLY the given claims below. Do not use outside facts or invent ungrounded details.
2. Max 5 items per horizon ('day1', 'day7', 'day30').
3. Horizon guidelines:
   - day1: environment access, ownership, critical dependencies, key initial orientations.
   - day7: understanding open blockers, risks, and recurring workflows.
   - day30: long-term architecture decisions, strategic next actions, and full ownership handover.
4. Generate 3 to 5 multiple-choice comprehension check questions grounded strictly in the claims.
   - Each check must have exactly 4 options.
   - correct_index must be the integer 0, 1, 2, or 3 pointing to the true option.
   - claim_id must be the numeric claim ID from which the question and correct answer are derived.
5. Every item must list the numeric claim_ids it was generated from in the 'claim_ids' array.
6. Output strictly valid JSON matching this schema:
{
  "items": [
    {
      "id": "item-1",
      "horizon": "day1" | "day7" | "day30",
      "title": "Clear action title",
      "why": "Brief justification from the claim",
      "claim_ids": [1]
    }
  ],
  "checks": [
    {
      "id": "check-1",
      "question": "Question text grounded in claim",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_index": 0,
      "claim_id": 1
    }
  ]
}

Input Claims:
${claimContext}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

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
      console.warn(`[Onboarding] Gemini API error (${response.status}), falling back to rules.`);
      return buildRuleBasedPlan(claims);
    }

    const data = await response.json();
    const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidateText) {
      console.warn("[Onboarding] Gemini returned empty response, falling back to rules.");
      return buildRuleBasedPlan(claims);
    }

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(candidateText.trim());
    } catch {
      // If code-fenced
      const match = candidateText.match(/\{[\s\S]*\}/);
      if (match) {
        parsedJson = JSON.parse(match[0]);
      } else {
        throw new Error("Invalid JSON from Gemini");
      }
    }

    const validated = planOutputSchema.safeParse(parsedJson);
    if (!validated.success) {
      console.warn("[Onboarding] Gemini output schema validation failed, falling back to rules.", validated.error);
      return buildRuleBasedPlan(claims);
    }

    // STRICT FILTER: DROP any item or check whose claim_ids are not in the input set
    const filteredItems = validated.data.items
      .map((item) => ({
        ...item,
        claim_ids: item.claim_ids.filter((cid) => validClaimIds.has(cid)),
      }))
      .filter((item) => item.claim_ids.length > 0);

    const filteredChecks = validated.data.checks.filter(
      (chk) => validClaimIds.has(chk.claim_id) && chk.options.length === 4
    );

    // If Gemini dropped all items or checks, fallback to rules
    if (filteredItems.length === 0 || filteredChecks.length < 2) {
      return buildRuleBasedPlan(claims);
    }

    // Cap max 5 per horizon
    const counts: Record<Horizon, number> = { day1: 0, day7: 0, day30: 0 };
    const cappedItems: PlanItem[] = [];
    for (const it of filteredItems) {
      if (counts[it.horizon] < 5) {
        counts[it.horizon]++;
        cappedItems.push(it);
      }
    }

    return {
      meta: {
        source: "gemini",
        generated_at: new Date().toISOString(),
        claims_count: claims.length,
      },
      items: cappedItems,
      checks: filteredChecks.slice(0, 5),
    };
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    console.warn("[Onboarding] Gemini generation error or timeout, falling back to rules.", err);
    return buildRuleBasedPlan(claims);
  }
}

/**
 * Computes readiness score:
 * round(100 * (done_items + correct_checks) / (total_items + total_checks))
 */
export function computeReadinessScore(
  items: PlanItem[],
  progress: Record<string, boolean>,
  checks: ComprehensionCheck[],
  answers: Record<string, number>
): number {
  const totalItems = items.length;
  const totalChecks = checks.length;
  const total = totalItems + totalChecks;

  if (total === 0) return 0;

  let doneItems = 0;
  for (const it of items) {
    if (progress[it.id] === true) {
      doneItems++;
    }
  }

  let correctChecks = 0;
  for (const chk of checks) {
    if (answers[chk.id] !== undefined && answers[chk.id] === chk.correct_index) {
      correctChecks++;
    }
  }

  return Math.round((100 * (doneItems + correctChecks)) / total);
}
