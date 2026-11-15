export const RADIO_DUCK_VOLUME = 0.22;

export function isVoiceOperationalError(text: string): boolean {
  return /^\s*(?:⚠️|❌|⛔)/u.test(text)
    || /\b(?:n['’]a pas pu terminer la demande|n['’]a pas pu être terminée|une erreur m['’]empêche de répondre|je n['’]ai pas réussi à formuler une réponse|could not complete the request|something went wrong|couldn['’]t come up with a response)\b/iu.test(text);
}

function normalizeVoiceCommand(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("fr")
    .replace(/[’']/g, " ")
    .replace(/[^\p{Letter}\p{Number}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isSpokenStopCommand(text: string): boolean {
  const normalized = normalizeVoiceCommand(text);
  return /^(?:stop|arrete|arrete toi|arrete de parler|tais toi|silence|coupe|coupe le son|stop ca|arrete ca|shut up|stop talking)$/.test(normalized);
}

export function spokenRadioStationCommand(
  text: string,
  stations: Array<{ key: string; name: string }>,
): string | null {
  const normalized = normalizeVoiceCommand(text);
  const action = /^(?:(?:mets?|mettez|mettre|lance(?:r)?|joue(?:r)?|ecoute(?:r)?|passe(?:r)?|change(?:r)? pour|put on|play|switch to)(?: moi)?|la radio|radio)\s+/;
  const stationPhrase = normalized
    .replace(action, "")
    .replace(/\s+(?:s il te plait|stp|merci)$/, "")
    .replace(/^la radio\s+/, "")
    .trim();
  if (!stationPhrase || stationPhrase === normalized) return null;

  const orderedStations = [...stations].sort((a, b) => b.name.length - a.name.length);
  const match = orderedStations.find(({ key, name }) => {
    const normalizedKey = normalizeVoiceCommand(key);
    const normalizedName = normalizeVoiceCommand(name);
    return stationPhrase === normalizedKey
      || stationPhrase === normalizedName
      || stationPhrase === `la ${normalizedName}`;
  });
  return match?.key ?? null;
}

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
  const durationSeconds = 0.2;
  const sampleCount = Math.floor(sampleRate * durationSeconds);
  const pcm = Buffer.alloc(sampleCount * 2);
  for (let index = 0; index < sampleCount; index++) {
    const time = index / sampleRate;
    const progress = time / durationSeconds;
    const envelope = Math.min(1, progress * 18, (1 - progress) * 12);
    const value = Math.sin(2 * Math.PI * 520 * time) * envelope * 0.045;
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
