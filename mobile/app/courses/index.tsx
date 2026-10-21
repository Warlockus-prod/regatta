import { Stack, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useI18n } from '../../src/i18n/context';
import {
  Card,
  PointsOfSailDiagram,
  Screen,
  Text,
} from '../../src/design-system/components';
import { maneuvers, pointsOfSail, type Maneuver } from '../../src/data';
import { legacyPick, legacyPickArray, type Lang } from '../../src/i18n/languages';
import { manoeuvres } from '../../../src/data/sailing-lab/sources';
import { colors, radii, spacing } from '../../src/design-system/tokens';
import { pointOfSailTone } from '../../src/courses/tones';

// Tacking and jibing as procedures (the web /courses#turns section): the
// helmsman's and trimmer's side; the crew's choreography is in the checklist.
const TURNS = maneuvers.filter((m) => (m.stepsRu?.length ?? 0) > 0);

// Numbers are what people forget first, so they stand out in the step text.
function WithNumbers({ text, color }: { text: string; color: string }) {
  return (
    <>
      {text.split(/(\d+(?:-\d+)?)/).map((part, i) =>
        i % 2 === 1 ? (
          <Text key={i} style={[styles.turnNumber, { color }]}>
            {part}
          </Text>
        ) : (
          part
        ),
      )}
    </>
  );
}

function TurnCard({
  maneuver,
  color,
  lang,
  labels,
}: {
  maneuver: Maneuver;
  color: string;
  lang: Lang;
  labels: { commands: string; steps: string; mistakes: string };
}) {
  return (
    <Card style={[styles.card, { borderLeftColor: color, borderLeftWidth: 4 }]}>
      <Text variant="subtitle" style={{ color }}>
        {legacyPick(maneuver, 'name', lang)}
      </Text>
      {lang !== 'en' ? (
        <Text variant="muted" style={styles.anchorName}>
          {maneuver.nameEn}
        </Text>
      ) : null}
      <Text variant="body" style={styles.desc}>
        {legacyPick(maneuver, 'description', lang)}
      </Text>
      <Text variant="muted" style={styles.turnHeading}>
        {labels.commands.toUpperCase()}
      </Text>
      {legacyPickArray(maneuver, 'commands', lang).map((command, i) => (
        <View key={i} style={styles.turnCommand}>
          <Text variant="body" style={styles.turnText}>
            {command}
          </Text>
        </View>
      ))}
      <Text variant="muted" style={styles.turnHeading}>
        {labels.steps.toUpperCase()}
      </Text>
      {legacyPickArray(maneuver, 'steps', lang).map((step, i) => (
        <View key={i} style={styles.turnRow}>
          <Text style={[styles.turnMarker, { color }]}>{i + 1}</Text>
          <Text variant="body" style={styles.turnText}>
            <WithNumbers text={step} color={color} />
          </Text>
        </View>
      ))}
      <Text variant="muted" style={styles.turnHeading}>
        {labels.mistakes.toUpperCase()}
      </Text>
      {legacyPickArray(maneuver, 'mistakes', lang).map((mistake, i) => (
        <View key={i} style={styles.turnRow}>
          <Text style={[styles.turnMarker, { color: colors.danger }]}>✕</Text>
          <Text variant="body" style={styles.turnText}>
            {mistake}
          </Text>
        </View>
      ))}
    </Card>
  );
}

export default function Courses() {
  const { tp, lang } = useI18n();
  const router = useRouter();

  // Selected point of sail. Defaults to beam reach (the fastest, "hero" course -
  // matches the web, where Polwiatr is highlighted on load).
  const [activeId, setActiveId] = useState<string>('beam-reach');

  const headerTitle = tp(
    'Курсы относительно ветра',
    'Points of sail',
    'Kursy względem wiatru',
    { es: 'Rumbos', fr: 'Allures', de: 'Kurse zum Wind', it: 'Andature' },
  );

  const sailLabel = tp('Работа парусов', 'Sail work', 'Praca żagli', {
    es: 'Trabajo de las velas',
    fr: 'Travail des voiles',
    de: 'Segelwirkung',
    it: 'Lavoro delle vele',
  });

  const angleLabel = tp('Угол', 'Angle', 'Kąt', {
    es: 'Ángulo',
    fr: 'Angle',
    de: 'Winkel',
    it: 'Angolo',
  });

  const speedLabel = tp('Скорость', 'Speed', 'Prędkość', {
    es: 'Velocidad',
    fr: 'Vitesse',
    de: 'Geschwindigkeit',
    it: 'Velocità',
  });

  const windLabel = tp('Ветер', 'Wind', 'Wiatr', {
    es: 'Viento',
    fr: 'Vent',
    de: 'Wind',
    it: 'Vento',
  });

  const tapHint = tp(
    'Нажми на сектор диаграммы или карту ниже, чтобы узнать подробности курса.',
    'Tap a sector of the diagram or a card below to see course details.',
    'Stuknij sektor diagramu lub kartę poniżej, aby poznać szczegóły kursu.',
    {
      es: 'Toca un sector del diagrama o una tarjeta de abajo para ver los detalles del rumbo.',
      fr: 'Touche un secteur du diagramme ou une carte ci-dessous pour voir les détails.',
      de: 'Tippe auf einen Sektor des Diagramms oder auf eine Karte unten, um Details zu sehen.',
      it: 'Tocca un settore del diagramma o una scheda qui sotto per i dettagli.',
    },
  );

  const diagramA11y = tp(
    'Диаграмма курсов относительно ветра. Нажми на сектор, чтобы выбрать курс.',
    'Points-of-sail diagram. Tap a sector to select a course.',
    'Diagram kursów względem wiatru. Stuknij sektor, aby wybrać kurs.',
    {
      es: 'Diagrama de rumbos. Toca un sector para elegir un rumbo.',
      fr: 'Diagramme des allures. Touche un secteur pour choisir une allure.',
      de: 'Kursdiagramm. Tippe auf einen Sektor, um einen Kurs zu wählen.',
      it: 'Diagramma delle andature. Tocca un settore per sceglierne una.',
    },
  );

  // Short localized course names for the rim (drop the "/ alias" tail).
  const sectorLabels = useMemo(
    () =>
      pointsOfSail.map((p) => ({
        id: p.id,
        name: (legacyPick(p, 'name', lang).split('/')[0] ?? '').trim(),
      })),
    [lang],
  );

  const tackLabels = useMemo(
    () => ({
      port: tp('Левый галс', 'Port tack', 'Lewy hals', {
        es: 'Amurado a babor',
        fr: 'Bâbord amures',
        de: 'Backbordbug',
        it: 'Mure a sinistra',
      }),
      starboard: tp('Правый галс', 'Starboard tack', 'Prawy hals', {
        es: 'Amurado a estribor',
        fr: 'Tribord amures',
        de: 'Steuerbordbug',
        it: 'Mure a dritta',
      }),
    }),
    [lang], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const courseCardA11y = (name: string, pct: number) =>
    tp(
      `Курс ${name}, скорость ${pct} процентов от целевой`,
      `Point of sail ${name}, ${pct} percent of target speed`,
      `Kurs ${name}, prędkość ${pct} procent docelowej`,
      {
        es: `Rumbo ${name}, ${pct} por ciento de la velocidad objetivo`,
        fr: `Allure ${name}, ${pct} pour cent de la vitesse cible`,
        de: `Kurs ${name}, ${pct} Prozent der Zielgeschwindigkeit`,
        it: `Andatura ${name}, ${pct} per cento della velocità obiettivo`,
      },
    );

  const select = useCallback((id: string) => {
    Haptics.selectionAsync().catch(() => {});
    setActiveId(id);
  }, []);

  const activePoint = pointsOfSail.find((p) => p.id === activeId);
  const activeName = activePoint ? legacyPick(activePoint, 'name', lang) : '';
  const activeDesc = activePoint ? legacyPick(activePoint, 'description', lang) : '';

  return (
    <Screen>
      <Stack.Screen options={{ title: headerTitle }} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View
          style={styles.diagramArea}
          accessible
          accessibilityRole="image"
          accessibilityLabel={diagramA11y}
          accessibilityValue={{ text: activeName }}
        >
          <PointsOfSailDiagram
            windLabel={windLabel}
            activeId={activeId}
            onSelect={select}
            sectorLabels={sectorLabels}
            tackLabels={tackLabels}
          />
        </View>

        {activePoint ? (
          <View style={[styles.activeBanner, { borderLeftColor: pointOfSailTone(activePoint.id).ink }]}>
            <View style={styles.activeRow}>
              <View style={[styles.activeDot, { backgroundColor: pointOfSailTone(activePoint.id).ink }]} />
              <View style={styles.activeNameCol}>
                <Text variant="subtitle" style={styles.activeName}>
                  {activeName}
                </Text>
                {lang !== 'en' ? (
                  <Text variant="muted" style={styles.anchorName}>
                    {activePoint.nameEn}
                  </Text>
                ) : null}
              </View>
            </View>
            {activeDesc ? (
              <Text variant="body" style={styles.activeDesc}>
                {activeDesc}
              </Text>
            ) : null}
          </View>
        ) : null}

        <Text variant="muted" style={styles.hint}>
          {tapHint}
        </Text>

        {pointsOfSail.map((point) => {
          const name = legacyPick(point, 'name', lang);
          const description = legacyPick(point, 'description', lang);
          const sailWork = legacyPick(point, 'sailWork', lang);
          const speedPct = Math.round(point.speedFactor * 100);
          const isActive = point.id === activeId;
          return (
            <Pressable
              key={point.id}
              onPress={() => select(point.id)}
              accessibilityRole="button"
              accessibilityLabel={courseCardA11y(name, speedPct)}
              accessibilityState={{ selected: isActive }}
            >
              <Card
                style={[
                  styles.card,
                  { borderLeftColor: pointOfSailTone(point.id).ink, borderLeftWidth: 4 },
                  isActive && styles.cardActive,
                ]}
              >
                <Text variant="subtitle">{name}</Text>
                {lang !== 'en' ? (
                  <Text variant="muted" style={styles.anchorName}>
                    {point.nameEn}
                  </Text>
                ) : null}
                <View style={styles.metaRow}>
                  <View style={styles.metaCell}>
                    <Text variant="muted" style={styles.metaLabel}>
                      {angleLabel.toUpperCase()}
                    </Text>
                    <Text variant="body" style={styles.metaValue}>
                      {`${point.angleMin}-${point.angleMax}°`}
                    </Text>
                  </View>
                  <View style={styles.metaCell}>
                    <Text variant="muted" style={styles.metaLabel}>
                      {speedLabel.toUpperCase()}
                    </Text>
                    <Text variant="body" style={styles.metaValue}>{`${speedPct}%`}</Text>
                  </View>
                </View>
                <Text variant="body" style={styles.desc}>{description}</Text>
                {sailWork ? (
                  <View style={styles.sailBlock}>
                    <Text variant="muted" style={styles.sailLabel}>
                      {sailLabel.toUpperCase()}
                    </Text>
                    <Text variant="body" style={styles.sailText}>{sailWork}</Text>
                  </View>
                ) : null}
              </Card>
            </Pressable>
          );
        })}

        <Card style={styles.theoryCard}>
          <View style={styles.theoryHeadRow}>
            <Text variant="subtitle" style={styles.theoryTitle}>
              {tp('Два паруса, а не один', 'Two sails, not one', 'Dwa żagle, nie jeden', {
                es: 'Dos velas, no una',
                fr: 'Deux voiles, pas une seule',
                de: 'Zwei Segel, nicht eins',
                it: 'Due vele, non una',
              })}
            </Text>
          </View>
          <Text variant="body" style={styles.theoryIntro}>
            {tp(
              'Обычная круизная яхта (слуп) несет два паруса: грот и стаксель. На диаграмме каждый кораблик показан с обоими: треугольник за мачтой - грот, треугольник перед мачтой - стаксель. На реальной лодке они работают вместе, а шкотов (веревок управления) - два.',
              'A typical cruising yacht (sloop) carries two sails: mainsail and jib. In the diagram every boat shows both - triangle aft of the mast is the main, triangle forward of the mast is the jib. On a real boat they work together, and there are TWO sheets (control lines).',
              'Typowy jacht turystyczny (slup) niesie dwa żagle: grot i fok. Na diagramie każda łódka ma oba: trójkąt za masztem to grot, trójkąt przed masztem to fok. Na prawdziwym jachcie pracują razem, a szoty (liny do ich regulacji) są DWA.',
              {
                es: 'Un velero de crucero típico (balandro) lleva dos velas: la mayor y el foque. En el diagrama cada barco lleva las dos: el triángulo a popa del mástil es la mayor y el triángulo a proa del mástil es el foque. En un barco de verdad trabajan juntas, y hay DOS escotas (los cabos que las regulan).',
                fr: 'Un voilier de croisière typique (sloop) porte deux voiles : la grand-voile et le foc. Sur le diagramme, chaque bateau porte les deux : le triangle en arrière du mât est la grand-voile, le triangle en avant du mât est le foc. Sur un vrai bateau, elles travaillent ensemble et il y a DEUX écoutes (les cordages de réglage).',
                de: 'Eine typische Fahrtenyacht (Slup) führt zwei Segel: Großsegel und Fock. Im Diagramm hat jedes Boot beide: Das Dreieck hinter dem Mast ist das Großsegel, das Dreieck vor dem Mast die Fock. Auf einem echten Boot arbeiten sie zusammen, und es gibt ZWEI Schoten (die Leinen zum Trimmen).',
                it: "Un tipico yacht da crociera (sloop) porta due vele: la randa e il fiocco. Nel diagramma ogni barca le mostra entrambe: il triangolo a poppavia dell'albero è la randa, quello a proravia è il fiocco. Su una barca vera lavorano insieme, e le scotte (le cime di regolazione) sono DUE.",
              },
            )}
          </Text>

          <View
            style={[
              styles.subCard,
              { backgroundColor: 'rgba(0, 110, 166, 0.05)', borderColor: 'rgba(0, 110, 166, 0.15)' },
            ]}
          >
            <Text variant="caption" style={[styles.subCardTitle, { color: colors.accentCyan }]}>
              {tp('Грот / Mainsail', 'Mainsail', 'Grot / Mainsail', {
                es: 'Vela mayor / Mainsail',
                fr: 'Grand-voile / Mainsail',
                de: 'Großsegel / Mainsail',
                it: 'Randa / Mainsail',
              })}
            </Text>
            <Text variant="muted" style={styles.subCardBody}>
              {tp(
                'Большой парус за мачтой. Главный двигатель на всех курсах кроме чистого фордевинда. Управляется гика-шкотом. В сильный ветер рифится (уменьшается) первым.',
                'Big sail aft of the mast. The main engine on every course except a dead run. Controlled by the mainsheet. In strong wind it gets reefed (reduced) first.',
                'Duży żagiel za masztem. Główny napęd na wszystkich kursach oprócz czystego fordewindu. Reguluje się go szotem grota. Przy silnym wietrze refuje się go (zmniejsza) jako pierwszy.',
                {
                  es: 'Vela grande a popa del mástil. Es el motor principal en todos los rumbos salvo la popa cerrada. Se regula con la escota de mayor. Con viento fuerte es la primera que se riza (se reduce).',
                  fr: "Grande voile en arrière du mât. C'est le moteur principal à toutes les allures, sauf au plein vent arrière. Elle se règle avec l'écoute de grand-voile. Par vent fort, c'est elle qu'on réduit en premier (prise de ris).",
                  de: 'Großes Segel hinter dem Mast. Der Hauptantrieb auf allen Kursen außer platt vor dem Wind. Wird mit der Großschot getrimmt. Bei starkem Wind wird es zuerst gerefft (verkleinert).',
                  it: "Vela grande a poppavia dell'albero. È il motore principale in tutte le andature tranne la poppa piena. Si regola con la scotta della randa. Con vento forte è la prima a essere terzarolata (ridotta).",
                },
              )}
            </Text>
          </View>

          <View
            style={[
              styles.subCard,
              { backgroundColor: 'rgba(245, 226, 107, 0.06)', borderColor: 'rgba(245, 226, 107, 0.20)' },
            ]}
          >
            <Text variant="caption" style={[styles.subCardTitle, { color: colors.overtrim }]}>
              {tp('Стаксель / Jib', 'Jib', 'Fok / Jib', {
                es: 'Foque / Jib',
                fr: 'Foc / Jib',
                de: 'Fock / Jib',
                it: 'Fiocco / Jib',
              })}
            </Text>
            <Text variant="muted" style={styles.subCardBody}>
              {tp(
                'Треугольный парус перед мачтой. Вместе с гротом работает как одно крыло: паруса меняют поток друг друга (эффект щели) и дают дополнительную тягу на острых курсах. У него свой шкот - стаксель-шкот.',
                "Triangular sail forward of the mast. Together with the main it works as one wing: the two sails change each other's airflow (slot effect) and add drive on close courses. It has its own sheet - the jib sheet.",
                'Trójkątny żagiel przed masztem. Razem z grotem pracuje jak jedno skrzydło: żagle zmieniają sobie nawzajem przepływ (efekt szczeliny) i dają dodatkowy ciąg na ostrych kursach. Ma własny szot - szot foka.',
                {
                  es: 'Vela triangular a proa del mástil. Junto con la mayor funciona como una sola ala: cada vela modifica el flujo de la otra (efecto ranura) y juntas dan más empuje en los rumbos de ceñida. Tiene su propia escota: la escota del foque.',
                  fr: "Voile triangulaire en avant du mât. Avec la grand-voile, il forme une seule aile : chaque voile modifie l'écoulement de l'autre (effet de fente), ce qui donne plus de puissance aux allures de près. Il a sa propre écoute : l'écoute de foc.",
                  de: 'Dreieckiges Segel vor dem Mast. Zusammen mit dem Großsegel wirkt es wie ein einziger Flügel: Die Segel verändern gegenseitig ihre Strömung (Spalteffekt) und bringen zusätzlichen Vortrieb auf Am-Wind-Kursen. Hat eine eigene Schot: die Fockschot.',
                  it: "Vela triangolare a proravia dell'albero. Insieme alla randa lavora come un'unica ala: ogni vela modifica il flusso dell'altra (effetto fessura) e insieme danno più spinta nelle andature strette. Ha la sua scotta: la scotta del fiocco.",
                },
              )}
            </Text>
          </View>

          <View
            style={[
              styles.subCard,
              { backgroundColor: 'rgba(138, 97, 0, 0.05)', borderColor: 'rgba(138, 97, 0, 0.15)' },
            ]}
          >
            <Text variant="caption" style={[styles.subCardTitle, { color: colors.warning }]}>
              {tp('Эффект щели / Slot effect', 'Slot effect', 'Efekt szczeliny / Slot effect', {
                es: 'Efecto ranura / Slot effect',
                fr: 'Effet de fente / Slot effect',
                de: 'Spalteffekt / Slot effect',
                it: 'Effetto fessura / Slot effect',
              })}
            </Text>
            <Text variant="muted" style={styles.subCardBody}>
              {tp("Грот и стаксель взаимно меняют направление потока и распределение давления. Согласуй их трим: слишком закрытый промежуток между парусами ухудшает работу. Это взаимодействие двух крыльев, а не просто ускорение воздуха в узкой щели.", "The main and jib change each other's airflow and pressure distribution. Trim them together: an overly closed slot can reduce performance. This is interaction between two wings, rather than simply air accelerating through a narrow gap.", "Grot i fok wzajemnie zmieniają przepływ powietrza i rozkład ciśnienia. Trymuj je razem: nadmiernie zamknięta szczelina pogarsza pracę żagli. To współpraca dwóch skrzydeł, a nie samo przyspieszanie powietrza w szczelinie.", {"es":"Mayor y foque modifican mutuamente el flujo y la presión. Ajusta ambas velas: cerrar demasiado el espacio puede reducir el rendimiento. Son dos alas que interactúan, no solo aire acelerado en un hueco.","fr":"Grand-voile et foc modifient mutuellement le flux et la pression. Règle les deux voiles ensemble : un couloir trop fermé peut nuire au rendement. Deux profils interagissent, au-delà d'une simple accélération dans un passage étroit.","de":"Groß und Fock beeinflussen gegenseitig Strömung und Druckverteilung. Trimme beide zusammen: Ein zu enger Spalt kann Leistung kosten. Zwei Flügel wirken zusammen; es geht nicht nur um beschleunigte Luft im Spalt.","it":"Randa e fiocco modificano reciprocamente flusso e pressione. Regolali insieme: uno spazio troppo chiuso può ridurre il rendimento. Interagiscono due ali, non si tratta solo di aria accelerata in una fessura."})}
            </Text>
          </View>

          <View style={[styles.theoryHeadRow, styles.theorySubheadRow]}>
            <Text variant="caption" style={styles.theorySubhead}>
              {tp('А что еще бывает?', 'What else is there?', 'A co jeszcze?', {
                es: '¿Qué más hay?',
                fr: "Quoi d'autre ?",
                de: 'Was gibt es noch?',
                it: "Cos'altro c'è?",
              })}
            </Text>
          </View>

          <Text variant="muted" style={styles.extraPara}>
            <Text variant="caption" style={styles.extraName}>
              {tp('Генуя (genoa) ', 'Genoa ', 'Genua ', {
                es: 'Génova (genoa) ',
                fr: 'Génois (genoa) ',
                de: 'Genua ',
                it: 'Genoa ',
              })}
            </Text>
            {tp(
              '- большой стаксель, чей задний край заходит за мачту. Дает заметно больше тяги на бейдевинде и галфвинде, но сложнее в работе при поворотах.',
              '- a large jib whose trailing edge overlaps the mast. Gives noticeably more drive on close-hauled and beam reach, but is harder to handle through tacks.',
              '- duży fok, którego lik tylny zachodzi za maszt. Daje wyraźnie więcej ciągu na bajdewindzie i półwietrze, ale trudniej się nim pracuje przy zwrotach.',
              {
                es: '- un foque grande cuya baluma sobrepasa el mástil. Da bastante más empuje en ceñida y al través, pero es más difícil de manejar en las viradas.',
                fr: '- un grand foc dont la chute recouvre le mât. Il donne nettement plus de puissance au près et au travers, mais il est plus difficile à manœuvrer dans les virements.',
                de: '- eine große Fock, deren Achterliek den Mast überlappt. Bringt spürbar mehr Vortrieb hoch am Wind und bei halbem Wind, ist aber bei Wenden schwerer zu handhaben.',
                it: "- un fiocco grande la cui balumina supera l'albero. Dà molta più spinta di bolina e al traverso, ma è più difficile da gestire nelle virate.",
              },
            )}
          </Text>

          <Text variant="muted" style={styles.extraPara}>
            <Text variant="caption" style={styles.extraName}>
              {tp('Геннакер (gennaker) ', 'Gennaker ', 'Gennaker ', {
                es: 'Gennaker ',
                fr: 'Gennaker ',
                de: 'Gennaker ',
                it: 'Gennaker ',
              })}
            </Text>
            {tp(
              '- асимметричный легкий парус для попутных курсов (бакштаг, фордевинд). Ставится вместо стакселя, надувается как шар. Проще спинакера, не требует спинакер-гика.',
              '- asymmetric light sail for downwind courses (broad reach, running). Set in place of the jib, inflates like a balloon. Simpler than a spinnaker, no spinnaker pole needed.',
              '- asymetryczny lekki żagiel na kursy pełne (baksztag, fordewind). Stawia się go zamiast foka i wypełnia się jak balon. Prostszy od spinakera, nie wymaga spinakerbomu.',
              {
                es: '- vela ligera asimétrica para rumbos portantes (largo, popa). Se iza en lugar del foque y se hincha como un globo. Más sencilla que el spinnaker, no necesita tangón.',
                fr: "- voile légère asymétrique pour les allures portantes (grand largue, vent arrière). Elle s'établit à la place du foc et se gonfle comme un ballon. Plus simple qu'un spi, elle se passe de tangon.",
                de: '- asymmetrisches Leichtwindsegel für raume Kurse (raumer Wind, vor dem Wind). Wird statt der Fock gesetzt und bläht sich wie ein Ballon. Einfacher als ein Spinnaker, ohne Spinnakerbaum.',
                it: '- vela leggera asimmetrica per le andature portanti (lasco, poppa). Si issa al posto del fiocco e si gonfia come un pallone. Più semplice dello spinnaker, non serve il tangone.',
              },
            )}
          </Text>

          <Text variant="muted" style={styles.extraPara}>
            <Text variant="caption" style={styles.extraName}>
              {tp('Спинакер (spinnaker) ', 'Spinnaker ', 'Spinaker ', {
                es: 'Spinnaker ',
                fr: 'Spinnaker ',
                de: 'Spinnaker ',
                it: 'Spinnaker ',
              })}
            </Text>
            {tp("- симметричный объёмный парус для полных курсов, включая бакштаг и фордевинд. Рабочий угол зависит от кроя и ветра. Обычно используется со спинакер-гиком.", "- a symmetric full sail for downwind courses, including broad reaching and running. Its working angles depend on the cut and wind strength. Normally flown with a spinnaker pole.", "- symetryczny pełny żagiel na kursy pełne, w tym baksztag i fordewind. Zakres kątów zależy od kroju i siły wiatru. Zwykle wymaga spinakerbomu.", {"es":'- vela simétrica para rumbos portantes, incluidos largos y popa. Los ángulos dependen del corte y del viento. Normalmente se usa con tangón.',"fr":"- voile symétrique pour les allures portantes, du grand largue au vent arrière selon sa coupe et le vent. Elle utilise généralement un tangon.","de":"- ein symmetrisches Segel für raume Kurse und Vorwind. Der Einsatzbereich hängt von Schnitt und Windstärke ab. Meist wird ein Spinnakerbaum verwendet.","it":"- vela simmetrica per le andature portanti, dal lasco alla poppa secondo taglio e vento. Normalmente richiede un tangone."})}
          </Text>

          <Text variant="muted" style={[styles.extraPara, styles.extraNote]}>
            {tp(
              'В симуляторе показаны только грот + стаксель - базовая конфигурация слупа. Остальные паруса - для продвинутых гонок.',
              'The simulator shows only main + jib - the basic sloop configuration. The other sails belong to advanced racing.',
              'W symulatorze są tylko grot i fok - podstawowy zestaw żagli slupa. Pozostałe żagle to już zaawansowane regaty.',
              {
                es: 'El simulador solo muestra mayor + foque, la configuración básica del balandro. Las demás velas son para regatas avanzadas.',
                fr: 'Le simulateur ne montre que grand-voile + foc, la configuration de base du sloop. Les autres voiles relèvent de la régate avancée.',
                de: 'Der Simulator zeigt nur Großsegel + Fock, die Grundbesegelung einer Slup. Die anderen Segel gehören ins fortgeschrittene Regattasegeln.',
                it: 'Il simulatore mostra solo randa + fiocco, la configurazione base dello sloop. Le altre vele sono per le regate avanzate.',
              },
            )}
          </Text>
        </Card>

        <View style={styles.turnsHead}>
          <Text variant="subtitle">
            {tp('Повороты: оверштаг и фордевинд', 'Turns: tacking and jibing', 'Zwroty: przez sztag i przez rufę', {
              es: 'Virada por avante y trasluchada',
              fr: 'Virer de bord et empanner',
              de: 'Wende und Halse',
              it: 'Virare e strambare',
            })}
          </Text>
          <Text variant="body" style={styles.turnsIntro}>
            {tp(
              'Поворот глазами рулевого и шкотового: команды, числа и порядок действий. Что в это время делает остальной экипаж и когда пригибаться, собрано в чек-листе.',
              "The turn from the helmsman's and the trimmer's side: calls, numbers and the order of actions. What the rest of the crew does meanwhile, and when to duck, is in the checklist.",
              'Zwrot oczami sternika i szotowego: komendy, liczby i kolejność działań. Co w tym czasie robi reszta załogi i kiedy się schylić, znajdziesz na liście kontrolnej.',
              {
                es: 'La maniobra vista por el timonel y el trimmer: órdenes, números y secuencia de acciones. Qué hace mientras tanto el resto de la tripulación, y cuándo agacharse, está en la checklist.',
                fr: "La manœuvre vue par le barreur et le régleur : ordres, chiffres et enchaînement des actions. Ce que fait le reste de l'équipage pendant ce temps, et quand baisser la tête, se trouve dans la check-list.",
                de: 'Das Manöver aus Sicht von Rudergänger und Trimmer: Kommandos, Zahlen und Reihenfolge. Was die übrige Crew dabei tut und wann man den Kopf einzieht, steht in der Checkliste.',
                it: "La manovra vista dal timoniere e dal trimmer: comandi, numeri e ordine delle azioni. Cosa fa intanto il resto dell'equipaggio, e quando abbassare la testa, è nella checklist.",
              },
            )}
          </Text>
        </View>

        <Card
          accent="cyan"
          style={styles.turnsLink}
          onPress={() => router.push('/checklist')}
          accessibilityRole="button"
        >
          <Text variant="body" style={styles.turnsLinkText}>
            {`${tp('Что делает экипаж: чек-лист', 'What the crew does: the checklist', 'Co robi załoga: lista kontrolna', {
              es: 'Qué hace la tripulación: la checklist',
              fr: "Ce que fait l'équipage : la check-list",
              de: 'Was die Crew tut: die Checkliste',
              it: "Cosa fa l'equipaggio: la checklist",
            })} →`}
          </Text>
        </Card>

        <View
          style={[
            styles.subCard,
            { backgroundColor: 'rgba(245, 226, 107, 0.06)', borderColor: 'rgba(245, 226, 107, 0.20)' },
          ]}
        >
          <Text variant="caption" style={[styles.subCardTitle, { color: colors.overtrim }]}>
            {tp('Румпель и штурвал', 'Tiller and wheel', 'Rumpel i koło sterowe', {
              es: 'Caña y rueda',
              fr: 'Barre franche et barre à roue',
              de: 'Pinne und Rad',
              it: 'Barra e ruota',
            })}
          </Text>
          <Text variant="muted" style={styles.subCardBody}>
            {tp(
              'Рулевой сидит на наветренном борту. Румпель от себя - лодка приводится, на себя - уваливается: нос всегда уходит в сторону, противоположную румпелю. Штурвал крутят как руль машины: куда повернул, туда пошел нос.',
              'The helmsman sits on the windward side. Push the tiller away from you and the boat luffs up; pull it towards you and it bears away: the bow always goes the opposite way to the tiller. A wheel turns like a car steering wheel: the bow goes the way you turn it.',
              'Sternik siedzi na nawietrznej burcie. Rumpel od siebie - jacht ostrzy, do siebie - odpada: dziób zawsze idzie w stronę przeciwną do rumpla. Kołem sterowym kręci się jak kierownicą w samochodzie: w którą stronę kręcisz, w tę idzie dziób.',
              {
                es: 'El timonel se sienta a barlovento. Caña hacia fuera y el barco orza; caña hacia ti y el barco arriba: la proa siempre va al lado contrario de la caña. La rueda se gira como el volante de un coche: la proa va hacia donde giras.',
                fr: "Le barreur est assis au vent. Barre poussée, le bateau lofe ; barre tirée vers soi, il abat : l'étrave part toujours du côté opposé à la barre. Une barre à roue se tourne comme un volant : l'étrave va du côté où tu tournes.",
                de: 'Der Rudergänger sitzt in Luv. Pinne von sich weg: Das Boot luvt an. Pinne zu sich heran: Es fällt ab. Der Bug geht immer zur Gegenseite der Pinne. Ein Rad dreht man wie ein Autolenkrad: Der Bug geht dorthin, wohin du drehst.',
                it: "Il timoniere siede sopravvento. Barra spinta lontano da te e la barca orza; barra verso di te e poggia: la prua va sempre dalla parte opposta alla barra. La ruota si gira come il volante di un'auto: la prua va dove giri.",
              },
            )}
          </Text>
        </View>

        {TURNS.map((m) => (
          <TurnCard
            key={m.id}
            maneuver={m}
            color={m.id === 'jibing' ? colors.warning : colors.accentCyan}
            lang={lang}
            labels={{
              commands: tp('Команды', 'Calls', 'Komendy', { es: 'Órdenes', fr: 'Ordres', de: 'Kommandos', it: 'Comandi' }),
              steps: tp('По шагам', 'Step by step', 'Krok po kroku', {
                es: 'Paso a paso',
                fr: 'Étape par étape',
                de: 'Schritt für Schritt',
                it: 'Passo dopo passo',
              }),
              mistakes: tp('Частые ошибки', 'Common mistakes', 'Częste błędy', {
                es: 'Errores frecuentes',
                fr: 'Erreurs fréquentes',
                de: 'Häufige Fehler',
                it: 'Errori frequenti',
              }),
            }}
          />
        ))}

        <Text variant="muted" style={styles.turnsSource}>
          {tp(
            'По книге: Роберт Дас, Эрик фон Краузе, «Маневры под парусами».',
            `Based on: ${manoeuvres.title}.`,
            `Na podstawie: ${manoeuvres.title}.`,
            {
              es: `Basado en: ${manoeuvres.title}.`,
              fr: `D'après : ${manoeuvres.title}.`,
              de: `Nach: ${manoeuvres.title}.`,
              it: `Basato su: ${manoeuvres.title}.`,
            },
          )}
        </Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
  },
  diagramArea: {
    paddingHorizontal: spacing.lg,
  },
  activeBanner: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.bgCard,
    borderRadius: radii.lg,
    borderLeftWidth: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderCyanFaint,
  },
  activeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  activeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  activeNameCol: {
    flex: 1,
  },
  activeName: {
    fontWeight: '700',
  },
  anchorName: {
    fontSize: 12,
    marginTop: 2,
  },
  activeDesc: {
    marginTop: spacing.sm,
    lineHeight: 22,
  },
  hint: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  card: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  cardActive: {
    borderColor: colors.borderCyanStrong,
    borderWidth: 1,
  },
  metaRow: {
    flexDirection: 'row',
    marginTop: spacing.sm,
    gap: spacing.xl,
  },
  metaCell: {},
  metaLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: 2,
  },
  metaValue: {
    fontVariant: ['tabular-nums'],
    fontWeight: '600',
  },
  desc: {
    marginTop: spacing.md,
    lineHeight: 22,
  },
  sailBlock: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0, 110, 166, 0.10)',
  },
  sailLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: spacing.xs,
    color: colors.textSecondary,
  },
  sailText: {
    lineHeight: 20,
  },
  theoryCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  theoryHeadRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    gap: spacing.sm,
  },
  theorySubheadRow: {
    marginTop: spacing.lg,
  },
  theoryTitle: {
    marginTop: 0,
  },
  theoryAnchor: {
    fontSize: 12,
  },
  theoryIntro: {
    marginTop: spacing.sm,
    lineHeight: 22,
  },
  subCard: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  subCardTitle: {
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  subCardBody: {
    fontSize: 13,
    lineHeight: 19,
  },
  theorySubhead: {
    color: colors.textPrimary,
    fontWeight: '700',
    fontSize: 15,
  },
  extraPara: {
    marginTop: spacing.sm,
    fontSize: 13,
    lineHeight: 19,
  },
  extraName: {
    color: colors.textPrimary,
    fontWeight: '700',
    fontSize: 13,
  },
  extraNote: {
    marginTop: spacing.md,
    fontStyle: 'italic',
  },
  turnsHead: {
    marginTop: spacing.xl,
  },
  turnsIntro: {
    marginTop: spacing.sm,
  },
  turnsLink: {
    marginTop: spacing.md,
  },
  turnsLinkText: {
    color: colors.accentCyan,
  },
  turnHeading: {
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    fontSize: 12,
    fontWeight: '700',
  },
  turnCommand: {
    marginBottom: spacing.xs,
    padding: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  turnRow: {
    flexDirection: 'row',
    marginBottom: spacing.xs,
  },
  turnMarker: {
    width: 22,
    fontWeight: '700',
    fontSize: 14,
    lineHeight: 22,
  },
  turnText: {
    flex: 1,
    fontSize: 15,
  },
  turnNumber: {
    fontWeight: '700',
  },
  turnsSource: {
    marginTop: spacing.md,
    marginBottom: spacing.xl,
    fontSize: 12,
  },
});
