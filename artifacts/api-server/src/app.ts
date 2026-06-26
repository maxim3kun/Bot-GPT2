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
  ...(process.env["REPLIT_DEV_DOMAIN"]
    ? [`https://${process.env["REPLIT_DEV_DOMAIN"]}`]
    : []),
]);
app.use(
  cors({
    origin: (origin, cb) => {
      // Allow requests with no origin (server-to-server, curl, etc.)
      if (!origin) return cb(null, true);
      // Allow any subdomain of the Replit dev domain (handles proxy variations)
      const devDomain = process.env["REPLIT_DEV_DOMAIN"] ?? "";
      if (devDomain && origin.endsWith(devDomain)) return cb(null, true);
      if (ALLOWED_ORIGINS.has(origin)) return cb(null, true);
      cb(new Error("CORS: origin not allowed"));
    },
    credentials: true,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname, "..", "public");

app.use("/api", router);
app.use(express.static(publicDir));
app.get("/", (_req, res) => res.sendFile(path.join(publicDir, "index.html")));
app.get("/dashboard", (_req, res) => res.sendFile(path.join(publicDir, "dashboard.html")));
export default app;
