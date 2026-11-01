import { DELETE as totpDisable, POST as totpSetup } from "@/app/api/v1/admin/account/totp/route";
import { POST as totpConfirm } from "@/app/api/v1/admin/account/totp/confirm/route";
import { GET as profileRoute } from "@/app/api/v1/admin/profile/route";
import { POST as loginRoute } from "@/app/api/v1/auth/login/route";
import { POST as secondStep } from "@/app/api/v1/auth/totp/route";
import { codeAt, currentStep } from "@/server/auth/totp";
import { upsertOwner } from "@/server/services/auth";

import {
  anotherSession,
  createAdmin,
  ownerSql,
  PASSWORD,
  request,
  resetDatabase,
  routeContext,
  type Admin,
} from "../support/integration";

let admin: Admin;
beforeEach(async () => {
  await resetDatabase();
  admin = await createAdmin();
});

const ctx = () => routeContext();
const signIn = (password = PASSWORD) =>
  loginRoute(request("POST", "/x", { json: { email: admin.email, password } }), ctx());
const verify = (ticket: string, code: string) =>
  secondStep(request("POST", "/x", { json: { ticket, code } }), ctx());
const profileWith = (cookie: string) => profileRoute(request("GET", "/x", { cookie }), ctx());

/** Turns 2FA on through the real endpoints and returns the secret and recovery codes. */
async function enable(): Promise<{ secret: string; recoveryCodes: string[] }> {
  const setup = await totpSetup(request("POST", "/x", { cookie: admin.cookie }), ctx());
  const { secret, uri } = await setup.json();
  expect(uri).toMatch(/^otpauth:\/\/totp\//);
  // Use the previous step so the next test code (current step) is not a replay.
  const confirmed = await totpConfirm(
    request("POST", "/x", {
      cookie: admin.cookie,
      json: { code: codeAt(secret, currentStep() - 1) },
    }),
    ctx(),
  );
  expect(confirmed.status).toBe(200);
  return { secret, ...(await confirmed.json()) };
}

describe("two-factor authentication", () => {
  it("stores only an encrypted secret and hashed recovery codes", async () => {
    const { secret, recoveryCodes } = await enable();
    const [row] = await ownerSql<{ totp_secret: string; recovery_codes: string[] }[]>`
      SELECT totp_secret, recovery_codes FROM users WHERE id = ${admin.id}`;
    expect(row?.totp_secret).not.toContain(secret);
    expect(recoveryCodes).toHaveLength(10);
    expect(row?.recovery_codes).toHaveLength(10);
    expect(row?.recovery_codes).not.toContain(recoveryCodes[0]);
  });

  it("rejects a wrong confirmation code and leaves 2FA off", async () => {
    await totpSetup(request("POST", "/x", { cookie: admin.cookie }), ctx());
    const wrong = await totpConfirm(
      request("POST", "/x", { cookie: admin.cookie, json: { code: "000000" } }),
      ctx(),
    );
    expect(wrong.status).toBe(400);
    const [row] = await ownerSql`SELECT totp_enabled_at FROM users WHERE id = ${admin.id}`;
    expect(row?.totp_enabled_at).toBeNull();
  });

  it("signs out other sessions when it is turned on", async () => {
    const other = await anotherSession(admin);
    await enable();
    expect((await profileWith(other)).status).toBe(401);
    expect((await profileWith(admin.cookie)).status).toBe(200);
  });

  it("requires a code after the password, and each code works once", async () => {
    const { secret } = await enable();
    const first = await signIn();
    expect(first.headers.get("set-cookie")).toBeNull();
    const { mfaRequired, ticket } = await first.json();
    expect(mfaRequired).toBe(true);

    expect((await verify(ticket, "123456")).status).toBe(401);
    const code = codeAt(secret, currentStep());
    const ok = await verify(ticket, code);
    expect(ok.status).toBe(200);
    const cookie = ok.headers.get("set-cookie")!.split(";")[0]!;
    expect((await profileWith(cookie)).status).toBe(200);

    // The same code cannot be replayed, even with a fresh ticket.
    const { ticket: again } = await (await signIn()).json();
    expect((await verify(again, code)).status).toBe(401);
  });

  it("accepts each recovery code once", async () => {
    const { recoveryCodes } = await enable();
    const { ticket } = await (await signIn()).json();
    expect((await verify(ticket, recoveryCodes[0]!.toUpperCase())).status).toBe(200);
    const { ticket: second } = await (await signIn()).json();
    expect((await verify(second, recoveryCodes[0]!)).status).toBe(401);
    const [row] = await ownerSql<{ recovery_codes: string[] }[]>`
      SELECT recovery_codes FROM users WHERE id = ${admin.id}`;
    expect(row?.recovery_codes).toHaveLength(9);
  });

  it("after an APP_SECRET change, app codes fail cleanly and recovery codes still work", async () => {
    const { secret, recoveryCodes } = await enable();
    // Same effect as a new APP_SECRET: the stored secret no longer decrypts.
    await ownerSql`UPDATE users SET totp_secret = 'AAAAAAAAAAAAAAAA.AAAAAAAAAAAAAAAAAAAAAA.AAAA'
      WHERE id = ${admin.id}`;
    const { ticket } = await (await signIn()).json();
    expect((await verify(ticket, codeAt(secret, currentStep()))).status).toBe(401);
    expect((await verify(ticket, recoveryCodes[0]!)).status).toBe(200);
  });

  it("rejects forged and expired tickets", async () => {
    const { secret } = await enable();
    const code = codeAt(secret, currentStep());
    const forged = `${admin.id}.${Date.now() + 60_000}.forged-signature`;
    expect((await verify(forged, code)).status).toBe(401);
    expect((await verify("garbage", code)).status).toBe(401);
  });

  it("locks the second step after 5 wrong codes", async () => {
    const { secret } = await enable();
    const { ticket } = await (await signIn()).json();
    for (let i = 0; i < 5; i++) expect((await verify(ticket, "000000")).status).toBe(401);
    expect((await verify(ticket, codeAt(secret, currentStep()))).status).toBe(429);
  });

  it("a wrong password never reaches the second step", async () => {
    await enable();
    const response = await signIn("not the password at all");
    expect(response.status).toBe(401);
    expect(await response.json()).not.toHaveProperty("ticket");
  });

  it("turning it off needs the password and a code", async () => {
    const { secret } = await enable();
    const off = (json: unknown) =>
      totpDisable(request("DELETE", "/x", { cookie: admin.cookie, json }), ctx());
    expect(
      (await off({ password: "wrong-password-1", code: codeAt(secret, currentStep()) })).status,
    ).toBe(400);
    expect((await off({ password: PASSWORD, code: "000000" })).status).toBe(400);
    expect((await off({ password: PASSWORD, code: codeAt(secret, currentStep()) })).status).toBe(
      204,
    );
    const response = await signIn();
    expect(response.headers.get("set-cookie")).toMatch(/^session=/);
  });

  it("a password reset from the server turns it off (lost-phone recovery)", async () => {
    await enable();
    await upsertOwner(admin.email, "a new long passphrase 2026");
    const [row] =
      await ownerSql`SELECT totp_enabled_at, totp_secret FROM users WHERE id = ${admin.id}`;
    expect(row).toMatchObject({ totp_enabled_at: null, totp_secret: null });
  });

  it("records sign-in activity", async () => {
    const { secret } = await enable();
    const { ticket } = await (await signIn()).json();
    await verify(ticket, codeAt(secret, currentStep()));
    const rows = await ownerSql<{ action: string; summary: { method?: string } | null }[]>`
      SELECT action, summary FROM audit_log WHERE user_id = ${admin.id} ORDER BY created_at`;
    expect(rows.map((r) => r.action)).toEqual(expect.arrayContaining(["totp_enabled", "login"]));
    expect(rows.find((r) => r.action === "login")?.summary?.method).toBe("password+totp");
  });
});
