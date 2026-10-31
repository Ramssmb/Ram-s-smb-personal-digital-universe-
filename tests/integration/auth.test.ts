import { POST as loginRoute } from "@/app/api/v1/auth/login/route";
import { POST as logoutRoute } from "@/app/api/v1/auth/logout/route";
import { POST as passwordRoute } from "@/app/api/v1/admin/account/password/route";
import { DELETE as signOutOthersRoute } from "@/app/api/v1/admin/account/sessions/route";
import { GET as profileRoute } from "@/app/api/v1/admin/profile/route";
import { validateSession } from "@/server/auth/session";
import { verifyPassword } from "@/server/auth/password";

import {
  anotherSession,
  createAdmin,
  ownerSql,
  PASSWORD,
  request,
  resetDatabase,
  routeContext,
  uniqueIp,
} from "../support/integration";

beforeEach(resetDatabase);

function cookieFrom(response: Response): string {
  const header = response.headers.get("set-cookie") ?? "";
  return header.split(";")[0]!;
}

describe("login", () => {
  it("signs in with the right password and sets an HttpOnly session cookie", async () => {
    const admin = await createAdmin();
    const response = await loginRoute(
      request("POST", "/api/v1/auth/login", { json: { email: admin.email, password: PASSWORD } }),
      routeContext(),
    );
    expect(response.status).toBe(200);
    const header = response.headers.get("set-cookie") ?? "";
    expect(header).toMatch(/^session=[\w-]{40,};/);
    expect(header).toContain("HttpOnly");
    expect(header).toContain("SameSite=Lax");
    expect(await validateSession(cookieFrom(response).split("=")[1])).toMatchObject({
      email: admin.email,
    });
  });

  it("accepts the email in any case", async () => {
    const admin = await createAdmin();
    const response = await loginRoute(
      request("POST", "/api/v1/auth/login", {
        json: { email: admin.email.toUpperCase(), password: PASSWORD },
      }),
      routeContext(),
    );
    expect(response.status).toBe(200);
  });

  it("gives the same answer for a wrong password and an unknown account", async () => {
    const admin = await createAdmin();
    const wrong = await loginRoute(
      request("POST", "/api/v1/auth/login", {
        json: { email: admin.email, password: "nope-nope-nope" },
      }),
      routeContext(),
    );
    const unknown = await loginRoute(
      request("POST", "/api/v1/auth/login", {
        json: { email: "who@example.test", password: "nope-nope-nope" },
      }),
      routeContext(),
    );
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect((await wrong.json()).error.message).toBe((await unknown.json()).error.message);
    expect(wrong.headers.get("set-cookie")).toBeNull();
  });

  it("stores only a hash of the session token", async () => {
    const admin = await createAdmin();
    const response = await loginRoute(
      request("POST", "/api/v1/auth/login", { json: { email: admin.email, password: PASSWORD } }),
      routeContext(),
    );
    const token = cookieFrom(response).split("=")[1]!;
    const rows = await ownerSql<{ id: string }[]>`SELECT id FROM sessions`;
    expect(rows.every((row) => row.id !== token && /^[0-9a-f]{64}$/.test(row.id))).toBe(true);
  });

  it("stores passwords as Argon2id hashes", async () => {
    const admin = await createAdmin();
    const [user] = await ownerSql<
      { password_hash: string }[]
    >`SELECT password_hash FROM users WHERE id = ${admin.id}`;
    expect(user?.password_hash).toMatch(/^\$argon2id\$/);
    expect(await verifyPassword(user!.password_hash, PASSWORD)).toBe(true);
  });

  it("locks out an address after 5 failed attempts, even with the right password", async () => {
    const admin = await createAdmin();
    const ip = uniqueIp();
    for (let i = 0; i < 5; i++) {
      const r = await loginRoute(
        request("POST", "/api/v1/auth/login", {
          ip,
          json: { email: admin.email, password: "wrong-password-x" },
        }),
        routeContext(),
      );
      expect(r.status).toBe(401);
    }
    const blocked = await loginRoute(
      request("POST", "/api/v1/auth/login", {
        ip,
        json: { email: admin.email, password: PASSWORD },
      }),
      routeContext(),
    );
    expect(blocked.status).toBe(429);
    // Another address is unaffected.
    const other = await loginRoute(
      request("POST", "/api/v1/auth/login", { json: { email: admin.email, password: PASSWORD } }),
      routeContext(),
    );
    expect(other.status).toBe(200);
  });

  it("locks an account after 10 failures from many addresses", async () => {
    const admin = await createAdmin();
    for (let i = 0; i < 10; i++) {
      await loginRoute(
        request("POST", "/api/v1/auth/login", {
          json: { email: admin.email, password: "wrong-password-x" },
        }),
        routeContext(),
      );
    }
    const blocked = await loginRoute(
      request("POST", "/api/v1/auth/login", { json: { email: admin.email, password: PASSWORD } }),
      routeContext(),
    );
    expect(blocked.status).toBe(429);
  });

  it("rejects a cross-site login attempt", async () => {
    const admin = await createAdmin();
    const response = await loginRoute(
      request("POST", "/api/v1/auth/login", {
        origin: "https://evil.test",
        json: { email: admin.email, password: PASSWORD },
      }),
      routeContext(),
    );
    expect(response.status).toBe(403);
  });

  it("rejects malformed bodies without a server error", async () => {
    const bad = await loginRoute(
      request("POST", "/api/v1/auth/login", {
        body: "{not json",
        headers: { "content-type": "application/json" },
      }),
      routeContext(),
    );
    expect(bad.status).toBe(400);
    const wrongType = await loginRoute(
      request("POST", "/api/v1/auth/login", {
        body: "email=x",
        headers: { "content-type": "application/x-www-form-urlencoded" },
      }),
      routeContext(),
    );
    expect(wrongType.status).toBe(415);
  });
});

describe("sessions", () => {
  it("logout revokes the session", async () => {
    const admin = await createAdmin();
    const response = await logoutRoute(
      request("POST", "/api/v1/auth/logout", { cookie: admin.cookie }),
      routeContext(),
    );
    expect(response.status).toBe(204);
    expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
    const after = await profileRoute(
      request("GET", "/api/v1/admin/profile", { cookie: admin.cookie }),
      routeContext(),
    );
    expect(after.status).toBe(401);
  });

  it("rejects expired sessions", async () => {
    const admin = await createAdmin();
    await ownerSql`UPDATE sessions SET expires_at = now() - interval '1 minute'`;
    const response = await profileRoute(
      request("GET", "/api/v1/admin/profile", { cookie: admin.cookie }),
      routeContext(),
    );
    expect(response.status).toBe(401);
  });

  it("rejects sessions older than the 30-day absolute limit", async () => {
    const admin = await createAdmin();
    await ownerSql`UPDATE sessions SET created_at = now() - interval '31 days', expires_at = now() + interval '1 day'`;
    await ownerSql`UPDATE users SET password_changed_at = now() - interval '40 days'`;
    const response = await profileRoute(
      request("GET", "/api/v1/admin/profile", { cookie: admin.cookie }),
      routeContext(),
    );
    expect(response.status).toBe(401);
  });

  it("rejects forged and garbage tokens", async () => {
    await createAdmin();
    for (const cookie of ["session=forged-token-value", "session=", `session=${"a".repeat(500)}`]) {
      const response = await profileRoute(
        request("GET", "/api/v1/admin/profile", { cookie }),
        routeContext(),
      );
      expect(response.status).toBe(401);
    }
  });

  it("changing the password signs out every other session and renews this one", async () => {
    const admin = await createAdmin();
    const other = { cookie: await anotherSession(admin) };
    const response = await passwordRoute(
      request("POST", "/api/v1/admin/account/password", {
        cookie: admin.cookie,
        json: { currentPassword: PASSWORD, newPassword: "a brand new passphrase 2026" },
      }),
      routeContext(),
    );
    expect(response.status).toBe(204);
    const renewed = cookieFrom(response);
    expect(
      (await profileRoute(request("GET", "/x", { cookie: other.cookie }), routeContext())).status,
    ).toBe(401);
    expect(
      (await profileRoute(request("GET", "/x", { cookie: admin.cookie }), routeContext())).status,
    ).toBe(401);
    expect(
      (await profileRoute(request("GET", "/x", { cookie: renewed }), routeContext())).status,
    ).toBe(200);
  });

  it("refuses a password change with the wrong current password or a weak new one", async () => {
    const admin = await createAdmin();
    const wrong = await passwordRoute(
      request("POST", "/x", {
        cookie: admin.cookie,
        json: { currentPassword: "nope", newPassword: "a brand new passphrase 2026" },
      }),
      routeContext(),
    );
    expect(wrong.status).toBe(400);
    expect((await wrong.json()).error.fields.currentPassword).toBeTruthy();
    const weak = await passwordRoute(
      request("POST", "/x", {
        cookie: admin.cookie,
        json: { currentPassword: PASSWORD, newPassword: "short" },
      }),
      routeContext(),
    );
    expect(weak.status).toBe(400);
    expect((await weak.json()).error.fields.newPassword).toBeTruthy();
  });

  it("can sign out every other session", async () => {
    const admin = await createAdmin();
    const other = { cookie: await anotherSession(admin) };
    const response = await signOutOthersRoute(
      request("DELETE", "/x", { cookie: admin.cookie }),
      routeContext(),
    );
    expect(await response.json()).toEqual({ revoked: 1 });
    expect(
      (await profileRoute(request("GET", "/x", { cookie: other.cookie }), routeContext())).status,
    ).toBe(401);
    expect(
      (await profileRoute(request("GET", "/x", { cookie: admin.cookie }), routeContext())).status,
    ).toBe(200);
  });
});
