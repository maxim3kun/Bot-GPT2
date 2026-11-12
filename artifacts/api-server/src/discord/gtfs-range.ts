import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import * as zlib from "node:zlib";
import { parse } from "csv-parse";

export type GtfsRow = Record<string, string>;
export type RangeRequest = (range: string, validator?: Record<string, string>) => Promise<Response>;
interface Entry { name: string; method: number; compressed: number; original: number; offset: number; crc: number }

const MAX_DOWNLOAD = 96 * 1024 * 1024;
const MAX_EXPANDED = 800 * 1024 * 1024;
const CRC_TABLE = Uint32Array.from({ length: 256 }, (_, value) => {
  for (let i = 0; i < 8; i++) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  return value >>> 0;
});
function checksum(bytes: Buffer, previous: number): number {
  if (typeof zlib.crc32 === "function") return zlib.crc32(bytes, previous);
  let crc = previous ^ 0xffffffff;
  for (const byte of bytes) crc = CRC_TABLE[(crc ^ byte) & 255]! ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

/** Read selected ZIP entries over HTTP ranges without retaining the network ZIP. */
export class GtfsRangeArchive {
  private readonly entries = new Map<string, Entry>();
  private validator: Record<string, string> = {};
  private total = 0;
  private downloaded = 0;

  constructor(private readonly request: RangeRequest) {}

  private async response(range: string): Promise<Response> {
    const response = await this.request(range, this.validator);
    if (response.status !== 206 || !response.body) {
      await response.body?.cancel();
      throw new Error(`Transport server does not provide a usable ZIP range (${response.status})`);
    }
    const match = response.headers.get("content-range")?.match(/^bytes (\d+)-(\d+)\/(\d+)$/);
    if (!match || Number(match[3]) > 512 * 1024 * 1024 || (this.total && Number(match[3]) !== this.total)) {
      await response.body.cancel();
      throw new Error("Transport ZIP range changed or is too large");
    }
    const [, start, end, total] = match.map(Number);
    const expected = range.match(/^bytes=(\d+)-(\d+)$/);
    if (expected && (start !== Number(expected[1]) || end !== Number(expected[2]))) {
      await response.body.cancel();
      throw new Error("Transport server returned the wrong ZIP range");
    }
    if (!expected && (range !== "bytes=-65557" || start !== Math.max(0, total! - 65557) || end !== total! - 1)) {
      await response.body.cancel();
      throw new Error("Transport server returned the wrong ZIP suffix");
    }
    if ((this.validator["if-match"] && response.headers.get("etag") !== this.validator["if-match"]) ||
      (this.validator["if-unmodified-since"] && response.headers.get("last-modified") !== this.validator["if-unmodified-since"])) {
      await response.body.cancel();
      throw new Error("Transport ZIP changed while its tables were being read");
    }
    this.total = total!;
    if (!Object.keys(this.validator).length) {
      const etag = response.headers.get("etag");
      const modified = response.headers.get("last-modified");
      if (etag && !etag.startsWith("W/")) this.validator = { "if-match": etag };
      else if (modified) this.validator = { "if-unmodified-since": modified };
      else { await response.body.cancel(); throw new Error("Transport ZIP has no stable version validator"); }
    }
    const size = end! - start! + 1;
    this.downloaded += size;
    if (size < 1 || this.downloaded > MAX_DOWNLOAD) {
      await response.body.cancel();
      throw new Error("Transport selected-table download exceeds its budget");
    }
    return response;
  }

  private async *chunks(response: Response, expected: number) {
    const reader = response.body!.getReader();
    let count = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        count += value.length;
        if (count > expected) throw new Error("Transport ZIP range exceeds its declared size");
        yield value;
      }
      if (count !== expected) throw new Error("Transport ZIP range was truncated");
    } finally {
      await reader.cancel().catch(() => undefined);
      reader.releaseLock();
    }
  }

  private async bytes(start: number, end: number): Promise<Buffer> {
    const response = await this.response(`bytes=${start}-${end}`);
    const chunks = [];
    for await (const chunk of this.chunks(response, end - start + 1)) chunks.push(chunk);
    return Buffer.concat(chunks);
  }

  async open(): Promise<void> {
    const response = await this.response("bytes=-65557");
    const match = response.headers.get("content-range")!.match(/^bytes (\d+)-(\d+)\//)!;
    const tail = [];
    for await (const chunk of this.chunks(response, Number(match[2]) - Number(match[1]) + 1)) tail.push(chunk);
    const bytes = Buffer.concat(tail);
    let end = -1;
    for (let i = bytes.length - 22; i >= 0; i--) {
      if (bytes.readUInt32LE(i) === 0x06054b50 && i + 22 + bytes.readUInt16LE(i + 20) === bytes.length) { end = i; break; }
    }
    if (end < 0 || bytes.readUInt16LE(end + 4) || bytes.readUInt16LE(end + 6)) throw new Error("Unsupported transport ZIP directory");
    const size = bytes.readUInt32LE(end + 12);
    const offset = bytes.readUInt32LE(end + 16);
    if (size > 256_000 || offset + size > this.total - 22) throw new Error("Transport ZIP directory exceeds its bounds");
    const directory = offset >= Number(match[1]) ? bytes.subarray(offset - Number(match[1]), offset - Number(match[1]) + size)
      : await this.bytes(offset, offset + size - 1);
    let cursor = 0;
    while (cursor < directory.length) {
      if (cursor + 46 > directory.length || directory.readUInt32LE(cursor) !== 0x02014b50) throw new Error("Invalid transport ZIP directory");
      const nameLength = directory.readUInt16LE(cursor + 28);
      const next = cursor + 46 + nameLength + directory.readUInt16LE(cursor + 30) + directory.readUInt16LE(cursor + 32);
      if (next > directory.length || directory.readUInt16LE(cursor + 8) & 1) throw new Error("Invalid or encrypted transport ZIP");
      const name = directory.subarray(cursor + 46, cursor + 46 + nameLength).toString("utf8").split("/").at(-1)!.toLowerCase();
      if (this.entries.has(name)) throw new Error("Duplicate transport ZIP table");
      this.entries.set(name, { name, method: directory.readUInt16LE(cursor + 10),
        compressed: directory.readUInt32LE(cursor + 20), original: directory.readUInt32LE(cursor + 24),
        offset: directory.readUInt32LE(cursor + 42), crc: directory.readUInt32LE(cursor + 16) });
      cursor = next;
    }
  }

  entryNames(): string[] {
    return [...this.entries.keys()];
  }

  /** Read one bounded XML member from a public ZIP without downloading its siblings. */
  async entryBytes(name: string, maximumCompressed = 8 * 1024 * 1024,
    maximumExpanded = 32 * 1024 * 1024): Promise<Uint8Array | null> {
    const entry = this.entries.get(name.toLowerCase().split("/").at(-1)!);
    if (!entry) return null;
    if (entry.compressed > maximumCompressed || entry.original > maximumExpanded ||
      ![0, 8].includes(entry.method)) throw new Error("Transport ZIP member exceeds its bounded XML limits");
    const header = await this.bytes(entry.offset, entry.offset + 29);
    if (header.readUInt32LE(0) !== 0x04034b50 || header.readUInt16LE(8) !== entry.method) {
      throw new Error("Invalid transport ZIP member header");
    }
    const start = entry.offset + 30 + header.readUInt16LE(26) + header.readUInt16LE(28);
    if (start + entry.compressed > this.total) throw new Error("Transport ZIP member lies outside the archive");
    const response = await this.response(`bytes=${start}-${start + entry.compressed - 1}`);
    const chunks: Buffer[] = [];
    for await (const chunk of this.chunks(response, entry.compressed)) chunks.push(chunk);
    const compressed = Buffer.concat(chunks, entry.compressed);
    let bytes: Buffer;
    try {
      bytes = entry.method === 8
        ? zlib.inflateRawSync(compressed, { maxOutputLength: maximumExpanded })
        : compressed;
    } catch { throw new Error("Unable to decompress the selected transport ZIP member"); }
    if (bytes.length !== entry.original || bytes.length > maximumExpanded ||
      checksum(bytes, 0) !== entry.crc) throw new Error("Transport ZIP member failed its size or checksum validation");
    return bytes;
  }

  async rows(name: string, onRow: (row: GtfsRow) => void, filter?: Transform): Promise<boolean> {
    const entry = this.entries.get(name);
    if (!entry) return false;
    if (entry.original > MAX_EXPANDED || entry.compressed > MAX_DOWNLOAD || ![0, 8].includes(entry.method)) {
      throw new Error("Transport table exceeds supported streaming limits");
    }
    const header = await this.bytes(entry.offset, entry.offset + 29);
    if (header.readUInt32LE(0) !== 0x04034b50 || header.readUInt16LE(8) !== entry.method) throw new Error("Invalid transport ZIP entry");
    const start = entry.offset + 30 + header.readUInt16LE(26) + header.readUInt16LE(28);
    if (start + entry.compressed > this.total) throw new Error("Transport ZIP table lies outside the archive");
    if (!entry.compressed) return true;
    const response = await this.response(`bytes=${start}-${start + entry.compressed - 1}`);
    let expanded = 0;
    let crc = 0;
    const count = new Transform({ transform(chunk: Buffer, _encoding, callback) {
      expanded += chunk.length;
      crc = checksum(chunk, crc);
      callback(expanded > entry.original || expanded > MAX_EXPANDED ? new Error("Transport table expanded beyond its size limit") : null, chunk);
    } });
    const csv = parse({ columns: true, bom: true, skip_empty_lines: true, relax_column_count: true,
      max_record_size: 20_000, on_record(row: GtfsRow) { onRow(row); return null; } });
    csv.resume();
    await pipeline(Readable.from(this.chunks(response, entry.compressed)),
      entry.method === 8 ? zlib.createInflateRaw({ chunkSize: 64 * 1024 }) : new Transform({ transform(chunk, _encoding, cb) { cb(null, chunk); } }),
      count, filter ?? new Transform({ transform(chunk, _encoding, cb) { cb(null, chunk); } }), csv);
    if (expanded !== entry.original) throw new Error("Transport table was truncated during decompression");
    if (crc !== entry.crc) throw new Error("Transport table failed its ZIP checksum");
    return true;
  }
}
