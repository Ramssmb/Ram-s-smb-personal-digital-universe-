import { EventEmitter } from "node:events";

import { askHidden } from "../../scripts/prompt";

/** A fake terminal: records raw-mode changes and everything written to the screen. */
function fakeTerminal() {
  const input = Object.assign(new EventEmitter(), {
    isTTY: true,
    rawModes: [] as boolean[],
    setRawMode(mode: boolean) {
      this.rawModes.push(mode);
    },
    setEncoding() {},
    resume() {},
    pause() {},
  });
  const screen: string[] = [];
  const output = { write: (text: string) => screen.push(text) };
  return { input, output, screen: () => screen.join("") };
}

describe("askHidden", () => {
  it("never writes the typed characters to the screen", async () => {
    const t = fakeTerminal();
    const answer = askHidden("Password: ", t.input, t.output);
    for (const ch of "Secret pass 1!") t.input.emit("data", ch);
    t.input.emit("data", "\r");
    expect(await answer).toBe("Secret pass 1!");
    expect(t.screen()).toBe("Password: " + "*".repeat(14) + "\n");
    expect(t.screen()).not.toContain("Secret");
  });

  it("uses raw mode and restores the terminal afterwards", async () => {
    const t = fakeTerminal();
    const answer = askHidden("Password: ", t.input, t.output);
    t.input.emit("data", "abc\r");
    await answer;
    expect(t.input.rawModes).toEqual([true, false]);
    expect(t.input.listenerCount("data")).toBe(0);
  });

  it("accepts a pasted password in one chunk, including a trailing CRLF", async () => {
    const t = fakeTerminal();
    const answer = askHidden("Password: ", t.input, t.output);
    t.input.emit("data", "pasted-passphrase-123\r\n");
    expect(await answer).toBe("pasted-passphrase-123");
    expect(t.screen()).not.toContain("pasted");
  });

  it("handles backspace without revealing anything", async () => {
    const t = fakeTerminal();
    const answer = askHidden("Password: ", t.input, t.output);
    t.input.emit("data", "abcX\u007fd\bD\r");
    expect(await answer).toBe("abcD");
    // After the prompt: only stars, "erase one" sequences and the final newline.
    expect(t.screen().slice("Password: ".length)).toBe("****\b \b*\b \b*\n");
  });

  it("ignores arrow keys and other escape sequences", async () => {
    const t = fakeTerminal();
    const answer = askHidden("Password: ", t.input, t.output);
    t.input.emit("data", "ab\u001b[Dcd\u001b[3~\r");
    expect(await answer).toBe("abcd");
  });

  it("rejects on Ctrl-C and restores the terminal", async () => {
    const t = fakeTerminal();
    const answer = askHidden("Password: ", t.input, t.output);
    t.input.emit("data", "abc\u0003");
    await expect(answer).rejects.toThrow("cancelled");
    expect(t.input.rawModes).toEqual([true, false]);
  });
});
