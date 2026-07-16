import type { Vessel } from '@/app/radio/symulator/radioModel';

export const VOICE_KINDS = [
  'mayday-fire', 'panpan-mob', 'panpan-engine',
  'securite-hazard', 'radio-check', 'cancel-false',
  'routine-marina', 'routine-ship', 'routine-group',
  'panpan-medico', 'vts-report', 'mayday-relay',
  'mayday-ack', 'answer-call',
] as const;
export type VoiceKind = (typeof VOICE_KINDS)[number];

export interface VoiceGradeInput {
  kind: VoiceKind;
  transcript: string;
  vessel: Vessel;
  positionSpoken: string;
  pob: number;
}

export interface VoiceCheckResult {
  id: string;
  label: string;
  ok: boolean;
  /** A defining element (the distress/urgency/safety signal or its equivalent):
   *  its absence disqualifies the transmission no matter how high the % score. */
  mandatory?: boolean;
}

/**
 * The load-bearing element of each emergency transmission. A MAYDAY without
 * MAYDAY, a PAN-PAN said as a SECURITE, a distress cancel without the cancel
 * phrase - each must FAIL, not merely lose ~1/8 of the score. Keyed by check id.
 */
const MANDATORY_CHECK_IDS = new Set(['mayday3', 'panpan3', 'securite3', 'relay3', 'received', 'cancel']);

interface Check {
  id: string;
  label: string;
  test: (text: string) => boolean;
}

export function normalizeRadioTranscript(text: string): string {
  return text
    .toLowerCase()
    .replace(/[.,!?;:'"()\-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function escRe(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function count(text: string, re: RegExp): number {
  return text.match(re)?.length ?? 0;
}

function phrase(text: string, value: string): boolean {
  const words = normalizeRadioTranscript(value).split(' ').filter(Boolean).map(escRe);
  return new RegExp(words.join('\\s+')).test(text);
}

const DIGIT_WORDS: Record<string, string> = {
  '0': '(?:0|zero|oh)', '1': '(?:1|one)', '2': '(?:2|two)', '3': '(?:3|three)',
  '4': '(?:4|four)', '5': '(?:5|five)', '6': '(?:6|six)', '7': '(?:7|seven)',
  '8': '(?:8|eight)', '9': '(?:9|nine|niner)',
};

function digitSequenceRe(value: string): RegExp {
  const pattern = value.split('').map((digit) => DIGIT_WORDS[digit] ?? escRe(digit)).join('\\s*');
  return new RegExp(pattern);
}

function exactIdentity(text: string, vessel: Vessel): boolean {
  const exactMmsi = digitSequenceRe(vessel.mmsi).test(text);
  const exactCall = /call\s+sign/.test(text) && digitSequenceRe(vessel.call.replace(/\D/g, '')).test(text);
  return exactMmsi || exactCall;
}

function exactPosition(text: string, positionSpoken: string): boolean {
  const tokens = normalizeRadioTranscript(positionSpoken).split(' ');
  const north = tokens.indexOf('north');
  const east = tokens.indexOf('east');
  if (north < 2 || east < north + 3) return false;
  const lat = tokens.slice(0, north).join(' ');
  const lon = tokens.slice(north + 1, east).join(' ');
  return phrase(text, lat) && text.includes('north') && phrase(text, lon) && text.includes('east');
}

const NUMBER_TOKEN = /^(?:\d+|zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred)$/;

/**
 * The person count must be the token that DIRECTLY precedes person/people/crew/
 * souls, and must not itself be the tail of a larger number. Otherwise pob=1
 * grades correct on "twenty one persons on board" - the count that was spoken is
 * twenty-one, not one.
 */
function exactPob(text: string, pob: number): boolean {
  const word = ['zero', 'one', 'two', 'three', 'four', 'five', 'six'][pob] ?? String(pob);
  const tokens = text.split(' ');
  for (let i = 1; i < tokens.length; i++) {
    if (!/^(?:persons?|people|crew|souls)$/.test(tokens[i])) continue;
    const prev = tokens[i - 1];
    if (prev !== String(pob) && prev !== word) continue;
    if (tokens[i - 2] && NUMBER_TOKEN.test(tokens[i - 2])) continue; // e.g. "twenty one persons"
    return true;
  }
  return false;
}

function ordered(text: string, values: RegExp[]): boolean {
  let from = 0;
  for (const re of values) {
    const match = re.exec(text.slice(from));
    if (!match) return false;
    from += match.index + match[0].length;
  }
  return true;
}

function commonIdentityChecks(vessel: Vessel): Check[] {
  return [
    { id: 'thisis', label: 'THIS IS + nazwa', test: (t) => /this is/.test(t) && phrase(t, vessel.name) },
    { id: 'name', label: `nazwa jednostki (${vessel.name})`, test: (t) => phrase(t, vessel.name) },
    { id: 'ident', label: 'dokladny MMSI lub znak wywolawczy', test: (t) => exactIdentity(t, vessel) },
  ];
}

function buildChecks(input: VoiceGradeInput): Check[] {
  const position: Check = {
    id: 'position',
    label: `dokladna pozycja (${input.positionSpoken})`,
    test: (t) => exactPosition(t, input.positionSpoken),
  };
  const persons: Check = {
    id: 'persons',
    label: `dokladna liczba osob (${input.pob})`,
    test: (t) => exactPob(t, input.pob),
  };
  const identity = commonIdentityChecks(input.vessel);

  switch (input.kind) {
    case 'mayday-fire':
      return [
        { id: 'mayday3', label: 'MAYDAY x3', test: (t) => count(t, /may\s?day/g) >= 3 },
        ...identity, position,
        { id: 'nature', label: 'rodzaj zagrozenia (fire)', test: (t) => /(fire|explosion|burning)/.test(t) },
        { id: 'assist', label: 'potrzebna pomoc', test: (t) => /(immediate assistance|require assistance|need help)/.test(t) },
        persons,
        { id: 'order', label: 'kolejnosc: alarm -> identyfikacja -> pozycja -> zagrozenie', test: (t) => ordered(t, [/may\s?day/, /this is/, /position/, /(fire|explosion|burning)/]) },
        { id: 'over', label: 'OVER na koncu', test: (t) => /\bover$/.test(t) },
      ];
    case 'panpan-mob':
      return [
        { id: 'panpan3', label: 'PAN PAN x3', test: (t) => count(t, /pan\s?pan/g) >= 3 },
        { id: 'allstations', label: 'ALL STATIONS x3', test: (t) => count(t, /all (?:stations|ships)/g) >= 3 },
        ...identity, position,
        { id: 'mob', label: 'czlowiek za burta', test: (t) => /(man overboard|person in (?:the )?water)/.test(t) },
        { id: 'request', label: 'polecenie dla ruchu wokol', test: (t) => /(keep clear|reduce wake|stand by|assist)/.test(t) },
        { id: 'order', label: 'kolejnosc: PAN PAN -> ALL STATIONS -> THIS IS -> pozycja', test: (t) => ordered(t, [/pan\s?pan/, /all (?:stations|ships)/, /this is/, /position/]) },
        { id: 'over', label: 'OVER na koncu', test: (t) => /\bover$/.test(t) },
      ];
    case 'panpan-engine':
      return [
        { id: 'panpan3', label: 'PAN PAN x3', test: (t) => count(t, /pan\s?pan/g) >= 3 },
        { id: 'allstations', label: 'ALL STATIONS x3', test: (t) => count(t, /all (?:stations|ships)/g) >= 3 },
        ...identity, position,
        { id: 'nature', label: 'awaria i dryf', test: (t) => /(engine|breakdown|disabled)/.test(t) && /(drift|drifting)/.test(t) },
        { id: 'tow', label: 'prosba o holowanie', test: (t) => /(tow|towing assistance)/.test(t) },
        persons,
        { id: 'order', label: 'kolejnosc: PAN PAN -> identyfikacja -> pozycja -> sytuacja', test: (t) => ordered(t, [/pan\s?pan/, /this is/, /position/, /(engine|breakdown|disabled)/]) },
        { id: 'over', label: 'OVER na koncu', test: (t) => /\bover$/.test(t) },
      ];
    case 'securite-hazard':
      return [
        { id: 'securite3', label: 'SECURITE x3', test: (t) => count(t, /(securite|security|say curitay)/g) >= 3 },
        { id: 'allstations', label: 'ALL STATIONS x3', test: (t) => count(t, /all (?:stations|ships)/g) >= 3 },
        ...identity.slice(0, 2), position,
        { id: 'hazard', label: 'opis niebezpieczenstwa', test: (t) => /(container|hazard|obstruction|submerged|debris)/.test(t) },
        { id: 'advice', label: 'zalecenie dla innych jednostek', test: (t) => /(keep sharp lookout|keep clear|navigate with caution)/.test(t) },
        { id: 'order', label: 'kolejnosc: SECURITE -> ALL STATIONS -> identyfikacja -> ostrzezenie', test: (t) => ordered(t, [/(securite|security)/, /all (?:stations|ships)/, /this is/, /(container|hazard|obstruction|submerged|debris)/]) },
        { id: 'out', label: 'OUT na koncu', test: (t) => /\bout$/.test(t) },
      ];
    case 'radio-check':
      return [
        { id: 'station', label: 'MARINA GDYNIA x2', test: (t) => count(t, /marina gdynia/g) >= 2 },
        ...identity.slice(0, 2),
        { id: 'check', label: 'RADIO CHECK', test: (t) => /(radio check|how do you read)/.test(t) },
        { id: 'order', label: 'kolejnosc: stacja -> THIS IS -> RADIO CHECK', test: (t) => ordered(t, [/marina gdynia/, /this is/, /(radio check|how do you read)/]) },
        { id: 'over', label: 'OVER na koncu', test: (t) => /\bover$/.test(t) },
      ];
    case 'cancel-false':
      return [
        { id: 'allstations', label: 'ALL STATIONS x3', test: (t) => count(t, /all (?:stations|ships)/g) >= 3 },
        ...identity, position,
        { id: 'cancel', label: 'CANCEL MY DISTRESS ALERT', test: (t) => /cancel my distress alert/.test(t) },
        { id: 'when', label: 'data i czas UTC', test: (t) => /(today|date)/.test(t) && /utc/.test(t) },
        { id: 'order', label: 'kolejnosc: ALL STATIONS -> identyfikacja -> odwolanie', test: (t) => ordered(t, [/all (?:stations|ships)/, /this is/, /cancel my distress alert/]) },
        { id: 'out', label: 'OUT na koncu', test: (t) => /\bout$/.test(t) },
      ];
    case 'routine-marina':
      return [
        { id: 'station', label: 'MARINA GDYNIA x2', test: (t) => count(t, /marina gdynia/g) >= 2 },
        ...identity.slice(0, 2),
        { id: 'request', label: 'tresc: prosba (miejsce/wejscie/postoj)', test: (t) => /(berth|mooring|moorage|slip|enter|entry|permission|space|place|water|fuel)/.test(t) },
        { id: 'order', label: 'kolejnosc: stacja -> THIS IS -> prosba', test: (t) => ordered(t, [/marina gdynia/, /this is/, /(berth|mooring|enter|permission|space|place|water|fuel)/]) },
        { id: 'over', label: 'OVER na koncu', test: (t) => /\bover$/.test(t) },
      ];
    case 'routine-ship':
      return [
        { id: 'station', label: 'wywolywana jednostka (TRAINING SHIP) x2', test: (t) => count(t, /training ship/g) >= 2 },
        ...identity.slice(0, 2),
        { id: 'order', label: 'kolejnosc: wywolywany -> THIS IS', test: (t) => ordered(t, [/training ship/, /this is/]) },
        { id: 'over', label: 'OVER na koncu', test: (t) => /\bover$/.test(t) },
      ];
    case 'routine-group':
      return [
        { id: 'group', label: 'wywolanie grupowe (REGATTA FLEET x2)', test: (t) => count(t, /(regatta fleet|regatta group|fleet)/g) >= 2 },
        ...identity.slice(0, 2),
        { id: 'order', label: 'kolejnosc: grupa -> THIS IS', test: (t) => ordered(t, [/(regatta fleet|fleet)/, /this is/]) },
        { id: 'over', label: 'OVER na koncu', test: (t) => /\bover$/.test(t) },
      ];
    case 'panpan-medico':
      return [
        { id: 'panpan3', label: 'PAN PAN x3', test: (t) => count(t, /pan\s?pan/g) >= 3 },
        { id: 'allstations', label: 'ALL STATIONS x3 (lub stacja brzegowa)', test: (t) => count(t, /all (?:stations|ships)/g) >= 3 || /(polish rescue radio|coast|radio medico)/.test(t) },
        ...identity, position,
        { id: 'medico', label: 'prosba o porade/pomoc medyczna', test: (t) => /(medical|medico|doctor|injur|casualty|ambulance|unconscious|bleeding)/.test(t) },
        { id: 'order', label: 'kolejnosc: PAN PAN -> identyfikacja -> pozycja -> medyczne', test: (t) => ordered(t, [/pan\s?pan/, /this is/, /position/, /(medical|medico|doctor|injur|casualty)/]) },
        { id: 'over', label: 'OVER na koncu', test: (t) => /\bover$/.test(t) },
      ];
    case 'vts-report':
      return [
        { id: 'station', label: 'VTS ZATOKA GDANSKA x2', test: (t) => count(t, /(vts zatoka|zatoka gdansk|vts gdansk|traffic gdansk)/g) >= 2 },
        ...identity.slice(0, 2), position,
        { id: 'report', label: 'meldunek (wejscie/wyjscie/kurs/zamiar)', test: (t) => /(inbound|outbound|proceeding|entering|leaving|departing|course|bound for|report)/.test(t) },
        { id: 'order', label: 'kolejnosc: VTS -> THIS IS -> pozycja', test: (t) => ordered(t, [/(vts|zatoka|traffic)/, /this is/, /position/]) },
        { id: 'over', label: 'OVER na koncu', test: (t) => /\bover$/.test(t) },
      ];
    case 'mayday-relay':
      return [
        { id: 'relay3', label: 'MAYDAY RELAY x3', test: (t) => count(t, /may\s?day relay/g) >= 3 },
        ...identity.slice(0, 2),
        { id: 'casualty', label: 'nazwa jednostki w niebezpieczenstwie', test: (t) => /(neptun|casualty|distressed|the vessel|the yacht)/.test(t) },
        { id: 'position', label: 'pozycja jednostki w niebezpieczenstwie', test: (t) => /position/.test(t) },
        { id: 'nature', label: 'rodzaj zagrozenia', test: (t) => /(sinking|fire|flooding|aground|grounding|collision|abandon|taking water|help)/.test(t) },
        { id: 'order', label: 'kolejnosc: MAYDAY RELAY -> THIS IS -> pozycja', test: (t) => ordered(t, [/may\s?day relay/, /this is/, /position/]) },
        { id: 'over', label: 'OVER na koncu', test: (t) => /\bover$/.test(t) },
      ];
    case 'mayday-ack':
      return [
        { id: 'casualty', label: 'MAYDAY + nazwa jednostki w niebezpieczenstwie x3', test: (t) => count(t, /neptun/g) >= 3 },
        ...identity.slice(0, 2),
        { id: 'received', label: 'RECEIVED MAYDAY', test: (t) => /received may\s?day/.test(t) },
        { id: 'order', label: 'kolejnosc: nazwa -> THIS IS -> RECEIVED MAYDAY', test: (t) => ordered(t, [/neptun/, /this is/, /received may\s?day/]) },
        { id: 'over', label: 'OVER na koncu', test: (t) => /\bover$/.test(t) },
      ];
    case 'answer-call':
      return [
        { id: 'station', label: 'wywolujaca jednostka (TRAINING SHIP) x2', test: (t) => count(t, /training ship/g) >= 2 },
        ...identity.slice(0, 2),
        { id: 'order', label: 'kolejnosc: wywolujacy -> THIS IS', test: (t) => ordered(t, [/training ship/, /this is/]) },
        { id: 'over', label: 'OVER na koncu', test: (t) => /\bover$/.test(t) },
      ];
  }
}

export function gradeVoiceTransmission(input: VoiceGradeInput): {
  transcript: string;
  checks: VoiceCheckResult[];
  score: number;
  /** false when a defining element (MAYDAY/PAN-PAN/SECURITE/RELAY/RECEIVED/CANCEL)
   *  is missing - the caller must treat that as a fail regardless of the score. */
  mandatoryOk: boolean;
} {
  const text = normalizeRadioTranscript(input.transcript);
  const checks = buildChecks(input).map((check) => ({
    id: check.id,
    label: check.label,
    ok: check.test(text),
    ...(MANDATORY_CHECK_IDS.has(check.id) ? { mandatory: true } : {}),
  }));
  const score = Math.round((checks.filter((check) => check.ok).length / checks.length) * 100);
  const mandatoryOk = checks.every((check) => !check.mandatory || check.ok);
  return { transcript: input.transcript, checks, score, mandatoryOk };
}
