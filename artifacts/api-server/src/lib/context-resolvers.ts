export type BotCommandAction =
  | { type: "radio"; value: string }
  | { type: "youtube"; value: string }
  | { type: "music"; value: string }
  | { type: "help"; value?: string };

const BOT_COMMAND_KEYWORDS = [
  "radio",
  "youtube",
  "music",
  "playlist",
  "help",
  "voice",
  "join",
  "leave",
  "queue",
  "np",
  "stop",
  "nrj",
  "rtl",
  "fun",
  "skyrock",
  "franceinter",
  "virgin",
  "nostalgie",
  "cherie",
  "classic",
  "europe1",
  "musique",
];

const ACTION_VERBS = [
  "lance",
  "lancer",
  "joue",
  "jouer",
  "mets",
  "mettre",
  "met",
  "démarre",
  "demarre",
  "ouvre",
  "ouvrir",
  "active",
  "allume",
  "play",
  "start",
  "run",
  "launch",
  "open",
];

function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function detectBotCommandAction(text: string): BotCommandAction | null {
  const normalized = normalize(text);
  if (!normalized) return null;

  const hasActionVerb = ACTION_VERBS.some((verb) => normalized.includes(verb));
  const hasBotKeyword = BOT_COMMAND_KEYWORDS.some((keyword) => normalized.includes(keyword));

  if (!hasActionVerb || !hasBotKeyword) {
    return null;
  }

  const digitalStation = ["nrj", "rtl", "fun", "skyrock", "franceinter", "virgin", "nostalgie", "cherie", "classic", "europe1"]
    .find((station) => normalized.includes(station));

  if (digitalStation) {
    return { type: "radio", value: digitalStation };
  }

  if (normalized.includes("youtube") || normalized.includes("yt")) {
    const value = normalized.replace(/^(?:lance|joue|mets|met|demarre|démarre|play|start|open|ouvre|allume|active)\s+/, "").trim();
    return { type: "youtube", value: value || "" };
  }

  if (normalized.includes("music") || normalized.includes("musique")) {
    const value = normalized.replace(/^(?:lance|joue|mets|met|demarre|démarre|play|start|open|ouvre|allume|active)\s+/, "").trim();
    return { type: "music", value: value || "" };
  }

  if (normalized.includes("help") || normalized.includes("aide")) {
    return { type: "help" };
  }

  return null;
}

export function isBotCommandRequest(text: string): boolean {
  return !!detectBotCommandAction(text);
}

export function extractLocationFromWeatherQuery(text: string): string | null {
  const normalized = normalize(text);
  const placeMatch = normalized.match(/(?:a|dans|en|sur)\s+([a-zà-ÿ0-9\s-]+)/i);
  if (placeMatch?.[1]) {
    const place = placeMatch[1].trim();
    if (place && !/(meteo|weather|quelle heure|heure|temps)/i.test(place)) {
      return place;
    }
  }

  const cityLike = normalized.match(/(?:meteo|weather|temps)\s+(?:de|à|a|dans|en)\s+([a-zà-ÿ0-9\s-]+)/i);
  if (cityLike?.[1]) {
    return cityLike[1].trim();
  }

  return null;
}

export async function getWeatherReplyForLocation(city: string): Promise<string | null> {
  try {
    const geoResponse = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=fr&format=json`,
      { headers: { Accept: "application/json" } },
    );

    if (!geoResponse.ok) {
      return null;
    }

    const geoData = await geoResponse.json() as { results?: Array<{ latitude: number; longitude: number; name: string; country?: string; admin1?: string }> };
    const location = geoData.results?.[0];
    if (!location) {
      return null;
    }

    const weatherResponse = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${location.latitude}&longitude=${location.longitude}&current=temperature_2m,apparent_temperature,weather_code&timezone=auto`,
      { headers: { Accept: "application/json" } },
    );

    if (!weatherResponse.ok) {
      return null;
    }

    const weatherData = await weatherResponse.json() as {
      current?: {
        temperature_2m?: number;
        apparent_temperature?: number;
        weather_code?: number;
      };
    };

    const current = weatherData.current;
    if (current == null) {
      return null;
    }

    const code = current.weather_code ?? 0;
    const temperature = current.temperature_2m ?? 0;
    const apparent = current.apparent_temperature ?? temperature;

    const labels: Record<number, string> = {
      0: "ciel clair",
      1: "principalement clair",
      2: "partiellement nuageux",
      3: "couvert",
      45: "brouillard",
      48: "brouillard givrant",
      51: "bruine légère",
      53: "bruine",
      55: "forte bruine",
      61: "pluie légère",
      63: "pluie modérée",
      65: "pluie forte",
      71: "neige légère",
      73: "neige modérée",
      75: "neige forte",
      80: "averses",
      81: "averses intenses",
      82: "averses très intenses",
    };

    const condition = labels[code] ?? "conditions variables";
    const cityLabel = location.name;
    return `🌤️ À **${cityLabel}**, il fait **${Math.round(temperature)}°C** (ressenti **${Math.round(apparent)}°C**) avec **${condition}**.`;
  } catch {
    return null;
  }
}
