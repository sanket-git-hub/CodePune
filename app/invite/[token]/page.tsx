import { auth } from "@/auth";
import { getInvitationByToken } from "@/lib/projects";
import { InviteClient } from "./invite-client";
import Link from "next/link";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const session = await auth().catch(() => null);
  const invitationData = await getInvitationByToken(token);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#0B0B14] p-4 font-[family-name:var(--font-ui)]">
      <header className="mb-8">
        <Link href="/" className="flex items-center gap-2">
          <svg width="28" height="28" viewBox="0 0 26 26" aria-hidden="true">
            <rect
              x="5"
              y="3"
              width="6"
              height="14"
              rx="3"
              transform="rotate(20 8 10)"
              fill="#8B5CF6"
            />
            <rect
              x="13"
              y="9"
              width="6"
              height="14"
              rx="3"
              transform="rotate(20 16 16)"
              fill="#6366F1"
            />
          </svg>
          <span className="text-xl font-bold tracking-tight text-white">
            Baton<span className="text-[#8B5CF6]">.</span>
          </span>
        </Link>
      </header>

      <InviteClient
        rawToken={token}
        invitationData={invitationData}
        currentUser={
          session?.user
            ? {
                id: session.user.id,
                email: session.user.email,
                name: session.user.name,
                role: session.user.role,
              }
            : null
        }
      />
    </main>
  );
}
