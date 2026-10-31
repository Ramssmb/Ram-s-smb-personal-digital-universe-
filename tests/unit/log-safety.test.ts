import { safeError } from "@/server/log-safety";

describe("safeError", () => {
  it("drops the query text and parameters of failed database queries", () => {
    const cause = Object.assign(
      new Error('null value in column "email" violates not-null constraint'),
      { code: "23502" },
    );
    const error = new Error(
      'Failed query: insert into "contact_messages" ("name", "email", "body") values ($1, $2, $3)\nparams: Jane Doe,jane@example.test,My private message',
      { cause },
    );
    const safe = safeError(error);
    const serialized = JSON.stringify(safe);
    expect(serialized).not.toContain("jane@example.test");
    expect(serialized).not.toContain("My private message");
    expect(serialized).not.toContain("contact_messages");
    expect(safe.code).toBe("23502");
    expect(safe.message).toContain("Failed query (details omitted)");
    expect(safe.message).toContain("not-null constraint");
  });

  it("keeps ordinary error messages, trimmed", () => {
    const safe = safeError(new TypeError("x".repeat(1000)));
    expect(safe.type).toBe("TypeError");
    expect(safe.message.length).toBeLessThanOrEqual(300);
  });

  it("handles non-error values", () => {
    expect(safeError("boom")).toEqual({ type: "string", message: "non-error value thrown" });
  });
});
