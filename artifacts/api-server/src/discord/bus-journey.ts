export interface BusJourney {
  place: string;
  direction?: string;
}

export function normalizeCityName(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

/** Infer two cities only when both names resolve exactly; never split a known compound city. */
export async function resolveBusJourney(
  location: string,
  lookupExactCity: (name: string) => Promise<string | null>,
): Promise<BusJourney> {
  const explicit = location.match(/^(?:de\s+)?(.+?)(?:\s+vers\s+|\s+to\s+|\s*->\s*|\s*→\s*)(.+)$/i);
  if (explicit) return { place: explicit[1]!.trim(), direction: explicit[2]!.trim() };

  const wholeCity = await lookupExactCity(location);
  if (wholeCity) return { place: wholeCity };

  const words = location.trim().split(/\s+/);
  if (words.length < 2 || words.length > 8) return { place: location };
  const candidates = await Promise.all(words.slice(1).map(async (_, index) => {
    const [origin, destination] = await Promise.all([
      lookupExactCity(words.slice(0, index + 1).join(" ")),
      lookupExactCity(words.slice(index + 1).join(" ")),
    ]);
    return origin && destination && normalizeCityName(origin) !== normalizeCityName(destination)
      ? { place: origin, direction: destination }
      : null;
  }));
  const matches = candidates.filter((candidate): candidate is Required<BusJourney> => candidate !== null);
  return matches.length === 1 ? matches[0]! : { place: location };
}
