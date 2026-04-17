'use client';

import { useState, useCallback, useEffect } from 'react';

type Kind = 'feedback' | 'bug';
type Category = 'useful' | 'unclear' | 'idea' | 'other';

interface Props {
  /** Hide on specific routes (e.g. fullscreen game) if needed */
  hideOn?: string[];
}

const CATEGORIES: { id: Category; label: string; emoji: string }[] = [
  { id: 'useful', label: 'Полезно', emoji: '👍' },
  { id: 'unclear', label: 'Непонятно', emoji: '❓' },
  { id: 'idea', label: 'Идея', emoji: '💡' },
  { id: 'other', label: 'Другое', emoji: '✏️' },
];

export default function FeedbackWidget({ hideOn = [] }: Props) {
  const [open, setOpen] = useState(false);
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

  useEffect(() => {
    if (typeof window !== 'undefined') setPath(window.location.pathname);
  }, [open]);

  // Hide widget on certain routes (e.g. game in-race mode may want the screen)
  const shouldHide = typeof window !== 'undefined' && hideOn.some((p) => window.location.pathname.startsWith(p));
  const submit = useCallback(async () => {
    if (!message.trim()) {
      setError('Напиши пару слов, что улучшить');
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
          language: navigator.language,
          ua: navigator.userAgent,
          ts: Date.now(),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Не удалось отправить');
      }
      setSent(true);
      setMessage('');
      setExpected('');
      setActual('');
      setContact('');
      // auto-close after 1.8 s
      setTimeout(() => {
        setOpen(false);
        setSent(false);
      }, 1800);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка сети');
    } finally {
      setSending(false);
    }
  }, [kind, category, message, expected, actual, contact, path]);

  if (shouldHide) return null;

  return (
    <>
      {/* Floating trigger */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Отправить отзыв"
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
            className="card w-full sm:max-w-md p-5 sm:p-6 rounded-t-2xl sm:rounded-2xl max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
            style={{ border: '1px solid rgba(0, 212, 255, 0.3)' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">
                {sent ? 'Спасибо! ✨' : kind === 'feedback' ? 'Отзыв' : 'Сообщить о проблеме'}
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

            {sent ? (
              <p className="text-sm text-[var(--text-secondary)]">
                Получил, буду разбирать. Если указал контакт — отвечу.
              </p>
            ) : (
              <>
                {/* Kind switcher */}
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
                    💬 Отзыв
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
                    🐛 Проблема
                  </button>
                </div>

                {kind === 'feedback' && (
                  <div className="mb-4">
                    <div className="text-xs font-medium tracking-wider text-[var(--text-muted)] mb-2">КАТЕГОРИЯ</div>
                    <div className="grid grid-cols-4 gap-1.5">
                      {CATEGORIES.map((c) => (
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
                          <div>{c.label}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-3 mb-4">
                  {kind === 'bug' && (
                    <>
                      <textarea
                        placeholder="Что ожидал увидеть?"
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
                        placeholder="Что произошло на самом деле?"
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
                    placeholder={kind === 'feedback' ? 'Расскажи подробнее (необязательно)' : 'Дополнительные детали (шаги воспроизведения)'}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={kind === 'feedback' ? 3 : 2}
                    autoFocus
                    className="w-full px-3 py-2 rounded-lg text-sm resize-none"
                    style={{
                      background: 'var(--bg-secondary)',
                      border: '1px solid rgba(0, 212, 255, 0.15)',
                      color: 'var(--text-primary)',
                    }}
                  />

                  <input
                    type="text"
                    placeholder="Email или @telegram (необязательно — ответим)"
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
                  Автоматически приложим: текущую страницу ({path || '—'}), размер экрана, браузер, язык, время.
                </div>

                {error && (
                  <div className="text-xs mb-3 px-3 py-2 rounded" style={{ background: 'rgba(255, 68, 68, 0.1)', color: 'var(--danger)' }}>
                    {error}
                  </div>
                )}

                <button
                  onClick={submit}
                  disabled={sending}
                  className="w-full py-2.5 rounded-lg font-semibold text-sm transition disabled:opacity-50"
                  style={{
                    background: kind === 'feedback' ? 'linear-gradient(135deg, var(--accent-cyan), #0099cc)' : 'linear-gradient(135deg, #ff6666, #cc3333)',
                    color: '#0a1628',
                  }}
                >
                  {sending ? 'Отправляю…' : kind === 'feedback' ? 'Отправить отзыв' : 'Отправить репорт'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
