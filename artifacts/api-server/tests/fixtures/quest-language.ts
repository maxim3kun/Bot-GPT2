export const questFixture = {
  personal: null as string | null,
  profile: {
    userId: "user", username: "Test", notifyGuildId: "fr-guild",
    quests: [{ id: 1, title: "Objectif conservé", description: "Description", difficulty: "medium" as const, points: 25, completed: false }],
    totalPoints: 150, completedCount: 0, createdAt: "2026-01-01T00:00:00Z",
  },
};
