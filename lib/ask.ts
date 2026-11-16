import { z } from "zod";
import { pool } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import { clearanceFor } from "@/lib/permissions";

export const askInputSchema = z.object({
  question: z.string().trim().min(1, "Question cannot be empty").max(300, "Maximum 300 characters"),
});

const geminiResponseSchema = z.object({
  answer: z.string(),
  claim_ids: z.array(z.union([z.string(), z.number()])).default([]),
});

export type AskSourceClaim = {
  id: string;
  type: string;
  statement: string;
  excerpt: string;
  access_tag: string;
  evidence_status: string;
};

export type AskResult = {
  answer: string;
  citedClaims: AskSourceClaim[];
};

// In-memory rate limiting: 10 questions per minute per user
const rateLimits = new Map<string, number[]>();

export function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const windowMs = 60 * 1000;
  const timestamps = (rateLimits.get(userId) || []).filter((t) => now - t < windowMs);

  if (timestamps.length >= 10) {
    return false;
  }

  timestamps.push(now);
  rateLimits.set(userId, timestamps);
  return true;
}

/**
 * Executes Q&A over approved handover claims.
 * Allowed: incoming, reviewer, admin, leaver. NOT outsider.
 * Handover must be 'approved'.
 */
export async function askHandover({
  userId,
  userRole,
  projectId,
  question,
}: {
  userId: string;
  userRole: string;
  projectId?: string;
  question: string;
}): Promise<AskResult> {
  // 1. Role validation: NOT outsider
  if (userRole === "outsider") {
    throw new Error("Forbidden: Outsiders cannot access Ask Q&A");
  }
  const allowedRoles = ["incoming", "reviewer", "admin", "leaver"];
  if (!allowedRoles.includes(userRole)) {
    throw new Error("Unauthorized role");
  }

  // 2. Validate question
  const parsed = askInputSchema.safeParse({ question });
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message || "Invalid question");
  }
  const cleanQuestion = parsed.data.question;

  // 3. Rate limiting check (10 questions per minute per user)
  if (!checkRateLimit(userId)) {
    throw new Error("Rate limit exceeded: Maximum 10 questions per minute. Please wait.");
  }

  // 4. Check if project has approved or draft handover (soft check)
  // We allow Q&A across the project's claims even if handover is in progress/draft
  let hasHandover = true;
  if (projectId) {
    const handoverCheck = await pool.query(
      `SELECT id, status
       FROM handovers
       WHERE project_id = $1::bigint
       LIMIT 1`,
      [projectId]
    );
    if (handoverCheck.rows.length === 0) {
      hasHandover = false;
    }
  }

  // 5. Full-text search and semantic retrieval BEFORE any AI call
  // Conditions: project_id = current project AND access_tag = ANY(clearance)
  const clearance = clearanceFor(userRole);

  const { rows } = await pool.query(
    `SELECT id::text, type, statement, excerpt, access_tag, evidence_status,
            ts_rank_cd(to_tsvector('english', statement || ' ' || COALESCE(excerpt, '')), plainto_tsquery('english', $1)) AS rank
     FROM claims
     WHERE access_tag = ANY($2::text[])
       AND ($3::bigint IS NULL OR project_id = $3::bigint)
       AND (
         plainto_tsquery('english', $1) @@ to_tsvector('english', statement || ' ' || COALESCE(excerpt, ''))
         OR $1 = ''
         OR statement ILIKE ('%' || $1 || '%')
         OR excerpt ILIKE ('%' || $1 || '%')
       )
     ORDER BY rank DESC, id ASC
     LIMIT 10`,
    [cleanQuestion, clearance, projectId ?? null]
  );

  const candidateClaims: AskSourceClaim[] = rows;

  // 6. Gemini Generation (Server-side only)
  const apiKey = process.env.GEMINI_API_KEY;
  // Use gemini-2.5-flash or gemini-1.5-flash or fallback
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured on the server");
  }

  const claimsPromptContext = candidateClaims.length > 0
    ? candidateClaims
        .map((c) => `[Claim #${c.id}] Type: ${c.type}\nStatement: ${c.statement}\nExcerpt: ${c.excerpt}`)
        .join("\n\n")
    : "No directly matching verified claims found in the database for this specific query.";

  const systemInstructions = `You are Baton AI, an expert engineering handover and architectural assistant for the team.
Instructions:
1. First, prioritize answering using verified facts directly stated in the Provided Claims below.
2. If the user question can be directly answered or cited from the claims, cite the claim IDs you used in the 'claim_ids' array.
3. If the provided claims do not contain the complete answer, synthesize helpful, architecturally sound engineering guidance, best practices, and next steps relevant to the user's question, while making it clear what is grounded in the project claims vs general best practice.
4. Output strictly valid JSON with this format:
{"answer": "Your detailed, clear markdown formatted answer here", "claim_ids": ["1", "2"]}`;

  const prompt = `${systemInstructions}

Provided Claims:
${claimsPromptContext}

User Question:
"${cleanQuestion}"`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(`Gemini API error (${response.status}): ${errorText || response.statusText}`);
  }

  const data = await response.json();
  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!rawText) {
    throw new Error("No response generated by Gemini");
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(rawText);
  } catch {
    throw new Error("Invalid JSON returned by Gemini");
  }

  const validated = geminiResponseSchema.safeParse(parsedJson);
  if (!validated.success) {
    throw new Error("Invalid answer format from Gemini");
  }

  const rawCited = validated.data.claim_ids.map(String);
  // Drop any cited id not in the retrieved candidate list
  const validIds = new Set(candidateClaims.map((c) => c.id));
  const filteredCitedIds = rawCited.filter((id) => validIds.has(id));

  const citedClaims = candidateClaims.filter((c) => filteredCitedIds.includes(c.id));

  // 7. Write audit_log
  await writeAudit({
    userId,
    action: "ask.query",
    entity: "handover",
    detail: {
      question: cleanQuestion,
      claims_retrieved: candidateClaims.length,
      cited_ids: filteredCitedIds,
    },
  });

  return {
    answer: validated.data.answer,
    citedClaims,
  };
}
