# Activity Discord privée

## Configuration du client web

- En production, chaque application ouvre son chemin dédié : `/activity/<identifiant-application>`. Le site et l’API restent communs.
- `VITE_DISCORD_CLIENT_ID` : identifiant public facultatif, utilisé uniquement pour l’aperçu de développement à la racine.
- `VITE_ACTIVITY_API_URL` : URL HTTPS de base de l’API. L’hébergement intégré utilise la même origine et laisse cette valeur vide.

Ne mets jamais de token de bot, de secret OAuth ni de clé de chiffrement dans une variable `VITE_*`.

## Configuration du serveur API

- `DISCORD_ACTIVITY_CLIENT_ID` et `DISCORD_ACTIVITY_CLIENT_SECRET` : paire OAuth de la première application. Pour l’identifiant public, le serveur reprend sinon `DISCORD_CLIENT_ID`, puis `VITE_DISCORD_CLIENT_ID`. Pour le secret, il reprend sinon `DISCORD_CLIENT_SECRET`.
- `DISCORD_ACTIVITY_CLIENT_ID_2` et `DISCORD_ACTIVITY_CLIENT_SECRET_2` : paire OAuth de la deuxième application. Le secret doit rester dans Replit Secrets.
- `SESSION_SECRET` : clé de signature des sessions privées, déjà utilisée par l’API.
- `DATABASE_URL` et `ENCRYPTION_KEY` : MongoDB et chiffrement des histoires.
- `GROQ_API_KEY` : réponses de l’IA dans le chat privé de l’Activity.
- `ACTIVITY_ALLOWED_ORIGINS` : liste séparée par des virgules des origines HTTPS exactes de l’Activity, sans chemin.

Chaque application doit déclarer dans son portail Discord l’URL publique correspondante, par exemple `https://<domaine>/activity/<identifiant-application>`. Le serveur n’échange un code OAuth que si l’identifiant demandé correspond exactement à une paire ID/secret configurée. Les secrets OAuth restent uniquement sur le serveur API.

## Sécurité et données

- L’Activity demande à Discord les autorisations `identify` et `guilds`; le serveur échange le code PKCE, vérifie l’identité et confirme l’appartenance au serveur demandé.
- La session active de chaque serveur est identifiée par une clé hachée et expire après quatre heures sans activité.
- Les histoires sont indexées par un identifiant de membre et de serveur haché, puis chiffrées avec `ENCRYPTION_KEY` avant MongoDB.
- Aucun enregistrement n’a lieu avant l’accord explicite. Retirer l’accord supprime l’histoire et sa preuve de consentement.
- Le chat IA réutilise le consentement IA du membre. Ses échanges restent en mémoire du serveur au plus 30 minutes après la dernière activité; ils ne sont pas sauvegardés dans MongoDB.
- L’avatar ne reçoit pas le micro de la page. Le chat vocal Discord existant transmet seulement des états généraux à l’Activity (écoute, réflexion, parole, pause), jamais de transcription ni d’audio.
- L’aperçu navigateur n’accède pas aux histoires. Le lancement public nécessite une URL HTTPS et son mapping dans le Developer Portal Discord.
