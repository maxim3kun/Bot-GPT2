---
name: Research answer style
description: User-facing formatting expectations for researched MaximeGPT answers.
---

For web-researched answers, answer directly and briefly, matching the detail to the question; never impose a fixed word count. Prefer plain prose or a few bullets; do not use Markdown tables or pipe-separated formatting unless the user explicitly requests a table. Latest-news replies should focus on at most three specific, verified stories. Never use a publisher, homepage, or generic news section as a story. For broad latest-news lists, prefer retrieved article titles and snippets over model-generated summaries. Keep source links available without repeating a directory of site names in the answer.

**Why:** The user said the bot's researched answers were too long, Markdown tables looked ugly, and a fixed 75-word cap was absurd. They also objected to generic publishers such as 20 Minutes being presented as news and to unrelated stories appearing after a search change.

**How to apply:** Use these defaults in researched-response prompts and formatting. For broad news roundups, show only specific retrieved headlines and snippets; use the model for detailed follow-up questions grounded in the article text.
