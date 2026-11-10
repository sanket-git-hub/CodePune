import { signOut } from "@/auth";

export function LogoutButton() {
  return (
    <form
      action={async () => {
        "use server";
        await signOut({ redirectTo: "/login" });
      }}
    >
      <button
        type="submit"
        className="h-10 rounded-lg border border-white/10 px-4 text-sm text-[#F4F4FA] hover:bg-white/5"
      >
        Log out
      </button>
    </form>
  );
}
