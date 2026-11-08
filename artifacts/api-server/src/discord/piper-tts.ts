import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { createInterface } from "node:readline";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

export const PROJECT_ROOT = [process.cwd(), resolve(process.cwd(), "../..")]
  .find(root => existsSync(resolve(root, "config/piper-voices.json"))) ?? process.cwd();
export const VOICE_CATALOG = JSON.parse(readFileSync(resolve(PROJECT_ROOT, "config/piper-voices.json"), "utf8")) as {
  default: string;
  voices: { id: string; name: string; description: string; model: string; license: string; source: string }[];
};
export const DEFAULT_VOICE = VOICE_CATALOG.default;
export function isVoiceId(value: unknown): value is string {
  return typeof value === "string" && VOICE_CATALOG.voices.some(voice => voice.id === value);
}
export function voiceName(value: string): string {
  return VOICE_CATALOG.voices.find(voice => voice.id === value)?.name ?? "SIWIS";
}

/** A bounded global synthesis queue: one worker and one loaded model at a time. */
export class PiperSynthesizer {
  private child?: ChildProcessWithoutNullStreams;
  private tail: Promise<unknown> = Promise.resolve();
  private queued = 0;
  private counter = 0;
  private idle?: NodeJS.Timeout;
  private pending?: { id: number; resolve: (audio: Buffer) => void; reject: (error: Error) => void };

  constructor(private workerPath = resolve(PROJECT_ROOT, "scripts/piper-worker.py"), private timeoutMs = 45_000, private idleMs = 60_000) {}

  private start() {
    if (this.child) return this.child;
    const child = spawn("python3", ["-u", this.workerPath], { cwd: PROJECT_ROOT, stdio: ["pipe", "pipe", "pipe"] });
    this.child = child;
    // Worker stderr is drained, never logged: no transcript should enter logs.
    child.stderr.resume();
    createInterface({ input: child.stdout }).on("line", line => {
      if (!this.pending) return;
      try {
        const result = JSON.parse(line);
        if (result.id !== this.pending.id) return;
        if (result.error || typeof result.audio !== "string" || result.audio.length > 12 * 1024 * 1024) throw new Error("Invalid Piper response");
        const audio = Buffer.from(result.audio, "base64");
        if (audio.length < 44 || audio.toString("ascii", 0, 4) !== "RIFF" || audio.toString("ascii", 8, 12) !== "WAVE") throw new Error("Invalid Piper audio");
        this.pending.resolve(audio);
      } catch {
        this.pending.reject(new Error("Local voice synthesis failed"));
      }
    });
    const failed = () => {
      if (this.child !== child) return;
      this.child = undefined;
      this.pending?.reject(new Error("Local voice worker stopped"));
    };
    child.on("error", failed);
    child.on("exit", failed);
    child.stdin.on("error", failed);
    return child;
  }

  synthesize(text: string, voice: string): Promise<Buffer> {
    if (!isVoiceId(voice) || !text.trim() || text.length > 3000) return Promise.reject(new Error("Invalid local voice request"));
    if (this.queued >= 4) return Promise.reject(new Error("Local voice queue is full"));
    this.queued++;
    clearTimeout(this.idle);
    const result = this.tail.then(async () => {
      clearTimeout(this.idle);
      const child = this.start();
      const id = ++this.counter;
      return new Promise<Buffer>((resolveAudio, rejectAudio) => {
        this.pending = { id, resolve: resolveAudio, reject: rejectAudio };
        const timer = setTimeout(() => { this.stop(); rejectAudio(new Error("Local voice timed out")); }, this.timeoutMs);
        child.stdin.write(JSON.stringify({ id, text, voice }) + "\n", error => {
          if (error) this.pending?.reject(new Error("Local voice worker is unavailable"));
        });
        // The pending callbacks own cleanup so no successful request leaves a timer.
        this.pending.resolve = audio => { clearTimeout(timer); resolveAudio(audio); };
        this.pending.reject = error => { clearTimeout(timer); rejectAudio(error); };
      }).finally(() => { this.pending = undefined; });
    });
    this.tail = result.catch(() => undefined).finally(() => {
      this.queued--;
      if (!this.queued) {
        this.idle = setTimeout(() => this.stop(), this.idleMs);
        this.idle.unref();
      }
    });
    return result;
  }

  stop() {
    clearTimeout(this.idle);
    const child = this.child;
    this.child = undefined;
    this.pending?.reject(new Error("Local voice worker stopped"));
    child?.kill();
  }
}

export const piper = new PiperSynthesizer();
process.once("exit", () => piper.stop());
