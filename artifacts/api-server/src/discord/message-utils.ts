export type SendableChannel = {
  id: string;
  send: (...args: unknown[]) => Promise<unknown>;
  sendTyping: () => Promise<void>;
};

export function isSendable(channel: unknown): channel is SendableChannel {
  return typeof channel === "object" && channel !== null && "send" in channel && "sendTyping" in channel;
}
