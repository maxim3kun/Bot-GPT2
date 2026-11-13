import {
  PermissionFlagsBits,
  type Client,
  type Message,
} from "discord.js";
import { isMongoAvailable, isMongoConnected } from "../lib/db.js";
import { logger } from "../lib/logger.js";
import { getAdminChannelId } from "./command-suggest.js";
import { getPrefix } from "./prefix-store.js";
import { recordDiagnosticMetadata } from "./ai-observability-store.js";

export type TechnicianModuleName = "ai" | "image" | "games" | "admin" | "music" | "help" | "other" | `feature:${string}`;
export type TechnicianDependencyName = "groq" | "suno" | "huggingface" | "cloudflare";
export type ModuleHealthStatus = "unknown" | "healthy" | "degraded" | "down";
export interface TechnicianContext {
  guildId: string | null;
  client: Client;
}

interface ModuleState {
  status: ModuleHealthStatus;
  consecutiveFailures: number;
  totalFailures: number;
  lastFailureAt: number | null;
  lastSuccessAt: number | null;
  lastErrorType: string | null;
  circuitOpenUntil: number;
  probeInFlight: boolean;
}

interface DependencyState {
  status: Exclude<ModuleHealthStatus, "unknown">;
  consecutiveFailures: number;
  lastFailureAt: number | null;
  lastSuccessAt: number | null;
  lastErrorType: string | null;
}

interface FailureRecord {
  previousStatus: ModuleHealthStatus;
  currentStatus: ModuleHealthStatus;
  errorType: string;
}

const FAILURE_THRESHOLD = 3;
const CIRCUIT_COOLDOWN_MS = 60_000;
const coreModules: TechnicianModuleName[] = ["ai", "image", "games", "music", "admin", "help", "other"];
const moduleStates = new Map<TechnicianModuleName, ModuleState>();
const dependencyStates = new Map<TechnicianDependencyName, DependencyState>();

function getModuleState(name: TechnicianModuleName): ModuleState {
  let state = moduleStates.get(name);
  if (!state) {
    state = {
      status: "unknown",
      consecutiveFailures: 0,
      totalFailures: 0,
      lastFailureAt: null,
      lastSuccessAt: null,
      lastErrorType: null,
      circuitOpenUntil: 0,
      probeInFlight: false,
    };
    moduleStates.set(name, state);
  }
  return state;
}

function getErrorType(error: unknown): string {
  return error instanceof Error ? error.name || "Error" : "UnknownError";
}

function recordDependencySuccess(name: TechnicianDependencyName): void {
  dependencyStates.set(name, {
    status: "healthy",
    consecutiveFailures: 0,
    lastFailureAt: dependencyStates.get(name)?.lastFailureAt ?? null,
    lastSuccessAt: Date.now(),
    lastErrorType: dependencyStates.get(name)?.lastErrorType ?? null,
  });
}

function recordDependencyFailure(name: TechnicianDependencyName, errorType: string): void {
  const previous = dependencyStates.get(name);
  const consecutiveFailures = (previous?.consecutiveFailures ?? 0) + 1;
  dependencyStates.set(name, {
    status: consecutiveFailures >= FAILURE_THRESHOLD ? "down" : "degraded",
    consecutiveFailures,
    lastFailureAt: Date.now(),
    lastSuccessAt: previous?.lastSuccessAt ?? null,
    lastErrorType: errorType,
  });
}

function recordFailure(
  name: TechnicianModuleName,
  error: unknown,
  dependency?: TechnicianDependencyName,
): FailureRecord {
  const state = getModuleState(name);
  const previousStatus = state.status;
  const errorType = getErrorType(error);
  state.consecutiveFailures++;
  state.totalFailures++;
  state.lastFailureAt = Date.now();
  state.lastErrorType = errorType;
  state.status = state.consecutiveFailures >= FAILURE_THRESHOLD ? "down" : "degraded";
  state.probeInFlight = false;
  state.circuitOpenUntil = state.status === "down" ? Date.now() + CIRCUIT_COOLDOWN_MS : 0;
  if (dependency) recordDependencyFailure(dependency, errorType);
  return { previousStatus, currentStatus: state.status, errorType };
}

export function recordModuleSuccess(
  name: TechnicianModuleName,
  dependency?: TechnicianDependencyName,
): void {
  const state = getModuleState(name);
  state.status = "healthy";
  state.consecutiveFailures = 0;
  state.lastSuccessAt = Date.now();
  state.circuitOpenUntil = 0;
  state.probeInFlight = false;
  if (dependency) recordDependencySuccess(dependency);
}

export function shouldUseModuleFallback(name: TechnicianModuleName): boolean {
  const state = getModuleState(name);
  if (state.status !== "down") return false;
  if (Date.now() < state.circuitOpenUntil || state.probeInFlight) return true;
  state.probeInFlight = true;
  return false;
}

export function resetModuleProbe(name: TechnicianModuleName): void {
  getModuleState(name).probeInFlight = false;
}

export function getModuleLastFailureAt(name: TechnicianModuleName): number | null {
  return getModuleState(name).lastFailureAt;
}

async function notifyTechnicians(
  context: TechnicianContext,
  moduleName: TechnicianModuleName,
  record: FailureRecord,
): Promise<void> {
  if (record.currentStatus !== "down" || record.previousStatus === "down" || !context.guildId) return;

  const channelId = getAdminChannelId(context.guildId);
  if (!channelId) {
    logger.warn({ module: moduleName, guildId: context.guildId }, "Module is down; no technician alert channel is configured");
    return;
  }

  try {
    const channel = await context.client.channels.fetch(channelId);
    if (!channel || !("send" in channel)) {
      logger.warn({ module: moduleName, guildId: context.guildId }, "Technician alert channel is unavailable");
      return;
    }
    await (channel as { send: (content: string) => Promise<unknown> }).send(
      `🚨 **Module en panne : ${moduleLabel(moduleName)}**\n` +
      `${record.errorType} après ${FAILURE_THRESHOLD} échecs consécutifs. Le circuit est ouvert pendant 1 minute ; le bot répond en mode dégradé.\n` +
      `Utilisez \`${getPrefix(context.guildId)}tech status\` pour consulter l’état des modules.`,
    );
  } catch (error) {
    logger.error({ err: error, module: moduleName }, "Technician alert could not be delivered");
  }
}

export function recordModuleFailureState(
  moduleName: TechnicianModuleName,
  error: unknown,
  dependency?: TechnicianDependencyName,
): FailureRecord {
  const record = recordFailure(moduleName, error, dependency);
  recordDiagnosticMetadata(moduleName, error, dependency);
  logger.error({ err: error, module: moduleName, dependency }, "Module operation failed");
  return record;
}

export async function reportModuleFailure(
  context: TechnicianContext,
  moduleName: TechnicianModuleName,
  error: unknown,
  dependency?: TechnicianDependencyName,
): Promise<void> {
  const record = recordModuleFailureState(moduleName, error, dependency);
  await notifyTechnicians(context, moduleName, record);
}

function moduleLabel(name: TechnicianModuleName): string {
  const labels: Record<string, string> = {
    ai: "IA",
    image: "Images",
    games: "Jeux",
    music: "Musique",
    admin: "Administration",
    other: "Autres commandes",
    help: "Aide",
  };
  return labels[name] ?? name.replace(/^feature:/, "Fonction : ");
}

export function moduleForMessageCommand(command: string | undefined): TechnicianModuleName {
  if (!command) return "other";
  if (["help", "aide", "guide"].includes(command)) return "help";
  if (command === "image") return "image";
  if (["conspiracy", "ai", "persona", "ask", "ia"].includes(command)) return "ai";
  if ([
    "minesweeper", "mine", "geo", "trivia", "tierlist", "tier", "blindtest", "musicquiz",
    "milliongame", "million", "guessnumber", "guess", "connect4", "guessthelogo",
    "guesslogo", "devinelelogo", "shellgame", "hangman", "pendu",
  ].includes(command)) return "games";
  if ([
    "prefix", "voicechannels", "voicesalons", "salonsvocaux", "suggest", "suggestion",
    "sugerencia", "unblock", "banlist", "admin", "tech", "technician",
  ].includes(command)) return "admin";
  if ([
    "music", "generator", "balance", "join", "leave", "voice", "subtitles", "dj",
    "soundboard", "sb", "radio", "r", "classic", "youtube", "yt", "y", "yb", "live",
    "skip", "voteskip", "vs", "queue", "q", "np", "likes", "liked", "karaoke", "k",
    "playlist", "shazam",
  ].includes(command)) return "music";
  return "other";
}

export function moduleDependencyForCommand(
  command: string | undefined,
  args: string[],
): TechnicianDependencyName | undefined {
  if (!command) return undefined;
  if (["ask", "ia", "conspiracy"].includes(command) && process.env["GROQ_API_KEY"]) return "groq";
  if (command === "ai" && args[0]?.toLowerCase() === "battle" && process.env["GROQ_API_KEY"]) return "groq";
  if (
    command === "persona"
    && ["create", "generate", "use", "talk", "learn"].includes(args[0]?.toLowerCase() ?? "")
    && process.env["GROQ_API_KEY"]
  ) {
    return "groq";
  }
  if (command === "trivia" && process.env["GROQ_API_KEY"]) return "groq";
  if (["music", "generator", "balance"].includes(command) && process.env["SUNO_API_KEY"]) return "suno";
  if (command === "image" && process.env["ACCOUNT_ID"] && process.env["TOKEN_API"]) return "cloudflare";
  if (command === "image" && process.env["HUGGINGFACE_TOKEN"]) return "huggingface";
  return undefined;
}

function statusSymbol(status: ModuleHealthStatus): string {
  if (status === "healthy") return "🟢";
  if (status === "degraded") return "🟠";
  if (status === "down") return "🔴";
  return "⚪";
}

function statusText(status: ModuleHealthStatus): string {
  if (status === "healthy") return "opérationnel";
  if (status === "degraded") return "dégradé";
  if (status === "down") return "KO — mode dégradé actif";
  return "pas encore testé";
}

function dependencyLine(
  label: string,
  configured: boolean,
  state: DependencyState | undefined,
): string {
  if (!configured) return `⚪ **${label}** : non configuré`;
  if (!state) return `⚪ **${label}** : configuré, pas encore testé`;
  const status = state.status;
  const detail = status === "healthy"
    ? "opérationnel"
    : status === "down"
      ? `KO (${state.lastErrorType ?? "erreur"})`
      : `dégradé (${state.lastErrorType ?? "erreur"})`;
  return `${statusSymbol(status)} **${label}** : ${detail}`;
}

function formatLastEvent(timestamp: number | null): string {
  if (!timestamp) return "jamais";
  return new Date(timestamp).toLocaleString("fr-FR", {
    timeZone: "Europe/Paris",
    dateStyle: "short",
    timeStyle: "short",
  });
}

function technicianReport(client: Client): string {
  const moduleLines = coreModules.map((name) => {
    const state = getModuleState(name);
    const detail = state.status === "unknown"
      ? ""
      : state.status === "healthy"
        ? ` — dernière réussite ${formatLastEvent(state.lastSuccessAt)}`
        : ` — ${state.consecutiveFailures} échec(s), dernier ${formatLastEvent(state.lastFailureAt)}`;
    return `${statusSymbol(state.status)} **${moduleLabel(name)}** : ${statusText(state.status)}${detail}`;
  });

  const failedFeatures = [...moduleStates.entries()]
    .filter(([name, state]) => name.startsWith("feature:") && state.status !== "healthy")
    .map(([name, state]) =>
      `${statusSymbol(state.status)} **${moduleLabel(name)}** : ${statusText(state.status)}`,
    );
  if (failedFeatures.length > 0) {
    moduleLines.push(...failedFeatures.slice(0, 6));
    if (failedFeatures.length > 6) moduleLines.push(`… et ${failedFeatures.length - 6} autre(s)`);
  }

  const mongoConnected = isMongoConnected();
  const mongoAvailable = isMongoAvailable();
  const dependencies = [
    `${client.isReady() ? "🟢" : "🔴"} **Discord** : ${client.isReady() ? "connecté" : "déconnecté"}`,
    `${!mongoConnected ? "🟠" : mongoAvailable ? "🟢" : "🔴"} **MongoDB** : ${
      !mongoConnected
        ? "indisponible, stockage JSON de secours actif"
        : mongoAvailable
          ? "connecté"
          : "connecté mais dernier heartbeat en échec"
    }`,
    dependencyLine("Groq", Boolean(process.env["GROQ_API_KEY"]), dependencyStates.get("groq")),
    dependencyLine("Suno", Boolean(process.env["SUNO_API_KEY"]), dependencyStates.get("suno")),
    dependencyLine("Hugging Face", Boolean(process.env["HUGGINGFACE_TOKEN"]), dependencyStates.get("huggingface")),
    dependencyLine("Cloudflare Images", Boolean(process.env["ACCOUNT_ID"] && process.env["TOKEN_API"]), dependencyStates.get("cloudflare")),
  ];

  const activeFailures = [...moduleStates.values()].filter((state) => state.status === "degraded" || state.status === "down").length;
  const header = activeFailures > 0
    ? `🛠️ **Technicien — ${activeFailures} module(s) à vérifier**`
    : "🛠️ **Technicien — aucun module en panne détecté**";
  return `${header}\n\n**Modules**\n${moduleLines.join("\n")}\n\n**Dépendances**\n${dependencies.join("\n")}`;
}

export async function handleTechnicianCommand(
  message: Message,
  args: string[],
): Promise<boolean> {
  const isAdmin = message.member?.permissions.has(PermissionFlagsBits.Administrator)
    || message.member?.permissions.has(PermissionFlagsBits.ManageGuild);
  if (!isAdmin) {
    await message.reply("🔒 Cette commande est réservée aux administrateurs du serveur.");
    return true;
  }

  const subcommand = args[0]?.toLowerCase();
  if (subcommand && subcommand !== "status") {
    await message.reply(`❓ Utilisation : \`${getPrefix(message.guildId)}tech status\``);
    return true;
  }

  await message.reply(technicianReport(message.client));
  return true;
}
