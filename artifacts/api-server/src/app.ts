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
// CORS: only allow the Replit preview domain (same-origin dashboard).
// All dashboard API calls are same-origin; cross-origin access is not needed.
const allowedOriginPattern = process.env["REPLIT_DEV_DOMAIN"]
  ? new RegExp(`^https://${process.env["REPLIT_DEV_DOMAIN"].replace(/\./g, "\\.")}`)
  : null;
app.use(
  cors({
    origin: (origin, cb) => {
      // Allow requests with no origin (server-to-server, curl, etc.)
      if (!origin) return cb(null, true);
      if (!allowedOriginPattern || allowedOriginPattern.test(origin)) return cb(null, true);
      cb(new Error("CORS: origin not allowed"));
    },
    credentials: false,
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
