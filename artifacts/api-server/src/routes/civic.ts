import { Router, type IRouter, type Request, type Response } from "express";
import { exchangeLegifranceAuthorizationCode, consumeLegifranceAuthorizationState, LegifranceOAuthError } from "../discord/civic-oauth.js";
import { saveLegifranceOAuthRefreshToken } from "../lib/db.js";
import { logger } from "../lib/logger.js";

const router: IRouter = Router();

function sendStatusPage(res: Response, status: number, title: string, message: string): void {
  res
    .status(status)
    .set({
      "cache-control": "no-store",
      "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'",
      "referrer-policy": "no-referrer",
      "x-content-type-options": "nosniff",
    })
    .type("html")
    .send(`<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${title}</title><body style="font:16px system-ui;max-width:38rem;margin:4rem auto;padding:0 1rem"><h1>${title}</h1><p>${message}</p></body></html>`);
}

router.get("/civic/legifrance/callback", async (req: Request, res: Response) => {
  const state = typeof req.query.state === "string" ? req.query.state : "";
  const pending = state ? consumeLegifranceAuthorizationState(state) : undefined;
  if (!pending) {
    sendStatusPage(res, 400, "Autorisation expirée", "Relance la connexion depuis la commande d’administration du bot.");
    return;
  }

  const providerError = typeof req.query.error === "string" ? req.query.error : "";
  const code = typeof req.query.code === "string" ? req.query.code : "";
  if (providerError || !code) {
    sendStatusPage(res, 400, "Connexion non terminée", "Aucun accès n’a été enregistré. Tu peux relancer la connexion depuis Discord.");
    return;
  }

  const clientId = process.env.LEGIFRANCE_CLIENT_ID?.trim();
  const clientSecret = process.env.LEGIFRANCE_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    sendStatusPage(res, 503, "Configuration incomplète", "Les identifiants OAuth PISTE ne sont pas disponibles sur ce serveur.");
    return;
  }

  try {
    const tokens = await exchangeLegifranceAuthorizationCode(
      code,
      pending.redirectUri,
      { clientId, clientSecret },
    );
    await saveLegifranceOAuthRefreshToken(tokens.refreshToken);
    sendStatusPage(res, 200, "Légifrance connecté", "Le jeton OAuth a été enregistré de façon chiffrée. Tu peux fermer cette page.");
  } catch (error) {
    if (error instanceof LegifranceOAuthError) {
      logger.warn({ message: error.message }, "PISTE authorization setup failed");
      sendStatusPage(res, 502, "Connexion PISTE incomplète", "Le jeton n’a pas été enregistré. Vérifie l’URL de rappel et les accès de l’application, puis relance la connexion.");
      return;
    }
    logger.error({ errorName: error instanceof Error ? error.name : "unknown" }, "Could not save PISTE authorization");
    sendStatusPage(res, 503, "Stockage indisponible", "MongoDB ou la clé de chiffrement n’est pas disponible; aucun jeton n’a été enregistré.");
  }
});

export default router;
