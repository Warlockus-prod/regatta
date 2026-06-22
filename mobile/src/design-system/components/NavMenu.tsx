import { useRouter, usePathname } from 'expo-router';
import { useState, useCallback } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useI18n } from '../../i18n/context';
import { ENABLED_LANGUAGES } from '../../i18n/languages';
import { colors, radii, spacing } from '../tokens';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';
import { Wordmark } from './Wordmark';

/**
 * Top-right navigation menu - the mobile mirror of the website's nav
 * (src/components/Navigation.tsx). Same items, same grouping (primary row +
 * Learn / On board / More), so the app and the site feel structurally
 * identical. Language stays in Settings (the site keeps it in the top bar; the
 * app already exposes it under Settings -> Language), so the only header
 * affordance here is the menu button.
 *
 * Mount via the Stack's `headerRight` so every screen carries it; the home
 * screen (custom header, headerShown:false) renders <NavMenuButton /> itself.
 */

type Lang = 'ru' | 'en' | 'pl' | 'es' | 'fr' | 'de' | 'it';

interface NavItem {
  href: string;
  icon: IconName;
  ru: string;
  en: string;
  pl: string;
  es: string;
  fr: string;
  de: string;
  it: string;
}

interface NavGroup {
  ru: string;
  en: string;
  pl: string;
  es: string;
  fr: string;
  de: string;
  it: string;
  items: NavItem[];
}

function pick(o: Record<Lang, string>, lang: string): string {
  return o[(lang as Lang)] ?? o.en;
}

// Primary row - mirrors the website's top-level nav. /start on the web is the
// bootcamp landing, so it maps to the app's /bootcamp.
const PRIMARY: NavItem[] = [
  { href: '/', icon: 'home', ru: 'Главная', en: 'Home', pl: 'Glowna', es: 'Inicio', fr: 'Accueil', de: 'Start', it: 'Home' },
  { href: '/bootcamp', icon: 'cap', ru: 'Старт', en: 'Start', pl: 'Start', es: 'Empezar', fr: 'Demarrer', de: 'Los', it: 'Inizia' },
  { href: '/courses', icon: 'compass', ru: 'Курсы к ветру', en: 'Points of sail', pl: 'Kursy wiatru', es: 'Rumbos', fr: 'Allures', de: 'Windkurse', it: 'Andature' },
  { href: '/simulator', icon: 'simulator', ru: 'Симулятор', en: 'Simulator', pl: 'Symulator', es: 'Simulador', fr: 'Simulateur', de: 'Simulator', it: 'Simulatore' },
  { href: '/game', icon: 'flag', ru: 'Гонка', en: 'Race', pl: 'Regata', es: 'Regata', fr: 'Course', de: 'Rennen', it: 'Regata' },
];

// Grouped items - mirrors the website's "Learn / On board / More" groups, with
// the app-only screens folded into the matching group so nothing is unreachable.
const GROUPS: NavGroup[] = [
  {
    ru: 'Обучение', en: 'Learn', pl: 'Nauka', es: 'Aprender', fr: 'Apprendre', de: 'Lernen', it: 'Imparare',
    items: [
      { href: '/rules', icon: 'book', ru: 'Правила', en: 'Rules', pl: 'Przepisy', es: 'Reglas', fr: 'Regles', de: 'Regeln', it: 'Regole' },
      { href: '/racing', icon: 'tactics', ru: 'Тактика', en: 'Tactics', pl: 'Taktyka', es: 'Tactica', fr: 'Tactique', de: 'Taktik', it: 'Tattica' },
      { href: '/quick', icon: 'bolt', ru: 'Быстрый разогрев', en: 'Quick refresh', pl: 'Szybkie powtorzenie', es: 'Repaso rapido', fr: 'Revision rapide', de: 'Schnelle Auffrischung', it: 'Ripasso rapido' },
      { href: '/onboard', icon: 'onboard', ru: 'Первый день', en: 'On boarding', pl: 'Pierwszy dzien', es: 'Primer dia', fr: 'Premier jour', de: 'Erster Tag', it: 'Primo giorno' },
    ],
  },
  {
    ru: 'На борту', en: 'On board', pl: 'Na pokladzie', es: 'A bordo', fr: 'A bord', de: 'An Bord', it: 'A bordo',
    items: [
      { href: '/anatomy', icon: 'parts', ru: 'Устройство яхты', en: 'Yacht anatomy', pl: 'Budowa jachtu', es: 'Anatomia del velero', fr: 'Anatomie du voilier', de: 'Aufbau der Yacht', it: 'Anatomia della barca' },
      { href: '/checklist', icon: 'check', ru: 'Чек-лист', en: 'Checklist', pl: 'Lista kontrolna', es: 'Checklist', fr: 'Checklist', de: 'Checkliste', it: 'Checklist' },
      { href: '/spots', icon: 'wind', ru: 'Споты и погода', en: 'Spots and weather', pl: 'Spoty i pogoda', es: 'Spots y clima', fr: 'Spots et meteo', de: 'Spots und Wetter', it: 'Spot e meteo' },
    ],
  },
  {
    ru: 'Ещё', en: 'More', pl: 'Wiecej', es: 'Mas', fr: 'Plus', de: 'Mehr', it: 'Altro',
    items: [
      { href: '/multiplayer', icon: 'multiplayer', ru: 'Мультиплеер', en: 'Multiplayer', pl: 'Multiplayer', es: 'Multijugador', fr: 'Multijoueur', de: 'Mehrspieler', it: 'Multigiocatore' },
      { href: '/glossary', icon: 'glossary', ru: 'Глоссарий', en: 'Glossary', pl: 'Glosariusz', es: 'Glosario', fr: 'Glossaire', de: 'Glossar', it: 'Glossario' },
      { href: '/gallery', icon: 'gallery', ru: 'Галерея', en: 'Gallery', pl: 'Galeria', es: 'Galeria', fr: 'Galerie', de: 'Galerie', it: 'Galleria' },
      { href: '/leaderboard', icon: 'leaderboard', ru: 'Лидерборд', en: 'Leaderboard', pl: 'Ranking', es: 'Clasificacion', fr: 'Classement', de: 'Bestenliste', it: 'Classifica' },
      { href: '/history', icon: 'flag', ru: 'История гонок', en: 'Race history', pl: 'Historia wyscigow', es: 'Historial', fr: 'Historique', de: 'Verlauf', it: 'Cronologia' },
    ],
  },
];

const SETTINGS: NavItem = { href: '/settings', icon: 'gear', ru: 'Настройки', en: 'Settings', pl: 'Ustawienia', es: 'Ajustes', fr: 'Reglages', de: 'Einstellungen', it: 'Impostazioni' };

export function NavMenuButton() {
  const { lang, tp, setLang } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);

  const close = useCallback(() => {
    setOpen(false);
    setLangOpen(false);
  }, []);
  const currentLangName = ENABLED_LANGUAGES.find((l) => l.id === lang)?.nativeName ?? 'English';
  const go = useCallback(
    (href: string) => {
      setOpen(false);
      if (pathname !== href) router.push(href as never);
    },
    [pathname, router],
  );

  const menuLabel = tp('Меню', 'Menu', 'Menu', { es: 'Menu', fr: 'Menu', de: 'Menue', it: 'Menu' });
  const closeLabel = tp('Закрыть', 'Close', 'Zamknij', { es: 'Cerrar', fr: 'Fermer', de: 'Schliessen', it: 'Chiudi' });
  const languagesLabel = tp('Язык', 'Language', 'Jezyk', { es: 'Idioma', fr: 'Langue', de: 'Sprache', it: 'Lingua' });

  const renderItem = (item: NavItem) => {
    const active = pathname === item.href;
    return (
      <Pressable
        key={item.href}
        onPress={() => go(item.href)}
        accessibilityRole="button"
        accessibilityState={{ selected: active }}
        accessibilityLabel={pick(item, lang)}
        style={({ pressed }) => [styles.row, active && styles.rowActive, pressed && styles.rowPressed]}
      >
        <Icon name={item.icon} size={22} color={active ? colors.accentCyan : colors.textSecondary} />
        <Text style={[styles.rowLabel, active && styles.rowLabelActive]}>{pick(item, lang)}</Text>
      </Pressable>
    );
  };

  return (
    <>
      <Pressable
        onPress={() => {
          setLangOpen(false);
          setOpen(true);
        }}
        accessibilityRole="button"
        accessibilityLabel={menuLabel}
        hitSlop={10}
        style={({ pressed }) => [styles.trigger, pressed && styles.rowPressed]}
      >
        <Icon name="menu" size={26} color={colors.textPrimary} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={close}>
        <View style={styles.modalRoot}>
          <Pressable
            style={styles.backdrop}
            onPress={close}
            accessibilityRole="button"
            accessibilityLabel={closeLabel}
          />
          <View style={[styles.panel, { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.lg }]}>
            <View style={styles.panelHeader}>
              <Wordmark size="m" />
              <Pressable
                onPress={close}
                accessibilityRole="button"
                accessibilityLabel={closeLabel}
                hitSlop={10}
                style={({ pressed }) => [styles.closeBtn, pressed && styles.rowPressed]}
              >
                <Text style={styles.closeGlyph}>{'×'}</Text>
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
              {PRIMARY.map(renderItem)}

              {GROUPS.map((g) => (
                <View key={g.en} style={styles.group}>
                  <Text variant="caption" style={styles.groupLabel}>
                    {pick(g, lang).toUpperCase()}
                  </Text>
                  {g.items.map(renderItem)}
                </View>
              ))}

              <View style={styles.divider} />

              {/* Language - a collapsible row (like the website's dropdown),
                  not the full list inline. */}
              <Pressable
                onPress={() => setLangOpen((v) => !v)}
                accessibilityRole="button"
                accessibilityState={{ expanded: langOpen }}
                accessibilityLabel={`${languagesLabel}: ${currentLangName}`}
                style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
              >
                <Icon name="globe" size={22} color={colors.textSecondary} />
                <Text style={styles.rowLabel}>{languagesLabel}</Text>
                <View style={styles.langRight}>
                  <Text style={styles.langCurrent}>{currentLangName}</Text>
                  <Text style={styles.caret}>{langOpen ? '▾' : '▸'}</Text>
                </View>
              </Pressable>
              {langOpen
                ? ENABLED_LANGUAGES.map((l) => {
                    const active = l.id === lang;
                    return (
                      <Pressable
                        key={l.id}
                        onPress={() => {
                          setLang(l.id);
                          close();
                        }}
                        accessibilityRole="button"
                        accessibilityState={{ selected: active }}
                        accessibilityLabel={l.nativeName}
                        style={({ pressed }) => [styles.langRow, active && styles.rowActive, pressed && styles.rowPressed]}
                      >
                        <Text style={[styles.langName, active && styles.rowLabelActive]}>{l.nativeName}</Text>
                        {active ? <Icon name="check" size={18} color={colors.accentCyan} /> : null}
                      </Pressable>
                    );
                  })
                : null}

              <View style={styles.divider} />
              {renderItem(SETTINGS)}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.xs,
  },
  modalRoot: {
    flex: 1,
    flexDirection: 'row',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(4, 12, 24, 0.6)',
  },
  panel: {
    width: '86%',
    maxWidth: 380,
    backgroundColor: colors.bgSecondary,
    borderLeftWidth: 1,
    borderLeftColor: colors.borderCyanSoft,
    paddingHorizontal: spacing.md,
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.md,
  },
  closeBtn: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeGlyph: {
    color: colors.textSecondary,
    fontSize: 26,
    lineHeight: 28,
  },
  scroll: {
    paddingBottom: spacing.lg,
  },
  group: {
    marginTop: spacing.md,
  },
  groupLabel: {
    color: colors.textMuted,
    letterSpacing: 1.2,
    fontWeight: '700',
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 48,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.md,
  },
  rowActive: {
    backgroundColor: colors.surfaceCyanSoft,
  },
  rowPressed: {
    opacity: 0.7,
  },
  rowLabel: {
    color: colors.textSecondary,
    fontSize: 16,
    flex: 1,
  },
  rowLabelActive: {
    color: colors.accentCyan,
    fontWeight: '600',
  },
  langRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  langCurrent: {
    color: colors.textMuted,
    fontSize: 14,
  },
  caret: {
    color: colors.textMuted,
    fontSize: 14,
    width: 14,
    textAlign: 'center',
  },
  langRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
    paddingHorizontal: spacing.sm,
    marginLeft: spacing.xl,
    borderRadius: radii.md,
  },
  langName: {
    color: colors.textSecondary,
    fontSize: 15,
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderCyanFaint,
    marginVertical: spacing.md,
    marginHorizontal: spacing.sm,
  },
});
