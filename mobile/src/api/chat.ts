/**
 * HTTP client for the sailing AI assistant.
 *
 * Web route: POST https://weektoregatta.com/api/ai-chat
 *   request:  { messages: ChatMessage[], lang }   (last item is the new user turn)
 *   response: { reply: string }
 *
 * The endpoint is a yachting-scoped assistant: it answers sailing / racing /
 * rules questions and points back to app sections, and politely refuses
 * off-topic questions. It is NOT streaming - one JSON reply per call. The
 * backend natively styles ru/en/pl; for es/fr/de/it it mirrors the user's
 * typed language (same behaviour as the web widget).
 *
 * Per ADR-0001 the app consumes the existing web backend as-is - no new
 * mobile backend. We reuse the API base + result envelope from coach.ts but
 * use a longer timeout here because an LLM reply routinely takes >8s.
 */
import type { Lang } from '../i18n/languages';
import { API_BASE, type ApiResult } from './coach';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatResponse {
  reply: string;
}

/** LLM replies can take 10-25s; give the request real headroom. */
const CHAT_TIMEOUT_MS = 30000;

export async function sendChat(
  messages: ChatMessage[],
  lang: Lang,
): Promise<ApiResult<ChatResponse>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CHAT_TIMEOUT_MS);
  try {
    const resp = await fetch(`${API_BASE}/api/ai-chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, lang }),
      signal: controller.signal,
    });
    let parsed: unknown = null;
    try {
      parsed = await resp.json();
    } catch {
      return { ok: false, status: resp.status, error: 'Invalid response' };
    }
    if (!resp.ok) {
      const errMsg =
        parsed &&
        typeof parsed === 'object' &&
        'error' in parsed &&
        typeof (parsed as { error: unknown }).error === 'string'
          ? (parsed as { error: string }).error
          : `HTTP ${resp.status}`;
      return { ok: false, status: resp.status, error: errMsg };
    }
    const reply =
      parsed && typeof parsed === 'object' && 'reply' in parsed
        ? String((parsed as { reply: unknown }).reply ?? '')
        : '';
    if (!reply) return { ok: false, status: resp.status, error: 'Empty reply' };
    return { ok: true, status: resp.status, data: { reply } };
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      return { ok: false, error: 'Request timed out' };
    }
    return { ok: false, error: err instanceof Error ? err.message : 'Network error' };
  } finally {
    clearTimeout(timer);
  }
}
