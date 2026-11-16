import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireUser } from "@/lib/session";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { pool } from "@/lib/db";
import { clearanceFor } from "@/lib/permissions";
import { ConflictsClient, type ConflictItem } from "./conflicts-client";

export default async function ProjectConflictsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!id || !/^\d+$/.test(id)) {
    notFound();
  }

  const user = await requireUser();

  // Project lookup
  const projRes = await pool.query(
    "SELECT id::text, name, description FROM projects WHERE id = $1::bigint",
    [id]
  );
  if (projRes.rows.length === 0) {
    notFound();
  }
  const project = projRes.rows[0];

  // User role in project
  const { rows: memberRows } = await pool.query(
    `SELECT COALESCE(pm.role, u.role, 'incoming') AS role
     FROM users u
     LEFT JOIN project_members pm ON pm.user_id = u.id AND pm.project_id = $1::bigint
     WHERE u.id = $2::bigint`,
    [id, user.id]
  );
  const effectiveRole = memberRows[0]?.role || "incoming";
  const clearance = clearanceFor(effectiveRole);

  // Query conflicts visible to user
  const { rows: conflictRows } = await pool.query(
    `SELECT cc.id::text, cc.project_id::text, cc.kind, cc.reason, cc.detected_by,
            cc.status, cc.resolution, cc.resolution_note, cc.resolved_at::text,
            cc.is_planted, cc.created_at::text,
            ca.id::text AS claim_a_id, ca.statement AS claim_a_statement, ca.excerpt AS claim_a_excerpt,
            ca.type AS claim_a_type, ca.created_at::text AS claim_a_created_at,
            sa.title AS claim_a_source_title,
            cb.id::text AS claim_b_id, cb.statement AS claim_b_statement, cb.excerpt AS claim_b_excerpt,
            cb.type AS claim_b_type, cb.created_at::text AS claim_b_created_at,
            sb.title AS claim_b_source_title,
            u.name AS resolver_name
     FROM claim_conflicts cc
     JOIN claims ca ON cc.claim_a_id = ca.id
     LEFT JOIN sources sa ON ca.source_id = sa.id
     LEFT JOIN claims cb ON cc.claim_b_id = cb.id
     LEFT JOIN sources sb ON cb.source_id = sb.id
     LEFT JOIN users u ON cc.resolved_by = u.id
     WHERE cc.project_id = $1::bigint
       AND ca.access_tag = ANY($2::text[])
       AND (cb.id IS NULL OR cb.access_tag = ANY($2::text[]))
     ORDER BY CASE cc.status WHEN 'open' THEN 1 ELSE 2 END, cc.created_at DESC`,
    [id, clearance]
  );

  return (
    <AppShell
      user={user}
      section="Conflicts & Stale Work"
      projectName={project.name}
      isDemo={Boolean(user.isDemo)}
    >
      <div className="mb-6 flex items-center justify-between">
        <Link
          href={`/projects/${id}`}
          className="inline-flex items-center gap-1.5 text-xs text-[#A5A5C0] transition hover:text-white"
        >
          <ArrowLeft size={14} />
          <span>Back to Project Workspace</span>
        </Link>
      </div>

      <PageHeader
        eyebrow={`${project.name.toUpperCase()} / AUDIT & INTEGRITY`}
        title="Conflict & Stale-Work Finder"
        subtitle="Detects contradicting architectural decisions, deprecated guidelines, and in-progress tasks lacking momentum."
      />

      <ConflictsClient
        projectId={id}
        projectName={project.name}
        initialConflicts={conflictRows as ConflictItem[]}
        userRole={effectiveRole}
      />
    </AppShell>
  );
}
