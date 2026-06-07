# Bot Discord

Bot Discord sympathique avec des commandes fun et une commande `!say`.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — lance le serveur + bot Discord (port 5000)
- `pnpm run typecheck` — vérification complète TypeScript
- `pnpm run build` — typecheck + build de tous les packages
- Required env: `DISCORD_TOKEN` — token du bot Discord

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- Bot: discord.js v14
- Build: esbuild (CJS bundle)

## Where things live

- Bot Discord : `artifacts/api-server/src/bot.ts`
- Point d'entrée serveur : `artifacts/api-server/src/index.ts`

## Architecture decisions

- Le bot Discord tourne dans le même processus que le serveur Express — simple et sans surcoût.
- Préfixe des commandes : `!`

## Product

Bot Discord avec les commandes :
- `!say <message>` — répète le message
- `!bonjour` / `!salut` / `!hello` — accueil chaleureux
- `!compliment` — compliment aléatoire
- `!blague` — blague aléatoire
- `!encouragement` / `!courage` — mot d'encouragement
- `!calin` / `!câlin` — câlin virtuel
- `!8ball <question>` / `!8boule` — boule magique
- `!dice [faces]` / `!dé` — lance un dé
- `!aide` / `!help` — liste toutes les commandes

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Le bot nécessite que l'intent **Message Content** soit activé dans le portail développeur Discord (Applications → ton bot → Bot → Privileged Gateway Intents → Message Content Intent).

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
