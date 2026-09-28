import { Stack, useRouter } from 'expo-router';
import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useI18n } from '../../src/i18n/context';
import { Card, Screen, Text } from '../../src/design-system/components';
import { ruleScenarios } from '../../src/data';
import { legacyPick } from '../../src/i18n/languages';
import { colors, radii, spacing } from '../../src/design-system/tokens';

/**
 * Rules of the road. Mirrors the web /rules page: the scenarios are split
 * into two standards instead of one mixed list -
 *   RRS    (World Sailing racing rules, only between racers on the course)
 *   COLREGS (collision-prevention rules, apply ALWAYS to every vessel)
 * each with a short explainer, and the COLREGS block links out to the
 * official source text. Tap a card to open `/rules/[id]` (reveal Q/A).
 */

type Scenario = (typeof ruleScenarios)[number];

export default function Rules() {
  const { tp, lang } = useI18n();
  const router = useRouter();

  const headerTitle = tp('Правила', 'Rules of the road', 'Przepisy', {
    es: 'Reglas',
    fr: 'Règles',
    de: 'Regeln',
    it: 'Regole',
  });

  const intro = tp(
    'Две системы правил: RRS (гоночные правила World Sailing, действуют только между гонщиками на дистанции) и МППСС-72 (международные правила предупреждения столкновений, действуют ВСЕГДА для каждого судна). Знать надо обе.',
    'Two rule systems: RRS (World Sailing racing rules, apply only between racing boats on the course) and COLREGS / IRPCS (International Regulations for Preventing Collisions at Sea, apply ALWAYS to every vessel). Both are essential.',
    'Dwa systemy przepisów: RRS (przepisy regatowe World Sailing, obowiązują tylko między jachtami ścigającymi się na trasie) i MPZZM / COLREG (międzynarodowe przepisy o zapobieganiu zderzeniom na morzu, obowiązują ZAWSZE każdą jednostkę). Trzeba znać oba.',
    {
      es: 'Dos sistemas de reglas: RRS (reglas de regata de World Sailing, solo se aplican entre barcos que compiten en el recorrido) y RIPA / COLREG (Reglamento Internacional para Prevenir los Abordajes, se aplica SIEMPRE a toda embarcación). Hay que conocer los dos.',
      fr: "Deux systèmes de règles : RRS (règles de course de World Sailing, qui ne s'appliquent qu'entre bateaux en course sur le parcours) et RIPAM / COLREG (Règlement international pour prévenir les abordages en mer, qui s'applique TOUJOURS à tout navire). Il faut connaître les deux.",
      de: 'Zwei Regelwerke: RRS (Wettfahrtregeln von World Sailing, gelten nur zwischen Booten, die auf der Bahn Regatta segeln) und KVR / COLREG (Internationale Regeln zur Verhütung von Zusammenstößen auf See, gelten IMMER für jedes Fahrzeug). Du musst beide kennen.',
      it: 'Due sistemi di regole: RRS (regole di regata di World Sailing, valgono solo tra le barche in regata sul percorso) e COLREG (Regolamento internazionale per prevenire gli abbordi in mare, valgono SEMPRE per ogni imbarcazione). Bisogna conoscerli entrambi.',
    },
  );

  const rrsTitle = tp(
    'Гоночные правила (World Sailing)',
    'Racing Rules of Sailing (World Sailing)',
    'Przepisy Regatowe Żeglarstwa (World Sailing)',
    {
      es: 'Reglamento de Regatas a Vela (World Sailing)',
      fr: 'Règles de course à la voile (World Sailing)',
      de: 'Wettfahrtregeln Segeln (World Sailing)',
      it: 'Regole di regata della vela (World Sailing)',
    },
  );
  const colregsTitle = tp(
    'Международные правила предупреждения столкновений',
    'International Regulations for Preventing Collisions at Sea',
    'Międzynarodowe przepisy o zapobieganiu zderzeniom na morzu',
    {
      es: 'Reglamento Internacional para Prevenir los Abordajes',
      fr: 'Règlement international pour prévenir les abordages en mer',
      de: 'Internationale Regeln zur Verhütung von Zusammenstößen auf See',
      it: 'Regolamento internazionale per prevenire gli abbordi in mare',
    },
  );
  const colregsIntro = tp(
    'RRS действуют только во время гонки между гонщиками. В остальных случаях (выход из порта, прогулка, встреча с моторным судном) работают МППСС-72. Их обязан знать любой у штурвала.',
    'RRS applies only during a race between racing boats. Everywhere else (leaving harbour, cruising, meeting a power vessel), COLREGS / IRPCS applies. Every helmsman must know them.',
    'RRS obowiązują tylko podczas wyścigu, między jachtami, które się ścigają. W innych sytuacjach (wyjście z portu, rejs, spotkanie z jednostką motorową) obowiązuje MPZZM. Musi je znać każdy, kto stoi za sterem.',
    {
      es: 'Las RRS solo se aplican durante una regata, entre barcos que compiten. En todos los demás casos (salir de puerto, navegar de paseo, cruzarse con un barco a motor) rige el RIPA. Todo timonel debe conocerlo.',
      fr: "Les RRS ne s'appliquent que pendant une course, entre bateaux qui courent. Partout ailleurs (sortie de port, balade, rencontre avec un navire à moteur), c'est le RIPAM qui s'applique. Tout barreur doit le connaître.",
      de: 'Die RRS gelten nur während einer Wettfahrt zwischen Booten, die Regatta segeln. Überall sonst (Hafenausfahrt, Törn, Begegnung mit einem Motorboot) gelten die KVR. Jeder am Ruder muss sie kennen.',
      it: 'Le RRS valgono solo durante una regata, tra le barche che competono. In tutti gli altri casi (uscita dal porto, crociera, incontro con un mezzo a motore) valgono le COLREG. Ogni timoniere deve conoscerle.',
    },
  );
  const officialText = tp(
    'Официальный текст МППСС-72: принят Международной морской организацией (IMO) в 1972, действует во всех странах-подписантах. Обновлялись несколько раз, текущая редакция включает поправки 2007.',
    'Official COLREGS text: adopted by the International Maritime Organization (IMO) in 1972, binding in all signatory countries. Amended several times, current edition includes 2007 revisions.',
    'Oficjalny tekst MPZZM (COLREG): przepisy przyjęte przez Międzynarodową Organizację Morską (IMO) w 1972 r. obowiązują we wszystkich państwach-sygnatariuszach. Były kilkakrotnie nowelizowane, obecna wersja zawiera poprawki z 2007 r.',
    {
      es: 'Texto oficial del RIPA: adoptado por la Organización Marítima Internacional (OMI) en 1972, vinculante en todos los países signatarios. Enmendado varias veces, la edición actual incluye las enmiendas de 2007.',
      fr: "Texte officiel du RIPAM : adopté par l'Organisation maritime internationale (OMI) en 1972, il s'applique dans tous les pays signataires. Il a été modifié plusieurs fois ; la version actuelle inclut les amendements de 2007.",
      de: 'Offizieller KVR-Text: 1972 von der Internationalen Seeschifffahrts-Organisation (IMO) angenommen, verbindlich in allen Unterzeichnerstaaten. Mehrfach geändert, die aktuelle Fassung enthält die Änderungen von 2007.',
      it: "Testo ufficiale delle COLREG: adottate dall'Organizzazione marittima internazionale (IMO) nel 1972, vincolanti in tutti i paesi firmatari. Emendate più volte, l'edizione attuale include le modifiche del 2007.",
    },
  );

  const rrs = ruleScenarios.filter((r) => r.source !== 'colregs');
  const colregs = ruleScenarios.filter((r) => r.source === 'colregs');

  // Shared targets reused across language link sets.
  const IMO_URL = 'https://www.imo.org/en/OurWork/Safety/Pages/Preventing-Collisions.aspx';
  const WORLD_SAILING_URL = 'https://www.sailing.org/racingrules/';
  const RRS_PDF_URL = 'https://www.asiansailing.org/wp-content/uploads/2024/07/RRS-2025-2028-Final.pdf';

  type LinkRow = { label: string; url: string };

  // COLREGS official sources: national/local source first, IMO original second.
  // Mirrors the web /rules COLREGS links block, all 7 languages.
  const colregsLinks: LinkRow[] = (() => {
    const imo: LinkRow = {
      label: tp('IMO оригинал (англ.)', 'IMO official text', 'Tekst oryginalny IMO (ang.)', {
        es: 'Texto original de la OMI (ingl.)',
        fr: "Texte original de l'OMI (angl.)",
        de: 'IMO-Originaltext (engl.)',
        it: 'Testo originale IMO (ingl.)',
      }),
      url: IMO_URL,
    };
    switch (lang) {
      case 'ru':
        return [{ label: 'МППСС-72 PDF (рус.)', url: 'https://fps30.ru/images/biblioteka/MPPSS-72.pdf' }, imo];
      case 'en':
        return [imo, { label: 'US Navigation Rules PDF', url: 'https://www.navcen.uscg.gov/sites/default/files/pdf/navRules/navrules.pdf' }];
      case 'pl':
        return [{ label: 'Polski Związek Żeglarski', url: 'https://pya.org.pl/polski-zwiazek-zeglarski/page/przepisy-zeglarskie/' }, imo];
      case 'es':
        return [{ label: 'Real Federación Española de Vela', url: 'https://rfev.es/' }, imo];
      case 'fr':
        return [{ label: 'Fédération Française de Voile', url: 'https://www.ffvoile.fr/' }, imo];
      case 'de':
        return [{ label: 'Deutscher Segler-Verband', url: 'https://www.dsv.org/' }, imo];
      case 'it':
        return [{ label: 'Federazione Italiana Vela', url: 'https://www.federvela.it/' }, imo];
      default:
        return [imo];
    }
  })();

  const rrsOfficialText = tp(
    'Официальный текст RRS: Racing Rules of Sailing 2025-2028, выпускается World Sailing, действует с 1 января 2025 до 31 декабря 2028. То, что выше - упрощённая версия для входа в тему.',
    'Official RRS text: Racing Rules of Sailing 2025-2028, published by World Sailing, in force from 1 January 2025 to 31 December 2028. The scenarios above are a simplified intro to the topic.',
    'Oficjalny tekst RRS: Racing Rules of Sailing 2025-2028, wydawane przez World Sailing, obowiązują od 1 stycznia 2025 do 31 grudnia 2028 r. Scenariusze powyżej to uproszczony wstęp do tematu.',
    {
      es: 'Texto oficial de las RRS: Racing Rules of Sailing 2025-2028, publicadas por World Sailing, en vigor del 1 de enero de 2025 al 31 de diciembre de 2028. Los escenarios anteriores son una introducción simplificada al tema.',
      fr: 'Texte officiel des RRS : Racing Rules of Sailing 2025-2028, publiées par World Sailing, en vigueur du 1er janvier 2025 au 31 décembre 2028. Les scénarios ci-dessus sont une introduction simplifiée au sujet.',
      de: 'Offizieller RRS-Text: Racing Rules of Sailing 2025-2028, herausgegeben von World Sailing, in Kraft vom 1. Januar 2025 bis 31. Dezember 2028. Die Szenarien oben sind eine vereinfachte Einführung ins Thema.',
      it: "Testo ufficiale delle RRS: Racing Rules of Sailing 2025-2028, pubblicate da World Sailing, in vigore dal 1° gennaio 2025 al 31 dicembre 2028. Gli scenari qui sopra sono un'introduzione semplificata al tema.",
    },
  );

  // RRS official sources: World Sailing, national federation, RRS 2025-2028 PDF.
  // Mirrors the web /rules RRS links block, all 7 languages.
  const rrsLinks: LinkRow[] = (() => {
    const worldSailing: LinkRow = {
      label: tp('World Sailing (офиц.)', 'World Sailing (official)', 'World Sailing (oficjalne)', {
        es: 'World Sailing (oficial)',
        fr: 'World Sailing (officiel)',
        de: 'World Sailing (offiziell)',
        it: 'World Sailing (ufficiale)',
      }),
      url: WORLD_SAILING_URL,
    };
    const rrsPdf: LinkRow = {
      label: tp('RRS 2025-2028 PDF', 'RRS 2025-2028 PDF', 'RRS 2025-2028 PDF (ang.)', {
        es: 'RRS 2025-2028 PDF (ingl.)',
        fr: 'RRS 2025-2028 PDF (angl.)',
        de: 'RRS 2025-2028 PDF (engl.)',
        it: 'RRS 2025-2028 PDF (ingl.)',
      }),
      url: RRS_PDF_URL,
    };
    switch (lang) {
      case 'ru':
        return [worldSailing, { label: "VFPS (RU)", url: 'https://vfps.ru/' }, rrsPdf];
      case 'en':
        return [worldSailing, { label: 'US Sailing + prescr.', url: 'https://www.ussailing.org/competition/rules-officiating/the-racing-rules-of-sailing-2025-2028/' }, rrsPdf];
      case 'pl':
        return [worldSailing, { label: 'PZZ / PYA (pol.)', url: 'https://pya.org.pl/polski-zwiazek-zeglarski/page/przepisy-zeglarskie/' }, rrsPdf];
      case 'es':
        return [worldSailing, { label: 'RFEV (esp.)', url: 'https://rfev.es/' }, rrsPdf];
      case 'fr':
        return [worldSailing, { label: 'FFVoile (fr.)', url: 'https://www.ffvoile.fr/' }, rrsPdf];
      case 'de':
        return [worldSailing, { label: 'DSV (dt.)', url: 'https://www.dsv.org/' }, rrsPdf];
      case 'it':
        return [worldSailing, { label: 'Federvela (it.)', url: 'https://www.federvela.it/' }, rrsPdf];
      default:
        return [worldSailing, rrsPdf];
    }
  })();

  const linksNote = tp(
    'Если один из сайтов не открывается - попробуй следующий. Официальный текст одинаковый.',
    'If one of the sites is down - try the next one. The official text is identical.',
    'Jeśli któraś strona się nie otwiera, spróbuj następnej. Oficjalny tekst jest wszędzie ten sam.',
    {
      es: 'Si uno de los sitios no abre, prueba el siguiente. El texto oficial es el mismo.',
      fr: "Si l'un des sites ne s'ouvre pas, essaie le suivant. Le texte officiel est identique.",
      de: 'Wenn eine der Seiten nicht lädt, probier die nächste. Der offizielle Text ist derselbe.',
      it: 'Se uno dei siti non si apre, prova il successivo. Il testo ufficiale è identico.',
    },
  );

  const openLink = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch {
      /* no-op: external link failures are non-critical here */
    }
  };

  const renderCard = (scenario: Scenario) => {
    const title = legacyPick(scenario, 'title', lang);
    const scene = legacyPick(scenario, 'scene', lang);
    return (
      <Card
        key={scenario.id}
        onPress={() => router.push(`/rules/${scenario.id}`)}
        accessibilityRole="button"
        accessibilityLabel={`${title}. ${scene}`}
        style={styles.card}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.icon}>{scenario.icon}</Text>
          <View style={styles.cardText}>
            <Text variant="subtitle">{title}</Text>
            <Text variant="caption" style={styles.scene} numberOfLines={2}>{scene}</Text>
          </View>
        </View>
      </Card>
    );
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: headerTitle }} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.intro}>
          <Text variant="body" style={styles.introText}>{intro}</Text>
        </View>

        {/* Kursy (patenty) - Polish licence courses embedded from the web */}
        <View style={styles.sectionHeader}>
          <View style={[styles.badge, styles.badgeColregs]}>
            <Text style={[styles.badgeText, { color: colors.accentCyan }]}>🎓 KURSY</Text>
          </View>
          <Text variant="subtitle" style={styles.sectionTitle}>
            {tp('Курсы (патенты PL)', 'Courses (PL licences)', 'Kursy (polskie patenty)', {
              es: 'Cursos (títulos polacos)', fr: 'Cours (permis polonais)', de: 'Kurse (polnische Scheine)', it: 'Corsi (patenti polacche)',
            })}
          </Text>
        </View>
        <Card
          onPress={() => router.push('/kursy/motorowodny')}
          accessibilityRole="button"
          accessibilityLabel="Sternik motorowodny"
          style={styles.card}
        >
          <View style={styles.cardHeader}>
            <Text style={styles.icon}>⚓</Text>
            <View style={styles.cardText}>
              <Text variant="subtitle">Sternik motorowodny</Text>
              <Text variant="caption" style={styles.scene} numberOfLines={2}>
                {tp(
                  'Теория, тренажёр вопросов и пробный экзамен - на польском.',
                  'Theory, question trainer and mock exam - in Polish.',
                  'Teoria, trening pytań i egzamin próbny - po polsku.',
                  { es: "Teoría, práctica y examen de prueba en polaco.", fr: "Théorie, entraînement et examen blanc en polonais.", de: "Theorie, Fragentraining und Probeprüfung auf Polnisch.", it: "Teoria, esercizi ed esame di prova in polacco." },
                )}
              </Text>
            </View>
          </View>
        </Card>
        <Card
          onPress={() => router.push('/kursy/radio')}
          accessibilityRole="button"
          accessibilityLabel="SRC Radio"
          style={styles.card}
        >
          <View style={styles.cardHeader}>
            <Text style={styles.icon}>📻</Text>
            <View style={styles.cardText}>
              <Text variant="subtitle">SRC Radio</Text>
              <Text variant="caption" style={styles.scene} numberOfLines={2}>
                {tp(
                  'Свидетельство SRC, симулятор ICOM с голосом, 26 заданий UKE - на польском.',
                  'SRC certificate, ICOM voice simulator, 26 UKE tasks - in Polish.',
                   'Świadectwo SRC, symulator ICOM z głosem, 26 zadań UKE - po polsku.',
                  { es: "Certificado SRC, simulador ICOM con voz y 26 tareas UKE en polaco.", fr: "Certificat SRC, simulateur vocal ICOM et 26 exercices UKE en polonais.", de: 'SRC-Funkzeugnis, ICOM-Sprachsimulator und 26 UKE-Aufgaben auf Polnisch.', it: "Certificato SRC, simulatore vocale ICOM e 26 esercizi UKE in polacco." },
                )}
              </Text>
            </View>
          </View>
        </Card>

        {/* RRS section */}
        <View style={styles.sectionHeader}>
          <View style={[styles.badge, styles.badgeRrs]}>
            <Text style={[styles.badgeText, { color: colors.warning }]}>🏁 RRS</Text>
          </View>
          <Text variant="subtitle" style={styles.sectionTitle}>{rrsTitle}</Text>
        </View>
        {rrs.map(renderCard)}

        {/* COLREGS section */}
        <View style={[styles.sectionHeader, styles.sectionHeaderGap]}>
          <View style={[styles.badge, styles.badgeColregs]}>
            <Text style={[styles.badgeText, { color: colors.accentCyan }]}>🌊 COLREGS</Text>
          </View>
          <Text variant="subtitle" style={styles.sectionTitle}>{colregsTitle}</Text>
        </View>
        <Text variant="caption" style={styles.colregsIntro}>{colregsIntro}</Text>
        {colregs.map(renderCard)}

        {/* COLREGS official source links */}
        <Card style={styles.linksCard} accent="cyan">
          <Text variant="caption" style={styles.officialText}>{officialText}</Text>
          {colregsLinks.map((l) => (
            <Pressable
              key={l.url}
              onPress={() => { void openLink(l.url); }}
              accessibilityRole="link"
              accessibilityLabel={l.label}
              style={({ pressed }) => [styles.linkRow, pressed && styles.linkRowPressed]}
            >
              <Text style={styles.linkText}>{l.label}  ↗</Text>
            </Pressable>
          ))}
        </Card>

        {/* RRS official source links */}
        <Card style={styles.linksCard} accent="warning">
          <Text variant="caption" style={styles.officialText}>{rrsOfficialText}</Text>
          {rrsLinks.map((l) => (
            <Pressable
              key={l.url}
              onPress={() => { void openLink(l.url); }}
              accessibilityRole="link"
              accessibilityLabel={l.label}
              style={({ pressed }) => [styles.linkRowAmber, pressed && styles.linkRowAmberPressed]}
            >
              <Text style={styles.linkTextAmber}>{l.label}  ↗</Text>
            </Pressable>
          ))}
          <Text variant="caption" style={styles.linksNote}>{linksNote}</Text>
        </Card>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: spacing.xxl,
  },
  intro: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  introText: {
    lineHeight: 21,
    color: colors.textSecondary,
  },
  sectionHeader: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
  sectionHeaderGap: {
    marginTop: spacing.xl,
  },
  badge: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
  },
  badgeRrs: {
    backgroundColor: 'rgba(138, 97, 0, 0.12)',
    borderColor: 'rgba(138, 97, 0, 0.30)',
  },
  badgeColregs: {
    backgroundColor: 'rgba(0, 110, 166, 0.12)',
    borderColor: 'rgba(0, 110, 166, 0.30)',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  sectionTitle: {
    fontWeight: '700',
  },
  colregsIntro: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
    lineHeight: 19,
    color: colors.textSecondary,
  },
  card: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  icon: {
    fontSize: 28,
    marginRight: spacing.md,
    marginTop: 2,
  },
  cardText: {
    flex: 1,
  },
  scene: {
    marginTop: spacing.xs,
    lineHeight: 18,
    color: colors.textMuted,
  },
  linksCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  officialText: {
    lineHeight: 19,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  linkRow: {
    borderWidth: 1,
    borderColor: colors.borderCyanStrong,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginTop: spacing.sm,
  },
  linkRowPressed: {
    backgroundColor: colors.surfaceCyanFaint,
  },
  linkText: {
    color: colors.accentCyan,
    fontWeight: '600',
    textAlign: 'center',
  },
  linkRowAmber: {
    borderWidth: 1,
    borderColor: 'rgba(138, 97, 0, 0.30)',
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginTop: spacing.sm,
  },
  linkRowAmberPressed: {
    backgroundColor: 'rgba(138, 97, 0, 0.10)',
  },
  linkTextAmber: {
    color: colors.warning,
    fontWeight: '600',
    textAlign: 'center',
  },
  linksNote: {
    marginTop: spacing.md,
    lineHeight: 17,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
