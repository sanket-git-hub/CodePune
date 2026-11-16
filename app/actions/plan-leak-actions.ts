"use server";

import { pool } from "@/lib/db";
import { clearanceFor } from "@/lib/permissions";
import { generatePlan, type ClaimForPlan } from "@/lib/onboarding";

export type PlanLeakTestResult = {
  testedUserRole: string;
  passed: boolean;
  leakedHr: boolean;
  leakedFinance: boolean;
  allClaimIdsPermitted: boolean;
  claimsTestedCount: number;
  planItemCount: number;
  planCheckCount: number;
  summary: string;
};

export async function testOnboardingPlanLeak(): Promise<{
  incoming: PlanLeakTestResult;
  outsider: PlanLeakTestResult;
}> {
  const hrMarker = "LEAKMARKER-HR-7731";
  const finMarker = "LEAKMARKER-FIN-4410";

  // Run test for incoming (public + eng) and outsider (public only)
  async function testRole(role: "incoming" | "outsider"): Promise<PlanLeakTestResult> {
    const clearance = clearanceFor(role);

    // Fetch claims filtered by SQL clearance BEFORE any plan generation
    const { rows } = await pool.query(
      `SELECT id::int, type, statement, excerpt, access_tag
       FROM claims
       WHERE review_state = 'approved'
         AND access_tag = ANY($1::text[])
       ORDER BY type, id ASC
       LIMIT 20`,
      [clearance]
    );

    const allowedClaimIds = new Set<number>(rows.map((r: any) => r.id));

    // Generate plan
    const plan = await generatePlan(rows);
    const planString = JSON.stringify(plan);

    const leakedHr = planString.includes(hrMarker) || planString.toLowerCase().includes("salary");
    const leakedFinance = planString.includes(finMarker) || planString.toLowerCase().includes("client sheet");

    // Assert every claim_id in the plan came from the clearance-filtered set
    let allClaimIdsPermitted = true;
    for (const item of plan.items) {
      for (const cid of item.claim_ids) {
        if (!allowedClaimIds.has(cid)) {
          allClaimIdsPermitted = false;
        }
      }
    }
    for (const chk of plan.checks) {
      if (!allowedClaimIds.has(chk.claim_id)) {
        allClaimIdsPermitted = false;
      }
    }

    const passed = !leakedHr && !leakedFinance && allClaimIdsPermitted;

    return {
      testedUserRole: role,
      passed,
      leakedHr,
      leakedFinance,
      allClaimIdsPermitted,
      claimsTestedCount: rows.length,
      planItemCount: plan.items.length,
      planCheckCount: plan.checks.length,
      summary: passed
        ? `PASS: Zero leak of HR/Finance markers. 100% of plan claim_ids (${plan.items.length} items, ${plan.checks.length} checks) strictly originated from the ${role} clearance-filtered claim set.`
        : `FAIL: Leak or unauthorized claim ID detected in ${role} plan output.`,
    };
  }

  const incomingResult = await testRole("incoming");
  const outsiderResult = await testRole("outsider");

  return {
    incoming: incomingResult,
    outsider: outsiderResult,
  };
}
