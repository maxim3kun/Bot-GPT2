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
- `ACCOUNT_ID` + `TOKEN_API` — génération d’images Cloudflare Workers AI (FLUX.1 schnell), pour `!image`, `/image` et les avatars/photos fictives des personas
- `HUGGINGFACE_TOKEN` — fournisseur d’images de secours facultatif
- `SUNO_API_KEY` — active `!music generator` et `!credits`
- `LOGO_DEV_PUBLIC_KEY` — active `!guessthelogo` (clé publique logo.dev)
- `DATABASE_URL` — adresse MongoDB ; active la mémoire persistante et chiffrée de l’IA
- `ENCRYPTION_KEY` — clé hexadécimale de 64 caractères pour chiffrer les souvenirs
- Le fuseau horaire utilisé pour les demandes d’heure est mémorisé dans MongoDB (`ai_timezones`) après que l’utilisateur a indiqué une ville ou un pays. Sans `DATABASE_URL`, ce réglage ne peut pas survivre à un redémarrage.

## Stack

Le site officiel du bot est https://www.maximegpt.com/ ; `!website` doit utiliser cette adresse.

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
- Les demandes naturelles de Pokédex comme « donne-moi les infos du Pokémon Flambusard » utilisent directement PokéAPI et comprennent les alias français connus.
- Les demandes composées (par exemple heure + météo sur plusieurs jours) sont traitées en entier ; la partie météo déclenche une recherche web et l’heure est ajoutée comme contexte déterministe.
- Les demandes d’actualité ou de recherche explicite consultent DuckDuckGo Lite. Les sources restent masquées derrière le bouton 🔎 pour ne pas encombrer le salon.
- `/image <description>` / `!image <description>` — génère une image (Cloudflare en priorité, Hugging Face en secours si configuré)
- `!ai battle <sujet>` — débat entre deux bots IA
- `!ai stop` — arrête le débat
- `!ai remember <information>` — mémoire personnelle facultative, chiffrée et cloisonnée par serveur
- `!ai memory` / `!ai forget <numéro|all>` — consulter en DM ou supprimer sa mémoire
- `!ai server remember <information>` — mémoire commune réservée aux administrateurs
- Lorsqu’il est mentionné, le bot peut ignorer une insulte, réagir, supprimer une insulte grave et appliquer un timeout progressif si les abus répétés continuent. Il ne se moque pas des utilisateurs.

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

## Itinéraires dans les conversations Discord

- Les demandes de trajet dans les mentions, MP, `!ask`/`!ia` et personas passent par le calculateur officiel Île-de-France Mobilités/PRIM, avec `IDFM_PRIM_API_KEY` et l’autorisation d’accès au calculateur générique Navitia v2.
- Le calculateur d’itinéraires est limité ici aux transports en commun franciliens. Cela ne réduit pas la couverture France/Québec des commandes d’horaires existantes.
- Le départ, l’arrivée et l’éventuelle heure d’arrivée souhaitée sont gardés en mémoire temporaire pendant cinq minutes, séparément pour chaque serveur, salon, membre et persona. Aucun historique complet ni souvenir persistant n’est envoyé à PRIM.
- Une erreur, un quota ou une réponse incohérente ne déclenche jamais un itinéraire généré librement par l’IA. Le statut théorique/temps réel dépend de la réponse officielle.
- Les trajets conversationnels utilisent le style de carte de `!metro`, avec repli textuel si les cartes sont interdites. Actualiser et Fermer sont liés au demandeur, au message et à son trajet, jamais à une recherche plus récente; le lien Source est public et ne déclenche aucun calcul.
- Les contrôles expirent avec le contexte, au maximum après cinq minutes sans prolongation par un clic. Les trajets longs sont paginés sans masquer de correspondance et sans nouvel appel au fournisseur lors d’un changement de page.
- `pnpm --filter @workspace/api-server run test:itineraries` vérifie les dialogues et contrats du calculateur; `test:transport` inclut aussi les régressions d’horaires France/Québec.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
