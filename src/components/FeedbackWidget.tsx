'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useI18n } from '@/lib/i18n';

type Tab = 'ai' | 'feedback';
type Kind = 'feedback' | 'bug';
type Category = 'useful' | 'unclear' | 'idea' | 'other';

interface Props {
  /** Hide on specific routes (e.g. fullscreen game) if needed */
  hideOn?: string[];
}

interface ChatMsg {
  role: 'user' | 'assistant';
  content: string;
}

export default function FeedbackWidget({ hideOn = [] }: Props) {
  const { tp, lang } = useI18n();

  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('ai');
  const [shouldHide, setShouldHide] = useState(false);

  // Feedback tab state
  const [kind, setKind] = useState<Kind>('feedback');
  const [category, setCategory] = useState<Category>('useful');
  const [message, setMessage] = useState('');
  const [expected, setExpected] = useState('');
  const [actual, setActual] = useState('');
  const [contact, setContact] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [path, setPath] = useState<string>('');

  // AI chat state
  const [chat, setChat] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setPath(window.location.pathname);
      setShouldHide(hideOn.some((p) => window.location.pathname.startsWith(p)));
    }
  }, [hideOn, open]);

  // Reset chat scroll on new message
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chat, chatLoading]);

  const categories: { id: Category; labelRu: string; labelEn: string; labelPl: string; emoji: string }[] = [
    { id: 'useful', labelRu: 'Полезно', labelEn: 'Useful', labelPl: 'Przydatne', emoji: '👍' },
    { id: 'unclear', labelRu: 'Непонятно', labelEn: 'Unclear', labelPl: 'Niejasne', emoji: '❓' },
    { id: 'idea', labelRu: 'Идея', labelEn: 'Idea', labelPl: 'Pomysł', emoji: '💡' },
    { id: 'other', labelRu: 'Другое', labelEn: 'Other', labelPl: 'Inne', emoji: '✏️' },
  ];

  const submitFeedback = useCallback(async () => {
    if (!message.trim()) {
      setError(tp('Напиши пару слов, что улучшить', 'Write a couple of words', 'Napisz kilka słów'));
      return;
    }
    setSending(true);
    setError(null);
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind,
          category: kind === 'feedback' ? category : undefined,
          message,
          expected: kind === 'bug' ? expected : undefined,
          actual: kind === 'bug' ? actual : undefined,
          contact,
          path,
          viewport: `${window.innerWidth}x${window.innerHeight}`,
          language: lang,
          ua: navigator.userAgent,
          ts: Date.now(),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || tp('Не удалось отправить', 'Failed to send', 'Nie udało się wysłać'));
      }
      setSent(true);
      setMessage('');
      setExpected('');
      setActual('');
      setContact('');
      setTimeout(() => {
        setOpen(false);
        setSent(false);
      }, 1800);
    } catch (err) {
      setError(err instanceof Error ? err.message : tp('Ошибка сети', 'Network error', 'Błąd sieci'));
    } finally {
      setSending(false);
    }
  }, [kind, category, message, expected, actual, contact, path, lang, tp]);

  const sendChat = useCallback(async () => {
    const input = chatInput.trim();
    if (!input || chatLoading) return;
    const userMsg: ChatMsg = { role: 'user', content: input };
    const nextChat = [...chat, userMsg];
    setChat(nextChat);
    setChatInput('');
    setChatLoading(true);
    setChatError(null);
    try {
      const res = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: nextChat, lang }),
      });
      const data = await res.json();
      if (data.error && !data.reply) {
        throw new Error(data.error);
      }
      setChat([...nextChat, { role: 'assistant', content: data.reply || '' }]);
    } catch (err) {
      setChatError(err instanceof Error ? err.message : tp('Ошибка сети', 'Network error', 'Błąd sieci'));
    } finally {
      setChatLoading(false);
    }
  }, [chatInput, chat, chatLoading, lang, tp]);

  if (shouldHide) return null;

  return (
    <>
      {/* Floating trigger */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label={tp('Открыть ассистента', 'Open assistant', 'Otwórz asystenta')}
          className="fixed bottom-4 right-4 z-40 w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition hover:scale-105 active:scale-95"
          style={{
            background: 'linear-gradient(135deg, var(--accent-cyan), #0099cc)',
            color: '#0a1628',
            boxShadow: '0 4px 16px rgba(0, 212, 255, 0.25)',
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        </button>
      )}

      {/* Modal */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          style={{ background: 'rgba(5, 12, 24, 0.75)', backdropFilter: 'blur(6px)' }}
          onClick={() => !sending && setOpen(false)}
        >
          <div
            className="card w-full sm:max-w-md p-5 sm:p-6 rounded-t-2xl sm:rounded-2xl max-h-[92vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
            style={{ border: '1px solid rgba(0, 212, 255, 0.3)' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-3 shrink-0">
              <h2 className="text-lg font-semibold">
                {tab === 'ai'
                  ? tp('AI-ассистент', 'AI assistant', 'Asystent AI')
                  : sent
                    ? tp('Спасибо! ✨', 'Thanks! ✨', 'Dziękuję! ✨')
                    : kind === 'feedback'
                      ? tp('Отзыв', 'Feedback', 'Opinia')
                      : tp('Сообщить о проблеме', 'Report a problem', 'Zgłoś problem')}
              </h2>
              <button
                onClick={() => setOpen(false)}
                disabled={sending}
                aria-label="Close"
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] w-8 h-8 flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            {/* Tabs */}
            <div className="grid grid-cols-2 gap-1 mb-4 shrink-0 rounded-lg p-1"
                 style={{ background: 'rgba(139, 167, 184, 0.08)' }}>
              <button
                onClick={() => setTab('ai')}
                className="py-2 rounded-md text-sm font-medium transition"
                style={{
                  background: tab === 'ai' ? 'rgba(0, 212, 255, 0.2)' : 'transparent',
                  color: tab === 'ai' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                }}
              >
                🧭 {tp('Спросить AI', 'Ask AI', 'Zapytaj AI')}
              </button>
              <button
                onClick={() => setTab('feedback')}
                className="py-2 rounded-md text-sm font-medium transition"
                style={{
                  background: tab === 'feedback' ? 'rgba(0, 212, 255, 0.2)' : 'transparent',
                  color: tab === 'feedback' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                }}
              >
                💬 {tp('Отзыв', 'Feedback', 'Opinia')}
              </button>
            </div>

            {/* === AI TAB === */}
            {tab === 'ai' && (
              <div className="flex flex-col flex-1 min-h-0">
                <div
                  ref={chatScrollRef}
                  className="flex-1 overflow-y-auto space-y-3 pr-1 min-h-[220px] max-h-[52vh]"
                >
                  {chat.length === 0 && (
                    <div className="text-sm text-[var(--text-muted)] leading-relaxed p-3 rounded-lg" style={{ background: 'rgba(0, 212, 255, 0.05)' }}>
                      {tp(
                        'Привет! Спроси что-нибудь про яхтинг: курсы к ветру, правила, трим парусов, как лавировать. Сначала направлю по разделам сайта - если там нет, отвечу сам.',
                        "Hi! Ask anything about sailing: points of sail, rules, sail trim, tacking. I'll point you to a section of the site first - if it's not there, I'll answer myself.",
                        "Cześć! Zapytaj o cokolwiek z żeglarstwa: kursy, przepisy, trym żagli, halsowanie. Najpierw wskażę sekcję strony - jeśli tam nie ma, odpowiem sam."
                      )}
                      <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
                        {([
                          tp('Как начать лавировку?', 'How to start tacking?', 'Jak zacząć halsowanie?'),
                          tp('Что такое фордевинд?', 'What is running?', 'Co to fordewind?'),
                          tp('Что такое apparent wind?', 'What is apparent wind?', 'Co to apparent wind?'),
                        ]).map((q) => (
                          <button
                            key={q}
                            onClick={() => setChatInput(q)}
                            className="px-2 py-1 rounded-full border border-[rgba(0,212,255,0.25)] text-[var(--accent-cyan)] hover:bg-[rgba(0,212,255,0.08)] transition"
                          >
                            {q}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {chat.map((m, i) => (
                    <ChatBubble key={i} role={m.role} content={m.content} />
                  ))}

                  {chatLoading && (
                    <div className="text-sm text-[var(--text-muted)] flex items-center gap-2 px-2">
                      <span className="inline-block w-2 h-2 rounded-full pulse-gentle" style={{ background: 'var(--accent-cyan)' }} />
                      {tp('Думаю...', 'Thinking...', 'Myślę...')}
                    </div>
                  )}

                  {chatError && (
                    <div className="text-xs px-3 py-2 rounded" style={{ background: 'rgba(255, 68, 68, 0.1)', color: 'var(--danger)' }}>
                      {chatError}
                    </div>
                  )}
                </div>

                <form
                  onSubmit={(e) => { e.preventDefault(); sendChat(); }}
                  className="mt-3 flex gap-2 shrink-0"
                >
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder={tp('Спроси про яхтинг...', 'Ask about sailing...', 'Zapytaj o żeglarstwo...')}
                    disabled={chatLoading}
                    className="flex-1 px-3 py-2 rounded-lg text-sm"
                    style={{
                      background: 'var(--bg-secondary)',
                      border: '1px solid rgba(0, 212, 255, 0.15)',
                      color: 'var(--text-primary)',
                    }}
                  />
                  <button
                    type="submit"
                    disabled={chatLoading || !chatInput.trim()}
                    className="px-4 py-2 rounded-lg font-semibold text-sm disabled:opacity-40"
                    style={{
                      background: 'linear-gradient(135deg, var(--accent-cyan), #0099cc)',
                      color: '#0a1628',
                    }}
                  >
                    →
                  </button>
                </form>
                <div className="text-[10px] text-[var(--text-muted)] mt-2 text-center">
                  {tp('Только темы яхтинга. Powered by Claude.', 'Sailing topics only. Powered by Claude.', 'Tylko żeglarstwo. Powered by Claude.')}
                </div>
              </div>
            )}

            {/* === FEEDBACK TAB === */}
            {tab === 'feedback' && (
              <div className="flex-1 overflow-y-auto">
                {sent ? (
                  <p className="text-sm text-[var(--text-secondary)]">
                    {tp('Получил, буду разбирать. Если указал контакт - отвечу.',
                        "Got it. I'll go through this. If you left a contact, I'll reply.",
                        'Otrzymałem. Przejrzę. Jeśli zostawiłeś kontakt - odpowiem.')}
                  </p>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-2 mb-4">
                      <button
                        onClick={() => setKind('feedback')}
                        className={`py-2.5 rounded-lg text-sm font-medium transition ${kind === 'feedback' ? '' : 'opacity-60 hover:opacity-90'}`}
                        style={{
                          background: kind === 'feedback' ? 'rgba(0, 212, 255, 0.15)' : 'rgba(139, 167, 184, 0.08)',
                          border: `1px solid ${kind === 'feedback' ? 'rgba(0, 212, 255, 0.4)' : 'rgba(139, 167, 184, 0.2)'}`,
                          color: kind === 'feedback' ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                        }}
                      >
                        💬 {tp('Отзыв', 'Feedback', 'Opinia')}
                      </button>
                      <button
                        onClick={() => setKind('bug')}
                        className={`py-2.5 rounded-lg text-sm font-medium transition ${kind === 'bug' ? '' : 'opacity-60 hover:opacity-90'}`}
                        style={{
                          background: kind === 'bug' ? 'rgba(255, 68, 68, 0.15)' : 'rgba(139, 167, 184, 0.08)',
                          border: `1px solid ${kind === 'bug' ? 'rgba(255, 68, 68, 0.4)' : 'rgba(139, 167, 184, 0.2)'}`,
                          color: kind === 'bug' ? 'var(--danger)' : 'var(--text-secondary)',
                        }}
                      >
                        🐛 {tp('Проблема', 'Bug', 'Błąd')}
                      </button>
                    </div>

                    {kind === 'feedback' && (
                      <div className="mb-4">
                        <div className="text-xs font-medium tracking-wider text-[var(--text-muted)] mb-2">
                          {tp('КАТЕГОРИЯ', 'CATEGORY', 'KATEGORIA')}
                        </div>
                        <div className="grid grid-cols-4 gap-1.5">
                          {categories.map((c) => (
                            <button
                              key={c.id}
                              onClick={() => setCategory(c.id)}
                              className="py-2 px-1 rounded-lg text-[11px] font-medium transition"
                              style={{
                                background: category === c.id ? 'rgba(0, 212, 255, 0.15)' : 'rgba(139, 167, 184, 0.05)',
                                border: `1px solid ${category === c.id ? 'rgba(0, 212, 255, 0.4)' : 'rgba(139, 167, 184, 0.15)'}`,
                                color: category === c.id ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                              }}
                            >
                              <div className="text-base">{c.emoji}</div>
                              <div>{tp(c.labelRu, c.labelEn, c.labelPl)}</div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="space-y-3 mb-4">
                      {kind === 'bug' && (
                        <>
                          <textarea
                            placeholder={tp('Что ожидал увидеть?', 'What did you expect?', 'Czego się spodziewałeś?')}
                            value={expected}
                            onChange={(e) => setExpected(e.target.value)}
                            rows={2}
                            className="w-full px-3 py-2 rounded-lg text-sm resize-none"
                            style={{
                              background: 'var(--bg-secondary)',
                              border: '1px solid rgba(0, 212, 255, 0.15)',
                              color: 'var(--text-primary)',
                            }}
                          />
                          <textarea
                            placeholder={tp('Что произошло на самом деле?', 'What actually happened?', 'Co się właściwie stało?')}
                            value={actual}
                            onChange={(e) => setActual(e.target.value)}
                            rows={2}
                            className="w-full px-3 py-2 rounded-lg text-sm resize-none"
                            style={{
                              background: 'var(--bg-secondary)',
                              border: '1px solid rgba(0, 212, 255, 0.15)',
                              color: 'var(--text-primary)',
                            }}
                          />
                        </>
                      )}

                      <textarea
                        placeholder={
                          kind === 'feedback'
                            ? tp('Расскажи подробнее (необязательно)', 'Tell me more (optional)', 'Opowiedz więcej (opcjonalnie)')
                            : tp('Дополнительные детали (шаги воспроизведения)', 'More details (steps to reproduce)', 'Więcej szczegółów (kroki)')
                        }
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        rows={kind === 'feedback' ? 3 : 2}
                        className="w-full px-3 py-2 rounded-lg text-sm resize-none"
                        style={{
                          background: 'var(--bg-secondary)',
                          border: '1px solid rgba(0, 212, 255, 0.15)',
                          color: 'var(--text-primary)',
                        }}
                      />

                      <input
                        type="text"
                        placeholder={tp(
                          'Email или @telegram (необязательно - ответим)',
                          'Email or @telegram (optional - we\'ll reply)',
                          'Email lub @telegram (opcjonalnie - odpowiemy)',
                        )}
                        value={contact}
                        onChange={(e) => setContact(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg text-sm"
                        style={{
                          background: 'var(--bg-secondary)',
                          border: '1px solid rgba(0, 212, 255, 0.15)',
                          color: 'var(--text-primary)',
                        }}
                      />
                    </div>

                    <div className="text-[11px] text-[var(--text-muted)] mb-3 leading-relaxed">
                      {tp(
                        'Автоматически приложим: страницу, размер экрана, браузер, язык, время.',
                        'We\'ll auto-attach: page, viewport, browser, language, time.',
                        'Automatycznie dołączymy: stronę, rozmiar ekranu, przeglądarkę, język, czas.',
                      )}
                    </div>

                    {error && (
                      <div className="text-xs mb-3 px-3 py-2 rounded" style={{ background: 'rgba(255, 68, 68, 0.1)', color: 'var(--danger)' }}>
                        {error}
                      </div>
                    )}

                    <button
                      onClick={submitFeedback}
                      disabled={sending}
                      className="w-full py-2.5 rounded-lg font-semibold text-sm transition disabled:opacity-50"
                      style={{
                        background: kind === 'feedback' ? 'linear-gradient(135deg, var(--accent-cyan), #0099cc)' : 'linear-gradient(135deg, #ff6666, #cc3333)',
                        color: '#0a1628',
                      }}
                    >
                      {sending
                        ? tp('Отправляю…', 'Sending…', 'Wysyłam…')
                        : kind === 'feedback'
                          ? tp('Отправить отзыв', 'Send feedback', 'Wyślij opinię')
                          : tp('Отправить репорт', 'Send report', 'Wyślij zgłoszenie')}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

// ============================================================================
// Render assistant message with clickable site links (e.g. /simulator)
// ============================================================================

function ChatBubble({ role, content }: { role: 'user' | 'assistant'; content: string }) {
  return (
    <div className={`flex ${role === 'user' ? 'justify-end' : 'justify-start'}`}>
      <div
        className="max-w-[88%] px-3 py-2 rounded-lg text-sm leading-relaxed whitespace-pre-wrap break-words"
        style={{
          background: role === 'user' ? 'rgba(0, 212, 255, 0.15)' : 'rgba(139, 167, 184, 0.08)',
          color: 'var(--text-primary)',
          border: role === 'user' ? '1px solid rgba(0, 212, 255, 0.25)' : '1px solid rgba(139, 167, 184, 0.15)',
        }}
      >
        {role === 'assistant' ? linkifySitePaths(content) : content}
      </div>
    </div>
  );
}

/** Convert /foo, /simulator etc into clickable links. */
function linkifySitePaths(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  // Match bare paths starting with / followed by alphanum/-, 2-20 chars
  const regex = /(\s|^|\()(\/[a-z][a-z0-9-]{1,19})(?=[\s.,;:)\]]|$)/g;
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = regex.exec(text)) !== null) {
    const [, prefix, pathStr] = m;
    const start = m.index + prefix.length;
    if (start > lastIndex) parts.push(text.slice(lastIndex, start));
    parts.push(
      <a
        key={key++}
        href={pathStr}
        className="text-[var(--accent-cyan)] underline hover:no-underline font-medium"
      >
        {pathStr}
      </a>
    );
    lastIndex = start + pathStr.length;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return <>{parts}</>;
}
