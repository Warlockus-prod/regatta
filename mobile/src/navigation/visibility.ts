// Keep controls clear during activities. Reference and course pages retain tabs.
export function showsMainNavigation(path: string): boolean {
  if (/^\/ads(?:\/|$)/.test(path)) return false;
  // Manoeuvres: the learner steers the boat, so the bar goes like in the race (AGENTS rule 11).
  if (/^\/manoeuvres(?:\/|$)/.test(path)) return false;
  if (path === "/simulators") return true;
  return !(/^\/simulator/.test(path) || /^\/(?:game|race-3d)(?:\/|$)/.test(path) || /^\/multiplayer(?:\/race(?:\/|$)|$)/.test(path) || /^\/replay(?:\/|$)/.test(path) || /\/(symulator|egzamin|exam)(?:\/|$)/.test(path));
}

// A screen whose page runs its own full-screen activity inside a WebView (the
// radio work screen in the SRC course) asks for the tab bar to go while it
// lasts. Counted, so overlapping requests cannot show the bar too early.
let hideRequests = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());

/** Hide the tab bar until the returned function is called. */
export function hideMainNavigation(): () => void {
  hideRequests += 1;
  emit();
  let released = false;
  return () => {
    if (released) return;
    released = true;
    hideRequests -= 1;
    emit();
  };
}

export function subscribeMainNavigationHidden(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function mainNavigationHiddenByScreen(): boolean {
  return hideRequests > 0;
}
