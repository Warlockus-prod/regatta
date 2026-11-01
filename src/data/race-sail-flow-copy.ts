// F6 "Wind on the sails": the race Settings switch for the apparent-wind
// ribbons at the player's yacht (src/features/race-scene/SailFlow.tsx).
// Terms from scripts/sailing-glossary.md: apparent wind (вымпельный ветер,
// wiatr pozorny), telltale (колдунчик, włóczka).

export const RACE_SAIL_FLOW_COPY = {
  label: { ru: "Ветер на парусах", en: "Wind on the sails", pl: "Wiatr na żaglach", es: "Viento en las velas", fr: "Vent dans les voiles", de: "Wind an den Segeln", it: "Vento sulle vele" },
  // Two sentences: what the lines are (in place of the 3D wind arrows) and the telltale colour key.
  note: {
    ru: "Линии показывают вымпельный ветер у парусов и заменяют 3D-стрелки ветра. В Pro с подсказками трима они окрашены как колдунчики: зеленый, поток идет; желтый, парус полощет; красный, срыв потока.",
    en: "Lines show the apparent wind at your sails and replace the 3D wind arrows. In Pro with trim hints they are coloured like telltales: green, the air flows; yellow, the sail is luffing; red, the flow has stalled.",
    pl: "Linie pokazują wiatr pozorny przy żaglach i zastępują strzałki wiatru w 3D. W trybie Pro ze wskazówkami trymu mają kolory jak włóczki: zielony, gdy powietrze opływa żagiel; żółty, gdy żagiel łopocze; czerwony, gdy przepływ się odrywa.",
    es: "Las líneas muestran el viento aparente en tus velas y sustituyen a las flechas 3D del viento. En Pro con consejos de trimado llevan los colores de los catavientos: verde, el aire fluye; amarillo, la vela flamea; rojo, el flujo se ha desprendido.",
    fr: "Les lignes montrent le vent apparent sur tes voiles et remplacent les flèches 3D du vent. En Pro avec les conseils de réglage, elles prennent les couleurs des penons : vert, l'air s'écoule ; jaune, la voile faseye ; rouge, l'écoulement décroche.",
    de: "Die Linien zeigen den scheinbaren Wind an deinen Segeln und ersetzen die 3D-Windpfeile. In Pro mit Trimmhinweisen sind sie wie Windfäden gefärbt: grün, die Strömung liegt an; gelb, das Segel killt; rot, die Strömung reißt ab.",
    it: "Le linee mostrano il vento apparente sulle vele e sostituiscono le frecce 3D del vento. In Pro con i consigli di trim hanno i colori dei filetti: verde, il flusso scorre; giallo, la vela fileggia; rosso, il flusso si stacca.",
  },
} as const;
