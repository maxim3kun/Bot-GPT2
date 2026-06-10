# Bot Discord

Bot Discord complet avec commandes fun, mini-jeux, IA, génération musicale Suno et chat vocal.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — lance le serveur + bot Discord (port 5000)
- `pnpm run typecheck` — vérification complète TypeScript
- `pnpm run build` — typecheck + build de tous les packages

## Variables d'environnement requises

- `DISCORD_TOKEN` — token du bot principal (obligatoire)
- `GROQ_API_KEY` — active le chat IA (@mention, DM, vocal, trivia, conspiracy)
- `DISCORD_TOKEN_2` — second bot pour `!ai battle`
- `HUGGINGFACE_TOKEN` — active `!image` / `/image`
- `SUNO_API_KEY` — active `!music generator` et `!credits`

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- Bot: discord.js v14
- Voice: @discordjs/voice + Groq Whisper STT + Google TTS
- Music: Suno AI via sunoapi.org
- Build: esbuild (ESM bundle)

## Where things live

- Bot principal : `artifacts/api-server/src/bot.ts`
- Module vocal : `artifacts/api-server/src/discord/voice.ts`
- Client Suno : `artifacts/api-server/src/lib/suno-client.ts`
- Routes Suno : `artifacts/api-server/src/routes/suno.ts`
- Point d'entrée serveur : `artifacts/api-server/src/index.ts`

## Architecture decisions

- Le bot Discord tourne dans le même processus que le serveur Express — simple et sans surcoût.
- Préfixe des commandes : `!`
- Le module vocal (`voice.ts`) est séparé du bot principal pour la clarté.
- Les modules natifs (@discordjs/voice, prism-media, etc.) sont externalisés dans esbuild.

## Product

### Commandes fun (support `fr` / `es`)
- `!say <message>` — répète le message
- `!hello` / `!bonjour` / `!salut` — accueil chaleureux
- `!compliment [fr|es]` — compliment aléatoire
- `!joke [fr|es]` — blague aléatoire
- `!encouragement [fr|es]` — mot d'encouragement
- `!hug [fr|es]` — câlin virtuel
- `!8ball <question>` — boule magique
- `!dice [faces]` — lance un dé
- `!conspiracy [sujet]` — théorie du complot IA

### Mini-jeux
- `!minesweeper [easy|medium|hard]` — Démineur
- `!geo [easy|medium|hard]` — GeoGuessr
- `!trivia` — Quiz culture générale (IA)
- `!guessnumber` — Devine un nombre
- `!connect4` — Puissance 4

### Musique (Suno AI)
- `!music generator <prompt>` — génère une chanson
- `!music prompt` — exemples de prompts
- `!credits` — crédits Suno restants

### Vocal (Groq Whisper + Google TTS)
- `!join` — rejoint le salon vocal, écoute et répond en voix
- `!leave` — quitte le salon vocal
- `!voice stop` — mode sous-titres uniquement
- `!voice resume` — mode vocal complet
- `!subtitles` — active/désactive la transcription

### IA & Bataille
- `@bot <message>` — chat IA (fonctionne aussi en DM)
- `/image <description>` — génère une image (HuggingFace)
- `!ai battle <sujet>` — débat entre deux bots IA
- `!ai stop` — arrête le débat

### Aide
- `!help` / `!help fr` / `!help es` — aide paginée

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- L'intent **Message Content** doit être activé dans le portail développeur Discord.
- L'intent **Server Members** et **Voice** doivent aussi être activés pour le chat vocal.
- Les modules natifs (@discordjs/voice, @discordjs/opus, prism-media) sont externalisés dans esbuild — ils doivent être installés sur le serveur de déploiement.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
