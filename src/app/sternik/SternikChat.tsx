'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { useSternikPrefs, type ExplLang } from './prefs';

// ============================================================================
// Floating AI instructor chat for the /sternik section.
// Talks to /api/sternik-chat. Other sternik pages can open it programmatically:
//   window.dispatchEvent(new CustomEvent('sternik:ask', {
//     detail: { question: '...', context: '...' } }))
// The optional context (current test question) rides along with the request.
// ============================================================================

interface Msg {
  role: 'user' | 'assistant';
  content: string;
}

const SESSION_KEY = 'sternik.chat.v1';

function loadSession(): Msg[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.sessionStorage.getItem(SESSION_KEY);
    const parsed = raw ? (JSON.parse(raw) as Msg[]) : [];
    return Array.isArray(parsed) ? parsed.slice(-30) : [];
  } catch {
    return [];
  }
}

function saveSession(msgs: Msg[]) {
  try {
    window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(msgs.slice(-30)));
  } catch {
    // ignore
  }
}

/** Tiny renderer: **bold**, newlines, clickable /sternik links. */
function RichText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|\/sternik(?:\/[a-z-]+)?)/g);
  return (
    <>
      {parts.map((p, i) => {
        if (p.startsWith('**') && p.endsWith('**')) {
          return <strong key={i}>{p.slice(2, -2)}</strong>;
        }
        if (p.startsWith('/sternik')) {
          return (
            <a key={i} href={p} className="underline" style={{ color: 'var(--accent-cyan)' }}>
              {p}
            </a>
          );
        }
        return <span key={i}>{p}</span>;
      })}
    </>
  );
}

export default function SternikChat() {
  const { tp, lang } = useI18n();
  const { explLang } = useSternikPrefs();
  const explLangRef = useRef<ExplLang>(explLang);
  explLangRef.current = explLang;
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const contextRef = useRef<string>('');
  const listRef = useRef<HTMLDivElement | null>(null);
  const openRef = useRef(open);
  openRef.current = open;

  useEffect(() => {
    setMsgs(loadSession());
  }, []);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [msgs, open, busy]);

  const send = useCallback(
    async (text: string, context?: string) => {
      const clean = text.trim();
      if (!clean || busy) return;
      setError(null);
      setBusy(true);
      const next: Msg[] = [...loadSession().slice(-20), { role: 'user', content: clean }];
      setMsgs(next);
      saveSession(next);
      // Never hang: abort the request after 30s and surface a retryable error.
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 30_000);
      try {
        const res = await fetch('/api/sternik-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: next.slice(-10), // conversation history (last 10 turns)
            lang,
            explLang: explLangRef.current,
            context: context || contextRef.current || undefined,
          }),
          signal: controller.signal,
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || (data.error && !data.reply)) {
          setError(
            data.error ||
              tp('Сервис недоступен, попробуй позже', 'Service unavailable, try later', 'Usluga niedostepna, sprobuj pozniej'),
          );
        } else {
          const withReply: Msg[] = [...next, { role: 'assistant', content: String(data.reply || '') }];
          setMsgs(withReply);
          saveSession(withReply);
        }
      } catch (e) {
        setError(
          e instanceof Error && e.name === 'AbortError'
            ? tp('Ответ занял слишком долго. Попробуй ещё раз.', 'The reply took too long. Try again.', 'Odpowiedz trwala za dlugo. Sprobuj jeszcze raz.')
            : tp('Ошибка сети. Попробуй ещё раз.', 'Network error. Try again.', 'Blad sieci. Sprobuj jeszcze raz.'),
        );
      } finally {
        clearTimeout(timer);
        setBusy(false);
      }
    },
    [busy, lang, tp],
  );

  // Programmatic asks from the trainer/exam pages.
  useEffect(() => {
    const onAsk = (e: Event) => {
      const detail = (e as CustomEvent<{ question?: string; context?: string; explLang?: ExplLang }>).detail || {};
      contextRef.current = detail.context || '';
      if (detail.explLang) explLangRef.current = detail.explLang;
      setOpen(true);
      if (detail.question) {
        void send(detail.question, detail.context);
      }
    };
    window.addEventListener('sternik:ask', onAsk);
    return () => window.removeEventListener('sternik:ask', onAsk);
  }, [send]);

  const quick: { label: string; q: string }[] = [
    {
      label: tp('С чего начать?', 'Where to start?', 'Od czego zaczac?'),
      q: tp(
        'Я готовлюсь к экзамену sternik motorowodny. С чего начать и что учить в первую очередь?',
        'I am preparing for the sternik motorowodny exam. Where should I start?',
        'Przygotowuje sie do egzaminu na sternika motorowodnego. Od czego zaczac nauke?',
      ),
    },
    {
      label: tp('Кардинальные знаки', 'Cardinal marks', 'Znaki kardynalne'),
      q: tp(
        'Объясни кардинальные знаки и мнемонику с часами (E=3, S=6, W=9, N=непрерывно)',
        'Explain cardinal marks and the clock mnemonic',
        'Wyjasnij znaki kardynalne i mnemotechnike zegarowa',
      ),
    },
    {
      label: tp('Правило правой руки', 'Right-hand rule', 'Prawo drogi'),
      q: tp(
        'Объясни коротко prawo drogi: кто кому уступает на воде?',
        'Explain briefly who gives way on the water',
        'Wyjasnij krotko prawo drogi: kto komu ustepuje?',
      ),
    },
  ];

  return (
    <>
      {/* Launcher */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={tp('AI-инструктор', 'AI instructor', 'Instruktor AI')}
        className="fixed bottom-20 right-4 z-40 h-12 w-12 rounded-full shadow-lg flex items-center justify-center transition hover:scale-105 active:scale-95"
        style={{
          background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-teal))',
          color: '#04222e',
          fontSize: 22,
        }}
      >
        {open ? '×' : '🎓'}
      </button>

      {/* Panel */}
      {open && (
        <div
          className="fixed z-50 flex flex-col overflow-hidden rounded-t-2xl sm:rounded-2xl shadow-2xl"
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-subtle)',
            right: 0,
            left: 0,
            bottom: 0,
            maxHeight: '75vh',
            height: 520,
          }}
          data-desktop-panel
        >
          <style>{`
            @media (min-width: 640px) {
              [data-desktop-panel] { left: auto !important; right: 16px !important; bottom: 84px !important; width: 390px; }
            }
          `}</style>
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-subtle)' }}
          >
            <div>
              <div className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                🎓 {tp('AI-инструктор', 'AI instructor', 'Instruktor AI')}
              </div>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {tp('Отвечает на вопросы об экзамене sternik motorowodny', 'Answers sternik motorowodny exam questions', 'Odpowiada na pytania o egzamin')}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={tp('Закрыть', 'Close', 'Zamknij')}
              className="text-xl px-2"
              style={{ color: 'var(--text-secondary)' }}
            >
              ×
            </button>
          </div>

          <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {msgs.length === 0 && (
              <div
                className="rounded-xl px-3 py-2 text-sm"
                style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}
              >
                {tp(
                  'Привет! Я помогу подготовиться к экзамену: объясню правило, переведу вопрос, подскажу мнемонику. Спрашивай по-русски или po polsku.',
                  'Hi! I help you prepare: I explain rules, translate questions, share mnemonics.',
                  'Czesc! Pomoge w przygotowaniu: wyjasnie przepis, przetlumacze pytanie, podpowiem mnemotechnike.',
                )}
              </div>
            )}
            {msgs.map((m, i) => (
              <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                <div
                  className="max-w-[85%] whitespace-pre-wrap rounded-xl px-3 py-2 text-sm leading-relaxed"
                  style={
                    m.role === 'user'
                      ? { background: 'var(--accent-cyan)', color: '#04222e' }
                      : { background: 'var(--bg-secondary)', color: 'var(--text-primary)' }
                  }
                >
                  <RichText text={m.content} />
                </div>
              </div>
            ))}
            {busy && (
              <div className="flex justify-start">
                <div
                  className="rounded-xl px-3 py-2 text-sm animate-pulse"
                  style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}
                >
                  {tp('Инструктор печатает...', 'Typing...', 'Instruktor pisze...')}
                </div>
              </div>
            )}
            {error && (
              <div className="rounded-xl px-3 py-2 text-sm" style={{ background: 'rgba(255,68,68,0.12)', color: 'var(--danger)' }}>
                {error}
              </div>
            )}
          </div>

          {msgs.length === 0 && (
            <div className="flex flex-wrap gap-2 px-4 pb-2">
              {quick.map((c) => (
                <button
                  key={c.label}
                  type="button"
                  onClick={() => void send(c.q)}
                  className="rounded-full px-3 py-1.5 text-xs transition hover:opacity-80"
                  style={{ background: 'var(--hover-bg)', color: 'var(--accent-cyan)', border: '1px solid var(--border-subtle)' }}
                >
                  {c.label}
                </button>
              ))}
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              const v = input;
              setInput('');
              void send(v);
            }}
            className="flex gap-2 px-4 py-3"
            style={{ borderTop: '1px solid var(--border-subtle)' }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={tp('Спроси про экзамен...', 'Ask about the exam...', 'Zapytaj o egzamin...')}
              className="min-w-0 flex-1 rounded-xl px-3 py-2 text-sm outline-none"
              style={{
                background: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-subtle)',
              }}
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              className="rounded-xl px-4 py-2 text-sm font-semibold transition disabled:opacity-40"
              style={{ background: 'var(--accent-cyan)', color: '#04222e' }}
            >
              {tp('Отпр.', 'Send', 'Wyslij')}
            </button>
          </form>
        </div>
      )}
    </>
  );
}
