/** Package 11 (audit B9): the race Settings hold camera, sound and hints; the
 * rest is chosen before the start. Its own module, so the live room's chunk
 * (which reads the hint words in race-hint-log-copy.ts) does not carry these. */
export const RACE_SETUP_COPY = {
  setupTitle: { ru: "Настройки гонки", en: "Race settings", pl: "Ustawienia wyścigu", es: "Ajustes de regata", fr: "Réglages de course", de: "Renneinstellungen", it: "Impostazioni di regata" },
  setupNote: {
    ru: "Управление, графика и правила: «Настройки гонки» перед стартом.",
    en: "Controls, graphics and rules: \"Race settings\" before the start.",
    pl: "Sterowanie, grafika i przepisy: \"Ustawienia wyścigu\" przed startem.",
    es: "Controles, gráficos y reglas: \"Ajustes de regata\" antes de la salida.",
    fr: "Commandes, graphismes et règles : \"Réglages de course\" avant le départ.",
    de: "Steuerung, Grafik und Regeln: \"Renneinstellungen\" vor dem Start.",
    it: "Comandi, grafica e regole: \"Impostazioni di regata\" prima della partenza.",
  },
} as const;
