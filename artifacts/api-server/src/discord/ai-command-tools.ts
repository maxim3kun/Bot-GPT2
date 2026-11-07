/**
 * Deliberately closed tool boundary. Model text is never parsed as a prefix
 * command, and tool arguments cannot supply users, channels, URLs or permissions.
 */
export type AiCommandAction =
  | { name: "show_help" }
  | { name: "start_minesweeper"; difficulty: "easy" | "medium" | "hard" }
  | { name: "start_connect4" }
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
  if (["show_help", "start_connect4", "module_diagnostic"].includes(name)) {
    if (Object.keys(args).length !== 0) return null;
    return { name } as AiCommandAction;
  }
  if (name === "start_minesweeper" && Object.keys(args).length === 1
    && typeof args.difficulty === "string" && ["easy", "medium", "hard"].includes(args.difficulty)) {
    return { name, difficulty: args.difficulty as "easy" | "medium" | "hard" };
  }
  if (name === "play_radio" && Object.keys(args).length === 1
    && typeof args.station === "string" && stationKeys.includes(args.station)) {
    return { name, station: args.station };
  }
  return null;
}

export function buildAiCommandTools(stationKeys: string[]) {
  const tool = (name: string, description: string, properties: Record<string, object> = {}, required: string[] = []) => ({
    type: "function" as const,
    function: {
      name, description,
      parameters: { type: "object", properties, required, additionalProperties: false },
    },
  });
  return [
    tool("show_help", "Show the bot's real help, only when the user requests help."),
    tool("start_minesweeper", "Start a spoiler minesweeper board, only on explicit request.", {
      difficulty: { type: "string", enum: ["easy", "medium", "hard"] },
    }, ["difficulty"]),
    tool("start_connect4", "Start a solo Connect Four game, only on explicit request."),
    tool("play_radio", "Play a known radio in the user's current voice channel, only on explicit request.", {
      station: { type: "string", enum: stationKeys },
    }, ["station"]),
    tool("module_diagnostic", "Read module health. Only server administrators can access this; never change settings."),
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
  if (action.name === "start_connect4" && !access.inGuild) return "guild";
  if (action.name === "play_radio") {
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
