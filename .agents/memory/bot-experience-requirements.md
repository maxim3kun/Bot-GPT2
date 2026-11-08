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

Quest UI and generated quests should follow the configured language, including French when selected.

**Why:** The user explicitly reported quests staying in English despite French being configured.

**How to apply:** Apply the existing personal-over-server language precedence to quest screens, generation, reminders and fallback messages, without rewriting stored objectives or XP.

Birthday memory should concern only an explicitly self-declared user birthday, not historical figures, third parties or fictional personas.

**Why:** The user explicitly requested birthday memory with this distinction.

**How to apply:** Use existing private-memory opt-in; retain day/month rather than birth year or inferred age. A private memory is not permission to enroll someone in public birthday announcements.

Do not enable a paid voice service for this bot.

**Why:** The user said they want a better voice and voice conversation but do not want to pay.

**How to apply:** Distinguish local open-source voice processing from free API quotas; never promise unlimited free service or automatic paid fallback.

The user runs the bot on Railway.

**Why:** The user explicitly said they run the code via Railway.

**How to apply:** Prepare runtime dependencies and voice models for Railway rather than assuming that a successful local Replit experiment is installed on the deployed bot.

The user likes SIWIS and wants a default voice plus a selection for the bot and each persona.

**Why:** The user explicitly approved the SIWIS sample and requested independent voice choices.

**How to apply:** Keep SIWIS as the base choice and allow creator-controlled persona overrides. Use the bot's server voice when a persona has no override; keep model weights out of MongoDB.
