/**
 * AI Function Definitions for Function Calling (Tool Use)
 * Allows the AI to trigger bot commands autonomously when appropriate
 */

export interface AIFunction {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, {
      type: string;
      description: string;
      enum?: string[];
    }>;
    required?: string[];
  };
}

export const BOT_FUNCTIONS: AIFunction[] = [
  {
    name: "play_radio",
    description: "Play a radio station. Use this when the user asks to play music or a radio station.",
    parameters: {
      type: "object",
      properties: {
        station: {
          type: "string",
          description: "Radio station key: nrj, fun, rtl, europe1, skyrock, franceinter, musique, virgin, nostalgie, cherie, or custom station name",
          enum: ["nrj", "fun", "rtl", "europe1", "skyrock", "franceinter", "musique", "virgin", "nostalgie", "cherie"]
        },
        action: {
          type: "string",
          description: "Action to perform: 'play' to start, 'stop' to stop",
          enum: ["play", "stop"]
        }
      },
      required: ["station", "action"]
    }
  },
  {
    name: "generate_music",
    description: "Generate a song using Suno AI. Use this when the user asks to create music or generate a song.",
    parameters: {
      type: "object",
      properties: {
        prompt: {
          type: "string",
          description: "Music style and mood description. Examples: 'lo-fi hip hop beats, chill, rainy day', 'upbeat rock anthem, electric guitar'"
        }
      },
      required: ["prompt"]
    }
  },
  {
    name: "play_youtube",
    description: "Play audio from YouTube. Use this when the user asks to play a song, video, or provides a YouTube link.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Song title, artist name, or YouTube URL. Examples: 'stromae papaoutai', 'https://youtu.be/...'"
        }
      },
      required: ["query"]
    }
  },
  {
    name: "skip_track",
    description: "Skip the currently playing track and move to the next one.",
    parameters: {
      type: "object",
      properties: {}
    }
  },
  {
    name: "get_queue",
    description: "Show the current music queue / what's playing next.",
    parameters: {
      type: "object",
      properties: {}
    }
  },
  {
    name: "join_voice",
    description: "Bot joins the user's voice channel to listen and respond with voice.",
    parameters: {
      type: "object",
      properties: {}
    }
  },
  {
    name: "leave_voice",
    description: "Bot leaves the current voice channel.",
    parameters: {
      type: "object",
      properties: {}
    }
  },
  {
    name: "start_trivia",
    description: "Start an AI-generated trivia quiz game.",
    parameters: {
      type: "object",
      properties: {}
    }
  },
  {
    name: "start_game",
    description: "Start a mini-game (minesweeper, connect4, guessnumber, geo, guessthelogo).",
    parameters: {
      type: "object",
      properties: {
        game: {
          type: "string",
          description: "Game type to start",
          enum: ["minesweeper", "connect4", "guessnumber", "geo", "guessthelogo", "tierlist", "blindtest"]
        },
        difficulty: {
          type: "string",
          description: "Game difficulty (if applicable)",
          enum: ["easy", "medium", "hard"]
        }
      },
      required: ["game"]
    }
  },
  {
    name: "generate_image",
    description: "Generate an image using AI (FLUX). Use this when the user asks to create or generate an image.",
    parameters: {
      type: "object",
      properties: {
        description: {
          type: "string",
          description: "Detailed description of the image to generate"
        }
      },
      required: ["description"]
    }
  },
  {
    name: "get_help",
    description: "Show the bot's help menu with all available commands.",
    parameters: {
      type: "object",
      properties: {
        topic: {
          type: "string",
          description: "Specific help topic (optional). Examples: 'music', 'games', 'voice', 'radio'"
        }
      }
    }
  }
];

/**
 * Helper to detect if a query is asking for a list/ranking
 * These should ALWAYS trigger web search for current information
 */
export function isTopListQuery(text: string): boolean {
  const normalized = text.toLowerCase();
  return /\b(top\s*\d+|classement|liste|ranking|rank|best|meilleur|top\s+(?:10|20|50|100)|plus\s+(?:populaire|vendu|apprécié)|ventes|bestseller|chart)\b/i.test(normalized);
}

/**
 * Helper to detect if the user is asking for tool/command help
 */
export function isAskingForBotHelp(text: string): boolean {
  const normalized = text.toLowerCase();
  return /\b(how\s+(?:do|to|can)|comment|peux|pouvez|can\s+(?:you|i)|puis-je|comment\s+utiliser|guide|help|aide|commands?|commandes)\b/i.test(normalized) &&
    /\b(bot|music|radio|play|jouer|jeu|game|command|commande)\b/i.test(normalized);
}

/**
 * Helper to check if user is asking for specific bot features
 */
export function extractRequestedFeature(text: string): string | null {
  const normalized = text.toLowerCase();
  
  if (/\b(music|song|générer|generate|créer|create|composition)\b/i.test(normalized)) return "music";
  if (/\b(radio|station|stream)\b/i.test(normalized)) return "radio";
  if (/\b(youtube|video|play|jouer|lire)\b/i.test(normalized)) return "youtube";
  if (/\b(image|draw|dessine|génère|generate|create)\b/i.test(normalized)) return "image";
  if (/\b(game|jeu|trivia|quiz|minesweeper|connect4|guessnumber|geo|logo)\b/i.test(normalized)) return "game";
  if (/\b(voice|speak|écoute|listen|join|voice channel)\b/i.test(normalized)) return "voice";
  
  return null;
}
