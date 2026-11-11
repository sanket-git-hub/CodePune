import { pool } from "@/lib/db";

export type AuditEntry = {
  userId?: string | null;
  action: string; // e.g. "import", "claim.approve", "handover.approve", "handover.acknowledge"
  entity: string; // e.g. "source", "claim", "handover"
  entityId?: string | number | null;
  detail?: Record<string, unknown>; // never put secrets or raw source text here
};

export async function writeAudit(e: AuditEntry): Promise<void> {
  await pool.query(
    `INSERT INTO audit_log (user_id, action, entity, entity_id, detail)
     VALUES ($1::bigint, $2, $3, $4, $5::jsonb)`,
    [
      e.userId ?? null,
      e.action,
      e.entity,
      e.entityId == null ? null : String(e.entityId),
      JSON.stringify(e.detail ?? {}),
    ],
  );
}
