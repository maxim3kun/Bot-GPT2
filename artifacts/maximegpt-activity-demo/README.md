# Activity Discord privée

## Configuration du client web

- `VITE_DISCORD_CLIENT_ID` : identifiant public de l’application Discord autorisée dans le Developer Portal.
- `VITE_ACTIVITY_API_URL` : URL HTTPS de base de l’API qui exécute le bot. En développement, `/api` est transmis au serveur API local sur le port 8080.

Ne mets jamais de token de bot, de secret OAuth ni de clé de chiffrement dans une variable `VITE_*`.

## Configuration du serveur API

- `DISCORD_ACTIVITY_CLIENT_ID` et `DISCORD_ACTIVITY_CLIENT_SECRET` : identifiants OAuth de l’application utilisée par l’Activity. Pour l’identifiant public, le serveur reprend sinon `DISCORD_CLIENT_ID`, puis `VITE_DISCORD_CLIENT_ID`. Pour le secret, il reprend sinon `DISCORD_CLIENT_SECRET`.
- `SESSION_SECRET` : clé de signature des sessions privées, déjà utilisée par l’API.
- `DATABASE_URL` et `ENCRYPTION_KEY` : MongoDB et chiffrement des histoires.
- `ACTIVITY_ALLOWED_ORIGINS` : liste séparée par des virgules des origines HTTPS exactes de l’Activity, sans chemin.

Le navigateur doit utiliser le même identifiant d’application que le serveur. Une configuration API ne sert qu’une application Discord à la fois. Le secret OAuth reste uniquement sur le serveur API.

## Sécurité et données

- L’Activity demande à Discord les autorisations `identify` et `guilds`; le serveur échange le code PKCE, vérifie l’identité et confirme l’appartenance au serveur demandé.
- La session active de chaque serveur est identifiée par une clé hachée et expire après quatre heures sans activité.
- Les histoires sont indexées par un identifiant de membre et de serveur haché, puis chiffrées avec `ENCRYPTION_KEY` avant MongoDB.
- Aucun enregistrement n’a lieu avant l’accord explicite. Retirer l’accord supprime l’histoire et sa preuve de consentement.
- L’aperçu navigateur n’accède pas aux histoires. Le lancement public nécessite une URL HTTPS et son mapping dans le Developer Portal Discord.
