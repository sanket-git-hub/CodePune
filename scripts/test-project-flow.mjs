// scripts/test-project-flow.mjs - Comprehensive E2E and Security Test Suite for Neon PostgreSQL
import { config } from "dotenv";
config({ path: "C:/Users/Sanket/Desktop/HackPune/baton/.env.local" });

import { Pool } from "pg";

async function main() {
  const {
    createProjectWithTransaction,
    getInvitationByToken,
    acceptInvitation,
    revokeInvitation,
    isUserProjectAdmin,
    listUserProjects,
    getProjectAdminData,
    hashToken,
  } = await import("../lib/projects.ts");

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: true },
  });

  console.log("=== STARTING BATON PROJECT & INVITATION TEST SUITE ===\n");
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  // Set up test users in Neon
  console.log("-> Ensuring test users exist in Neon...");
  const userA_res = await pool.query(
    `INSERT INTO users (name, email, role)
     VALUES ('User A Admin', 'usera-admin@test.byebyebrain.com', 'incoming')
     ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
     RETURNING id::text, email`
  );
  const userA = userA_res.rows[0];

  const userB_res = await pool.query(
    `INSERT INTO users (name, email, role)
     VALUES ('User B Reviewer', 'userb-reviewer@test.byebyebrain.com', 'incoming')
     ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
     RETURNING id::text, email`
  );
  const userB = userB_res.rows[0];

  const userC_res = await pool.query(
    `INSERT INTO users (name, email, role)
     VALUES ('User C Intruder', 'userc-intruder@test.byebyebrain.com', 'incoming')
     ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
     RETURNING id::text, email`
  );
  const userC = userC_res.rows[0];

  console.log(`Users verified: UserA (${userA.id}), UserB (${userB.id}), UserC (${userC.id})\n`);

  // ==========================================
  // TEST A: Project Creation & Admin Role Assignment
  // ==========================================
  console.log("--- TEST A: Project Creation & Creator Admin Role ---");
  const testProjName = `Test Alpha Project ${Date.now()}`;
  const createResult = await createProjectWithTransaction({
    creatorUserId: userA.id,
    creatorName: "User A",
    name: testProjName,
    description: "Automated E2E Verification Project",
    invitations: [
      { email: "userb-reviewer@test.byebyebrain.com", role: "reviewer" },
    ],
  });

  assert(createResult.project.id, "Project created in Neon with valid ID");
  assert(createResult.project.name === testProjName, "Project name matches in Neon");
  assert(createResult.invitations.length === 1, "Invitation was created and returned");

  const projectId = createResult.project.id;
  const rawInviteToken = createResult.invitations[0].inviteUrl.split("/invite/")[1];

  // Verify creator is 'admin' in project_members
  const memberCheck = await pool.query(
    "SELECT role FROM project_members WHERE project_id = $1::bigint AND user_id = $2::bigint",
    [projectId, userA.id]
  );
  assert(memberCheck.rows.length === 1, "Creator exists in project_members");
  assert(memberCheck.rows[0].role === "admin", "Creator automatically assigned role = 'admin'");

  const isAdminCheck = await isUserProjectAdmin(userA.id, projectId);
  assert(isAdminCheck === true, "isUserProjectAdmin correctly returns true for creator");

  console.log("TEST A passed successfully.\n");

  // ==========================================
  // TEST B: Email Invitation & Acceptance Flow
  // ==========================================
  console.log("--- TEST B: Secure Invitation Link & Acceptance ---");
  const invInfo = await getInvitationByToken(rawInviteToken);
  assert(invInfo.valid === true, "Token validation returns valid=true");
  assert(invInfo.invitation.invitedEmail === userB.email, "Invited email matches User B");
  assert(invInfo.invitation.invitedRole === "reviewer", "Invited role is reviewer");
  assert(invInfo.invitation.status === "pending", "Initial invitation status is pending");

  // Accept as User B
  const acceptRes = await acceptInvitation({
    rawToken: rawInviteToken,
    authenticatedUserId: userB.id,
    authenticatedUserEmail: userB.email,
  });

  assert(acceptRes.success === true, "Invitation accepted successfully by User B");
  assert(acceptRes.role === "reviewer", "Accepted role assigned correctly");

  // Verify User B is in project_members
  const userBMembership = await pool.query(
    "SELECT role FROM project_members WHERE project_id = $1::bigint AND user_id = $2::bigint",
    [projectId, userB.id]
  );
  assert(userBMembership.rows.length === 1, "User B is now in project_members");
  assert(userBMembership.rows[0].role === "reviewer", "User B has role 'reviewer'");

  // Verify invitation status in Neon changed to 'accepted'
  const invDbCheck = await pool.query(
    "SELECT status, accepted_at FROM project_invitations WHERE project_id = $1::bigint AND invited_email = $2",
    [projectId, userB.email]
  );
  assert(invDbCheck.rows[0].status === "accepted", "Invitation status is 'accepted' in Neon");
  assert(invDbCheck.rows[0].accepted_at !== null, "accepted_at timestamp is populated");

  console.log("TEST B passed successfully.\n");

  // ==========================================
  // TEST C: Security & Vulnerability Tests
  // ==========================================
  console.log("--- TEST C: Security & Tamper Rejection ---");

  // 1. Single-use: Try to accept the same invitation again
  try {
    const reAccept = await acceptInvitation({
      rawToken: rawInviteToken,
      authenticatedUserId: userB.id,
      authenticatedUserEmail: userB.email,
    });
    assert(reAccept.alreadyMember === true, "Already member safely handled without duplicate");
  } catch (err) {
    assert(err.message.includes("already been accepted"), "Rejects re-accepting accepted invitation");
  }

  // 2. Email mismatch: Create an invitation for a test address, have User C try to accept it
  const dummyInviteRes = await createProjectWithTransaction({
    creatorUserId: userA.id,
    creatorName: "User A",
    name: `Security Project ${Date.now()}`,
    invitations: [{ email: "target-recipient@company.com", role: "incoming" }],
  });
  const secProjId = dummyInviteRes.project.id;
  const secToken = dummyInviteRes.invitations[0].inviteUrl.split("/invite/")[1];

  let emailMismatchBlocked = false;
  try {
    await acceptInvitation({
      rawToken: secToken,
      authenticatedUserId: userC.id,
      authenticatedUserEmail: userC.email, // intruder email != target-recipient@company.com
    });
  } catch (err) {
    if (err.message.includes("Email mismatch")) {
      emailMismatchBlocked = true;
    }
  }
  assert(emailMismatchBlocked, "REJECTED: User C cannot accept User B's invitation (email mismatch)");

  // 3. Revoked invitation rejection
  const invToRevoke = await pool.query(
    "SELECT id FROM project_invitations WHERE project_id = $1::bigint",
    [secProjId]
  );
  await revokeInvitation({
    invitationId: invToRevoke.rows[0].id,
    actorUserId: userA.id,
  });

  let revokedBlocked = false;
  try {
    await acceptInvitation({
      rawToken: secToken,
      authenticatedUserId: userC.id,
      authenticatedUserEmail: "target-recipient@company.com",
    });
  } catch (err) {
    if (err.message.includes("revoked")) {
      revokedBlocked = true;
    }
  }
  assert(revokedBlocked, "REJECTED: Revoked invitation cannot be accepted");

  // 4. Token hash check: Raw tokens must NEVER be stored in the database
  const tokenInDb = await pool.query(
    "SELECT token_hash FROM project_invitations WHERE project_id = $1::bigint",
    [secProjId]
  );
  assert(tokenInDb.rows[0].token_hash !== secToken, "Token in DB is hashed, NOT plaintext");
  assert(tokenInDb.rows[0].token_hash === hashToken(secToken), "Token hash matches SHA-256");

  // 5. Normal member cannot invite as admin
  const invalidInviteProj = await createProjectWithTransaction({
    creatorUserId: userA.id,
    creatorName: "User A",
    name: `Admin Invite Check ${Date.now()}`,
    invitations: [{ email: "hack@company.com", role: "admin" }],
  });
  assert(invalidInviteProj.invitations[0].role !== "admin", "Ordinary invitation role 'admin' sanitized/prevented");

  console.log("TEST C passed successfully.\n");

  // ==========================================
  // TEST D: Database Persistence & Queries
  // ==========================================
  console.log("--- TEST D: Neon PostgreSQL Data Persistence ---");

  // Add project message
  await pool.query(
    "INSERT INTO project_messages (project_id, user_id, message) VALUES ($1::bigint, $2::bigint, 'Welcome to the project!')",
    [projectId, userA.id]
  );

  const messages = await pool.query(
    "SELECT message FROM project_messages WHERE project_id = $1::bigint",
    [projectId]
  );
  assert(messages.rows.length === 1, "Project messages persist in Neon");

  const adminData = await getProjectAdminData(projectId);
  assert(adminData.project.name === testProjName, "Project retrieved cleanly with members and invitations");
  assert(adminData.members.length === 2, "2 active members retrieved (Admin + Reviewer)");
  assert(adminData.invitations.length === 1, "Invitation record retrieved with history");

  // List projects for User A and User B
  const listA = await listUserProjects(userA.id, "incoming");
  assert(listA.some((p) => p.id === projectId), "User A sees project in their list");

  const listB = await listUserProjects(userB.id, "incoming");
  assert(listB.some((p) => p.id === projectId), "User B sees project in their list");

  console.log("TEST D passed successfully.\n");

  console.log(`==========================================`);
  console.log(`ALL TESTS PASSED: ${passed} passed, ${failed} failed.`);
  console.log(`==========================================\n`);

  await pool.end();
}

main().catch((err) => {
  console.error("Test run error:", err);
  process.exit(1);
});
