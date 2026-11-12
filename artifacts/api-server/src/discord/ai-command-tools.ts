import type { JourneyRequest } from "./transport-planner-types.js";
import type { WeatherRequest } from "./weather-types.js";
/**
 * Deliberately closed tool boundary. Model text is never parsed as a prefix
 * command, and tool arguments cannot supply users, channels, URLs or permissions.
 */
export type AiCommandAction =
  | ({ name: "get_weather" } & WeatherRequest)
  | ({ name: "plan_journey" } & JourneyRequest)
  | { name: "show_help" }
  | { name: "lookup_pokemon"; query: string }
  | { name: "start_minesweeper"; difficulty: "easy" | "medium" | "hard" }
  | { name: "start_connect4" }
  | { name: "start_geoguessr" | "start_guess_logo"; difficulty: "easy" | "medium" | "hard" }
  | { name: "start_trivia" | "start_guess_number" }
   | { name: "search_transport"; mode: "bus" | "metro" | "tram" | "rail" | null; place: string; line?: string; direction?: string; territory?: "fr" | "qc" | "en" | "ie" | "lu" | "ch" | "no" }
  | { name: "play_youtube" | "search_youtube"; query: string }
  | { name: "music_pause" | "music_resume" | "music_skip" | "music_stop" | "music_queue" | "music_current" }
  | { name: "play_radio"; station: string }
  | { name: "module_diagnostic" };

export interface AiToolCall {
  type: string;
  function?: { name: string; arguments: string };
}

export function parseAiCommandTool(
  calls: readonly AiToolCall[],
  stationKeys: readonly string[],
): AiCommandAction | null {
  // Do not partially execute multi-action requests.
  if (calls.length !== 1) return null;
  const call = calls[0];
  if (call.type !== "function" || !call.function) return null;
  let args: Record<string, unknown>;
  try {
    const value: unknown = JSON.parse(call.function.arguments);
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    args = value as Record<string, unknown>;
  } catch { return null; }
  const name = call.function.name;
  if (name === "get_weather" && Object.keys(args).every(k=>["place","territory","when","atDestination"].includes(k))
    && (args.place===undefined||safeSearchText(args.place,140)&&args.place.trim().length>0)
    && (args.when===undefined||safeSearchText(args.when,80)&&args.when.trim().length>0)
    && (args.territory===undefined||["fr","qc"].includes(args.territory as string))
    && (args.atDestination===undefined||typeof args.atDestination==="boolean")
    && !(args.place&&args.atDestination))
    return {name,...args} as AiCommandAction;
  if (name === "plan_journey" && Object.keys(args).every(k => ["mode", "origin", "destination", "time"].includes(k))
    && [null, "car", "transit"].includes(args.mode as string | null)
    && ["origin", "destination", "time"].every(k => args[k] === undefined || safeSearchText(args[k], k === "time" ? 80 : 140) && (args[k] as string).trim().length > 0))
    return { name, mode: args.mode, ...(args.origin ? { origin: args.origin } : {}),
      ...(args.destination ? { destination: args.destination } : {}), ...(args.time ? { time: args.time } : {}) } as AiCommandAction;
  if (["show_help", "start_connect4", "module_diagnostic", "start_trivia", "start_guess_number",
    "music_pause", "music_resume", "music_skip", "music_stop", "music_queue", "music_current"].includes(name)) {
    if (Object.keys(args).length !== 0) return null;
    return { name } as AiCommandAction;
  }
  if (["start_minesweeper", "start_geoguessr", "start_guess_logo"].includes(name) && Object.keys(args).length === 1
    && typeof args.difficulty === "string" && ["easy", "medium", "hard"].includes(args.difficulty)) {
    return { name, difficulty: args.difficulty as "easy" | "medium" | "hard" } as AiCommandAction;
  }
  if (name === "play_radio" && Object.keys(args).length === 1
    && typeof args.station === "string" && stationKeys.includes(args.station)) {
    return { name, station: args.station };
  }
  if (["play_youtube", "search_youtube", "lookup_pokemon"].includes(name) && Object.keys(args).length === 1 && safeSearchText(args.query, 200) && args.query.trim())
    return { name, query: args.query.trim() } as AiCommandAction;
  if (name === "search_transport" && Object.keys(args).every(k => ["mode", "place", "line", "direction", "territory"].includes(k))
    && [null, "bus", "metro", "tram", "rail"].includes(args.mode as string | null) && safeSearchText(args.place, 100)
    && (args.line === undefined || typeof args.line === "string" && /^[\p{L}\p{N}][\p{L}\p{N}._ -]{0,19}$/u.test(args.line))
    && (args.direction === undefined || safeSearchText(args.direction, 100) && args.direction.trim().length > 0)
     && (args.territory === undefined || ["fr", "qc", "en", "ie", "lu", "ch", "no"].includes(args.territory as string)))
    return { name, mode: args.mode, place: args.place.trim(), ...(args.line === undefined ? {} : { line: args.line }),
      ...(args.direction === undefined ? {} : { direction: args.direction.trim() }), ...(args.territory === undefined ? {} : { territory: args.territory }) } as AiCommandAction;
  return null;
}

export function safeSearchText(value: unknown, maximum: number): value is string {
  return typeof value === "string" && value.length <= maximum && !/[\u0000-\u001f\u007f<>`{}]|(?:https?:|www\.|:\/\/)|(?:^|\s)[!/$][\p{L}]/iu.test(value);
}
export const isMusicAction = (action: AiCommandAction) => action.name === "play_radio" || action.name === "play_youtube" || action.name === "search_youtube" || action.name.startsWith("music_");
export const needsVoice = (action: AiCommandAction) => isMusicAction(action) && !["search_youtube", "music_queue", "music_current"].includes(action.name);

export function buildAiCommandTools(stationKeys: string[]) {
  const tool = (name: string, description: string, properties: Record<string, object> = {}, required: string[] = []) => ({
    type: "function" as const,
    function: {
      name, description,
      parameters: { type: "object", properties, required, additionalProperties: false },
    },
  });
  return [
    tool("get_weather","Get a verified forecast on explicit request. Destination means only the requester's verified journey in this channel/persona. Never supply coordinates, URLs, user IDs or invented weather.",{
      place:{type:"string",maxLength:140},territory:{enum:["fr","qc"]},when:{type:"string",maxLength:80},atDestination:{type:"boolean"},
    }),
    tool("plan_journey", "Calculate a verified driving route in metropolitan France or public transit where the official planner covers it. Missing endpoints or mode are clarified; never supply URLs or invented connections.", {
      mode: { enum: ["car", "transit", null] }, origin: { type: "string", maxLength: 140 },
      destination: { type: "string", maxLength: 140 }, time: { type: "string", maxLength: 80 },
    }, ["mode"]),
    tool("show_help", "Show the bot's real help, only when the user requests help."),
    tool("start_minesweeper", "Start a spoiler minesweeper board, only on explicit request.", {
      difficulty: { type: "string", enum: ["easy", "medium", "hard"] },
    }, ["difficulty"]),
    tool("start_connect4", "Start a solo Connect Four game, only on explicit request."),
    tool("play_radio", "Play a known radio in the user's current voice channel, only on explicit request.", {
      station: { type: "string", enum: stationKeys },
    }, ["station"]),
    tool("module_diagnostic", "Read module health. Only server administrators can access this; never change settings."),
    tool("search_transport", "Open the real timetable search, not a transfer itinerary calculator.", {
      mode: { enum: ["bus", "metro", "tram", "rail", null] }, place: { type: "string", maxLength: 100 },
      line: { type: "string", maxLength: 20 }, direction: { type: "string", maxLength: 100 }, territory: { enum: ["fr", "qc", "en", "ie", "lu", "ch", "no"] },
    }, ["mode", "place"]),
    tool("play_youtube", "Search YouTube using the user's exact title or artist; the real player reports success.", {
      query: { type: "string", minLength: 1, maxLength: 200 },
    }, ["query"]),
    tool("search_youtube", "Show YouTube search results without automatically playing audio.", {
      query: { type: "string", minLength: 1, maxLength: 200 },
    }, ["query"]),
    ...["music_pause", "music_resume", "music_skip", "music_stop", "music_queue", "music_current"].map(name => tool(name, "Use the existing music function only on an explicit request.")),
    ...["start_geoguessr", "start_guess_logo"].map(name => tool(name, "Start the existing game only on an explicit request.", {
      difficulty: { enum: ["easy", "medium", "hard"] },
    }, ["difficulty"])),
    tool("start_trivia", "Start the existing trivia, without invented categories or difficulty."),
    tool("start_guess_number", "Start the existing number game: 1 to 100, ten attempts; no custom range."),
  ];
}

export function needsAiCommandConfirmation(_action: AiCommandAction): boolean {
  // All current tools are ordinary actions. The user's explicit request plus
  // existing general AI consent is sufficient; no additional prompt.
  return false;
}

export interface AiCommandAccess {
  blocked: boolean;
  aiEnabled: boolean;
  featureEnabled: boolean;
  consent: boolean;
  inGuild: boolean;
  administrator: boolean;
  userCanUseChannel: boolean;
  botCanReply: boolean;
  userCanUseVoice: boolean;
  botCanUseVoice: boolean;
  voiceAvailable: boolean;
}

export function aiCommandDenial(action: AiCommandAction, access: AiCommandAccess): string | null {
  if (access.blocked) return "blocked";
  if (!access.aiEnabled || !access.featureEnabled) return "disabled";
  if (!access.consent) return "consent";
  if (!access.userCanUseChannel || !access.botCanReply) return "permissions";
  if (action.name === "module_diagnostic" && (!access.inGuild || !access.administrator)) return "administrator";
  if (isMusicAction(action) && !access.inGuild) return "guild";
  if (needsVoice(action)) {
    if (!access.inGuild) return "guild";
    if (!access.voiceAvailable) return "voice";
    if (!access.userCanUseVoice || !access.botCanUseVoice) return "permissions";
  }
  return null;
}

export interface AiCommandExecutor {
  /** Must refresh identity, permissions, features, block status and consent. */
  authorize: (action: AiCommandAction) => Promise<boolean>;
  /** Domain handlers own all success/failure messages. */
  execute: (action: AiCommandAction) => Promise<void>;
}

/**
 * One-shot confirmation bound to its requester, channel and guild. No text
 * such as "yes" and no subsequent model output can confirm an action.
 */
export class AiCommandConfirmation {
  private consumed = false;
  private readonly action: AiCommandAction;
  constructor(
    action: AiCommandAction,
    private readonly requester: string,
    private readonly channel: string,
    private readonly guild: string | null,
    private readonly voiceChannel: string | null,
    private readonly expiresAt: number,
  ) {
    this.action = Object.freeze({ ...action });
  }

  async confirm(
    actor: { userId: string; channelId: string; guildId: string | null; voiceChannelId: string | null },
    executor: AiCommandExecutor,
    now = Date.now(),
  ): Promise<"ignored" | "expired" | "denied" | "executed"> {
    if (actor.userId !== this.requester || actor.channelId !== this.channel || actor.guildId !== this.guild) return "ignored";
    if (this.consumed || now >= this.expiresAt) return "expired";
    this.consumed = true; // Consume before any await: concurrent clicks cannot replay.
    if (actor.voiceChannelId !== this.voiceChannel || !await executor.authorize(this.action)) return "denied";
    await executor.execute(this.action);
    return "executed";
  }

  cancel(): void { this.consumed = true; }
}
