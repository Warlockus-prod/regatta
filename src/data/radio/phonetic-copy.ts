import type { Lang } from "@/lib/languages";

// Interface copy of the phonetic alphabet drill (/radio/alfabet) in all seven
// languages. The code words and spoken figures themselves are the international
// standard and live in phonetic-alphabet.ts; they are never translated.
// `{0}`, `{1}` are filled by fillCopy().

export const PHONETIC_DRILL_HREF = "/radio/alfabet";
/** The theory chapter that teaches spelling; the drill returns there. */
export const PHONETIC_DRILL_CHAPTER = "routine";

type Copy = Record<Lang, string>;

export const PHONETIC_COPY = {
  drillTitle: { ru: "Фонетический алфавит и цифры", en: "Phonetic alphabet and numbers", pl: "Alfabet fonetyczny i cyfry", es: "Alfabeto fonético y números", fr: "Alphabet phonétique et chiffres", de: "Buchstabieralphabet und Zahlen", it: "Alfabeto fonetico e numeri" },
  listNote: { ru: "Буквы, цифры и передача по буквам", en: "Letters, numbers and spelling", pl: "Litery, cyfry i literowanie", es: "Letras, números y deletreo", fr: "Lettres, chiffres et épellation", de: "Buchstaben, Zahlen und Buchstabieren", it: "Lettere, numeri e spelling" },
  chapterLink: { ru: "Отработать фонетический алфавит", en: "Practise the phonetic alphabet", pl: "Przećwicz alfabet fonetyczny", es: "Practica el alfabeto fonético", fr: "S'entraîner à l'alphabet phonétique", de: "Buchstabieralphabet üben", it: "Esercitati con l'alfabeto fonetico" },
  intro: {
    ru: "Имена судов, позывные и MMSI в эфире передают по буквам и по цифрам. Кодовые слова и произношение цифр одинаковы во всём мире и остаются английскими. Сначала выучи таблицу, затем узнавай слова на слух, передай имя по буквам и пройди зачётный раунд.",
    en: "Ship names, call signs and MMSIs are spelled letter by letter and figure by figure on the air. The code words and the way figures are pronounced are the same worldwide and stay English. Learn the table, recognise the words by ear, spell a name, then take the scored round.",
    pl: "Nazwy jednostek, znaki wywoławcze i MMSI nadaje się w eterze litera po literze i cyfra po cyfrze. Słowa kodowe i wymowa cyfr są takie same na całym świecie i pozostają angielskie. Naucz się tabeli, rozpoznawaj słowa ze słuchu, przeliteruj nazwę i zalicz rundę punktowaną.",
    es: "Los nombres de barcos, los distintivos de llamada y los MMSI se transmiten letra a letra y cifra a cifra. Las palabras clave y la pronunciación de las cifras son iguales en todo el mundo y se dicen en inglés. Aprende la tabla, reconoce las palabras de oído, deletrea un nombre y haz la ronda puntuada.",
    fr: "Les noms de navires, les indicatifs et les MMSI s'épellent lettre par lettre et chiffre par chiffre sur les ondes. Les mots de code et la prononciation des chiffres sont les mêmes partout dans le monde et restent en anglais. Apprends le tableau, reconnais les mots à l'oreille, épelle un nom, puis passe la manche notée.",
    de: "Schiffsnamen, Rufzeichen und MMSI werden im Funk Buchstabe für Buchstabe und Ziffer für Ziffer übermittelt. Die Codewörter und die Aussprache der Ziffern sind weltweit gleich und bleiben Englisch. Lerne die Tabelle, erkenne die Wörter nach Gehör, buchstabiere einen Namen und mach dann die gewertete Runde.",
    it: "Nomi delle unità, nominativi e MMSI si trasmettono lettera per lettera e cifra per cifra. Le parole in codice e la pronuncia delle cifre sono uguali in tutto il mondo e restano in inglese. Impara la tabella, riconosci le parole a orecchio, fai lo spelling di un nome e poi affronta il round a punti.",
  },
  tabLearn: { ru: "Учить", en: "Learn", pl: "Nauka", es: "Aprender", fr: "Apprendre", de: "Lernen", it: "Impara" },
  tabRecognise: { ru: "Узнавать", en: "Recognise", pl: "Rozpoznawanie", es: "Reconocer", fr: "Reconnaître", de: "Erkennen", it: "Riconosci" },
  tabSpell: { ru: "По буквам", en: "Spell", pl: "Literowanie", es: "Deletrear", fr: "Épeler", de: "Buchstabieren", it: "Spelling" },
  tabRound: { ru: "Зачётный раунд", en: "Scored round", pl: "Runda punktowana", es: "Ronda puntuada", fr: "Manche notée", de: "Gewertete Runde", it: "Round a punti" },
  modes: { ru: "Режимы упражнения", en: "Drill modes", pl: "Tryby ćwiczenia", es: "Modos del ejercicio", fr: "Modes de l'exercice", de: "Übungsmodi", it: "Modalità dell'esercizio" },
  lettersTitle: { ru: "Буквы A-Z", en: "Letters A-Z", pl: "Litery A-Z", es: "Letras A-Z", fr: "Lettres A-Z", de: "Buchstaben A-Z", it: "Lettere A-Z" },
  stressNote: {
    ru: "Ударный слог выделен и подчёркнут. Написание Alfa и Juliett выбрано специально, чтобы слово одинаково читали люди с любым родным языком.",
    en: "The stressed syllable is bold and underlined. Alfa and Juliett are spelled this way on purpose, so speakers of every language read them the same.",
    pl: "Akcentowana sylaba jest pogrubiona i podkreślona. Pisownia Alfa i Juliett jest celowa: każdy, niezależnie od języka, czyta te słowa tak samo.",
    es: "La sílaba tónica aparece en negrita y subrayada. Alfa y Juliett se escriben así a propósito, para que hablantes de cualquier idioma las lean igual.",
    fr: "La syllabe accentuée est en gras et soulignée. Alfa et Juliett s'écrivent ainsi exprès, pour que les locuteurs de toutes les langues les lisent de la même façon.",
    de: "Die betonte Silbe ist fett und unterstrichen. Alfa und Juliett werden absichtlich so geschrieben, damit Sprecher jeder Sprache sie gleich lesen.",
    it: "La sillaba accentata è in grassetto e sottolineata. Alfa e Juliett si scrivono così di proposito, perché chi parla qualsiasi lingua le legga allo stesso modo.",
  },
  colLetter: { ru: "Буква", en: "Letter", pl: "Litera", es: "Letra", fr: "Lettre", de: "Buchstabe", it: "Lettera" },
  colWord: { ru: "Кодовое слово", en: "Code word", pl: "Słowo kodowe", es: "Palabra clave", fr: "Mot de code", de: "Codewort", it: "Parola in codice" },
  colSay: { ru: "Произношение", en: "Pronunciation", pl: "Wymowa", es: "Pronunciación", fr: "Prononciation", de: "Aussprache", it: "Pronuncia" },
  colSpoken: { ru: "В эфире", en: "On the air", pl: "W eterze", es: "En el aire", fr: "Sur les ondes", de: "Im Funk", it: "In onda" },
  colCode: { ru: "Код ITU", en: "ITU code word", pl: "Słowo kodowe ITU", es: "Palabra clave ITU", fr: "Mot de code UIT", de: "ITU-Codewort", it: "Parola in codice ITU" },
  figuresTitle: { ru: "Цифры", en: "Figures", pl: "Cyfry", es: "Cifras", fr: "Chiffres", de: "Ziffern", it: "Cifre" },
  figuresNote: {
    ru: "Каждую цифру говорят отдельно: 16 это ONE SIX, а не SIXTEEN. NIN-ER не спутать с FIVE, FIFE не спутать с NINE. Десятичная запятая это DECIMAL. Коды ITU (UNAONE, BISSOTWO) нужны, когда связь очень плохая.",
    en: "Every figure is said separately: 16 is ONE SIX, never SIXTEEN. NIN-ER cannot be mistaken for FIVE, and FIFE not for NINE. The decimal point is DECIMAL. The ITU code words (UNAONE, BISSOTWO) are for very poor reception.",
    pl: "Każdą cyfrę mówi się osobno: 16 to ONE SIX, nigdy SIXTEEN. NIN-ER nie pomyli się z FIVE, a FIFE z NINE. Przecinek dziesiętny to DECIMAL. Słowa kodowe ITU (UNAONE, BISSOTWO) służą przy bardzo słabym odbiorze.",
    es: "Cada cifra se dice por separado: 16 es ONE SIX, nunca SIXTEEN. NIN-ER no se confunde con FIVE, ni FIFE con NINE. La coma decimal es DECIMAL. Las palabras clave ITU (UNAONE, BISSOTWO) se usan con muy mala recepción.",
    fr: "Chaque chiffre se dit séparément : 16 se dit ONE SIX, jamais SIXTEEN. NIN-ER ne se confond pas avec FIVE, ni FIFE avec NINE. La virgule se dit DECIMAL. Les mots de code UIT (UNAONE, BISSOTWO) servent quand la réception est très mauvaise.",
    de: "Jede Ziffer wird einzeln gesprochen: 16 ist ONE SIX, niemals SIXTEEN. NIN-ER lässt sich nicht mit FIVE verwechseln und FIFE nicht mit NINE. Das Komma heißt DECIMAL. Die ITU-Codewörter (UNAONE, BISSOTWO) sind für sehr schlechten Empfang.",
    it: "Ogni cifra si pronuncia separatamente: 16 è ONE SIX, mai SIXTEEN. NIN-ER non si confonde con FIVE, né FIFE con NINE. La virgola decimale è DECIMAL. Le parole in codice ITU (UNAONE, BISSOTWO) servono quando la ricezione è pessima.",
  },
  examplesTitle: { ru: "Числа в эфире", en: "Numbers on the air", pl: "Liczby w eterze", es: "Números en el aire", fr: "Nombres sur les ondes", de: "Zahlen im Funk", it: "Numeri in onda" },
  ctxChannel: { ru: "канал", en: "channel", pl: "kanał", es: "canal", fr: "canal", de: "Kanal", it: "canale" },
  ctxTime: { ru: "время", en: "time", pl: "czas", es: "hora", fr: "heure", de: "Uhrzeit", it: "ora" },
  ctxCourse: { ru: "курс", en: "course", pl: "kurs", es: "rumbo", fr: "cap", de: "Kurs", it: "rotta" },
  ctxDraught: { ru: "осадка", en: "draught", pl: "zanurzenie", es: "calado", fr: "tirant d'eau", de: "Tiefgang", it: "pescaggio" },
  ctxMmsi: { ru: "MMSI", en: "MMSI", pl: "MMSI", es: "MMSI", fr: "MMSI", de: "MMSI", it: "MMSI" },
  listen: { ru: "Прослушать", en: "Listen", pl: "Posłuchaj", es: "Escuchar", fr: "Écouter", de: "Anhören", it: "Ascolta" },
  modeWordToLetter: { ru: "Слово -> буква", en: "Word -> letter", pl: "Słowo -> litera", es: "Palabra -> letra", fr: "Mot -> lettre", de: "Wort -> Buchstabe", it: "Parola -> lettera" },
  modeLetterToWord: { ru: "Буква -> слово", en: "Letter -> word", pl: "Litera -> słowo", es: "Letra -> palabra", fr: "Lettre -> mot", de: "Buchstabe -> Wort", it: "Lettera -> parola" },
  modeFigures: { ru: "Цифры", en: "Figures", pl: "Cyfry", es: "Cifras", fr: "Chiffres", de: "Ziffern", it: "Cifre" },
  listenOnly: { ru: "Только на слух", en: "By ear only", pl: "Tylko ze słuchu", es: "Solo de oído", fr: "Seulement à l'oreille", de: "Nur nach Gehör", it: "Solo a orecchio" },
  showWord: { ru: "Показать слово", en: "Show the word", pl: "Pokaż słowo", es: "Mostrar la palabra", fr: "Afficher le mot", de: "Wort zeigen", it: "Mostra la parola" },
  hiddenWord: { ru: "Слово скрыто: нажми ▶ и слушай", en: "The word is hidden: press ▶ and listen", pl: "Słowo jest ukryte: naciśnij ▶ i słuchaj", es: "La palabra está oculta: pulsa ▶ y escucha", fr: "Le mot est masqué : appuie sur ▶ et écoute", de: "Das Wort ist verdeckt: drück ▶ und hör zu", it: "La parola è nascosta: premi ▶ e ascolta" },
  askLetter: { ru: "Какая это буква?", en: "Which letter is this?", pl: "Jaka to litera?", es: "¿Qué letra es?", fr: "Quelle lettre est-ce ?", de: "Welcher Buchstabe ist das?", it: "Che lettera è?" },
  askWord: { ru: "Какое кодовое слово у этой буквы?", en: "Which code word is this letter?", pl: "Jakie słowo kodowe ma ta litera?", es: "¿Qué palabra clave corresponde a esta letra?", fr: "Quel est le mot de code de cette lettre ?", de: "Welches Codewort hat dieser Buchstabe?", it: "Qual è la parola in codice di questa lettera?" },
  askFigure: { ru: "Как произносится эта цифра в эфире?", en: "How is this figure pronounced on the air?", pl: "Jak wymawia się tę cyfrę w eterze?", es: "¿Cómo se pronuncia esta cifra en el aire?", fr: "Comment ce chiffre se prononce-t-il sur les ondes ?", de: "Wie wird diese Ziffer im Funk ausgesprochen?", it: "Come si pronuncia questa cifra in onda?" },
  correct: { ru: "Верно", en: "Correct", pl: "Dobrze", es: "Correcto", fr: "Correct", de: "Richtig", it: "Corretto" },
  wrongAnswer: { ru: "Неверно. Правильно: {0}", en: "Not quite. The answer is {0}", pl: "Niestety nie. Poprawnie: {0}", es: "No. La respuesta es {0}", fr: "Non. La bonne réponse est {0}", de: "Leider nicht. Richtig ist {0}", it: "No. La risposta è {0}" },
  next: { ru: "Дальше", en: "Next", pl: "Dalej", es: "Siguiente", fr: "Suivant", de: "Weiter", it: "Avanti" },
  streak: { ru: "Подряд верно: {0}", en: "Correct in a row: {0}", pl: "Dobrze z rzędu: {0}", es: "Aciertos seguidos: {0}", fr: "Bonnes réponses d'affilée : {0}", de: "Richtig in Folge: {0}", it: "Risposte giuste di fila: {0}" },
  spellAsk: { ru: "Передай по буквам", en: "Spell it on the air", pl: "Przeliteruj w eterze", es: "Deletréalo por radio", fr: "Épelle-le sur les ondes", de: "Buchstabiere es im Funk", it: "Fai lo spelling via radio" },
  kindShip: { ru: "название судна", en: "ship name", pl: "nazwa jednostki", es: "nombre del barco", fr: "nom du navire", de: "Schiffsname", it: "nome dell'unità" },
  kindCallsign: { ru: "позывной", en: "call sign", pl: "znak wywoławczy", es: "distintivo de llamada", fr: "indicatif d'appel", de: "Rufzeichen", it: "nominativo" },
  spellHow: {
    ru: "Напиши кодовые слова через пробел (OSCAR ROMEO...) или зажми кнопку и произнеси их. Пробел в названии не передаётся.",
    en: "Type the code words separated by spaces (OSCAR ROMEO...) or hold the button and say them. A space in the name is not transmitted.",
    pl: "Wpisz słowa kodowe oddzielone spacjami (OSCAR ROMEO...) albo przytrzymaj przycisk i je wypowiedz. Spacji w nazwie się nie nadaje.",
    es: "Escribe las palabras clave separadas por espacios (OSCAR ROMEO...) o mantén pulsado el botón y dilas. El espacio del nombre no se transmite.",
    fr: "Tape les mots de code séparés par des espaces (OSCAR ROMEO...) ou maintiens le bouton et dis-les. L'espace dans le nom ne se transmet pas.",
    de: "Tippe die Codewörter mit Leerzeichen (OSCAR ROMEO...) oder halte die Taste und sprich sie. Ein Leerzeichen im Namen wird nicht übermittelt.",
    it: "Scrivi le parole in codice separate da spazi (OSCAR ROMEO...) oppure tieni premuto il pulsante e pronunciale. Lo spazio nel nome non si trasmette.",
  },
  holdToSpeak: { ru: "🎙 Держи и говори", en: "🎙 Hold and speak", pl: "🎙 Trzymaj i mów", es: "🎙 Mantén y habla", fr: "🎙 Maintiens et parle", de: "🎙 Halten und sprechen", it: "🎙 Tieni premuto e parla" },
  speaking: { ru: "🔴 Говори...", en: "🔴 Speak...", pl: "🔴 Mów...", es: "🔴 Habla...", fr: "🔴 Parle...", de: "🔴 Sprich...", it: "🔴 Parla..." },
  transcribing: { ru: "Слушаю...", en: "Listening...", pl: "Słucham...", es: "Escuchando...", fr: "J'écoute...", de: "Ich höre zu...", it: "Ascolto..." },
  pttLabel: {
    ru: "Держать и говорить: зажми, произнеси кодовые слова, отпусти. Работает с клавиши пробел или Enter.",
    en: "Hold to talk: press and hold, say the code words, release. Works with Space or Enter.",
    pl: "Trzymaj i mów: przytrzymaj, wypowiedz słowa kodowe, puść. Działa też klawiszem spacja lub Enter.",
    es: "Mantén para hablar: pulsa y mantén, di las palabras clave y suelta. Funciona con Espacio o Intro.",
    fr: "Maintenir pour parler : appuie, dis les mots de code, relâche. Fonctionne avec Espace ou Entrée.",
    de: "Zum Sprechen halten: drücken und halten, Codewörter sprechen, loslassen. Funktioniert mit Leertaste oder Enter.",
    it: "Tieni premuto per parlare: premi, pronuncia le parole in codice, rilascia. Funziona con Spazio o Invio.",
  },
  showModel: { ru: "Показать образец", en: "Show the model", pl: "Pokaż wzór", es: "Mostrar el modelo", fr: "Afficher le modèle", de: "Muster zeigen", it: "Mostra il modello" },
  hideModel: { ru: "Скрыть образец", en: "Hide the model", pl: "Ukryj wzór", es: "Ocultar el modelo", fr: "Masquer le modèle", de: "Muster ausblenden", it: "Nascondi il modello" },
  heardLabel: { ru: "Распознано", en: "Recognised", pl: "Rozpoznano", es: "Reconocido", fr: "Reconnu", de: "Erkannt", it: "Riconosciuto" },
  typedLabel: { ru: "Введено", en: "Typed", pl: "Wpisano", es: "Escrito", fr: "Saisi", de: "Getippt", it: "Digitato" },
  charOk: { ru: "{0}: верно", en: "{0}: correct", pl: "{0}: dobrze", es: "{0}: correcto", fr: "{0} : correct", de: "{0}: richtig", it: "{0}: corretto" },
  charVariant: { ru: "{0}: принято, стандартное написание {1}", en: "{0}: accepted, the standard spelling is {1}", pl: "{0}: zaliczone, standardowa pisownia to {1}", es: "{0}: aceptado, la grafía estándar es {1}", fr: "{0} : accepté, l'orthographe standard est {1}", de: "{0}: akzeptiert, die Standardschreibweise ist {1}", it: "{0}: accettato, la grafia standard è {1}" },
  charWrong: { ru: "{0}: нужно {1}, услышано «{2}»", en: "{0}: expected {1}, got \"{2}\"", pl: "{0}: powinno być {1}, jest \"{2}\"", es: "{0}: se esperaba {1}, llegó \"{2}\"", fr: "{0} : attendu {1}, reçu \"{2}\"", de: "{0}: erwartet {1}, erhalten \"{2}\"", it: "{0}: previsto {1}, ricevuto \"{2}\"" },
  charMissing: { ru: "{0}: пропущено, нужно {1}", en: "{0}: missing, expected {1}", pl: "{0}: brak, powinno być {1}", es: "{0}: falta, se esperaba {1}", fr: "{0} : manquant, attendu {1}", de: "{0}: fehlt, erwartet {1}", it: "{0}: manca, previsto {1}" },
  extraWords: { ru: "Лишние слова в конце: {0}", en: "Extra words at the end: {0}", pl: "Nadmiarowe słowa na końcu: {0}", es: "Palabras de más al final: {0}", fr: "Mots en trop à la fin : {0}", de: "Überzählige Wörter am Ende: {0}", it: "Parole in più alla fine: {0}" },
  spelledOk: { ru: "Передано без ошибок", en: "Spelled without a mistake", pl: "Przeliterowano bez błędu", es: "Deletreado sin errores", fr: "Épelé sans erreur", de: "Fehlerfrei buchstabiert", it: "Spelling senza errori" },
  check: { ru: "Проверить", en: "Check", pl: "Sprawdź", es: "Comprobar", fr: "Vérifier", de: "Prüfen", it: "Verifica" },
  again: { ru: "Ещё раз", en: "Again", pl: "Jeszcze raz", es: "Otra vez", fr: "Encore", de: "Noch einmal", it: "Ancora" },
  nextName: { ru: "Следующее имя", en: "Next name", pl: "Następna nazwa", es: "Siguiente nombre", fr: "Nom suivant", de: "Nächster Name", it: "Nome successivo" },
  silence: {
    ru: "Ничего не услышано. Проверь микрофон и попробуй ещё раз: это не засчитано как ошибка.",
    en: "Nothing was heard. Check the microphone and try again: this was not counted against you.",
    pl: "Nic nie usłyszano. Sprawdź mikrofon i spróbuj ponownie: to nie zostało policzone jako błąd.",
    es: "No se oyó nada. Revisa el micrófono e inténtalo de nuevo: no cuenta como error.",
    fr: "Rien n'a été entendu. Vérifie le micro et réessaie : cela ne compte pas comme une erreur.",
    de: "Es war nichts zu hören. Prüfe das Mikrofon und versuch es noch einmal: Das zählt nicht als Fehler.",
    it: "Non si è sentito nulla. Controlla il microfono e riprova: non conta come errore.",
  },
  sttOff: {
    ru: "Распознавание речи сейчас недоступно. Введи кодовые слова текстом: проверка работает и без него.",
    en: "Speech recognition is unavailable right now. Type the code words instead: checking works without it.",
    pl: "Rozpoznawanie mowy jest teraz niedostępne. Wpisz słowa kodowe: sprawdzanie działa i bez niego.",
    es: "El reconocimiento de voz no está disponible ahora. Escribe las palabras clave: la comprobación funciona sin él.",
    fr: "La reconnaissance vocale est indisponible pour le moment. Tape les mots de code : la vérification fonctionne sans elle.",
    de: "Die Spracherkennung ist gerade nicht verfügbar. Tippe die Codewörter: Die Prüfung funktioniert auch ohne sie.",
    it: "Il riconoscimento vocale ora non è disponibile. Scrivi le parole in codice: la verifica funziona anche senza.",
  },
  typedHint: { ru: "Кодовые слова по-английски", en: "Code words in English", pl: "Słowa kodowe po angielsku", es: "Palabras clave en inglés", fr: "Mots de code en anglais", de: "Codewörter auf Englisch", it: "Parole in codice in inglese" },
  roundIntro: {
    ru: "10 вопросов без подсказок: буквы, кодовые слова и цифры. Звёзды: 3 от 90%, 2 от 70%, 1 от 50%. Лучший результат сохраняется на этом устройстве.",
    en: "10 questions without hints: letters, code words and figures. Stars: 3 from 90%, 2 from 70%, 1 from 50%. Your best result is saved on this device.",
    pl: "10 pytań bez podpowiedzi: litery, słowa kodowe i cyfry. Gwiazdki: 3 od 90%, 2 od 70%, 1 od 50%. Najlepszy wynik zapisuje się na tym urządzeniu.",
    es: "10 preguntas sin pistas: letras, palabras clave y cifras. Estrellas: 3 desde 90%, 2 desde 70%, 1 desde 50%. Tu mejor resultado se guarda en este dispositivo.",
    fr: "10 questions sans indice : lettres, mots de code et chiffres. Étoiles : 3 dès 90 %, 2 dès 70 %, 1 dès 50 %. Ton meilleur résultat est enregistré sur cet appareil.",
    de: "10 Fragen ohne Hinweise: Buchstaben, Codewörter und Ziffern. Sterne: 3 ab 90 %, 2 ab 70 %, 1 ab 50 %. Dein bestes Ergebnis wird auf diesem Gerät gespeichert.",
    it: "10 domande senza suggerimenti: lettere, parole in codice e cifre. Stelle: 3 dal 90%, 2 dal 70%, 1 dal 50%. Il miglior risultato viene salvato su questo dispositivo.",
  },
  startRound: { ru: "Начать раунд", en: "Start the round", pl: "Zacznij rundę", es: "Empezar la ronda", fr: "Commencer la manche", de: "Runde starten", it: "Inizia il round" },
  questionOf: { ru: "Вопрос {0} из {1}", en: "Question {0} of {1}", pl: "Pytanie {0} z {1}", es: "Pregunta {0} de {1}", fr: "Question {0} sur {1}", de: "Frage {0} von {1}", it: "Domanda {0} di {1}" },
  roundDone: { ru: "Раунд завершён", en: "Round complete", pl: "Runda zakończona", es: "Ronda terminada", fr: "Manche terminée", de: "Runde beendet", it: "Round completato" },
  roundScore: { ru: "{0} из {1} верно ({2}%)", en: "{0} of {1} correct ({2}%)", pl: "{0} z {1} dobrze ({2}%)", es: "{0} de {1} correctas ({2}%)", fr: "{0} sur {1} correctes ({2} %)", de: "{0} von {1} richtig ({2} %)", it: "{0} su {1} corrette ({2}%)" },
  starsLabel: { ru: "Звёзды: {0} из 3", en: "Stars: {0} of 3", pl: "Gwiazdki: {0} z 3", es: "Estrellas: {0} de 3", fr: "Étoiles : {0} sur 3", de: "Sterne: {0} von 3", it: "Stelle: {0} su 3" },
  best: { ru: "Лучший результат: {0}%", en: "Best result: {0}%", pl: "Najlepszy wynik: {0}%", es: "Mejor resultado: {0}%", fr: "Meilleur résultat : {0} %", de: "Bestes Ergebnis: {0} %", it: "Miglior risultato: {0}%" },
  reviewMisses: { ru: "Ошибки этого раунда", en: "Mistakes in this round", pl: "Błędy w tej rundzie", es: "Errores de esta ronda", fr: "Erreurs de cette manche", de: "Fehler in dieser Runde", it: "Errori di questo round" },
  retryRound: { ru: "Пройти раунд ещё раз", en: "Take the round again", pl: "Powtórz rundę", es: "Repetir la ronda", fr: "Refaire la manche", de: "Runde wiederholen", it: "Ripeti il round" },
  backToChapter: { ru: "Вернуться к главе", en: "Back to the chapter", pl: "Wróć do rozdziału", es: "Volver al capítulo", fr: "Retour au chapitre", de: "Zurück zum Kapitel", it: "Torna al capitolo" },
  backToPractice: { ru: "К списку практики", en: "Back to Practice", pl: "Wróć do treningu", es: "Volver a la práctica", fr: "Retour à la pratique", de: "Zurück zur Praxis", it: "Torna alla pratica" },
} satisfies Record<string, Copy>;

export type PhoneticCopyKey = keyof typeof PHONETIC_COPY;

/** Fill `{0}`, `{1}` placeholders of an already selected string. */
export function fillCopy(text: string, ...values: (string | number)[]): string {
  return text.replace(/\{(\d+)\}/g, (whole, index: string) => {
    const value = values[Number(index)];
    return value === undefined ? whole : String(value);
  });
}
