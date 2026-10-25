// English examples are the subject of these 60 language exercises.
// Preserve their exact spelling, including deliberately incorrect choices.
// In item 115 the Polish nautical "asysta" means escort, not general assistance.
export const ENGLISH_QUESTION_MEANINGS = {
  "src-1-115": {
    pl: "Potrzebuję asysty.", ru: "Мне нужно сопровождение.", en: "I require an escort.",
    es: "Necesito escolta.", fr: "J'ai besoin d'une escorte.", de: "Ich benötige Geleit.", it: "Ho bisogno di una scorta.",
  },
  "src-1-125": {
    pl: "Zalecam ci przejść na kanał UKF", ru: "Рекомендую вам перейти на канал УКВ.", en: "I advise you to change to VHF channel.",
    es: "Le recomiendo pasar al canal VHF.", fr: "Je vous recommande de passer sur le canal VHF.", de: "Ich empfehle Ihnen, auf den UKW-Kanal zu wechseln.", it: "Vi raccomando di passare al canale VHF.",
  },
  "src-1-133": {
    pl: "Nie odpowiadam za swoje ruchy.", ru: "Мое судно лишено возможности управляться.", en: "I am not under command.",
    es: "Mi buque está sin gobierno.", fr: "Je ne suis pas maître de mes manoeuvres.", de: "Ich kann meine Schiffsbewegungen nicht kontrollieren.", it: "La mia nave non governa.",
  },
  "src-1-167": {
    pl: "Czy jesteś w drodze?", ru: "Вы находитесь на ходу?", en: "Are you under way?",
    es: "¿Está en navegación?", fr: "Êtes-vous en route ?", de: "Sind Sie in Fahrt?", it: "Sei in navigazione?",
  },
} as const;
export const ENGLISH_EXPLANATIONS: Readonly<Record<string, { pl: string; terms: Readonly<Record<string, string>> }>> = {
  "src-1-115": {
    "pl": "Asysta to po angielsku {radioTerm2}, więc poprawny zwrot brzmi {radioTerm1}; {radioTerm0} znaczy potrzebuję pomocy.",
    "terms": {
      "radioTerm0": "I require assistance",
      "radioTerm1": "I require escort",
      "radioTerm2": "escort"
    }
  },
  "src-1-116": {
    "pl": "Standardowy zwrot morski to {radioTerm0}; pozostałe wersje są językowo błędne.",
    "terms": {
      "radioTerm0": "Superstructure on fire"
    }
  },
  "src-1-117": {
    "pl": "'{radioTerm0}' to standardowy morski idiom oznaczający 'nabieram wody' (przeciek kadłuba). '{radioTerm1}' i '{radioTerm2}' są zrozumiałe, ale nie są standardowymi zwrotami słownika morskiego używanego w banku UKE; w starszych wersjach banku właśnie '{radioTerm0}' było opcją kluczowaną jako poprawna.",
    "terms": {
      "radioTerm0": "I am making water",
      "radioTerm1": "I am taking water",
      "radioTerm2": "I am flooding"
    }
  },
  "src-1-118": {
    "pl": "Standardowy zwrot SMCP na prośbę o pomoc to '{radioTerm0}', pozostałe opcje są kalkami językowymi.",
    "terms": {
      "radioTerm0": "Can you render assistance?"
    }
  },
  "src-1-119": {
    "pl": "'{radioTerm0}' to standardowe wyrażenie SMCP oznaczające podjęcie rozbitków z wody.",
    "terms": {
      "radioTerm0": "Pick up survivors"
    }
  },
  "src-1-120": {
    "pl": "'{radioTerm0}' dokładnie oddaje zmniejszenie widzialności z powodu mgły, opcja ze śniegiem dotyczy śniegu.",
    "terms": {
      "radioTerm0": "Visibility is reduced by fog"
    }
  },
  "src-1-121": {
    "pl": "W SMCP polecenie podania liczby rannych brzmi '{radioTerm0}', czasownik '{radioTerm1}' jest standardem meldunkowym.",
    "terms": {
      "radioTerm0": "Report injured persons",
      "radioTerm1": "report"
    }
  },
  "src-1-122": {
    "pl": "'{radioTerm0}' to standardowy meldunek o dobrym stanie rozbitków.",
    "terms": {
      "radioTerm0": "Survivors in good condition"
    }
  },
  "src-1-123": {
    "pl": "'{radioTerm0}' jest poprawne, bo po angielsku pasmo nazywa się VHF, a '{radioTerm1}' oznacza kanał wodny.",
    "terms": {
      "radioTerm0": "Changing to channel ... VHF",
      "radioTerm1": "canal"
    }
  },
  "src-1-124": {
    "pl": "'{radioTerm0}' to poprawny zwięzły meldunek, '{radioTerm2}' to śruba mechaniczna, a '{radioTerm1}' jest błędem gramatycznym.",
    "terms": {
      "radioTerm0": "Propeller damaged",
      "radioTerm1": "propeller are",
      "radioTerm2": "bolt"
    }
  },
  "src-1-125": {
    "pl": "'{radioTerm1}' odpowiada konwencji SMCP '{radioTerm0}', a UKF to skrót wyłącznie polski.",
    "terms": {
      "radioTerm0": "Advise you change to channel",
      "radioTerm1": "Advise go to VHF channel"
    }
  },
  "src-1-126": {
    "pl": "'{radioTerm0}' precyzyjnie podaje dryfowanie z prędkością 2 węzłów.",
    "terms": {
      "radioTerm0": "I am drifting at 2 knots"
    }
  },
  "src-1-127": {
    "pl": "'{radioTerm0}' to standardowe określenie braku zasilania, '{radioTerm2}' i '{radioTerm1}' znaczą co innego.",
    "terms": {
      "radioTerm0": "No power supply",
      "radioTerm1": "no feedback",
      "radioTerm2": "no current"
    }
  },
  "src-1-128": {
    "pl": "'{radioTerm0}' to jedyne poprawne gramatycznie pytanie o czas przybycia pomocy.",
    "terms": {
      "radioTerm0": "When will assistance arrive?"
    }
  },
  "src-1-129": {
    "pl": "SMCP używa zwrotu '{radioTerm0}' do zgłaszania kłopotów z silnikiem głównym.",
    "terms": {
      "radioTerm0": "I have problems with main engine"
    }
  },
  "src-1-130": {
    "pl": "Zwrot SMCP to '{radioTerm0}', gdzie '{radioTerm1}' oznacza przechył, a '{radioTerm2}' lewą burtę.",
    "terms": {
      "radioTerm0": "I have dangerous list to port",
      "radioTerm1": "list",
      "radioTerm2": "port"
    }
  },
  "src-1-131": {
    "pl": "Urządzenie sterowe to po angielsku '{radioTerm1}', stąd '{radioTerm0}'.",
    "terms": {
      "radioTerm0": "I have problems with steering gear",
      "radioTerm1": "steering gear"
    }
  },
  "src-1-132": {
    "pl": "W radiowej skali czytelności 'dobrze' odpowiada słowu '{radioTerm0}' (stopień 4 w skali 1-5).",
    "terms": {
      "radioTerm0": "good"
    }
  },
  "src-1-133": {
    "pl": "'{radioTerm0}' to morski zwrot z COLREG/SMCP oznaczający statek nieodpowiadający za swoje ruchy.",
    "terms": {
      "radioTerm0": "I am not under command"
    }
  },
  "src-1-134": {
    "pl": "Standardowe pytanie o jakość odbioru brzmi '{radioTerm0}'.",
    "terms": {
      "radioTerm0": "How do you read me?"
    }
  },
  "src-1-135": {
    "pl": "'{radioTerm0}' znaczy po zalaniu, '{radioTerm1}' to płynięcie, a '{radioTerm2}' znaczy przed.",
    "terms": {
      "radioTerm0": "After flooding",
      "radioTerm1": "flowing",
      "radioTerm2": "before"
    }
  },
  "src-1-136": {
    "pl": "SMCP potwierdza odbiór słowem '{radioTerm1}', stąd '{radioTerm0}'.",
    "terms": {
      "radioTerm0": "I have received your Mayday signal",
      "radioTerm1": "received"
    }
  },
  "src-1-137": {
    "pl": "'{radioTerm0}' używa poprawnych terminów morskich '{radioTerm2}' (opuścić statek) i '{radioTerm1}' (zderzenie).",
    "terms": {
      "radioTerm0": "I must abandon vessel after collision",
      "radioTerm1": "collision",
      "radioTerm2": "abandon"
    }
  },
  "src-1-138": {
    "pl": "'{radioTerm0}' to standardowy zwrot nakazujący pozostanie w gotowości na kanale radiowym.",
    "terms": {
      "radioTerm0": "Stand by on radio channel"
    }
  },
  "src-1-139": {
    "pl": "Zanurzenie to po angielsku '{radioTerm2}', '{radioTerm1}' to wolna burta, a '{radioTerm0}' to wysokość nad linią wody.",
    "terms": {
      "radioTerm0": "air draft",
      "radioTerm1": "freeboard",
      "radioTerm2": "draft"
    }
  },
  "src-1-140": {
    "pl": "'{radioTerm0}' jest poprawne gramatycznie i zgodne z SMCP, gdzie '{radioTerm1}' znaczy kontynuować żeglugę.",
    "terms": {
      "radioTerm0": "I cannot proceed without assistance",
      "radioTerm1": "proceed"
    }
  },
  "src-1-141": {
    "pl": "'{radioTerm0}' poprawnie oddaje czas dokonany, załoga już opuściła statek.",
    "terms": {
      "radioTerm0": "Crew has abandoned vessel"
    }
  },
  "src-1-142": {
    "pl": "SMCP używa formy '{radioTerm0}', pozostałe opcje są błędne stylistycznie lub gramatycznie.",
    "terms": {
      "radioTerm0": "I have major damage to ..."
    }
  },
  "src-1-143": {
    "pl": "'{radioTerm0}' jest poprawne, bo po angielsku pasmo nazywa się VHF, nie UKF.",
    "terms": {
      "radioTerm0": "Stand by on channel VHF"
    }
  },
  "src-1-144": {
    "pl": "Ofiary wypadku to '{radioTerm0}', natomiast '{radioTerm1}' oznacza rozbitków, którzy przeżyli.",
    "terms": {
      "radioTerm0": "casualties",
      "radioTerm1": "survivors"
    }
  },
  "src-1-145": {
    "pl": "W łączności radiowej prośba o powtórzenie to '{radioTerm0}', słowa '{radioTerm1}' używa się w innym znaczeniu proceduralnym.",
    "terms": {
      "radioTerm0": "Say again",
      "radioTerm1": "repeat"
    }
  },
  "src-1-146": {
    "pl": "'{radioTerm0}' oddaje przewidywane pogorszenie, opcja B opisuje pogarszanie się w tej chwili.",
    "terms": {
      "radioTerm0": "Visibility is expected to decrease"
    }
  },
  "src-1-147": {
    "pl": "'{radioTerm0}' to standardowy meldunek o złym stanie rozbitków.",
    "terms": {
      "radioTerm0": "Survivors in bad condition"
    }
  },
  "src-1-148": {
    "pl": "Poprawna forma to \"{radioTerm0}\", bo strona bierna wymaga \"{radioTerm1}\" plus imiesłów, a pozostałe opcje są gramatycznie błędne.",
    "terms": {
      "radioTerm0": "My radar is damaged",
      "radioTerm1": "is"
    }
  },
  "src-1-149": {
    "pl": "Nieznany obiekt to po angielsku \"{radioTerm0}\", a nie \"{radioTerm2}\" (statek) ani \"{radioTerm1}\" (wrak porzucony).",
    "terms": {
      "radioTerm0": "unknown object",
      "radioTerm1": "derelict",
      "radioTerm2": "vessel"
    }
  },
  "src-1-150": {
    "pl": "Poprawna konstrukcja pytania to \"{radioTerm0}\", pozostałe łamią angielski szyk pytający.",
    "terms": {
      "radioTerm0": "What problems do you have?"
    }
  },
  "src-1-151": {
    "pl": "Rzadka mgła to \"{radioTerm3}\", więc poprawnie jest \"{radioTerm0}\"; \"{radioTerm2}\" to grad, a \"{radioTerm1}\" to mżawka.",
    "terms": {
      "radioTerm0": "Visibility is reduced by mist",
      "radioTerm1": "drizzle",
      "radioTerm2": "hail",
      "radioTerm3": "mist"
    }
  },
  "src-1-152": {
    "pl": "Standardowa fraza SMCP to \"{radioTerm0}\", pozostałe opcje są idiomatycznie lub gramatycznie błędne.",
    "terms": {
      "radioTerm0": "I must leave fairway"
    }
  },
  "src-1-153": {
    "pl": "W procedurze radiotelefonicznej koniec przekazu to \"{radioTerm1}\"; \"{radioTerm0}\" jest błędnym połączeniem dwóch sprzecznych słów proceduralnych.",
    "terms": {
      "radioTerm0": "Over and out",
      "radioTerm1": "Out"
    }
  },
  "src-1-154": {
    "pl": "Poniżej linii wodnej to \"{radioTerm1}\", a przeciek to \"{radioTerm2}\", stąd \"{radioTerm0}\".",
    "terms": {
      "radioTerm0": "I have a leak below water line",
      "radioTerm1": "below water line",
      "radioTerm2": "a leak"
    }
  },
  "src-1-155": {
    "pl": "Pożar opanowany to w SMCP \"{radioTerm0}\", pozostałe formy są gramatycznie niepoprawne.",
    "terms": {
      "radioTerm0": "Fire is under control"
    }
  },
  "src-1-156": {
    "pl": "Pozycja statku w niebezpieczeństwie to \"{radioTerm1}\", więc poprawnie \"{radioTerm0}\".",
    "terms": {
      "radioTerm0": "When will you arrive at distress position?",
      "radioTerm1": "distress position"
    }
  },
  "src-1-157": {
    "pl": "W skali czytelności SMCP \"słabo\" odpowiada \"{radioTerm2}\", stąd \"{radioTerm0}\"; \"{radioTerm1}\" znaczy głośno i wyraźnie.",
    "terms": {
      "radioTerm0": "I read you poor",
      "radioTerm1": "loud and clear",
      "radioTerm2": "poor"
    }
  },
  "src-1-158": {
    "pl": "Standardowa fraza SMCP na osłonięcie od wiatru to \"{radioTerm0}\".",
    "terms": {
      "radioTerm0": "Make a lee for me"
    }
  },
  "src-1-159": {
    "pl": "Cisza radiowa to \"{radioTerm1}\", a poprawna konstrukcja to \"{radioTerm0}\".",
    "terms": {
      "radioTerm0": "You must keep radio silence in this area",
      "radioTerm1": "radio silence"
    }
  },
  "src-1-160": {
    "pl": "Fraza SMCP brzmi \"{radioTerm0}\"; \"{radioTerm3}\" zamiast \"{radioTerm2}\" i \"{radioTerm1}\" są błędne.",
    "terms": {
      "radioTerm0": "I have lost person overboard",
      "radioTerm1": "threw person",
      "radioTerm2": "fell",
      "radioTerm3": "felt"
    }
  },
  "src-1-161": {
    "pl": "Poprawnie w czasie teraźniejszym: \"{radioTerm0}\", zgodnie ze standardem SMCP.",
    "terms": {
      "radioTerm0": "I am manoeuvring with difficulty"
    }
  },
  "src-1-162": {
    "pl": "Słowo proceduralne na poprawkę błędu to \"{radioTerm1}\", stąd \"{radioTerm0}\".",
    "terms": {
      "radioTerm0": "Mistake, correction",
      "radioTerm1": "correction"
    }
  },
  "src-1-163": {
    "pl": "Fraza SMCP to \"{radioTerm0}\"; \"{radioTerm1}\" i \"{radioTerm2}\" nie są standardowymi zwrotami.",
    "terms": {
      "radioTerm0": "You are obstructing other traffic",
      "radioTerm1": "disturb",
      "radioTerm2": "hamper"
    }
  },
  "src-1-164": {
    "pl": "Pomoc w żegludze to \"{radioTerm1}\", a poprawna gramatyka wymaga \"{radioTerm0}\".",
    "terms": {
      "radioTerm0": "I try to proceed without assistance",
      "radioTerm1": "assistance"
    }
  },
  "src-1-165": {
    "pl": "Wysokość nadwodna statku to w terminologii morskiej \"{radioTerm1}\" ({radioTerm0}).",
    "terms": {
      "radioTerm0": "air draught",
      "radioTerm1": "air draft"
    }
  },
  "src-1-166": {
    "pl": "Zejście z mielizny to \"{radioTerm1}\", a przypływ to rosnąca woda, stąd \"{radioTerm0}\".",
    "terms": {
      "radioTerm0": "Can you refloat when tide rises?",
      "radioTerm1": "refloat"
    }
  },
  "src-1-167": {
    "pl": "Statek w drodze to \"{radioTerm1}\", więc poprawne pytanie brzmi \"{radioTerm0}\".",
    "terms": {
      "radioTerm0": "Are you under way?",
      "radioTerm1": "under way"
    }
  },
  "src-1-168": {
    "pl": "W ostrzeżeniach nawigacyjnych nieświecąca pława świetlna to \"{radioTerm0}\".",
    "terms": {
      "radioTerm0": "lightbuoy unlit"
    }
  },
  "src-1-169": {
    "pl": "Najprostsza i poprawna forma komunikatu to \"{radioTerm0}\", pozostałe są zniekształcone gramatycznie.",
    "terms": {
      "radioTerm0": "Fishing nets in fairway"
    }
  },
  "src-1-170": {
    "pl": "Rozprzestrzenianie się ognia to \"{radioTerm0}\"; \"{radioTerm2}\" znaczy nasila się, a \"{radioTerm1}\" słabnie.",
    "terms": {
      "radioTerm0": "Fire is spreading",
      "radioTerm1": "decreasing",
      "radioTerm2": "increasing"
    }
  },
  "src-1-171": {
    "pl": "Poprawny imiesłów to \"{radioTerm1}\", stąd \"{radioTerm0}\".",
    "terms": {
      "radioTerm0": "Your signal understood, over",
      "radioTerm1": "understood"
    }
  },
  "src-1-172": {
    "pl": "Odpływ, czyli opadanie wody, to po angielsku \"{radioTerm0}\", zgodnie ze standardową frazeologią.",
    "terms": {
      "radioTerm0": "tide falling"
    }
  },
  "src-1-173": {
    "pl": "Potwierdzenie odbioru to \"{radioTerm1}\", więc poprawnie \"{radioTerm0}\".",
    "terms": {
      "radioTerm0": "Please acknowledge message",
      "radioTerm1": "acknowledge"
    }
  },
  "src-1-174": {
    "pl": "Prawa burta to \"{radioTerm1}\", a przechył to \"{radioTerm2}\", stąd \"{radioTerm0}\".",
    "terms": {
      "radioTerm0": "I have dangerous list to starboard",
      "radioTerm1": "starboard",
      "radioTerm2": "list"
    }
  }
};
