/**
 * BOT.TS INTEGRATION CHECKLIST
 * 
 * Add these imports at the TOP of bot.ts (after existing imports):
 * 
 * import { detectUserLanguage, buildLanguageGuardPrompt } from "./discord/ai-language-guard";
 * import { shouldBypassAI, isTopListQuery } from "./lib/ai-functions";
 * 
 * ================================================================================
 * MODIFICATION 1: DM AI Chat Section (around line 1307-1329)
 * ================================================================================
 * 
 * BEFORE:
 *   if (isSendable(message.channel)) await message.channel.sendTyping();
 *   addToHistory(message.channelId, "user", `${message.author.displayName}: ${userText}`);
 *   
 *   const route = classifyAiMessage(userText);
 *   const webResults = route.needsResearch ? await searchWeb(userText) : [];
 *   const webContext = formatSearchContext(webResults);
 * 
 * AFTER:
 *   // OPTIMIZATION: Skip AI for direct commands
 *   if (shouldBypassAI(userText)) {
 *     await handleDirectCommand(message, userText);
 *     return;
 *   }
 *   
 *   if (isSendable(message.channel)) await message.channel.sendTyping();
 *   addToHistory(message.channelId, "user", `${message.author.displayName}: ${userText}`);
 *   
 *   const route = classifyAiMessage(userText);
 *   
 *   // OPTIMIZATION: Force web search for top lists
 *   const needsResearch = isTopListQuery(userText) || route.needsResearch;
 *   const webResults = needsResearch ? await searchWeb(userText) : [];
 *   const webContext = formatSearchContext(webResults);
 * 
 * ================================================================================
 * MODIFICATION 2: System Prompt (around line 1310-1320, in messages array)
 * ================================================================================
 * 
 * BEFORE:
 *   messages: [
 *     {
 *       role: "system",
 *       content: `${AI_IDENTITY_INSTRUCTIONS}
 * You are a friendly, helpful, and cheerful Discord bot...`
 *     }
 *   ]
 * 
 * AFTER:
 *   const userLanguage = detectUserLanguage(userText);
 *   const languageGuard = buildLanguageGuardPrompt(userLanguage);
 *   
 *   messages: [
 *     {
 *       role: "system",
 *       content: `${AI_IDENTITY_INSTRUCTIONS}\n\n${languageGuard}
 * You are a friendly, helpful, and cheerful Discord bot...${
 *         webContext ? `\n\n📚 **Research Context:**\n${webContext}` : ""
 *       }`
 *     }
 *   ]
 * 
 * ================================================================================
 * MODIFICATION 3: @Mention AI Chat Section (around line 1367-1403)
 * ================================================================================
 * 
 * Apply SAME changes as Modification 1 & 2 to @mention handler
 * 
 * ================================================================================
 * HELPER FUNCTION: Add this somewhere in bot.ts (after imports)
 * ================================================================================
 * 
 * async function handleDirectCommand(message: Message, text: string): Promise<void> {
 *   try {
 *     const station = extractRadioStation(text);
 *     if (station) {
 *       // Handle radio play
 *       // Example: await playRadio(message, station);
 *       return;
 *     }
 *     
 *     // Add more direct command handlers as needed
 *     // This prevents unnecessary AI calls
 *   } catch (err) {
 *     logger.error({ err }, "Direct command error");
 *   }
 * }
 * 
 * ================================================================================
 * TESTING AFTER INTEGRATION
 * ================================================================================
 * 
 * Test these commands - should NOT call AI (shouldBypassAI = true):
 * - "trivia" → starts trivia immediately
 * - "nrj" → plays NRJ radio immediately
 * - "minesweeper" → starts game immediately
 * 
 * Test these commands - SHOULD call AI with language guard:
 * - "Quel est le top 20 des films ?" → forces web search, stays in French
 * - "What games can I play?" → stays in English
 * - "Generate me a lo-fi song" → calls AI naturally
 * 
 * ================================================================================
 * SUMMARY OF OPTIMIZATIONS
 * ================================================================================
 * 
 * ✅ Direct commands skip AI (saves tokens on "trivia", "nrj", etc)
 * ✅ Language guard prevents mid-conversation language switches
 * ✅ Web search forced for "top 20", "classement", "ranking" queries
 * ✅ AI responds naturally for complex/conversational requests
 * ✅ Birthdays, reminders, Pokemon, games all work via AI recognition
 * 
 */
