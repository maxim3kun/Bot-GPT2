export const f = {
  guilds: {} as Record<string, any>,
  personas: {
    azumi: { id: "azumi", name: "Azumi", ownerId: "owner", profile: "Keep this profile", ttsVoiceId: undefined as string | undefined },
    other: { id: "other", name: "Other", ownerId: "other-owner", profile: "Keep private", ttsVoiceId: "siwis" as string | undefined },
  } as Record<string, any>,
  fail: false,
  admin: true,
  writes: 0,
};
