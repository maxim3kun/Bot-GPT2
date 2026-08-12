import { detectUserLanguage, buildLanguageGuardPrompt } from "./discord/ai-language-guard";
import { BOT_FUNCTIONS, isTopListQuery, extractRequestedFeature } from "./lib/ai-functions";

// ── MODIFICATIONS AT TOP OF FILE AFTER IMPORTS ────────────────────────────────

// [Keep all existing imports, just add these two lines above]
// import { detectUserLanguage, buildLanguageGuardPrompt } from "./discord/ai-language-guard";
// import { BOT_FUNCTIONS, isTopListQuery, extractRequestedFeature } from "./lib/ai-functions";

// ── MODIFICATION 1: Force web search for "top N" queries ────────────────────────────

// In the DM AI chat section (~line 1305-1320), modify the route logic:
// BEFORE:
//   const webResults = route.needsResearch ? await searchWeb(userText) : [];

// AFTER: Add this check before the searchWeb call
function shouldForceWebSearch(text: string, route: any): boolean {
  // Force web search for top lists, rankings, current information
  if (isTopListQuery(text)) return true;
  // If router already marked it, keep that decision
  return route.needsResearch;
}

// ── MODIFICATION 2: Language guard for AI responses ────────────────────────────────

// This function wraps the AI call to ensure proper language handling
function buildAIMessages(
  userText: string,
  history: ChatMessage[],
  webContext: string,
): Array<{ role: "system" | "user" | "assistant"; content: string }> {
  const userLanguage = detectUserLanguage(userText);
  const languageGuard = buildLanguageGuardPrompt(userLanguage);
  
  return [
    {
      role: "system",
      content: `${AI_IDENTITY_INSTRUCTIONS}${languageGuard}

You are a friendly, helpful, and cheerful Discord bot. Keep answers concise and conversational. Warm, casual tone. Emojis sparingly.${
        webContext ? `\n\n📚 **Research Context:**\n${webContext}` : ""
      }`,
    },
    ...history,
  ];
}

// ── MODIFICATION 3: DM AI chat section (around line 1307-1329) ────────────────────────

// Replace the entire AI chat logic with this improved version:

async function handleDmAiChat(
  message: Message,
  userText: string,
  openai: OpenAI,
): Promise<void> {
  try {
    if (isSendable(message.channel)) await message.channel.sendTyping();
    addToHistory(message.channelId, "user", `${message.author.displayName}: ${userText}`);
    
    // Force web search for top lists and current information
    const route = classifyAiMessage(userText);
    const needsResearch = shouldForceWebSearch(userText, route);
    const webResults = needsResearch ? await searchWeb(userText) : [];
    const webContext = formatSearchContext(webResults);
    
    const messages = buildAIMessages(userText, getAiHistory(message.channelId), webContext);
    
    const response = await openai.chat.completions.create({
      model: "llama-3.1-8b-instant",
      max_completion_tokens: 1024,
      messages,
    });
    
    incrementGroqCalls();
    const reply = response.choices[0]?.message?.content ?? "Sorry, I couldn't come up with a response! 😅";
    addToHistory(message.channelId, "assistant", reply);
    await replyWithAiAnswer(message, reply, webResults);
  } catch (err) {
    logger.error({ err }, "DM AI error");
    await message.reply("Oops, something went wrong! 😅 Try again in a moment.");
  }
}

// ── MODIFICATION 4: @mention AI chat section (around line 1367-1403) ────────────

// Similarly upgrade the @mention handler:

async function handleMentionAiChat(
  message: Message,
  userText: string,
  openai: OpenAI,
  client: Client,
): Promise<void> {
  try {
    const wasModerated = await moderateMentionedMessage(message, openai);
    if (wasModerated) return;
    
    if (isSendable(message.channel)) await message.channel.sendTyping();
    addToHistory(message.channelId, "user", `${message.author.displayName}: ${userText}`);
    
    const memoryContext = await getAiPromptContext(message.guildId, message.author.id);
    
    // Force web search for top lists
    const route = classifyAiMessage(userText);
    const needsResearch = shouldForceWebSearch(userText, route);
    const webResults = needsResearch ? await searchWeb(userText) : [];
    const webContext = formatSearchContext(webResults);
    
    const messages = buildAIMessages(userText, getAiHistory(message.channelId), webContext);
    // Insert memory context if available
    if (memoryContext) {
      messages[0]!.content += `\n\n💭 **User Context:**\n${memoryContext}`;
    }
    
    const response = await openai.chat.completions.create({
      model: "llama-3.1-8b-instant",
      max_completion_tokens: 1024,
      messages,
    });
    
    incrementGroqCalls();
    const reply = response.choices[0]?.message?.content ?? "Sorry, I couldn't come up with a response! 😅";
    addToHistory(message.channelId, "assistant", reply);
    await replyWithAiAnswer(message, reply, webResults);
    
    // Also speak in voice if bot is connected
    if (message.guildId && isInVoice(message.guildId)) {
      const botName = client.user?.username;
      speakText(message.guildId, reply, "en", botName).catch(() => null);
    }
  } catch (err) {
    logger.error({ err }, "Mention AI error");
    await message.reply("Oops, something went wrong! 😅 Try again in a moment.");
  }
}

// ── HOW TO INTEGRATE ────────────────────────────────────────────────────────────────

// 1. Add the imports at the top of bot.ts:
//    import { detectUserLanguage, buildLanguageGuardPrompt } from "./discord/ai-language-guard";
//    import { BOT_FUNCTIONS, isTopListQuery, extractRequestedFeature } from "./lib/ai-functions";

// 2. Replace the DM AI chat section (lines ~1307-1329) with handleDmAiChat() call
// 3. Replace the @mention AI chat section (lines ~1367-1403) with handleMentionAiChat() call
// 4. Test with: 
//    - French message: "Quel est le top 20 des jeux Nintendo DS ?" (should stay French & use web search)
//    - English message: "What time is it in Paris?" (should stay English)
//    - Music request: "Generate a lo-fi song" (could trigger function calling in future)
