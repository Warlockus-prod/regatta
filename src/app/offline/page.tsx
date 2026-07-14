'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useI18n } from '@/lib/i18n';

// The page the service worker falls back to when the network is gone and the
// requested page was never cached.
//
// It does not pretend. It says what is unavailable (anything that needs a model:
// the voice trainers, the chat bot) and links to what genuinely still works with
// no signal at all - which is most of the course.

const OFFLINE_OK: { href: string; ru: string; en: string; pl: string }[] = [
  { href: '/radio/obsluga', ru: 'Знакомство с рацией', en: 'Getting to know the radio', pl: 'Poznaj radio' },
  { href: '/radio/symulator', ru: 'Симулятор ICOM', en: 'ICOM simulator', pl: 'Symulator ICOM' },
  { href: '/radio/zadania', ru: '26 экзаменационных заданий', en: 'The 26 exam tasks', pl: '26 zadan egzaminacyjnych' },
  { href: '/radio/sciaga', ru: 'Шпаргалка', en: 'Cheat sheet', pl: 'Sciaga' },
  { href: '/sternik', ru: 'Sternik: теория и тесты', en: 'Sternik: theory and tests', pl: 'Sternik: teoria i testy' },
];

export default function OfflinePage() {
  const { tp } = useI18n();
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const sync = () => setOnline(navigator.onLine);
    sync();
    window.addEventListener('online', sync);
    window.addEventListener('offline', sync);
    return () => {
      window.removeEventListener('online', sync);
      window.removeEventListener('offline', sync);
    };
  }, []);

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-6 text-4xl">{online ? '📡' : '📵'}</div>

      <h1 className="mb-3 text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
        {online
          ? tp('Связь вернулась', 'You are back online', 'Polaczenie wrocilo')
          : tp('Нет сети', 'No connection', 'Brak sieci')}
      </h1>

      <p className="mb-6 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
        {online
          ? tp(
              'Эта страница не была сохранена заранее, но сеть уже есть - просто обновите её.',
              'This page was not saved ahead of time, but the network is back - just reload it.',
              'Ta strona nie zostala zapisana wczesniej, ale siec juz jest - po prostu odswiez.',
            )
          : tp(
              'Эта страница не сохранена в офлайне. Но курс - сохранён: теория, вопросы, 26 заданий и весь симулятор рации работают без интернета, включая звук (он синтезируется прямо в браузере).',
              'This page is not saved for offline use. The course is: the theory, the question bank, the 26 tasks and the whole radio simulator work with no internet at all - sound included, since it is synthesized right in the browser.',
              'Ta strona nie jest zapisana offline. Ale kurs jest: teoria, pytania, 26 zadan i caly symulator radia dzialaja bez internetu - razem z dzwiekiem, bo jest syntezowany w przegladarce.',
            )}
      </p>

      <ul className="mb-6 space-y-2">
        {OFFLINE_OK.map((p) => (
          <li key={p.href}>
            <Link
              href={p.href}
              className="flex min-h-[44px] items-center rounded-xl px-3 text-sm"
              style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
            >
              {tp(p.ru, p.en, p.pl)}
            </Link>
          </li>
        ))}
      </ul>

      <p className="rounded-xl p-3 text-xs leading-relaxed" style={{ background: 'rgba(255,206,77,0.06)', color: 'var(--text-muted)' }}>
        {tp(
          'Без сети не работает только то, что считается на сервере: голосовые тренажёры (распознавание речи и голос станции) и чат-бот. Оценка произношения требует модели - подделывать её было бы враньём в тренажёре по безопасности.',
          'The only things that need the network are the ones that run on a server: the voice trainers (speech recognition and the station\'s voice) and the chat bot. Grading a spoken MAYDAY takes a model - faking it would be a lie inside a safety trainer.',
          'Bez sieci nie dziala tylko to, co liczy sie na serwerze: trenazery glosowe (rozpoznawanie mowy i glos stacji) oraz czat-bot. Ocena wypowiedzi wymaga modelu - udawanie jej byloby klamstwem w trenazerze bezpieczenstwa.',
        )}
      </p>
    </main>
  );
}
