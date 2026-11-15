export const RADIO_DUCK_VOLUME = 0.22;

export function sanitizeSpeechText(text: string): string {
  return text
    .replace(/(?:\*{1,2}|\[|\()\s*(?:sourit|sourire|rit|rire|rires|laughs?|smiles?|laughing)\s*(?:\*{1,2}|\]|\))/gi, " ")
    .replace(/https?:\/\/\S+/gi, " lien ")
    .replace(/<@!?[\d]+>|<#\d+>|<@&\d+>/g, " ")
    .replace(/\p{Extended_Pictographic}/gu, " ")
    .replace(/[\u200D\uFE0E\uFE0F]/g, "")
    .replace(/[*_`~#>|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildRadioSpeechMixArgs(stationUrl: string, musicVolume = 1): string[] {
  const parsed = new URL(stationUrl);
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Radio speech mixing supports HTTP streams only");
  }
  const duckedVolume = Math.max(0, Math.min(2, musicVolume)) * RADIO_DUCK_VOLUME;
  return [
    "-hide_banner", "-loglevel", "error",
    "-rw_timeout", "8000000",
    "-i", parsed.href,
    "-i", "pipe:0",
    "-filter_complex",
    `[0:a]volume=${duckedVolume},aresample=48000,aformat=channel_layouts=stereo[music];[1:a]aresample=48000,aformat=channel_layouts=stereo[voice];[music][voice]amix=inputs=2:duration=shortest:dropout_transition=0:normalize=0[mix]`,
    "-map", "[mix]",
    "-f", "s16le", "-ar", "48000", "-ac", "2",
    "pipe:1",
  ];
}

export function createVoiceActivationChime(): Buffer {
  const sampleRate = 48_000;
  const durationSeconds = 0.28;
  const sampleCount = Math.floor(sampleRate * durationSeconds);
  const pcm = Buffer.alloc(sampleCount * 2);
  const notes = [
    { start: 0, end: 0.1, frequency: 660 },
    { start: 0.1, end: 0.24, frequency: 880 },
  ];
  for (let index = 0; index < sampleCount; index++) {
    const time = index / sampleRate;
    const note = notes.find(({ start, end }) => time >= start && time < end);
    if (!note) continue;
    const noteProgress = (time - note.start) / (note.end - note.start);
    const envelope = Math.min(1, noteProgress * 18, (1 - noteProgress) * 12);
    const value = Math.sin(2 * Math.PI * note.frequency * time) * envelope * 0.18;
    pcm.writeInt16LE(Math.round(value * 32_767), index * 2);
  }
  const header = Buffer.alloc(44);
  const channels = 1;
  const bitDepth = 16;
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * channels * (bitDepth / 8), 28);
  header.writeUInt16LE(channels * (bitDepth / 8), 32);
  header.writeUInt16LE(bitDepth, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}
