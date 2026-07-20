// expo-router hands route params as string | string[] | undefined. The embed
// URL only takes flat strings, so normalize and drop anything empty.
//
// This exists because deep links carry lesson state (e.g. bootcamp opens the
// trainer at ?drill=hold-trim); before this, SimWebView built the URL from
// lang+embed only and silently dropped the drill, landing the learner on the
// generic simulator instead of the lesson.
export function passthroughQuery(
  params: Record<string, string | string[] | undefined>,
): Record<string, string> | undefined {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(params)) {
    const v = Array.isArray(value) ? value[0] : value;
    if (typeof v === 'string' && v.length > 0) out[key] = v;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}
