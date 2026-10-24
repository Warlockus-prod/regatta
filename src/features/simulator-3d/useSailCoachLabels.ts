'use client';

import { useMemo } from "react";
import { useI18n } from "@/lib/i18n";

/** Identical trim coaching wording in the trainer and the race. */
export function useSailCoachLabels() {
  const { tp } = useI18n();
  return useMemo(() => ({
        inIrons: tp('В левентике - увались, чтобы наполнить паруса', 'In irons - bear away to fill the sails', 'W łopocie: odpadnij, żeby napełnić żagle', {
          es: 'Proa al viento: arriba para llenar las velas', fr: 'Vent debout : abats pour remplir les voiles', de: 'Im Wind: abfallen, um die Segel zu füllen', it: 'Prua al vento: poggia per riempire le vele',
        }),
        luffMain: tp('Грот полощет - выбери гика-шкот или увались', 'Main luffing - trim the mainsheet or bear away', 'Grot łopocze: wybierz szot grota lub odpadnij', {
          es: 'La mayor flamea: caza la escota de mayor o arriba', fr: 'La grand-voile faseye : borde l\'écoute de grand-voile ou abats', de: 'Großsegel killt: Großschot dichtholen oder abfallen', it: 'La randa fileggia: cazza la scotta della randa o poggia',
        }),
        luffJib: tp('Стаксель полощет - выбери стаксель-шкот или увались', 'Jib luffing - trim the jib sheet or bear away', 'Fok łopocze: wybierz szot foka lub odpadnij', {
          es: 'El foque flamea: caza la escota de foque o arriba', fr: 'Le foc faseye : borde l\'écoute de foc ou abats', de: 'Fock killt: Fockschot dichtholen oder abfallen', it: 'Il fiocco fileggia: cazza la scotta del fiocco o poggia',
        }),
        luffBoth: tp('Оба паруса полощут - выбери гика-шкот и стаксель-шкот или увались', 'Both sails luffing - trim the mainsheet and the jib sheet or bear away', 'Oba żagle łopoczą: wybierz szot grota i szot foka lub odpadnij', {
          es: 'Las dos velas flamean: caza la escota de mayor y la de foque o arriba', fr: 'Les deux voiles faseyent : borde l\'écoute de grand-voile et celle de foc ou abats', de: 'Beide Segel killen: Groß- und Fockschot dichtholen oder abfallen', it: 'Entrambe le vele fileggiano: cazza la scotta della randa e quella del fiocco o poggia',
        }),
        stallMain: tp('Срыв на гроте - потрави гика-шкот', 'Main stalled - ease the mainsheet', 'Oderwanie na grocie: poluzuj szot grota', {
          es: 'Flujo desprendido en la mayor: lasca la escota de mayor', fr: 'Grand-voile décrochée : choque l\'écoute de grand-voile', de: 'Abriss am Großsegel: Großschot fieren', it: 'Randa in stallo: lasca la scotta della randa',
        }),
        stallJib: tp('Срыв на стакселе - потрави стаксель-шкот', 'Jib stalled - ease the jib sheet', 'Oderwanie na foku: poluzuj szot foka', {
          es: 'Flujo desprendido en el foque: lasca la escota de foque', fr: 'Foc décroché : choque l\'écoute de foc', de: 'Abriss an der Fock: Fockschot fieren', it: 'Fiocco in stallo: lasca la scotta del fiocco',
        }),
        stallBoth: tp('Срыв на обоих парусах - потрави гика-шкот и стаксель-шкот', 'Both sails stalled - ease the mainsheet and the jib sheet', 'Oderwanie na obu żaglach: poluzuj szot grota i szot foka', {
          es: 'Flujo desprendido en las dos velas: lasca la escota de mayor y la de foque', fr: 'Les deux voiles décrochent : choque l\'écoute de grand-voile et celle de foc', de: 'Abriss an beiden Segeln: Groß- und Fockschot fieren', it: 'Entrambe le vele in stallo: lasca la scotta della randa e quella del fiocco',
        }),
        pinching: tp('Слишком круто - чуть увались', 'Pinching - bear away a touch', 'Za ostro: lekko odpadnij', {
          es: 'Demasiado ceñido: arriba un poco', fr: 'Trop près : abats un peu', de: 'Zu hoch: etwas abfallen', it: 'Troppo stretto: poggia un poco',
        }),
        good: tp('Хороший трим - оба паруса тянут', 'Well trimmed - both sails pulling', 'Dobry trym: oba żagle pracują', {
          es: 'Buen trimado: las dos velas tiran', fr: 'Bien réglé : les deux voiles portent', de: 'Gut getrimmt: beide Segel ziehen', it: 'Buona regolazione: entrambe le vele tirano',
        }),
        reachOn: tp('Настраивай шкоты небольшими шагами', 'Adjust the sheets in small steps', 'Reguluj szoty małymi krokami', {
          es: 'Ajusta las escotas poco a poco', fr: 'Règle les écoutes par petits pas', de: 'Schoten schrittweise trimmen', it: 'Regola le scotte a piccoli passi',
        }),
        run: tp("Фордевинд: потрави гика-шкот и стаксель-шкот", "Running: ease the mainsheet and the jib sheet", "Fordewind: poluzuj szot grota i szot foka", {
          es: "En popa: lasca la escota de mayor y la de foque", fr: "Vent arrière : choque l'écoute de grand-voile et celle de foc", de: "Vorwind: Groß- und Fockschot fieren", it: "In poppa: lasca la scotta della randa e quella del fiocco",
        }),
      }), [tp]);
}
