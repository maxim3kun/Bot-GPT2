/**
 * AI Function Definitions for Function Calling (Tool Use)
 * Complete set of all bot commands that the AI can trigger autonomously
 * 
 * When the user asks for something naturally (e.g., "Generate me a birthday reminder"),
 * the AI can recognize this and execute the appropriate bot function.
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
      pattern?: string;
    }>;
    required?: string[];
  };
}

/**
 * COMPLETE BOT FUNCTION CATALOG
 * All functions the AI can trigger when asked by the user
 */
export const BOT_FUNCTIONS: AIFunction[] = [
  // ========== MUSIQUE & AUDIO ==========
  {
    name: "play_radio",
    description: "Play a radio station. Use when user asks to play music or a specific radio station.",
    parameters: {
      type: "object",
      properties: {
        station: {
          type: "string",
          description: "Radio station key: nrj, fun, rtl, europe1, skyrock, franceinter, musique, virgin, nostalgie, cherie, or custom name"
        }
      },
      required: ["station"]
    }
  },
  {
    name: "generate_music",
    description: "Generate a song using Suno AI. Use when user asks to create/generate music, compose a song, or make a beat.",
    parameters: {
      type: "object",
      properties: {
        prompt: {
          type: "string",
          description: "Music style, mood, and description. Examples: 'lo-fi hip hop chill beats', 'upbeat rock anthem with guitars'"
        }
      },
      required: ["prompt"]
    }
  },
  {
    name: "play_youtube",
    description: "Play audio from YouTube. Use when user asks to play a song, artist, video, or provides a YouTube link.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Song title, artist name, or YouTube URL. Examples: 'Stromae Papaoutai', 'https://youtu.be/...'"
        }
      },
      required: ["query"]
    }
  },
  {
    name: "play_karaoke",
    description: "Start karaoke mode with a song. Use when user asks to sing, do karaoke, or perform a song.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Song title or artist name to find karaoke version"
        }
      },
      required: ["query"]
    }
  },
  {
    name: "skip_track",
    description: "Skip the currently playing track.",
    parameters: {
      type: "object",
      properties: {}
    }
  },
  {
    name: "stop_music",
    description: "Stop playing and disconnect from voice channel.",
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

  // ========== VOICE & AUDIO PROCESSING ==========
  {
    name: "join_voice",
    description: "Bot joins user's voice channel to listen and respond with voice.",
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
    name: "voice_say",
    description: "Bot reads text aloud in voice channel. Use when user asks the bot to speak something.",
    parameters: {
      type: "object",
      properties: {
        text: {
          type: "string",
          description: "Text for the bot to speak aloud"
        }
      },
      required: ["text"]
    }
  },
  {
    name: "shazam",
    description: "Identify the currently playing song using Shazam.",
    parameters: {
      type: "object",
      properties: {}
    }
  },

  // ========== GAMES & MINI-GAMES ==========
  {
    name: "start_minesweeper",
    description: "Start a Minesweeper game. Use when user asks to play minesweeper.",
    parameters: {
      type: "object",
      properties: {
        difficulty: {
          type: "string",
          description: "Game difficulty level",
          enum: ["easy", "medium", "hard"]
        }
      }
    }
  },
  {
    name: "start_geo_game",
    description: "Start GeoGuessr game - guess cities by location. Use when user asks to play geo, geoguessr, or location game.",
    parameters: {
      type: "object",
      properties: {
        difficulty: {
          type: "string",
          description: "Game difficulty",
          enum: ["easy", "medium", "hard"]
        }
      }
    }
  },
  {
    name: "start_trivia",
    description: "Start an AI-generated trivia quiz game. Use when user asks for trivia, quiz, or knowledge challenge.",
    parameters: {
      type: "object",
      properties: {}
    }
  },
  {
    name: "start_guessing_game",
    description: "Start guess-the-number game. User has 7 attempts to guess a number between 1-100.",
    parameters: {
      type: "object",
      properties: {}
    }
  },
  {
    name: "start_connect4",
    description: "Start Connect4 game against the bot or multiplayer. Use when user asks to play Connect 4, four in a row.",
    parameters: {
      type: "object",
      properties: {
        mode: {
          type: "string",
          description: "Game mode",
          enum: ["solo", "multiplayer"]
        }
      }
    }
  },
  {
    name: "start_guess_logo",
    description: "Start Guess The Logo game - identify brand logos. Use when user asks to play logo game or brand guessing.",
    parameters: {
      type: "object",
      properties: {
        difficulty: {
          type: "string",
          description: "Logo game difficulty",
          enum: ["easy", "medium", "hard"]
        }
      }
    }
  },
  {
    name: "start_tierlist",
    description: "Start tier list game - rank items into S/A/B/C/D tiers. Use when user asks to make a tier list or rank something.",
    parameters: {
      type: "object",
      properties: {
        category: {
          type: "string",
          description: "What to tier (e.g., 'Nintendo games', 'fruits', 'anime characters')"
        }
      }
    }
  },
  {
    name: "start_blindtest",
    description: "Start blind test / music quiz - guess songs by listening. Use when user asks for music quiz, blind test, or song guessing.",
    parameters: {
      type: "object",
      properties: {}
    }
  },
  {
    name: "start_million_game",
    description: "Start Million Game - answer trivia to win virtual prize money.",
    parameters: {
      type: "object",
      properties: {}
    }
  },
  {
    name: "start_shell_game",
    description: "Start Shell Game - find the ball under the shell. Fun reaction time game.",
    parameters: {
      type: "object",
      properties: {}
    }
  },

  // ========== QUESTS & USER PROGRESSION ==========
  {
    name: "start_quest",
    description: "Start the quest system / objective tracking. Use when user wants to create goals, objectives, or quests.",
    parameters: {
      type: "object",
      properties: {}
    }
  },
  {
    name: "add_quest",
    description: "Add a new quest/objective with AI coach help. Use when user wants to add a specific goal or task.",
    parameters: {
      type: "object",
      properties: {
        objective: {
          type: "string",
          description: "The goal or objective to track (e.g., 'Learn TypeScript', 'Exercise 30 minutes')"
        }
      },
      required: ["objective"]
    }
  },
  {
    name: "mark_quest_done",
    description: "Mark a quest as completed. Use when user says they completed a goal.",
    parameters: {
      type: "object",
      properties: {
        quest_number: {
          type: "string",
          description: "Quest number or name to mark as done"
        }
      }
    }
  },
  {
    name: "show_quest_list",
    description: "Show all active and completed quests. Use when user asks for their quest list or progress.",
    parameters: {
      type: "object",
      properties: {}
    }
  },
  {
    name: "show_quest_profile",
    description: "Show user's quest profile with level, XP, achievements.",
    parameters: {
      type: "object",
      properties: {}
    }
  },

  // ========== BIRTHDAYS & EVENTS ==========
  {
    name: "add_birthday",
    description: "Add or set a birthday reminder. Use when user wants to add a birthday, celebrate, or set reminders for special dates.",
    parameters: {
      type: "object",
      properties: {
        user: {
          type: "string",
          description: "Whose birthday (name or @mention)"
        },
        date: {
          type: "string",
          description: "Birthday date (format: DD/MM or DD/MM/YYYY). Example: 25/12 for December 25th"
        }
      },
      required: ["date"]
    }
  },
  {
    name: "set_reminder",
    description: "Set a time-based reminder for the user. Use when user asks for reminders, alerts, or scheduled notifications.",
    parameters: {
      type: "object",
      properties: {
        time: {
          type: "string",
          description: "When to remind (e.g., '3pm', '15:30', 'tomorrow at 9am', 'in 2 hours')"
        },
        message: {
          type: "string",
          description: "What to remind about"
        }
      },
      required: ["time", "message"]
    }
  },

  // ========== CREATIVE & GENERATION ==========
  {
    name: "generate_image",
    description: "Generate an image using AI. Use when user asks to create/draw an image, generate art, or visualize something.",
    parameters: {
      type: "object",
      properties: {
        description: {
          type: "string",
          description: "Detailed description of the image to generate. Be specific and creative!"
        }
      },
      required: ["description"]
    }
  },
  {
    name: "create_qr_code",
    description: "Generate a QR code from text. Use when user asks to make a QR code or encode information.",
    parameters: {
      type: "object",
      properties: {
        text: {
          type: "string",
          description: "Text/URL to encode in the QR code"
        }
      },
      required: ["text"]
    }
  },

  // ========== DATA & REFERENCE ==========
  {
    name: "lookup_pokemon",
    description: "Look up Pokémon information. Use when user asks about a Pokémon, wants stats, evolution, or Pokedex info.",
    parameters: {
      type: "object",
      properties: {
        pokemon_name: {
          type: "string",
          description: "Pokémon name (e.g., 'Pikachu', 'Charizard', 'Mewtwo')"
        }
      },
      required: ["pokemon_name"]
    }
  },
  {
    name: "define_word",
    description: "Look up word definitions and meanings. Use when user asks for definitions, word meanings, or language help.",
    parameters: {
      type: "object",
      properties: {
        word: {
          type: "string",
          description: "Word to define"
        }
      },
      required: ["word"]
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
          description: "Specific help topic (optional). Examples: 'music', 'games', 'voice', 'quests'"
        }
      }
    }
  },

  // ========== POLLS & SOCIAL ==========
  {
    name: "create_poll",
    description: "Create a poll/survey for the server. Use when user wants to ask a question and get votes from others.",
    parameters: {
      type: "object",
      properties: {
        question: {
          type: "string",
          description: "The poll question"
        },
        options: {
          type: "string",
          description: "Poll choices separated by pipes. Example: 'Pizza | Pasta | Burger'"
        }
      },
      required: ["question", "options"]
    }
  },

  // ========== FUN COMMANDS ==========
  {
    name: "tell_joke",
    description: "Tell a random joke. Use when user asks for humor, jokes, or to laugh.",
    parameters: {
      type: "object",
      properties: {
        language: {
          type: "string",
          description: "Joke language",
          enum: ["en", "fr", "es", "de", "pt", "it", "ja"]
        }
      }
    }
  },
  {
    name: "give_compliment",
    description: "Give a compliment to the user. Use when user asks for a compliment or confidence boost.",
    parameters: {
      type: "object",
      properties: {
        language: {
          type: "string",
          description: "Compliment language",
          enum: ["en", "fr", "es", "de", "pt", "it", "ja"]
        }
      }
    }
  },
  {
    name: "magic_8ball",
    description: "Ask the Magic 8-Ball a yes/no question for a mystical answer.",
    parameters: {
      type: "object",
      properties: {
        question: {
          type: "string",
          description: "Yes/no question to ask the 8-ball"
        }
      },
      required: ["question"]
    }
  },
  {
    name: "roll_dice",
    description: "Roll a die. Use when user asks to roll dice, flip a coin, or get random numbers.",
    parameters: {
      type: "object",
      properties: {
        sides: {
          type: "string",
          description: "Number of sides (default 6, max 1000). Example: '20' for d20"
        }
      }
    }
  },
  {
    name: "generate_conspiracy",
    description: "Generate a funny, absurd conspiracy theory. Use when user asks for conspiracy theories, fun theories, or silly predictions.",
    parameters: {
      type: "object",
      properties: {
        topic: {
          type: "string",
          description: "Optional topic for the conspiracy (e.g., 'the moon', 'cats', 'pizza')"
        }
      }
    }
  },

  // ========== SERVER MANAGEMENT ==========
  {
    name: "change_prefix",
    description: "Change the bot's command prefix for the server. Admin only - for customizing command trigger.",
    parameters: {
      type: "object",
      properties: {
        new_prefix: {
          type: "string",
          description: "New prefix (max 3 chars, e.g., '?', '>>', '$')"
        }
      },
      required: ["new_prefix"]
    }
  },
  {
    name: "set_server_language",
    description: "Set the default language for the server. Admin only.",
    parameters: {
      type: "object",
      properties: {
        language: {
          type: "string",
          description: "Language code",
          enum: ["en", "fr", "es", "de", "pt", "it", "ja", "nl", "ru", "pl", "tr"]
        }
      },
      required: ["language"]
    }
  },

  // ========== USER SETTINGS ==========
  {
    name: "set_user_language",
    description: "Set your preferred language for the bot. Changes how the bot responds to you.",
    parameters: {
      type: "object",
      properties: {
        language: {
          type: "string",
          description: "Your preferred language",
          enum: ["en", "fr", "es", "de", "pt", "it", "ja", "nl", "ru", "pl", "tr"]
        }
      },
      required: ["language"]
    }
  },
  {
    name: "show_profile",
    description: "Show your user profile with stats, level, achievements, and settings.",
    parameters: {
      type: "object",
      properties: {}
    }
  },
];

// ────────────────────────────────────────────────────────────────────────────

/**
 * Helper function: Detect if a query is asking for a top list/ranking
 * These should ALWAYS trigger web search for current information
 */
export function isTopListQuery(text: string): boolean {
  const normalized = text.toLowerCase();
  return /\b(top\s*\d+|classement|liste|ranking|rank|best|meilleur|top\s+(?:10|20|50|100)|plus\s+(?:populaire|vendu|apprécié)|ventes|bestseller|chart)\b/i.test(normalized);
}

/**
 * Helper function: Check if user is asking for tool/command help
 */
export function isAskingForBotHelp(text: string): boolean {
  const normalized = text.toLowerCase();
  return /\b(how\s+(?:do|to|can)|comment|peux|pouvez|can\s+(?:you|i)|puis-je|comment\s+utiliser|guide|help|aide|commands?|commandes)\b/i.test(normalized) &&
    /\b(bot|music|radio|play|jouer|jeu|game|command|commande)\b/i.test(normalized);
}

/**
 * Helper function: Extract which feature the user is requesting
 * Maps natural language to function names
 */
export function extractRequestedFeature(text: string): string | null {
  const normalized = text.toLowerCase();
  
  // MUSIC & AUDIO
  if (/\b(music|song|générer|generate|créer|create|composition|compose|beat)\b/i.test(normalized)) return "generate_music";
  if (/\b(radio|station|stream|listen)\b/i.test(normalized)) return "play_radio";
  if (/\b(youtube|video|play|jouer|lire|sing|karaoke)\b/i.test(normalized)) return "play_youtube";
  
  // GAMES
  if (/\b(minesweeper|mine|sweep)\b/i.test(normalized)) return "start_minesweeper";
  if (/\b(geo|geoguessr|location|city|guess.*city)\b/i.test(normalized)) return "start_geo_game";
  if (/\b(trivia|quiz|question|test)\b/i.test(normalized)) return "start_trivia";
  if (/\b(guess.*number|number.*game|range.*1.*100)\b/i.test(normalized)) return "start_guessing_game";
  if (/\b(connect4|four.*row|puissance|c4)\b/i.test(normalized)) return "start_connect4";
  if (/\b(logo|brand|guess.*logo)\b/i.test(normalized)) return "start_guess_logo";
  if (/\b(tier|rank|ranking|tier.*list)\b/i.test(normalized)) return "start_tierlist";
  if (/\b(blind.*test|music.*quiz|guess.*song)\b/i.test(normalized)) return "start_blindtest";
  if (/\b(million|money|prize)\b/i.test(normalized)) return "start_million_game";
  if (/\b(shell.*game|ball.*shell|quick.*game|reaction)\b/i.test(normalized)) return "start_shell_game";
  
  // QUESTS & PROGRESSION
  if (/\b(quest|objective|goal|target|challenge|achieve)\b/i.test(normalized)) return "start_quest";
  
  // SPECIAL DATES & REMINDERS
  if (/\b(birthday|anniversaire|birth|celebrate|fête)\b/i.test(normalized)) return "add_birthday";
  if (/\b(remind|reminder|alert|notification)\b/i.test(normalized)) return "set_reminder";
  
  // CREATIVE
  if (/\b(image|draw|art|generate|visualize|design|picture|paint)\b/i.test(normalized)) return "generate_image";
  if (/\b(qr|code|qr.*code|encode)\b/i.test(normalized)) return "create_qr_code";
  
  // DATA & REFERENCE
  if (/\b(pokemon|poké|pokédex|pikachu|charizard)\b/i.test(normalized)) return "lookup_pokemon";
  if (/\b(define|definition|meaning|word|dictionary|dict)\b/i.test(normalized)) return "define_word";
  if (/\b(help|aide|guide|usage|how.*to|comment)\b/i.test(normalized)) return "get_help";
  
  // FUN
  if (/\b(joke|funny|laugh|humor|blague)\b/i.test(normalized)) return "tell_joke";
  if (/\b(compliment|praise|flatter|boost)\b/i.test(normalized)) return "give_compliment";
  if (/\b(magic.*8.*ball|8.*ball|mystique)\b/i.test(normalized)) return "magic_8ball";
  if (/\b(roll|dice|d20|d6|flip)\b/i.test(normalized)) return "roll_dice";
  if (/\b(conspiracy|theory|theories)\b/i.test(normalized)) return "generate_conspiracy";
  
  // POLLS & SOCIAL
  if (/\b(poll|vote|survey|question|option)\b/i.test(normalized)) return "create_poll";
  
  return null;
}

/**
 * Helper function: Match user intent to function with confidence score
 * Returns the best matching function name and confidence
 */
export function matchUserIntentToFunction(text: string): { function: string; confidence: number } | null {
  const feature = extractRequestedFeature(text);
  if (feature) {
    return { function: feature, confidence: 0.9 };
  }
  
  // If no clear match, return null (don't force execution)
  return null;
}
