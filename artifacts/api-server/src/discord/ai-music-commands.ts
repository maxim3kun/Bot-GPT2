import { AudioPlayerStatus } from "@discordjs/voice";
import type { Message } from "discord.js";
import { getQueueEmbed, nowPlaying, pauseToggle, playRadio, radioStates, searchAndQueue, skipYoutube, stopForGuild } from "./radio.js";
import type { AiCommandAction } from "./ai-command-tools.js";
const confirmedStates = new Set<AudioPlayerStatus>([AudioPlayerStatus.Playing, AudioPlayerStatus.Paused, AudioPlayerStatus.AutoPaused]);

/** Audio operations, not a new player. Only this layer/domain handlers report the observed result. */
export async function handleAiMusicCommand(message: Message, action: AiCommandAction, language: string, authorize?: () => Promise<boolean>) {
  const fr = language === "fr", guild = message.guildId;
  if (!guild) return;
  if (action.name === "play_radio") return playRadio(message, action.station, authorize);
  if (action.name === "play_youtube" || action.name === "search_youtube") return searchAndQueue(message, action.query, authorize, action.name === "play_youtube");
  if (action.name === "music_skip") return skipYoutube(message);
  const reply = (a: string, b: string) => message.reply({ content: fr ? a : b, allowedMentions: { parse: [] } });
  const state = radioStates.get(guild);
  if (action.name === "music_pause" || action.name === "music_resume") {
    if (!state || !state.youtubeTitle && !state.stationKey) return reply("Aucune lecture en cours.", "Nothing is playing.");
    if (state.player.state.status !== AudioPlayerStatus.Playing && state.player.state.status !== AudioPlayerStatus.Paused)
      return reply("Le lecteur n’a pas encore confirmé une lecture disponible.", "The player has not confirmed available playback yet.");
    const pause = action.name === "music_pause";
    if (state.player.state.status === (pause ? AudioPlayerStatus.Paused : AudioPlayerStatus.Playing))
      return reply(pause ? "La lecture est déjà en pause." : "La lecture est déjà reprise.", pause ? "Playback is already paused." : "Playback is already resumed.");
    state.paused = !pause; // Align the existing toggle with the player's observed state.
    const result = pauseToggle(guild);
    return result === (pause ? "paused" : "resumed")
      ? reply(pause ? "Lecture mise en pause." : "Lecture reprise.", pause ? "Playback paused." : "Playback resumed.")
      : reply("Le lecteur n’a pas confirmé ce changement.", "The player did not confirm that change.");
  }
  if (action.name === "music_stop") return stopForGuild(guild)
    ? reply("Lecture arrêtée et connexion vocale fermée.", "Playback stopped and voice connection closed.")
    : reply("Aucune session audio à arrêter.", "There is no audio session to stop.");
  if (action.name === "music_queue") {
    const embed = getQueueEmbed(guild);
    return embed ? message.reply({ embeds: [embed], allowedMentions: { parse: [] } }) : reply("La file d’attente est vide.", "The queue is empty.");
  }
  if (action.name === "music_current") {
    if (state && !confirmedStates.has(state.player.state.status))
      return reply("La lecture n’est pas encore confirmée par le lecteur.", "Playback is not yet confirmed by the player.");
    const embed = nowPlaying(guild);
    if (embed && state && state.player.state.status !== AudioPlayerStatus.Playing) embed.setTitle(fr ? "Lecture en pause" : "Playback paused");
    return embed ? message.reply({ embeds: [embed], allowedMentions: { parse: [] } }) : reply("Aucune lecture en cours.", "Nothing is playing.");
  }
}
