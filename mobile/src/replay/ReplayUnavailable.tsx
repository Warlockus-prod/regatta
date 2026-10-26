import { Stack, useRouter } from "expo-router";
import { ScrollView, StyleSheet } from "react-native";
import { useI18n } from "../i18n/context";
import { EmptyState, Screen } from "../design-system/components";
import { DarkSurface, darkStackOptions } from "../design-system/surface";
import { spacing } from "../design-system/tokens";

export function ReplayUnavailable({ reason }: { reason: "unsupported" | "corrupt" }) {
  const { tl } = useI18n();
  const router = useRouter();
  const title = reason === "unsupported" ? tl({
    ru: "Формат гонки пока не поддерживается", en: "Saved race not supported", pl: "Nieobsługiwany format wyścigu",
    es: "Formato de regata no compatible", fr: "Format de course non pris en charge", de: "Rennformat nicht unterstützt", it: "Formato della regata non supportato",
  }) : tl({
    ru: "Не удалось прочитать гонку", en: "Could not read saved race", pl: "Nie można odczytać zapisanego wyścigu",
    es: "No se ha podido leer la regata guardada", fr: "Impossible de lire la course enregistrée", de: "Gespeichertes Rennen konnte nicht gelesen werden", it: "Impossibile leggere la regata salvata",
  });
  const subtitle = reason === "unsupported" ? tl({
    ru: "Эта версия приложения не поддерживает формат сохранённой гонки. История не изменена.",
    en: "This saved race uses a format this version does not support. Your history has not been changed.",
    pl: "Ta wersja aplikacji nie obsługuje formatu tego zapisanego wyścigu. Historia nie została zmieniona.",
    es: "Esta versión no admite el formato de la regata guardada. Tu historial no se ha modificado.",
    fr: "Cette version ne prend pas en charge le format de cette course enregistrée. Ton historique n'a pas été modifié.",
    de: "Diese Version unterstützt das Format dieses gespeicherten Rennens nicht. Dein Verlauf wurde nicht verändert.",
    it: "Questa versione non supporta il formato della regata salvata. La cronologia non è stata modificata.",
  }) : tl({
    ru: "Данные сохранённой гонки не удалось прочитать. История не изменена.",
    en: "The saved race data could not be read. Your history has not been changed.",
    pl: "Nie udało się odczytać danych zapisanego wyścigu. Historia nie została zmieniona.",
    es: "No se han podido leer los datos de la regata guardada. Tu historial no se ha modificado.",
    fr: "Les données de la course enregistrée n'ont pas pu être lues. Ton historique n'a pas été modifié.",
    de: "Die Daten des gespeicherten Rennens konnten nicht gelesen werden. Dein Verlauf wurde nicht verändert.",
    it: "Non è stato possibile leggere i dati della regata salvata. La cronologia non è stata modificata.",
  });
  const back = tl({ ru: "Назад", en: "Back", pl: "Wróć", es: "Volver", fr: "Retour", de: "Zurück", it: "Indietro" });
  return <DarkSurface><Screen>
    <Stack.Screen options={{ ...darkStackOptions, title, headerShown: true }} />
    <ScrollView contentContainerStyle={styles.scroll}>
      <EmptyState icon="warning" title={title} subtitle={subtitle} cta={{ label: back,
        onPress: () => { if (router.canGoBack()) router.back(); else router.replace("/history"); },
      }} />
    </ScrollView>
  </Screen></DarkSurface>;
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xxl },
});
