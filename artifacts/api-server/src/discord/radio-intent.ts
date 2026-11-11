export function extractRadioStationRequest(
  text: string,
  stations: Readonly<Record<string, { name: string }>>,
): string | null {
  const normalized = normalize(text);
  const playRequest = normalized.match(
    /^(?:(?:stp|s il te plait|please)\s+)?(?:(?:peux tu|est ce que tu peux)\s+)?(?:(?:me|moi)\s+)?(?:mettre|mets?|mettez|lancer|lance|jouer|joue|ecouter|ecoute|passer|passe|play|start|listen to|put on)\s+(?:(?:me|moi)\s+)?(?:(?:la|le)\s+)?(?:(?:radio|station)\s+)?(.+?)$/,
  );
  const radioRequest = normalized.match(/^(?:(?:la|le)\s+)?(?:radio|station)\s+(.+)$/);
  let candidate = playRequest?.[1] ?? radioRequest?.[1];
  if (!candidate) return null;

  candidate = candidate
    .replace(/\s+(?:stp|s il te plait|please|merci)$/i, "")
    .trim();

  for (const [key, station] of Object.entries(stations)) {
    if (candidate === normalize(key) || candidate === normalize(station.name) ||
      candidate === normalize(station.name).replace(/^(?:radio|station)\s+/, "")) {
      return key;
    }
  }
  return null;
}

function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[-_]/g, " ")
    .replace(/[.,!?;:]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
