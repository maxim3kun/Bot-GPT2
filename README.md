# 🤖 Bot Discord — Maxime

Bot Discord complet avec commandes fun, mini-jeux, IA conversationnelle, génération musicale et module vocal.

---

## 🚀 Démarrage rapide

1. Ajoute les variables d'environnement requises (voir section ci-dessous)
2. Lance le workflow **Discord Bot** sur Replit
3. Invite ton bot sur ton serveur Discord et active les intents nécessaires

---

## 🔑 Variables d'environnement

| Variable | Obligatoire | Description |
|---|---|---|
| `DISCORD_TOKEN` | ✅ Oui | Token du bot principal |
| `GROQ_API_KEY` | Recommandé | Active le chat IA, trivia, conspiracy et la bataille IA |
| `DISCORD_TOKEN_2` | Optionnel | Second bot pour `!ai battle` |
| `HUGGINGFACE_TOKEN` | Optionnel | Active la génération d'images (`!image`) |
| `SUNO_API_KEY` | Optionnel | Active la génération musicale (`!music`) |

> ⚠️ Dans le portail développeur Discord, active les intents : **Message Content**, **Server Members** et **Voice**.

---

## 📖 Commandes

### 🌐 Général

| Commande | Description |
|---|---|
| `@bot <message>` | Chat IA (fonctionne aussi en message privé) |
| `!say <message>` | Le bot répète ton message (le tien est supprimé) |
| `!hello` / `!hi` / `!bonjour` / `!salut` | Message de bienvenue |
| `!image <description>` | Génère une image via HuggingFace FLUX |
| `!credits` | Affiche les crédits du projet |
| `!help` / `!help fr` / `!help es` | Aide paginée (3 pages, navigation par réactions) |

---

### 🎉 Divertissement

Toutes ces commandes acceptent un suffixe de langue : `fr` (français) ou `es` (espagnol). Par défaut : anglais.

| Commande | Description | Exemple |
|---|---|---|
| `!compliment [fr\|es]` | Reçois un compliment aléatoire | `!compliment fr` |
| `!joke [fr\|es]` | Blague aléatoire | `!joke es` |
| `!encouragement [fr\|es]` | Mot d'encouragement | `!encouragement` |
| `!hug [fr\|es]` | Câlin virtuel | `!hug fr` |
| `!8ball <question> [fr\|es]` | Boule magique 🎱 | `!8ball Will I win? fr` |
| `!dice [faces]` | Lance un dé (6 faces par défaut, max 1000) | `!dice 20` |
| `!conspiracy [sujet]` | Génère une théorie du complot absurde (IA) | `!conspiracy the moon` |

---

### 🎮 Mini-jeux

| Commande | Description |
|---|---|
| `!minesweeper [easy\|medium\|hard]` | Démineur — grille révélée avec spoilers Discord |
| `!geo [easy\|medium\|hard]` | GeoGuessr — devine le pays d'une ville |
| `!geo stop` | Abandonne la partie GeoGuessr en cours |
| `!trivia` | Quiz culture générale généré par IA (4 choix, 30s) |
| `!guessnumber` | Devine un nombre entre 1 et 100 (7 essais) |
| `!connect4 [1-7]` | Puissance 4 multijoueur — joue une colonne |
| `!connect4 solo` | Puissance 4 contre le bot |

**Difficultés Démineur :**
- `easy` — 8×8, 10 mines
- `medium` — 9×9, 15 mines *(par défaut)*
- `hard` — 10×10, 20 mines

---

### 🎵 Musique — Suno AI

| Commande | Description |
|---|---|
| `!music generator <prompt>` | Génère une chanson (~30-60s) via Suno AI |
| `!music prompt` | Affiche des exemples de prompts par style musical |
| `!balance` | Affiche les crédits Suno restants |

**Exemples de styles :**
- `lo-fi hip hop beats, rainy day, chill, vinyl crackle`
- `upbeat rock anthem, electric guitar riffs, powerful drums`
- `dark synthwave, neon lights, midnight drive, 80s retro`
- `smooth jazz, saxophone, late night club, soft brushed drums`

---

### 🎙️ Vocal — Google TTS + Groq Whisper STT

| Commande | Description |
|---|---|
| `!join` | Le bot rejoint ton salon vocal, écoute et répond en voix |
| `!leave` | Le bot quitte le salon vocal |
| `!voice say <texte>` | Le bot lit un texte à voix haute |
| `!voice stop` | Passe en mode sous-titres uniquement (sans parole) |
| `!voice resume` | Réactive le mode vocal complet |
| `!subtitles` | Active/désactive la transcription live en temps réel |

> Quand le bot est dans un salon vocal, il transcrit automatiquement ce que vous dites et répond en voix si on le mentionne avec `@bot`.

---

### ⚔️ Bataille IA

| Commande | Description |
|---|---|
| `!ai battle <sujet>` | Lance un débat en 3 rounds entre deux bots IA |
| `!ai stop` | Arrête le débat en cours |

- 🔵 **Bot 1** argumente **POUR** le sujet
- 🔴 **Bot 2** argumente **CONTRE** le sujet
- Un **juge IA** désigne le vainqueur à la fin
- Nécessite `DISCORD_TOKEN_2` et `GROQ_API_KEY`

---

## 🛠️ Stack technique

| Composant | Technologie |
|---|---|
| Runtime | Node.js 24 + TypeScript 5.9 |
| Bot | discord.js v14 |
| Serveur API | Express 5 |
| IA conversationnelle | Meta LLaMA 3.1 via Groq |
| Génération musicale | Suno AI (sunoapi.org) |
| Génération d'images | HuggingFace FLUX.1-schnell |
| Text-to-Speech | Google Translate TTS |
| Speech-to-Text | Groq Whisper |
| Vocal Discord | @discordjs/voice + prism-media |
| Build | esbuild (bundle ESM) |
| Monorepo | pnpm workspaces |

---

## 📁 Structure du projet

```
artifacts/
  api-server/
    src/
      bot.ts          — Logique principale du bot et commandes
      app.ts          — Serveur Express
      index.ts        — Point d'entrée
      games.ts        — Mini-jeux (Minesweeper, GeoGuessr, Trivia…)
      discord/
        voice.ts      — Module vocal (TTS/STT)
      lib/
        suno-client.ts — Client Suno AI
        logger.ts     — Logger Pino
      routes/         — Routes API Express
lib/
  db/                 — Schéma Drizzle ORM
  api-spec/           — Spécifications OpenAPI
  api-zod/            — Schémas Zod générés
```

---

## 👨‍💻 Créateur

Fait avec ❤️ par **Maxime**
