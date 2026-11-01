import {
  base32Decode,
  base32Encode,
  codeAt,
  decryptSecret,
  encryptSecret,
  generateRecoveryCodes,
  generateSecret,
  hashRecoveryCode,
  matchingStep,
  otpauthUri,
} from "@/server/auth/totp";

// RFC 6238 Appendix B, SHA-1 seed "12345678901234567890" (ASCII); the RFC
// lists 8-digit codes, of which a 6-digit code is the last six digits.
const RFC_SECRET = base32Encode(new TextEncoder().encode("12345678901234567890"));

describe("TOTP", () => {
  it("matches the RFC 6238 test vectors", () => {
    expect(RFC_SECRET).toBe("GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ");
    const vectors: [number, string][] = [
      [59, "287082"],
      [1111111109, "081804"],
      [1111111111, "050471"],
      [1234567890, "005924"],
      [2000000000, "279037"],
    ];
    for (const [seconds, code] of vectors)
      expect(codeAt(RFC_SECRET, Math.floor(seconds / 30))).toBe(code);
  });

  it("accepts the current step and one either side, nothing further", () => {
    const now = 1_800_000_000_000;
    const step = Math.floor(now / 30_000);
    expect(matchingStep(RFC_SECRET, codeAt(RFC_SECRET, step), now)).toBe(step);
    expect(matchingStep(RFC_SECRET, codeAt(RFC_SECRET, step - 1), now)).toBe(step - 1);
    expect(matchingStep(RFC_SECRET, codeAt(RFC_SECRET, step + 1), now)).toBe(step + 1);
    expect(matchingStep(RFC_SECRET, codeAt(RFC_SECRET, step - 3), now)).toBeNull();
    expect(matchingStep(RFC_SECRET, "abcdef", now)).toBeNull();
    expect(matchingStep(RFC_SECRET, "1234567", now)).toBeNull();
  });

  it("round-trips base32 and generates 160-bit secrets", () => {
    const bytes = new Uint8Array([0, 1, 2, 250, 251, 255, 7]);
    expect([...base32Decode(base32Encode(bytes))]).toEqual([...bytes]);
    expect(base32Decode(generateSecret())).toHaveLength(20);
    expect(() => base32Decode("not!base32")).toThrow();
  });

  it("encrypts secrets at rest and detects tampering", () => {
    const stored = encryptSecret(RFC_SECRET);
    expect(stored).not.toContain(RFC_SECRET);
    expect(decryptSecret(stored)).toBe(RFC_SECRET);
    expect(encryptSecret(RFC_SECRET)).not.toBe(stored); // random IV
    const [iv, tag, data] = stored.split(".");
    const flipped = `${iv}.${tag}.${data!.slice(0, -2)}${data!.endsWith("A") ? "B" : "A"}${data!.slice(-1)}`;
    expect(() => decryptSecret(flipped)).toThrow();
  });

  it("builds an otpauth link for authenticator apps", () => {
    const uri = new URL(otpauthUri(RFC_SECRET, "me@example.test", "Personal site"));
    expect(uri.protocol).toBe("otpauth:");
    expect(uri.searchParams.get("secret")).toBe(RFC_SECRET);
    expect(uri.searchParams.get("digits")).toBe("6");
  });

  it("generates unique recovery codes and hashes them case-insensitively", () => {
    const codes = generateRecoveryCodes();
    expect(new Set(codes).size).toBe(10);
    expect(codes[0]).toMatch(/^[a-z2-9]{4}-[a-z2-9]{4}-[a-z2-9]{4}$/);
    expect(hashRecoveryCode(codes[0]!.toUpperCase())).toBe(hashRecoveryCode(` ${codes[0]} `));
  });
});
