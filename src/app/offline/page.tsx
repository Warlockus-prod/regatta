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

const OFFLINE_OK: { href: string; ru: string; en: string; pl: string; es: string; fr: string; de: string; it: string }[] = [
  { href: '/radio/obsluga', ru: 'Знакомство с рацией', en: 'Getting to know the radio', pl: 'Poznaj radio', es: 'Conoce la radio', fr: 'Découvrir la radio', de: 'Das Funkgerät kennenlernen', it: 'Conoscere la radio' },
  { href: '/radio/symulator', ru: 'Симулятор ICOM', en: 'ICOM simulator', pl: 'Symulator ICOM', es: 'Simulador ICOM', fr: 'Simulateur ICOM', de: 'ICOM-Simulator', it: 'Simulatore ICOM' },
  { href: '/radio/zadania', ru: '26 экзаменационных заданий', en: 'The 26 exam tasks', pl: '26 zadań egzaminacyjnych', es: 'Las 26 tareas del examen', fr: 'Les 26 exercices d\'examen', de: 'Die 26 Prüfungsaufgaben', it: 'I 26 esercizi d\'esame' },
  { href: '/radio/sciaga', ru: 'Шпаргалка', en: 'Cheat sheet', pl: 'Ściąga', es: 'Chuleta', fr: 'Antisèche', de: 'Spickzettel', it: 'Promemoria' },
  { href: '/sternik', ru: 'Sternik: теория и тесты', en: 'Sternik: theory and tests', pl: 'Sternik: teoria i testy', es: 'Sternik: teoría y tests', fr: 'Sternik : théorie et tests', de: 'Sternik: Theorie und Tests', it: 'Sternik: teoria e quiz' },
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
          ? tp('Связь вернулась', 'You are back online', 'Połączenie wróciło', {
              es: 'Vuelves a tener conexión',
              fr: 'La connexion est revenue',
              de: 'Du bist wieder online',
              it: 'Sei di nuovo online',
            })
          : tp('Нет сети', 'No connection', 'Brak sieci', {
              es: 'Sin conexión',
              fr: 'Pas de connexion',
              de: 'Keine Verbindung',
              it: 'Nessuna connessione',
            })}
      </h1>

      <p className="mb-6 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
        {online
          ? tp(
              'Эта страница не была сохранена заранее, но сеть уже есть - просто обнови её.',
              'This page was not saved ahead of time, but the network is back - just reload it.',
              'Ta strona nie została wcześniej zapisana, ale sieć już jest - po prostu ją odśwież.',
              {
                es: 'Esta página no se guardó de antemano, pero ya hay conexión: solo tienes que recargarla.',
                fr: 'Cette page n\'a pas été enregistrée à l\'avance, mais le réseau est revenu : il suffit de la recharger.',
                de: 'Diese Seite wurde nicht vorab gespeichert, aber das Netz ist wieder da - lade sie einfach neu.',
                it: 'Questa pagina non è stata salvata in anticipo, ma la rete è tornata: basta ricaricarla.',
              },
            )
          : tp(
              'Эта страница не сохранена в офлайне. Но курс - сохранён: теория, вопросы, 26 заданий и весь симулятор рации работают без интернета, включая звук (он синтезируется прямо в браузере).',
              'This page is not saved for offline use. The course is: the theory, the question bank, the 26 tasks and the whole radio simulator work with no internet at all - sound included, since it is synthesized right in the browser.',
              'Ta strona nie jest zapisana offline. Ale kurs jest: teoria, pytania, 26 zadań i cały symulator radiostacji działają bez internetu, razem z dźwiękiem (jest syntetyzowany w przeglądarce).',
              {
                es: 'Esta página no está guardada para usarla sin conexión. El curso sí: la teoría, las preguntas, las 26 tareas y todo el simulador de radio funcionan sin internet, sonido incluido (se sintetiza en el propio navegador).',
                fr: 'Cette page n\'est pas enregistrée hors ligne. Le cours, lui, l\'est : la théorie, les questions, les 26 exercices et tout le simulateur de radio fonctionnent sans internet, son compris (il est synthétisé directement dans le navigateur).',
                de: 'Diese Seite ist nicht offline gespeichert. Der Kurs schon: Theorie, Fragen, die 26 Aufgaben und der komplette Funkgerät-Simulator funktionieren ohne Internet, auch der Ton (er wird direkt im Browser erzeugt).',
                it: 'Questa pagina non è salvata offline. Il corso sì: teoria, domande, i 26 esercizi e l\'intero simulatore radio funzionano senza internet, audio compreso (viene sintetizzato direttamente nel browser).',
              },
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
              {tp(p.ru, p.en, p.pl, { es: p.es, fr: p.fr, de: p.de, it: p.it })}
            </Link>
          </li>
        ))}
      </ul>

      <p className="rounded-xl p-3 text-xs leading-relaxed" style={{ background: 'rgba(255,206,77,0.06)', color: 'var(--text-muted)' }}>
        {tp(
          'Без сети не работает только то, что считается на сервере: голосовые тренажёры (распознавание речи и голос станции) и чат-бот. Оценка произношения требует модели - подделывать её было бы враньём в тренажёре по безопасности.',
          'The only things that need the network are the ones that run on a server: the voice trainers (speech recognition and the station\'s voice) and the chat bot. Grading a spoken MAYDAY takes a model - faking it would be a lie inside a safety trainer.',
          'Bez sieci nie działa tylko to, co liczy się na serwerze: trenażery głosowe (rozpoznawanie mowy i głos stacji) oraz czatbot. Ocena wymowy wymaga modelu, a udawanie jej byłoby kłamstwem w trenażerze bezpieczeństwa.',
          {
            es: 'Sin conexión solo deja de funcionar lo que se procesa en el servidor: los ejercicios de voz (reconocimiento del habla y la voz de la estación) y el chatbot. Evaluar la pronunciación requiere un modelo, y fingirlo sería mentir en una herramienta de seguridad.',
            fr: 'Sans réseau, seul ce qui tourne sur le serveur ne fonctionne pas : les exercices vocaux (reconnaissance vocale et voix de la station) et le chatbot. Évaluer la prononciation demande un modèle : faire semblant serait mentir dans un outil de sécurité.',
            de: 'Ohne Netz fehlt nur, was auf dem Server läuft: die Sprachübungen (Spracherkennung und die Stimme der Station) und der Chatbot. Die Aussprache zu bewerten braucht ein Modell - das nur vorzutäuschen wäre in einem Sicherheitstraining gelogen.',
            it: 'Senza rete non funziona solo ciò che gira sul server: gli esercizi vocali (riconoscimento vocale e voce della stazione) e il chatbot. Valutare la pronuncia richiede un modello: fingere sarebbe una bugia in uno strumento per la sicurezza.',
          },
        )}
      </p>
    </main>
  );
}
