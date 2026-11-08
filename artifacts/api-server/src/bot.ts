import { ChannelType, Client, GatewayIntentBits, Partials, Message, EmbedBuilder, ActivityType, GuildMember, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import os from "os";
import OpenAI from "openai";
import { logger } from "./lib/logger";
import { playMinesweeper, playGeoguessr, playTrivia, playGuessNumber, playConnect4, playGuessLogo, stopGuessLogo, isLogoActive, startLogoGameFromButton } from "./games";
import { joinVoice, leaveVoice, speakText, isInVoice, toggleSubtitles } from "./discord/voice";
import { playRadio, stopRadio, buildRadioListEmbed, langToPage, playYoutube, nowPlaying, RADIO_STATIONS, searchAndQueue, skipYoutube, getQueueEmbed, startVoteSkip, consumePendingVoiceCmd, pauseToggle, skipCurrentTrack, stopForGuild, buildNpButtonRows, buildRadioNpButtonRows, radioStates, consumePendingSearch, navigateSearch, setActivityCallback, setChannelNameCallback, playLive, nextRadioStation, execSwitchRadioStation, addCustomRadio, removeCustomRadio, customStations } from "./discord/radio";
import { addLike, getLikes, removeLike, isLiked } from "./discord/likes-store";
import { startKaraoke, stopKaraoke, setGuildKaraokeSource, getGuildKaraokeSource, setKaraokeOffset } from "./discord/karaoke";
import { addToPlaylist, removePlaylist, listPlaylists, showPlaylist, playPlaylist } from "./discord/playlist";
import { generateMusicTrack, handleSunoBalanceCommand } from "./discord/music-generation-commands.js";
import { generateSong, pollSong, getCredits } from "./lib/suno-client.js";
import { handleBirthday, startBirthdayScheduler } from "./discord/birthdays";
import { startQuestSetup, showQuestList, markQuestDone, markAllQuestsDone, showQuestProfile, resetQuests, setBullyMode, startQuestReminders, addQuestWithCoach, setReminderChannel, setSchedule, showQuestStats, getUserQuestData, negotiateQuests } from "./discord/quests";
import { shazam } from "./discord/shazam";
import { registerSlashCommands } from "./discord/slash";
import { getPrefix } from "./discord/prefix-store";
import { getLang, setLang } from "./discord/lang-store";
import { getUserLangOverride, setUserLang, clearUserLang, isValidUserLang, USER_LANG_LABELS } from "./discord/user-lang-store";
import { getEffectiveLanguage } from "./discord/effective-language.js";
import { handleVoiceCommand } from "./discord/voice-commands.js";
import { handleAdminUnlockTrigger, registerAdminUnlockInteractions } from "./discord/admin-unlock.js";
import { botText } from "./discord/bot-i18n.js";
import { commandSuggestText } from "./discord/command-suggest-i18n.js";
import { handleNewCommand } from "./discord/new-commands";
import { handleFood, handleFoodRate, handleFoodVisionButton } from "./discord/food";
import { handleUnknownCommand, checkCommandBlock, sendBlockedMessage } from "./discord/command-suggest";
import { getSuggestPref } from "./discord/suggest-prefs";
import { getAiTimezone, isMongoConnected, getDbStats, saveAiTimezone } from "./lib/db";
import { setBotStats, getGroqCallCount } from "./lib/bot-stats";
import { getStoreStats, setBrandApproval, addBrandToStore, removeBrandFromStore } from "./discord/logo-brand-store";
import { loadDynamicBrands } from "./discord/logo-brands";
import { startLogoTestingJob, isTestingRunning, getTestingProgress } from "./lib/logo-tester";
import { saveArtist, getMatchingArtists, isKnownArtist, removeArtist, listArtists } from "./discord/artist-cache";
import { formatLatestNewsAnswer, formatSearchContext, formatSearchSources, type WebSearchResult } from "./lib/web-search.js";
import { COMPLIMENTS, COMPLIMENTS_FR, COMPLIMENTS_ES, COMPLIMENTS_DE, COMPLIMENTS_PT, COMPLIMENTS_IT, COMPLIMENTS_JA, COMPLIMENTS_NL, COMPLIMENTS_RU, COMPLIMENTS_PL, COMPLIMENTS_TR, JOKES, JOKES_FR, JOKES_ES, JOKES_DE, JOKES_PT, JOKES_IT, JOKES_JA, JOKES_NL, JOKES_RU, JOKES_PL, JOKES_TR, ENCOURAGEMENTS, ENCOURAGEMENTS_FR, ENCOURAGEMENTS_ES, ENCOURAGEMENTS_DE, ENCOURAGEMENTS_PT, ENCOURAGEMENTS_IT, ENCOURAGEMENTS_JA, ENCOURAGEMENTS_NL, ENCOURAGEMENTS_RU, ENCOURAGEMENTS_PL, ENCOURAGEMENTS_TR, EIGHT_BALL_RESPONSES, EIGHT_BALL_RESPONSES_FR, EIGHT_BALL_RESPONSES_ES, EIGHT_BALL_RESPONSES_DE, EIGHT_BALL_RESPONSES_PT, EIGHT_BALL_RESPONSES_IT, EIGHT_BALL_RESPONSES_JA, EIGHT_BALL_RESPONSES_NL, EIGHT_BALL_RESPONSES_RU, EIGHT_BALL_RESPONSES_PL, EIGHT_BALL_RESPONSES_TR, HUGS, HUGS_FR, HUGS_ES, HUGS_DE, HUGS_PT, HUGS_IT, HUGS_JA, HUGS_NL, HUGS_RU, HUGS_PL, HUGS_TR, MUSIC_PROMPT_EXAMPLES, getRandom, parseLanguage } from "./discord/responses.js";
import { type HelpLanguage, resolveTopicKey, buildTopicEmbed, sendHelpPaginator, sendSetupGuide, sendAdminGuide } from "./discord/help-builders.js";
import { createSlashMessageAdapter, replyToSlash } from "./discord/slash-message-adapter.js";
import { handleDefine } from "./discord/define.js";
import { handleQrCreate, handleQrRead } from "./discord/qrcode.js";
import { startEcho, stopEcho, toggleEcho, processEchoMessage } from "./discord/echo.js";
import { handlePokemon } from "./discord/pokemon.js";
import { buildLanguageGuardPrompt, detectUserLanguage } from "./discord/ai-language-guard.js";
import { sendGeneratedImage } from "./discord/image-command.js";
import { configuredImageProviders } from "./discord/image-provider.js";
import { isSelfPhotoRequest, sendFictionalAssistantPhoto } from "./discord/persona-images.js";
import { extractNaturalHelpCommand, extractPokemonQuery, isTopListQuery } from "./lib/ai-functions.js";
import { handleWelcomeCommand } from "./discord/welcome.js";
import { handleScheduleCommand, startScheduler } from "./discord/schedule.js";
import { openDjConsole, handleDjButton, hasDjPendingAdd, consumeDjPendingAdd } from "./discord/dj.js";
import { openSoundboard, handleSoundboardButton, addCustomSound, removeCustomSound, getCustomSounds, loadCustomSounds, buildSoundboardEmbed, buildSoundboardRows, type SoundPad } from "./discord/soundboard.js";
import { handleConsentButton, handleMemoryConsentButton } from "./discord/ai-consent.js";
import { getAiPromptContext } from "./discord/ai-memory.js";
import { handleAiPersonaNaturalMessage } from "./discord/ai-personas.js";
import { moderateMentionedMessage } from "./discord/ai-moderation.js";
import { directPancakeRecipe, normalizeResearchAnswer } from "./discord/ai-answer-format.js";
import { createSearchSourceButton, getSearchSources } from "./discord/ai-research-sources.js";
import { FACTUAL_ACCURACY_GUIDANCE } from "./discord/ai-completion-quality.js";
import { buildBotCommandContext } from "./discord/ai-command-context.js";
import { handleAiActionRequest } from "./discord/ai-actions.js";
import { createReliableCompletion } from "./discord/ai-reliable-completion.js";
import { registerAiFeedback, trackAiReplies } from "./discord/ai-feedback.js";
import { startTechnicianDigest } from "./discord/technician-digest.js";
import { shouldSkipConversation, stripBotMention } from "./discord/ai-conversation-policy.js";
import { buildSpeakerContext, clarifyMentionedRecipient, currentUserTurn } from "./discord/ai-speaker-context.js";
import { rememberConversationTurn } from "./discord/ai-conversation-memory.js";
import { researchForTurn } from "./discord/ai-research-service.js";
import { isFactualCorrection } from "./discord/ai-correction-policy.js";
import { buildResearchQuery, classifyAiMessage, currentTimeAnswer, directCapabilitiesAnswer, directCreatorAnswer, directGreeting, directIdentityAnswer, isLatestNewsRequest, isWeatherRequest, requestedTimePlace, resolveTimeZone } from "./discord/ai-router.js";
import { handleTierlistButton } from "./discord/tierlist.js";
import { handleBlindtestButton, handleBlindtestMessage } from "./discord/blindtest.js";
import { handleMgButton } from "./discord/milliongame.js";
import { startShellGame, handleShellGameButton, showShellGameStats, handleAnimationTest } from "./discord/shellgame.js";
import { handleAiMessageAnalysis } from "./discord/ai-message-analysis.js";
import { handlePollCommand } from "./discord/poll.js";
import { registerVoiceStateEvents } from "./discord/voice-events.js";
import { registerGuildEvents } from "./discord/guild-events.js";
import { handleGameMessageCommand, isGameMessageCommand } from "./discord/message-game-commands.js";
import { isSendable } from "./discord/message-utils.js";
import { handleMessageAiCommand, isMessageAiCommand } from "./discord/message-ai-commands.js";
import { handleAdminMessageCommand, isAdminMessageCommand } from "./discord/admin-message-commands.js";
import {
  moduleForMessageCommand,
  moduleDependencyForCommand,
  recordModuleSuccess,
  getModuleLastFailureAt,
  reportModuleFailure,
} from "./discord/module-technician.js";
import { moduleFallbackMessage, runModuleWithFallback } from "./discord/module-fallback.js";


// ── Conversation history ──────────────────────────────────────────────────────

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const conversationHistory = new Map<string, ChatMessage[]>();
const lastResearchQueries = new Map<string, { query: string; timestamp: number }>();
const MAX_HISTORY = 40;
const MAX_AI_HISTORY_CHARS = 16_000;
const RESEARCH_FOLLOW_UP_TTL_MS = 5 * 60 * 1000;
const pendingTimeRequests = new Map<string, number>();
const TIME_FOLLOW_UP_TTL_MS = 5 * 60 * 1000;

function timeRequestKey(message: Message): string {
  return message.author.id;
}

function rememberTimeRequest(message: Message): void {
  pendingTimeRequests.set(timeRequestKey(message), Date.now() + TIME_FOLLOW_UP_TTL_MS);
}

async function consumeTimeFollowUp(message: Message, text: string): Promise<string | null> {
  const key = timeRequestKey(message);
  const expiresAt = pendingTimeRequests.get(key);
  if (!expiresAt) return null;
  if (expiresAt < Date.now()) {
    pendingTimeRequests.delete(key);
    return null;
  }

  const place = requestedTimePlace(text);
  if (!place) return null;
  pendingTimeRequests.delete(key);
  const timezone = resolveTimeZone(place);
  if (timezone) await saveAiTimezone(message.author.id, place, timezone);
  return currentTimeAnswer(text, place, getEffectiveLanguage(message.guildId, message.author.id));
}

function getHistory(channelId: string): ChatMessage[] {
  if (!conversationHistory.has(channelId)) conversationHistory.set(channelId, []);
  return conversationHistory.get(channelId)!;
}

function conversationKey(message: Message): string {
  return `${message.channelId}:${message.author.id}`;
}

function getAiResponseLanguage(
  userId: string,
  text: string,
  fallback: ReturnType<typeof getEffectiveLanguage>,
): ReturnType<typeof getEffectiveLanguage> {
  const detected = detectUserLanguage(text);
  if (detected) return detected;
  const personalOverride = getUserLangOverride(userId);
  if (personalOverride) return personalOverride;
  return fallback === "en" ? "fr" : fallback;
}

function getAiHistory(channelId: string): ChatMessage[] {
  const history = getHistory(channelId);
  let usedChars = 0;
  const bounded: ChatMessage[] = [];

  for (let index = history.length - 1; index >= 0; index -= 1) {
    const item = history[index]!;
    const remaining = MAX_AI_HISTORY_CHARS - usedChars;
    if (remaining <= 0) break;
    const content = item.content.slice(-remaining);
    bounded.unshift({ role: item.role, content });
    usedChars += content.length;
  }

  return bounded;
}

function addToHistory(channelId: string, role: "user" | "assistant", content: string): void {
  const history = getHistory(channelId);
  history.push({ role, content });
  if (history.length > MAX_HISTORY) history.splice(0, history.length - MAX_HISTORY);
}

function buildMessageResearchQuery(message: Message, text: string): string {
  if (isFactualCorrection(text)) return text;
  text = text.replace(/<@!?\d+>/g, "[Discord member]");
  const key = `${message.channelId}:${message.author.id}`;
  const previous = lastResearchQueries.get(key);
  const previousQuery = previous && Date.now() - previous.timestamp <= RESEARCH_FOLLOW_UP_TTL_MS
    ? previous.query
    : "";
  const query = buildResearchQuery(text, previousQuery);
  lastResearchQueries.set(key, { query, timestamp: Date.now() });
  return query;
}

function isBotMentioned(message: Message, botId: string): boolean {
  if (message.mentions.users.has(botId)) return true;
  return new RegExp(`<@!?${botId}>`).test(message.content);
}

function stripMentions(content: string): string {
  return stripBotMention(content, _botClient?.user?.id);
}

function isPornographicSiteListRequest(text: string): boolean {
  const normalized = text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  const adultContent = /\b(?:pornographique?s?|porno|porn|adultes?|nsfw|x-rated)\b/.test(normalized);
  const siteRequest = /\b(?:site?s?|plateforme?s?|liens?|pages?)\b/.test(normalized);
  const listRequest = /\b(?:liste|list|classement|top|plus connus?|plus populaires?|connus?|populaires?|meilleurs?|noms?|recommande?s?|recommandations?)\b/.test(normalized);
  return adultContent && siteRequest && (listRequest || /\b(?:quels?|quel(?:s)?|donne(?:-moi)?|fournis?|chercher?|recherche?r?|trouve?r?)\b/.test(normalized));
}

const PORNOGRAPHIC_SITE_REFUSAL =
  "Je ne peux pas fournir de liste, de classement, de noms ou de liens vers des sites pornographiques. " +
  "Je peux toutefois aider avec des informations générales sur la sexualité, le consentement, la sécurité en ligne ou la confidentialité.";

const AI_IDENTITY_INSTRUCTIONS =
  "Your name is MaximeGPT, a Discord bot created and developed by Maxime, also known as Maxim3kun. " +
  "If asked who created or developed you, name Maxime (Maxim3kun). Never claim OpenAI created or developed this Discord bot; an AI model provider is not the bot's creator. " +
  "Describe only capabilities supported by the application: conversational AI, web search when routed for current information, quizzes and mini-games, quests, voice features, radio and YouTube audio, and optional Suno music generation. " +
  "Server admins can configure settings such as prefix, language, welcome messages, and scheduled messages. Do not claim you can assign roles, ban, kick, or mute members on request. " +
  "Some features require permissions or configuration. Never invent commands or features; if unsure, direct users to the server's help command using its configured prefix. ";

const WEB_RESEARCH_ANSWER_INSTRUCTIONS =
  "When web research is provided, answer the user's actual goal rather than summarizing the search results. Answer in the user's language and start with the answer, not a heading or preamble. " +
  "Be concise by default, but adapt the length naturally to the question; do not follow an arbitrary word count. For latest-news requests, report only the most relevant, specific stories, usually 1 to 3 short items, and never pad the answer to reach a fixed count. " +
  "Do not use Markdown tables, pipe characters, or HTML line breaks. Use plain paragraphs or at most 3 brief bullets. Do not list search engines or repeat source names; the source button provides the links. " +
  "For news, every item must be a specific event supported by an article page. Never present a newspaper, publisher, search engine, homepage, or general news section (for example, 20 Minutes or Google News) as a news story. Skip generic landing pages and vague summaries. If no specific current story can be verified, say so instead of filling the answer. " +
  "Never call a story 'today's' or 'latest' based only on its search position; use publication dates only when the supplied source metadata confirms them. If dates are missing, avoid date claims. " +
  "For ambiguous names, do not default to the most famous meaning. Briefly distinguish meanings supported by the results, including an app or product when found, and ask one short clarification if the intended meaning is still unclear. " +
  "For practical requests such as recipes, tutorials, recommendations, or how-to questions, choose the clearest and most reliable answer from the evidence and give it directly in a useful format: " +
  "a short recommendation, the necessary ingredients or materials, numbered steps, and useful tips or cautions. " +
  "Do not start with a list of websites, do not repeat search snippets, and do not mention site names unless the user asks for sources. " +
  "If several sources agree, combine their useful details instead of presenting them separately; if they conflict, explain the relevant difference briefly. " +
  "For a cooking request, prioritize a concrete recipe with quantities, cooking time, and serving guidance over a discussion of recipes found online. " +
  "Never use the non-French word 'adultique'; in French, say 'pornographique' or 'contenu pour adultes'. " +
  "For requests to find, list, rank, or recommend pornographic websites, do not search, name, link, or rank any site; give a brief refusal instead. ";

function buildAiSystemPrompt(
  userText: string,
  routeIntent: string,
  webContext: string,
  memoryContext = "",
  timeContext = "",
  language: "en" | "fr" | "es" | "de" | "pt" | "it" | "ja" | "nl" | "ru" | "pl" | "tr" = "en",
  prefix = "!",
): string {
  const languageGuard = buildLanguageGuardPrompt(language);
  const research = webContext
    ? `\n\n${WEB_RESEARCH_ANSWER_INSTRUCTIONS}\nWeb research results:\n${webContext}`
    : "";
  const time = timeContext
    ? `\n\nDeterministic time result for this request (use it and do not recalculate it):\n${timeContext}`
    : "";

  return `${AI_IDENTITY_INSTRUCTIONS}${languageGuard}
${FACTUAL_ACCURACY_GUIDANCE}
${buildBotCommandContext(userText, language, prefix)}
You are a friendly, helpful, and cheerful Discord bot. Keep answers concise and conversational. Warm, calm tone. Emojis sparingly. Prefer plain text or brief bullets; do not use Markdown tables unless the user explicitly asks for one. Respond to every part of the user's current message, including multiple questions joined by "and"/"et". The message route is "${routeIntent}".
Be honest and grounded: never invent facts, actions, memories, sources, or observations. Never claim to have searched the Internet unless search results are explicitly provided. Never claim to have performed a Discord action unless the application confirms it succeeded. If you are unsure, say so clearly instead of guessing. Clearly distinguish facts, assumptions, and opinions. If web research is provided, use only that evidence and mention uncertainty when sources disagree. Do not create citations or links beyond the supplied results. ${memoryContext}${research}${time}`;
}

// Search results are kept briefly so the public AI answer stays compact. The
// user can open them privately with the 🔎 button instead of filling the
// channel with links on every researched answer.
async function replyWithAiAnswer(
  message: Message,
  answer: string,
  webResults: WebSearchResult[],
): Promise<void> {
  const chunks = answer.match(/[\s\S]{1,2000}/g) ?? [answer];
  const sourcesButton = createSearchSourceButton(webResults, message.author.id);
  const firstReply = sourcesButton
    ? { content: chunks[0]!, components: [sourcesButton], flags: ["SuppressEmbeds" as const] }
    : chunks[0]!;

  const replies = [await message.reply(typeof firstReply === "string"
    ? { content: firstReply, allowedMentions: { parse: [] } }
    : { ...firstReply, allowedMentions: { parse: [] } })];
  for (const chunk of chunks.slice(1)) {
    replies.push(await message.reply({ content: chunk, ...(webResults.length ? { flags: ["SuppressEmbeds" as const] } : {}), allowedMentions: { parse: [] } }));
  }
  await trackAiReplies(replies, "bot", message.content);
}

async function replyWithKnownRecipe(
  message: Message,
  userText: string,
  language: ReturnType<typeof getEffectiveLanguage>,
): Promise<boolean> {
  const answer = directPancakeRecipe(userText, language);
  if (!answer) return false;

  const key = conversationKey(message);
  addToHistory(key, "user", currentUserTurn(message, userText));
  addToHistory(key, "assistant", answer);
  await replyWithAiAnswer(message, answer, []);
  return true;
}

async function replyWithLatestNews(
  message: Message,
  prompt: string,
  webResults: WebSearchResult[],
  language: string,
): Promise<boolean> {
  if (!isLatestNewsRequest(prompt)) return false;

  const citedSources = webResults.filter((result) => formatLatestNewsAnswer([result])).slice(0, 3);
  const answer = formatLatestNewsAnswer(citedSources);
  if (!answer) {
    await message.reply(language === "fr"
      ? "Je n’ai pas trouvé d’articles récents, datés et suffisamment précis pour te présenter de vraies actualités. Essaie avec un sujet ou un pays."
      : "I couldn't find recent, dated, specific articles to report as real news. Try asking about a topic or country.");
    return true;
  }

  addToHistory(conversationKey(message), "assistant", answer);
  await replyWithAiAnswer(message, answer, citedSources);
  return true;
}

// ── Bot entry point ───────────────────────────────────────────────────────────

// ── Website viewer helpers ────────────────────────────────────────────────────

const WEBSITE_URL = "https://www.maximegpt.com/";
const WEBSITE_SECTIONS = [
  { label: "Top",    emoji: "🔝", scrollTo: 0    },
];

function buildWebsiteMessage(sectionIndex: number) {
  const section = WEBSITE_SECTIONS[sectionIndex]!;

  const embed = new EmbedBuilder()
    .setTitle(`🌐 MaximeGPT.com ${section.emoji}`)
    .setURL(WEBSITE_URL)
    .setDescription("Ouvrir le site avec le bouton ci-dessous. L’aperçu automatique n’est pas affiché : la protection du site peut présenter une vérification de navigateur au lieu de la page.")
    .setColor(0x5865f2)
    .setFooter({ text: "Made with ❤️ by Maxime • www.maximeGPT.com" });

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setLabel("🌐 Open Site")
      .setStyle(ButtonStyle.Link)
      .setURL(WEBSITE_URL),
  );

  return { embeds: [embed], components: [row] };
}

let _botClient: Client | null = null;
export function getBotClient(): Client | null { return _botClient; }

export function startBot(): void {
  const token = process.env["DISCORD_TOKEN"];
  const token2 = process.env["DISCORD_TOKEN_2"];
  const groqKey = process.env["GROQ_API_KEY"];

  if (!token) {
    logger.warn("DISCORD_TOKEN not set — bot will not start");
    return;
  }

  const openai = groqKey
    ? new OpenAI({
        apiKey: groqKey,
        baseURL: "https://api.groq.com/openai/v1",
        timeout: 45_000,
        maxRetries: 0,
      })
    : null;

  if (!openai) logger.warn("GROQ_API_KEY not set — AI features disabled");

  const answerAiQuestion = async (
    message: Message,
    userText: string,
    responseLang: Parameters<typeof botText>[0],
    prefix: string,
  ): Promise<void> => {
    const prompt = userText.trim();
    const aiResponseLang = getAiResponseLanguage(message.author.id, prompt, responseLang);
    if (!prompt) {
      await message.reply(aiResponseLang === "fr"
        ? `🤖 Pose une question après \`${prefix}ask\` ou \`${prefix}ia\`.`
        : `🤖 Ask a question after \`${prefix}ask\`.`);
      return;
    }

    if (shouldSkipConversation(stripMentions(prompt))) return;
    if (await clarifyMentionedRecipient(message, prompt, aiResponseLang)) return;
    if (isPornographicSiteListRequest(prompt)) {
      await message.reply(PORNOGRAPHIC_SITE_REFUSAL);
      return;
    }
    if (extractNaturalHelpCommand(prompt) === "help") {
      await sendHelpPaginator(message, aiResponseLang);
      return;
    }
    const pokemonQuery = extractPokemonQuery(prompt);
    if (pokemonQuery) {
      await handlePokemon(pokemonQuery, aiResponseLang, (opts) => message.reply(opts as Parameters<typeof message.reply>[0]));
      return;
    }

    if (await handleAiActionRequest(message, prompt, openai, aiResponseLang)) return;
    const route = classifyAiMessage(prompt);
    if (await replyWithKnownRecipe(message, prompt, aiResponseLang)) return;
    if (route.intent === "greeting") {
      await message.reply(directGreeting(message, aiResponseLang));
      return;
    }
    if (route.intent === "identity") {
      await message.reply(directIdentityAnswer(aiResponseLang));
      return;
    }
    if (route.intent === "creator") {
      await message.reply(directCreatorAnswer(aiResponseLang));
      return;
    }
    if (route.intent === "capabilities") {
      await message.reply(directCapabilitiesAnswer(aiResponseLang));
      return;
    }
    if (route.intent === "time" && !isWeatherRequest(prompt)) {
      const explicitPlace = requestedTimePlace(prompt);
      const timezone = explicitPlace ? resolveTimeZone(explicitPlace) : null;
      if (explicitPlace && timezone) await saveAiTimezone(message.author.id, explicitPlace, timezone);
      const savedTime = await getAiTimezone(message.author.id);
      if (!explicitPlace && !savedTime) rememberTimeRequest(message);
      await message.reply(currentTimeAnswer(prompt, savedTime?.place, aiResponseLang));
      return;
    }
    if (route.intent === "discord_action") {
      await message.reply("⚠️ I can't execute that Discord action from a chat request, and I won't claim that I did.");
      return;
    }
    if (!openai) {
      await message.reply(botText(aiResponseLang, "aiDisabled", prefix));
      return;
    }

    try {
      if (await moderateMentionedMessage(message, openai)) return;
      if (isSendable(message.channel)) await message.channel.sendTyping();
      addToHistory(conversationKey(message), "user", currentUserTurn(message, prompt));
      const memoryContext = await getAiPromptContext(message.guildId, message.author.id);
      const explicitPlace = route.intent === "time" ? requestedTimePlace(prompt) : null;
      const timezone = explicitPlace ? resolveTimeZone(explicitPlace) : null;
      if (explicitPlace && timezone) await saveAiTimezone(message.author.id, explicitPlace, timezone);
      const savedTime = route.intent === "time" ? await getAiTimezone(message.author.id) : null;
      const timeContext = route.intent === "time"
          ? currentTimeAnswer(prompt, savedTime?.place, aiResponseLang)
        : "";
      const shouldSearch = isTopListQuery(prompt) || route.needsResearch;
      const searchQuery = shouldSearch
        ? isLatestNewsRequest(prompt) ? prompt : buildMessageResearchQuery(message, prompt)
        : prompt;
      const research = await researchForTurn(message, prompt, getAiHistory(conversationKey(message)), shouldSearch, searchQuery, aiResponseLang);
      const webResults = research.results;
      if (research.immediateReply) {
        addToHistory(conversationKey(message), "assistant", research.immediateReply);
        await message.reply({ content: research.immediateReply, allowedMentions: { parse: [] } });
        return;
      }
      if (!research.correction && await replyWithLatestNews(message, prompt, webResults, aiResponseLang)) {
        rememberConversationTurn(message, prompt, openai);
        return;
      }
      const response = await createReliableCompletion(openai, {
        model: "openai/gpt-oss-120b",
        max_completion_tokens: 2048,
        currentUserText: stripMentions(prompt),
        evidence: webResults, correction: research.correction, responseLanguage: aiResponseLang,
        messages: [
          { role: "system", content: buildAiSystemPrompt(prompt, route.intent, formatSearchContext(webResults), memoryContext, timeContext, aiResponseLang, getPrefix(message.guildId)) },
          { role: "system", content: await buildSpeakerContext(message) },
          { role: "system", content: research.guidance },
          ...getAiHistory(conversationKey(message)),
        ],
      });
      if (response.intentionallySilent) return;
      const verifiedSources = response.reviewedSources ?? webResults;
      const rawReply = response.choices[0]?.message?.content
        ?? (aiResponseLang === "fr" ? "Désolé, je n’ai pas réussi à formuler une réponse." : "Sorry, I couldn't come up with a response! 😅");
      const reply = webResults.length ? normalizeResearchAnswer(rawReply) : rawReply;
      addToHistory(conversationKey(message), "assistant", reply);
      await replyWithAiAnswer(message, reply, verifiedSources);
      rememberConversationTurn(message, prompt, openai, false, reply);
    } catch (err) {
      logger.error({ err }, "Prefixed AI question error");
      await reportModuleFailure(
        message,
        "ai",
        err,
        process.env["GROQ_API_KEY"] ? "groq" : undefined,
      );
      await message.reply(moduleFallbackMessage("ai", aiResponseLang));
    }
  };

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.GuildMessageReactions,
      GatewayIntentBits.DirectMessages,
      GatewayIntentBits.DirectMessageReactions,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildVoiceStates,
      GatewayIntentBits.GuildMembers,
    ],
    partials: [Partials.Channel, Partials.Message, Partials.Reaction],
  });
  _botClient = client;
  registerAiFeedback(client);
  registerAdminUnlockInteractions(client);

  let client2: Client | null = null;
  if (token2) {
    client2 = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });
    client2.once("clientReady", () => logger.info({ tag: client2!.user?.tag }, "Bot 2 connected"));
    client2.login(token2).catch((err) => logger.error({ err }, "Failed to connect bot 2"));
  } else {
    logger.warn("DISCORD_TOKEN_2 not set — !ai battle disabled");
  }

  client.once("clientReady", () => {
    logger.info({ tag: client.user?.tag, id: client.user?.id }, "Discord bot connected");
    client.user?.setActivity("!help · !music · !join", { type: ActivityType.Listening });

    // Update bot presence when a song starts/stops in any guild
    setActivityCallback((title) => {
      if (title) {
        client.user?.setActivity(title, { type: ActivityType.Listening });
      } else {
        client.user?.setActivity("!help · !music · !join", { type: ActivityType.Listening });
      }
    });

    // Set voice channel status (the text shown under the channel name in the sidebar)
    setChannelNameCallback((guildId, title) => {
      try {
        const guild = client.guilds.cache.get(guildId);
        if (!guild) return;
        const channelId = guild.members.me?.voice.channelId;
        if (!channelId) return;
        const status = title ? `🎵 ${title}` : "";
        client.rest.put(`/channels/${channelId}/voice-status`, { body: { status } }).catch(() => null);
      } catch {
        // Missing permissions or rate limit — ignore silently
      }
    });

  });

  registerVoiceStateEvents(client);

  // ── Autocomplete handler ─────────────────────────────────────────────────────
  // Lazy play-dl loader (separate instance from radio's, used only for autocomplete)
  let _acPlay: typeof import("play-dl") | null = null;
  const getAcPlay = async (): Promise<typeof import("play-dl")> => {
    if (!_acPlay) _acPlay = await import("play-dl") as typeof import("play-dl");
    return _acPlay;
  };

  client.on("interactionCreate", async (interaction) => {
    if (!interaction.isAutocomplete()) return;
    if (interaction.commandName !== "youtube") return;

    const focused = interaction.options.getFocused(true);
    try {
      if (focused.name === "artist") {
        const query = focused.value.trim();
        if (!query) { await interaction.respond([]); return; }

        // 1. Pull from local artist cache
        const cached = getMatchingArtists(query, 15).map(a => ({ name: a, value: a }));
        if (cached.length >= 20) { await interaction.respond(cached.slice(0, 25)); return; }

        // 2. Supplement with YouTube channel names via play-dl
        try {
          const play = await getAcPlay();
          const results = await Promise.race([
            play.search(query, { source: { youtube: "video" }, limit: 10 }),
            new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), 2400)),
          ]);
          const channels = [
            ...new Set(
              (results as any[])
                .map((r: any) => (r.channel?.name as string | undefined)?.replace(/\s*-?\s*(Topic|VEVO|Official.*$)/i, "").trim())
                .filter((n): n is string => !!n && n.toLowerCase().includes(query.toLowerCase())),
            ),
          ].map(n => n.replace(/\b\w/g, c => c.toUpperCase()));

          const all = [...cached];
          for (const ch of channels) {
            if (!all.find(a => a.value.toLowerCase() === ch.toLowerCase())) all.push({ name: ch, value: ch });
          }
          await interaction.respond(all.slice(0, 25));
        } catch {
          await interaction.respond(cached.slice(0, 25));
        }
        return;
      }

      if (focused.name === "song") {
        const artist = interaction.options.getString("artist") ?? "";
        const partial = focused.value.trim();
        const searchQ = [artist, partial].filter(Boolean).join(" ");
        if (!searchQ) { await interaction.respond([]); return; }
        try {
          const play = await getAcPlay();
          const results = await Promise.race([
            play.search(searchQ, { source: { youtube: "video" }, limit: 8 }),
            new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), 2400)),
          ]);
          const choices = (results as any[])
            .filter((r: any) => r?.url && r?.title)
            .map((r: any) => ({ name: (r.title as string).slice(0, 100), value: r.url as string }))
            .slice(0, 25);
          await interaction.respond(choices);
        } catch {
          await interaction.respond([]);
        }
        return;
      }

      await interaction.respond([]);
    } catch {
      await interaction.respond([]).catch(() => null);
    }
  });

  // ── Slash command handler ─────────────────────────────────────────────────────

  client.on("interactionCreate", async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    const commandModule = moduleForMessageCommand(interaction.commandName);
    const failureBefore = getModuleLastFailureAt(commandModule);

    try {
      await interaction.deferReply();
      const responseLang = getEffectiveLanguage(interaction.guildId, interaction.user.id);

      // Fetch full GuildMember for voice-state access
      const member = interaction.member instanceof GuildMember
        ? interaction.member
        : interaction.guild
          ? await interaction.guild.members.fetch(interaction.user.id).catch(() => null)
          : null;

      const fakeMsg = createSlashMessageAdapter(interaction, member);

      switch (interaction.commandName) {
        case "poll":
          await handlePollCommand(fakeMsg, [
            interaction.options.getString("question", true), "|", interaction.options.getString("choices", true),
          ], responseLang);
          break;

        case "help": {
          const lang = (interaction.options.getString("lang") ?? responseLang) as HelpLanguage;
          await sendHelpPaginator(interaction, lang);
          break;
        }

        case "radio": {
          const station = interaction.options.getString("station")?.toLowerCase();
          if (!station) {
            await interaction.editReply({ embeds: [buildRadioListEmbed(1)] });
          } else {
            await playRadio(fakeMsg, station);
          }
          break;
        }

        case "karaoke": {
          if (!interaction.guildId) { await interaction.editReply("❌ This command only works in a server."); break; }
          const query = interaction.options.getString("song", true);
          await startKaraoke(fakeMsg, query);
          break;
        }

        case "music": {
          const prompt = interaction.options.getString("prompt", true);
          if (!process.env["SUNO_API_KEY"]) { await interaction.editReply("❌ Music generation is not configured. Ask a moderator to set it up — use `!mode d'emploi` for instructions."); break; }

          const startEmbed = new EmbedBuilder()
            .setColor(0x5865f2)
            .setTitle("🎵 Generating your track…")
            .setDescription(`**Prompt:** ${prompt}`)
            .setFooter({ text: "Suno is generating your track, around 30-60 seconds ⏳" });
          await interaction.editReply({ embeds: [startEmbed] });

          let taskId: string;
          try {
            taskId = await generateSong({ prompt });
            } catch (err) {
              await reportModuleFailure(interaction, "music", err, "suno");
            logger.error({ err }, "Suno /music error");
            await interaction.editReply({ embeds: [new EmbedBuilder().setColor(0xed4245).setTitle("❌ Error").setDescription(`Failed to start: ${String(err)}`)] });
            break;
          }

          const SL_POLL_INTERVAL = 8000;
          const SL_POLL_MAX = 15;
          let generationFinished = false;
          let lastPollError: unknown = null;
          for (let attempt = 1; attempt <= SL_POLL_MAX; attempt++) {
            await new Promise((r) => setTimeout(r, SL_POLL_INTERVAL));
            let result;
            try {
              result = await pollSong(taskId);
              lastPollError = null;
              recordModuleSuccess("music", "suno");
            } catch (err) {
              lastPollError = err;
              await reportModuleFailure(interaction, "music", err, "suno");
              logger.warn({ err, attempt }, "Suno poll retry");
              continue;
            }
            const st = result.status.toUpperCase();
            if (st === "ERROR" || st === "FAILED" || st === "FAILURE") {
              await reportModuleFailure(interaction, "music", new Error(`Suno generation status: ${st}`), "suno");
              await interaction.editReply({ embeds: [new EmbedBuilder().setColor(0xed4245).setTitle("❌ Generation Failed").setDescription("Suno returned an error. Try a different prompt.")] });
              generationFinished = true;
              break;
            }
            if (result.done && result.clips.length > 0) {
              const embeds = result.clips.filter((c) => c.audio_url).map((clip) => {
                const e = new EmbedBuilder()
                  .setColor(0x57f287)
                  .setTitle(`🎶 ${clip.title ?? "Generated Track"}`)
                  .setDescription(`**Prompt:** ${clip.prompt ?? prompt}`)
                  .addFields({ name: "🎵 Listen", value: clip.audio_url! })
                  .setFooter({ text: `Task ID: ${taskId}` });
                if (clip.image_url) e.setThumbnail(clip.image_url);
                if (clip.duration) e.addFields({ name: "⏱ Duration", value: `${Math.round(clip.duration)}s`, inline: true });
                if (clip.tags) e.addFields({ name: "🎸 Style", value: clip.tags.slice(0, 100), inline: true });
                return e;
              });
              if (embeds.length > 0) {
                await interaction.editReply({ embeds });
                generationFinished = true;
                break;
              }
            }
            await interaction.editReply({ embeds: [new EmbedBuilder().setColor(0xfee75c).setTitle("🎵 Generating…").setDescription(`**Prompt:** ${prompt}`).addFields({ name: "Status", value: result.status, inline: true }, { name: "Attempt", value: `${attempt}/${SL_POLL_MAX}`, inline: true }).setFooter({ text: "Suno is working on it ⏳" })] });
          }
          if (!generationFinished) {
            await reportModuleFailure(
              interaction,
              "music",
              lastPollError ?? new Error("Suno generation timed out"),
              "suno",
            );
            await interaction.editReply({
              embeds: [
                new EmbedBuilder()
                  .setColor(0xed4245)
                  .setTitle("❌ Generation timed out")
                  .setDescription("Suno did not finish the track in time. Try again later."),
              ],
            });
          }
          break;
        }

        case "image": {
          const desc = interaction.options.getString("description", true);
          const imageLanguage = getAiResponseLanguage(
            interaction.user.id,
            desc,
            getEffectiveLanguage(interaction.guildId, interaction.user.id),
          );
          await sendGeneratedImage(fakeMsg, desc, imageLanguage);
          break;
        }

        case "quest": {
          const action = interaction.options.getString("action") ?? "start";
          if      (action === "list")    await showQuestList(fakeMsg);
          else if (action === "profile") await showQuestProfile(fakeMsg);
          else if (action === "stats")   await showQuestStats(fakeMsg);
          else if (action === "reset")   await resetQuests(fakeMsg);
          else                           await startQuestSetup(fakeMsg, openai);
          break;
        }

        case "shazam": {
          await shazam(fakeMsg);
          break;
        }

        case "define": {
          const word = interaction.options.getString("word", true);
          await handleDefine(word, interaction.locale, (opts) => interaction.editReply(opts as Parameters<typeof interaction.editReply>[0]));
          break;
        }

        case "qr": {
          const text = interaction.options.getString("text");
          const image = interaction.options.getAttachment("image");
          if (image) {
            if (!image.contentType?.startsWith("image/")) {
              await interaction.editReply("❌ Please attach a valid image file.");
              break;
            }
            try {
              const jsQRMod = await import("jsqr");
              const jsQR = (jsQRMod as unknown as { default: typeof import("jsqr").default }).default ?? jsQRMod;
              const sharpMod = (await import("sharp")).default;
              const res = await fetch(image.url);
              const buf = Buffer.from(await res.arrayBuffer());
              const { data, info } = await sharpMod(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
              const code = (jsQR as (d: Uint8ClampedArray, w: number, h: number) => { data: string } | null)(
                new Uint8ClampedArray(data), info.width, info.height,
              );
              if (!code) {
                const loc = interaction.locale;
                await interaction.editReply(loc.startsWith("fr") ? "❌ Aucun QR code trouvé dans l'image." : loc.startsWith("es") ? "❌ No se encontró ningún código QR." : "❌ No QR code found in the image.");
              } else {
                const embed = new EmbedBuilder().setColor(0x57f287).setTitle("✅ QR Code detected")
                  .addFields({ name: "Content", value: `\`\`\`${code.data.slice(0, 1000)}\`\`\`` });
                await interaction.editReply({ embeds: [embed] });
              }
            } catch (err) {
              logger.error({ err }, "QR read slash error");
              await interaction.editReply("❌ Could not read the image.");
            }
          } else if (text) {
            await handleQrCreate(text, interaction.locale, (opts) => interaction.editReply(opts as Parameters<typeof interaction.editReply>[0]));
          } else {
            const loc = interaction.locale;
            await interaction.editReply(loc.startsWith("fr")
              ? "📷 Fournis un **texte** à encoder OU joins une **image** à lire."
              : loc.startsWith("es")
                ? "📷 Proporciona un **texto** OU adjunta una **imagen** para leer."
                : "📷 Provide **text** to encode OR attach an **image** to read.");
          }
          break;
        }

        case "echo": {
          if (!interaction.guildId) { await interaction.editReply("❌ Server only."); break; }
          const result = toggleEcho(interaction.guildId, interaction.channelId);
          await interaction.deleteReply().catch(() => null);
          await interaction.followUp({ content: result, ephemeral: true });
          break;
        }

        case "pokemon": {
          const pokeName = interaction.options.getString("name", true);
          await handlePokemon(pokeName, responseLang, (opts) => interaction.editReply(opts as Parameters<typeof interaction.editReply>[0]));
          break;
        }

        case "welcome": {
          if (!interaction.guildId) { await interaction.editReply("❌ Server only."); break; }
          const memberObj = interaction.member instanceof GuildMember ? interaction.member : null;
          const isAdminUser = memberObj?.permissions.has(PermissionFlagsBits.Administrator) || memberObj?.permissions.has(PermissionFlagsBits.ManageGuild);
          if (!isAdminUser) {
            const loc = interaction.locale;
            await interaction.editReply(loc.startsWith("fr") ? "❌ Réservé aux admins." : loc.startsWith("es") ? "❌ Solo administradores." : "❌ Admin only.");
            break;
          }
          const wSub = interaction.options.getSubcommand();
          const wGuildId = interaction.guildId;
          const wLocale = interaction.locale;
          if (wSub === "set") {
            const ch = interaction.options.getChannel("channel", true);
            const { handleWelcomeSlashSet } = await import("./discord/welcome.js");
            await handleWelcomeSlashSet(wGuildId, ch.id, wLocale, (o) => interaction.editReply(o as Parameters<typeof interaction.editReply>[0]));
          } else if (wSub === "message") {
            const txt = interaction.options.getString("text", true);
            const { handleWelcomeSlashMsg } = await import("./discord/welcome.js");
            await handleWelcomeSlashMsg(wGuildId, txt, wLocale, (o) => interaction.editReply(o as Parameters<typeof interaction.editReply>[0]));
          } else if (wSub === "clear") {
            const { handleWelcomeSlashClear } = await import("./discord/welcome.js");
            await handleWelcomeSlashClear(wGuildId, wLocale, (o) => interaction.editReply(o as Parameters<typeof interaction.editReply>[0]));
          } else if (wSub === "status") {
            const { handleWelcomeSlashStatus } = await import("./discord/welcome.js");
            await handleWelcomeSlashStatus(wGuildId, wLocale, (o) => interaction.editReply(o as Parameters<typeof interaction.editReply>[0]));
          }
          break;
        }

        case "schedule": {
          if (!interaction.guildId) { await interaction.editReply("❌ Server only."); break; }
          const schSub = interaction.options.getSubcommand();
          const schGuildId = interaction.guildId;
          const schLocale = interaction.locale;
          const memberObj2 = interaction.member instanceof GuildMember ? interaction.member : null;
          const isSchAdmin = memberObj2?.permissions.has(PermissionFlagsBits.Administrator) || memberObj2?.permissions.has(PermissionFlagsBits.ManageGuild);
          const { handleScheduleSlash } = await import("./discord/schedule.js");
          await handleScheduleSlash(schSub, schGuildId, interaction, isSchAdmin ?? false, schLocale, (o) => interaction.editReply(o as Parameters<typeof interaction.editReply>[0]));
          break;
        }

        case "youtube": {
          if (!interaction.guildId) { await interaction.editReply("❌ This command only works in a server."); break; }
          const artist  = interaction.options.getString("artist", true);
          const songVal = interaction.options.getString("song", true);
          // songVal is a YouTube URL when the user picked from autocomplete, or free text otherwise
          if (songVal.startsWith("http://") || songVal.startsWith("https://")) {
            await playYoutube(fakeMsg, songVal);
          } else {
            await searchAndQueue(fakeMsg, `${artist} ${songVal}`.trim());
          }
          break;
        }

        case "play": {
          if (!interaction.guildId) { await interaction.editReply("❌ This command only works in a server."); break; }
          const q = interaction.options.getString("query", true);
          if (q.startsWith("http://") || q.startsWith("https://")) {
            await playYoutube(fakeMsg, q);
          } else {
            await searchAndQueue(fakeMsg, q);
          }
          break;
        }

        case "say": {
          const text = interaction.options.getString("text", true);
          if (interaction.channel && "send" in interaction.channel) {
            await (interaction.channel as import("discord.js").TextChannel).send(text);
            await interaction.deleteReply().catch(() => null);
          } else {
            await interaction.editReply(text);
          }
          break;
        }

        case "np": {
          if (!interaction.guildId) { await interaction.editReply("❌ This command only works in a server."); break; }
          const npEmbed = nowPlaying(interaction.guildId);
          if (!npEmbed) { await interaction.editReply("❌ Nothing is playing right now."); break; }
          await interaction.editReply({ embeds: [npEmbed] });
          break;
        }

        case "skip": {
          if (!interaction.guildId) { await interaction.editReply("❌ This command only works in a server."); break; }
          const skipped = skipCurrentTrack(interaction.guildId);
          if (!skipped) { await interaction.editReply("❌ Nothing is playing right now."); break; }
          await interaction.editReply(`⏭️ Skipped **${skipped}**.`);
          break;
        }

        case "stop": {
          if (!interaction.guildId) { await interaction.editReply("❌ This command only works in a server."); break; }
          const stopped = stopForGuild(interaction.guildId);
          if (!stopped) { await interaction.editReply("❌ Nothing is playing right now."); break; }
          await interaction.editReply("⏹️ Stopped and disconnected.");
          break;
        }

        case "join": {
          await joinVoice(fakeMsg);
          break;
        }

        case "leave": {
          if (!interaction.guildId) { await interaction.editReply("❌ This command only works in a server."); break; }
          await leaveVoice(fakeMsg);
          break;
        }

        case "queue": {
          if (!interaction.guildId) { await interaction.editReply("❌ This command only works in a server."); break; }
          const qEmbed = getQueueEmbed(interaction.guildId);
          if (!qEmbed) { await interaction.editReply("📭 The queue is empty."); break; }
          await interaction.editReply({ embeds: [qEmbed] });
          break;
        }

        case "joke": {
          const jokeLangArg = interaction.options.getString("lang");
          const jokeLang = jokeLangArg ? parseLanguage(jokeLangArg) : responseLang;
          const jokeList = jokeLang === "fr" ? JOKES_FR : jokeLang === "es" ? JOKES_ES : jokeLang === "de" ? JOKES_DE : jokeLang === "pt" ? JOKES_PT : jokeLang === "it" ? JOKES_IT : jokeLang === "ja" ? JOKES_JA : jokeLang === "nl" ? JOKES_NL : jokeLang === "ru" ? JOKES_RU : jokeLang === "pl" ? JOKES_PL : jokeLang === "tr" ? JOKES_TR : JOKES;
          await interaction.editReply(getRandom(jokeList));
          break;
        }

        case "roll": {
          const faces = interaction.options.getInteger("faces") ?? 6;
          const rollResult = Math.floor(Math.random() * faces) + 1;
          await interaction.editReply(botText(responseLang, "diceResult", String(faces), String(rollResult)));
          break;
        }

        case "8ball": {
          const question = interaction.options.getString("question", true);
          const answers = responseLang === "fr" ? EIGHT_BALL_RESPONSES_FR : responseLang === "es" ? EIGHT_BALL_RESPONSES_ES : responseLang === "de" ? EIGHT_BALL_RESPONSES_DE : responseLang === "pt" ? EIGHT_BALL_RESPONSES_PT : responseLang === "it" ? EIGHT_BALL_RESPONSES_IT : responseLang === "ja" ? EIGHT_BALL_RESPONSES_JA : responseLang === "nl" ? EIGHT_BALL_RESPONSES_NL : responseLang === "ru" ? EIGHT_BALL_RESPONSES_RU : responseLang === "pl" ? EIGHT_BALL_RESPONSES_PL : responseLang === "tr" ? EIGHT_BALL_RESPONSES_TR : EIGHT_BALL_RESPONSES;
          await interaction.editReply(`${botText(responseLang, "eightBallQuestion", question)}\n${botText(responseLang, "eightBallAnswer", getRandom(answers))}`);
          break;
        }

        case "trivia": {
          if (!openai) { await interaction.editReply("❌ AI features are not configured. Ask a moderator to set it up — use `!mode d'emploi` for instructions."); break; }
          await interaction.editReply("🧠 Trivia is starting — watch this channel for your question!");
          playTrivia(fakeMsg, openai).catch((err) => logger.error({ err }, "/trivia error"));
          break;
        }

        case "shellgame": {
          if (!interaction.guildId) { await interaction.editReply("❌ Shell Game only works in a server."); break; }
          const sgAction = interaction.options.getString("action") ?? "play";
          if (sgAction === "stats") {
            await showShellGameStats(interaction);
          } else {
            await startShellGame(interaction);
          }
          break;
        }
      }
      if (getModuleLastFailureAt(commandModule) === failureBefore) {
        recordModuleSuccess(commandModule, moduleDependencyForCommand(interaction.commandName, []));
      }
    } catch (err) {
      const failedModule = moduleForMessageCommand(interaction.commandName);
      await reportModuleFailure(
        interaction,
        failedModule,
        err,
        moduleDependencyForCommand(interaction.commandName, []),
      );
      logger.error({ err, command: interaction.commandName }, "Slash command error");
      await replyToSlash(interaction, moduleFallbackMessage(
        failedModule, getEffectiveLanguage(interaction.guildId, interaction.user.id), `/${interaction.commandName}`,
      )).catch(() => null);
    }
  });

  // ── Button interaction handler ───────────────────────────────────────────────

  client.on("interactionCreate", async (interaction) => {
    if (!interaction.isButton()) return;

    if (interaction.customId.startsWith("ai_action:")) {
      // Old confirmation buttons must not replay obsolete requests.
      await interaction.reply({
        content: "Ces anciennes confirmations ne sont plus utilisées. Relance simplement ta demande. / These old confirmations are no longer used. Just send your request again.",
        ephemeral: true,
      }).catch(() => null);
      return;
    }

    // ── AI research sources ────────────────────────────────────────────────
    if (interaction.customId.startsWith("ai_sources:")) {
      const key = interaction.customId.slice("ai_sources:".length);
      const entry = getSearchSources(key);
      if (!entry) {
        await interaction.reply({
          content: "⏳ Ces sources ne sont plus disponibles. Relance la question pour effectuer une nouvelle recherche.",
          ephemeral: true,
        });
        return;
      }
      if (interaction.user.id !== entry.userId) {
        await interaction.reply({
          content: "🔒 Seule la personne qui a posé la question peut voir ces sources.",
          ephemeral: true,
        });
        return;
      }
      await interaction.reply({
        content: formatSearchSources(entry.results),
        ephemeral: true,
        flags: ["SuppressEmbeds"],
      });
      return;
    }

    // ── DJ Console buttons ───────────────────────────────────────────────────
    if (interaction.customId.startsWith("dj:")) {
      try {
        await handleDjButton(interaction);
      } catch (err) {
        logger.error({ err }, "dj button error");
        await interaction.reply({ content: "❌ Something went wrong.", ephemeral: true }).catch(() => null);
      }
      return;
    }

    // ── Soundboard buttons ───────────────────────────────────────────────────
    if (interaction.customId.startsWith("sb:")) {
      try {
        await handleSoundboardButton(interaction);
      } catch (err) {
        logger.error({ err }, "soundboard button error");
        await interaction.reply({ content: "❌ Something went wrong.", ephemeral: true }).catch(() => null);
      }
      return;
    }

    // ── AI consent buttons ───────────────────────────────────────────────────
    if (interaction.customId.startsWith("ai_consent:")) {
      try { await handleConsentButton(interaction); } catch (err) { logger.error({ err }, "ai_consent button error"); }
      return;
    }

    if (interaction.customId.startsWith("ai_memory_consent:")) {
      try { await handleMemoryConsentButton(interaction); } catch (err) { logger.error({ err }, "ai_memory_consent button error"); }
      return;
    }

    // ── Tier list buttons ────────────────────────────────────────────────────
    if (interaction.customId.startsWith("tl:")) {
      try { await handleTierlistButton(interaction); } catch (err) {
        logger.error({ err }, "tierlist button error");
        await interaction.reply({ content: "❌ Something went wrong.", ephemeral: true }).catch(() => null);
      }
      return;
    }

    // ── Blind test buttons ───────────────────────────────────────────────────
    if (interaction.customId.startsWith("bt:")) {
      try { await handleBlindtestButton(interaction); } catch (err) {
        logger.error({ err }, "blindtest button error");
        await interaction.reply({ content: "❌ Something went wrong.", ephemeral: true }).catch(() => null);
      }
      return;
    }

    // ── Million Game buttons ─────────────────────────────────────────────────
    if (interaction.customId.startsWith("mg:")) {
      try { await handleMgButton(interaction); } catch (err) {
        logger.error({ err }, "milliongame button error");
        await interaction.reply({ content: "❌ Something went wrong.", ephemeral: true }).catch(() => null);
      }
      return;
    }

    // ── Shell Game buttons ────────────────────────────────────────────────────
    if (interaction.customId.startsWith("sg:")) {
      try { await handleShellGameButton(interaction); } catch (err) {
        logger.error({ err }, "shellgame button error");
        await interaction.reply({ content: "❌ Something went wrong.", ephemeral: true }).catch(() => null);
      }
      return;
    }

    // ── Now Playing buttons ─────────────────────────────────────────────────
    if (interaction.customId.startsWith("np:")) {
      const action = interaction.customId.split(":")[1];
      const guildId = interaction.guildId;
      if (!guildId) { await interaction.reply({ content: "❌ Guild not found.", ephemeral: true }); return; }

      try {
        if (action === "pause" || action === "resume") {
          const result = pauseToggle(guildId);
          if (result === "not_playing") {
            await interaction.reply({ content: "❌ Nothing is playing right now.", ephemeral: true });
            return;
          }
          const currentEmbed = interaction.message.embeds[0];
          const updatedEmbed = currentEmbed ? EmbedBuilder.from(currentEmbed) : new EmbedBuilder();
          const isRadioPause = !!(radioStates.get(guildId)?.stationKey);
          await interaction.update({ embeds: [updatedEmbed], components: isRadioPause ? buildRadioNpButtonRows(result === "paused") : buildNpButtonRows(result === "paused") });
          return;
        }

        if (action === "skip") {
          const skipState = radioStates.get(guildId);
          if (skipState?.stationKey) {
            const nextKey = nextRadioStation(guildId);
            if (!nextKey) { await interaction.reply({ content: "❌ No next station found.", ephemeral: true }); return; }
            await interaction.deferUpdate();
            await execSwitchRadioStation(guildId, nextKey, interaction.message as Message);
            return;
          }
          const skipped = skipCurrentTrack(guildId);
          if (!skipped) {
            await interaction.reply({ content: "❌ Nothing is currently playing.", ephemeral: true });
            return;
          }
          await interaction.reply({ content: `⏭️ Skipped **${skipped}**.`, ephemeral: true });
          return;
        }

        if (action === "like") {
          const state = radioStates.get(guildId);
          const isRadio = !!(state?.stationKey);
          const title = isRadio ? (RADIO_STATIONS[state!.stationKey!]?.name ?? state!.stationKey!) : state?.youtubeTitle;
          const url = isRadio ? `radio:${state!.stationKey}` : state?.youtubeUrl;
          if (!title || !url) {
            await interaction.reply({ content: "❌ Nothing is currently playing.", ephemeral: true });
            return;
          }
          if (isLiked(interaction.user.id, url)) {
            await removeLike(interaction.user.id, url);
            await interaction.reply({ content: `💔 Removed **${title}** from your likes.`, ephemeral: true });
          } else {
            await addLike(interaction.user.id, { title, url });
            await interaction.reply({ content: `❤️ Added **${title}** to your likes!\nUse \`!likes\` to see your list.`, ephemeral: true });
          }
          return;
        }

        if (action === "dislike") {
          const state = radioStates.get(guildId);
          const isRadio = !!(state?.stationKey);
          if (isRadio) {
            const stationUrl = `radio:${state!.stationKey}`;
            if (isLiked(interaction.user.id, stationUrl)) await removeLike(interaction.user.id, stationUrl);
            const nextKey = nextRadioStation(guildId);
            if (!nextKey) { await interaction.reply({ content: "👎 Disliked.", ephemeral: true }); return; }
            await interaction.deferUpdate();
            await execSwitchRadioStation(guildId, nextKey, interaction.message as Message);
          } else {
            const title = state?.youtubeTitle;
            const url = state?.youtubeUrl;
            if (!title || !url) { await interaction.reply({ content: "❌ Nothing is currently playing.", ephemeral: true }); return; }
            if (isLiked(interaction.user.id, url)) await removeLike(interaction.user.id, url);
            await interaction.reply({ content: `👎 Disliked **${title}**.`, ephemeral: true });
          }
          return;
        }

        if (action === "stop") {
          const stopped = stopForGuild(guildId);
          if (!stopped) {
            await interaction.reply({ content: "❌ Nothing is playing.", ephemeral: true });
            return;
          }
          await interaction.reply({ content: "⏹️ Stopped and disconnected.", ephemeral: true });
          return;
        }

        if (action === "queue") {
          const embed = getQueueEmbed(guildId);
          if (!embed) {
            await interaction.reply({ content: "📭 La queue est vide.", ephemeral: true });
            return;
          }
          await interaction.reply({ embeds: [embed], ephemeral: true });
          return;
        }
      } catch (err) {
        logger.error({ err }, "np button error");
        await interaction.reply({ content: "❌ Something went wrong.", ephemeral: true }).catch(() => null);
      }
      return;
    }

    // ── Guess The Logo — Play Again buttons ──────────────────────────────────
    if (interaction.customId.startsWith("logo_again_")) {
      const diff = interaction.customId.replace("logo_again_", "") as "easy" | "medium" | "hard";
      if (!["easy", "medium", "hard"].includes(diff)) return;
      if (!interaction.channel) {
        await interaction.reply({ content: "❌ Channel not found.", ephemeral: true });
        return;
      }
      await interaction.reply({ content: `🔄 New **${diff === "easy" ? "🟢 Easy" : diff === "medium" ? "🟡 Medium" : "🔴 Hard"}** game started!`, ephemeral: true });
      startLogoGameFromButton(interaction.channel, interaction.channelId, diff).catch((err) =>
        logger.error({ err }, "logo_again button error")
      );
      return;
    }

    // ── Search result picker buttons ─────────────────────────────────────────
    if (interaction.customId.startsWith("yt:")) {
      const parts = interaction.customId.split(":");
      const subtype = parts[1] ?? "";

      // Navigation: yt:nav:prev:msgId / yt:nav:next:msgId
      if (subtype === "nav") {
        const dir = (parts[2] ?? "next") as "prev" | "next";
        const msgId = parts[3] ?? "";
        await interaction.deferUpdate();
        await navigateSearch(msgId, dir);
        return;
      }

      // Pick: yt:pick:N:msgId (new) or yt:N:msgId (old/compat)
      const localIdx = subtype === "pick" ? parseInt(parts[2] ?? "0", 10) : parseInt(subtype, 10);
      const msgId = subtype === "pick" ? (parts[3] ?? "") : (parts[2] ?? "");

      const pending = consumePendingSearch(msgId, localIdx);
      if (!pending) {
        await interaction.reply({ content: "❌ Search expired. Use `!y` again.", ephemeral: true });
        return;
      }

      // Check voice channel from interaction (most up-to-date, handles bot leaving/rejoining)
      const pickMember = interaction.member instanceof GuildMember
        ? interaction.member
        : interaction.guild
          ? await interaction.guild.members.fetch(interaction.user.id).catch(() => null)
          : null;
      const pickVoiceChannel = (pickMember as GuildMember | null)?.voice?.channel;
      if (!pickVoiceChannel) {
        await interaction.reply({ content: "❌ Join a voice channel first, then use `!y` again.", ephemeral: true });
        return;
      }

      await interaction.update({ content: `▶️ Playing **${pending.pick.title}**`, embeds: [], components: [] });
      try {
        await playYoutube(pending.message, pending.pick.url, { title: pending.pick.title, duration: pending.pick.duration, thumbnail: pending.pick.thumbnail });
        // Artist cache learning: if query was 2 words and title is "Artist - Song", save the artist
        const queryWords = pending.originalQuery.trim().split(/\s+/).filter(w => w.length > 1);
        if (queryWords.length === 2) {
          const titleLower = pending.pick.title.toLowerCase();
          const dashIdx = titleLower.indexOf(" - ");
          if (dashIdx !== -1) {
            const artistPart = titleLower.slice(0, dashIdx);
            const word1 = (queryWords[0] ?? "").toLowerCase();
            if (artistPart.includes(word1)) {
              saveArtist(queryWords[0]!).catch(() => null);
            }
          }
        }
      } catch (err) {
        logger.error({ err }, "yt:pick play error");
        await interaction.followUp({ content: "❌ Failed to play. Try `!y` again.", ephemeral: true }).catch(() => null);
      }
      return;
    }

    if (!interaction.customId.startsWith("voice_ready")) return;

    try {
      const member = interaction.member instanceof GuildMember
        ? interaction.member
        : interaction.guild
          ? await interaction.guild.members.fetch(interaction.user.id).catch(() => null)
          : null;

      const voiceChannel = (member as GuildMember | null)?.voice?.channel;
      if (!voiceChannel) {
        await interaction.reply({ content: "❌ Join a voice channel first, then click **✅ I'm ready!**", ephemeral: true });
        return;
      }

      // Extract pending command key from customId: "voice_ready:<key>:<idx>"
      const parts = interaction.customId.split(":");
      const pendingKey = parts[1]; // undefined for legacy "voice_ready" format

      if (pendingKey && !pendingKey.startsWith("noop_")) {
        const fn = consumePendingVoiceCmd(pendingKey, interaction.user.id);
        if (fn) {
          await interaction.reply({ content: `✅ Got it! You're in **${voiceChannel.name}** — running your command now…`, ephemeral: true });
          await fn().catch(err => logger.error({ err }, "voice_ready auto-retry error"));
          return;
        }
      }

      await interaction.reply({ content: `✅ You're in **${voiceChannel.name}** — now retry your command!`, ephemeral: true });
    } catch (err) {
      logger.error({ err }, "voice_ready button error");
      await interaction.reply({ content: "❌ Something went wrong.", ephemeral: true }).catch(() => null);
    }
  });

  // ── Message handler ──────────────────────────────────────────────────────────

  client.on("messageCreate", async (message: Message) => {
    if (message.author.bot) return;
    if (await handleAdminUnlockTrigger(message, client)) return;

    const botId = client.user?.id ?? "";
    const content = message.content;
    const guildPrefix = getPrefix(message.guildId);
    const responseLang = getEffectiveLanguage(message.guildId, message.author.id);

    // A location reply to a time question should work without mentioning the bot
    // again, and the saved preference is keyed by user rather than channel.
    if (!content.startsWith(guildPrefix) && !content.startsWith("/")) {
      const timeFollowUp = await consumeTimeFollowUp(message, stripMentions(content));
      if (timeFollowUp) {
        await message.reply(timeFollowUp);
        return;
      }
    }

    // --- Image generation ---
    if (content === "/image" || content.startsWith("/image ") || content === `${guildPrefix}image` || content.startsWith(`${guildPrefix}image `)) {
      const prompt = content.includes(" ") ? content.slice(content.indexOf(" ") + 1).trim() : "";
      const imageLanguage = getAiResponseLanguage(message.author.id, prompt, responseLang);
      await sendGeneratedImage(message, prompt, imageLanguage);
      return;
    }

    const isDm = message.channel.type === ChannelType.DM;
    if (!content.startsWith(guildPrefix) && !content.startsWith("/")) {
      const addressedToBot = isDm || (botId.length > 0 && isBotMentioned(message, botId));
      const cleanedContent = stripMentions(content);
      if (addressedToBot && shouldSkipConversation(cleanedContent)) return;
      if (addressedToBot && await clarifyMentionedRecipient(message, cleanedContent,
        getAiResponseLanguage(message.author.id, cleanedContent, responseLang))) return;
      if (addressedToBot && await handleAiActionRequest(
        message, cleanedContent, openai,
        getAiResponseLanguage(message.author.id, cleanedContent, responseLang),
      )) return;
      if (await handleAiPersonaNaturalMessage(
        message,
        cleanedContent,
        openai,
        responseLang,
        addressedToBot,
      )) return;
      if (addressedToBot && isSelfPhotoRequest(cleanedContent)) {
        const imageLanguage = getAiResponseLanguage(message.author.id, cleanedContent, responseLang);
        await sendFictionalAssistantPhoto(
          message,
          {
            name: "MaximeGPT3",
            description: "A friendly fictional, gender-neutral AI assistant represented as an approachable adult character, with a warm expression, everyday clothing, and subtle digital details. Do not portray Maxime, the bot's creator, or any real person.",
          },
          imageLanguage,
        );
        return;
      }
    }

    // --- DM AI chat ---
    if (isDm && !content.startsWith(guildPrefix)) {
      const userText = content.trim();
      if (!userText) { await message.reply("Hey! 👋 Send me a message and I'll do my best to help!"); return; }
      const aiResponseLang = getAiResponseLanguage(message.author.id, userText, responseLang);
      if (await handleAiMessageAnalysis(message, userText, openai, aiResponseLang, botId)) return;
      if (isPornographicSiteListRequest(userText)) {
        await message.reply(PORNOGRAPHIC_SITE_REFUSAL);
        return;
      }
      if (extractNaturalHelpCommand(userText) === "help") {
        await sendHelpPaginator(message, aiResponseLang);
        return;
      }
      const pokemonQuery = extractPokemonQuery(userText);
      if (pokemonQuery) {
        await handlePokemon(pokemonQuery, aiResponseLang, (opts) => message.reply(opts as Parameters<typeof message.reply>[0]));
        return;
      }
      if (await handleAiActionRequest(message, userText, openai, aiResponseLang)) return;
      const route = classifyAiMessage(userText);
      if (await replyWithKnownRecipe(message, userText, aiResponseLang)) return;
      if (route.intent === "greeting") {
        await message.reply(directGreeting(message, aiResponseLang));
        return;
      }
      if (route.intent === "identity") {
        await message.reply(directIdentityAnswer(aiResponseLang));
        return;
      }
      if (route.intent === "creator") {
        await message.reply(directCreatorAnswer(aiResponseLang));
        return;
      }
      if (route.intent === "capabilities") {
        await message.reply(directCapabilitiesAnswer(aiResponseLang));
        return;
      }
      if (route.intent === "time" && !isWeatherRequest(userText)) {
        const explicitPlace = requestedTimePlace(userText);
        const timezone = explicitPlace ? resolveTimeZone(explicitPlace) : null;
        if (explicitPlace && timezone) await saveAiTimezone(message.author.id, explicitPlace, timezone);
        const savedTime = await getAiTimezone(message.author.id);
        const answer = currentTimeAnswer(userText, savedTime?.place, aiResponseLang);
        if (!explicitPlace && !savedTime) rememberTimeRequest(message);
        await message.reply(answer);
        return;
      }
      if (route.intent === "discord_action") {
        await message.reply(
          aiResponseLang === "fr"
            ? "⚠️ Je ne peux pas encore exécuter cette action Discord depuis une conversation. Je ne vais pas prétendre l’avoir faite."
            : "⚠️ I can't execute that Discord action from a chat request, and I won't claim that I did.",
        );
        return;
      }
      if (!openai) {
        await message.reply(aiResponseLang === "fr"
          ? "❌ Les fonctions IA ne sont pas configurées. Demande à un modérateur de les activer."
          : "❌ AI features are not configured. Ask a moderator to set them up.");
        return;
      }
      try {
        if (isSendable(message.channel)) await message.channel.sendTyping();
        addToHistory(conversationKey(message), "user", currentUserTurn(message, userText));
        const memoryContext = await getAiPromptContext(message.guildId, message.author.id);
        const explicitPlace = route.intent === "time" ? requestedTimePlace(userText) : null;
        const timezone = explicitPlace ? resolveTimeZone(explicitPlace) : null;
        if (explicitPlace && timezone) await saveAiTimezone(message.author.id, explicitPlace, timezone);
        const savedTime = route.intent === "time" ? await getAiTimezone(message.author.id) : null;
        const timeContext = route.intent === "time" ? currentTimeAnswer(userText, savedTime?.place, aiResponseLang) : "";
        const shouldSearch = isTopListQuery(userText) || route.needsResearch;
        const searchQuery = shouldSearch
          ? isLatestNewsRequest(userText) ? userText : buildMessageResearchQuery(message, userText)
          : userText;
        const research = await researchForTurn(message, userText, getAiHistory(conversationKey(message)), shouldSearch, searchQuery, aiResponseLang);
        const webResults = research.results;
        if (research.immediateReply) {
          addToHistory(conversationKey(message), "assistant", research.immediateReply);
          await message.reply({ content: research.immediateReply, allowedMentions: { parse: [] } });
          return;
        }
        if (!research.correction && await replyWithLatestNews(message, userText, webResults, aiResponseLang)) {
          rememberConversationTurn(message, userText, openai);
          return;
        }
        const webContext = formatSearchContext(webResults);
        const response = await createReliableCompletion(openai, {
          model: "openai/gpt-oss-120b",
          max_completion_tokens: 2048,
          currentUserText: userText,
          evidence: webResults, correction: research.correction, responseLanguage: aiResponseLang,
          messages: [
            { role: "system", content: buildAiSystemPrompt(userText, route.intent, webContext, memoryContext, timeContext, aiResponseLang, getPrefix(message.guildId)) },
            { role: "system", content: await buildSpeakerContext(message) },
            { role: "system", content: research.guidance },
             ...getAiHistory(conversationKey(message)),
          ],
        });
        if (response.intentionallySilent) return;
        const verifiedSources = response.reviewedSources ?? webResults;
        const rawReply = response.choices[0]?.message?.content
          ?? (aiResponseLang === "fr" ? "Désolé, je n’ai pas réussi à formuler une réponse." : "Sorry, I couldn't come up with a response! 😅");
        const reply = webResults.length ? normalizeResearchAnswer(rawReply) : rawReply;
        addToHistory(conversationKey(message), "assistant", reply);
        await replyWithAiAnswer(message, reply, verifiedSources);
        rememberConversationTurn(message, userText, openai, false, reply);
      } catch (err) {
        logger.error({ err }, "DM AI error");
        await reportModuleFailure(message, "ai", err, "groq");
        await message.reply(aiResponseLang === "fr"
          ? "Désolé, une erreur m’empêche de répondre. Réessaie dans un instant."
          : "Sorry, something went wrong. Try again in a moment.");
      }
      return;
    }

    // --- @mention AI chat ---
    if (!isDm && botId && isBotMentioned(message, botId)) {
      const userText = stripMentions(content);
      if (!userText) { await message.reply("Hey! 👋 Mention me with a message and I'll help!"); return; }
      const aiResponseLang = getAiResponseLanguage(message.author.id, userText, responseLang);
      if (await handleAiMessageAnalysis(message, userText, openai, aiResponseLang, botId)) return;
      if (isPornographicSiteListRequest(userText)) {
        await message.reply(PORNOGRAPHIC_SITE_REFUSAL);
        return;
      }
      if (extractNaturalHelpCommand(userText) === "help") {
        await sendHelpPaginator(message, aiResponseLang);
        return;
      }
      const pokemonQuery = extractPokemonQuery(userText);
      if (pokemonQuery) {
        await handlePokemon(pokemonQuery, aiResponseLang, (opts) => message.reply(opts as Parameters<typeof message.reply>[0]));
        return;
      }
      if (await handleAiActionRequest(message, userText, openai, aiResponseLang)) return;
      const route = classifyAiMessage(userText);
      if (await replyWithKnownRecipe(message, userText, aiResponseLang)) return;
      if (route.intent === "greeting") {
        await message.reply(directGreeting(message, aiResponseLang));
        return;
      }
      if (route.intent === "identity") {
        await message.reply(directIdentityAnswer(aiResponseLang));
        return;
      }
      if (route.intent === "creator") {
        await message.reply(directCreatorAnswer(aiResponseLang));
        return;
      }
      if (route.intent === "capabilities") {
        await message.reply(directCapabilitiesAnswer(aiResponseLang));
        return;
      }
      if (route.intent === "time" && !isWeatherRequest(userText)) {
        const explicitPlace = requestedTimePlace(userText);
        const timezone = explicitPlace ? resolveTimeZone(explicitPlace) : null;
        if (explicitPlace && timezone) await saveAiTimezone(message.author.id, explicitPlace, timezone);
        const savedTime = await getAiTimezone(message.author.id);
        const answer = currentTimeAnswer(userText, savedTime?.place, aiResponseLang);
        if (!explicitPlace && !savedTime) rememberTimeRequest(message);
        await message.reply(answer);
        return;
      }
      if (route.intent === "discord_action") {
        await message.reply(
          aiResponseLang === "fr"
            ? "⚠️ Je ne peux pas encore exécuter cette action Discord depuis une conversation. Je ne vais pas prétendre l’avoir faite."
            : "⚠️ I can't execute that Discord action from a chat request, and I won't claim that I did.",
        );
        return;
      }
      if (!openai) {
        await message.reply(aiResponseLang === "fr"
          ? "❌ Les fonctions IA ne sont pas configurées. Demande à un modérateur de les activer."
          : "❌ AI features are not configured. Ask a moderator to set them up.");
        return;
      }
      try {
        // Moderation is scoped to messages that need an AI response. Direct
        // greetings, time lookups and unsupported actions never need a
        // classifier call.
        const wasModerated = await moderateMentionedMessage(message, openai, aiResponseLang);
        if (wasModerated) return;
        if (isSendable(message.channel)) await message.channel.sendTyping();
        addToHistory(conversationKey(message), "user", currentUserTurn(message, userText));
        const memoryContext = await getAiPromptContext(message.guildId, message.author.id);
        const explicitPlace = route.intent === "time" ? requestedTimePlace(userText) : null;
        const timezone = explicitPlace ? resolveTimeZone(explicitPlace) : null;
        if (explicitPlace && timezone) await saveAiTimezone(message.author.id, explicitPlace, timezone);
        const savedTime = route.intent === "time" ? await getAiTimezone(message.author.id) : null;
        const timeContext = route.intent === "time" ? currentTimeAnswer(userText, savedTime?.place, aiResponseLang) : "";
        const shouldSearch = isTopListQuery(userText) || route.needsResearch;
        const searchQuery = shouldSearch
          ? isLatestNewsRequest(userText) ? userText : buildMessageResearchQuery(message, userText)
          : userText;
        const research = await researchForTurn(message, userText, getAiHistory(conversationKey(message)), shouldSearch, searchQuery, aiResponseLang);
        const webResults = research.results;
        if (research.immediateReply) {
          addToHistory(conversationKey(message), "assistant", research.immediateReply);
          await message.reply({ content: research.immediateReply, allowedMentions: { parse: [] } });
          return;
        }
        if (!research.correction && await replyWithLatestNews(message, userText, webResults, aiResponseLang)) {
          rememberConversationTurn(message, userText, openai);
          return;
        }
        const webContext = formatSearchContext(webResults);
        const response = await createReliableCompletion(openai, {
          model: "openai/gpt-oss-120b",
          max_completion_tokens: 2048,
          currentUserText: userText,
          evidence: webResults, correction: research.correction, responseLanguage: aiResponseLang,
          messages: [
            { role: "system", content: buildAiSystemPrompt(userText, route.intent, webContext, memoryContext, timeContext, aiResponseLang, getPrefix(message.guildId)) },
            { role: "system", content: await buildSpeakerContext(message) },
            { role: "system", content: research.guidance },
             ...getAiHistory(conversationKey(message)),
          ],
        });
        if (response.intentionallySilent) return;
        const verifiedSources = response.reviewedSources ?? webResults;
        const rawReply = response.choices[0]?.message?.content
          ?? (aiResponseLang === "fr" ? "Désolé, je n’ai pas réussi à formuler une réponse." : "Sorry, I couldn't come up with a response! 😅");
        const reply = webResults.length ? normalizeResearchAnswer(rawReply) : rawReply;
        addToHistory(conversationKey(message), "assistant", reply);
        await replyWithAiAnswer(message, reply, verifiedSources);
        rememberConversationTurn(message, userText, openai, false, reply);
        // Also speak in voice if bot is connected
        if (message.guildId && isInVoice(message.guildId)) {
          const botName = client.user?.username;
          speakText(message.guildId, reply, aiResponseLang, botName).catch(() => null);
        }
      } catch (err) {
        logger.error({ err }, "Mention AI error");
        await reportModuleFailure(message, "ai", err, "groq");
        await message.reply(aiResponseLang === "fr"
          ? "Désolé, une erreur m’empêche de répondre. Réessaie dans un instant."
          : "Sorry, something went wrong. Try again in a moment.");
      }
      return;
    }

    // --- Echo processing (runs before prefix check) ---
    await processEchoMessage(message, client.user?.id ?? "").catch(() => null);

    // --- Blindtest hard-mode answer capture ---
    if (message.guildId && !content.startsWith(guildPrefix)) {
      const handled = await handleBlindtestMessage(message).catch(() => false);
      if (handled) return;
    }

    // --- DJ pending "Add Track" listener ---
    if (message.guildId && hasDjPendingAdd(message.guildId, message.author.id)) {
      consumeDjPendingAdd(message.guildId, message.author.id);
      const query = content.trim();
      if (query) {
        await searchAndQueue(message, query);
        // Refresh the DJ console embed if we can find a recent one
      }
      return;
    }

    // --- Prefix commands ---
    if (!content.startsWith(guildPrefix)) return;

    const args = content.slice(guildPrefix.length).trim().split(/\s+/);
    const command = args.shift()?.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    // ── Full-block gate (levels 3 & 4) ────────────────────────────────────────
    // Admins can always use !unblock (including on themselves)
    {
      const isAdmin =
        message.member?.permissions.has(PermissionFlagsBits.Administrator) ||
        message.member?.permissions.has(PermissionFlagsBits.ManageGuild);

      const blockStatus = checkCommandBlock(message.author.id);

      if (blockStatus.blocked && !(isAdmin && command === "unblock")) {
        await sendBlockedMessage(message, blockStatus, guildPrefix);
        return;
      }
    }

    try {
      if (command === "tech" || command === "technician") {
        await handleAdminMessageCommand(message, command, args, guildPrefix, responseLang);
        return;
      }

      if (isMessageAiCommand(command)) {
        const handled = await runModuleWithFallback(
          message,
          "ai",
          () => handleMessageAiCommand({
            message,
            command,
            args,
            responseLang,
            guildPrefix,
            openai,
            client,
            client2,
            answerAiQuestion,
          }),
          async () => {
            await message.reply(moduleFallbackMessage("ai", responseLang));
            return true;
          },
          moduleDependencyForCommand(command, args),
        );
        if (handled) return;
      }

      if (isGameMessageCommand(command)) {
        const handled = await runModuleWithFallback(
          message,
          "games",
          () => handleGameMessageCommand(message, command, args, openai, responseLang),
          async () => {
            await message.reply(moduleFallbackMessage("games", responseLang));
            return true;
          },
          moduleDependencyForCommand(command, args),
        );
        if (handled) return;
      }

      if (isAdminMessageCommand(command)) {
        const handled = await runModuleWithFallback(
          message,
          "admin",
          () => handleAdminMessageCommand(message, command, args, guildPrefix, responseLang),
          async () => {
            await message.reply(moduleFallbackMessage("admin", responseLang));
            return true;
          },
        );
        if (handled) return;
      }

      switch (command) {

        // ── General ─────────────────────────────────────────────────────────────
        case "say": {
          const text = args.join(" ");
          if (!text) {
            await message.reply("❓ Tell me what to say! e.g. `!say Hello everyone`");
          } else {
            // Delete silently — bot may lack MANAGE_MESSAGES permission
            await message.delete().catch(() => null);
            if (isSendable(message.channel)) await message.channel.send(text);
          }
          break;
        }

        case "bonjour":
        case "salut":
        case "hello":
        case "hi": {
          await message.reply(directGreeting(message, responseLang));
          break;
        }

        // ── Fun ──────────────────────────────────────────────────────────────────
        case "compliment": {
          const lang = args[0] ? parseLanguage(args[0]) : responseLang;
          const list = lang === "fr" ? COMPLIMENTS_FR : lang === "es" ? COMPLIMENTS_ES : lang === "de" ? COMPLIMENTS_DE : lang === "pt" ? COMPLIMENTS_PT : lang === "it" ? COMPLIMENTS_IT : lang === "ja" ? COMPLIMENTS_JA : lang === "nl" ? COMPLIMENTS_NL : lang === "ru" ? COMPLIMENTS_RU : lang === "pl" ? COMPLIMENTS_PL : lang === "tr" ? COMPLIMENTS_TR : COMPLIMENTS;
          await message.reply(`${message.author.displayName}, ${getRandom(list)}`);
          break;
        }

        case "joke": {
          const lang = args[0] ? parseLanguage(args[0]) : responseLang;
          const list = lang === "fr" ? JOKES_FR : lang === "es" ? JOKES_ES : lang === "de" ? JOKES_DE : lang === "pt" ? JOKES_PT : lang === "it" ? JOKES_IT : lang === "ja" ? JOKES_JA : lang === "nl" ? JOKES_NL : lang === "ru" ? JOKES_RU : lang === "pl" ? JOKES_PL : lang === "tr" ? JOKES_TR : JOKES;
          await message.reply(getRandom(list));
          break;
        }

        case "encouragement":
        case "cheer": {
          const lang = args[0] ? parseLanguage(args[0]) : responseLang;
          const list = lang === "fr" ? ENCOURAGEMENTS_FR : lang === "es" ? ENCOURAGEMENTS_ES : lang === "de" ? ENCOURAGEMENTS_DE : lang === "pt" ? ENCOURAGEMENTS_PT : lang === "it" ? ENCOURAGEMENTS_IT : lang === "ja" ? ENCOURAGEMENTS_JA : lang === "nl" ? ENCOURAGEMENTS_NL : lang === "ru" ? ENCOURAGEMENTS_RU : lang === "pl" ? ENCOURAGEMENTS_PL : lang === "tr" ? ENCOURAGEMENTS_TR : ENCOURAGEMENTS;
          await message.reply(`${message.author.displayName}, ${getRandom(list)}`);
          break;
        }

        case "hug": {
          const lang = args[0] ? parseLanguage(args[0]) : responseLang;
          const list = lang === "fr" ? HUGS_FR : lang === "es" ? HUGS_ES : lang === "de" ? HUGS_DE : lang === "pt" ? HUGS_PT : lang === "it" ? HUGS_IT : lang === "ja" ? HUGS_JA : lang === "nl" ? HUGS_NL : lang === "ru" ? HUGS_RU : lang === "pl" ? HUGS_PL : lang === "tr" ? HUGS_TR : HUGS;
          await message.reply(`${message.author.displayName}, ${getRandom(list)}`);
          break;
        }

        case "8ball": {
          const firstArgIsLanguage = args[0] ? isValidUserLang(args[0].toLowerCase()) : false;
          const lang = firstArgIsLanguage ? parseLanguage(args.shift()) : responseLang;
          const question = args.join(" ");
          if (!question) {
            await message.reply(botText(responseLang, "eightBallPrompt", guildPrefix));
          } else {
            const answers = lang === "fr" ? EIGHT_BALL_RESPONSES_FR : lang === "es" ? EIGHT_BALL_RESPONSES_ES : lang === "de" ? EIGHT_BALL_RESPONSES_DE : lang === "pt" ? EIGHT_BALL_RESPONSES_PT : lang === "it" ? EIGHT_BALL_RESPONSES_IT : lang === "ja" ? EIGHT_BALL_RESPONSES_JA : lang === "nl" ? EIGHT_BALL_RESPONSES_NL : lang === "ru" ? EIGHT_BALL_RESPONSES_RU : lang === "pl" ? EIGHT_BALL_RESPONSES_PL : lang === "tr" ? EIGHT_BALL_RESPONSES_TR : EIGHT_BALL_RESPONSES;
            await message.reply(`${botText(lang, "eightBallQuestion", question)}\n${botText(lang, "eightBallAnswer", getRandom(answers))}`);
          }
          break;
        }

        case "dice":
        case "roll": {
          const faces = parseInt(args[0] ?? "6");
          const nb = isNaN(faces) || faces < 2 ? 6 : Math.min(faces, 1000);
          const result = Math.floor(Math.random() * nb) + 1;
          await message.reply(botText(responseLang, "diceResult", String(nb), String(result)));
          break;
        }

        case "food":
        case "aliment":
        case "produit": {
          await handleFood(message, args, openai);
          break;
        }

        case "rate": {
          // !rate food <product> → food rate
          if (args[0]?.toLowerCase() === "food") {
            args.shift();
            await handleFoodRate(message, args, openai);
          } else {
            await message.reply(`❓ Try \`${guildPrefix}rate food <product>\` to rate a food product!`);
          }
          break;
        }

        case "logo": {
          const logoSub = args[0]?.toLowerCase();
          const logoArg = args[1]?.toLowerCase();

          const requirePerm = () => {
            if (!message.member?.permissions.has(PermissionFlagsBits.ManageGuild)) {
              message.reply("🔒 You need **Manage Server** permission to use this command.").catch(() => null);
              return false;
            }
            return true;
          };

          if (logoSub === "stats") {
            const s = getStoreStats();
            const bar = (n: number, total: number) => {
              const pct = total > 0 ? Math.round((n / total) * 10) : 0;
              return "█".repeat(pct) + "░".repeat(10 - pct);
            };
            const embed = new EmbedBuilder()
              .setTitle("🏷️ Logo Brand Store — Stats")
              .setColor(0x5865f2)
              .addFields(
                { name: "Total brands",  value: `**${s.total}**`, inline: true },
                { name: "Tested",        value: `**${s.tested}** / ${s.total}`, inline: true },
                { name: "Untested",      value: `**${s.untested}**`, inline: true },
                { name: "✅ Approved",   value: `**${s.approved}**\n${bar(s.approved, s.total)}`, inline: true },
                { name: "📝 Text logos", value: `**${s.textLogos}** (excluded by OCR)`, inline: true },
                { name: "❌ Invalid",    value: `**${s.invalid}** (no image on logo.dev)`, inline: true },
              )
              .setFooter({ text: "Use !logo test start to test untested brands • !logo test all to re-test everything" });
            await message.reply({ embeds: [embed] });

          } else if (logoSub === "test") {
            if (!requirePerm()) break;

            if (logoArg === "status") {
              const p = getTestingProgress();
              if (!p.running && p.total === 0) {
                await message.reply("💤 No test job has been run yet. Use `!logo test start` to begin.");
              } else {
                const pct = p.total > 0 ? Math.round((p.done / p.total) * 100) : 0;
                const bar = "█".repeat(Math.round(pct / 10)) + "░".repeat(10 - Math.round(pct / 10));
                await message.reply(
                  `🔬 **Logo test${p.running ? " in progress" : " — last run"}**\n` +
                  `Progress: \`${bar}\` **${pct}%** (${p.done}/${p.total})\n` +
                  `✅ Approved: **${p.approved}**  •  📝 Text logos: **${p.textLogos}**  •  ❌ Invalid: **${p.invalid}**`,
                );
              }

            } else if (logoArg === "start" || logoArg === "all") {
              if (isTestingRunning()) {
                const p = getTestingProgress();
                const pct = p.total > 0 ? Math.round((p.done / p.total) * 100) : 0;
                const bar = "█".repeat(Math.round(pct / 10)) + "░".repeat(10 - Math.round(pct / 10));
                await message.reply(`⏳ A test job is already running — \`${bar}\` **${pct}%** (${p.done}/${p.total})`);
                break;
              }
              const token = process.env["LOGO_DEV_PUBLIC_KEY"] ?? process.env["LOGO_DEV_TOKEN"] ?? "";
              const retestAll = logoArg === "all";
              startLogoTestingJob(token, retestAll);
              const s = getStoreStats();
              const toTest = retestAll ? s.total : s.untested;

              const buildTestContent = (): string => {
                const p = getTestingProgress();
                const pct = p.total > 0 ? Math.round((p.done / p.total) * 100) : 0;
                const filled = Math.round(pct / 10);
                const bar = "█".repeat(filled) + "░".repeat(10 - filled);
                if (!p.running && p.total > 0) {
                  return (
                    `✅ **Logo test complete!**\n` +
                    `\`${bar}\` **100%** (${p.total}/${p.total})\n` +
                    `✅ Approved: **${p.approved}**  •  📝 Text logos: **${p.textLogos}**  •  ❌ Invalid: **${p.invalid}**`
                  );
                }
                return (
                  `🔬 **Logo test in progress…** *(${toTest} brand${toTest !== 1 ? "s" : ""}${retestAll ? " — re-testing all" : ""})*\n` +
                  `\`${bar}\` **${pct}%** (${p.done}/${p.total})\n` +
                  `✅ Approved: **${p.approved}**  •  📝 Text logos: **${p.textLogos}**  •  ❌ Invalid: **${p.invalid}**`
                );
              };

              const liveMsg = await message.reply(buildTestContent());
              const liveInterval = setInterval(async () => {
                try {
                  await liveMsg.edit(buildTestContent());
                  if (!isTestingRunning()) clearInterval(liveInterval);
                } catch {
                  clearInterval(liveInterval);
                }
              }, 5_000);

            } else {
              await message.reply(
                "**!logo test** subcommands:\n" +
                "`!logo test start` — test untested brands\n" +
                "`!logo test all` — re-test ALL brands\n" +
                "`!logo test status` — show progress",
              );
            }

          } else if (logoSub === "approve" && args[1]) {
            if (!requirePerm()) break;
            const domain = args[1];
            const ok = await setBrandApproval(domain, true, false);
            await message.reply(ok ? `✅ **${domain}** marked as approved.` : `❌ Brand \`${domain}\` not found in the store.`);

          } else if ((logoSub === "exclude" || logoSub === "ban") && args[1]) {
            if (!requirePerm()) break;
            const domain = args[1];
            const ok = await setBrandApproval(domain, false, true);
            await message.reply(ok ? `🚫 **${domain}** manually excluded from the game.` : `❌ Brand \`${domain}\` not found in the store.`);

          } else if ((logoSub === "include" || logoSub === "unban") && args[1]) {
            if (!requirePerm()) break;
            const domain = args[1];
            const ok = await setBrandApproval(domain, true, false);
            await message.reply(ok ? `✅ **${domain}** re-included in the game.` : `❌ Brand \`${domain}\` not found in the store.`);

          } else if (logoSub === "add" && args[1] && args[2]) {
            if (!requirePerm()) break;
            // !logo add <domain> <name> [tier:1|2|3] [category] [country] [hint...]
            const domain  = args[1]!;
            const name    = args[2]!;
            const tierRaw = Number(args[3] ?? "2");
            const tier: 1 | 2 | 3 = (tierRaw === 1 || tierRaw === 3) ? tierRaw : 2;
            const category = args[4] ?? "Brand";
            const country  = args[5] ?? "🌍";
            const hints    = args.slice(6);
            const result   = await addBrandToStore({ domain, name, tier, category, country, hints: hints.length ? hints : [] });
            if (result.ok) {
              const s = getStoreStats();
              await message.reply(
                `✅ **${name}** (\`${domain}\`) added to the store — tier **${tier}**, auto-approved.\n` +
                `Store now has **${s.total}** brand${s.total !== 1 ? "s" : ""} (${s.approved} approved).\n` +
                `💡 Run \`!logo test start\` to OCR-test the new brand.`,
              );
            } else {
              await message.reply(`❌ ${result.reason}`);
            }

          } else if ((logoSub === "remove" || logoSub === "delete") && args[1]) {
            if (!requirePerm()) break;
            const domain = args[1]!;
            const ok = await removeBrandFromStore(domain);
            await message.reply(ok
              ? `🗑️ **${domain}** removed from the store.`
              : `❌ Brand \`${domain}\` not found in the store.`);

          } else if (logoSub === "bulkload") {
            if (!requirePerm()) break;
            const { BULK_DOMAINS } = await import("./discord/logo-domains-bulk.js");
            const { bulkSeedFromDomainList } = await import("./discord/logo-brand-store.js");
            const statusMsg = await message.reply(`⏳ Loading **${BULK_DOMAINS.length}** domains into the store…`);
            const result = await bulkSeedFromDomainList(BULK_DOMAINS);
            const s = getStoreStats();
            await statusMsg.edit(
              `✅ Bulk load complete!\n` +
              `**${result.added}** new brands added · **${result.skipped}** already in store\n` +
              `Store now has **${s.total}** brands total.\n` +
              `💡 Run \`!logo test start\` to OCR-validate all untested entries.`,
            );

          } else {
            const embed = new EmbedBuilder()
              .setTitle("🏷️ Logo Brand Store — Admin")
              .setColor(0x5865f2)
              .addFields(
                {
                  name: "📊 Info",
                  value:
                    "`!logo stats` — database statistics",
                },
                {
                  name: "➕ Add / Remove",
                  value:
                    "`!logo add <domain> <name> [tier] [category] [country] [hint…]`\n" +
                    "  → e.g. `!logo add zara.com Zara 2 Fashion 🇪🇸`\n" +
                    "`!logo remove <domain>` — remove a brand",
                },
                {
                  name: "📦 Bulk Load",
                  value:
                    "`!logo bulkload` — import ~1 200 domains from the built-in list",
                },
                {
                  name: "🔬 OCR Testing",
                  value:
                    "`!logo test start` — test untested brands (image + OCR)\n" +
                    "`!logo test all` — re-test all brands\n" +
                    "`!logo test status` — current test progress",
                },
                {
                  name: "✅ Approval",
                  value:
                    "`!logo approve <domain>` — manually approve a brand\n" +
                    "`!logo exclude <domain>` — manually exclude a brand\n" +
                    "`!logo include <domain>` — re-include a brand",
                },
              )
              .setFooter({ text: "Manage Server permission required for all commands" });
            await message.reply({ embeds: [embed] });
          }
          break;
        }

        // ── Music — Suno AI ───────────────────────────────────────────────────────
        case "music": {
          const sub = args.shift()?.toLowerCase();

          if (sub === "generator") {
            const prompt = args.join(" ").trim();
            if (!prompt) { await message.reply("❌ Give me a prompt! e.g. `!music generator lo-fi hip hop beats chill`"); break; }
            if (!process.env["SUNO_API_KEY"]) { await message.reply("❌ Music generation is not configured. Ask a moderator to set it up — use `!mode d'emploi` for instructions."); break; }
            await runModuleWithFallback(
              message,
              "music",
              () => generateMusicTrack(message, prompt),
              async () => {
                await message.reply(moduleFallbackMessage("music", responseLang));
              },
              process.env["SUNO_API_KEY"] ? "suno" : undefined,
            );

          } else if (sub === "prompt") {
            const embed = new EmbedBuilder()
              .setColor(0x5865f2)
              .setTitle("💡 Music Prompt Examples")
              .setDescription("Copy a prompt and use it with `!music generator <prompt>`\n\u200b");
            for (const { category, prompt } of MUSIC_PROMPT_EXAMPLES) embed.addFields({ name: category, value: `\`${prompt}\`` });
            embed.setFooter({ text: "💡 Tip: combine multiple styles for unique results!" });
            await message.reply({ embeds: [embed] });

          } else {
            await message.reply(commandSuggestText(
              responseLang,
              "unknownSubcommand",
              `${guildPrefix}music generator <prompt>`,
              `${guildPrefix}music prompt`,
            ));
          }
          break;
        }

        // ── !generator music <prompt> — alias for !music generator ───────────────
        case "generator": {
          const genSub = args.shift()?.toLowerCase();
          if (genSub !== "music") {
            await message.reply(commandSuggestText(responseLang, "generatorHint", `${guildPrefix}generator music <prompt>`));
            break;
          }
          const genPrompt = args.join(" ").trim();
          if (!genPrompt) {
            await message.reply(commandSuggestText(responseLang, "promptRequired", `${guildPrefix}generator music lo-fi hip hop beats chill`));
            break;
          }
          if (!process.env["SUNO_API_KEY"]) {
            await message.reply(commandSuggestText(responseLang, "musicNotConfigured", `${guildPrefix}guide`));
            break;
          }

          await runModuleWithFallback(
            message,
            "music",
            () => generateMusicTrack(message, genPrompt, "generator music"),
            async () => {
              await message.reply(moduleFallbackMessage("music", responseLang));
            },
            process.env["SUNO_API_KEY"] ? "suno" : undefined,
          );
          break;
        }

        case "balance": {
          await runModuleWithFallback(
            message,
            "music",
            () => handleSunoBalanceCommand(message),
            async () => {
              await message.reply(moduleFallbackMessage("music", responseLang));
            },
            process.env["SUNO_API_KEY"] ? "suno" : undefined,
          );
          break;
        }

        // ── Setup guide (API keys) — multiple command aliases ────────────────────
        case "setup":
        case "instruction":
        case "guide":
        case "guia":
        case "guía": {
          await sendSetupGuide(message, responseLang);
          break;
        }

        case "mode": {
          const modeRest = args.join(" ").toLowerCase().replace(/['\u2019\u02BC]/g, "'");
          const setupWords = ["emploi", "help", "setup", "guide", "ayuda", "hilfe", "ajuda", "aiuto", "ヘルプ", "hulp", "помощь", "pomoc", "yardım"];
          if (!setupWords.some((word) => modeRest.includes(word))) {
            await message.reply(commandSuggestText(responseLang, "modeHint", `${guildPrefix}guide`));
            break;
          }
          await sendSetupGuide(message, responseLang);
          break;
        }

        // ── Status (owner only) ──────────────────────────────────────────────────
        case "status": {
          if (message.author.username.toLowerCase() !== "maxim3kun") {
            await message.reply("🔒 Owner-only command.");
            break;
          }
          const mongoOk  = isMongoConnected();
          const groqOk   = !!process.env["GROQ_API_KEY"];
          const sunoOk   = !!process.env["SUNO_API_KEY"];
          const imageProviders = configuredImageProviders();
          const token2Ok = !!process.env["DISCORD_TOKEN_2"];
          const guilds   = client.guilds.cache.size;
          const users    = client.guilds.cache.reduce((acc, g) => acc + g.memberCount, 0);
          const uptime   = process.uptime();
          const uh = Math.floor(uptime / 3600);
          const um = Math.floor((uptime % 3600) / 60);
          const us = Math.floor(uptime % 60);
          const uptimeStr = `${uh}h ${um}m ${us}s`;
          const mem    = process.memoryUsage();
          const memMb  = Math.round(mem.rss / 1024 / 1024);
          const memMax = Math.round(os.totalmem() / 1024 / 1024);

          // MongoDB storage stats
          const MONGO_LIMIT_MB = 512;
          const dbSt = await getDbStats();
          let mongoValue: string;
          if (!mongoOk) {
            mongoValue = "⚠️ Fallback JSON";
          } else if (!dbSt) {
            mongoValue = "✅ Connecté";
          } else {
            const usedMb = (dbSt.storageSize / 1024 / 1024).toFixed(1);
            const pct    = Math.min((dbSt.storageSize / (MONGO_LIMIT_MB * 1024 * 1024)) * 100, 100);
            const filled = Math.round(pct / 10);
            const bar    = `\`${"█".repeat(filled)}${"░".repeat(10 - filled)}\``;
            mongoValue   = `✅ ${usedMb} MB / ${MONGO_LIMIT_MB} MB\n${bar} **${pct.toFixed(1)}%**\n${dbSt.objects} docs • ${dbSt.collections} collections`;
          }

          // Groq call count
          const groqCalls = getGroqCallCount();
          const groqValue = groqOk
            ? `✅ Active\n**${groqCalls}** appel${groqCalls !== 1 ? "s" : ""} cette session`
            : "❌ Désactivée";

          // RAM bar
          const ramPct    = Math.min(Math.round((memMb / memMax) * 100), 100);
          const ramFilled = Math.round(ramPct / 10);
          const ramBar    = `\`${"█".repeat(ramFilled)}${"░".repeat(10 - ramFilled)}\``;
          const ramValue  = `${memMb} MB / ${memMax} MB\n${ramBar} **${ramPct}%**`;

          const SP = { name: "\u200b", value: "\u200b", inline: true }; // 2-col spacer

          const embed = new EmbedBuilder()
            .setTitle("🤖 Bot Status")
            .setColor(mongoOk ? 0x57f287 : 0xfee75c)
            .addFields(
              { name: "🗄️ MongoDB",       value: mongoValue,                                  inline: true },
              { name: "🧠 Groq IA",        value: groqValue,                                   inline: true },
              SP,
              { name: "🎵 Suno",           value: sunoOk   ? "✅ Active" : "❌ Désactivée",   inline: true },
              { name: "🖼️ Images", value: imageProviders.length ? `✅ ${imageProviders.join(" → ")}` : "❌ Désactivée", inline: true },
              SP,
              { name: "⚔️ AI Battle",      value: token2Ok ? "✅ Active" : "❌ Désactivée",   inline: true },
              { name: "🏠 Serveurs",        value: `**${guilds}** serveur${guilds !== 1 ? "s" : ""}\n${users} membres`,  inline: true },
              SP,
              { name: "⏱️ Uptime",          value: uptimeStr,                                  inline: true },
              { name: "💾 RAM",             value: ramValue,                                   inline: true },
              SP,
            )
            .setTimestamp();
          await message.reply({ embeds: [embed] });
          break;
        }

        // ── YouTube cookie/stream test (owner only) ──────────────────────────────
        case "artist": {
          const isArtistAdmin =
            message.author.username.toLowerCase() === "maxim3kun" ||
            message.member?.permissions.has(PermissionFlagsBits.ManageGuild);
          if (!isArtistAdmin) {
            await message.reply("🔒 Only admins can manage the artist list.");
            break;
          }
          const subCmd = args[0]?.toLowerCase();
          const artistName = args.slice(1).join(" ").trim();

          if (subCmd === "add") {
            if (!artistName) { await message.reply("❓ Usage: `!artist add <name>`"); break; }
            await saveArtist(artistName);
            await message.reply(`✅ **${artistName}** added to the artist list. \`!${artistName.toLowerCase()}\` now works.`);
          } else if (subCmd === "remove" || subCmd === "delete") {
            if (!artistName) { await message.reply("❓ Usage: `!artist remove <name>`"); break; }
            const removed = await removeArtist(artistName);
            await message.reply(removed
              ? `🗑️ **${artistName}** removed from the artist list.`
              : `❓ **${artistName}** was not in the list.`);
          } else if (subCmd === "list" || !subCmd) {
            const all = listArtists();
            if (all.length === 0) {
              await message.reply("📋 No artists registered yet. Use `!artist add <name>` to add one.");
            } else {
              const chunks: string[] = [];
              let chunk = "";
              for (const name of all) {
                const line = `• ${name}\n`;
                if (chunk.length + line.length > 1800) { chunks.push(chunk); chunk = ""; }
                chunk += line;
              }
              if (chunk) chunks.push(chunk);
              await message.reply(`📋 **Registered artists (${all.length}):**\n${chunks[0]}`);
              if (message.channel.isSendable()) {
                for (let i = 1; i < chunks.length; i++) await message.channel.send(chunks[i]!);
              }
            }
          } else {
            await message.reply("❓ Usage:\n`!artist add <name>` — register an artist\n`!artist remove <name>` — unregister\n`!artist list` — show all");
          }
          break;
        }

        case "yt-test":
        case "yttest": {
          if (message.author.username.toLowerCase() !== "maxim3kun") {
            await message.reply("🔒 Owner-only command.");
            break;
          }

          const statusMsg = await message.reply("🔍 Testing YouTube…");

          // 1. Cookie file status
          const ytCookiesRaw = process.env["YT_COOKIES"] ?? "";
          const cookieSet = ytCookiesRaw.length > 0;
          let cookieEntries = 0;
          if (cookieSet) {
            try {
              const { readFileSync, existsSync } = await import("fs");
              const cookiePath = "/tmp/yt-cookies.txt";
              if (existsSync(cookiePath)) {
                const content = readFileSync(cookiePath, "utf8");
                cookieEntries = content.split("\n").filter(l => l.trim() && !l.startsWith("#")).length;
              }
            } catch { /* ignore */ }
          }

          // 2. Live yt-dlp test on a short public video (Rick Astley — 3:32)
          const testUrl = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
          let ytResult = "⏳ test…";
          let ytError = "";
          try {
            const { execFile } = await import("child_process");
            const { promisify } = await import("util");
            const exec = promisify(execFile);
            const { existsSync } = await import("fs");
            const homeBin = `${process.env["HOME"] ?? "/home/runner"}/.local/bin/yt-dlp`;
            const bin = existsSync(homeBin) ? homeBin : "yt-dlp";
            const cookieArgs = cookieEntries > 0 ? ["--cookies", "/tmp/yt-cookies.txt"] : [];
            const { stdout } = await exec(
              bin,
              [
                "--print", "%(title)s",
                "--no-playlist",
                "--no-check-formats",
                "--extractor-args=youtube:player_client=android;formats=missing_pot",
                ...cookieArgs,
                testUrl,
              ],
              { timeout: 25_000, maxBuffer: 256 * 1024 },
            );
            ytResult = `✅ \`${stdout.trim().slice(0, 60)}\``;
          } catch (err) {
            const msg = String((err as { stderr?: string })?.stderr ?? err);
            ytResult = "❌ Échec";
            ytError = msg.slice(0, 200);
          }

          const embed = new EmbedBuilder()
            .setTitle("🧪 Diagnostic YouTube")
            .setColor(ytResult.startsWith("✅") ? 0x57f287 : 0xed4245)
            .addFields(
              {
                name: "🍪 Cookies",
                value: cookieSet
                  ? (cookieEntries > 0 ? `✅ ${cookieEntries} entrées chargées` : "⚠️ Secret défini mais 0 entrées — les sauts de ligne sont perdus à la saisie. Encode en base64 avant de coller.")
                  : "❌ `YT_COOKIES` non défini",
                inline: false,
              },
              { name: "▶️ Lecture test", value: ytResult, inline: false },
              ...(ytError ? [{ name: "⚠️ Erreur yt-dlp", value: `\`\`\`${ytError}\`\`\``, inline: false }] : []),
            )
            .setFooter({ text: "Client utilisé : android+formats=missing_pot • Vidéo test : Rick Astley" });

          await statusMsg.edit({ content: "", embeds: [embed] });
          break;
        }

        // ── Animation test ───────────────────────────────────────────────────────
        case "animation": {
          if (args[0]?.toLowerCase() === "test") {
            await handleAnimationTest(message);
          } else {
            await message.reply(`🎩 Unknown sub-command. Usage: \`${guildPrefix}animation test\``);
          }
          break;
        }

        // ── Voice ────────────────────────────────────────────────────────────────
        case "join": {
          await joinVoice(message);
          break;
        }

        case "leave": {
          await leaveVoice(message);
          break;
        }

        case "voice": {
          await handleVoiceCommand(message, args);
          break;
        }

        case "subtitles": {
          await toggleSubtitles(message);
          break;
        }

        // ── DJ Console ──────────────────────────────────────────────────────────
        case "dj": {
          await openDjConsole(message);
          break;
        }

        // ── Soundboard ──────────────────────────────────────────────────────────
        case "soundboard":
        case "sb": {
          const guildId = message.guildId;
          const sbSub = args[0]?.toLowerCase();

          // !sb add <emoji> <name> <search query...>
          if (sbSub === "add") {
            if (!guildId) { await message.reply("❌ Server only."); break; }
            const emoji = args[1];
            const name  = args[2];
            const query = args.slice(3).join(" ");
            if (!emoji || !name || !query) {
              await message.reply(
                "❌ Usage: `!sb add <emoji> <name> <YouTube search>`\n" +
                "Example: `!sb add 🐱 Meow cat meow sound effect`"
              );
              break;
            }
            const padId = name.toLowerCase().replace(/[^a-z0-9]/g, "_");
            const pad: SoundPad = { id: padId, emoji, label: name, query, style: 1 /* Primary/blue */ };
            const added = await addCustomSound(guildId, pad);
            if (!added) {
              const existing = getCustomSounds(guildId);
              await message.reply(
                existing.length >= 5
                  ? `❌ Max 5 custom sounds per server. Remove one with \`!sb remove <name>\` first.`
                  : `❌ A sound with that name already exists.`
              );
              break;
            }
            await message.reply({
              embeds: [buildSoundboardEmbed(guildId, `✅ **${name}** ${emoji} added to your soundboard!`)],
              components: buildSoundboardRows(guildId),
            });
            break;
          }

          // !sb remove <name>
          if (sbSub === "remove" || sbSub === "delete") {
            if (!guildId) { await message.reply("❌ Server only."); break; }
            const name = args.slice(1).join(" ");
            if (!name) { await message.reply("❌ Usage: `!sb remove <name>`"); break; }
            const padId = name.toLowerCase().replace(/[^a-z0-9]/g, "_");
            const removed = await removeCustomSound(guildId, padId);
            if (!removed) {
              await message.reply(`❌ No custom sound named **${name}** found. Use \`!sb list\` to see your sounds.`);
              break;
            }
            await message.reply(`✅ **${name}** removed from your soundboard.`);
            break;
          }

          // !sb list
          if (sbSub === "list") {
            if (!guildId) { await message.reply("❌ Server only."); break; }
            const custom = getCustomSounds(guildId);
            if (custom.length === 0) {
              await message.reply("📭 No custom sounds yet. Add one with `!sb add <emoji> <name> <YouTube search>`.");
            } else {
              const list = custom.map((p, i) => `${i + 1}. ${p.emoji} **${p.label}** — \`${p.query}\``).join("\n");
              await message.reply(`🎵 **Custom sounds (${custom.length}/5):**\n${list}\n\nRemove with \`!sb remove <name>\`.`);
            }
            break;
          }

          // !sb (no sub-command → open soundboard)
          await openSoundboard(message);
          break;
        }

        // ── Radio ────────────────────────────────────────────────────────────────
        case "radio": {
          const sub = args[0]?.toLowerCase();

          if (!sub || sub === "list" || sub === "liste" || sub === "search" || sub === "recherche" || sub === "fr" || sub === "es" || sub === "en") {
            let page = langToPage((sub === "fr" || sub === "es" || sub === "en") ? sub : args[1]?.toLowerCase()) as 1 | 2 | 3;
            const radioMsg = await message.reply({ embeds: [buildRadioListEmbed(page)] });
            await radioMsg.react("⬅️").catch(() => null);
            await radioMsg.react("➡️").catch(() => null);
            const collector = radioMsg.createReactionCollector({
              filter: (r, u) => ["⬅️", "➡️"].includes(r.emoji.name ?? "") && !u.bot && u.id === message.author.id,
              idle: 30 * 60 * 1000,
            });
            collector.on("collect", async (reaction, user) => {
              if (reaction.emoji.name === "➡️") page = (page === 3 ? 1 : page + 1) as 1 | 2 | 3;
              if (reaction.emoji.name === "⬅️") page = (page === 1 ? 3 : page - 1) as 1 | 2 | 3;
              await radioMsg.edit({ embeds: [buildRadioListEmbed(page)] });
              await reaction.users.remove(user.id).catch(() => null);
            });
            break;
          }

          if (sub === "leave" || sub === "stop") {
            await stopRadio(message);
            break;
          }

          // ── !radio custom ──────────────────────────────────────────────────
          if (sub === "custom") {
            if (customStations.size === 0) {
              await message.reply(
                "📭 Aucune station personnalisée pour le moment.\n" +
                "Les admins peuvent en ajouter avec `!radio addurl <Nom> | <URL>`."
              );
              break;
            }
            const lines = Array.from(customStations.entries())
              .map(([k, s]) => `${s.emoji} \`${k}\` — **${s.name}** · *${s.genre}*`)
              .join("\n");
            const customEmbed = new EmbedBuilder()
              .setTitle("📻 Stations personnalisées")
              .setColor(0xf39c12)
              .setDescription(lines)
              .setFooter({ text: "!radio <clé> pour jouer · !radio remove <clé> pour supprimer (admin)" });
            await message.reply({ embeds: [customEmbed] });
            break;
          }

          // ── !radio remove <clé> ───────────────────────────────────────────
          if (sub === "remove") {
            const isAdminRemove = message.member?.permissions.has(PermissionFlagsBits.ManageGuild)
              || message.member?.permissions.has(PermissionFlagsBits.Administrator);
            if (!isAdminRemove) {
              await message.reply("❌ This command requires the **Manage Server** permission.");
              break;
            }
            const removeKey = args[1]?.toLowerCase();
            if (!removeKey) {
              await message.reply("❌ Format: `!radio remove <key>`\nExample: `!radio remove kbs2fm`");
              break;
            }
            if (removeKey in RADIO_STATIONS) {
              await message.reply("❌ Cannot remove a built-in station — only stations added via `!radio addurl` can be removed.");
              break;
            }
            const wasRemoved = await removeCustomRadio(removeKey);
            if (wasRemoved) {
              await message.reply(`✅ Station \`${removeKey}\` removed from custom stations.`);
            } else {
              await message.reply(`❌ Station \`${removeKey}\` not found in custom stations. Check with \`!radio custom\`.`);
            }
            break;
          }

          // ── !radio addurl <Nom> | <URL> ───────────────────────────────────
          if (sub === "addurl") {
            const isAdminAdd = message.member?.permissions.has(PermissionFlagsBits.ManageGuild)
              || message.member?.permissions.has(PermissionFlagsBits.Administrator);
            if (!isAdminAdd) {
              await message.reply(
                "❌ This command requires the **Manage Server** permission.\n" +
                "It allows you to add a custom radio station to `!radio`."
              );
              break;
            }

            // Parse: !radio addurl Nom Station | https://url
            const fullArg = args.slice(1).join(" ");
            const pipeIdx = fullArg.indexOf("|");
            let customName: string;
            let customUrl: string;

            if (pipeIdx > 0) {
              customName = fullArg.slice(0, pipeIdx).trim();
              customUrl  = fullArg.slice(pipeIdx + 1).trim();
            } else {
              // Try to find the URL in the args (starts with http)
              const urlArg = args.slice(1).find(a => a.startsWith("http"));
              if (urlArg) {
                customUrl  = urlArg;
                customName = args.slice(1).filter(a => a !== urlArg).join(" ").trim() || "Custom Radio";
              } else {
                await message.reply(
                  "❌ Format: `!radio addurl <Name> | <URL>`\n" +
                  "Example: `!radio addurl KBS World | https://stream.url.com/kbs`\n\n" +
                  "💡 For Korean radios: find the stream URL in your browser developer tools (Network tab → filter by `audio` or `media`) and paste it here."
                );
                break;
              }
            }

            if (!customUrl.startsWith("http")) {
              await message.reply("❌ L'URL doit commencer par `http://` ou `https://`.");
              break;
            }
            if (!customName) {
              await message.reply("❌ Le nom de la station ne peut pas être vide.");
              break;
            }

            // Generate a slug key from the name
            const customKey = customName.toLowerCase()
              .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
              .replace(/[^a-z0-9]/g, "")
              .slice(0, 20);
            if (!customKey) {
              await message.reply("❌ Le nom ne contient aucun caractère valide. Utilise des lettres ou chiffres.");
              break;
            }

            // Check for key conflict
            if (customKey in RADIO_STATIONS || customStations.has(customKey)) {
              await message.reply(
                `❌ La clé \`${customKey}\` (générée depuis le nom) est déjà utilisée.\n` +
                `Choisis un nom différent.`
              );
              break;
            }

            const testMsg = await message.reply(`⏳ Test de l'URL…`);

            try {
              // Quick connectivity test
              const testRes = await fetch(customUrl, {
                method: "HEAD",
                signal: AbortSignal.timeout(8000),
              }).catch(() =>
                fetch(customUrl, { signal: AbortSignal.timeout(10000) })
              );

              if (!testRes.ok && testRes.status !== 0) {
                await testMsg.edit(
                  `❌ The URL responded with \`HTTP ${testRes.status}\`. Make sure it is correct and accessible.`
                );
                break;
              }

              // Add to in-memory only first (so playRadio can find it)
              customStations.set(customKey, { name: customName, url: customUrl, emoji: "📻", genre: "Custom", lang: "fr" });

              await testMsg.edit(`✅ URL reachable! Connecting…`);

              // Play immediately
              await playRadio(message, customKey);

              // Ask admin whether to save permanently
              if (!message.channel.isSendable()) {
                await message.reply("❌ This channel does not support messages.");
                customStations.delete(customKey);
                break;
              }
              const saveMsg = await message.channel.send(
                `💾 Veux-tu ajouter **${customName}** (\`!radio ${customKey}\`) **en permanence** à la liste radio ?\n` +
                `✅ = Oui, sauvegarder pour tout le monde  ·  ❌ = Non, juste cette session`
              );
              await saveMsg.react("✅").catch(() => null);
              await saveMsg.react("❌").catch(() => null);

              const saveCollector = saveMsg.createReactionCollector({
                filter: (r, u) => ["✅", "❌"].includes(r.emoji.name ?? "") && !u.bot && u.id === message.author.id,
                time: 120_000,
                max: 1,
              });

              saveCollector.on("collect", async (reaction) => {
                if (reaction.emoji.name === "✅") {
                  await addCustomRadio(customKey, customName, customUrl, "📻", "Custom", "fr", message.author.id);
                  await saveMsg.edit(
                    `✅ **${customName}** sauvegardée ! Disponible pour tous avec \`!radio ${customKey}\`.\n` +
                    `Voir toutes les stations custom : \`!radio custom\` · Supprimer : \`!radio remove ${customKey}\``
                  );
                } else {
                  // Remove from in-memory (not saved to DB)
                  customStations.delete(customKey);
                  await saveMsg.edit(`👍 Station non sauvegardée. Elle était jouée pour cette session uniquement.`);
                }
              });

              saveCollector.on("end", (collected, reason) => {
                if (reason === "time" && collected.size === 0) {
                  // Auto-save after timeout? No, remove from memory silently.
                  customStations.delete(customKey);
                  saveMsg.edit(`⏰ Pas de réponse — station non sauvegardée.`).catch(() => null);
                }
              });

            } catch {
              customStations.delete(customKey);
              await testMsg.edit(
                `❌ Could not connect to the URL. Make sure it is accessible from the Internet.\n\n` +
                `💡 **Tip for Korean radios**: open the radio site in your browser, open developer tools (F12) → **Network** tab → filter by **Media** → start playback → copy the audio stream URL.`
              );
            }
            break;
          }

          // !radio <stationKey or multi-word name>
          await playRadio(message, args.join(" "));
          break;
        }

        // ── Radio shortcut !r ────────────────────────────────────────────────────
        case "r": {
          const sub = args[0]?.toLowerCase();
          if (!sub || sub === "list" || sub === "liste" || sub === "search" || sub === "recherche" || sub === "fr" || sub === "es" || sub === "en") {
            let page = langToPage((sub === "fr" || sub === "es" || sub === "en") ? sub : args[1]?.toLowerCase()) as 1 | 2 | 3;
            const radioMsg = await message.reply({ embeds: [buildRadioListEmbed(page)] });
            await radioMsg.react("⬅️").catch(() => null);
            await radioMsg.react("➡️").catch(() => null);
            const collector = radioMsg.createReactionCollector({
              filter: (rx, u) => ["⬅️", "➡️"].includes(rx.emoji.name ?? "") && !u.bot && u.id === message.author.id,
              idle: 30 * 60 * 1000,
            });
            collector.on("collect", async (reaction, user) => {
              if (reaction.emoji.name === "➡️") page = (page === 3 ? 1 : page + 1) as 1 | 2 | 3;
              if (reaction.emoji.name === "⬅️") page = (page === 1 ? 3 : page - 1) as 1 | 2 | 3;
              await radioMsg.edit({ embeds: [buildRadioListEmbed(page)] });
              await reaction.users.remove(user.id).catch(() => null);
            });
          } else if (sub === "leave" || sub === "stop") {
            await stopRadio(message);
          } else {
            await playRadio(message, args.join(" "));
          }
          break;
        }

        case "classic": {
          await playRadio(message, "classicfm");
          break;
        }

        // ── YouTube ──────────────────────────────────────────────────────────────
        case "youtube":
        case "yt":
        case "y":
        case "yb": {
          const sub = args[0]?.toLowerCase();
          if (sub === "search" || sub === "s") {
            // explicit search: !y search <keywords>
            const query = args.slice(1).join(" ");
            await searchAndQueue(message, query);
          } else if (!args[0]) {
            const ytEmbed = new EmbedBuilder()
              .setColor(0xed4245)
              .setTitle("▶️ YouTube — How to use")
              .addFields(
                { name: "`!y <song title>`",   value: "Search YouTube and pick from results *(no URL needed!)*", inline: false },
                { name: "`!y <url>`",          value: "Play a YouTube link directly",                           inline: false },
                { name: "`!skip`",             value: "Skip the current track",                                 inline: false },
                { name: "`!queue`",            value: "See what's coming up in the queue",                      inline: false },
                { name: "`!np`",               value: "Show the currently playing track",                       inline: false },
              )
              .setFooter({ text: "Tip: !y stromae papaoutai • !y https://youtu.be/… • !radio list" });
            await message.reply({ embeds: [ytEmbed] });
          } else {
            // URL → play directly; anything else (multi-word) → search
            const query = args.join(" ");
            await playYoutube(message, query);
          }
          break;
        }

        // ── Live Streams ──────────────────────────────────────────────────────────
        case "live": {
          const liveQuery = args.join(" ");
          if (!liveQuery) {
            await message.reply("❓ Provide a URL or search query.\nExamples: `!live https://www.twitch.tv/channel`  •  `!live lofi girl`");
            break;
          }
          await playLive(message, liveQuery);
          break;
        }

        // ── Skip ─────────────────────────────────────────────────────────────────
        case "skip": {
          await skipYoutube(message);
          break;
        }

        // ── Vote skip ─────────────────────────────────────────────────────────────
        case "voteskip":
        case "vs": {
          await startVoteSkip(message);
          break;
        }

        // ── Queue ─────────────────────────────────────────────────────────────────
        case "queue":
        case "q": {
          if (!message.guildId) break;
          const qEmbed = getQueueEmbed(message.guildId);
          if (!qEmbed) {
            await message.reply("🔇 The queue is empty. Use `!youtube <url>` or `!youtube search <keywords>` to add tracks.");
          } else {
            await message.reply({ embeds: [qEmbed] });
          }
          break;
        }

        // ── Now Playing ──────────────────────────────────────────────────────────
        case "np": {
          if (!message.guildId) break;
          const npEmbed = nowPlaying(message.guildId);
          if (!npEmbed) {
            await message.reply("🔇 Nothing is currently playing. Start with `!radio <station>` or `!youtube <url>`.");
          } else {
            await message.reply({ embeds: [npEmbed] });
          }
          break;
        }

        // ── Likes ────────────────────────────────────────────────────────────────
        case "likes":
        case "liked": {
          const userId = message.author.id;
          const sub = args[0]?.toLowerCase();

          if (sub === "play") {
            const liked = getLikes(userId);
            if (liked.length === 0) {
              await message.reply("💔 You have no liked tracks yet. Use the **💚 Like** button on a Now Playing embed to save a song.");
              break;
            }
            await message.reply(`🎵 Queuing **${liked.length} liked track${liked.length !== 1 ? "s" : ""}**…`);
            for (const track of liked) {
              await playYoutube(message, track.url);
            }
            break;
          }

          const liked = getLikes(userId);
          if (liked.length === 0) {
            const emptyEmbed = new EmbedBuilder()
              .setColor(0x57f287)
              .setTitle("💚 Your Liked Tracks")
              .setDescription("You haven't liked any tracks yet!\n\nWhen a YouTube video is playing, click the **💚 Like** button on the **🎵 Now Playing** embed to save it here.")
              .setFooter({ text: "!likes play — play your entire likes list" });
            await message.reply({ embeds: [emptyEmbed] });
            break;
          }

          const PAGE_SIZE = 10;
          const recentFirst = [...liked].reverse();
          const page = recentFirst.slice(0, PAGE_SIZE);
          const totalPages = Math.ceil(liked.length / PAGE_SIZE);

          const lines = page.map((t, i) => {
            const daysAgo = Math.floor((Date.now() - new Date(t.likedAt).getTime()) / 86_400_000);
            const when = daysAgo === 0 ? "today" : daysAgo === 1 ? "yesterday" : `${daysAgo}d ago`;
            return `**${i + 1}.** [${t.title}](${t.url}) — *${when}*`;
          });

          const likesEmbed = new EmbedBuilder()
            .setColor(0x57f287)
            .setTitle(`💚 Your Liked Tracks (${liked.length})`)
            .setDescription(lines.join("\n"))
            .setFooter({ text: `!likes play — queue all  •  Page 1/${totalPages}` });
          await message.reply({ embeds: [likesEmbed] });
          break;
        }

        // ── Karaoke ──────────────────────────────────────────────────────────────
        case "k":
        case "karaoke": {
          if (!message.guildId) break;
          const sub = args[0]?.toLowerCase();

          if (sub === "stop") {
            await stopKaraoke(message);
            break;
          }

          // Admin: !karaoke source youtube|soundcloud
          if (sub === "source") {
            const srcArg = args[1]?.toLowerCase();
            if (srcArg === "youtube" || srcArg === "soundcloud") {
              const member = message.member as GuildMember | null;
              if (!member?.permissions.has(PermissionFlagsBits.ManageGuild)) {
                await message.reply("❌ You need **Manage Server** permission to change karaoke settings.");
                break;
              }
              setGuildKaraokeSource(message.guildId, srcArg);
              await message.reply(`✅ Karaoke audio source set to **${srcArg === "youtube" ? "YouTube" : "SoundCloud"}** for this server.`);
            } else {
              const current = getGuildKaraokeSource(message.guildId);
              await message.reply(`❓ Usage: \`!karaoke source youtube\` or \`!karaoke source soundcloud\`\nCurrent source: **${current === "youtube" ? "YouTube" : "SoundCloud"}**`);
            }
            break;
          }

          // !karaoke offset <seconds> — adjust lyrics sync (e.g. 2 = lyrics 2 s behind audio)
          if (sub === "offset") {
            const secArg = parseFloat(args[1] ?? "");
            if (isNaN(secArg) || secArg < 0 || secArg > 10) {
              await message.reply("❓ Usage: `!karaoke offset <seconds>`\nExample: `!karaoke offset 2` (lyrics start 2 s after audio)\nRange: 0–10 s · Default: 2 s");
              break;
            }
            setKaraokeOffset(message.guildId, Math.round(secArg * 1000));
            await message.reply(`✅ Karaoke sync offset set to **${secArg} s** — takes effect on the next song.`);
            break;
          }

          const karaokeQuery = args.join(" ").trim();
          await startKaraoke(message, karaokeQuery);
          break;
        }

        // ── Shazam ───────────────────────────────────────────────────────────────
        case "shazam": {
          await shazam(message);
          break;
        }

        // ── Playlist ─────────────────────────────────────────────────────────────
        case "playlist": {
          if (!message.guildId) break;
          const guildId = message.guildId;
          const sub = args[0]?.toLowerCase();

          if (!sub || sub === "list") {
            await message.reply({ embeds: [await listPlaylists(guildId)] });
            break;
          }

          if (sub === "add") {
            const name = args[1];
            const url = args[2];
            if (!name || !url) {
              await message.reply("❓ Usage: `!playlist add <name> <youtube-url>`\nExample: `!playlist add chill https://www.youtube.com/watch?v=...`");
              break;
            }
            if (!url.includes("youtube.com/") && !url.includes("youtu.be/")) {
              await message.reply("❌ Please provide a valid YouTube URL.");
              break;
            }
            const { index } = await addToPlaylist(guildId, name, url);
            await message.reply(`✅ Added to playlist **${name}** (${index} video${index !== 1 ? "s" : ""} total).`);
            break;
          }

          if (sub === "show") {
            const name = args[1];
            if (!name) { await message.reply("❓ Usage: `!playlist show <name>`"); break; }
            const embed = await showPlaylist(guildId, name);
            if (!embed) { await message.reply(`❌ Playlist **${name}** not found. Use \`!playlist list\` to see all playlists.`); break; }
            await message.reply({ embeds: [embed] });
            break;
          }

          if (sub === "play") {
            const name = args[1];
            if (!name) { await message.reply("❓ Usage: `!playlist play <name>`"); break; }
            await playPlaylist(message, name);
            break;
          }

          if (sub === "delete" || sub === "remove") {
            const name = args[1];
            if (!name) { await message.reply(`❓ Usage: \`!playlist ${sub} <name>\``); break; }
            const deleted = await removePlaylist(guildId, name);
            if (!deleted) { await message.reply(`❌ Playlist **${name}** not found.`); break; }
            await message.reply(`🗑️ Playlist **${name}** deleted.`);
            break;
          }

          await message.reply(
            "❓ Unknown subcommand.\n" +
            "`!playlist list` — see all playlists\n" +
            "`!playlist add <name> <url>` — add a video\n" +
            "`!playlist show <name>` — list videos in a playlist\n" +
            "`!playlist play <name>` — play a playlist in voice\n" +
            "`!playlist delete <name>` — remove a playlist"
          );
          break;
        }

        // ── Credits ──────────────────────────────────────────────────────────────
        case "credits": {
          const embed = new EmbedBuilder()
            .setTitle("✨ Project Credits")
            .setColor(0x5865f2)
            .setDescription("This bot wouldn't exist without these technologies and people. Thank you all! 🙏")
            .addFields(
              { name: "👨‍💻 Creator", value: "**Maxime** — Design, development & ideas", inline: false },
              { name: "🧠 AI Assistants", value: "**Claude** — Suggestions & problem-solving\n**ChatGPT** — Creative vision", inline: false },
              { name: "🤖 Artificial Intelligence", value: "**Meta LLaMA** — AI model (via Groq)\n**Suno AI** — Music generation", inline: false },
              { name: "🔊 Voice & Images", value: "**Google Translate** — Text-to-speech (free TTS)\n**HuggingFace / FLUX** — Image generation", inline: false },
              { name: "🚀 Infrastructure", value: "**Railway** — Hosting & deployment\n**Replit** — Development environment\n**GitHub** — Version control & collaboration", inline: false },
              { name: "🛠️ Technologies", value: "**discord.js** — Discord API\n**Node.js + TypeScript** — Runtime & language\n**Express** — API server", inline: false },
            )
            .setFooter({ text: "Made with ❤️ by Maxime • www.maximeGPT.com" });
          await message.reply({ embeds: [embed] });
          break;
        }

        // ── Website viewer ────────────────────────────────────────────────────────
        case "website":
        case "site": {
          await message.reply(buildWebsiteMessage(0));
          break;
        }

        // ── Birthday ──────────────────────────────────────────────────────────────
        case "anniversaire":
        case "b":
        case "birthday": {
          await handleBirthday(message, args);
          break;
        }

        // ── Sondage ───────────────────────────────────────────────────────────────
        case "sondage":
        case "poll": {
          await handlePollCommand(message, args, responseLang);
          break;
        }

        // ── Quest tracker ─────────────────────────────────────────────────────────
        case "quests":
        case "quest": {
          const sub = args[0]?.toLowerCase();
          if (!sub || sub === "start") {
            await startQuestSetup(message, openai);
          } else if (sub === "list") {
            await showQuestList(message);
          } else if (sub === "done") {
            if (args[1]?.toLowerCase() === "all") await markAllQuestsDone(message);
            else await markQuestDone(message, args[1] ?? "");
          } else if (sub === "profile" || sub === "profil") {
            await showQuestProfile(message);
          } else if (sub === "reset") {
            await resetQuests(message);
          } else if (sub === "remind") {
            await setReminderChannel(message);
          } else if (sub === "schedule") {
            await setSchedule(message, args.slice(1).join(" "));
          } else if (sub === "stats") {
            await showQuestStats(message);
          } else if (sub === "add") {
            const objective = args.slice(1).join(" ");
            await addQuestWithCoach(message, objective, openai);
          } else if (sub === "bully") {
            const toggle = args[1]?.toLowerCase();
            if (toggle === "on") await setBullyMode(message, true);
            else if (toggle === "off") await setBullyMode(message, false);
            else await message.reply("❓ Usage: `!quest bully on` or `!quest bully off`");
          } else if (sub === "negotiate") {
            await negotiateQuests(message, openai);
          } else {
            await message.reply("❓ Commands: `!quest start` · `!quest add <goal>` · `!quest list` · `!quest done <n>` · `!quest profile` · `!quest negotiate` · `!quest reset`");
          }
          break;
        }

        // ── Profile ───────────────────────────────────────────────────────────────
        case "profile":
        case "profil": {
          const target = message.mentions.users.first() ?? message.author;
          const isSelf = target.id === message.author.id;

          const lang = getEffectiveLanguage(message.guildId, isSelf ? message.author.id : target.id);
          const langLabel = USER_LANG_LABELS[lang] ?? "🇬🇧 English";

          const questData = getUserQuestData(target.id);
          const displayName = target.displayName ?? target.username;
          const level = questData?.levelNum ?? 1;

          // Expression & color evolve with level (DiceBear avataaars)
          const MII_FACES: Record<number, { mouth: string; eyes: string; eyebrows: string }> = {
            1: { mouth: "sad",     eyes: "cry",     eyebrows: "sadConcernedNatural"  },
            2: { mouth: "serious", eyes: "default",  eyebrows: "defaultNatural"       },
            3: { mouth: "default", eyes: "default",  eyebrows: "defaultNatural"       },
            4: { mouth: "smile",   eyes: "squint",   eyebrows: "defaultNatural"       },
            5: { mouth: "smile",   eyes: "happy",    eyebrows: "raisedExcited"        },
            6: { mouth: "twinkle", eyes: "happy",    eyebrows: "raisedExcited"        },
            7: { mouth: "twinkle", eyes: "happy",    eyebrows: "raisedExcitedNatural" },
            8: { mouth: "twinkle", eyes: "hearts",   eyebrows: "raisedExcited"        },
            9: { mouth: "twinkle", eyes: "hearts",   eyebrows: "raisedExcited"        },
          };
          const LEVEL_COLORS: Record<number, number> = {
            1: 0x7f8c8d, 2: 0x95a5a6,
            3: 0x3498db, 4: 0x2980b9,
            5: 0x2ecc71, 6: 0x27ae60,
            7: 0xf1c40f, 8: 0xe67e22,
            9: 0x9b59b6,
          };
          const face = MII_FACES[level] ?? MII_FACES[1]!;
          const embedColor = LEVEL_COLORS[level] ?? 0x9b59b6;

          const miiUrl = [
            `https://api.dicebear.com/9.x/avataaars/png`,
            `?seed=${target.id}`,
            `&backgroundColor=b6e3f4,c0aede,d1d4f9,ffdfbf,ffd5dc`,
            `&radius=50&size=256`,
            `&mouth=${face.mouth}`,
            `&eyes=${face.eyes}`,
            `&eyebrows=${face.eyebrows}`,
          ].join("");

          const embed = new EmbedBuilder()
            .setTitle(`🎮 ${displayName}'s Profile`)
            .setColor(embedColor)
            .setThumbnail(miiUrl);

          if (questData) {
            // XP progress bar
            if (questData.progressBar && questData.nextThreshold !== null) {
              embed.setDescription(
                `\`[${questData.progressBar}]\` **${questData.totalPoints}** / ${questData.nextThreshold} XP`,
              );
            } else {
              embed.setDescription("🌌 **Max level reached! You are Transcendent!**");
            }
            embed.addFields(
              { name: "🏅 Level", value: `${questData.levelTitle} (Lv. ${questData.levelNum})`, inline: true },
              { name: "⚡ Total XP", value: `${questData.totalPoints} pts`, inline: true },
              { name: "\u200b", value: "\u200b", inline: true },
              { name: "✅ Quests done", value: `${questData.completedCount}`, inline: true },
              { name: "📋 Active", value: `${questData.activeCount}`, inline: true },
              { name: "\u200b", value: "\u200b", inline: true },
              { name: "💬 Reminder mode", value: questData.bullying ? "🔥 Bully mode" : "🕊️ Normal", inline: true },
              {
                name: "🔔 Reminders",
                value: questData.reminderActive
                  ? `Active (${questData.reminderHours.map(h => `${h}h`).join(", ")} UTC)`
                  : "Not configured",
                inline: true,
              },
              { name: "\u200b", value: "\u200b", inline: true },
            );
          } else {
            embed.setDescription("No quest data yet — start your journey with `!quest start`! 🚀");
          }

          embed.addFields(
            { name: "🌐 Language", value: langLabel, inline: true },
            {
              name: "📅 Member since",
              value: questData ? new Date(questData.createdAt).toLocaleDateString(lang) : "—",
              inline: true,
            },
          );

          embed.setFooter({ text: isSelf ? "Use !language [en|fr|es|de|pt|it|ja|nl|ru|pl|tr] to change your language" : `Viewing ${displayName}'s profile` });

          await message.reply({ embeds: [embed] });
          break;
        }

        // ── User language ─────────────────────────────────────────────────────────
        case "language":
        case "langue":
        case "lang":
        case "langage": {
          const input = args[0]?.toLowerCase();
          const currentLang = getEffectiveLanguage(message.guildId, message.author.id);
          const personalOverride = getUserLangOverride(message.author.id);
          if (!input) {
            await message.reply(
              `${botText(currentLang, "languageCurrent", USER_LANG_LABELS[currentLang])}\n` +
              `${botText(currentLang, "languageOptions")}\n` +
              `\`${guildPrefix}language en\` — 🇬🇧 English\n` +
              `\`${guildPrefix}language fr\` — 🇫🇷 Français\n` +
              `\`${guildPrefix}language es\` — 🇪🇸 Español\n` +
              `\`${guildPrefix}language de\` — 🇩🇪 Deutsch\n` +
              `\`${guildPrefix}language pt\` — 🇧🇷 Português\n` +
              `\`${guildPrefix}language it\` — 🇮🇹 Italiano\n` +
              `\`${guildPrefix}language ja\` — 🇯🇵 日本語\n` +
              `\`${guildPrefix}language nl\` — 🇳🇱 Nederlands\n` +
              `\`${guildPrefix}language ru\` — 🇷🇺 Русский\n` +
              `\`${guildPrefix}language pl\` — 🇵🇱 Polski\n` +
              `\`${guildPrefix}language tr\` — 🇹🇷 Türkçe\n` +
              `${botText(currentLang, "languageResetOption", guildPrefix)}`,
            );
            break;
          }
          if (input === "reset" || input === "server" || input === "default") {
            clearUserLang(message.author.id);
            const inheritedLang = getEffectiveLanguage(message.guildId, message.author.id);
            await message.reply(botText(inheritedLang, "languageReset", USER_LANG_LABELS[inheritedLang]));
            break;
          }
          if (!isValidUserLang(input)) {
            await message.reply(botText(currentLang, "languageInvalid", guildPrefix));
            break;
          }
          if (input === personalOverride) {
            await message.reply(botText(currentLang, "languageAlready", USER_LANG_LABELS[input]));
            break;
          }
          setUserLang(message.author.id, input);
          await message.reply(botText(input, "languageChanged", USER_LANG_LABELS[input]));
          break;
        }

        // ── Server settings ───────────────────────────────────────────────────────
        case "server": {
          const sub = args[0]?.toLowerCase();
          if (sub === "language" || sub === "langue" || sub === "lang" || sub === "langage") {
            const guildId = message.guildId;
            if (!guildId) { await message.reply("❌ This command can only be used in a server."); break; }
            const langArg = args[1]?.toLowerCase();
            const currentGuildLang = getLang(guildId);
            const GUILD_LANG_LABELS = USER_LANG_LABELS;
            if (!langArg) {
              await message.reply(
                `${botText(responseLang, "serverLanguageCurrent", GUILD_LANG_LABELS[currentGuildLang] ?? currentGuildLang)}\n` +
                `${botText(responseLang, "serverLanguageOptions")}\n` +
                `\`${guildPrefix}server language en\` — 🇬🇧 English\n` +
                `\`${guildPrefix}server language fr\` — 🇫🇷 Français\n` +
                `\`${guildPrefix}server language es\` — 🇪🇸 Español\n` +
                `\`${guildPrefix}server language de\` — 🇩🇪 Deutsch\n` +
                `\`${guildPrefix}server language pt\` — 🇧🇷 Português\n` +
                `\`${guildPrefix}server language it\` — 🇮🇹 Italiano\n` +
                `\`${guildPrefix}server language ja\` — 🇯🇵 日本語\n` +
                `\`${guildPrefix}server language nl\` — 🇳🇱 Nederlands\n` +
                `\`${guildPrefix}server language ru\` — 🇷🇺 Русский\n` +
                `\`${guildPrefix}server language pl\` — 🇵🇱 Polski\n` +
                `\`${guildPrefix}server language tr\` — 🇹🇷 Türkçe`,
              );
              break;
            }
            const isAdmin =
              message.member?.permissions.has(PermissionFlagsBits.Administrator) ||
              message.member?.permissions.has(PermissionFlagsBits.ManageGuild);
            if (!isAdmin) { await message.reply(botText(responseLang, "serverLanguageAdminOnly")); break; }
            if (!isValidUserLang(langArg)) {
              await message.reply(botText(responseLang, "serverLanguageInvalid", guildPrefix));
              break;
            }
            if (langArg === currentGuildLang) {
              await message.reply(botText(responseLang, "serverLanguageAlready", GUILD_LANG_LABELS[langArg]));
              break;
            }
            setLang(guildId, langArg);
            await message.reply(botText(responseLang, "serverLanguageChanged", GUILD_LANG_LABELS[langArg]));
          } else {
            await message.reply(`❓ Unknown server command. Try \`${guildPrefix}server language [en|fr|es|de|pt|it|ja|nl|ru|pl|tr]\`.`);
          }
          break;
        }

        // ── Help ─────────────────────────────────────────────────────────────────
        case "help":
        case "aide": {
          const arg0 = (args[0] ?? "").toLowerCase();
          const arg1 = (args[1] ?? "").toLowerCase();

          // Owner-only guide — !help Maxim3kun
          if (arg0 === "maxim3kun") {
            if (message.author.username.toLowerCase() !== "maxim3kun") {
              await message.reply("🔒 Owner-only command.");
              break;
            }
            const ownerEmbed = new EmbedBuilder()
              .setTitle("👑 Owner Commands — Maxim3kun")
              .setColor(0xf1c40f)
              .setDescription("Owner-only commands, visible only to you.")
              .addFields(
                {
                  name: "🔧 Diagnostics & Status",
                  value:
                    `\`${guildPrefix}status\` — Full bot status (RAM, MongoDB, Groq, Suno…)\n` +
                    `\`${guildPrefix}yt-test\` — Test YouTube cookies & yt-dlp live`,
                  inline: false,
                },
                {
                  name: "🛡️ Moderation",
                  value:
                    `\`${guildPrefix}unblock @user\` — Unblock a user\n` +
                    `\`${guildPrefix}banlist\` — List blocked users\n` +
                    `\`${guildPrefix}admin channel #channel\` — Set the admin notification channel`,
                  inline: false,
                },
                {
                  name: "📻 Radios custom",
                  value:
                    `\`${guildPrefix}radio add <clé> <nom> <url>\` — Ajoute une station\n` +
                    `\`${guildPrefix}radio remove <clé>\` — Supprime une station custom`,
                  inline: false,
                },
                {
                  name: "🎨 Logo Brands (admin)",
                  value:
                    `\`${guildPrefix}logo test\` — Lance les tests OCR sur les logos\n` +
                    `\`${guildPrefix}logo approve <domain>\` — Approuve manuellement un logo\n` +
                    `\`${guildPrefix}logo exclude <domain>\` — Exclut manuellement un logo`,
                  inline: false,
                },
                {
                  name: "⚙️ Serveur",
                  value:
                    `\`${guildPrefix}prefix <nouveau>\` — Change le préfixe\n` +
                    `\`${guildPrefix}server language [en|fr|es|de|pt|it|ja|nl|ru|pl|tr]\` — Langue par défaut\n` +
                    `\`${guildPrefix}voicechannels <id1> <id2>\` — Salons vocaux du picker`,
                  inline: false,
                },
              )
              .setFooter({ text: "Ces commandes ne sont pas listées dans !help public." });
            await message.reply({ embeds: [ownerEmbed] });
            break;
          }

          // Admin commands guide — !help admin
          if (arg0 === "admin") {
            await sendAdminGuide(message, guildPrefix, responseLang);
            break;
          }

          // Setup guide (API keys) — !help setup
          if (arg0 === "setup") {
            await sendSetupGuide(message, responseLang);
            break;
          }

          // Plain `!help`, `!help fr`, `!help es`, `!help de`, `!help pt`, `!help it` → paginated help
          if (!arg0 || arg0 === "fr" || arg0 === "es" || arg0 === "en" || arg0 === "de" || arg0 === "pt" || arg0 === "it" || arg0 === "ja" || arg0 === "nl" || arg0 === "ru" || arg0 === "pl" || arg0 === "tr") {
            const helpLang: HelpLanguage = arg0 ? parseLanguage(arg0) : responseLang;
            await sendHelpPaginator(message, helpLang);
            break;
          }

          // Topic-specific help
          const detected = resolveTopicKey(arg0, isValidUserLang(arg1) ? parseLanguage(arg1) : responseLang);
          if (detected) {
            if (detected.topic === "guesslogo" && !message.member?.permissions.has(PermissionFlagsBits.ManageGuild)) {
              await message.reply({ content: "🔒 The `!help guesslogo` page is restricted to moderators (requires **Manage Server** permission).", ephemeral: true } as Parameters<typeof message.reply>[0]);
              break;
            }
            await message.reply({ embeds: [buildTopicEmbed(detected.topic, detected.lang, guildPrefix)] });
          } else {
            await sendHelpPaginator(message, responseLang);
          }
          break;
        }

        default: {
          // Direct radio station shortcut — e.g. !nrj, !heart, !kexp
          if (command && command in RADIO_STATIONS) {
            await playRadio(message, command);
            break;
          }

          // Compound station shortcut — e.g. !rock es → rock_es, !cadena 100 → cadena100
          if (command && args[0]) {
            const compound = `${command}_${args[0].toLowerCase()}`;
            if (compound in RADIO_STATIONS) {
              await playRadio(message, compound);
              break;
            }
          }

          // If command matches a known artist in the cache, treat as a music search
          if (command && isKnownArtist(command)) {
            await searchAndQueue(message, args.length > 0 ? `${command} ${args.join(" ")}` : command);
            break;
          }

          // Fuzzy command suggestion (with opt-in preference per user)
          if (!command) break;

          await handleUnknownCommand(message, command, guildPrefix, async (match) => {
            switch (match.cmd) {
              case "hello":
                await message.reply(directGreeting(message, responseLang));
                break;
              case "say": {
                const text = args.join(" ");
                if (!text) { await message.reply(botText(responseLang, "sayPrompt", guildPrefix)); break; }
                await message.delete().catch(() => null);
                if (isSendable(message.channel)) await message.channel.send(text);
                break;
              }
              case "compliment": {
                const lang = args[0] ? parseLanguage(args[0]) : responseLang;
                const list = lang === "fr" ? COMPLIMENTS_FR : lang === "es" ? COMPLIMENTS_ES : lang === "de" ? COMPLIMENTS_DE : lang === "pt" ? COMPLIMENTS_PT : lang === "it" ? COMPLIMENTS_IT : lang === "ja" ? COMPLIMENTS_JA : lang === "nl" ? COMPLIMENTS_NL : lang === "ru" ? COMPLIMENTS_RU : lang === "pl" ? COMPLIMENTS_PL : lang === "tr" ? COMPLIMENTS_TR : COMPLIMENTS;
                await message.reply(`${message.author.displayName}, ${getRandom(list)}`);
                break;
              }
              case "joke": {
                const lang = args[0] ? parseLanguage(args[0]) : responseLang;
                const list = lang === "fr" ? JOKES_FR : lang === "es" ? JOKES_ES : lang === "de" ? JOKES_DE : lang === "pt" ? JOKES_PT : lang === "it" ? JOKES_IT : lang === "ja" ? JOKES_JA : lang === "nl" ? JOKES_NL : lang === "ru" ? JOKES_RU : lang === "pl" ? JOKES_PL : lang === "tr" ? JOKES_TR : JOKES;
                await message.reply(getRandom(list));
                break;
              }
              case "encouragement": {
                const lang = args[0] ? parseLanguage(args[0]) : responseLang;
                const list = lang === "fr" ? ENCOURAGEMENTS_FR : lang === "es" ? ENCOURAGEMENTS_ES : lang === "de" ? ENCOURAGEMENTS_DE : lang === "pt" ? ENCOURAGEMENTS_PT : lang === "it" ? ENCOURAGEMENTS_IT : lang === "ja" ? ENCOURAGEMENTS_JA : lang === "nl" ? ENCOURAGEMENTS_NL : lang === "ru" ? ENCOURAGEMENTS_RU : lang === "pl" ? ENCOURAGEMENTS_PL : lang === "tr" ? ENCOURAGEMENTS_TR : ENCOURAGEMENTS;
                await message.reply(`${message.author.displayName}, ${getRandom(list)}`);
                break;
              }
              case "hug": {
                const lang = args[0] ? parseLanguage(args[0]) : responseLang;
                const list = lang === "fr" ? HUGS_FR : lang === "es" ? HUGS_ES : lang === "de" ? HUGS_DE : lang === "pt" ? HUGS_PT : lang === "it" ? HUGS_IT : lang === "ja" ? HUGS_JA : lang === "nl" ? HUGS_NL : lang === "ru" ? HUGS_RU : lang === "pl" ? HUGS_PL : lang === "tr" ? HUGS_TR : HUGS;
                await message.reply(`${message.author.displayName}, ${getRandom(list)}`);
                break;
              }
              case "8ball": {
                const question = args.join(" ");
                if (!question) { await message.reply(botText(responseLang, "eightBallPrompt", guildPrefix)); break; }
                const answers = responseLang === "fr" ? EIGHT_BALL_RESPONSES_FR : responseLang === "es" ? EIGHT_BALL_RESPONSES_ES : responseLang === "de" ? EIGHT_BALL_RESPONSES_DE : responseLang === "pt" ? EIGHT_BALL_RESPONSES_PT : responseLang === "it" ? EIGHT_BALL_RESPONSES_IT : responseLang === "ja" ? EIGHT_BALL_RESPONSES_JA : responseLang === "nl" ? EIGHT_BALL_RESPONSES_NL : responseLang === "ru" ? EIGHT_BALL_RESPONSES_RU : responseLang === "pl" ? EIGHT_BALL_RESPONSES_PL : responseLang === "tr" ? EIGHT_BALL_RESPONSES_TR : EIGHT_BALL_RESPONSES;
                await message.reply(`${botText(responseLang, "eightBallQuestion", question)}\n${botText(responseLang, "eightBallAnswer", getRandom(answers))}`);
                break;
              }
              case "dice": {
                const faces = parseInt(args[0] ?? "6");
                const nb = isNaN(faces) || faces < 2 ? 6 : Math.min(faces, 1000);
                await message.reply(botText(responseLang, "diceResult", String(nb), String(Math.floor(Math.random() * nb) + 1)));
                break;
              }
              case "conspiracy":
                await message.reply(`🕵️ Type \`${guildPrefix}conspiracy ${args.join(" ")}\` to generate a theory!`);
                break;
              case "minesweeper": {
                const board = playMinesweeper(message, args[0]?.toLowerCase());
                if (board) await message.reply(board);
                break;
              }
              case "geo":
                playGeoguessr(message, (["easy","medium","hard"].includes(args[0] ?? "") ? args[0] : "easy") as "easy" | "medium" | "hard")
                  .catch(() => null);
                break;
              case "trivia":
                if (!openai) { await message.reply("❌ AI features not configured. Use `!mode d'emploi` for instructions."); break; }
                playTrivia(message, openai).catch(() => null);
                break;
              case "guessnumber":
                playGuessNumber(message).catch(() => null);
                break;
              case "connect4":
                await playConnect4(message, args);
                break;
              case "guessthelogo":
              case "guesslogo":
              case "devinelelogo": {
                const logoSub = args[0]?.toLowerCase();
                if (logoSub === "stop") {
                  if (isLogoActive(message.channelId)) { stopGuessLogo(message.channelId); await message.reply("🏳️ Logo game abandoned!"); }
                  else { await message.reply("🤷 No logo game in progress."); }
                } else {
                  const ld = logoSub && ["easy","medium","hard"].includes(logoSub) ? logoSub : "easy";
                  playGuessLogo(message, ld).catch(() => null);
                }
                break;
              }
              case "logo": {
                const lSub = args[0]?.toLowerCase();
                const lArg = args[1]?.toLowerCase();
                if (lSub === "stats") {
                  const s = getStoreStats();
                  const embed = new EmbedBuilder()
                    .setTitle("🏷️ Logo Brand Store — Stats")
                    .setColor(0x5865f2)
                    .addFields(
                      { name: "Total", value: `**${s.total}**`, inline: true },
                      { name: "Tested", value: `**${s.tested}** / ${s.total}`, inline: true },
                      { name: "Untested", value: `**${s.untested}**`, inline: true },
                      { name: "✅ Approved", value: `**${s.approved}**`, inline: true },
                      { name: "📝 Text logos", value: `**${s.textLogos}**`, inline: true },
                      { name: "❌ Invalid", value: `**${s.invalid}**`, inline: true },
                    );
                  await message.reply({ embeds: [embed] });
                } else if (lSub === "test" && (lArg === "start" || lArg === "all")) {
                  if (!message.member?.permissions.has(PermissionFlagsBits.ManageGuild)) { await message.reply("🔒 Manage Server required."); break; }
                  if (isTestingRunning()) { await message.reply("⏳ Test already running. Use `!logo test status`."); break; }
                  const token = process.env["LOGO_DEV_PUBLIC_KEY"] ?? process.env["LOGO_DEV_TOKEN"] ?? "";
                  startLogoTestingJob(token, lArg === "all");
                  const s2 = getStoreStats();
                  const n = lArg === "all" ? s2.total : s2.untested;
                  await message.reply(`🔬 Testing **${n}** brands in background. Use \`!logo test status\` to follow progress.`);
                } else if (lSub === "test" && lArg === "status") {
                  const p = getTestingProgress();
                  const pct = p.total > 0 ? Math.round((p.done / p.total) * 100) : 0;
                  await message.reply(p.total === 0
                    ? "💤 No test job run yet."
                    : `🔬 ${p.running ? "Running" : "Last run"}: **${pct}%** (${p.done}/${p.total}) — ✅ ${p.approved} approved, 📝 ${p.textLogos} text, ❌ ${p.invalid} invalid`);
                } else if (lSub === "fetch") {
                  if (!message.member?.permissions.has(PermissionFlagsBits.ManageGuild)) { await message.reply("🔒 Manage Server required."); break; }
                  const token = process.env["LOGO_DEV_PUBLIC_KEY"] ?? process.env["LOGO_DEV_TOKEN"] ?? "";
                  if (!token) { await message.reply("❌ `LOGO_DEV_PUBLIC_KEY` is not set. Ask a moderator to configure it."); break; }
                  const statusMsg = await message.reply(
                    `🔍 Searching logos across **36 categories** on logo.dev...\n` +
                    `This fetches all discoverable brands and saves them to the database. Please wait (~30s).`,
                  );
                  // Run in background — uses the existing loadDynamicBrands pipeline
                  (async () => {
                    try {
                      const before = getStoreStats();
                      // Fetch all brands from logo.dev across 36 search terms
                      const discovered = await loadDynamicBrands(token);
                      let added = 0;
                      let skipped = 0;
                      for (const brand of discovered) {
                        const result = await addBrandToStore({
                          domain: brand.domain,
                          name: brand.name,
                          tier: brand.tier,
                          aliases: brand.aliases,
                          category: brand.category,
                          country: brand.country,
                          hints: brand.hints,
                        });
                        if (result.ok) added++;
                        else skipped++;
                      }
                      const after = getStoreStats();
                      // Kick off OCR validation for newly added logos
                      if (added > 0 && !isTestingRunning()) {
                        startLogoTestingJob(token, false);
                      }
                      await statusMsg.edit(
                        `✅ **Logo fetch complete!**\n` +
                        `• **${discovered.length}** brands discovered from logo.dev\n` +
                        `• **${added}** new brands added to the store\n` +
                        `• **${skipped}** already existed (skipped)\n` +
                        `• Store: **${after.total}** total (was ${before.total}) — **${after.approved}** approved\n` +
                        (added > 0 ? `• 🔬 OCR validation started automatically — use \`!logo test status\` to track.` : ""),
                      );
                    } catch (err) {
                      logger.error({ err }, "Logo fetch job failed");
                      await statusMsg.edit("❌ Logo fetch failed. Check that `LOGO_DEV_PUBLIC_KEY` is valid and try again.").catch(() => null);
                    }
                  })().catch(() => null);
                } else {
                  await message.reply("`!logo stats` • `!logo fetch` • `!logo test start` • `!logo test all` • `!logo test status`");
                }
                break;
              }
              case "music":
                await message.reply(`🎵 Usage: \`${guildPrefix}music generator <description>\`\nExample: \`${guildPrefix}music generator lo-fi chill beats\``);
                break;
              case "credits": {
                const credEmbed = new EmbedBuilder()
                  .setTitle("✨ Project Credits")
                  .setColor(0x5865f2)
                  .setDescription("This bot wouldn't exist without these technologies and people. Thank you all! 🙏")
                  .addFields(
                    { name: "👨‍💻 Creator", value: "**Maxime** — Design, development & ideas", inline: false },
                    { name: "🧠 AI Assistants", value: "**Claude** — Suggestions & problem-solving\n**ChatGPT** — Creative vision", inline: false },
                    { name: "🤖 Artificial Intelligence", value: "**Meta LLaMA** — AI model (via Groq)\n**Suno AI** — Music generation", inline: false },
                    { name: "🔊 Voice & Images", value: "**Google Translate** — Text-to-speech (free TTS)\n**HuggingFace / FLUX** — Image generation", inline: false },
                    { name: "🚀 Infrastructure", value: "**Railway** — Hosting & deployment\n**Replit** — Development environment", inline: false },
                    { name: "🛠️ Technologies", value: "**discord.js** — Discord API\n**Node.js + TypeScript** — Runtime & language", inline: false },
                  )
                  .setFooter({ text: "Made with ❤️ by Maxime • www.maximeGPT.com" });
                await message.reply({ embeds: [credEmbed] });
                break;
              }
              case "balance":
                if (!process.env["SUNO_API_KEY"]) { await message.reply("❌ Suno not configured."); break; }
                try {
                  const bal = await getCredits();
                  const balEmbed = new EmbedBuilder()
                    .setColor(bal > 10 ? 0x57f287 : bal > 0 ? 0xfee75c : 0xed4245)
                    .setTitle("💳 Suno Credits")
                    .addFields({ name: "Remaining credits", value: `${bal}`, inline: true })
                    .setFooter({ text: "Each generation consumes credits from sunoapi.org" });
                  await message.reply({ embeds: [balEmbed] });
                } catch (err) {
                  await message.reply(`❌ Could not fetch credits: ${String(err)}`);
                }
                break;
              case "radio":
                await playRadio(message, args.join(" ") || "list");
                break;
              case "youtube": {
                if (args[0]?.toLowerCase() === "search") {
                  await searchAndQueue(message, args.slice(1).join(" "));
                } else {
                  await playYoutube(message, args.join(" "));
                }
                break;
              }
              case "live": {
                await playLive(message, args.join(" "));
                break;
              }
              case "skip":
                await skipYoutube(message);
                break;
              case "voteskip":
                await startVoteSkip(message);
                break;
              case "queue": {
                if (!message.guildId) break;
                const qEmbed = getQueueEmbed(message.guildId);
                if (!qEmbed) await message.reply("🔇 The queue is empty. Use `!youtube <url>` to add tracks.");
                else await message.reply({ embeds: [qEmbed] });
                break;
              }
              case "np": {
                if (!message.guildId) break;
                const npEmbed = nowPlaying(message.guildId);
                if (!npEmbed) await message.reply("🔇 Nothing is currently playing.");
                else await message.reply({ embeds: [npEmbed] });
                break;
              }
              case "join":
                await joinVoice(message);
                break;
              case "leave":
                await leaveVoice(message);
                break;
              case "voice":
                await handleVoiceCommand(message, args);
                break;
              case "subtitles":
                await toggleSubtitles(message);
                break;
              case "karaoke":
                if (!message.guildId) break;
                await startKaraoke(message, args.join(" ").trim());
                break;
              case "shazam":
                await shazam(message);
                break;
              case "playlist":
                await message.reply(`📁 Usage: \`${guildPrefix}playlist add <nom> <url>\` · \`${guildPrefix}playlist play <nom>\` · \`${guildPrefix}playlist list\``);
                break;
              case "ask":
                await answerAiQuestion(message, args.join(" "), responseLang, guildPrefix);
                break;
              case "ai":
                await message.reply(`🤖 Usage: \`${guildPrefix}ai battle <sujet>\` · \`${guildPrefix}ai stop\``);
                break;
              case "image":
                await message.reply("🖼️ Use the slash command `/image <description>` to generate an image.");
                break;
              case "help":
                await sendHelpPaginator(message, responseLang);
                break;
              case "guide":
                await sendSetupGuide(message, responseLang);
                break;
              case "birthday":
                await handleBirthday(message, args);
                break;
              case "poll":
                await message.reply(`📊 Usage: \`${guildPrefix}poll Question | Option 1 | Option 2 | ...\``);
                break;
              case "quest":
                await message.reply(`⚔️ Usage: \`${guildPrefix}quest\` · \`${guildPrefix}quest list\` · \`${guildPrefix}quest done <n>\` · \`${guildPrefix}quest profile\``);
                break;
              case "prefix":
                await message.reply(`⚙️ Current prefix: \`${guildPrefix}\` · Change: \`${guildPrefix}prefix <new>\` (admin only)`);
                break;
              case "suggest":
              case "suggestion":
              case "sugerencia": {
                const current = getSuggestPref(message.author.id);
                const status  = current === true ? "**on** ✅" : current === false ? "**off** 🔕" : "**not set yet**";
                await message.reply(
                  `💡 Command suggestions are currently ${status}.\n` +
                  `➤ \`${guildPrefix}suggest on\` — enable\n` +
                  `➤ \`${guildPrefix}suggest off\` — disable`,
                );
                break;
              }
              default:
                await message.reply(`❓ Use \`${guildPrefix}help\` to see all available commands.`);
            }
          });
          break;
        }

        // ── New commands (beta) ───────────────────────────────────────────────
        case "new": {
          await handleNewCommand(message, args, guildPrefix);
          break;
        }

        // ── Dictionary ────────────────────────────────────────────────────────
        case "define":
        case "dict":
        case "dictionary": {
          const word = args.join(" ");
          const locale = message.guild?.preferredLocale ?? "en-US";
          await handleDefine(word, locale, (opts) => message.reply(opts as Parameters<typeof message.reply>[0]));
          break;
        }

        // ── QR Code ───────────────────────────────────────────────────────────
        case "qr": {
          const locale = message.guild?.preferredLocale ?? "en-US";
          const attachment = message.attachments.first();
          if (attachment) {
            await handleQrRead(message, locale);
          } else {
            const text = args.join(" ");
            await handleQrCreate(text, locale, (opts) => message.reply(opts as Parameters<typeof message.reply>[0]));
          }
          break;
        }

        // ── Echo ──────────────────────────────────────────────────────────────
        case "echo":
        case "écho": {
          if (!message.guildId) break;
          if (args[0]?.toLowerCase() === "stop") {
            await message.reply(stopEcho(message.guildId, message.channelId));
          } else {
            await message.reply(startEcho(message.guildId, message.channelId));
          }
          break;
        }

        // ── Pokédex ───────────────────────────────────────────────────────────
        case "pokemon":
        case "pokedex":
        case "dex": {
          const pokeName = args.join(" ");
          await handlePokemon(pokeName, responseLang, (opts) => message.reply(opts as Parameters<typeof message.reply>[0]));
          break;
        }

        // ── Welcome ───────────────────────────────────────────────────────────
        case "welcome": {
          await handleWelcomeCommand(message, args);
          break;
        }

        // ── Schedule ──────────────────────────────────────────────────────────
        case "schedule":
        case "sched": {
          await handleScheduleCommand(message, args);
          break;
        }

      }
    } catch (err) {
      logger.error({ err, command }, "Command error");
      await reportModuleFailure(
        message,
        moduleForMessageCommand(command),
        err,
        moduleDependencyForCommand(command, args),
      );
      await message.reply({
        content: moduleFallbackMessage(moduleForMessageCommand(command), responseLang, command),
        allowedMentions: { parse: [], repliedUser: false },
      }).catch(() => null);
    }
  });

  registerGuildEvents(client);

  client.once("clientReady", () => {
    loadCustomSounds().catch(() => null);
    startBirthdayScheduler(client);
    startQuestReminders(client, openai);
    startScheduler(client);
    startTechnicianDigest(client);
    if (client.user) {
      registerSlashCommands(client.user.id, token)
        .catch((err) => logger.error({ err }, "Slash command registration failed"));
      setBotStats({
        guildCount: client.guilds.cache.size,
        botTag: client.user.tag,
        botAvatarUrl: client.user.displayAvatarURL({ size: 256 }),
        botId: client.user.id,
      });
    }
  });

  // ── Food vision button (🤖 Try with AI) ─────────────────────────────────────
  client.on("interactionCreate", async (interaction) => {
    if (!interaction.isButton()) return;
    if (!interaction.customId.startsWith("food_vision_")) return;
    await handleFoodVisionButton(interaction, openai);
  });

  // ── Website scroll button interactions ──────────────────────────────────────
  client.on("interactionCreate", async (interaction) => {
    if (!interaction.isButton()) return;
    if (!interaction.customId.startsWith("website_goto_")) return;
    const newIndex = parseInt(interaction.customId.replace("website_goto_", ""), 10);
    if (isNaN(newIndex) || newIndex < 0 || newIndex >= WEBSITE_SECTIONS.length) return;
    await interaction.update(buildWebsiteMessage(newIndex));
  });

  client.login(token).catch((err) => {
    logger.error({ err }, "Failed to connect to Discord");
  });
}
