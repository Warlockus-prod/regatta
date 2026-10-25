/** The same daily settings on the server and in a fresh offline install. */
export interface DailySettings {
  day: string;
  seed: number;
  difficulty: "easy" | "medium" | "hard";
  windStrength: "light" | "medium" | "heavy";
  missionId: null;
}

export function dailySettings(day: string): DailySettings {
  const date = Date.parse(`${day}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !Number.isFinite(date) || new Date(date).toISOString().slice(0, 10) !== day) {
    throw new Error("Invalid daily date");
  }
  const hash = Array.from(day).reduce((acc, c) => (acc * 131 + c.charCodeAt(0)) >>> 0, 7);
  const difficulties = ["easy", "medium", "medium", "medium", "hard"] as const;
  const winds = ["light", "medium", "medium", "heavy"] as const;
  return { day, seed: hash % 1000, difficulty: difficulties[hash % difficulties.length], windStrength: winds[(hash >>> 3) % winds.length], missionId: null };
}
