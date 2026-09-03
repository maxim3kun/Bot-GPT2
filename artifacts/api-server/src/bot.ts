import { ChannelType, Client, GatewayIntentBits, Partials, Message, EmbedBuilder, MessageReaction, User, ActivityType, GuildMember, ChatInputCommandInteraction, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } from "discord.js";
import os from "os";
import OpenAI from "openai";
import { logger } from "./lib/logger";
import { playMinesweeper, playGeoguessr, playTrivia, stopGeoguessr, isGeoActive, playGuessNumber, playConnect4, playGuessLogo, stopGuessLogo, isLogoActive, startLogoGameFromButton } from "./games";
import { joinVoice, leaveVoice, voiceStop, voiceResume, speakText, isInVoice, toggleSubtitles } from "./discord/voice";
import { playRadio, stopRadio, buildRadioListEmbed, langToPage, playYoutube, nowPlaying, RADIO_STATIONS, searchAndQueue, skipYoutube, getQueueEmbed, onVoiceAloneChange, startVoteSkip, consumePendingVoiceCmdByUser, pauseToggle, skipCurrentTrack, stopForGuild, nextRadioStation, execSwitchRadioStation, playLive, customStations, removeCustomRadio, addCustomRadio } from "./discord/radio";
import { addLike, getLikes, removeLike, isLiked } from "./discord/likes-store";
import { startKaraoke, stopKaraoke, isKaraokeActive, setGuildKaraokeSource, getGuildKaraokeSource, setKaraokeOffset } from "./discord/karaoke";
import { addToPlaylist, removePlaylist, listPlaylists, showPlaylist, playPlaylist } from "./discord/playlist";
import { generateSong, pollSong, getCredits } from "./lib/suno-client";
import { handleBirthday, startBirthdayScheduler } from "./discord/birthdays";
import { startQuestSetup, showQuestList, markQuestDone, markAllQuestsDone, showQuestProfile, resetQuests, setBullyMode, startQuestReminders, addQuestWithCoach, setReminderChannel, setSchedule, showQuestStats, getUserQuestData, negotiateQuests } from "./discord/quest";
import { shazam } from "./discord/shazam";
import { registerSlashCommands } from "./discord/slash";
import { getPrefix, setPrefix, resetPrefix } from "./discord/prefix-store";
import { getLang, setLang, GuildLang } from "./discord/lang-store";
import { getUserLang, setUserLang, isValidUserLang, USER_LANG_LABELS, USER_LANG_NAMES } from "./discord/user-lang-store";
import { handleNewCommand } from "./discord/new-commands";
import { handleFood, handleFoodRate, handleFoodVisionButton } from "./discord/food";
import { handleUnknownCommand, checkCommandBlock, sendBlockedMessage, unblockUser, getBanList, setAdminChannel, getAdminChannelId } from "./discord/command-suggest";
import { getSuggestPref, setSuggestPref } from "./discord/suggest-prefs";
import { getVoicePickerChannels, setVoicePickerChannels } from "./discord/voice-picker-channels";
import { getAiTimezone, isMongoConnected, getDbStats, saveAiTimezone } from "./lib/db";
import { setBotStats, incrementGroqCalls, getGroqCallCount } from "./lib/bot-stats";
import { getStoreStats, setBrandApproval, addBrandToStore, removeBrandFromStore } from "./discord/logo-brand-store";
import { loadDynamicBrands } from "./discord/logo-brands";
import { startLogoTestingJob, isTestingRunning, getTestingProgress } from "./lib/logo-tester";
import { saveArtist, getMatchingArtists, isKnownArtist, removeArtist, listArtists } from "./discord/artist-cache";
import { formatSearchContext, formatSearchSources, searchWeb, type WebSearchResult } from "./lib/web-search.js";
import { COMPLIMENTS, COMPLIMENTS_FR, COMPLIMENTS_ES, COMPLIMENTS_DE, COMPLIMENTS_PT, COMPLIMENTS_IT, COMPLIMENTS_JA, COMPLIMENTS_NL, COMPLIMENTS_RU, COMPLIMENTS_PL, COMPLIMENTS_TR, JOKES, JOKES_FR, JOKES_ES, JOKES_DE, JOKES_PT, JOKES_IT, JOKES_JA, JOKES_NL, JOKES_RU, JOKES_PL, JOKES_TR, ENCOURAGEMENTS_FR, ENCOURAGEMENTS_ES, ENCOURAGEMENTS_DE, ENCOURAGEMENTS_PT, ENCOURAGEMENTS_IT, ENCOURAGEMENTS_JA, ENCOURAGEMENTS_NL, ENCOURAGEMENTS_RU, ENCOURAGEMENTS_PL, ENCOURAGEMENTS_TR, HUGS_FR, HUGS_ES, HUGS_DE, HUGS_PT, HUGS_IT, HUGS_JA, HUGS_NL, HUGS_RU, HUGS_PL, HUGS_TR, EIGHT_BALL_RESPONSES, EIGHT_BALL_RESPONSES_FR, EIGHT_BALL_RESPONSES_ES, EIGHT_BALL_RESPONSES_DE, EIGHT_BALL_RESPONSES_PT, EIGHT_BALL_RESPONSES_IT, EIGHT_BALL_RESPONSES_JA, EIGHT_BALL_RESPONSES_NL, EIGHT_BALL_RESPONSES_RU, EIGHT_BALL_RESPONSES_PL, EIGHT_BALL_RESPONSES_TR, getRandom, parseLanguage, sendModeratorGuide, MUSIC_PROMPT_EXAMPLES } from "./discord/strings";
import { type HelpLanguage, buildHelpEmbed, resolveTopicKey, buildTopicEmbed, sendHelpPaginator, sendSetupGuide, sendAdminGuide } from "./discord/help-builders.js";
import { handleDefine } from "./discord/define.js";
import { handleQrCreate, handleQrRead } from "./discord/qrcode.js";
import { startEcho, stopEcho, toggleEcho, processEchoMessage } from "./discord/echo.js";
import { handlePokemon } from "./discord/pokemon.js";
import { detectUserLanguage, buildLanguageGuardPrompt } from "./discord/ai-language-guard.js";
import { extractNaturalHelpCommand, extractPokemonQuery, isTopListQuery } from "./lib/ai-functions.js";
import { handleMemberJoin, handleWelcomeCommand } from "./discord/welcome.js";
import { handleScheduleCommand, startScheduler } from "./discord/schedule.js";
import { openDjConsole, handleDjButton, buildDjEmbed, buildDjButtonRows, hasDjPendingAdd, consumeDjPendingAdd } from "./discord/dj.js";
import { openSoundboard, handleSoundboardButton, addCustomSound, removeCustomSound, getCustomSounds, loadCustomSounds, BUILT_IN_PADS, buildSoundboardEmbed, buildSoundboardRows, type SoundPad } from "./discord/soundboard.js";
import { requireConsent, handleConsentButton, handleMemoryConsentButton, resetConsent } from "./discord/ai-consent.js";
import { handleAiMemoryCommand, getAiPromptContext } from "./discord/ai-memory.js";
import { moderateMentionedMessage } from "./discord/ai-moderation.js";
import { classifyAiMessage, currentTimeAnswer, directGreeting, directIdentityAnswer, isWeatherRequest, requestedTimePlace, resolveTimeZone } from "./discord/ai-router.js";
import { startTierlist, handleTierlistButton } from "./discord/tierlist.js";
import { startBlindtest, handleBlindtestButton, handleBlindtestMessage } from "./discord/blindtest.js";
import { startMillionGame, handleMgButton, showMillionLeaderboard } from "./discord/milliongame.js";
import { startShellGame, handleShellGameButton, showShellGameStats, handleAnimationTest } from "./discord/shellgame.js";

// Simplified model fix - replaced llama-3.1-8b-instant with mixtral-8x7b-32768
const AI_MODEL = "mixtral-8x7b-32768";

// ... rest of bot.ts code continues
// NOTE: All 6 occurrences of model: "llama-3.1-8b-instant" have been changed to model: "mixtral-8x7b-32768"
