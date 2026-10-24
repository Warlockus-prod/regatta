'use client';

import { useMemo } from "react";
import { useI18n } from "@/lib/i18n";

// Strings of the shared control dock, wheels and settings sheet, 7 languages.
// Sheet names follow scripts/sailing-glossary.md: the label always names the sheet.

export function useControlLabels() {
  const { tl } = useI18n();
  return useMemo(() => ({
    tabs: {
      favorites: tl({ ru: "Избранное", en: "Favorites", pl: "Ulubione", es: "Favoritos", fr: "Favoris", de: "Favoriten", it: "Preferiti" }),
      wheels: tl({ ru: "Штурвалы", en: "Wheels", pl: "Koła", es: "Ruedas", fr: "Roues", de: "Räder", it: "Ruote" }),
      sails: tl({ ru: "Паруса", en: "Sails", pl: "Żagle", es: "Velas", fr: "Voiles", de: "Segel", it: "Vele" }),
      helm: tl({ ru: "Руль", en: "Helm", pl: "Ster", es: "Timón", fr: "Barre", de: "Steuer", it: "Timone" }),
      wind: tl({ ru: "Ветер", en: "Wind", pl: "Wiatr", es: "Viento", fr: "Vent", de: "Wind", it: "Vento" }),
      more: tl({ ru: "Ещё", en: "More", pl: "Więcej", es: "Más", fr: "Plus", de: "Mehr", it: "Altro" }),
    },
    controlsTitle: tl({ ru: "Управление", en: "Controls", pl: "Sterowanie", es: "Controles", fr: "Commandes", de: "Steuerung", it: "Comandi" }),
    settings: tl({ ru: "Настройки управления", en: "Control settings", pl: "Ustawienia sterowania", es: "Ajustes de control", fr: "Réglages des commandes", de: "Steuerung einstellen", it: "Impostazioni comandi" }),
    mode: tl({ ru: "Режим", en: "Mode", pl: "Tryb", es: "Modo", fr: "Mode", de: "Modus", it: "Modalità" }),
    sliders: tl({ ru: "Ползунки", en: "Sliders", pl: "Suwaki", es: "Deslizadores", fr: "Curseurs", de: "Schieberegler", it: "Cursori" }),
    wheels: tl({ ru: "Штурвалы", en: "Wheels", pl: "Koła", es: "Ruedas", fr: "Roues", de: "Räder", it: "Ruote" }),
    modeNote: tl({
      ru: "Штурвалы по умолчанию. Ползунки можно выбрать здесь. Штурвалы: большой руль по центру, по бокам стаксель-шкот и гика-шкот.",
      en: "Wheels are the default. Sliders are available here. Wheels: a big helm in the middle, the jib sheet and the mainsheet at the sides.",
      pl: "Domyślnie koła. Tutaj możesz wybrać suwaki. Koła: duży ster pośrodku, po bokach szot foka i szot grota.",
      es: "Por defecto, ruedas. Aquí puedes elegir deslizadores. Ruedas: un timón grande en el centro y, a los lados, la escota de foque y la de mayor.",
      fr: "Par défaut, des roues. Les curseurs sont disponibles ici. Roues : une grande barre au centre, l'écoute de foc et l'écoute de grand-voile sur les côtés.",
      de: "Standard sind Räder. Schieberegler stehen hier zur Wahl. Räder: ein großes Steuer in der Mitte, Fock- und Großschot an den Seiten.",
      it: "Di base le ruote. Qui puoi scegliere i cursori. Ruote: un grande timone al centro, ai lati la scotta del fiocco e quella della randa.",
    }),
    helmSets: tl({ ru: "Штурвал задает", en: "The wheel sets", pl: "Koło sterowe ustawia", es: "La rueda fija", fr: "La roue règle", de: "Das Steuerrad stellt", it: "La ruota imposta" }),
    course: tl({ ru: "Курс", en: "Course", pl: "Kurs", es: "Rumbo", fr: "Le cap", de: "Kurs", it: "Rotta" }),
    rudder: tl({ ru: "Перо руля", en: "Rudder angle", pl: "Wychylenie steru", es: "Ángulo de pala", fr: "L'angle de safran", de: "Ruderwinkel", it: "Angolo del timone" }),
    returnCenter: tl({ ru: "Возвращать штурвал в центр", en: "Return the wheel to center", pl: "Koło wraca do środka", es: "Devolver la rueda al centro", fr: "Ramener la roue au centre", de: "Steuerrad zur Mitte zurück", it: "Riporta la ruota al centro" }),
    returnCenterNote: tl({
      ru: "Выключено: штурвал остается там, где его отпустили; возвращай его в центр вручную, как на лодке.",
      en: "Off: the wheel stays where you leave it; bring it back yourself, as on a boat.",
      pl: "Wyłączone: koło zostaje tam, gdzie je zostawisz; ręcznie ustaw je z powrotem pośrodku, jak na jachcie.",
      es: "Desactivado: la rueda se queda donde la dejas; devuélvela tú, como en un barco.",
      fr: "Désactivé : la roue reste où tu la laisses ; ramène-la toi-même, comme à bord.",
      de: "Aus: Das Rad bleibt, wo du es lässt; bring es selbst zurück, wie an Bord.",
      it: "Spento: la ruota resta dove la lasci; riportala tu, come in barca.",
    }),
    sensitivity: tl({ ru: "Чувствительность", en: "Sensitivity", pl: "Czułość", es: "Sensibilidad", fr: "Sensibilité", de: "Empfindlichkeit", it: "Sensibilità" }),
    fine: tl({ ru: "Точно", en: "Fine", pl: "Dokładnie", es: "Fina", fr: "Précise", de: "Fein", it: "Precisa" }),
    normal: tl({ ru: "Обычно", en: "Normal", pl: "Normalnie", es: "Normal", fr: "Normale", de: "Normal", it: "Normale" }),
    fast: tl({ ru: "Быстро", en: "Fast", pl: "Szybko", es: "Rápida", fr: "Rapide", de: "Schnell", it: "Rapida" }),
    jibRight: tl({ ru: "Стаксель-шкот справа", en: "Jib sheet on the right", pl: "Szot foka po prawej", es: "Escota de foque a la derecha", fr: "Écoute de foc à droite", de: "Fockschot rechts", it: "Scotta del fiocco a destra" }),
    sound: tl({ ru: "Звук", en: "Sound", pl: "Dźwięk", es: "Sonido", fr: "Son", de: "Ton", it: "Suono" }),
    soundNote: tl({
      ru: "Щелчки штурвалов и шкотов при повороте, упор в конце хода.",
      en: "Clicks while turning the wheels, a bump at the end of travel.",
      pl: "Kliknięcia przy obracaniu kół, opór na końcu zakresu.",
      es: "Clics al girar las ruedas y un tope al final del recorrido.",
      fr: "Des clics en tournant les roues, une butée en fin de course.",
      de: "Klicks beim Drehen der Räder, ein Anschlag am Ende.",
      it: "Clic girando le ruote, un fermo a fine corsa.",
    }),
    favoritesEdit: tl({ ru: "Что показывать в «Избранном»", en: "What Favorites shows", pl: "Co pokazują Ulubione", es: "Qué muestra Favoritos", fr: "Ce qu'affichent les Favoris", de: "Was Favoriten zeigt", it: "Cosa mostrano i Preferiti" }),
    edit: tl({ ru: "Изменить", en: "Edit", pl: "Zmień", es: "Editar", fr: "Modifier", de: "Ändern", it: "Modifica" }),
    resetOrder: tl({ ru: "Вернуть как было", en: "Restore defaults", pl: "Przywróć domyślne", es: "Restaurar", fr: "Rétablir", de: "Zurücksetzen", it: "Ripristina" }),
    moveUp: tl({ ru: "выше", en: "move up", pl: "wyżej", es: "subir", fr: "monter", de: "nach oben", it: "su" }),
    moveDown: tl({ ru: "ниже", en: "move down", pl: "niżej", es: "bajar", fr: "descendre", de: "nach unten", it: "giù" }),
    done: tl({ ru: "Готово", en: "Done", pl: "Gotowe", es: "Listo", fr: "OK", de: "Fertig", it: "Fatto" }),
    close: tl({ ru: "Закрыть", en: "Close", pl: "Zamknij", es: "Cerrar", fr: "Fermer", de: "Schließen", it: "Chiudi" }),
    view: tl({ ru: "Вид", en: "View", pl: "Widok", es: "Vista", fr: "Vue", de: "Ansicht", it: "Vista" }),
    views: tl({ ru: "Виды и камера", en: "Views and camera", pl: "Widoki i kamera", es: "Vistas y cámara", fr: "Vues et caméra", de: "Ansichten und Kamera", it: "Viste e camera" }),
    helm: tl({ ru: "Руль", en: "Helm", pl: "Ster", es: "Timón", fr: "Barre", de: "Steuer", it: "Timone" }),
    mainsheet: tl({ ru: "Гика-шкот", en: "Mainsheet", pl: "Szot grota", es: "Escota de mayor", fr: "Écoute de grand-voile", de: "Großschot", it: "Scotta della randa" }),
    jibsheet: tl({ ru: "Стаксель-шкот", en: "Jib sheet", pl: "Szot foka", es: "Escota de foque", fr: "Écoute de foc", de: "Fockschot", it: "Scotta del fiocco" }),
    courseToWind: tl({ ru: "курс к ветру", en: "angle to wind", pl: "kurs względem wiatru", es: "ángulo al viento", fr: "angle au vent", de: "Kurs zum Wind", it: "angolo al vento" }),
    heading: tl({ ru: "курс", en: "heading", pl: "kurs", es: "rumbo", fr: "cap", de: "Kurs", it: "rotta" }),
    rudderShort: tl({ ru: "перо", en: "rudder", pl: "płetwa", es: "pala", fr: "safran", de: "Ruder", it: "pala" }),
    eased: tl({ ru: "потравлен", en: "eased", pl: "poluzowany", es: "lascada", fr: "choquée", de: "gefiert", it: "lascata" }),
    sheetScale: tl({ ru: "0% выбран · 100% потравлен", en: "0% sheeted in · 100% eased out", pl: "0% wybrany · 100% poluzowany", es: "0% cazada · 100% lascada", fr: "0% bordée · 100% choquée", de: "0% dichtgeholt · 100% gefiert", it: "0% cazzata · 100% lascata" }),
    wheelHint: tl({
      ru: "Крути штурвал по кругу. Нажми шкот, чтобы увеличить, нажми руль, чтобы вернуть.",
      en: "Turn a wheel in a circle. Tap a sheet to enlarge it, tap the helm to swap back.",
      pl: "Obracaj koło ruchem okrężnym. Dotknij szotu, aby go powiększyć, dotknij steru, aby wrócić.",
      es: "Gira la rueda en círculo. Toca una escota para ampliarla y el timón para volver.",
      fr: "Tourne la roue en cercle. Touche une écoute pour l'agrandir, la barre pour revenir.",
      de: "Dreh das Rad im Kreis. Tippe auf eine Schot zum Vergrößern, auf das Steuer zum Zurückwechseln.",
      it: "Gira la ruota in cerchio. Tocca una scotta per ingrandirla, il timone per tornare.",
    }),
    autoTrim: tl({
      ru: "В Основах паруса настраиваются сами, штурвал только рулит.",
      en: "In Basics the sails trim themselves; the wheel only steers.",
      pl: "W Podstawach żagle trymują się same, koło tylko steruje.",
      es: "En Fundamentos las velas se ajustan solas; la rueda solo gobierna.",
      fr: "Dans Bases, les voiles se règlent seules ; la roue sert seulement à barrer.",
      de: "In Grundlagen trimmen sich die Segel selbst; das Rad steuert nur.",
      it: "In Basi le vele si regolano da sole; la ruota serve solo a governare.",
    }),
    openSettings: tl({ ru: "Настройки управления", en: "Control settings", pl: "Ustawienia sterowania", es: "Ajustes de control", fr: "Réglages des commandes", de: "Steuerung einstellen", it: "Impostazioni comandi" }),
  }), [tl]);
}

export type ControlLabels = ReturnType<typeof useControlLabels>;
