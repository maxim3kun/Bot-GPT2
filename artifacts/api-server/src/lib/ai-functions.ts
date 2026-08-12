/**
 * AI Function Definitions for Function Calling (Tool Use)
 * Complete set of all bot commands that the AI can trigger autonomously
 */

export interface AIFunction {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, any>;
    required?: string[];
  };
}

/**
 * Complete Bot Function Catalog - User Functions Only
 */
export const BOT_FUNCTIONS: AIFunction[] = [
  // MUSIC & AUDIO
  {
    name: "play_radio",
    description: "Play a radio station",
    parameters: {
      type: "object",
      properties: {
        station: { type: "string", description: "Station key: nrj, fun, rtl, europe1, skyrock, franceinter, musique, virgin, nostalgie, cherie" }
      },
      required: ["station"]
    }
  },
  {
    name: "generate_music",
    description: "Generate a song using Suno AI",
    parameters: {
      type: "object",
      properties: {
        prompt: { type: "string", description: "Music style description" }
      },
      required: ["prompt"]
    }
  },
  {
    name: "play_youtube",
    description: "Play audio from YouTube by song/artist name",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Song or artist name" }
      },
      required: ["query"]
    }
  },
  {
    name: "skip_track",
    description: "Skip current track",
    parameters: { type: "object", properties: {} }
  },
  {
    name: "stop_music",
    description: "Stop music and disconnect",
    parameters: { type: "object", properties: {} }
  },

  // GAMES
  {
    name: "start_minesweeper",
    description: "Start Minesweeper game",
    parameters: {
      type: "object",
      properties: {
        difficulty: { type: "string", description: "easy, medium, or hard" }
      }
    }
  },
  {
    name: "start_geo_game",
    description: "Start GeoGuessr game",
    parameters: {
      type: "object",
      properties: {
        difficulty: { type: "string", description: "easy, medium, or hard" }
      }
    }
  },
  {
    name: "start_trivia",
    description: "Start trivia quiz",
    parameters: { type: "object", properties: {} }
  },
  {
    name: "start_guessing_game",
    description: "Start guess the number game",
    parameters: { type: "object", properties: {} }
  },
  {
    name: "start_connect4",
    description: "Start Connect4 game",
    parameters: {
      type: "object",
      properties: {
        mode: { type: "string", description: "solo or multiplayer" }
      }
    }
  },
  {
    name: "start_guess_logo",
    description: "Start Guess The Logo game",
    parameters: {
      type: "object",
      properties: {
        difficulty: { type: "string", description: "easy, medium, or hard" }
      }
    }
  },
  {
    name: "start_tierlist",
    description: "Start tier list ranking game",
    parameters: {
      type: "object",
      properties: {
        category: { type: "string", description: "What to tier" }
      }
    }
  },
  {
    name: "start_blindtest",
    description: "Start blind test music quiz",
    parameters: { type: "object", properties: {} }
  },
  {
    name: "start_million_game",
    description: "Start Million Game",
    parameters: { type: "object", properties: {} }
  },
  {
    name: "start_shell_game",
    description: "Start Shell Game",
    parameters: { type: "object", properties: {} }
  },

  // QUESTS
  {
    name: "start_quest",
    description: "Start quest system",
    parameters: { type: "object", properties: {} }
  },
  {
    name: "add_quest",
    description: "Add new quest",
    parameters: {
      type: "object",
      properties: {
        objective: { type: "string", description: "Goal to track" }
      }
    }
  },
  {
    name: "show_quest_list",
    description: "Show all quests",
    parameters: { type: "object", properties: {} }
  },

  // SPECIAL
  {
    name: "add_birthday",
    description: "Add birthday reminder",
    parameters: {
      type: "object",
      properties: {
        date: { type: "string", description: "Date in DD/MM format" }
      },
      required: ["date"]
    }
  },
  {
    name: "set_reminder",
    description: "Set time-based reminder",
    parameters: {
      type: "object",
      properties: {
        time: { type: "string", description: "When to remind" },
        message: { type: "string", description: "Reminder message" }
      },
      required: ["time", "message"]
    }
  },
  {
    name: "generate_image",
    description: "Generate image with AI",
    parameters: {
      type: "object",
      properties: {
        description: { type: "string", description: "Image description" }
      },
      required: ["description"]
    }
  },
  {
    name: "lookup_pokemon",
    description: "Look up Pokemon info",
    parameters: {
      type: "object",
      properties: {
        pokemon_name: { type: "string", description: "Pokemon name" }
      },
      required: ["pokemon_name"]
    }
  },
  {
    name: "tell_joke",
    description: "Tell a joke",
    parameters: { type: "object", properties: {} }
  },
  {
    name: "magic_8ball",
    description: "Ask the Magic 8-Ball",
    parameters: {
      type: "object",
      properties: {
        question: { type: "string", description: "Yes/no question" }
      }
    }
  }
];

/**
 * Bypass AI for direct commands - saves tokens
 */
export function shouldBypassAI(text: string): boolean {
  const normalized = text.toLowerCase().trim();
  
  // Games
  if (/^(minesweeper|mine|démineur|trivia|quiz|geo|guessnumber|connect4|logo|blindtest|tierlist|million|shell)($|\s)/i.test(normalized)) return true;
  
  // Radio
  if (/^(nrj|fun|rtl|europe1|skyrock|franceinter|musique|virgin|nostalgie|cherie)($|\s)/i.test(normalized)) return true;
  
  // Fun
  if (/^(joke|compliment|8ball|dice|conspiracy)($|\s)/i.test(normalized)) return true;
  
  return false;
}

/**
 * Force web search for top lists
 */
export function isTopListQuery(text: string): boolean {
  const normalized = text.toLowerCase();
  return /\b(top\s*\d+|classement|ranking|best|meilleur|plus\s+(?:populaire|vendu)|ventes|bestseller)\b/i.test(normalized);
}

/**
 * Extract radio station key
 */
export function extractRadioStation(text: string): string | null {
  const normalized = text.toLowerCase();
  const stations = ["nrj", "fun", "rtl", "europe1", "skyrock", "franceinter", "musique", "virgin", "nostalgie", "cherie"];
  for (const station of stations) {
    if (normalized.includes(station)) return station;
  }
  return null;
}

/**
 * Extract YouTube query
 */
export function extractYoutubeQuery(text: string): string | null {
  if (text.includes("youtube.com") || text.includes("youtu.be")) {
    const match = text.match(/(https?:\/\/[^\s]+)/);
    return match ? match[1] : null;
  }
  return text.trim();
}
