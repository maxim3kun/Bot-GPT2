export const imageFixture = {
  enabled: true, guildEnabled: true, settingsFail: false, consent: true,
  blocked: false, quota: "reserved", reservations: 0, releases: 0,
  health: [] as unknown[],
};
export function resetImages() {
  Object.assign(imageFixture, {
    enabled: true, guildEnabled: true, settingsFail: false, consent: true,
    blocked: false, quota: "reserved", reservations: 0, releases: 0, health: [],
  });
}
