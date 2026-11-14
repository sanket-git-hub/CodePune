"use server";

import { auth } from "@/auth";
import { pool } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import { checkClaimSupport } from "@/lib/support-check";
import { clearanceFor } from "@/lib/permissions";
import { revalidatePath } from "next/cache";

async function requireReviewerOrAdmin() {
  const session = await auth();
  const user = session?.user;
  if (!user || (user.role !== "reviewer" && user.role !== "admin")) {
    throw new Error("Unauthorized: Only reviewers or admins can run evidence support checks");
  }
  return user;
}

/**
 * Runs the Gemini evidence support check on a single claim.
 * Only allowed for claims with integrity_ok=true.
 */
export async function runSupportCheck(claimId: string) {
  const user = await requireReviewerOrAdmin();

  // Retrieve claim: statement & excerpt (already masked in DB), checking clearance
  const clearance = clearanceFor(user.role);
  const { rows } = await pool.query(
    `SELECT id, statement, excerpt, integrity_ok, access_tag
     FROM claims
     WHERE id = $1::bigint
       AND access_tag = ANY($2::text[])`,
    [claimId, clearance]
  );

  const claim = rows[0];
  if (!claim) {
    throw new Error("Claim not found or access denied");
  }

  if (!claim.integrity_ok) {
    throw new Error("Cannot run support check: excerpt is not an exact substring of chunk (integrity_ok is false)");
  }

  // Call Gemini (send ONLY statement and excerpt)
  const check = await checkClaimSupport(claim.statement, claim.excerpt);

  // Update claim with support check result
  await pool.query(
    `UPDATE claims
     SET support_result = $1,
         support_reason = $2,
         support_checked_at = now()
     WHERE id = $3::bigint`,
    [check.result, check.reason, claimId]
  );

  await writeAudit({
    userId: user.id,
    action: "claim.support_check",
    entity: "claim",
    entityId: claimId,
    detail: { result: check.result, reason: check.reason },
  });

  revalidatePath("/work");
  revalidatePath("/decisions");
  return { success: true, result: check.result, reason: check.reason };
}

/**
 * Runs evidence support checks on up to 20 draft claims sequentially.
 */
export async function checkAllDrafts(projectId?: string) {
  const user = await requireReviewerOrAdmin();
  const clearance = clearanceFor(user.role);

  // Fetch up to 20 draft claims with integrity_ok = true where support_checked_at IS NULL
  const { rows } = await pool.query(
    `SELECT id, statement, excerpt
     FROM claims
     WHERE review_state = 'draft'
       AND integrity_ok = true
       AND access_tag = ANY($1::text[])
       AND ($2::bigint IS NULL OR project_id = $2::bigint)
     ORDER BY id ASC
     LIMIT 20`,
    [clearance, projectId ?? null]
  );

  const results: { id: string; success: boolean; result?: string; error?: string }[] = [];

  // Run sequentially to respect rate limits & order
  for (const claim of rows) {
    try {
      const check = await checkClaimSupport(claim.statement, claim.excerpt);
      await pool.query(
        `UPDATE claims
         SET support_result = $1,
             support_reason = $2,
             support_checked_at = now()
         WHERE id = $3::bigint`,
        [check.result, check.reason, claim.id]
      );
      await writeAudit({
        userId: user.id,
        action: "claim.support_check",
        entity: "claim",
        entityId: claim.id,
        detail: { result: check.result, reason: check.reason },
      });
      results.push({ id: String(claim.id), success: true, result: check.result });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      results.push({ id: String(claim.id), success: false, error: msg });
    }
  }

  revalidatePath("/work");
  revalidatePath("/decisions");
  return { processed: results.length, details: results };
}

/**
 * Approve a claim with support-check governance rule:
 * Rule: Approve sets evidence_status='verified' only if integrity_ok AND support_result = 'supports'.
 * If result is partial or not_supported, approving sets 'inferred' unless overrideNote is provided.
 * Overriding requires a note and is logged to audit_log.
 */
export async function approveClaimWithGovernance({
  claimId,
  overrideNote,
}: {
  claimId: string;
  overrideNote?: string;
}) {
  const user = await requireReviewerOrAdmin();
  const clearance = clearanceFor(user.role);

  const { rows } = await pool.query(
    `SELECT id, integrity_ok, support_result, version
     FROM claims
     WHERE id = $1::bigint AND access_tag = ANY($2::text[])`,
    [claimId, clearance]
  );

  const claim = rows[0];
  if (!claim) {
    throw new Error("Claim not found or access denied");
  }

  let finalEvidenceStatus: "verified" | "inferred" = "inferred";
  let isOverride = false;

  if (claim.integrity_ok && claim.support_result === "supports") {
    finalEvidenceStatus = "verified";
  } else if (overrideNote && overrideNote.trim().length > 0) {
    if (!claim.integrity_ok) {
      throw new Error("Cannot verify a claim with integrity_ok=false even with override");
    }
    finalEvidenceStatus = "verified";
    isOverride = true;
  } else {
    // Approved without override when support is partial or not_supported -> inferred
    finalEvidenceStatus = "inferred";
  }

  await pool.query(
    `UPDATE claims
     SET review_state = 'approved',
         evidence_status = $1,
         updated_at = now()
     WHERE id = $2::bigint`,
    [finalEvidenceStatus, claimId]
  );

  await writeAudit({
    userId: user.id,
    action: isOverride ? "claim.approve_override" : "claim.approve",
    entity: "claim",
    entityId: claimId,
    detail: {
      evidence_status: finalEvidenceStatus,
      support_result: claim.support_result,
      override_note: overrideNote || null,
    },
  });

  revalidatePath("/work");
  revalidatePath("/decisions");
  return { success: true, evidence_status: finalEvidenceStatus, isOverride };
}
