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
      pl: 'predkosc prawdziwego wiatru',
      es: 'velocidad del viento real',
      fr: 'vitesse du vent réel',
      de: 'wahre Windgeschwindigkeit',
      it: 'velocità del vento reale',
    },
    {
      term: 'TWA',
      ru: 'угол к истинному ветру (0 = в ветер, 90 = галф, 180 = по ветру)',
      en: 'angle to true wind (0 = upwind, 90 = beam, 180 = downwind)',
      pl: 'kat do prawdziwego wiatru',
      es: 'angulo respecto al viento real (0 = proa al viento, 90 = través, 180 = popa)',
      fr: 'angle au vent réel (0 = face au vent, 90 = travers, 180 = vent arrière)',
      de: 'Winkel zum wahren Wind (0 = im Wind, 90 = Halbwind, 180 = Vorwind)',
      it: 'angolo rispetto al vento reale (0 = controvento, 90 = traverso, 180 = in poppa)',
    },
    {
      term: 'AWS',
      ru: 'apparent wind speed - скорость ветра, которую ЧУВСТВУЕТ движущаяся яхта',
      en: 'apparent wind speed - the wind the moving boat feels',
      pl: 'predkosc pozornego wiatru',
      es: 'velocidad del viento aparente: el viento que siente el barco en movimiento',
      fr: 'vitesse du vent apparent : le vent ressenti par le bateau en mouvement',
      de: 'scheinbare Windgeschwindigkeit - der Wind, den das fahrende Boot spuert',
      it: 'velocità del vento apparente: il vento che sente la barca in movimento',
    },
    {
      term: 'AWA',
      ru: 'apparent wind angle - угол ветра как его чувствует яхта. На галфвинде AWA меньше TWA (ветер приходит вперёд)',
      en: 'apparent wind angle - wind angle the boat feels. On beam reach AWA is less than TWA (wind comes forward)',
      pl: 'kat pozornego wiatru',
      es: 'angulo del viento aparente. En un través el AWA es menor que el TWA (el viento entra mas de proa)',
      fr: "angle du vent apparent. Au travers l'AWA est plus petit que le TWA (le vent vient de l'avant)",
      de: 'scheinbarer Windwinkel. Auf Halbwindkurs ist AWA kleiner als TWA (der Wind kommt vorlicher)',
      it: "angolo del vento apparente. Al traverso l'AWA è minore del TWA (il vento arriva più da prua)",
    },
    {
      term: 'VMG',
      ru: 'velocity made good - скорость в направлении ветра. На галсировании главное число',
      en: 'velocity made good - speed toward the wind. Key metric upwind',
      pl: 'predkosc w kierunku wiatru',
      es: 'velocity made good: velocidad hacia el viento. La cifra clave en ceñida',
      fr: 'velocity made good : vitesse vers le vent. Le chiffre clé au près',
      de: 'Velocity made good - Geschwindigkeit gegen den Wind. Die Kennzahl an der Kreuz',
      it: 'velocity made good: velocità verso il vento. Il numero chiave di bolina',
    },
    {
      term: 'Heel',
      ru: 'крен, наклон лодки. До 15° нормально, 25° уже много, 30° пора рифиться',
      en: 'heel angle. Up to 15° normal, 25° is a lot, 30° means reef now',
      pl: 'przechyl',
      es: 'escora. Hasta 15° normal, 25° es mucho, con 30° hay que rizar',
      fr: "gîte. Jusqu'à 15° normal, 25° c'est beaucoup, à 30° il faut ariser",
      de: 'Kraengung. Bis 15° normal, 25° ist viel, ab 30° sofort reffen',
      it: 'sbandamento. Fino a 15° normale, 25° è tanto, a 30° si terzarola',
    },
    {
      term: 'Leeway',
      ru: 'снос лодки вбок. Киль не идеален, лодку всегда сносит под ветер на 3-8°',
      en: 'sideways drift. The keel is not perfect; boats always slip 3-8° to leeward',
      pl: 'dryf boczny',
      es: 'abatimiento lateral. La quilla no es perfecta: el barco siempre derrapa 3-8° a sotavento',
      fr: "dérive latérale. La quille n'est pas parfaite : le bateau glisse toujours de 3-8° sous le vent",
      de: 'Abdrift. Der Kiel ist nicht perfekt - das Boot versetzt immer 3-8° nach Lee',
      it: 'scarroccio. La chiglia non è perfetta: la barca scivola sempre 3-8° sottovento',
    },
    {
      term: 'Slot',
      ru: 'щель между гротом и стакселем. Хороший слот ускоряет поток на гроте и даёт больше тяги. Стаксель перетянут - слот закрыт, грот теряет',
      en: 'the slot between main and jib. A good slot accelerates flow on the main. Overtrimmed jib closes it and kills the main',
      pl: 'slot miedzy grotem a fokiem',
      es: 'el canal entre mayor y foque. Un buen slot acelera el flujo sobre la mayor. Un foque sobretrimado lo cierra y mata la mayor',
      fr: "la fente entre GV et foc. Un bon slot accélère l'écoulement sur la GV. Un foc surbordé le ferme et tue la GV",
      de: 'der Spalt zwischen Gross und Fock. Ein guter Slot beschleunigt die Stroemung am Gross. Eine zu dichte Fock schliesst ihn',
      it: 'il canale tra randa e fiocco. Un buon slot accelera il flusso sulla randa. Un fiocco troppo cazzato lo chiude',
    },
    {
      term: 'Stall',
      ru: 'срыв потока. Угол атаки паруса слишком большой, поток отрывается, тяга падает. Признак - флаги на стакселе полощут',
      en: 'flow separation. Angle of attack too high, flow detaches, drive drops. Sign: telltales flutter on the jib',
      pl: 'oderwanie przeplywu',
      es: 'desprendimiento del flujo. Angulo de ataque demasiado grande, el flujo se separa, la fuerza cae. Señal: los catavientos flamean',
      fr: "décrochage. Angle d'attaque trop grand, l'écoulement se détache, la puissance tombe. Signe : les penons flottent",
      de: 'Stroemungsabriss. Anstellwinkel zu gross, die Stroemung reisst ab, der Vortrieb faellt. Zeichen: die Trimmfaeden flattern',
      it: 'stallo. Angolo di attacco troppo grande, il flusso si stacca, la spinta cala. Segnale: i filetti sventolano',
    },
    {
      term: 'Drive / Тяга',
      ru: 'проекция аэродинамической силы паруса в сторону носа лодки. Именно это толкает вперёд',
      en: 'forward component of sail aero force. This is what pushes you',
      pl: 'ciag',
      es: 'componente hacia proa de la fuerza aerodinamica de la vela. Esto es lo que te empuja',
      fr: "composante vers l'avant de la force aéro de la voile. C'est ce qui pousse le bateau",
      de: 'Vortriebskomponente der Segelkraft. Das ist, was dich schiebt',
      it: 'componente in avanti della forza aerodinamica della vela. E ciò che ti spinge',
    },
    {
      term: 'Side / Боковая сила',
      ru: 'поперечная составляющая силы паруса. Рождает крен и leeway. Полезная работа - только drive',
      en: 'sideways component of sail force. Creates heel and leeway. The useful work is drive only',
      pl: 'sila boczna',
      es: 'componente lateral de la fuerza de las velas. Crea escora y abatimiento. Solo el drive trabaja',
      fr: 'composante latérale de la force des voiles. Elle crée gîte et dérive. Seul le drive travaille',
      de: 'Seitenkomponente der Segelkraft. Erzeugt Kraengung und Abdrift. Nur der Drive arbeitet',
      it: 'componente laterale della forza delle vele. Crea sbandamento e scarroccio. Solo il drive lavora',
    },
    {
      term: 'AoA',
      ru: 'angle of attack - угол атаки паруса к ветру. Оптимум ~ 12-18°. Меньше - парус полощет. Больше - stall',
      en: 'angle of attack - sail angle to wind. Optimal ~ 12-18°. Less: luffing. More: stall',
      pl: 'kat natarcia',
      es: 'angulo de ataque de la vela al viento. Optimo ~ 12-18°. Menos: flamea. Mas: stall',
      fr: "angle d'attaque de la voile au vent. Optimum ~ 12-18°. Moins : faseye. Plus : décrochage",
      de: 'Anstellwinkel des Segels zum Wind. Optimal ~ 12-18°. Weniger: killt. Mehr: Stall',
      it: "angolo di attacco della vela al vento. Ottimo ~ 12-18°. Meno: fileggia. Più: stallo",
    },
    {
      term: tp('Оптимум / ghost', 'Optimum / ghost', 'Optimum / ghost', {
        es: 'Optimo / ghost',
        fr: 'Optimum / ghost',
        de: 'Optimum / Ghost',
        it: 'Ottimo / ghost',
      }),
      ru: 'пунктирные зелёные силуэты - где грот и стаксель ДОЛЖНЫ стоять при текущем курсе и ветре. Сравни со своей настройкой',
      en: 'dashed green silhouettes - where main and jib SHOULD sit for the current course and wind. Compare to your trim',
      pl: 'zielone kontury - gdzie zagle powinny byc',
      es: 'siluetas verdes punteadas: donde DEBERIAN estar mayor y foque para este rumbo y viento. Compara con tu trimado',
      fr: 'silhouettes vertes pointillées : où la GV et le foc DEVRAIENT être pour ce cap et ce vent. Compare avec ton réglage',
      de: 'gruene gestrichelte Umrisse - wo Gross und Fock fuer Kurs und Wind stehen SOLLTEN. Vergleiche mit deinem Trimm',
      it: 'sagome verdi tratteggiate: dove randa e fiocco DOVREBBERO stare per questa rotta e vento. Confronta col tuo trim',
    },
    {
      term: tp('Трим % / trim', 'Trim %', 'Trim %', {
        es: 'Trim %',
        fr: 'Trim %',
        de: 'Trimm %',
        it: 'Trim %',
      }),
      ru: 'ваша скорость в % от скорости при идеальном триме для этого курса. 100% = не проигрываете ничего',
      en: 'your speed as % of the ideal-trim speed for this course. 100% means you lose nothing to trim',
      pl: 'procent idealnego trymu',
      es: 'tu velocidad como % de la velocidad con trimado ideal para este rumbo. 100% = no pierdes nada',
      fr: 'ta vitesse en % de la vitesse au réglage idéal pour ce cap. 100% = tu ne perds rien',
      de: 'deine Fahrt in % der Fahrt bei idealem Trimm fuer diesen Kurs. 100% = du verlierst nichts',
      it: 'la tua velocità in % della velocità col trim ideale per questa rotta. 100% = non perdi nulla',
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
            'Co oznaczaja te skroty?',
            {
              es: 'Que significan todas estas siglas?',
              fr: 'Que signifient toutes ces abréviations?',
              de: 'Was bedeuten all diese Abkuerzungen?',
              it: 'Cosa significano tutte queste sigle?',
            },
          )}
        </span>
        <span className="text-[10px] text-[var(--text-muted)] hidden sm:inline">
          {tp(
            'TWA, AWA, AWS, slot, stall, drive, side, heel, leeway и другие',
            'TWA, AWA, AWS, slot, stall, drive, side, heel, leeway and more',
            'TWA, AWA, AWS, slot, stall itd',
            {
              es: 'TWA, AWA, AWS, slot, stall, drive, side, heel, leeway y mas',
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
              'Jeden stan, silnik przelicza przy kazdej zmianie.',
              {
                es: 'Escena, metricas y comentario leen el mismo estado. El motor recalcula con cada cambio de control.',
                fr: 'La scène, les métriques et le commentaire lisent le même état. Le moteur recalcule à chaque changement.',
                de: 'Szene, Metriken und Kommentar lesen denselben State. Die Engine rechnet bei jeder Aenderung neu.',
                it: 'Scena, metriche e commento leggono lo stesso stato. Il motore ricalcola a ogni modifica.',
              },
            )}
          </div>
        </div>
      )}
    </div>
  );
}
