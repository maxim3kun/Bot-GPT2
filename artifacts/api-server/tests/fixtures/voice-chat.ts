export const fixture = {
  consent: "accepted" as "accepted" | "declined" | "unknown",
  requireConsentResult: true,
  globalAi: true,
  globalVoice: true,
  guildAi: true,
  featureReadFails: false,
  blocked: false,
  connection: null as any,
  radioStates: new Map<string, any>(),
  voiceCleanupHook: null as ((guildId: string) => void) | null,
  decoder: null as any,
  subscriptions: 0,
  joinCalls: 0,
  radioStopCalls: 0,
  radioMixCalls: 0,
  destroyedStreams: 0,
  radioMixResult: null as boolean | null,
  radioPauseCalls: 0,
  speechPlaybackMs: 2,
  reset() {
    this.consent = "accepted";
    this.requireConsentResult = true;
    this.globalAi = true;
    this.globalVoice = true;
    this.guildAi = true;
    this.featureReadFails = false;
    this.blocked = false;
    this.connection = null;
    this.radioStates.clear();
    this.voiceCleanupHook = null;
    this.decoder = null;
    this.subscriptions = 0;
    this.joinCalls = 0;
    this.radioStopCalls = 0;
    this.radioMixCalls = 0;
    this.destroyedStreams = 0;
    this.radioMixResult = null;
    this.radioPauseCalls = 0;
    this.speechPlaybackMs = 2;
  },
};
