// Race setup shared by the race screen and its menu (src/app/game): the
// difficulty levels in seven languages.

export type Difficulty = 'easy' | 'medium' | 'hard';
export const DIFFICULTY_CONFIG: Record<Difficulty, {
  label: string;      // RU (legacy field name, kept for compat)
  labelEn: string;
  labelPl: string;
  labelEs: string;
  labelFr: string;
  labelDe: string;
  labelIt: string;
  description: string;      // RU
  descriptionEn: string;
  descriptionPl: string;
  descriptionEs: string;
  descriptionFr: string;
  descriptionDe: string;
  descriptionIt: string;
  opponents: number;
  aiSpeedMul: number;
  color: string;
}> = {
  easy: {
    label: 'Лёгкий',
    labelEn: 'Easy',
    labelPl: 'Łatwy',
    labelEs: 'Fácil',
    labelFr: 'Facile',
    labelDe: 'Leicht',
    labelIt: 'Facile',
    description: 'Медленные противники, спокойные повороты. Хорошо для знакомства с управлением.',
    descriptionEn: 'Slow opponents, gentle turns. Good for getting used to the controls.',
    descriptionPl: 'Wolni rywale, spokojne zwroty. Dobry na oswojenie się ze sterowaniem.',
    descriptionEs: 'Rivales lentos que viran con calma. Ideal para hacerte con los controles.',
    descriptionFr: 'Adversaires lents, virements tranquilles. Idéal pour prendre en main les commandes.',
    descriptionDe: 'Langsame Gegner, ruhige Wenden. Gut, um dich mit der Steuerung vertraut zu machen.',
    descriptionIt: 'Avversari lenti, virate tranquille. Ideale per prendere confidenza con i comandi.',
    opponents: 2,
    aiSpeedMul: 0.78,
    color: '#44ff88',
  },
  medium: {
    label: 'Средний',
    labelEn: 'Medium',
    labelPl: 'Średni',
    labelEs: 'Medio',
    labelFr: 'Moyen',
    labelDe: 'Mittel',
    labelIt: 'Medio',
    description: 'Соперники держат курс уверенно. Нужна тактика лавировки и точное огибание знаков.',
    descriptionEn: 'Opponents sail a confident line. You need tacking tactics and precise mark rounding.',
    descriptionPl: 'Rywale pewnie trzymają kurs. Potrzebna jest taktyka halsowania i precyzyjne opływanie znaków.',
    descriptionEs: 'Los rivales mantienen el rumbo con seguridad. Necesitas táctica de bordos y rodear las balizas con precisión.',
    descriptionFr: 'Les adversaires tiennent leur cap avec assurance. Il te faut une tactique de louvoyage et des passages de bouée précis.',
    descriptionDe: 'Die Gegner halten sicher ihren Kurs. Du brauchst eine gute Kreuztaktik und musst die Bahnmarken präzise runden.',
    descriptionIt: 'Gli avversari tengono la rotta con sicurezza. Servono una buona tattica di bolina e giri di boa precisi.',
    opponents: 3,
    aiSpeedMul: 0.92,
    color: '#ffaa00',
  },
  hard: {
    label: 'Сложный',
    labelEn: 'Hard',
    labelPl: 'Trudny',
    labelEs: 'Difícil',
    labelFr: 'Difficile',
    labelDe: 'Schwer',
    labelIt: 'Difficile',
    description: 'Агрессивные соперники идут почти оптимально. Каждая ошибка дорого стоит.',
    descriptionEn: 'Aggressive opponents sail near-optimal lines. Every mistake is costly.',
    descriptionPl: 'Agresywni rywale płyną niemal optymalnie. Każdy błąd drogo kosztuje.',
    descriptionEs: 'Rivales agresivos que navegan casi a la perfección. Cada error se paga caro.',
    descriptionFr: 'Des adversaires agressifs, presque parfaits. Chaque erreur coûte cher.',
    descriptionDe: 'Aggressive Gegner segeln nahezu optimal. Jeder Fehler rächt sich.',
    descriptionIt: 'Avversari aggressivi che navigano quasi alla perfezione. Ogni errore costa caro.',
    opponents: 4,
    aiSpeedMul: 1.02,
    color: '#ff4444',
  },
};
