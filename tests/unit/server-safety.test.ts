import { renderMarkdown } from "@/server/markdown";
import { sniff } from "@/server/media/sniff";
import { clientIp } from "@/server/security/client-ip";
import { checkFormToken, issueFormToken } from "@/server/services/contact";

describe("renderMarkdown", () => {
  it("renders formatting", () => {
    expect(renderMarkdown("**bold** and `code`")).toContain("<strong>bold</strong>");
  });

  it.each([
    ["<script>alert(1)</script>", "<script"],
    ['<img src=x onerror="alert(1)">', "onerror"],
    ["[click](javascript:alert(1))", "javascript:"],
    ['<a href="https://x.test" onclick="steal()">x</a>', "onclick"],
    ["<iframe src=https://evil.test></iframe>", "<iframe"],
    ["![x](https://evil.test/track.png)", "<img"],
  ])("removes dangerous content from %j", (input, forbidden) => {
    expect(renderMarkdown(input).toLowerCase()).not.toContain(forbidden);
  });

  it("adds safe rel attributes to external links", () => {
    expect(renderMarkdown("[docs](https://example.test)")).toContain(
      'rel="nofollow ugc noopener noreferrer"',
    );
  });

  it("returns an empty string for empty input", () => {
    expect(renderMarkdown("   ")).toBe("");
    expect(renderMarkdown(null)).toBe("");
  });
});

describe("sniff", () => {
  const bytes = (...values: number[]) => new Uint8Array([...values, ...new Array(16).fill(0)]);

  it("identifies supported types by signature", () => {
    expect(sniff(bytes(0xff, 0xd8, 0xff))?.mime).toBe("image/jpeg");
    expect(sniff(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))?.mime).toBe("image/png");
    expect(sniff(new TextEncoder().encode("RIFF\0\0\0\0WEBPVP8 ...."))?.mime).toBe("image/webp");
    expect(sniff(new TextEncoder().encode("\0\0\0\x1cftypavif......"))?.mime).toBe("image/avif");
    expect(sniff(new TextEncoder().encode("%PDF-1.7\n.........."))?.kind).toBe("document");
  });

  it.each([
    ["SVG", '<svg xmlns="http://www.w3.org/2000/svg"><script/></svg>'],
    ["HTML", "<!doctype html><html><script>alert(1)</script>"],
    ["text", "just some text that is long enough"],
  ])("rejects %s", (_name, content) => {
    expect(sniff(new TextEncoder().encode(content))).toBeNull();
  });

  it("rejects tiny files", () => {
    expect(sniff(new Uint8Array([0xff, 0xd8]))).toBeNull();
  });
});

describe("clientIp", () => {
  const headers = (value: string) => new Headers({ "x-forwarded-for": value });

  it("ignores X-Forwarded-For when no proxy is trusted (it can be forged)", () => {
    expect(clientIp(headers("1.2.3.4"), 0)).toBe("unknown");
  });

  it("takes the address the trusted proxy saw", () => {
    // Client forged "6.6.6.6"; Caddy appended the real address 1.2.3.4.
    expect(clientIp(headers("6.6.6.6, 1.2.3.4"), 1)).toBe("1.2.3.4");
  });

  it("rejects malformed addresses", () => {
    expect(clientIp(headers("not an ip"), 1)).toBe("unknown");
  });
});

describe("contact form token", () => {
  it("accepts a token after the minimum fill time", () => {
    const token = issueFormToken(Date.now() - 10_000);
    expect(checkFormToken(token)).toBe("ok");
  });

  it("flags instant submissions", () => {
    expect(checkFormToken(issueFormToken())).toBe("too-fast");
  });

  it("rejects tampered, expired and malformed tokens", () => {
    const [ts] = issueFormToken(Date.now() - 10_000).split(".");
    expect(checkFormToken(`${ts}.forged`)).toBe("invalid");
    expect(checkFormToken(issueFormToken(Date.now() - 3 * 60 * 60 * 1000))).toBe("invalid");
    expect(checkFormToken("garbage")).toBe("invalid");
  });
});
