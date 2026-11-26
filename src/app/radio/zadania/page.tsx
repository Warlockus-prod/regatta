'use client';

import { OriginalPolish } from "../OriginalPolish";
import { useRadioI18n } from "@/app/radio/localization/context";

import Link from 'next/link';
import { useSternikPrefs } from "@/app/radio/prefs";
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
  const { rt: radioText } = useRadioI18n();
  const { tp, tl } = useRadioI18n();
  const { explLang } = useSternikPrefs();
  // RU commentary honours the PL/RU/both toggle; the section scope already
  // The radio provider follows the selected course language.
  const showRu = explLang !== 'pl';

  return (
    <div id="radio-zadania">
      <h1 className="mb-1 text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
        📋 {radioText(tl({ pl: '26 zadań praktycznych egzaminu', ru: '26 практических заданий экзамена', en: '26 practical exam tasks', es: '26 tareas prácticas del examen', fr: "26 exercices pratiques de l'examen", de: '26 praktische Prüfungsaufgaben', it: "26 prove pratiche d'esame" }))}
      </h1>
      <p className="mb-5 text-sm" style={{ color: 'var(--text-secondary)' }}>
        {radioText(tl({
          pl: 'Pełna oficjalna lista zadań praktycznych egzaminu SRC - każde z poprawną procedurą i linkiem do symulatora/kursu, gdzie je przećwiczysz. Źródło: materialy_do_testu_src.pdf (UKE). Klucz odpowiedzi nie jest publikowany, więc to poprawna procedura wg GMDSS/ICOM, a nie wybór A/B/C.',
          ru: 'Полный официальный список практических заданий экзамена SRC - с правильной процедурой для каждого и ссылкой на симулятор/курс, где его можно отработать. Источник: materialy_do_testu_src.pdf (UKE). Официальный ключ ответов не публикуется, поэтому здесь описана правильная процедура по GMDSS/ICOM, а не выбор A/B/C.',
          en: 'The full official list of the SRC practical exam tasks - each with the correct procedure and a link to the simulator/course where you can practise it. Source: materialy_do_testu_src.pdf (UKE). No answer key is published, so this is the correct GMDSS/ICOM procedure, not an A/B/C quiz.',
          es: 'Lista oficial completa de ejercicios prácticos del examen SRC, cada uno con el procedimiento correcto y un enlace al simulador o curso donde practicarlo. Fuente: materialy_do_testu_src.pdf (UKE). No se publica una clave de respuestas, por lo que se presenta el procedimiento correcto según GMDSS/ICOM, no una selección A/B/C.',
          fr: "Liste officielle complète des exercices pratiques de l'examen SRC, avec pour chacun la procédure correcte et un lien vers le simulateur ou le cours permettant de s'entraîner. Source : materialy_do_testu_src.pdf (UKE). Aucun corrigé n'est publié : les réponses présentent donc la procédure correcte selon le GMDSS et ICOM, sans choix A/B/C.",
          de: 'Die vollständige offizielle Liste der praktischen Aufgaben der SRC-Prüfung - jeweils mit dem korrekten Verfahren und einem Link zum Simulator oder Kurs, in dem du es üben kannst. Quelle: materialy_do_testu_src.pdf (UKE). Ein Lösungsschlüssel wird nicht veröffentlicht. Deshalb wird hier das korrekte Verfahren gemäß GMDSS/ICOM beschrieben, keine Auswahl A/B/C.',
          it: "Elenco ufficiale completo delle prove pratiche dell'esame SRC: ciascuna comprende la procedura corretta e un collegamento al simulatore o al corso in cui esercitarti. Fonte: materialy_do_testu_src.pdf (UKE). Le soluzioni non vengono pubblicate, quindi viene indicata la procedura corretta secondo GMDSS/ICOM, senza selezionare una risposta A/B/C.",
        }))}
      </p>

      <div className="mb-6 flex flex-wrap gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
        {GROUP_ORDER.map((g) => (
          <a key={g} href={`#grp-${g}`} className="flex min-h-[44px] items-center rounded-full px-3 py-1" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
            {radioText(GROUP_ICON[g])} {radioText(showRu ? GROUP_LABEL[g].ru : GROUP_LABEL[g].pl)} ({radioText(PRACTICAL_TASKS.filter((t) => t.group === g).length)})
          </a>
        ))}
      </div>

      {GROUP_ORDER.map((g) => {
        const tasks = PRACTICAL_TASKS.filter((t) => t.group === g);
        return (
          <section key={g} id={`grp-${g}`} className="mb-8 scroll-mt-24">
            <h2 className="mb-3 text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
              {radioText(GROUP_ICON[g])} {radioText(showRu ? GROUP_LABEL[g].ru : GROUP_LABEL[g].pl)}
            </h2>
            <div className="space-y-3">
              {tasks.map((t) => (
                <div key={t.n} data-testid={`task-${t.n}`} className="rounded-2xl p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold" style={{ background: 'var(--bg-secondary)', color: CYAN }}>
                      {radioText(t.n)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{radioText(t.task)}</div><OriginalPolish><p>{t.task}</p></OriginalPolish>
                      <div className="mt-2 rounded-xl px-3 py-2 text-sm leading-relaxed" style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
                        <span className="text-xs font-semibold uppercase" style={{ color: CYAN }}>{radioText(tp('Как выполнить', 'How to do it', 'Jak wykonać'))}: </span>
                        {radioText(t.how.pl)}
                      </div>
                      {(t.scenario || t.guide) && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {t.scenario && (
                            <Link href={`/radio/symulator?scenario=${t.scenario}`} className="inline-flex min-h-[44px] items-center rounded-lg px-3 text-xs font-semibold" style={{ background: 'rgba(0,212,255,0.12)', color: CYAN }}>
                              🎙️ {radioText(tp('Отработать в симуляторе', 'Practise in the simulator', 'Przećwicz w symulatorze'))}
                            </Link>
                          )}
                          {t.guide && (
                            <Link href={`/radio/obsluga#${t.guide}`} className="inline-flex min-h-[44px] items-center rounded-lg px-3 text-xs font-semibold" style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}>
                              🛠️ {radioText(tp('Интерактивный курс', 'Interactive course', 'Kurs interaktywny'))}
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
        💡 {radioText(tp(
          'На экзамене вытягиваешь карточку с несколькими заданиями из этого списка (0-5 баллов за каждое, минимум 12 из 20). Задания по рации и DSC отрабатывай в симуляторе, EPIRB/SART - выучи процедуру выше.',
          'At the exam you draw a card with several tasks from this list (0-5 points each, minimum 12 of 20). Practise the radio and DSC tasks in the simulator; for EPIRB/SART, learn the procedure above.',
          'Na egzaminie losujesz kartę z kilkoma zadaniami z tej listy (0-5 pkt każde, minimum 12 z 20). Zadania radiowe i DSC ćwicz w symulatorze, EPIRB/SART - naucz się procedury powyżej.',
        ))}
      </div>
    </div>
  );
}
