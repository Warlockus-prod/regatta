/** Framework-free image lifecycle shared by the web and installed app. */
export function createIllustrationAttempt() {
  let active = 0;
  let settled = -1;
  return {
    start(): number { active += 1; return active; },
    settle(token: number): boolean {
      if (active !== token || settled === token) return false;
      settled = token;
      return true;
    },
    invalidate(): void { active += 1; },
  };
}
