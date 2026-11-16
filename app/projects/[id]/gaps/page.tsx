import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireUser } from "@/lib/session";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { pool } from "@/lib/db";
import { GapsClient, type KnowledgeGapItem } from "./gaps-client";

export default async function ProjectGapsPage({
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

  // User project role
  const { rows: memberRows } = await pool.query(
    `SELECT COALESCE(pm.role, u.role, 'incoming') AS role
     FROM users u
     LEFT JOIN project_members pm ON pm.user_id = u.id AND pm.project_id = $1::bigint
     WHERE u.id = $2::bigint`,
    [id, user.id]
  );
  const effectiveRole = memberRows[0]?.role || "incoming";

  // Query gaps
  const { rows: gapRows } = await pool.query(
    `SELECT kg.id::text, kg.project_id::text, kg.title, kg.description, kg.severity,
            kg.status, kg.gap_type, kg.question, kg.answer, kg.related_claim_id::text,
            kg.related_source_id::text, kg.answered_claim_id::text, kg.answered_at::text,
            kg.created_at::text,
            rc.statement AS related_claim_statement, rc.type AS related_claim_type,
            rs.title AS related_source_title,
            ac.statement AS answered_claim_statement, ac.review_state AS answered_claim_review_state
     FROM knowledge_gaps kg
     LEFT JOIN claims rc ON kg.related_claim_id = rc.id
     LEFT JOIN sources rs ON kg.related_source_id = rs.id
     LEFT JOIN claims ac ON kg.answered_claim_id = ac.id
     WHERE kg.project_id = $1::bigint
     ORDER BY CASE kg.status WHEN 'open' THEN 1 WHEN 'in_progress' THEN 2 WHEN 'resolved' THEN 3 ELSE 4 END, kg.created_at DESC`,
    [id]
  );

  return (
    <AppShell
      user={user}
      section="Knowledge Gaps"
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
        eyebrow={`${project.name.toUpperCase()} / CONTINUITY AUDIT`}
        title="Knowledge Gap Finder"
        subtitle="Identifies ungrounded decisions, unassigned tasks, and single-contributor dependencies with direct leaver questions."
      />

      <GapsClient
        projectId={id}
        projectName={project.name}
        initialGaps={gapRows as KnowledgeGapItem[]}
        userRole={effectiveRole}
      />
    </AppShell>
  );
}
