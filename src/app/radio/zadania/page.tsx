'use client';

import Link from 'next/link';
import { useI18n } from '@/lib/i18n';
import { useSternikPrefs } from '../../sternik/prefs';
import { GROUP_LABEL, PRACTICAL_TASKS, type TaskGroup } from './tasks';

// ============================================================================
// /radio/zadania - the 26 official UKE SRC practical exam tasks, each with the
// correct GMDSS/ICOM procedure and a link to the simulator scenario or guide
// lesson that trains it. Source: materialy_do_testu_src.pdf (bip.uke.gov.pl),
// which lists the tasks but publishes no answer key - so this is a procedure
// reference, not a graded quiz. PL primary, RU aid per the sternik policy.
// ============================================================================

const CYAN = 'var(--accent-cyan)';
const GROUP_ORDER: TaskGroup[] = ['device', 'voice', 'dsc', 'epirb-sart'];
const GROUP_ICON: Record<TaskGroup, string> = {
  device: '🎛️', voice: '🎙️', dsc: '📟', 'epirb-sart': '🛟',
};

export default function RadioTasksPage() {
  const { tp } = useI18n();
  const { explLang } = useSternikPrefs();
  // RU commentary honours the PL/RU/both toggle; the section scope already
  // forces explLang to 'pl' for every non-RU visitor.
  const showRu = explLang !== 'pl';

  return (
    <main id="radio-zadania">
      <h1 className="mb-1 text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
        📋 {tp('26 практических заданий UKE', '26 UKE practical tasks', '26 zadan praktycznych UKE')}
      </h1>
      <p className="mb-5 text-sm" style={{ color: 'var(--text-secondary)' }}>
        {tp(
          'Полный официальный список практических заданий экзамена SRC (UKE) - с правильной процедурой для каждого и ссылкой на симулятор/курс, где его можно отработать. Источник: materialy_do_testu_src.pdf. Официального ключа ответов UKE не публикует, поэтому здесь описана правильная процедура по GMDSS/ICOM, а не выбор A/B/C.',
          'The full official list of the SRC (UKE) practical exam tasks - each with the correct procedure and a link to the simulator/course where you can practise it. Source: materialy_do_testu_src.pdf. UKE publishes no answer key, so this is the correct GMDSS/ICOM procedure, not an A/B/C quiz.',
          'Pelna oficjalna lista zadan praktycznych egzaminu SRC (UKE) - kazde z poprawna procedura i linkiem do symulatora/kursu, gdzie je przecwiczysz. Zrodlo: materialy_do_testu_src.pdf. UKE nie publikuje klucza odpowiedzi, wiec to poprawna procedura wg GMDSS/ICOM, a nie wybor A/B/C.',
        )}
      </p>

      <div className="mb-6 flex flex-wrap gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
        {GROUP_ORDER.map((g) => (
          <a key={g} href={`#grp-${g}`} className="flex min-h-[36px] items-center rounded-full px-3 py-1" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
            {GROUP_ICON[g]} {showRu ? GROUP_LABEL[g].ru : GROUP_LABEL[g].pl} ({PRACTICAL_TASKS.filter((t) => t.group === g).length})
          </a>
        ))}
      </div>

      {GROUP_ORDER.map((g) => {
        const tasks = PRACTICAL_TASKS.filter((t) => t.group === g);
        return (
          <section key={g} id={`grp-${g}`} className="mb-8 scroll-mt-24">
            <h2 className="mb-3 text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
              {GROUP_ICON[g]} {showRu ? GROUP_LABEL[g].ru : GROUP_LABEL[g].pl}
            </h2>
            <div className="space-y-3">
              {tasks.map((t) => (
                <div key={t.n} data-testid={`task-${t.n}`} className="rounded-2xl p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold" style={{ background: 'var(--bg-secondary)', color: CYAN }}>
                      {t.n}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{t.task}</div>
                      <div className="mt-2 border-l-2 pl-3 text-sm leading-relaxed" style={{ borderColor: CYAN, color: 'var(--text-secondary)' }}>
                        <span className="text-xs font-semibold uppercase" style={{ color: CYAN }}>{tp('Как выполнить', 'How to do it', 'Jak wykonac')}: </span>
                        {t.how.pl}
                        {showRu && <div className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>{t.how.ru}</div>}
                      </div>
                      {(t.scenario || t.guide) && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {t.scenario && (
                            <Link href="/radio/symulator" className="inline-flex min-h-[36px] items-center rounded-lg px-3 text-xs font-semibold" style={{ background: 'rgba(0,212,255,0.12)', color: CYAN }}>
                              🎙️ {tp('Отработать в симуляторе', 'Practise in the simulator', 'Przecwicz w symulatorze')}
                            </Link>
                          )}
                          {t.guide && (
                            <Link href={`/radio/obsluga#${t.guide}`} className="inline-flex min-h-[36px] items-center rounded-lg px-3 text-xs font-semibold" style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}>
                              🛠️ {tp('Интерактивный курс', 'Interactive course', 'Kurs interaktywny')}
                            </Link>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        );
      })}

      <div className="mt-6 rounded-2xl p-4 text-sm" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
        💡 {tp(
          'На экзамене вытягиваешь карточку с несколькими заданиями из этого списка (0-5 баллов за каждое, минимум 12 из 20). Задания по рации и DSC отрабатывай в симуляторе, EPIRB/SART - выучи процедуру выше.',
          'At the exam you draw a card with several tasks from this list (0-5 points each, minimum 12 of 20). Practise the radio and DSC tasks in the simulator; for EPIRB/SART, learn the procedure above.',
          'Na egzaminie losujesz karte z kilkoma zadaniami z tej listy (0-5 pkt kazde, minimum 12 z 20). Zadania radiowe i DSC cwicz w symulatorze, EPIRB/SART - naucz sie procedury powyzej.',
        )}
      </div>
    </main>
  );
}
