# 🤖 Discord Bot — by Maxime

A full-featured Discord bot with fun commands, mini-games, AI chat, music generation, voice, radio streaming, and YouTube audio playback.

---

## 🚀 Quick Start

1. Add the required environment variables (see section below)
2. Launch the **Discord Bot** workflow on Replit
3. Invite your bot to your Discord server and enable the required intents

---

## 🔑 Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DISCORD_TOKEN` | ✅ Yes | Main bot token |
| `GROQ_API_KEY` | Recommended | Enables AI chat, trivia, conspiracy and AI battles |
| `DISCORD_TOKEN_2` | Optional | Second bot for `!ai battle` |
| `HUGGINGFACE_TOKEN` | Optional | Enables image generation (`!image`) |
| `SUNO_API_KEY` | Optional | Enables music generation (`!music`) |

> ⚠️ In the Discord Developer Portal, enable these intents: **Message Content**, **Server Members**, and **Voice**.

---

## 📖 Commands

### 🌐 General

| Command | Description |
|---|---|
| `@bot <message>` | AI chat (also works in DMs) |
| `!say <message>` | Bot repeats your message (yours is deleted) |
| `!hello` / `!hi` / `!bonjour` / `!salut` | Welcome message |
| `!image <description>` | Generate an image via HuggingFace FLUX |
| `!credits` | Show project credits |
| `!help` / `!help fr` / `!help es` | Paginated help (3 pages, navigate with reactions) |

---

### 🎉 Fun

All commands accept a language suffix: `fr` (French) or `es` (Spanish). Default: English.

| Command | Description | Example |
|---|---|---|
| `!compliment [fr\|es]` | Receive a random compliment | `!compliment fr` |
| `!joke [fr\|es]` | Random joke | `!joke es` |
| `!encouragement [fr\|es]` | Encouraging message | `!encouragement` |
| `!hug [fr\|es]` | Virtual hug | `!hug fr` |
| `!8ball <question> [fr\|es]` | Magic 8-ball 🎱 | `!8ball Will I win?` |
| `!dice [faces]` | Roll a die (6 sides default, max 1000) | `!dice 20` |
| `!conspiracy [topic]` | Generate an absurd AI conspiracy theory | `!conspiracy the moon` |

---

### 🎮 Mini-games

| Command | Description |
|---|---|
| `!minesweeper [easy\|medium\|hard]` | Minesweeper — board revealed with Discord spoiler tags |
| `!geo [easy\|medium\|hard]` | GeoGuessr — guess the country of a city |
| `!geo stop` | Abandon the current GeoGuessr game |
| `!trivia` | AI-generated general knowledge quiz (4 choices, 30s) |
| `!guessnumber` | Guess a number between 1 and 100 (7 attempts) |
| `!connect4 [1-7]` | Connect 4 multiplayer — play a column |
| `!connect4 solo` | Connect 4 against the bot |

**Minesweeper difficulties:**
- `easy` — 8×8, 10 mines
- `medium` — 9×9, 15 mines *(default)*
- `hard` — 10×10, 20 mines

---

### 📻 Radio

The bot joins your current voice channel and streams live radio. You must be in a voice channel to use radio commands.

| Command | Description |
|---|---|
| `!radio list` | Show all available radio stations |
| `!radio <station>` | Start playing a radio station |
| `!radio leave` | Stop the radio and disconnect |

**Available stations:**

| Key | Station | Genre |
|---|---|---|
| `nrj` | NRJ 🔥 | Pop / Hits |
| `fun` | Fun Radio 🎉 | Dance / Electronic |
| `rtl` | RTL 📻 | News / Variety |
| `europe1` | Europe 1 🌍 | News / Talk |
| `skyrock` | Skyrock 🎤 | Hip-Hop / R&B |
| `franceinter` | France Inter 🎙️ | Culture / Talk |
| `musique` | France Musique 🎼 | Classical |
| `virgin` | Virgin Radio 🎸 | Rock / Alternative |
| `nostalgie` | Nostalgie 🕰️ | Oldies / French classics |
| `cherie` | Chérie FM 💕 | Pop / Love songs |

**Examples:** `!radio nrj` · `!radio skyrock` · `!radio franceinter`

---

### 🎬 YouTube

Stream the audio of any YouTube video directly in a voice channel. You must be in a voice channel first.

| Command | Description |
|---|---|
| `!youtube <url>` | Play the audio of a YouTube video |

**Example:** `!youtube https://www.youtube.com/watch?v=dQw4w9WgXcQ`

---

### 🎵 Music — Suno AI

| Command | Description |
|---|---|
| `!music generator <prompt>` | Generate a song (~30-60s) via Suno AI |
| `!music prompt` | Show prompt examples by music style |
| `!balance` | Show remaining Suno credits |

**Style examples:**
- `lo-fi hip hop beats, rainy day, chill, vinyl crackle`
- `upbeat rock anthem, electric guitar riffs, powerful drums`
- `dark synthwave, neon lights, midnight drive, 80s retro`
- `smooth jazz, saxophone, late night club, soft brushed drums`

---

### 🎙️ Voice — Google TTS + Groq Whisper STT

| Command | Description |
|---|---|
| `!join` | Bot joins your voice channel, listens and replies by voice |
| `!leave` | Bot leaves the voice channel |
| `!voice say <text>` | Bot reads a text aloud |
| `!voice stop` | Switch to subtitles-only mode (no speech) |
| `!voice resume` | Re-enable full voice mode |
| `!subtitles` | Toggle live real-time transcription |

> When the bot is in a voice channel, it automatically transcribes what you say and replies by voice when mentioned with `@bot`.

---

### ⚔️ AI Battle

| Command | Description |
|---|---|
| `!ai battle <topic>` | Start a 3-round debate between two AI bots |
| `!ai stop` | Stop the ongoing debate |

- 🔵 **Bot 1** argues **FOR** the topic
- 🔴 **Bot 2** argues **AGAINST** the topic
- An **AI judge** announces the winner at the end
- Requires `DISCORD_TOKEN_2` and `GROQ_API_KEY`

---

## 🛠️ Tech Stack

| Component | Technology |
|---|---|
| Runtime | Node.js 24 + TypeScript 5.9 |
| Bot | discord.js v14 |
| API Server | Express 5 |
| AI Chat | Meta LLaMA 3.1 via Groq |
| Music generation | Suno AI (sunoapi.org) |
| Image generation | HuggingFace FLUX.1-schnell |
| Text-to-Speech | Google Translate TTS |
| Speech-to-Text | Groq Whisper |
| Radio / YouTube | play-dl + ffmpeg-static |
| Discord voice | @discordjs/voice + prism-media |
| Build | esbuild (ESM bundle) |
| Monorepo | pnpm workspaces |

---

## 📁 Project Structure

```
artifacts/
  api-server/
    src/
      bot.ts            — Main bot logic and commands
      app.ts            — Express server
      index.ts          — Entry point
      games.ts          — Mini-games (Minesweeper, GeoGuessr, Trivia…)
      discord/
        voice.ts        — Voice module (TTS/STT)
        radio.ts        — Radio & YouTube streaming
      lib/
        suno-client.ts  — Suno AI client
        logger.ts       — Pino logger
      routes/           — Express API routes
lib/
  db/                   — Drizzle ORM schema
  api-spec/             — OpenAPI specifications
  api-zod/              — Generated Zod schemas
```

---

## 👨‍💻 Credits

Made with ❤️ by **Maxime**
