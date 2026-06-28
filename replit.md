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
- `LOGO_DEV_PUBLIC_KEY` — active `!guessthelogo` (clé publique logo.dev)

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
- `!guessthelogo [easy|medium|hard]` — Devine le logo (aussi `!guesslogo`, `!devinelelogo`) — nécessite `LOGO_DEV_TOKEN`

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

### Dictionnaire
- `/define <word>` / `!define <word>` / `!dict <word>` — définition d'un mot anglais (Free Dictionary API)
- Réponse localisée selon la langue Discord (fr/es/en)

### QR Code
- `/qr text:<texte>` / `!qr <texte>` — génère un QR code en image
- `/qr image:<image>` / `!qr` + image jointe — lit un QR code depuis une image

### Echo
- `/echo user:@mention` / `!echo @mention` — répète les messages d'un utilisateur (max 8)
- `/echo` (sans argument) / `!echo stop` — arrête l'echo
- S'arrête automatiquement après 8 messages

### Pokédex
- `/pokemon <nom>` / `!pokemon <nom>` / `!dex <nom>` — fiche Pokémon complète (PokéAPI)
- Stats, types, talents, taille, poids avec couleur selon le type

### Bienvenue dynamique
- `!welcome set #salon` / `/welcome set channel:#salon` — définir le salon de bienvenue
- `!welcome msg <texte>` / `/welcome message text:<texte>` — message personnalisé (variables : `{user}` `{server}` `{count}`)
- `!welcome clear` / `/welcome clear` — remettre le message par défaut
- `!welcome status` / `/welcome status` — voir la configuration
- Message automatique (embed) quand un membre rejoint, dans la langue du serveur

### Messages planifiés
- `!schedule set HH:MM #salon <message>` / `/schedule once time:HH:MM channel:#salon message:<msg>` — planifier une fois (UTC)
- `!schedule daily HH:MM #salon <message>` / `/schedule daily ...` — planifier chaque jour
- `!schedule list` / `/schedule list` — voir les messages planifiés
- `!schedule cancel <ID>` / `/schedule cancel id:<ID>` — annuler

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
