import type { Metadata } from 'next';
import { localizedRadioMetadata } from '../localization/server';
import PhoneticDrill from './PhoneticDrill';

// All seven values sit in one literal each, so the radio catalog builder pairs
// them and the metadata follows the course language like the other drills.
const TITLE = {
  pl: 'Alfabet fonetyczny i cyfry w radiu VHF - trening | Week to Regatta',
  ru: 'Фонетический алфавит и цифры в УКВ-радиосвязи - тренажёр | Week to Regatta',
  en: 'Phonetic alphabet and numbers on VHF radio - drill | Week to Regatta',
  es: 'Alfabeto fonético y números en radio VHF - práctica | Week to Regatta',
  fr: 'Alphabet phonétique et chiffres en radio VHF - entraînement | Week to Regatta',
  de: 'Buchstabieralphabet und Zahlen im UKW-Seefunk - Training | Week to Regatta',
  it: 'Alfabeto fonetico e numeri via radio VHF - esercizio | Week to Regatta',
};
const DESCRIPTION = {
  pl: 'Cały alfabet fonetyczny od Alfa do Zulu z akcentem i nagraniem, wymowa cyfr (WUN, TOO, TREE, NIN-ER), rozpoznawanie słów ze słuchu, literowanie nazw i znaków wywoławczych oraz runda punktowana.',
  ru: 'Весь фонетический алфавит от Alfa до Zulu с ударением и озвучкой, произношение цифр (WUN, TOO, TREE, NIN-ER), узнавание слов на слух, передача имён и позывных по буквам и зачётный раунд.',
  en: 'The whole phonetic alphabet from Alfa to Zulu with stress and audio, how figures are pronounced (WUN, TOO, TREE, NIN-ER), recognising words by ear, spelling names and call signs, and a scored round.',
  es: 'Todo el alfabeto fonético de Alfa a Zulu con acento y audio, la pronunciación de las cifras (WUN, TOO, TREE, NIN-ER), reconocer palabras de oído, deletrear nombres y distintivos de llamada y una ronda puntuada.',
  fr: "Tout l'alphabet phonétique d'Alfa à Zulu avec l'accent et l'audio, la prononciation des chiffres (WUN, TOO, TREE, NIN-ER), la reconnaissance des mots à l'oreille, l'épellation des noms et indicatifs et une manche notée.",
  de: 'Das ganze Buchstabieralphabet von Alfa bis Zulu mit Betonung und Audio, die Aussprache der Ziffern (WUN, TOO, TREE, NIN-ER), Wörter nach Gehör erkennen, Namen und Rufzeichen buchstabieren und eine gewertete Runde.',
  it: "Tutto l'alfabeto fonetico da Alfa a Zulu con accento e audio, la pronuncia delle cifre (WUN, TOO, TREE, NIN-ER), il riconoscimento delle parole a orecchio, lo spelling di nomi e nominativi e un round a punti.",
};

const metadata: Metadata = {
  title: TITLE.pl,
  description: DESCRIPTION.pl,
  keywords: ['SRC', 'SMCP', 'MAYDAY', 'radio VHF', 'alfabet fonetyczny'],
};

export async function generateMetadata(): Promise<Metadata> {
  return localizedRadioMetadata(metadata);
}

export default function PhoneticPage() {
  return <PhoneticDrill />;
}
