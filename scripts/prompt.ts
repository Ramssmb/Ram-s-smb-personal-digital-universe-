/**
 * Console prompts for the admin scripts. Hidden prompts switch the terminal to
 * raw mode so typed characters are never echoed, and print one "*" per
 * character instead. This works the same in Windows Terminal, PowerShell,
 * cmd and Unix terminals.
 */
import { createInterface } from "node:readline/promises";

/** The parts of process.stdin / process.stdout a prompt needs (tests pass fakes). */
export interface PromptInput extends NodeJS.EventEmitter {
  isTTY?: boolean;
  setRawMode?: (mode: boolean) => unknown;
  setEncoding(encoding: BufferEncoding): unknown;
  resume(): unknown;
  pause(): unknown;
}
export interface PromptOutput {
  write(text: string): unknown;
}

export async function ask(
  question: string,
  input: NodeJS.ReadableStream = process.stdin,
  output: NodeJS.WritableStream = process.stdout,
): Promise<string> {
  const rl = createInterface({ input, output, terminal: false });
  output.write(question);
  const answer = await new Promise<string>((resolve) => {
    rl.once("line", resolve);
    rl.once("close", () => resolve(""));
  });
  rl.close();
  return answer;
}

/**
 * Reads a line without showing it. Rejects with "cancelled" on Ctrl-C.
 * When input is not a terminal (piped), nothing is echoed anyway, so the line
 * is read as it is.
 */
export function askHidden(
  question: string,
  input: PromptInput = process.stdin,
  output: PromptOutput = process.stdout,
): Promise<string> {
  if (!input.isTTY || typeof input.setRawMode !== "function") {
    return ask(
      question,
      input as unknown as NodeJS.ReadableStream,
      output as NodeJS.WritableStream,
    );
  }
  const setRawMode = input.setRawMode.bind(input);
  output.write(question);
  setRawMode(true);
  input.setEncoding("utf8");
  input.resume();

  return new Promise((resolve, reject) => {
    let value = "";
    let inEscape = false;
    const finish = (error?: Error) => {
      input.removeListener("data", onData);
      setRawMode(false);
      input.pause();
      output.write("\n");
      if (error) reject(error);
      else resolve(value);
    };
    // A chunk can hold many characters (pasting), so handle them one by one.
    const onData = (chunk: string) => {
      for (const ch of chunk) {
        // Skip escape sequences (arrow keys, Home, Delete…) up to their final letter.
        if (inEscape) {
          if (/[A-Za-z~]/.test(ch)) inEscape = false;
          continue;
        }
        if (ch === "\u001b") {
          inEscape = true;
          continue;
        }
        if (ch === "\r" || ch === "\n" || ch === "\u0004") return finish();
        if (ch === "\u0003") return finish(new Error("cancelled"));
        if (ch === "\u007f" || ch === "\b") {
          if (value.length > 0) {
            value = [...value].slice(0, -1).join("");
            output.write("\b \b");
          }
          continue;
        }
        if (ch < " ") continue; // other control characters

        value += ch;
        output.write("*");
      }
    };
    input.on("data", onData);
  });
}
