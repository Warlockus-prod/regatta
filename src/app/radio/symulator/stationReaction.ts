// ============================================================================
// What the other station says back when your transmission was WRONG or unreadable.
//
// stationReply.ts is the SUCCESS answer (you did it right, here is the reply).
// This is its adversarial twin, the "like real life" part the owner asked for:
// a poor or incomplete call gets a spoken RE-PROMPT ("say again", "what is your
// position, over") instead of silence, so the learner hears the correction and
// tries again - exactly what a real coast station does.
//
// The lines are a small FIXED bank (vessel-agnostic on purpose, so they are all
// pre-generated static and reused across the live dialogue and the simulator).
// scripts/pregen-radio-audio.mjs bakes every REACTION_LINES entry.
// ============================================================================

export interface Reaction {
  /** who re-prompts, for the log */
  station: string;
  /** spoken re-prompt (radio English) */
  say: string;
  /** why this fired, for the log gloss [pl, ru] */
  why: readonly [string, string];
}

const RESCUE = 'POLISH RESCUE RADIO';

// Ordered by priority: the FIRST missed thing that matches wins, because that is
// what a real operator asks about first (is anyone there / is it a mayday / where
// are you / who are you / how many / finish properly).
const REACTIONS: { match: (ids: Set<string>, distress: boolean) => boolean; r: Reaction }[] = [
  {
    // nothing usable came through
    match: (ids) => ids.has('__unreadable__'),
    r: { station: RESCUE, say: 'STATION CALLING, YOU ARE UNREADABLE. SAY AGAIN, OVER.', why: ['nieczytelne - stacja prosi o powtorzenie', 'неразборчиво, станция просит повторить'] },
  },
  {
    // the distress signal itself was missing/wrong in a distress call
    match: (ids, distress) => distress && (ids.has('mayday') || ids.has('mayday3') || ids.has('panpan') || ids.has('panpan3') || ids.has('securite') || ids.has('securite3')),
    r: { station: RESCUE, say: 'STATION IN DISTRESS, SAY AGAIN YOUR DISTRESS SIGNAL, OVER.', why: ['brak/niepelny sygnal alarmowy', 'нет или неполный сигнал бедствия'] },
  },
  {
    match: (ids) => ids.has('position'),
    r: { station: RESCUE, say: 'WHAT IS YOUR POSITION, OVER.', why: ['brak pozycji', 'нет позиции'] },
  },
  {
    match: (ids) => ids.has('pob') || ids.has('persons'),
    r: { station: RESCUE, say: 'HOW MANY PERSONS ON BOARD, OVER.', why: ['brak liczby osob na pokladzie', 'нет числа людей на борту'] },
  },
  {
    match: (ids) => ids.has('nature'),
    r: { station: RESCUE, say: 'SAY AGAIN THE NATURE OF YOUR DISTRESS, OVER.', why: ['brak rodzaju niebezpieczenstwa', 'нет характера бедствия'] },
  },
  {
    match: (ids) => ids.has('assistance') || ids.has('request'),
    r: { station: RESCUE, say: 'SAY AGAIN WHAT ASSISTANCE YOU REQUIRE, OVER.', why: ['brak prosby o pomoc', 'нет запроса помощи'] },
  },
  {
    match: (ids) => ids.has('identity') || ids.has('callsign') || ids.has('thisIs') || ids.has('mmsi'),
    r: { station: RESCUE, say: 'STATION CALLING, SAY AGAIN YOUR NAME AND CALL SIGN, OVER.', why: ['brak nazwy/znaku wywolawczego', 'нет названия или позывного'] },
  },
  {
    match: (ids) => ids.has('over') || ids.has('out'),
    r: { station: RESCUE, say: 'SAY AGAIN AND FINISH WITH OVER.', why: ['brak zwrotu koncowego OVER/OUT', 'нет завершающего OVER/OUT'] },
  },
];

const FALLBACK: Reaction = {
  station: RESCUE,
  say: 'SAY AGAIN, OVER.',
  why: ['przekaz niepelny - stacja prosi o powtorzenie', 'передача неполная, станция просит повторить'],
};

/** Every spoken line in the bank, for pre-generation. */
export const REACTION_LINES: readonly string[] = [
  ...REACTIONS.map((x) => x.r.say),
  FALLBACK.say,
];

/**
 * Choose the re-prompt for a failed transmission.
 * @param missedIds  ids of the must-items / checks that did NOT pass
 * @param opts.distress  true for a MAYDAY / PAN-PAN / SECURITE kind
 * @param opts.unreadable  true when nothing gradeable came back (empty / garbage)
 */
export function pickReaction(
  missedIds: readonly string[],
  opts: { distress?: boolean; unreadable?: boolean } = {},
): Reaction {
  const ids = new Set(missedIds);
  if (opts.unreadable) ids.add('__unreadable__');
  const hit = REACTIONS.find((x) => x.match(ids, Boolean(opts.distress)));
  return hit ? hit.r : FALLBACK;
}
