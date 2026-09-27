'use client';

import { useState } from 'react';
import { type TpFn } from './shared';

// ---------------------------------------------------------------------------
// Collapsible glossary footer - explains all abbreviations without cluttering
// the main scene. Default collapsed; user taps to open. Entries carry all 7
// languages (ru/en/pl + es/fr/de/it via the tp extras pack).
// ---------------------------------------------------------------------------

export function GlossaryFooter({ tp }: { tp: TpFn }) {
  const [open, setOpen] = useState(false);

  const entries: Array<{
    term: string;
    ru: string;
    en: string;
    pl: string;
    es: string;
    fr: string;
    de: string;
    it: string;
  }> = [
    {
      term: 'TWS',
      ru: 'скорость истинного ветра',
      en: 'true wind speed',
      pl: 'prędkość wiatru prawdziwego',
      es: 'velocidad del viento real',
      fr: 'vitesse du vent réel',
      de: 'wahre Windgeschwindigkeit',
      it: 'velocità del vento reale',
    },
    {
      term: 'TWA',
      ru: 'угол к истинному ветру (0 = в ветер, 90 = галф, 180 = по ветру)',
      en: 'angle to true wind (0 = upwind, 90 = beam, 180 = downwind)',
      pl: 'kąt do wiatru prawdziwego (0 = prosto pod wiatr, 90 = półwiatr, 180 = fordewind)',
      es: 'ángulo respecto al viento real (0 = proa al viento, 90 = través, 180 = popa)',
      fr: 'angle au vent réel (0 = face au vent, 90 = travers, 180 = vent arrière)',
      de: 'Winkel zum wahren Wind (0 = im Wind, 90 = Halbwind, 180 = Vorwind)',
      it: 'angolo rispetto al vento reale (0 = controvento, 90 = traverso, 180 = in poppa)',
    },
    {
      term: 'AWS',
      ru: 'apparent wind speed - скорость ветра, которую ЧУВСТВУЕТ движущаяся яхта',
      en: 'apparent wind speed - the wind the moving boat feels',
      pl: 'apparent wind speed - prędkość wiatru pozornego, czyli wiatru, który CZUJE płynący jacht',
      es: 'velocidad del viento aparente: el viento que siente el barco en movimiento',
      fr: 'vitesse du vent apparent : le vent ressenti par le bateau en mouvement',
      de: 'scheinbare Windgeschwindigkeit - der Wind, den das fahrende Boot spürt',
      it: 'velocità del vento apparente: il vento che sente la barca in movimento',
    },
    {
      term: 'AWA',
      ru: 'apparent wind angle - угол ветра как его чувствует яхта. На галфвинде AWA меньше TWA (ветер приходит вперёд)',
      en: 'apparent wind angle - wind angle the boat feels. On beam reach AWA is less than TWA (wind comes forward)',
      pl: 'apparent wind angle - kąt wiatru, który czuje jacht. Na kursie półwiatr AWA jest mniejszy niż TWA (wiatr pozorny przesuwa się do przodu)',
      es: 'ángulo del viento aparente. Al través, el AWA es menor que el TWA (el viento entra más de proa)',
      fr: "angle du vent apparent. Au travers, l'AWA est plus petit que le TWA (le vent apparent vient plus de l'avant)",
      de: 'scheinbarer Windwinkel. Auf Halbwindkurs ist AWA kleiner als TWA (der Wind kommt vorlicher)',
      it: "angolo del vento apparente. Al traverso l'AWA è minore del TWA (il vento arriva più da prua)",
    },
    {
      term: 'VMG',
      ru: 'velocity made good - скорость в направлении ветра. На галсировании главное число',
      en: 'velocity made good - speed toward the wind. Key metric upwind',
      pl: 'velocity made good - prędkość w kierunku wiatru. Najważniejsza liczba przy halsowaniu',
      es: 'velocity made good: velocidad hacia el viento. La cifra clave en ceñida',
      fr: 'velocity made good : vitesse vers le vent. Le chiffre clé au près',
      de: 'Velocity made good - Geschwindigkeit gegen den Wind. Die Kennzahl an der Kreuz',
      it: 'velocity made good: velocità verso il vento. Il numero chiave di bolina',
    },
    {
      term: 'Heel',
      ru: 'крен, наклон лодки. До 15° нормально, 25° уже много, 30° пора рифиться',
      en: 'heel angle. Up to 15° normal, 25° is a lot, 30° means reef now',
      pl: 'przechył, czyli pochylenie jachtu. Do 15° to norma, 25° to już dużo, przy 30° czas refować',
      es: 'escora, la inclinación del barco. Hasta 15° es normal, 25° ya es mucho, con 30° toca tomar rizos',
      fr: "gîte, l'inclinaison du bateau. Jusqu'à 15°, c'est normal ; 25°, c'est déjà beaucoup ; à 30°, il faut prendre un ris",
      de: 'Krängung, die Schräglage des Boots. Bis 15° normal, 25° ist schon viel, ab 30° wird es Zeit zu reffen',
      it: "sbandamento, l'inclinazione della barca. Fino a 15° è normale, 25° è già tanto, a 30° è ora di terzarolare",
    },
    {
      term: 'Leeway',
      ru: 'снос лодки вбок. Киль не идеален, лодку всегда сносит под ветер на 3-8°',
      en: 'sideways drift. The keel is not perfect; boats always slip 3-8° to leeward',
      pl: 'dryf, czyli boczne znoszenie jachtu. Kil nie jest idealny, jacht zawsze dryfuje o 3-8° na zawietrzną',
      es: 'abatimiento, el desplazamiento lateral del barco. La quilla no es perfecta: el barco siempre abate 3-8° a sotavento',
      fr: "dérive latérale. La quille n'est pas parfaite : le bateau glisse toujours de 3-8° sous le vent",
      de: 'Abdrift, das seitliche Versetzen des Boots. Der Kiel ist nicht perfekt: das Boot treibt immer 3-8° nach Lee ab',
      it: 'scarroccio. La chiglia non è perfetta: la barca scivola sempre 3-8° sottovento',
    },
    {
      term: 'Slot',
      ru: 'щель между гротом и стакселем. Хороший слот ускоряет поток на гроте и даёт больше тяги. Стаксель перетянут - слот закрыт, грот теряет',
      en: 'the slot between main and jib. A good slot accelerates flow on the main. Overtrimmed jib closes it and kills the main',
      pl: 'szczelina między grotem a fokiem. Dobra szczelina przyspiesza przepływ na grocie i daje więcej ciągu. Za mocno wybrany fok ją zamyka i grot traci',
      es: 'la ranura entre mayor y foque. Una buena ranura acelera el flujo sobre la mayor y da más empuje. Un foque demasiado cazado la cierra y la mayor pierde',
      fr: "la fente entre la GV et le foc. Une bonne fente accélère l'écoulement sur la GV et donne plus de poussée. Un foc trop bordé la ferme et la GV perd",
      de: 'der Spalt zwischen Groß und Fock. Ein guter Spalt beschleunigt die Strömung am Groß und bringt mehr Vortrieb. Eine zu dicht geholte Fock schließt ihn, und das Groß verliert',
      it: 'la fessura tra randa e fiocco. Una buona fessura accelera il flusso sulla randa e dà più spinta. Un fiocco troppo cazzato la chiude e la randa perde',
    },
    {
      term: 'Stall',
      ru: 'срыв потока. Угол атаки паруса слишком большой, поток отрывается, тяга падает. Признак - подветренные колдунчики на стакселе падают или крутятся',
      en: 'flow separation. Angle of attack too high, flow detaches, drive drops. Sign: the leeward telltales on the jib droop or spin',
      pl: 'oderwanie przepływu. Kąt natarcia żagla jest za duży, przepływ się odrywa, ciąg spada. Objaw: zawietrzne włóczki na foku opadają lub kręcą się',
      es: 'desprendimiento del flujo. El ángulo de ataque es demasiado grande, el flujo se separa y el empuje cae. Señal: los catavientos de sotavento del foque caen o giran',
      fr: "décrochage. Angle d'attaque trop grand, l'écoulement se détache, la poussée chute. Signe : les penons sous le vent du foc tombent ou tournent",
      de: 'Strömungsabriss. Anstellwinkel zu groß, die Strömung reißt ab, der Vortrieb fällt. Zeichen: die leeseitigen Windfäden an der Fock hängen oder drehen sich',
      it: 'stallo. Angolo di attacco troppo grande, il flusso si stacca, la spinta cala. Segnale: i filetti sottovento del fiocco cadono o girano',
    },
    {
      term: tp('Drive / Тяга', 'Drive', 'Drive / ciąg', {
        es: 'Drive / empuje',
        fr: 'Drive / poussée',
        de: 'Drive / Vortrieb',
        it: 'Drive / spinta',
      }),
      ru: 'проекция аэродинамической силы паруса в сторону носа лодки. Именно это толкает вперёд',
      en: 'forward component of sail aero force. This is what pushes you',
      pl: 'składowa siły aerodynamicznej żagla skierowana ku dziobowi. To ona pcha jacht do przodu',
      es: 'componente de la fuerza aerodinámica de la vela hacia proa. Es lo que empuja el barco hacia delante',
      fr: "composante de la force aérodynamique de la voile vers l'avant. C'est elle qui fait avancer le bateau",
      de: 'Anteil der aerodynamischen Segelkraft in Fahrtrichtung. Genau er schiebt das Boot voran',
      it: 'componente in avanti della forza aerodinamica della vela. È ciò che spinge la barca',
    },
    {
      term: tp('Side / Боковая сила', 'Side', 'Side / siła boczna', {
        es: 'Side / fuerza lateral',
        fr: 'Side / force latérale',
        de: 'Side / Seitenkraft',
        it: 'Side / forza laterale',
      }),
      ru: 'поперечная составляющая силы паруса. Рождает крен и leeway. Полезная работа - только drive',
      en: 'sideways component of sail force. Creates heel and leeway. The useful work is drive only',
      pl: 'poprzeczna składowa siły żagla. Wywołuje przechył i dryf. Pożyteczną pracę wykonuje tylko ciąg',
      es: 'componente lateral de la fuerza de las velas. Produce escora y abatimiento. Solo el empuje hace trabajo útil',
      fr: 'composante latérale de la force des voiles. Elle crée la gîte et la dérive. Seule la poussée fait un travail utile',
      de: 'Seitenkomponente der Segelkraft. Erzeugt Krängung und Abdrift. Nützliche Arbeit leistet nur der Vortrieb',
      it: 'componente laterale della forza delle vele. Crea sbandamento e scarroccio. Il lavoro utile lo fa solo la spinta',
    },
    {
      term: 'AoA',
      ru: 'angle of attack - угол атаки паруса к ветру. Оптимум ~ 12-18°. Меньше - парус полощет. Больше - stall',
      en: 'angle of attack - sail angle to wind. Optimal ~ 12-18°. Less: luffing. More: stall',
      pl: 'angle of attack - kąt natarcia żagla względem wiatru. Optimum ~ 12-18°. Mniej: żagiel łopocze. Więcej: oderwanie przepływu (stall)',
      es: 'ángulo de ataque de la vela respecto al viento. Óptimo ~ 12-18°. Menos: la vela flamea. Más: desprendimiento del flujo (stall)',
      fr: "angle d'attaque de la voile au vent. Optimum ~ 12-18°. Moins : la voile faseye. Plus : décrochage",
      de: 'Anstellwinkel des Segels zum Wind. Optimum ~ 12-18°. Weniger: das Segel killt. Mehr: Strömungsabriss (Stall)',
      it: "angolo di attacco della vela al vento. Ottimo ~ 12-18°. Meno: la vela fileggia. Più: stallo",
    },
    {
      term: tp('Оптимум / ghost', 'Optimum / ghost', 'Optimum / duch', {
        es: 'Óptimo / fantasma',
        fr: 'Optimum / fantôme',
        de: 'Optimum / Geist',
        it: 'Ottimo / fantasma',
      }),
      ru: 'пунктирные зелёные силуэты - где грот и стаксель ДОЛЖНЫ стоять при текущем курсе и ветре. Сравни со своей настройкой',
      en: 'dashed green silhouettes - where main and jib SHOULD sit for the current course and wind. Compare to your trim',
      pl: 'zielone przerywane sylwetki: tu POWINNY stać grot i fok na obecnym kursie i przy tym wietrze. Porównaj je ze swoim trymem',
      es: 'siluetas verdes punteadas: indican dónde DEBERÍAN estar la mayor y el foque con este rumbo y este viento. Compara con tu trimado',
      fr: 'silhouettes vertes pointillées : où la GV et le foc DEVRAIENT être pour cette allure et ce vent. Compare avec ton réglage',
      de: 'grüne gestrichelte Umrisse: wo Groß und Fock bei diesem Kurs und Wind stehen SOLLTEN. Vergleiche mit deinem Trimm',
      it: 'sagome verdi tratteggiate: dove randa e fiocco DOVREBBERO stare con questa andatura e questo vento. Confronta con la tua regolazione',
    },
    {
      term: tp('Трим % / trim', 'Trim %', 'Trym %', {
        es: 'Trim %',
        fr: 'Trim %',
        de: 'Trimm %',
        it: 'Trim %',
      }),
      ru: 'твоя скорость в % от скорости при идеальном триме для этого курса. 100% = ты ничего не теряешь на триме',
      en: 'your speed as % of the ideal-trim speed for this course. 100% means you lose nothing to trim',
      pl: 'twoja prędkość jako % prędkości przy idealnym trymie na tym kursie. 100% = nic nie tracisz na trymie',
      es: 'tu velocidad como % de la velocidad con trimado ideal para este rumbo. 100% = no pierdes nada',
      fr: 'ta vitesse en % de la vitesse au réglage idéal pour cette allure. 100% = tu ne perds rien',
      de: 'deine Fahrt in % der Fahrt bei idealem Trimm für diesen Kurs. 100% = du verlierst nichts',
      it: 'la tua velocità in % della velocità col trim ideale per questa andatura. 100% = non perdi nulla',
    },
  ];

  return (
    <div className="border-t mx-2 lg:mx-5 mt-2" style={{ borderColor: 'rgba(0, 212, 255, 0.12)' }}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-3 px-3 py-3 text-left transition hover:bg-[rgba(0,212,255,0.04)]"
        style={{ color: 'var(--text-secondary)' }}
      >
        <span
          className="text-xs font-bold uppercase tracking-wider"
          style={{ color: 'var(--accent-cyan)' }}
        >
          {open ? '▾' : '▸'}{' '}
          {tp(
            'Что означают все эти сокращения?',
            'What do all these abbreviations mean?',
            'Co znaczą te wszystkie skróty?',
            {
              es: '¿Qué significan todas estas siglas?',
              fr: 'Que signifient toutes ces abréviations ?',
              de: 'Was bedeuten all diese Abkürzungen?',
              it: 'Cosa significano tutte queste sigle?',
            },
          )}
        </span>
        <span className="text-[10px] text-[var(--text-muted)] hidden sm:inline">
          {tp(
            'TWA, AWA, AWS, slot, stall, drive, side, heel, leeway и другие',
            'TWA, AWA, AWS, slot, stall, drive, side, heel, leeway and more',
            'TWA, AWA, AWS, slot, stall, drive, side, heel, leeway i inne',
            {
              es: 'TWA, AWA, AWS, slot, stall, drive, side, heel, leeway y más',
              fr: 'TWA, AWA, AWS, slot, stall, drive, side, heel, leeway et plus',
              de: 'TWA, AWA, AWS, Slot, Stall, Drive, Side, Heel, Leeway und mehr',
              it: 'TWA, AWA, AWS, slot, stall, drive, side, heel, leeway e altro',
            },
          )}
        </span>
      </button>

      {open && (
        <div className="px-3 pb-4 pt-1 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
          {entries.map((e) => (
            <div key={e.term} className="text-[11px] sm:text-xs leading-relaxed">
              <span className="font-mono font-bold" style={{ color: 'var(--accent-cyan)' }}>
                {e.term}
              </span>
              <span className="text-[var(--text-secondary)]">
                {' '}
                - {tp(e.ru, e.en, e.pl, { es: e.es, fr: e.fr, de: e.de, it: e.it })}
              </span>
            </div>
          ))}
          <div
            className="col-span-full mt-2 pt-2 border-t text-[10px] text-[var(--text-muted)]"
            style={{ borderColor: 'rgba(0, 212, 255, 0.08)' }}
          >
            {tp(
              'Сцена, метрики и комментарий читают один и тот же state. Движок пересчитывает при каждом изменении контрола.',
              'Scene, metrics, and commentary all read one state. The engine recomputes on every control change.',
              'Scena, wskaźniki i komentarz korzystają z tego samego stanu. Silnik przelicza wszystko przy każdej zmianie ustawień.',
              {
                es: 'La escena, las métricas y el comentario leen el mismo estado. El motor recalcula con cada cambio de un control.',
                fr: 'La scène, les métriques et le commentaire lisent le même état. Le moteur recalcule à chaque changement.',
                de: 'Szene, Messwerte und Kommentar lesen denselben Zustand. Die Engine rechnet bei jeder Änderung neu.',
                it: 'Scena, metriche e commento leggono lo stesso stato. Il motore ricalcola a ogni modifica.',
              },
            )}
          </div>
        </div>
      )}
    </div>
  );
}
