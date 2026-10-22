import { words } from '../../../src/lib/product/catalog';

/** Race setup and race screen strings (7 languages). */
export const raceCopy = {
  mode: words('Режим гонки', 'Race mode', 'Tryb wyścigu', 'Modo de regata', 'Mode de course', 'Rennmodus', 'Modalità regata'),
  simple: words('Простой', 'Simple', 'Prosty', 'Sencillo', 'Simple', 'Einfach', 'Semplice'),
  pro: words('Про', 'Pro', 'Pro', 'Pro', 'Pro', 'Profi', 'Pro'),
  simpleNote: words(
    'Паруса настраиваются сами, ты только рулишь.',
    'The sails trim themselves, you just steer.',
    'Żagle trymują się same, ty tylko sterujesz.',
    'Las velas se ajustan solas, tú solo gobiernas.',
    'Les voiles se règlent seules, tu ne fais que barrer.',
    'Die Segel trimmen sich selbst, du steuerst nur.',
    'Le vele si regolano da sole, tu timoni e basta.',
  ),
  proNote: words(
    'Гика-шкот и стаксель-шкот на тебе, как в тренажере. Ползунки или штурвалы: Настройки, Тренажеры.',
    'You trim the mainsheet and the jib sheet, as in the trainer. Sliders or wheels: Settings, Trainers.',
    'Szot grota i szot foka są na tobie, jak w trenażerze. Suwaki albo koła: Ustawienia, Trenażery.',
    'Tú trimas la escota de mayor y la de foque, como en el simulador. Deslizadores o ruedas: Ajustes, Simuladores.',
    "Tu règles l'écoute de grand-voile et celle de foc, comme au simulateur. Curseurs ou roues : Réglages, Simulateurs.",
    'Groß- und Fockschot bedienst du selbst, wie im Trainer. Schieberegler oder Räder: Einstellungen, Trainer.',
    'Regoli tu la scotta della randa e quella del fiocco, come nel simulatore. Cursori o ruote: Impostazioni, Simulatori.',
  ),
  steerHint: words(
    'Коснись воды, куда плыть: лодка повернет туда.',
    'Touch the water where you want to go: the boat turns there.',
    'Dotknij wody tam, dokąd chcesz płynąć: łódka tam skręci.',
    'Toca el agua hacia donde quieres ir: el barco gira hacia allí.',
    "Touche l'eau là où tu veux aller : le bateau tourne vers elle.",
    'Tippe aufs Wasser, wohin du willst: Das Boot dreht dorthin.',
    "Tocca l'acqua dove vuoi andare: la barca gira lì.",
  ),
  mainsheet: words('Гика-шкот', 'Mainsheet', 'Szot grota', 'Escota de mayor', 'Écoute de grand-voile', 'Großschot', 'Scotta della randa'),
  jibsheet: words('Стаксель-шкот', 'Jib sheet', 'Szot foka', 'Escota de foque', 'Écoute de foc', 'Fockschot', 'Scotta del fiocco'),
  main: words('Грот', 'Main', 'Grot', 'Mayor', 'GV', 'Groß', 'Randa'),
  jib: words('Стаксель', 'Jib', 'Fok', 'Foque', 'Foc', 'Fock', 'Fiocco'),
  sheetScale: words('0% выбран · 100% потравлен', '0% sheeted in · 100% eased out', '0% wybrany · 100% poluzowany', '0% cazada · 100% lascada', '0% bordée · 100% choquée', '0% dichtgeholt · 100% gefiert', '0% cazzata · 100% lascata'),
  luff: words('заполаскивает', 'luffing', 'łopocze', 'flamea', 'faseye', 'killt', 'fileggia'),
  stall: words('срыв потока', 'stalled', 'zerwany przepływ', 'en pérdida', 'décroché', 'Strömungsabriss', 'in stallo'),
  good: words('тянет', 'pulling', 'pracuje', 'tira', 'porte', 'zieht', 'tira'),
  overtrim: words('перебран', 'overtrimmed', 'przebrany', 'demasiado cazada', 'trop bordée', 'zu dicht', 'troppo cazzata'),
};
