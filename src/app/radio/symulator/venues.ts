// ============================================================================
// Where a scenario run takes place (owner, 2026-10-24: "the cases should not
// all be Gdynia: Turkey, Spain, England"). Every run draws one venue among
// those that have what the scenario needs: a coast station for anything DSC
// or distress, a marina for the marina calls, a VTS for the traffic report.
//
// Only facts we could check go here, because a trainer that invents a coast
// station's number teaches the wrong number:
//   - Gulf of Gdańsk: Polish Rescue Radio 002618102, Marina Gdynia 12, VTS
//     Zatoka Gdańska 71 (as before, docs/design/sternik-radio.md).
//   - The Solent: Solent Coastguard 002320011 (RYA list of HM Coastguard
//     MMSIs), working channel 67; Lymington Yacht Haven on 80 (the marina's
//     own page); Southampton VTS on 12, 14 secondary (Southampton VTS notices).
//   - Bay of Palma: Palma coast station of CCR Valencia, DSC 002241024, Palma
//     coordination channel 72 (Spanish Ministry of Transport, national coast
//     station network); Real Club Náutico de Palma on 9.
//   - Bodrum: Milta Bodrum Marina on 73. No Turkish VHF coast-station MMSI
//     could be verified, so Bodrum has no coast station and only hosts the
//     marina calls and the scenarios that need no shore station.
// Positions are open water inside each area (approximate, for training).
// ============================================================================

import type { Lang } from '@/lib/languages';
import { COAST_MMSI, COAST_STATION, GDANSK_CHANNEL_LABELS, type DscAddress, type RadioState } from './radioModel';

export type VenueId = 'gdansk' | 'solent' | 'palma' | 'bodrum';
export type PlaceNeed = 'coast' | 'marina' | 'vts';
export type Localized = Record<Lang, string>;

export interface VenuePosition { lat: string; lon: string; spoken: string }

export interface Venue {
  id: VenueId;
  /** the sea area, in the nominative (the texts put it in parentheses or after a colon) */
  area: Localized;
  coast: {
    /** as said on air */
    call: string;
    /** as written in the explanations */
    display: string;
    mmsi: string;
    /** the working channel the station sends you to, spoken */
    workSpoken: string;
  } | null;
  marina: { call: string; display: string; channel: string; note: Localized } | null;
  vts: { call: string; display: string; channel: string; port: string } | null;
  /** extra LCD labels for local working channels */
  channelLabels: Readonly<Record<string, string>>;
  positions: readonly VenuePosition[];
  /** where the vessel in distress is in the receiving-side scenarios */
  rxDistress: VenuePosition;
}

export const VENUES: readonly Venue[] = [
  {
    id: 'gdansk',
    area: { pl: 'Zatoka Gdańska', ru: 'Гданьский залив', en: 'Gulf of Gdańsk', es: 'golfo de Gdansk', fr: 'baie de Gdańsk', de: 'Danziger Bucht', it: 'golfo di Danzica' },
    coast: { call: COAST_STATION, display: 'Polish Rescue Radio', mmsi: COAST_MMSI, workSpoken: 'SIX SEVEN' },
    marina: {
      call: 'MARINA GDYNIA',
      display: 'Marina Gdynia',
      channel: '12',
      note: {
        pl: 'W Polsce porty i mariny pracują na kanałach 10, 12 i 14 (Marina Gdynia: 12, port Gdańsk: 14).',
        ru: 'В Польше порты и марины работают на каналах 10, 12 и 14 (марина Гдыня: 12, порт Гданьск: 14).',
        en: 'In Poland ports and marinas work on channels 10, 12 and 14 (Marina Gdynia: 12, Gdańsk port: 14).',
        es: 'En Polonia, puertos y marinas trabajan en los canales 10, 12 y 14 (Marina Gdynia: 12, puerto de Gdansk: 14).',
        fr: 'En Pologne, ports et marinas travaillent sur les canaux 10, 12 et 14 (Marina Gdynia : 12, port de Gdańsk : 14).',
        de: 'In Polen arbeiten Häfen und Marinas auf den Kanälen 10, 12 und 14 (Marina Gdynia: 12, Hafen Danzig: 14).',
        it: 'In Polonia porti e marina lavorano sui canali 10, 12 e 14 (Marina Gdynia: 12, porto di Danzica: 14).',
      },
    },
    vts: { call: 'VTS ZATOKA GDANSKA', display: 'VTS Zatoka Gdańska', channel: '71', port: 'GDYNIA' },
    channelLabels: GDANSK_CHANNEL_LABELS,
    positions: [
      { lat: '54°30.5N', lon: '018°45.2E', spoken: '54 30.5 NORTH, 018 45.2 EAST' },
      { lat: '54°38.1N', lon: '018°33.7E', spoken: '54 38.1 NORTH, 018 33.7 EAST' },
      { lat: '54°25.9N', lon: '018°57.4E', spoken: '54 25.9 NORTH, 018 57.4 EAST' },
    ],
    rxDistress: { lat: '54°40.0N', lon: '018°50.0E', spoken: '54 40 NORTH, 018 50 EAST' },
  },
  {
    id: 'solent',
    area: { pl: 'Solent (Anglia)', ru: 'Солент (Англия)', en: 'the Solent (England)', es: 'el Solent (Inglaterra)', fr: 'le Solent (Angleterre)', de: 'Solent (England)', it: 'il Solent (Inghilterra)' },
    coast: { call: 'SOLENT COASTGUARD', display: 'Solent Coastguard', mmsi: '002320011', workSpoken: 'SIX SEVEN' },
    marina: {
      call: 'LYMINGTON YACHT HAVEN',
      display: 'Lymington Yacht Haven',
      channel: '80',
      note: {
        pl: 'W Wielkiej Brytanii mariny pracują na kanale 80 (Lymington Yacht Haven: 80); kanały 12 i 14 w Solencie należą do Southampton VTS.',
        ru: 'В Великобритании марины работают на канале 80 (Lymington Yacht Haven: 80); каналы 12 и 14 в Соленте принадлежат Southampton VTS.',
        en: 'In the UK marinas work on channel 80 (Lymington Yacht Haven: 80); in the Solent, channels 12 and 14 belong to Southampton VTS.',
        es: 'En el Reino Unido las marinas trabajan en el canal 80 (Lymington Yacht Haven: 80); en el Solent, los canales 12 y 14 son de Southampton VTS.',
        fr: 'Au Royaume-Uni, les marinas travaillent sur le canal 80 (Lymington Yacht Haven : 80) ; dans le Solent, les canaux 12 et 14 sont ceux de Southampton VTS.',
        de: 'In Großbritannien arbeiten Marinas auf Kanal 80 (Lymington Yacht Haven: 80); im Solent gehören die Kanäle 12 und 14 dem Southampton VTS.',
        it: 'Nel Regno Unito i marina lavorano sul canale 80 (Lymington Yacht Haven: 80); nel Solent i canali 12 e 14 sono di Southampton VTS.',
      },
    },
    vts: { call: 'SOUTHAMPTON VTS', display: 'Southampton VTS', channel: '12', port: 'SOUTHAMPTON' },
    channelLabels: { '12': 'Southampton VTS', '14': 'Southampton VTS', '67': 'Coastguard', '80': 'UK marinas' },
    positions: [
      { lat: '50°43.4N', lon: '001°30.2W', spoken: '50 43.4 NORTH, 001 30.2 WEST' },
      { lat: '50°46.6N', lon: '001°17.4W', spoken: '50 46.6 NORTH, 001 17.4 WEST' },
      { lat: '50°45.5N', lon: '001°07.5W', spoken: '50 45.5 NORTH, 001 07.5 WEST' },
    ],
    rxDistress: { lat: '50°41.0N', lon: '001°38.0W', spoken: '50 41 NORTH, 001 38 WEST' },
  },
  {
    id: 'palma',
    area: { pl: 'Zatoka Palmy (Majorka)', ru: 'бухта Пальма (Майорка)', en: 'Bay of Palma (Mallorca)', es: 'bahía de Palma (Mallorca)', fr: 'baie de Palma (Majorque)', de: 'Bucht von Palma (Mallorca)', it: 'baia di Palma (Maiorca)' },
    coast: { call: 'PALMA RADIO', display: 'Palma Radio', mmsi: '002241024', workSpoken: 'SEVEN TWO' },
    marina: {
      call: 'REAL CLUB NAUTICO DE PALMA',
      display: 'Real Club Náutico de Palma',
      channel: '09',
      note: {
        pl: 'W hiszpańskich portach jachtowych zwykle pracuje się na kanale 9 (Real Club Náutico de Palma: 9).',
        ru: 'В испанских яхтенных портах обычно работают на канале 9 (Real Club Náutico de Palma: 9).',
        en: 'Spanish yacht harbours usually work on channel 9 (Real Club Náutico de Palma: 9).',
        es: 'Los puertos deportivos españoles suelen trabajar en el canal 9 (Real Club Náutico de Palma: 9).',
        fr: 'Les ports de plaisance espagnols travaillent en général sur le canal 9 (Real Club Náutico de Palma : 9).',
        de: 'Spanische Yachthäfen arbeiten meist auf Kanal 9 (Real Club Náutico de Palma: 9).',
        it: 'I porti turistici spagnoli lavorano di solito sul canale 9 (Real Club Náutico de Palma: 9).',
      },
    },
    vts: null,
    channelLabels: { '09': 'Palma marinas', '72': 'Salvamento Palma' },
    positions: [
      { lat: '39°30.0N', lon: '002°38.0E', spoken: '39 30.0 NORTH, 002 38.0 EAST' },
      { lat: '39°27.0N', lon: '002°34.0E', spoken: '39 27.0 NORTH, 002 34.0 EAST' },
      { lat: '39°26.0N', lon: '002°39.0E', spoken: '39 26.0 NORTH, 002 39.0 EAST' },
    ],
    rxDistress: { lat: '39°20.0N', lon: '002°30.0E', spoken: '39 20 NORTH, 002 30 EAST' },
  },
  {
    id: 'bodrum',
    area: { pl: 'Bodrum (Turcja)', ru: 'Бодрум (Турция)', en: 'Bodrum (Turkey)', es: 'Bodrum (Turquía)', fr: 'Bodrum (Turquie)', de: 'Bodrum (Türkei)', it: 'Bodrum (Turchia)' },
    coast: null,
    marina: {
      call: 'MILTA BODRUM MARINA',
      display: 'Milta Bodrum Marina',
      channel: '73',
      note: {
        pl: 'Tureckie mariny mają własne kanały robocze (Milta Bodrum Marina: 73); sprawdź kanał w locji lub na stronie mariny.',
        ru: 'У турецких марин свои рабочие каналы (Milta Bodrum Marina: 73); уточни канал в лоции или на сайте марины.',
        en: 'Turkish marinas each have their own working channel (Milta Bodrum Marina: 73); check it in the pilot book or on the marina\'s website.',
        es: 'Cada marina turca tiene su propio canal de trabajo (Milta Bodrum Marina: 73); compruébalo en el derrotero o en la web de la marina.',
        fr: 'Chaque marina turque a son propre canal de travail (Milta Bodrum Marina : 73) ; vérifie-le dans le guide nautique ou sur le site de la marina.',
        de: 'Türkische Marinas haben jeweils einen eigenen Arbeitskanal (Milta Bodrum Marina: 73); prüfe ihn im Hafenhandbuch oder auf der Website der Marina.',
        it: 'Ogni marina turco ha un proprio canale di lavoro (Milta Bodrum Marina: 73); verificalo sul portolano o sul sito del marina.',
      },
    },
    vts: null,
    channelLabels: { '73': 'Milta Bodrum Marina' },
    positions: [
      { lat: '36°58.0N', lon: '027°25.0E', spoken: '36 58.0 NORTH, 027 25.0 EAST' },
      { lat: '36°57.0N', lon: '027°18.0E', spoken: '36 57.0 NORTH, 027 18.0 EAST' },
      { lat: '36°56.0N', lon: '027°28.0E', spoken: '36 56.0 NORTH, 027 28.0 EAST' },
    ],
    rxDistress: { lat: '36°52.0N', lon: '027°30.0E', spoken: '36 52 NORTH, 027 30 EAST' },
  },
];

export const DEFAULT_VENUE: Venue = VENUES[0];

export function venueById(id: string | null | undefined): Venue {
  return VENUES.find((v) => v.id === id) ?? DEFAULT_VENUE;
}

/** Venues that have everything a scenario needs. Never empty: Gdańsk has all. */
export function venuesFor(needs: readonly PlaceNeed[] = []): Venue[] {
  return VENUES.filter((v) => needs.every((n) => v[n] !== null));
}

/** The venue's entry for the radio's DSC address book, if it has a coast station. */
export function coastAddress(venue: Venue): DscAddress | null {
  return venue.coast ? { label: venue.coast.call, mmsi: venue.coast.mmsi } : null;
}

/**
 * Put a radio state into a venue: the coast station the radio talks to, the
 * local channel labels, and the coast station in the address book in place of
 * the default one (scenario `init`s start from INITIAL_RADIO, which is Gdańsk).
 */
export function placeRadio(s: RadioState, venue: Venue): RadioState {
  const coast = coastAddress(venue);
  const individualIds = s.individualIds.flatMap((item) => {
    if (item.mmsi !== COAST_MMSI) return [item];
    return coast ? [coast] : [];
  });
  return { ...s, coast, channelLabels: venue.channelLabels, individualIds };
}

/** Fill a scenario text's place-holders for this venue and language. */
export function fillPlace(text: string, venue: Venue, lang: Lang): string {
  if (!text.includes('{')) return text;
  return text
    .replaceAll('{area}', venue.area[lang])
    .replaceAll('{coast}', venue.coast?.display ?? '')
    .replaceAll('{marina}', venue.marina?.display ?? '')
    .replaceAll('{marinaCh}', String(Number(venue.marina?.channel ?? '')))
    .replaceAll('{marinaNote}', venue.marina?.note[lang] ?? '')
    .replaceAll('{vts}', venue.vts?.display ?? '')
    .replaceAll('{vtsCh}', String(Number(venue.vts?.channel ?? '')));
}
