import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import path from "path";
import { fileURLToPath } from "url";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
// CORS: allow Replit preview domain + the production GitHub Pages domain.
const ALLOWED_ORIGINS = new Set([
  "https://www.maximegpt.com",
  "https://maxim3kun.github.io",
  "https://www.maxim3kun.com",
  ...(process.env["NODE_ENV"] !== "production"
    ? ["http://127.0.0.1:5000", "http://localhost:5000"]
    : []),
  ...(process.env["ACTIVITY_ALLOWED_ORIGINS"] ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
  ...(process.env["REPLIT_DEV_DOMAIN"]
    ? [`https://${process.env["REPLIT_DEV_DOMAIN"]}`]
    : []),
]);
const corsMiddleware = cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (server-to-server, curl, etc.)
    if (!origin) return cb(null, true);
    // Allow any subdomain of the Replit dev domain (handles preview proxy variants).
    const devDomain = process.env["REPLIT_DEV_DOMAIN"] ?? "";
    if (devDomain && origin.endsWith(devDomain)) return cb(null, true);
    if (ALLOWED_ORIGINS.has(origin)) return cb(null, true);
    cb(new Error("CORS: origin not allowed"));
  },
  credentials: true,
});
app.use((req, res, next) => {
  const origin = req.get("origin");
  if (origin) {
    try {
      const parsedOrigin = new URL(origin);
      const forwardedHost = req.get("x-forwarded-host")?.split(",")[0]?.trim();
      const forwardedProto = req.get("x-forwarded-proto")?.split(",")[0]?.trim();
      const requestHost = forwardedHost || req.get("host") || "";
      const requestProto = forwardedProto || req.protocol;
      if (
        parsedOrigin.host.toLowerCase() === requestHost.toLowerCase()
        && parsedOrigin.protocol === `${requestProto}:`
      ) {
        return next();
      }
    } catch {
      // Invalid Origin values are rejected by the allowlist middleware below.
    }
  }
  corsMiddleware(req, res, next);
});
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname, "..", "public");
const activityDir = path.join(publicDir, "activity");

app.use("/api", router);
app.use("/activity", express.static(activityDir, { index: false }));
app.get(/^\/activity(?:\/[^/]+)?\/?$/, (_req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.sendFile(path.join(activityDir, "index.html"));
});
app.use(express.static(publicDir));
app.get("/", (_req, res) => res.sendFile(path.join(publicDir, "index.html")));
app.get("/dashboard", (_req, res) => res.sendFile(path.join(publicDir, "dashboard.html")));
export default app;
