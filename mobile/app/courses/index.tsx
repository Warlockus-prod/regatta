import { Stack } from 'expo-router';
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
import { pointsOfSail } from '../../src/data';
import { legacyPick } from '../../src/i18n/languages';
import { colors, radii, spacing } from '../../src/design-system/tokens';

export default function Courses() {
  const { tp, lang } = useI18n();

  // Selected point of sail. Defaults to beam reach (the fastest, "hero" course -
  // matches the web, where Polwiatr is highlighted on load).
  const [activeId, setActiveId] = useState<string>('beam-reach');

  const headerTitle = tp(
    'Курсы относительно ветра',
    'Points of sail',
    'Kursy wzgledem wiatru',
    { es: 'Rumbos', fr: 'Allures', de: 'Kurse zum Wind', it: 'Andature' },
  );

  const sailLabel = tp('Работа парусов', 'Sail work', 'Praca zagli', {
    es: 'Trabajo de velas',
    fr: 'Reglage des voiles',
    de: 'Segelfuehrung',
    it: 'Lavoro delle vele',
  });

  const angleLabel = tp('Угол', 'Angle', 'Kat', {
    es: 'Angulo',
    fr: 'Angle',
    de: 'Winkel',
    it: 'Angolo',
  });

  const speedLabel = tp('Скорость', 'Speed', 'Predkosc', {
    es: 'Velocidad',
    fr: 'Vitesse',
    de: 'Geschwindigkeit',
    it: 'Velocita',
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
    'Stuknij sektor diagramu lub karte ponizej, aby poznac szczegoly kursu.',
    {
      es: 'Toca un sector del diagrama o una tarjeta para ver los detalles del rumbo.',
      fr: 'Touchez un secteur du diagramme ou une carte pour voir les details.',
      de: 'Tippe einen Sektor des Diagramms oder eine Karte fuer Details an.',
      it: 'Tocca un settore del diagramma o una scheda per i dettagli.',
    },
  );

  const diagramA11y = tp(
    'Диаграмма курсов относительно ветра. Нажми на сектор, чтобы выбрать курс.',
    'Points-of-sail diagram. Tap a sector to select a course.',
    'Diagram kursow wzgledem wiatru. Stuknij sektor, aby wybrac kurs.',
    {
      es: 'Diagrama de rumbos. Toca un sector para elegir un rumbo.',
      fr: 'Diagramme des allures. Touchez un secteur pour choisir une allure.',
      de: 'Kursdiagramm. Tippe einen Sektor an, um einen Kurs zu waehlen.',
      it: 'Diagramma delle andature. Tocca un settore per scegliere.',
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
        es: 'Amura de babor',
        fr: 'Bord babord',
        de: 'Backbordbug',
        it: 'Mure a sinistra',
      }),
      starboard: tp('Правый галс', 'Starboard tack', 'Prawy hals', {
        es: 'Amura de estribor',
        fr: 'Bord tribord',
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
      `Kurs ${name}, ${pct} procent predkosci`,
      {
        es: `Rumbo ${name}, ${pct} por ciento de velocidad`,
        fr: `Allure ${name}, ${pct} pour cent de vitesse`,
        de: `Kurs ${name}, ${pct} Prozent Geschwindigkeit`,
        it: `Andatura ${name}, ${pct} per cento di velocita`,
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
          <View style={[styles.activeBanner, { borderLeftColor: activePoint.color }]}>
            <View style={styles.activeRow}>
              <View style={[styles.activeDot, { backgroundColor: activePoint.color }]} />
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
                  { borderLeftColor: point.color, borderLeftWidth: 4 },
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
              {tp('Два паруса, а не один', 'Two sails, not one', 'Dwa zagle, nie jeden', {
                es: 'Dos velas, no una',
                fr: 'Deux voiles, pas une',
                de: 'Zwei Segel, nicht eins',
                it: 'Due vele, non una',
              })}
            </Text>
            {lang !== 'en' ? (
              <Text variant="muted" style={styles.theoryAnchor}>
                Two sails, not one
              </Text>
            ) : null}
          </View>
          <Text variant="body" style={styles.theoryIntro}>
            {tp(
              'Обычная круизная яхта (слуп) несет два паруса: грот и стаксель. На диаграмме каждый кораблик показан с обоими: треугольник за мачтой - грот, треугольник перед мачтой - стаксель. На реальной лодке они работают вместе, а шкотов (веревок управления) - два.',
              'A typical cruising yacht (sloop) carries two sails: mainsail and jib. In the diagram every boat shows both - triangle aft of the mast is the main, triangle forward of the mast is the jib. On a real boat they work together, and there are TWO sheets (control lines).',
              'Typowy jacht turystyczny (slup) niesie dwa zagle: grot i fok. Na diagramie kazda lodz pokazana jest z obydwoma: trojkat za masztem to grot, przed masztem to fok. Na prawdziwej lodzi pracuja razem, a szotow (lin sterujacych) sa dwa.',
              {
                es: 'Un yate de crucero tipico (sloop) lleva dos velas: mayor y foque. En el diagrama cada barco muestra ambas: el triangulo a popa del mastil es la mayor, el de proa es el foque. En un barco real trabajan juntas, y hay DOS escotas (cabos de control).',
                fr: 'Un voilier de croisiere classique (sloop) porte deux voiles: grand-voile et foc. Sur le diagramme chaque bateau montre les deux: le triangle a l arriere du mat est la grand-voile, celui a l avant est le foc. Sur un vrai bateau elles travaillent ensemble, et il y a DEUX ecoutes (cordages de reglage).',
                de: 'Eine typische Fahrtenyacht (Slup) traegt zwei Segel: Gross und Fock. Im Diagramm zeigt jedes Boot beide - das Dreieck hinter dem Mast ist das Gross, das vor dem Mast ist die Fock. An Bord arbeiten sie zusammen, und es gibt ZWEI Schoten (Steuerleinen).',
                it: 'Una tipica barca da crociera (sloop) porta due vele: randa e fiocco. Nel diagramma ogni barca mostra entrambe: il triangolo a poppa dell albero e la randa, quello a prua e il fiocco. Su una barca vera lavorano insieme, e ci sono DUE scotte (cime di regolazione).',
              },
            )}
          </Text>

          <View
            style={[
              styles.subCard,
              { backgroundColor: 'rgba(0, 212, 255, 0.05)', borderColor: 'rgba(0, 212, 255, 0.15)' },
            ]}
          >
            <Text variant="caption" style={[styles.subCardTitle, { color: colors.accentCyan }]}>
              {tp('Грот / Mainsail', 'Mainsail', 'Grot / Mainsail', {
                es: 'Mayor / Mainsail',
                fr: 'Grand-voile / Mainsail',
                de: 'Gross / Mainsail',
                it: 'Randa / Mainsail',
              })}
            </Text>
            <Text variant="muted" style={styles.subCardBody}>
              {tp(
                'Большой парус за мачтой. Главный двигатель на всех курсах кроме чистого фордевинда. Управляется гика-шкотом. В сильный ветер рифится (уменьшается) первым.',
                'Big sail aft of the mast. The main engine on every course except a dead run. Controlled by the mainsheet. In strong wind it gets reefed (reduced) first.',
                'Duzy zagiel za masztem. Glowny naped na wszystkich kursach oprocz czystego fordewindu. Sterowany szotem grota. Przy silnym wietrze rifuje sie (zmniejsza) w pierwszej kolejnosci.',
                {
                  es: 'Vela grande a popa del mastil. El motor principal en todos los rumbos salvo la popa cerrada. Se controla con la escota mayor. Con viento fuerte se riza (reduce) primero.',
                  fr: 'Grande voile a l arriere du mat. Le moteur principal sur toutes les allures sauf le plein vent arriere. Controlee par l ecoute de grand-voile. Par vent fort on la prend en premier (on reduit).',
                  de: 'Grosses Segel hinter dem Mast. Der Hauptantrieb auf allen Kursen ausser dem reinen Vorwindkurs. Gesteuert mit der Grossschot. Bei starkem Wind wird es zuerst gerefft (verkleinert).',
                  it: 'Vela grande a poppa dell albero. Il motore principale su tutte le andature tranne la poppa piena. Controllata dalla scotta randa. Con vento forte si riduce (terzaroli) per prima.',
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
                'Треугольный парус перед мачтой. Ускоряет воздух перед гротом (эффект щели), дает дополнительную тягу на острых курсах. У него свой шкот - шкотовый.',
                'Triangular sail forward of the mast. Accelerates the airflow in front of the main (slot effect), adds drive on close courses. Has its own sheet - the jib sheet.',
                'Trojkatny zagiel przed masztem. Przyspiesza powietrze przed grotem (efekt szczeliny), daje dodatkowy ciag na ostrym kursie. Ma wlasny szot - szot foka.',
                {
                  es: 'Vela triangular a proa del mastil. Acelera el aire delante de la mayor (efecto rendija), aporta empuje en rumbos cenidos. Tiene su propia escota: la escota del foque.',
                  fr: 'Voile triangulaire a l avant du mat. Accelere l air devant la grand-voile (effet de fente), ajoute de la puissance au pres. Il a sa propre ecoute: l ecoute de foc.',
                  de: 'Dreieckiges Segel vor dem Mast. Beschleunigt die Luft vor dem Gross (Duseneffekt), gibt zusaetzlichen Vortrieb auf Amwindkursen. Hat seine eigene Schot - die Fockschot.',
                  it: 'Vela triangolare a prua dell albero. Accelera l aria davanti alla randa (effetto fessura), aggiunge spinta nelle andature strette. Ha la sua scotta: la scotta del fiocco.',
                },
              )}
            </Text>
          </View>

          <View
            style={[
              styles.subCard,
              { backgroundColor: 'rgba(255, 170, 0, 0.05)', borderColor: 'rgba(255, 170, 0, 0.15)' },
            ]}
          >
            <Text variant="caption" style={[styles.subCardTitle, { color: colors.warning }]}>
              {tp('Эффект щели / Slot effect', 'Slot effect', 'Efekt szczeliny / Slot effect', {
                es: 'Efecto rendija / Slot effect',
                fr: 'Effet de fente / Slot effect',
                de: 'Duseneffekt / Slot effect',
                it: 'Effetto fessura / Slot effect',
              })}
            </Text>
            <Text variant="muted" style={styles.subCardBody}>
              {tp(
                'Когда стаксель и грот работают вместе, между ними образуется суживающаяся щель. Воздух в ней ускоряется и создает разрежение на подветренной стороне грота - парус тянет лучше, чем если бы стоял один. Именно поэтому на бейдевинде лодка со стакселем идет заметно быстрее.',
                'When jib and main work together, a narrowing slot forms between them. Air speeds up in it and creates low pressure on the leeward side of the main - the sail pulls harder than it would alone. That is why a boat with a jib sails noticeably faster close-hauled.',
                'Gdy fok i grot pracuja razem, miedzy nimi powstaje zwezajaca sie szczelina. Powietrze w niej przyspiesza i tworzy podcisnienie po zawietrznej stronie grota - zagiel ciagnie lepiej niz samodzielnie. Dlatego na bajdewindzie jacht z fokiem plynie zauwazalnie szybciej.',
                {
                  es: 'Cuando el foque y la mayor trabajan juntos, entre ellos se forma una rendija que se estrecha. El aire se acelera y crea baja presion en la cara de sotavento de la mayor: la vela tira mas que si estuviera sola. Por eso un barco con foque navega notablemente mas rapido en cenida.',
                  fr: 'Quand le foc et la grand-voile travaillent ensemble, une fente qui se resserre se forme entre eux. L air y accelere et cree une depression sur la face sous le vent de la grand-voile: la voile tire plus que seule. C est pourquoi un bateau avec foc avance nettement plus vite au pres.',
                  de: 'Wenn Fock und Gross zusammenarbeiten, bildet sich zwischen ihnen ein sich verengender Spalt. Die Luft beschleunigt darin und erzeugt Unterdruck auf der Leeseite des Gross - das Segel zieht staerker als allein. Darum segelt ein Boot mit Fock am Wind deutlich schneller.',
                  it: 'Quando fiocco e randa lavorano insieme, tra loro si forma una fessura che si restringe. L aria accelera e crea bassa pressione sul lato sottovento della randa: la vela tira di piu che da sola. Per questo una barca col fiocco va molto piu veloce di bolina.',
                },
              )}
            </Text>
          </View>

          <View style={[styles.theoryHeadRow, styles.theorySubheadRow]}>
            <Text variant="caption" style={styles.theorySubhead}>
              {tp('А что еще бывает?', 'What else is there?', 'A co jeszcze?', {
                es: 'Que mas hay?',
                fr: 'Quoi d autre?',
                de: 'Was gibt es noch?',
                it: 'Cos altro c e?',
              })}
            </Text>
            {lang !== 'en' ? (
              <Text variant="muted" style={styles.theoryAnchor}>
                What else is there?
              </Text>
            ) : null}
          </View>

          <Text variant="muted" style={styles.extraPara}>
            <Text variant="caption" style={styles.extraName}>
              {tp('Генуя (genoa) ', 'Genoa ', 'Genua ', {
                es: 'Genova (genoa) ',
                fr: 'Genois (genoa) ',
                de: 'Genua (genoa) ',
                it: 'Genoa ',
              })}
            </Text>
            {tp(
              '- большой стаксель, чей задний край заходит за мачту. Дает заметно больше тяги на бейдевинде и галфвинде, но сложнее в работе при поворотах.',
              '- a large jib whose trailing edge overlaps the mast. Gives noticeably more drive on close-hauled and beam reach, but is harder to handle through tacks.',
              '- duzy fok, ktorego tylna krawedz wchodzi za maszt. Daje wyraznie wiecej ciagu na bajdewindzie i polwiatrze, ale trudniejszy w obsludze przy zwrotach.',
              {
                es: '- un foque grande cuya baluma solapa el mastil. Da bastante mas empuje en cenida y en travesia, pero es mas dificil de manejar en las viradas.',
                fr: '- un grand foc dont la chute depasse le mat. Donne nettement plus de puissance au pres et au travers, mais plus difficile a gerer dans les virements.',
                de: '- eine grosse Fock, deren Achterliek den Mast ueberlappt. Gibt deutlich mehr Vortrieb am Wind und auf Halbwind, ist aber bei Wenden schwerer zu handhaben.',
                it: '- un fiocco grande la cui balumina supera l albero. Da molta piu spinta di bolina e al traverso, ma e piu difficile da gestire nelle virate.',
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
              '- asymetryczny lekki zagiel na kursy pelne (baksztag, fordewind). Stawia sie zamiast foka, napelnia sie jak balon. Prostszy niz spinaker, nie wymaga bomu spinakerowego.',
              {
                es: '- vela ligera asimetrica para rumbos portantes (largo, popa). Se iza en lugar del foque, se infla como un globo. Mas simple que el spinnaker, no necesita tangon.',
                fr: '- voile legere asymetrique pour les allures portantes (grand largue, vent arriere). Se hisse a la place du foc, se gonfle comme un ballon. Plus simple que le spi, sans tangon.',
                de: '- asymmetrisches Leichtwindsegel fuer Raumschotskurse (Raumwind, Vorwind). Statt der Fock gesetzt, blaeht sich wie ein Ballon. Einfacher als ein Spinnaker, kein Spinnakerbaum noetig.',
                it: '- vela leggera asimmetrica per andature portanti (lasco, poppa). Si issa al posto del fiocco, si gonfia come un pallone. Piu semplice dello spinnaker, niente tangone.',
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
            {tp(
              '- симметричный пузатый парус только для чистого фордевинда. Требует отдельного гика и навыка. На круизерах встречается редко.',
              '- symmetric balloon sail only for a dead run. Needs a dedicated spinnaker pole and practice. Rare on cruisers.',
              '- symetryczny baniasty zagiel tylko na czysty fordewind. Wymaga oddzielnego bomu spinakerowego i umiejetnosci. Rzadko spotykany na jachtach turystycznych.',
              {
                es: '- vela simetrica abombada solo para la popa cerrada. Necesita tangon propio y practica. Poco comun en barcos de crucero.',
                fr: '- voile symetrique ventrue uniquement pour le plein vent arriere. Necessite un tangon dedie et de l entrainement. Rare sur les voiliers de croisiere.',
                de: '- symmetrisches bauchiges Segel nur fuer den reinen Vorwindkurs. Braucht einen eigenen Spinnakerbaum und Uebung. Auf Fahrtenyachten selten.',
                it: '- vela simmetrica panciuta solo per la poppa piena. Richiede un tangone dedicato e pratica. Rara sulle barche da crociera.',
              },
            )}
          </Text>

          <Text variant="muted" style={[styles.extraPara, styles.extraNote]}>
            {tp(
              'В симуляторе показаны только грот + стаксель - базовая конфигурация слупа. Остальные паруса - для продвинутых гонок.',
              'The simulator shows only main + jib - the basic sloop configuration. The other sails belong to advanced racing.',
              'W symulatorze pokazano tylko grot + fok - podstawowa konfiguracja slupa. Pozostale zagle to juz zaawansowane regaty.',
              {
                es: 'El simulador muestra solo mayor + foque, la configuracion basica del sloop. Las demas velas son para regatas avanzadas.',
                fr: 'Le simulateur ne montre que grand-voile + foc, la configuration de base du sloop. Les autres voiles relevent de la regate avancee.',
                de: 'Der Simulator zeigt nur Gross + Fock - die Grundkonfiguration des Slups. Die anderen Segel gehoeren zum fortgeschrittenen Regattasegeln.',
                it: 'Il simulatore mostra solo randa + fiocco, la configurazione base dello sloop. Le altre vele sono per le regate avanzate.',
              },
            )}
          </Text>
        </Card>
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
    borderTopColor: 'rgba(0, 212, 255, 0.10)',
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
});
