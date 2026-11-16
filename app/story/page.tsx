import Link from "next/link";
import { Plus, BookOpen, FolderKanban } from "lucide-react";
import { requireUser } from "@/lib/session";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { DECISIONS, type Decision } from "@/lib/demo-data";
import { CHAPTERS, type Chapter } from "@/lib/demo-data-extra";
import { StoryTimeline } from "./story-timeline";
import { listUserProjects } from "@/lib/projects";
import { pool } from "@/lib/db";

export default async function StoryPage() {
  const user = await requireUser();
  const isDemo =
    Boolean(user.email?.endsWith("@demo.byebyebrain.test")) ||
    user.id === "demo-priya";

  let decisions: Decision[] = DECISIONS;
  let chapters: Chapter[] = CHAPTERS;
  let projectName = "Campus Pay";

  if (!isDemo) {
    const userProjects = await listUserProjects(user.id, user.role);
    if (userProjects.length > 0) {
      const activeProj = userProjects[0];
      projectName = activeProj.name;

      const { rows } = await pool.query(
        `SELECT c.id::text, c.statement AS title, c.excerpt AS why, c.access_tag AS tag,
                to_char(c.created_at, 'Mon DD, YYYY') AS date,
                COALESCE(u.name, 'Team') AS by
         FROM claims c
         LEFT JOIN users u ON c.created_by = u.id
         WHERE c.project_id = $1::bigint AND c.type = 'decision'
         ORDER BY c.created_at ASC`,
        [activeProj.id]
      );

      if (rows.length > 0) {
        decisions = rows.map((r) => ({
          id: r.id,
          tag: (r.tag || "eng").toUpperCase(),
          date: r.date || "Recent",
          title: r.title,
          by: (r.by as any) || "Team",
          why: r.why,
          rejected: "Captured from verified project sources.",
        }));

        chapters = [
          {
            id: "c-live",
            label: "Chapter 01 · Live",
            tone: "violet",
            title: "Genesis & Key Decisions",
            summary: `Architecture and operational decisions recorded for ${projectName}.`,
            who: "Team" as any,
            storyOf: "Team’s story",
            tag: "Continuity",
            context: `Architecture and operational decisions recorded for ${projectName}.`,
            decisionIds: decisions.map((d) => d.id),
          },
        ];
      } else {
        decisions = [];
        chapters = [];
      }
    } else {
      decisions = [];
      chapters = [];
      projectName = "Workspace";
    }
  }

  return (
    <AppShell
      user={user}
      section="The story so far"
      projectName={projectName}
      isDemo={isDemo}
    >
      <PageHeader
        eyebrow={`${projectName.toUpperCase()} / TIMELINE`}
        title="The story so far"
        subtitle="Every project has a story. This is yours."
      />

      {decisions.length > 0 ? (
        <StoryTimeline chapters={chapters} decisions={decisions} />
      ) : (
        <div className="mt-8 flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-12 text-center backdrop-blur-xl">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#6366F1]/15 text-[#C4B5FD]">
            <BookOpen size={28} />
          </div>
          <h3 className="mt-4 text-lg font-semibold text-white">
            No story timeline yet for {projectName}
          </h3>
          <p className="mt-1 max-w-md text-sm text-[#A5A5C0]">
            The story timeline is generated from architectural decisions and verified claims. Once you import project data, your narrative timeline will be built automatically.
          </p>
          <div className="mt-6 flex gap-3">
            <Link
              href="/capture"
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#6366F1] px-5 text-sm font-semibold text-white transition hover:bg-[#4F46E5]"
            >
              <Plus size={16} />
              Import Project Data
            </Link>
          </div>
        </div>
      )}
    </AppShell>
  );
}
