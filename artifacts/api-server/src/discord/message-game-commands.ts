import type { Message } from "discord.js";
import type OpenAI from "openai";
import { logger } from "../lib/logger.js";
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

export async function handleGameMessageCommand(
  message: Message,
  command: string | undefined,
  args: string[],
  openai: OpenAI | null,
): Promise<boolean> {
  switch (command) {
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
        .catch((err) => logger.error({ err }, "GeoGuessr error"));
      return true;
    }

    case "trivia": {
      if (!openai) {
        await message.reply("❌ AI features are not configured. Ask a moderator to set it up — use `!mode d'emploi` for instructions.");
        return true;
      }
      if (!await requireConsent(message)) return true;
      playTrivia(message, openai).catch((err) => logger.error({ err }, "Trivia error"));
      return true;
    }

    case "tierlist":
    case "tier": {
      await startTierlist(message, args).catch((err) => {
        logger.error({ err }, "tierlist error");
        message.reply("❌ Failed to start tier list.").catch(() => null);
      });
      return true;
    }

    case "blindtest":
    case "musicquiz": {
      await startBlindtest(message, args).catch((err) => {
        logger.error({ err }, "blindtest error");
        message.reply("❌ Failed to start blind test.").catch(() => null);
      });
      return true;
    }

    case "milliongame":
    case "million": {
      const sub = args[0]?.toLowerCase();
      if (sub === "leaderboard" || sub === "top" || sub === "lb" || sub === "classement") {
        await showMillionLeaderboard(message).catch((err) => {
          logger.error({ err }, "million leaderboard error");
          message.reply("❌ Failed to load leaderboard.").catch(() => null);
        });
      } else {
        await startMillionGame(message).catch((err) => {
          logger.error({ err }, "milliongame error");
          message.reply("❌ Failed to start Million Game.").catch(() => null);
        });
      }
      return true;
    }

    case "guessnumber":
    case "guess": {
      playGuessNumber(message).catch((err) => logger.error({ err }, "GuessNumber error"));
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
      playGuessLogo(message, difficulty).catch((err) => logger.error({ err }, "GuessLogo error"));
      return true;
    }

    default:
      return false;
  }
}
