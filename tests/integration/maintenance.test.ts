import { runMaintenance } from "@/server/services/maintenance";

import { createAdmin, ownerSql, resetDatabase } from "../support/integration";

beforeEach(resetDatabase);

describe("data retention", () => {
  it("removes old rate-limit windows, expired sessions, old audit entries and old spam only", async () => {
    const admin = await createAdmin();
    await ownerSql`INSERT INTO rate_limits (key, window_start, count) VALUES
      ('old', now() - interval '2 days', 1), ('current', now(), 1)`;
    await ownerSql`INSERT INTO sessions (id, user_id, expires_at) VALUES
      ('expired', ${admin.id}, now() - interval '1 minute')`;
    await ownerSql`INSERT INTO audit_log (action, created_at) VALUES
      ('ancient', now() - interval '400 days'), ('recent', now() - interval '10 days')`;
    await ownerSql`INSERT INTO contact_messages (name, email, body, status, created_at) VALUES
      ('Bot', 'b@x.test', 'old spam', 'spam', now() - interval '40 days'),
      ('Bot', 'b@x.test', 'new spam', 'spam', now() - interval '1 day'),
      ('Person', 'p@x.test', 'old real message', 'archived', now() - interval '400 days')`;

    const removed = await runMaintenance();
    expect(removed).toEqual({ auditLog: 1, spam: 1, uploads: 0 });

    expect((await ownerSql`SELECT key FROM rate_limits`).map((r) => r.key)).toEqual(["current"]);
    const sessions = await ownerSql`SELECT id FROM sessions`;
    expect(sessions.map((r) => r.id)).not.toContain("expired");
    expect(sessions).toHaveLength(1); // the admin's valid session survives
    expect(
      (await ownerSql`SELECT action FROM audit_log WHERE action IN ('ancient', 'recent')`).map(
        (r) => r.action,
      ),
    ).toEqual(["recent"]);
    expect(
      (await ownerSql`SELECT body FROM contact_messages ORDER BY body`).map((r) => r.body),
    ).toEqual(["new spam", "old real message"]);
  });
});
