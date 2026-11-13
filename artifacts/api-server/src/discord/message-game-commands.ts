import type { Message } from "discord.js";
import type OpenAI from "openai";
import {
  isGeoActive,
  isLogoActive,
  playConnect4,
  playGeoguessr,
  playGuessLogo,
  playGuessNumber,
  playMinesweeper,
  playTrivia,
  stopGeoguessr,
  stopGuessLogo,
} from "../games.js";
import { requireConsent } from "./ai-consent.js";
import { startBlindtest } from "./blindtest.js";
import { startMillionGame, showMillionLeaderboard } from "./milliongame.js";
import { startTierlist } from "./tierlist.js";
import type { Language } from "./responses.js";
import { moduleFallbackMessage } from "./module-fallback.js";
import { reportModuleFailure } from "./module-technician.js";
import { handleHangmanCommand } from "./hangman.js";

export function isGameMessageCommand(command: string | undefined): boolean {
  return [
    "minesweeper", "mine", "geo", "trivia", "tierlist", "tier", "blindtest", "musicquiz",
    "milliongame", "million", "guessnumber", "guess", "connect4", "guessthelogo",
    "guesslogo", "devinelelogo", "hangman", "pendu",
  ].includes(command ?? "");
}

export async function handleGameMessageCommand(
  message: Message,
  command: string | undefined,
  args: string[],
  openai: OpenAI | null,
  responseLang: Language,
  prefix = "!",
): Promise<boolean> {
  switch (command) {
    case "hangman":
    case "pendu": {
      await handleHangmanCommand(message, args, responseLang, prefix, command);
      return true;
    }

    case "minesweeper":
    case "mine": {
      const board = playMinesweeper(message, args[0]?.toLowerCase());
      if (board) await message.reply(board);
      return true;
    }

    case "geo": {
      const sub = args[0]?.toLowerCase();
      if (sub === "stop") {
        if (isGeoActive(message.channelId)) {
          stopGeoguessr(message.channelId);
          await message.reply("🏳️ GeoGuessr game abandoned!");
        } else {
          await message.reply("🤷 No game in progress.");
        }
        return true;
      }
      const difficulty = sub || "easy";
      if (!["easy", "medium", "hard"].includes(difficulty)) {
        await message.reply("❓ Invalid mode. Use `!geo easy`, `!geo medium` or `!geo hard`.");
        return true;
      }
      playGeoguessr(message, difficulty as "easy" | "medium" | "hard")
        .catch(async (err) => {
          await reportModuleFailure(message, "games", err);
          await message.reply(moduleFallbackMessage("games", responseLang)).catch(() => null);
        });
      return true;
    }

    case "trivia": {
      if (!openai) {
        await message.reply("❌ AI features are not configured. Ask a moderator to set it up — use `!mode d'emploi` for instructions.");
        return true;
      }
      if (!await requireConsent(message)) return true;
      playTrivia(message, openai).catch(async (err) => {
        await reportModuleFailure(message, "games", err, "groq");
        await message.reply(moduleFallbackMessage("games", responseLang)).catch(() => null);
      });
      return true;
    }

    case "tierlist":
    case "tier": {
      await startTierlist(message, args).catch((err) => {
        return reportModuleFailure(message, "games", err)
          .then(() => message.reply(moduleFallbackMessage("games", responseLang)).catch(() => null));
      });
      return true;
    }

    case "blindtest":
    case "musicquiz": {
      await startBlindtest(message, args).catch((err) => {
        return reportModuleFailure(message, "games", err)
          .then(() => message.reply(moduleFallbackMessage("games", responseLang)).catch(() => null));
      });
      return true;
    }

    case "milliongame":
    case "million": {
      const sub = args[0]?.toLowerCase();
      if (sub === "leaderboard" || sub === "top" || sub === "lb" || sub === "classement") {
        await showMillionLeaderboard(message).catch((err) => {
          return reportModuleFailure(message, "games", err)
            .then(() => message.reply(moduleFallbackMessage("games", responseLang)).catch(() => null));
        });
      } else {
        await startMillionGame(message).catch((err) => {
          return reportModuleFailure(message, "games", err)
            .then(() => message.reply(moduleFallbackMessage("games", responseLang)).catch(() => null));
        });
      }
      return true;
    }

    case "guessnumber":
    case "guess": {
      playGuessNumber(message).catch(async (err) => {
        await reportModuleFailure(message, "games", err);
        await message.reply(moduleFallbackMessage("games", responseLang)).catch(() => null);
      });
      return true;
    }

    case "connect4": {
      await playConnect4(message, args);
      return true;
    }

    case "guessthelogo":
    case "guesslogo":
    case "devinelelogo": {
      const sub = args[0]?.toLowerCase();
      if (sub === "stop") {
        if (isLogoActive(message.channelId)) {
          stopGuessLogo(message.channelId);
          await message.reply("🏳️ Logo game abandoned!");
        } else {
          await message.reply("🤷 No logo game in progress.");
        }
        return true;
      }
      const difficulty = sub && ["easy", "medium", "hard"].includes(sub) ? sub : "easy";
      playGuessLogo(message, difficulty).catch(async (err) => {
        await reportModuleFailure(message, "games", err);
        await message.reply(moduleFallbackMessage("games", responseLang)).catch(() => null);
      });
      return true;
    }

    default:
      return false;
  }
}
