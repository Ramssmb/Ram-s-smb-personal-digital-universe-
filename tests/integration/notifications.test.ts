import { SMTPServer } from "smtp-server";

import { POST as contactRoute } from "@/app/api/v1/contact/route";
import { issueFormToken, submitContact } from "@/server/services/contact";
import { resetMailerForTests } from "@/server/services/notify";

import { ownerSql, request, resetDatabase, routeContext } from "../support/integration";

// A real SMTP server on a random local port, collecting raw messages.
const port = 20_000 + Math.floor(Math.random() * 20_000);
const received: { to: string[]; raw: string }[] = [];
const server = new SMTPServer({
  authOptional: true,
  disabledCommands: ["STARTTLS"],
  logger: false,
  onData(stream, session, callback) {
    let raw = "";
    stream.on("data", (chunk: Buffer) => (raw += chunk.toString("utf8")));
    stream.on("end", () => {
      received.push({ to: session.envelope.rcptTo.map((r) => r.address), raw });
      callback();
    });
  },
});

beforeAll(async () => {
  // Configure before anything reads the (cached) environment.
  process.env.SMTP_URL = `smtp://127.0.0.1:${port}`;
  process.env.SMTP_FROM = "Website <site@example.test>";
  process.env.CONTACT_NOTIFY_TO = "owner@example.test";
  await new Promise<void>((resolve) => server.listen(port, "127.0.0.1", resolve));
});
afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});
beforeEach(async () => {
  await resetDatabase();
  received.length = 0;
  resetMailerForTests();
});

/** Decoded text body of a raw email (quoted-printable or base64, as the library chose). */
function bodyOf(raw: string): string {
  const [head = "", ...rest] = raw.split(/\r?\n\r?\n/);
  const body = rest.join("\n\n");
  if (/content-transfer-encoding: base64/i.test(head)) {
    return Buffer.from(body, "base64").toString("utf8");
  }
  if (/content-transfer-encoding: quoted-printable/i.test(head)) {
    return body
      .replace(/=\r?\n/g, "")
      .replace(/=([0-9A-F]{2})/g, (_, hex: string) => String.fromCharCode(parseInt(hex, 16)));
  }
  return body;
}

const message = (overrides: Record<string, unknown> = {}) => ({
  name: "Ada Visitor",
  email: "ada@example.test",
  subject: "Internship question",
  message: "Hello, I read your journal and have a question.",
  website: "",
  formToken: issueFormToken(Date.now() - 10_000),
  ...overrides,
});

describe("contact notifications", () => {
  it("emails the owner about a real message, with Reply-To set to the visitor", async () => {
    const { notification } = await submitContact(message(), request("POST", "/x").headers);
    expect(await notification).toBe("sent");
    expect(received).toHaveLength(1);
    const { to, raw } = received[0]!;
    expect(to).toEqual(["owner@example.test"]);
    expect(raw).toMatch(/^Subject: New message: Internship question/m);
    expect(raw).toMatch(/^Reply-To: Ada Visitor <ada@example\.test>/m);
    const body = bodyOf(raw);
    expect(body).toContain("Hello, I read your journal and have a question.");
    expect(body).toContain("http://localhost:3000/admin/messages");
  });

  it("does not email about spam", async () => {
    const { notification } = await submitContact(
      message({ website: "http://spam.test" }),
      request("POST", "/x").headers,
    );
    expect(await notification).toBe("skipped");
    expect(received).toHaveLength(0);
  });

  it("cannot be used to inject email headers", async () => {
    const { notification } = await submitContact(
      message({
        name: "Eve\r\nBcc: victim@example.test",
        subject: "Hi\r\nBcc: victim@example.test",
      }),
      request("POST", "/x").headers,
    );
    expect(await notification).toBe("sent");
    const { to, raw } = received[0]!;
    expect(to).toEqual(["owner@example.test"]);
    expect(raw).not.toMatch(/^Bcc:/im);
  });

  it("keeps the message and answers the visitor when the mail server is down", async () => {
    resetMailerForTests();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    try {
      const response = await contactRoute(
        request("POST", "/api/v1/contact", { json: message() }),
        routeContext(),
      );
      expect(response.status).toBe(202);
      const stored = await ownerSql`SELECT status FROM contact_messages`;
      expect(stored.map((r) => r.status)).toEqual(["new"]);
      const { notification } = await submitContact(message(), request("POST", "/x").headers);
      expect(await notification).toBe("failed");
    } finally {
      await new Promise<void>((resolve) => server.listen(port, "127.0.0.1", resolve));
    }
  });
});
