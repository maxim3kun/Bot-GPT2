export const fixture = {
  consent: "accepted" as "accepted" | "declined" | "unknown",
  requireConsentResult: true,
  globalAi: true,
  globalVoice: true,
  guildAi: true,
  featureReadFails: false,
  blocked: false,
  connection: null as any,
  decoder: null as any,
  subscriptions: 0,
  destroyedStreams: 0,
  reset() {
    this.consent = "accepted";
    this.requireConsentResult = true;
    this.globalAi = true;
    this.globalVoice = true;
    this.guildAi = true;
    this.featureReadFails = false;
    this.blocked = false;
    this.connection = null;
    this.decoder = null;
    this.subscriptions = 0;
    this.destroyedStreams = 0;
  },
};
