---
name: Bot experience requirements
description: User requirements for image quotas, concise help, birthdays and unpaid voice improvements.
---

Keep separate daily image allowances: four persona photos and ten ordinary generated images, retaining the existing bot-wide scope.

**Why:** The user explicitly requested four for personas but ten for image generation, rather than a shared counter.

**How to apply:** Do not let one category consume the other's allowance; unsuccessful deliveries release only their own reservation.

The main help should omit redundant hello/ask entries and keep language/suggestion controls in settings, without deleting their working commands. Poll creation should be available through slash commands.

**Why:** The user requested a less cluttered help and `/poll`.

**How to apply:** Preserve compatibility and make settings discoverable outside the main overview.

Birthday memory should concern only an explicitly self-declared user birthday, not historical figures, third parties or fictional personas.

**Why:** The user explicitly requested birthday memory with this distinction.

**How to apply:** Use existing private-memory opt-in; retain day/month rather than birth year or inferred age. A private memory is not permission to enroll someone in public birthday announcements.

Do not enable a paid voice service for this bot.

**Why:** The user said they want a better voice and voice conversation but do not want to pay.

**How to apply:** Distinguish local open-source voice processing from free API quotas; never promise unlimited free service or automatic paid fallback.
