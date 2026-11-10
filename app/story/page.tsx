import { requireUser } from "@/lib/session";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { DECISIONS } from "@/lib/demo-data";
import { CHAPTERS } from "@/lib/demo-data-extra";
import { StoryTimeline } from "./story-timeline";

export default async function StoryPage() {
  const user = await requireUser();

  return (
    <AppShell user={user} section="The story so far">
      <PageHeader
        title="The story so far"
        subtitle="Every project has a story. This is yours."
      />
      <StoryTimeline chapters={CHAPTERS} decisions={DECISIONS} />
    </AppShell>
  );
}
