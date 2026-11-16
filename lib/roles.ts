// lib/roles.ts - Client-safe role formatting utilities

export function formatRoleName(role?: string | null): string {
  if (!role) return "";
  switch (role.toLowerCase()) {
    case "admin":
      return "Administrator";
    case "reviewer":
      return "Reviewer";
    case "leaver":
      return "Knowledge Leaver";
    case "incoming":
      return "Incoming Member";
    case "outsider":
      return "Guest / Viewer";
    default:
      return role.charAt(0).toUpperCase() + role.slice(1);
  }
}
