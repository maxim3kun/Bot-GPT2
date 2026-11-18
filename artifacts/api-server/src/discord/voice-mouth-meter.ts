const DEFAULT_SAMPLE_RATE = 8_000;
const DEFAULT_FRAME_MS = 60;

/**
 * Converts decoded mono PCM16 into a compact, short-lived mouth-opening curve.
 * The curve contains only amplitude levels; it does not contain recoverable audio.
 */
export function pcm16leToMouthLevels(
  pcm: Uint8Array,
  sampleRate = DEFAULT_SAMPLE_RATE,
  frameMs = DEFAULT_FRAME_MS,
): number[] {
  if (!Number.isFinite(sampleRate) || sampleRate <= 0 || !Number.isFinite(frameMs) || frameMs <= 0) {
    return [];
  }

  const frameSamples = Math.max(1, Math.round((sampleRate * frameMs) / 1_000));
  const bytesPerFrame = frameSamples * 2;
  const levels: number[] = [];

  for (let offset = 0; offset + 1 < pcm.length; offset += bytesPerFrame) {
    const end = Math.min(pcm.length - 1, offset + bytesPerFrame);
    let sumSquares = 0;
    let sampleCount = 0;

    for (let index = offset; index < end; index += 2) {
      const value = (pcm[index]! | (pcm[index + 1]! << 8));
      const signed = value & 0x8000 ? value - 0x1_0000 : value;
      const normalized = signed / 32_768;
      sumSquares += normalized * normalized;
      sampleCount += 1;
    }

    if (!sampleCount) continue;
    const rms = Math.sqrt(sumSquares / sampleCount);
    levels.push(Math.min(1, Math.max(0, (rms - 0.012) * 8)));
  }

  return levels;
}
