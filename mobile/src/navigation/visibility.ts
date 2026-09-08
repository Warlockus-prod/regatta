// Keep controls clear during activities. Reference and course pages retain tabs.
export function showsMainNavigation(path: string): boolean {
  if (path === "/simulators") return true;
  return !(/^\/simulator/.test(path) || /^\/game(?:\/|$)/.test(path) || /^\/multiplayer\/race(?:\/|$)/.test(path) || /^\/replay(?:\/|$)/.test(path) || /\/(symulator|egzamin|exam)(?:\/|$)/.test(path));
}
