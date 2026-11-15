---
name: Bot experience requirements
description: User requirements for image quotas, concise help, birthdays and unpaid voice improvements.
---

Keep separate daily image allowances: four persona photos and ten ordinary generated images, retaining the existing bot-wide scope.

**Why:** The user explicitly requested four for personas but ten for image generation, rather than a shared counter.

**How to apply:** Do not let one category consume the other's allowance; unsuccessful deliveries release only their own reservation.

The main help should omit redundant hello/ask entries and keep language/suggestion controls in personal settings, without deleting their working commands. Personas already have a separate help: do not duplicate it as a public help page. Server settings belong only in `!help admin`. Poll creation should be available through slash commands.

**Why:** The user requested a less cluttered help and `/poll`, then clarified that persona and server settings pages should not appear in the public paginator.

**How to apply:** Preserve compatibility and make settings discoverable outside the main overview.

Keep the general help overview free of `!help <topic>` examples; retain the detailed help accessible for each topic.

**Why:** The user said those repeated help commands waste space and confirmed they like the detailed help pages.

**How to apply:** Remove help-command examples from overview pages only; keep the topic help routes and their command details intact.

Quest UI and generated quests should follow the configured language, including French when selected.

**Why:** The user explicitly reported quests staying in English despite French being configured.

**How to apply:** Apply the existing personal-over-server language precedence to quest screens, generation, reminders and fallback messages, without rewriting stored objectives or XP.

Birthday memory should concern only an explicitly self-declared user birthday, not historical figures, third parties or fictional personas.

**Why:** The user explicitly requested birthday memory with this distinction.

**How to apply:** Use existing private-memory opt-in; retain day/month rather than birth year or inferred age. A private memory is not permission to enroll someone in public birthday announcements.

Do not enable a paid voice service for this bot.

**Why:** The user said they want a better voice and voice conversation but do not want to pay.

**How to apply:** Distinguish local open-source voice processing from free API quotas; never promise unlimited free service or automatic paid fallback.

Joining voice must never start capture. Each speaker explicitly opts in; existing AI consent covers the disclosed Groq transcription, and raw audio is not retained. Hide written AI replies by default; `!subtitles` controls both replies and transcripts.

**Why:** The user wants voice-chat answers spoken by default and written only when subtitles are explicitly enabled.

**How to apply:** Keep transcripts and written answers off by default; when `!subtitles` is on, show the written reply before best-effort speech. Recheck consent, channel membership, permissions and AI feature settings before capture and before sending audio externally; stop that speaker's stream immediately on opt-out or revoked access.

The user runs the bot on Railway.

**Why:** The user explicitly said they run the code via Railway.

**How to apply:** Prepare runtime dependencies and voice models for Railway rather than assuming that a successful local Replit experiment is installed on the deployed bot.

The bot's default French voice should be masculine Gilles; personas may keep their own voice.

**Why:** The user asked for a male bot voice while allowing persona-specific voices.

**How to apply:** Use Gilles when no server voice is saved; preserve explicit server selections and persona overrides. Keep voice-model files on the Railway runtime, not in MongoDB.

When voice chat runs over radio, lower music only when a real spoken reply is ready; never duck or interrupt music for an AI failure notice. Restore radio immediately after speech.

**Why:** The user reported needless volume changes and silence after speech on Railway.

**How to apply:** Keep radio playing during AI/TTS preparation, hand over only after the mixer has audio ready, and warm the replacement stream while speech plays.

Do not add a Persona reaction beneath every bot response. Show the available Personas and creation option only when someone explicitly asks to choose or speak with one.

**Why:** The user finds the per-message reaction visually cluttered and prefers an on-demand selector.

**How to apply:** Keep `!persona start` and `!persona stop` available; use a private list and guided creation flow for explicit natural-language requests.
