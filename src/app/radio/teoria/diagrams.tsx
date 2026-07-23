"use client";

import { useI18n } from "@/lib/i18n";
import type { DiagramId } from "./courseData";

const C = {
  cyan: "var(--accent-cyan)",
  green: "var(--success)",
  red: "var(--danger)",
  amber: "var(--warning)",
  text: "var(--text-primary)",
  muted: "var(--text-muted)",
  line: "var(--border-subtle)",
  panel: "var(--bg-secondary)",
};

function Base({
  title,
  desc,
  children,
  viewBox = "0 0 720 360",
}: {
  title: string;
  desc: string;
  children: React.ReactNode;
  viewBox?: string;
}) {
  return (
    <svg
      viewBox={viewBox}
      className="h-auto w-full min-w-[620px]"
      role="img"
      aria-label={`${title}. ${desc}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>{title}</title>
      <desc>{desc}</desc>
      {children}
    </svg>
  );
}

function Label({
  x,
  y,
  children,
  size = 14,
  fill = C.text,
  anchor = "middle",
  weight = 600,
}: {
  x: number;
  y: number;
  children: React.ReactNode;
  size?: number;
  fill?: string;
  anchor?: "start" | "middle" | "end";
  weight?: number;
}) {
  return (
    <text x={x} y={y} textAnchor={anchor} fontSize={size} fontWeight={weight} fill={fill}>
      {children}
    </text>
  );
}

function ArrowDefs({ id, color = C.muted }: { id: string; color?: string }) {
  return (
    <defs>
      <marker id={id} markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
        <path d="M0 0 L10 5 L0 10 z" fill={color} />
      </marker>
    </defs>
  );
}

function SystemDiagram() {
  const { lang } = useI18n();
  const ru = lang === "ru";
  return (
    <Base
      title={ru ? "Система морской связи" : "System lacznosci morskiej"}
      desc={ru ? "Сигнал DSC и голосовая связь соединяют яхту, берег, RCC и спасателей." : "DSC i fonia lacza jacht, brzeg, RCC i ratownikow."}
    >
      <ArrowDefs id="system-arrow" />
      <path d="M0 285 Q170 250 360 282 T720 272 V360 H0 Z" fill="rgba(0,153,204,0.18)" />
      <g transform="translate(56 190)">
        <path d="M0 52 H130 L106 82 H27 Z" fill={C.panel} stroke={C.cyan} strokeWidth="2" />
        <path d="M52 52 V0 M52 0 L92 38 H52" fill="none" stroke={C.text} strokeWidth="4" />
        <path d="M54 3 V-42" stroke={C.text} strokeWidth="3" />
        <circle cx="54" cy="-45" r="5" fill={C.red} />
        <Label x={64} y={110}>{ru ? "ЯХТА" : "JACHT"}</Label>
      </g>
      <g transform="translate(295 45)">
        <rect x="0" y="72" width="128" height="92" rx="8" fill={C.panel} stroke={C.cyan} strokeWidth="2" />
        <path d="M21 72 V24 M107 72 V24 M11 164 H117" stroke={C.text} strokeWidth="4" />
        <path d="M4 57 Q21 39 38 57 M90 57 Q107 39 124 57" fill="none" stroke={C.cyan} strokeWidth="2" />
        <Label x={64} y={194}>{ru ? "БЕРЕГ" : "STACJA BRZEGOWA"}</Label>
      </g>
      <g transform="translate(516 84)">
        <rect x="0" y="0" width="148" height="78" rx="12" fill={C.panel} stroke={C.amber} strokeWidth="2" />
        <Label x={74} y={32} size={22} fill={C.amber}>RCC</Label>
        <Label x={74} y={54} size={12} fill={C.muted}>{ru ? "координация" : "koordynacja"}</Label>
        <g transform="translate(21 130)">
          <path d="M0 32 H110 L92 52 H18 Z" fill={C.panel} stroke={C.green} strokeWidth="2" />
          <rect x="42" y="0" width="30" height="32" fill={C.panel} stroke={C.green} strokeWidth="2" />
          <Label x={55} y={78}>{ru ? "SAR" : "SAR"}</Label>
        </g>
      </g>
      <path d="M173 154 Q232 77 302 105" fill="none" stroke={C.red} strokeWidth="3" strokeDasharray="7 5" markerEnd="url(#system-arrow)" />
      <Label x={235} y={80} size={12} fill={C.red}>CH 70 DSC</Label>
      <path d="M177 179 Q236 133 300 140" fill="none" stroke={C.cyan} strokeWidth="3" markerEnd="url(#system-arrow)" />
      <Label x={236} y={128} size={12} fill={C.cyan}>CH 16 MAYDAY</Label>
      <path d="M425 123 H506" fill="none" stroke={C.amber} strokeWidth="3" markerEnd="url(#system-arrow)" />
      <path d="M590 165 V209" fill="none" stroke={C.green} strokeWidth="3" markerEnd="url(#system-arrow)" />
      <Label x={465} y={110} size={11} fill={C.muted}>{ru ? "данные" : "dane"}</Label>
      <Label x={620} y={192} size={11} fill={C.muted}>{ru ? "задача" : "zadanie"}</Label>
      <Label x={360} y={338} size={12} fill={C.muted}>
        {ru ? "Цифровой сигнал сообщает кто и где. Голос объясняет что произошло." : "Cyfrowy alarm mowi kto i gdzie. Glos wyjasnia co sie stalo."}
      </Label>
    </Base>
  );
}

function HorizonDiagram() {
  const { lang } = useI18n();
  const ru = lang === "ru";
  return (
    <Base
      title={ru ? "Радиогоризонт VHF" : "Radiogoryzont VHF"}
      desc={ru ? "Высокая антенна видит дальше, а большая мощность не выпрямляет Землю." : "Wysoka antena widzi dalej, a wieksza moc nie prostuje Ziemi."}
    >
      <defs>
        <radialGradient id="sea-earth" cx="50%" cy="0%" r="100%">
          <stop offset="0%" stopColor="rgba(0,212,255,0.12)" />
          <stop offset="100%" stopColor="rgba(0,80,140,0.4)" />
        </radialGradient>
      </defs>
      <circle cx="360" cy="650" r="390" fill="url(#sea-earth)" stroke={C.cyan} strokeWidth="2" />
      <path d="M115 252 L560 204" stroke={C.green} strokeWidth="3" strokeDasharray="8 5" />
      <path d="M115 252 L356 238" stroke={C.red} strokeWidth="3" strokeDasharray="8 5" />
      <g transform="translate(78 214)">
        <path d="M0 36 H76 L62 54 H15 Z" fill={C.panel} stroke={C.cyan} strokeWidth="2" />
        <path d="M32 36 V-18" stroke={C.text} strokeWidth="3" />
        <circle cx="32" cy="-20" r="4" fill={C.cyan} />
        <Label x={37} y={80} size={12}>{ru ? "яхта" : "jacht"}</Label>
      </g>
      <g transform="translate(540 90)">
        <path d="M0 114 H80 L66 132 H15 Z" fill={C.panel} stroke={C.green} strokeWidth="2" />
        <path d="M35 114 V0" stroke={C.text} strokeWidth="3" />
        <circle cx="35" cy="-3" r="5" fill={C.green} />
        <Label x={40} y={157} size={12}>{ru ? "мачта 20 м" : "maszt 20 m"}</Label>
      </g>
      <g transform="translate(326 204)">
        <path d="M0 34 H62 L50 49 H12 Z" fill={C.panel} stroke={C.red} strokeWidth="2" />
        <path d="M29 34 V16" stroke={C.text} strokeWidth="3" />
        <circle cx="29" cy="13" r="4" fill={C.red} />
        <Label x={31} y={71} size={11}>{ru ? "низкая антенна" : "niska antena"}</Label>
      </g>
      <path d="M358 238 Q430 248 495 234" fill="none" stroke={C.red} strokeWidth="2" />
      <Label x={432} y={270} size={12} fill={C.red}>{ru ? "Земля закрывает путь" : "Ziemia zaslania tor"}</Label>
      <g transform="translate(70 35)">
        <rect width="240" height="92" rx="12" fill={C.panel} stroke={C.line} />
        <Label x={18} y={28} anchor="start" size={13} fill={C.cyan}>{ru ? "Главный рычаг" : "Glowna dzwignia"}</Label>
        <Label x={18} y={53} anchor="start" size={18}>{ru ? "высота антенны" : "wysokosc anteny"}</Label>
        <Label x={18} y={76} anchor="start" size={11} fill={C.muted}>d = 4,12 x (sqrt h1 + sqrt h2)</Label>
      </g>
      <g transform="translate(430 32)">
        <rect width="220" height="82" rx="12" fill="rgba(255,68,68,0.08)" stroke={C.red} />
        <Label x={18} y={28} anchor="start" size={13} fill={C.red}>25 W</Label>
        <Label x={18} y={51} anchor="start" size={12}>{ru ? "усиливает сигнал" : "wzmacnia sygnal"}</Label>
        <Label x={18} y={70} anchor="start" size={11} fill={C.muted}>{ru ? "не убирает горизонт" : "nie usuwa horyzontu"}</Label>
      </g>
    </Base>
  );
}

function ControlsDiagram() {
  const { lang } = useI18n();
  const ru = lang === "ru";
  const callouts = [
    { x: 75, y: 58, label: "DISTRESS", note: ru ? "только бедствие" : "tylko distress", color: C.red },
    { x: 555, y: 68, label: "VOL", note: ru ? "громкость" : "glosnosc", color: C.cyan },
    { x: 555, y: 172, label: "SQL", note: ru ? "порог шума" : "prog szumu", color: C.amber },
    { x: 84, y: 284, label: "PTT", note: ru ? "говорить" : "nadawanie", color: C.green },
    { x: 355, y: 304, label: "16/C", note: ru ? "возврат на 16" : "powrot na 16", color: C.cyan },
  ];
  return (
    <Base
      title={ru ? "Органы управления VHF" : "Elementy sterowania VHF"}
      desc={ru ? "DISTRESS, volume, squelch, PTT и быстрый канал 16 выполняют разные задачи." : "DISTRESS, volume, squelch, PTT i szybki kanal 16 maja rozne zadania."}
    >
      <rect x="170" y="36" width="380" height="276" rx="28" fill="#142333" stroke={C.line} strokeWidth="3" />
      <rect x="225" y="78" width="212" height="102" rx="8" fill="#b8d6a4" stroke="#07120d" strokeWidth="4" />
      <Label x={331} y={120} size={38} fill="#102014">16</Label>
      <Label x={331} y={150} size={14} fill="#102014">INT  HI  GPS</Label>
      <circle cx="477" cy="103" r="31" fill="#26394b" stroke={C.cyan} strokeWidth="3" />
      <circle cx="477" cy="198" r="31" fill="#26394b" stroke={C.amber} strokeWidth="3" />
      <rect x="190" y="203" width="68" height="48" rx="8" fill={C.red} />
      <Label x={224} y={232} size={12} fill="#fff">DISTRESS</Label>
      <rect x="285" y="230" width="82" height="50" rx="9" fill="#26394b" stroke={C.cyan} />
      <Label x={326} y={261} size={18}>16/C</Label>
      <rect x="388" y="230" width="82" height="50" rx="9" fill="#26394b" stroke={C.line} />
      <Label x={429} y={260} size={14}>HI/LO</Label>
      <rect x="126" y="196" width="35" height="82" rx="9" fill={C.green} />
      <Label x={143} y={241} size={13} fill="#052019">PTT</Label>
      {callouts.map((c) => (
        <g key={c.label}>
          <line
            x1={c.x < 170 ? c.x + 74 : c.x}
            y1={c.y}
            x2={c.x < 170 ? 176 : 535}
            y2={c.y < 120 ? 95 : c.y < 220 ? 198 : 255}
            stroke={c.color}
            strokeWidth="2"
          />
          <Label x={c.x} y={c.y - 7} anchor={c.x < 170 ? "start" : "start"} size={13} fill={c.color}>{c.label}</Label>
          <Label x={c.x} y={c.y + 11} anchor="start" size={11} fill={C.muted}>{c.note}</Label>
        </g>
      ))}
      <Label x={360} y={344} size={12} fill={C.muted}>
        {ru ? "Сначала функция, затем расположение на конкретной модели" : "Najpierw funkcja, potem uklad konkretnego modelu"}
      </Label>
    </Base>
  );
}

function ChannelsDiagram() {
  const { lang } = useI18n();
  const ru = lang === "ru";
  return (
    <Base
      title={ru ? "Simplex, duplex и роли каналов" : "Simplex, duplex i role kanalow"}
      desc={ru ? "На simplex станции говорят по очереди, duplex использует две частоты, а 70 и 16 выполняют разные роли." : "Na simplexie stacje mowia po kolei, duplex uzywa dwoch czestotliwosci, a 70 i 16 maja inne role."}
    >
      <ArrowDefs id="channel-arrow" />
      <g transform="translate(30 34)">
        <rect width="310" height="180" rx="16" fill={C.panel} stroke={C.line} />
        <Label x={155} y={30} fill={C.cyan}>SIMPLEX</Label>
        <circle cx="65" cy="85" r="31" fill="rgba(0,212,255,0.13)" stroke={C.cyan} />
        <circle cx="245" cy="85" r="31" fill="rgba(68,255,136,0.11)" stroke={C.green} />
        <Label x={65} y={90}>A</Label>
        <Label x={245} y={90}>B</Label>
        <path d="M99 72 H205" stroke={C.cyan} strokeWidth="3" markerEnd="url(#channel-arrow)" />
        <path d="M211 105 H105" stroke={C.green} strokeWidth="3" markerEnd="url(#channel-arrow)" />
        <Label x={155} y={137} size={12}>{ru ? "одна частота, по очереди" : "jedna czestotliwosc, na zmiane"}</Label>
        <Label x={155} y={158} size={11} fill={C.muted}>OVER</Label>
      </g>
      <g transform="translate(380 34)">
        <rect width="310" height="180" rx="16" fill={C.panel} stroke={C.line} />
        <Label x={155} y={30} fill={C.amber}>DUPLEX</Label>
        <circle cx="65" cy="85" r="31" fill="rgba(0,212,255,0.13)" stroke={C.cyan} />
        <rect x="214" y="54" width="62" height="62" rx="8" fill="rgba(255,170,0,0.1)" stroke={C.amber} />
        <Label x={65} y={90}>{ru ? "С" : "S"}</Label>
        <Label x={245} y={90}>{ru ? "Б" : "B"}</Label>
        <path d="M99 70 H205" stroke={C.cyan} strokeWidth="3" markerEnd="url(#channel-arrow)" />
        <path d="M211 105 H105" stroke={C.amber} strokeWidth="3" markerEnd="url(#channel-arrow)" />
        <Label x={155} y={137} size={12}>{ru ? "две частоты" : "dwie czestotliwosci"}</Label>
        <Label x={155} y={158} size={11} fill={C.muted}>{ru ? "обычно судно и берег" : "typowo statek i brzeg"}</Label>
      </g>
      <g transform="translate(30 242)">
        {[
          { x: 0, n: "70", l: "DSC", c: C.red },
          { x: 132, n: "16", l: ru ? "distress + вызов" : "distress + wywolanie", c: C.cyan },
          { x: 328, n: "13", l: ru ? "безопасность" : "bezpieczenstwo", c: C.amber },
          { x: 504, n: "06", l: "ship-ship / SAR", c: C.green },
        ].map((item) => (
          <g key={item.n} transform={`translate(${item.x} 0)`}>
            <circle cx="30" cy="30" r="28" fill={item.c} opacity="0.15" stroke={item.c} strokeWidth="2" />
            <Label x={30} y={37} size={21} fill={item.c}>{item.n}</Label>
            <Label x={30} y={75} size={10} fill={C.muted}>{item.l}</Label>
          </g>
        ))}
      </g>
    </Base>
  );
}

function IdentityDiagram() {
  const { lang } = useI18n();
  const ru = lang === "ru";
  const rows = [
    { y: 72, k: ru ? "ИМЯ" : "NAZWA", v: "SY BALTICA", use: ru ? "человек слышит" : "czlowiek slyszy", c: C.cyan },
    { y: 164, k: "CALL SIGN", v: "SPG 2047", use: ru ? "официальный позывной" : "oficjalny znak", c: C.amber },
    { y: 256, k: "MMSI", v: "261 123 456", use: ru ? "DSC и AIS" : "DSC i AIS", c: C.green },
  ];
  return (
    <Base
      title={ru ? "Три идентификатора судна" : "Trzy identyfikatory jednostki"}
      desc={ru ? "Название используется голосом, позывной официально идентифицирует станцию, MMSI адресует DSC и AIS." : "Nazwa sluzy w fonii, call sign oficjalnie identyfikuje stacje, a MMSI adresuje DSC i AIS."}
    >
      <ArrowDefs id="id-arrow" />
      <g transform="translate(40 120)">
        <path d="M0 45 H130 L110 77 H22 Z" fill={C.panel} stroke={C.cyan} strokeWidth="2" />
        <path d="M53 45 V0 L94 37 H53" fill="none" stroke={C.text} strokeWidth="4" />
        <Label x={65} y={106}>{ru ? "одно судно" : "jedna jednostka"}</Label>
      </g>
      {rows.map((row) => (
        <g key={row.k}>
          <path d={`M180 175 C235 175 220 ${row.y} 270 ${row.y}`} fill="none" stroke={row.c} strokeWidth="2" markerEnd="url(#id-arrow)" />
          <rect x="280" y={row.y - 34} width="390" height="68" rx="12" fill={C.panel} stroke={row.c} />
          <Label x={304} y={row.y - 5} anchor="start" size={12} fill={row.c}>{row.k}</Label>
          <Label x={304} y={row.y + 19} anchor="start" size={19}>{row.v}</Label>
          <Label x={646} y={row.y + 4} anchor="end" size={12} fill={C.muted}>{row.use}</Label>
        </g>
      ))}
      <Label x={475} y={333} size={12} fill={C.muted}>
        {ru ? "MMSI это 9 цифр, зарегистрированных для станции" : "MMSI to 9 cyfr zarejestrowanych dla stacji"}
      </Label>
    </Base>
  );
}

function RoutineDiagram() {
  const { lang } = useI18n();
  const ru = lang === "ru";
  const steps = [
    { t: ru ? "СЛУШАЙ" : "NASLUCH", s: ru ? "канал свободен?" : "kanal wolny?" },
    { t: ru ? "ВЫЗОВ" : "WYWOLAJ", s: "MARINA, THIS IS BALTICA, OVER" },
    { t: ru ? "ПЕРЕХОД" : "PRZEJDZ", s: ru ? "рабочий канал" : "kanal roboczy" },
    { t: ru ? "ДЕЛО" : "SPRAWA", s: ru ? "краткая просьба" : "krotka prosba" },
    { t: "OUT", s: ru ? "связь окончена" : "koniec lacznosci" },
  ];
  return (
    <Base
      title={ru ? "Последовательность обычного вызова" : "Sekwencja zwyklego wywolania"}
      desc={ru ? "Сначала прослушивание и короткий вызов, затем рабочий канал, сообщение и OUT." : "Najpierw nasluch i krotkie wywolanie, potem kanal roboczy, wiadomosc i OUT."}
    >
      <ArrowDefs id="routine-arrow" />
      <line x1="80" y1="172" x2="640" y2="172" stroke={C.line} strokeWidth="4" />
      {steps.map((step, index) => {
        const x = 80 + index * 140;
        const color = index === 0 ? C.amber : index === 4 ? C.green : C.cyan;
        return (
          <g key={step.t}>
            <circle cx={x} cy="172" r="34" fill={C.panel} stroke={color} strokeWidth="3" />
            <Label x={x} y={177} size={12} fill={color}>{index + 1}</Label>
            <Label x={x} y={104} size={14} fill={color}>{step.t}</Label>
            <foreignObject x={x - 58} y="220" width="116" height="60">
              <div style={{ color: C.muted, textAlign: "center", fontSize: 11, lineHeight: 1.25 }}>{step.s}</div>
            </foreignObject>
            {index < steps.length - 1 && <path d={`M${x + 38} 172 H${x + 100}`} stroke={C.muted} markerEnd="url(#routine-arrow)" />}
          </g>
        );
      })}
      <rect x="172" y="302" width="376" height="36" rx="18" fill="rgba(0,212,255,0.08)" stroke={C.cyan} />
      <Label x={360} y={325} size={12}>
        {ru ? "OVER = жду ответа, OUT = связь закончена" : "OVER = czekam na odpowiedz, OUT = koniec lacznosci"}
      </Label>
    </Base>
  );
}

function DscDiagram() {
  const { lang } = useI18n();
  const ru = lang === "ru";
  return (
    <Base
      title={ru ? "Две дорожки DSC и голоса" : "Dwie sciezki DSC i fonii"}
      desc={ru ? "Канал 70 передаёт короткий цифровой вызов, затем голос идёт на канале 16 или рабочем." : "Kanal 70 przenosi krotkie wywolanie cyfrowe, potem glos idzie na 16 lub kanale roboczym."}
    >
      <ArrowDefs id="dsc-arrow" />
      <Label x={78} y={92} anchor="start" size={16} fill={C.red}>CH 70</Label>
      <Label x={78} y={109} anchor="start" size={11} fill={C.muted}>DSC</Label>
      <Label x={78} y={242} anchor="start" size={16} fill={C.cyan}>{ru ? "ГОЛОС" : "FONIA"}</Label>
      <Label x={78} y={259} anchor="start" size={11} fill={C.muted}>CH 16 / WORKING</Label>
      <line x1="170" y1="100" x2="650" y2="100" stroke={C.red} strokeWidth="4" />
      <line x1="170" y1="250" x2="650" y2="250" stroke={C.cyan} strokeWidth="4" />
      <g transform="translate(190 59)">
        <rect width="130" height="82" rx="12" fill={C.panel} stroke={C.red} />
        <Label x={65} y={29} size={13}>{ru ? "кому" : "adres"}</Label>
        <Label x={65} y={49} size={11} fill={C.muted}>MMSI / ALL SHIPS</Label>
        <Label x={65} y={68} size={11} fill={C.muted}>{ru ? "приоритет" : "kategoria"}</Label>
      </g>
      <g transform="translate(400 59)">
        <rect width="130" height="82" rx="12" fill={C.panel} stroke={C.red} />
        <Label x={65} y={31} size={13}>SEND</Label>
        <Label x={65} y={54} size={11} fill={C.muted}>{ru ? "короткий пакет" : "krotki pakiet"}</Label>
      </g>
      <path d="M530 100 H610 V210 H470" fill="none" stroke={C.muted} strokeWidth="2" markerEnd="url(#dsc-arrow)" />
      <Label x={602} y={167} size={11} fill={C.muted}>ACK</Label>
      <g transform="translate(286 210)">
        <rect width="190" height="82" rx="12" fill={C.panel} stroke={C.cyan} />
        <Label x={95} y={29} size={13}>{ru ? "разговор" : "rozmowa"}</Label>
        <Label x={95} y={51} size={11} fill={C.muted}>{ru ? "кто, где, что нужно" : "kto, gdzie, czego potrzebuje"}</Label>
        <Label x={95} y={69} size={11} fill={C.muted}>OVER / OUT</Label>
      </g>
      <Label x={360} y={334} size={12} fill={C.muted}>
        {ru ? "DSC открывает дверь. Голос передаёт смысл." : "DSC otwiera drzwi. Glos przekazuje sens."}
      </Label>
    </Base>
  );
}

function PriorityDiagram() {
  const { lang } = useI18n();
  const ru = lang === "ru";
  return (
    <Base
      title={ru ? "Дерево выбора приоритета" : "Drzewo wyboru priorytetu"}
      desc={ru ? "Непосредственная серьёзная угроза ведёт к MAYDAY, срочная безопасность к PAN PAN, предупреждение другим к SECURITE." : "Powazne bezposrednie zagrozenie prowadzi do MAYDAY, pilna sprawa bezpieczenstwa do PAN PAN, a ostrzezenie dla innych do SECURITE."}
    >
      <ArrowDefs id="priority-arrow" />
      <rect x="235" y="22" width="250" height="54" rx="12" fill={C.panel} stroke={C.line} />
      <Label x={360} y={45} size={13}>{ru ? "Есть серьёзная непосредственная" : "Czy jest powazne i bezposrednie"}</Label>
      <Label x={360} y={64} size={13}>{ru ? "угроза и нужна помощь?" : "zagrozenie i potrzebna pomoc?"}</Label>
      <path d="M360 76 V110 H155 V140" fill="none" stroke={C.green} strokeWidth="2" markerEnd="url(#priority-arrow)" />
      <path d="M360 76 V110 H565 V140" fill="none" stroke={C.muted} strokeWidth="2" markerEnd="url(#priority-arrow)" />
      <Label x={190} y={105} size={11} fill={C.green}>{ru ? "ДА" : "TAK"}</Label>
      <Label x={528} y={105} size={11} fill={C.muted}>{ru ? "НЕТ" : "NIE"}</Label>
      <rect x="60" y="142" width="190" height="70" rx="14" fill="rgba(255,68,68,0.11)" stroke={C.red} strokeWidth="2" />
      <Label x={155} y={172} size={22} fill={C.red}>MAYDAY</Label>
      <Label x={155} y={193} size={11} fill={C.muted}>{ru ? "немедленная помощь" : "natychmiastowa pomoc"}</Label>
      <rect x="455" y="142" width="220" height="66" rx="12" fill={C.panel} stroke={C.line} />
      <Label x={565} y={169} size={12}>{ru ? "Срочно для безопасности?" : "Pilne dla bezpieczenstwa?"}</Label>
      <path d="M565 208 V242 H420 V270" fill="none" stroke={C.amber} strokeWidth="2" markerEnd="url(#priority-arrow)" />
      <path d="M565 208 V242 H625 V270" fill="none" stroke={C.cyan} strokeWidth="2" markerEnd="url(#priority-arrow)" />
      <Label x={450} y={237} size={11} fill={C.amber}>{ru ? "ДА" : "TAK"}</Label>
      <Label x={604} y={237} size={11} fill={C.cyan}>{ru ? "НЕТ, предупреждение" : "NIE, ostrzezenie"}</Label>
      <rect x="320" y="272" width="200" height="62" rx="14" fill="rgba(255,170,0,0.09)" stroke={C.amber} strokeWidth="2" />
      <Label x={420} y={309} size={21} fill={C.amber}>PAN PAN</Label>
      <rect x="545" y="272" width="150" height="62" rx="14" fill="rgba(0,212,255,0.09)" stroke={C.cyan} strokeWidth="2" />
      <Label x={620} y={309} size={19} fill={C.cyan}>SECURITE</Label>
      <Label x={155} y={244} size={11} fill={C.muted}>
        {ru ? "Одинаковая поломка может дать разный ответ в разном контексте" : "Ta sama awaria moze dac inna odpowiedz w innym kontekscie"}
      </Label>
    </Base>
  );
}

function MaydayDiagram() {
  const { lang } = useI18n();
  const ru = lang === "ru";
  const rows = [
    { n: "1", call: "MAYDAY x3, THIS IS, BALTICA x3", why: ru ? "привлечь внимание и назвать себя" : "uwaga i identyfikacja", c: C.red },
    { n: "2", call: "MAYDAY BALTICA", why: ru ? "начало сообщения" : "poczatek komunikatu", c: C.red },
    { n: "3", call: "MY POSITION IS 54... 018...", why: ru ? "куда направлять помощь" : "dokad wyslac pomoc", c: C.cyan },
    { n: "4", call: "COLLISION, TAKING WATER", why: ru ? "что произошло" : "co sie stalo", c: C.amber },
    { n: "5", call: "I REQUIRE IMMEDIATE ASSISTANCE", why: ru ? "что требуется" : "czego potrzeba", c: C.green },
    { n: "6", call: "FOUR PERSONS ON BOARD, OVER", why: ru ? "масштаб и ответ" : "skala i odpowiedz", c: C.cyan },
  ];
  return (
    <Base
      title={ru ? "Анатомия MAYDAY" : "Anatomia MAYDAY"}
      desc={ru ? "Каждая строка сообщения отвечает спасателям на отдельный вопрос." : "Kazda linia komunikatu odpowiada ratownikom na osobne pytanie."}
    >
      {rows.map((row, index) => {
        const y = 34 + index * 50;
        return (
          <g key={row.n}>
            <circle cx="50" cy={y + 18} r="17" fill={row.c} opacity="0.18" stroke={row.c} />
            <Label x={50} y={y + 23} size={13} fill={row.c}>{row.n}</Label>
            <rect x="80" y={y} width="380" height="38" rx="8" fill={C.panel} stroke={row.c} />
            <Label x={96} y={y + 24} anchor="start" size={index === 0 ? 12 : 13}>{row.call}</Label>
            <path d={`M460 ${y + 19} H492`} stroke={row.c} strokeWidth="2" />
            <rect x="492" y={y} width="192" height="38" rx="8" fill="transparent" stroke={C.line} />
            <Label x={588} y={y + 24} size={11} fill={C.muted}>{row.why}</Label>
          </g>
        );
      })}
      <Label x={360} y={349} size={11} fill={C.muted}>
        {ru ? "При угрозе жизни содержание важнее идеального акцента" : "W zagrozeniu tresc jest wazniejsza od idealnego akcentu"}
      </Label>
    </Base>
  );
}

function ReceiveDiagram() {
  const { lang } = useI18n();
  const ru = lang === "ru";
  const boxes = [
    { x: 24, y: 125, w: 125, t: ru ? "ПРИНЯТ DSC" : "ODEBRANO DSC", s: ru ? "запиши данные" : "zapisz dane", c: C.red },
    { x: 180, y: 125, w: 125, t: ru ? "СЛУШАЙ 16" : "SLUCHAJ 16", s: ru ? "5 минут" : "5 minut", c: C.cyan },
    { x: 336, y: 125, w: 150, t: ru ? "ACK БЕРЕГА?" : "ACK BRZEGU?", s: ru ? "и обмен MAYDAY" : "i ruch MAYDAY", c: C.amber },
    { x: 535, y: 42, w: 160, t: ru ? "ДА: СЛУШАЙ" : "TAK: SLUCHAJ", s: ru ? "не добавляй ACK" : "nie dokladaj ACK", c: C.green },
    { x: 535, y: 230, w: 160, t: ru ? "НЕТ: ОТВЕТЬ" : "NIE: ODPOWIEDZ", s: ru ? "голосом на 16" : "fonia na 16", c: C.red },
  ];
  return (
    <Base
      title={ru ? "Ответ на принятый DSC distress" : "Odpowiedz na odebrany DSC distress"}
      desc={ru ? "После приёма слушай канал 16 пять минут, проверь береговое подтверждение и только затем решай об ответе." : "Po odbiorze sluchaj kanalu 16 przez piec minut, sprawdz ACK brzegu i dopiero potem decyduj o odpowiedzi."}
    >
      <ArrowDefs id="receive-arrow" />
      {boxes.map((box) => (
        <g key={box.t}>
          <rect x={box.x} y={box.y} width={box.w} height="72" rx="12" fill={C.panel} stroke={box.c} strokeWidth="2" />
          <Label x={box.x + box.w / 2} y={box.y + 29} size={12} fill={box.c}>{box.t}</Label>
          <Label x={box.x + box.w / 2} y={box.y + 51} size={11} fill={C.muted}>{box.s}</Label>
        </g>
      ))}
      <path d="M149 161 H174" stroke={C.muted} strokeWidth="2" markerEnd="url(#receive-arrow)" />
      <path d="M305 161 H330" stroke={C.muted} strokeWidth="2" markerEnd="url(#receive-arrow)" />
      <path d="M486 146 C510 146 505 78 529 78" fill="none" stroke={C.green} strokeWidth="2" markerEnd="url(#receive-arrow)" />
      <path d="M486 176 C510 176 505 266 529 266" fill="none" stroke={C.red} strokeWidth="2" markerEnd="url(#receive-arrow)" />
      <Label x={509} y={100} size={11} fill={C.green}>{ru ? "ДА" : "TAK"}</Label>
      <Label x={510} y={244} size={11} fill={C.red}>{ru ? "НЕТ" : "NIE"}</Label>
      <rect x="180" y="250" width="306" height="66" rx="12" fill="rgba(255,170,0,0.07)" stroke={C.amber} />
      <Label x={333} y={277} size={12}>{ru ? "DSC ACK с судна не является первым шагом" : "DSC ACK ze statku nie jest pierwszym krokiem"}</Label>
      <Label x={333} y={299} size={11} fill={C.muted}>{ru ? "сначала голос, берег или RCC и оценка помощи" : "najpierw fonia, brzeg lub RCC i ocena pomocy"}</Label>
    </Base>
  );
}

function GmdssDiagram() {
  const { lang } = useI18n();
  const ru = lang === "ru";
  return (
    <Base
      title={ru ? "Цепочка GMDSS" : "Lancuch GMDSS"}
      desc={ru ? "EPIRB передаёт дальний сигнал через спутник, RCC координирует, SART помогает найти спасательное средство рядом." : "EPIRB wysyla daleki alarm przez satelite, RCC koordynuje, a SART pomaga znalezc srodek ratunkowy z bliska."}
    >
      <ArrowDefs id="gmdss-arrow" />
      <g transform="translate(34 128)">
        <path d="M0 44 H100 L84 66 H18 Z" fill={C.panel} stroke={C.red} strokeWidth="2" />
        <path d="M42 44 V-8" stroke={C.text} strokeWidth="3" />
        <circle cx="42" cy="-11" r="5" fill={C.red} />
        <Label x={50} y={91} size={12}>{ru ? "бедствие" : "distress"}</Label>
      </g>
      <g transform="translate(180 45)">
        <path d="M0 48 Q52 0 104 48 Q52 96 0 48 Z" fill={C.panel} stroke={C.cyan} strokeWidth="2" />
        <rect x="42" y="17" width="20" height="62" rx="7" fill={C.cyan} opacity="0.3" />
        <Label x={52} y={119} size={12}>COSPAS-SARSAT</Label>
      </g>
      <g transform="translate(345 105)">
        <rect width="122" height="76" rx="12" fill={C.panel} stroke={C.amber} strokeWidth="2" />
        <Label x={61} y={34} size={22} fill={C.amber}>RCC</Label>
        <Label x={61} y={56} size={11} fill={C.muted}>{ru ? "план спасения" : "plan akcji"}</Label>
      </g>
      <g transform="translate(545 190)">
        <path d="M0 38 H130 L108 66 H22 Z" fill={C.panel} stroke={C.green} strokeWidth="2" />
        <rect x="49" y="4" width="32" height="34" fill={C.panel} stroke={C.green} strokeWidth="2" />
        <Label x={65} y={91} size={12}>{ru ? "спасатели" : "ratownicy"}</Label>
      </g>
      <path d="M135 139 Q155 87 180 91" fill="none" stroke={C.red} strokeWidth="3" strokeDasharray="7 4" markerEnd="url(#gmdss-arrow)" />
      <Label x={146} y={100} size={11} fill={C.red}>EPIRB 406</Label>
      <path d="M284 96 Q323 97 347 128" fill="none" stroke={C.cyan} strokeWidth="3" markerEnd="url(#gmdss-arrow)" />
      <path d="M468 144 Q535 143 582 190" fill="none" stroke={C.amber} strokeWidth="3" markerEnd="url(#gmdss-arrow)" />
      <g transform="translate(190 234)">
        <rect width="260" height="76" rx="12" fill={C.panel} stroke={C.line} />
        <Label x={18} y={27} anchor="start" size={12} fill={C.cyan}>SART</Label>
        <Label x={88} y={27} anchor="start" size={11}>{ru ? "ответ радару X-band" : "odpowiedz dla radaru X-band"}</Label>
        <Label x={18} y={55} anchor="start" size={12} fill={C.green}>AIS-SART</Label>
        <Label x={88} y={55} anchor="start" size={11}>{ru ? "цель в AIS, не на радаре" : "cel w AIS, nie na radarze"}</Label>
      </g>
      <path d="M451 271 H539" stroke={C.green} strokeWidth="2" strokeDasharray="5 4" markerEnd="url(#gmdss-arrow)" />
      <Label x={496} y={259} size={10} fill={C.muted}>{ru ? "последние мили" : "ostatnie mile"}</Label>
      <Label x={360} y={342} size={11} fill={C.muted}>
        {ru ? "EPIRB вызывает помощь. SART помогает найти. NAVTEX заранее информирует." : "EPIRB wzywa pomoc. SART pomaga znalezc. NAVTEX informuje wczesniej."}
      </Label>
    </Base>
  );
}

function PowerDiagram() {
  const { lang } = useI18n();
  const ru = lang === "ru";
  const stages = [
    { x: 34, t: ru ? "ИСТОЧНИК" : "ZRODLO", s: "12 / 24 V", c: C.cyan },
    { x: 204, t: ru ? "ЗАЩИТА" : "OCHRONA", s: ru ? "предохранитель" : "bezpiecznik", c: C.amber },
    { x: 374, t: ru ? "РАЦИЯ" : "RADIO", s: "RX << TX 25 W", c: C.green },
    { x: 544, t: ru ? "АНТЕННА" : "ANTENA", s: ru ? "сигнал в эфир" : "sygnal w eter", c: C.cyan },
  ];
  return (
    <Base
      title={ru ? "Цепь питания морской рации" : "Lancuch zasilania radia morskiego"}
      desc={ru ? "Источник, защита, рация и антенна образуют одну цепь. Передача создает наибольшую нагрузку." : "Zrodlo, ochrona, radio i antena tworza jeden lancuch. Nadawanie powoduje najwieksze obciazenie."}
    >
      <ArrowDefs id="power-arrow" />
      {stages.map((stage, index) => (
        <g key={stage.t}>
          <rect x={stage.x} y="92" width="138" height="88" rx="14" fill={C.panel} stroke={stage.c} strokeWidth="2" />
          <Label x={stage.x + 69} y={126} size={13} fill={stage.c}>{stage.t}</Label>
          <Label x={stage.x + 69} y={154} size={12} fill={C.muted}>{stage.s}</Label>
          {index < stages.length - 1 && (
            <path d={`M${stage.x + 140} 136 H${stage.x + 166}`} stroke={C.muted} strokeWidth="2" markerEnd="url(#power-arrow)" />
          )}
        </g>
      ))}
      <rect x="84" y="232" width="552" height="76" rx="14" fill="rgba(255,170,0,0.07)" stroke={C.amber} />
      <Label x={110} y={261} anchor="start" size={12} fill={C.amber}>{ru ? "Проверка под нагрузкой" : "Test pod obciazeniem"}</Label>
      <Label x={110} y={286} anchor="start" size={12}>
        {ru ? "Напряжение может выглядеть нормально в покое и резко упасть при TX." : "Napiecie moze byc poprawne w spoczynku i mocno spasc podczas TX."}
      </Label>
      <Label x={360} y={340} size={11} fill={C.muted}>
        {ru ? "Сначала клеммы и питание, затем подозревай рацию." : "Najpierw zaciski i zasilanie, dopiero potem podejrzewaj radio."}
      </Label>
    </Base>
  );
}

function SmcpDiagram() {
  const { lang } = useI18n();
  const ru = lang === "ru";
  const rows = [
    { y: 60, start: "I AM", examples: "SINKING / ON FIRE / NOT UNDER COMMAND", c: C.red },
    { y: 125, start: "I REQUIRE", examples: "ASSISTANCE / TUG / AMBULANCE", c: C.amber },
    { y: 190, start: "CAN YOU", examples: "ASSIST? / PICK UP SURVIVORS?", c: C.cyan },
    { y: 255, start: "CONTROL", examples: "SAY AGAIN / CORRECTION / RECEIVED", c: C.green },
  ];
  return (
    <Base
      title={ru ? "Семейства фраз SMCP" : "Rodziny fraz SMCP"}
      desc={ru ? "Шестьдесят экзаменационных фраз собираются из повторяющихся намерений и коротких конструкций." : "Szescdziesiat fraz egzaminacyjnych sklada sie z powtarzalnych intencji i krotkich konstrukcji."}
    >
      {rows.map((row) => (
        <g key={row.start}>
          <rect x="50" y={row.y} width="150" height="48" rx="12" fill={row.c} opacity="0.14" stroke={row.c} />
          <Label x={125} y={row.y + 30} size={14} fill={row.c}>{row.start}</Label>
          <path d={`M200 ${row.y + 24} H242`} stroke={row.c} strokeWidth="2" />
          <rect x="242" y={row.y} width="428" height="48" rx="12" fill={C.panel} stroke={C.line} />
          <Label x={266} y={row.y + 30} anchor="start" size={13}>{row.examples}</Label>
        </g>
      ))}
      <Label x={360} y={332} size={11} fill={C.muted}>
        {ru ? "Одно намерение, одна короткая фраза, затем подтверждение." : "Jedna intencja, jedna krotka fraza, potem potwierdzenie."}
      </Label>
    </Base>
  );
}

function NavtexDiagram() {
  const { lang } = useI18n();
  const ru = lang === "ru";
  const fields = [
    { x: 92, code: "ZCZC", label: ru ? "начало" : "poczatek", c: C.muted },
    { x: 226, code: "J", label: ru ? "станция B1" : "stacja B1", c: C.cyan },
    { x: 338, code: "A", label: ru ? "категория B2" : "kategoria B2", c: C.amber },
    { x: 454, code: "23", label: ru ? "номер B3B4" : "numer B3B4", c: C.green },
    { x: 608, code: "NNNN", label: ru ? "конец" : "koniec", c: C.muted },
  ];
  return (
    <Base
      title={ru ? "Анатомия заголовка NAVTEX" : "Anatomia naglowka NAVTEX"}
      desc={ru ? "ZCZC начинает сообщение, J указывает станцию, A категорию, 23 номер, NNNN завершает сообщение." : "ZCZC rozpoczyna komunikat, J wskazuje stacje, A kategorie, 23 numer, a NNNN konczy komunikat."}
    >
      {fields.map((field) => (
        <g key={field.code}>
          <rect x={field.x - 50} y="74" width="100" height="72" rx="12" fill={C.panel} stroke={field.c} strokeWidth="2" />
          <Label x={field.x} y={111} size={20} fill={field.c}>{field.code}</Label>
          <Label x={field.x} y={134} size={10} fill={C.muted}>{field.label}</Label>
        </g>
      ))}
      <rect x="78" y="206" width="258" height="72" rx="14" fill="rgba(0,212,255,0.07)" stroke={C.cyan} />
      <Label x={207} y={237} size={18} fill={C.cyan}>518 kHz</Label>
      <Label x={207} y={260} size={11}>{ru ? "международный, английский" : "miedzynarodowy, angielski"}</Label>
      <rect x="384" y="206" width="258" height="72" rx="14" fill="rgba(255,170,0,0.07)" stroke={C.amber} />
      <Label x={513} y={237} size={18} fill={C.amber}>490 kHz</Label>
      <Label x={513} y={260} size={11}>{ru ? "национальный язык" : "jezyk krajowy"}</Label>
      <Label x={360} y={330} size={11} fill={C.muted}>
        {ru ? "Номер 00 передается как специальное сообщение." : "Numer 00 jest traktowany jako komunikat specjalny."}
      </Label>
    </Base>
  );
}

function EpirbDiagram() {
  const { lang } = useI18n();
  const ru = lang === "ru";
  const nodes = [
    { x: 34, t: "EPIRB", s: "406 MHz", c: C.red },
    { x: 190, t: ru ? "СПУТНИКИ" : "SATELITY", s: "LEO / GEO / MEO", c: C.cyan },
    { x: 360, t: "LUT", s: ru ? "прием" : "odbior", c: C.cyan },
    { x: 500, t: "MCC", s: ru ? "маршрутизация" : "dystrybucja", c: C.amber },
    { x: 630, t: "RCC", s: "SAR", c: C.green },
  ];
  return (
    <Base
      title={ru ? "Путь сигнала EPIRB" : "Droga sygnalu EPIRB"}
      desc={ru ? "Сигнал 406 МГц проходит через спутники, LUT и MCC к спасательному координационному центру." : "Sygnal 406 MHz przechodzi przez satelity, LUT i MCC do ratowniczego osrodka koordynacyjnego."}
    >
      <ArrowDefs id="epirb-arrow" />
      {nodes.map((node, index) => (
        <g key={node.t}>
          <circle cx={node.x} cy="145" r={index === 1 ? 54 : 42} fill={C.panel} stroke={node.c} strokeWidth="2" />
          <Label x={node.x} y={142} size={index === 1 ? 11 : 13} fill={node.c}>{node.t}</Label>
          <Label x={node.x} y={162} size={10} fill={C.muted}>{node.s}</Label>
          {index < nodes.length - 1 && (
            <path d={`M${node.x + (index === 1 ? 56 : 44)} 145 H${nodes[index + 1].x - (index + 1 === 1 ? 58 : 46)}`} stroke={C.muted} strokeWidth="2" markerEnd="url(#epirb-arrow)" />
          )}
        </g>
      ))}
      <rect x="105" y="242" width="510" height="64" rx="14" fill="rgba(0,212,255,0.06)" stroke={C.line} />
      <Label x={130} y={268} anchor="start" size={12} fill={C.cyan}>GNSS / DOPPLER</Label>
      <Label x={130} y={290} anchor="start" size={11}>{ru ? "дает позицию, регистрация связывает код с судном" : "daje pozycje, rejestracja laczy kod z jednostka"}</Label>
      <Label x={360} y={342} size={11} fill={C.muted}>
        {ru ? "121,5 МГц помогает наводиться рядом с целью." : "121,5 MHz pomaga w naprowadzaniu blisko celu."}
      </Label>
    </Base>
  );
}

function SartDiagram() {
  const { lang } = useI18n();
  const ru = lang === "ru";
  return (
    <Base
      title={ru ? "Как изображение Radar SART меняется при сближении" : "Jak zmienia sie obraz Radar SART przy zblizaniu"}
      desc={ru ? "Вдали видны двенадцать точек, ближе дуги, совсем близко окружности." : "Daleko widac dwanascie kropek, blizej luki, a bardzo blisko okregi."}
    >
      <g transform="translate(50 54)">
        {Array.from({ length: 12 }, (_, index) => (
          <circle key={index} cx={20 + index * 18} cy="72" r="4" fill={C.cyan} />
        ))}
        <Label x={118} y={20} size={14} fill={C.cyan}>{ru ? "ДАЛЕКО" : "DALEKO"}</Label>
        <Label x={118} y={108} size={11} fill={C.muted}>{ru ? "12 точек" : "12 kropek"}</Label>
      </g>
      <g transform="translate(280 54)">
        {Array.from({ length: 6 }, (_, index) => (
          <path key={index} d={`M${20 + index * 30} 82 A28 28 0 0 1 ${35 + index * 30} 54`} fill="none" stroke={C.amber} strokeWidth="4" />
        ))}
        <Label x={98} y={20} size={14} fill={C.amber}>{ru ? "БЛИЖЕ" : "BLIZEJ"}</Label>
        <Label x={98} y={108} size={11} fill={C.muted}>{ru ? "дуги" : "luki"}</Label>
      </g>
      <g transform="translate(520 48)">
        {[54, 40, 26].map((radius) => (
          <circle key={radius} cx="74" cy="72" r={radius} fill="none" stroke={C.red} strokeWidth="3" />
        ))}
        <Label x={74} y={16} size={14} fill={C.red}>{ru ? "РЯДОМ" : "BLISKO"}</Label>
        <Label x={74} y={142} size={11} fill={C.muted}>{ru ? "окружности" : "okregi"}</Label>
      </g>
      <rect x="85" y="250" width="550" height="58" rx="14" fill={C.panel} stroke={C.line} />
      <Label x={110} y={275} anchor="start" size={12} fill={C.green}>X-BAND 9,2-9,5 GHz</Label>
      <Label x={110} y={296} anchor="start" size={11}>{ru ? "Высота SART увеличивает дальность обнаружения." : "Wysokosc SART zwieksza zasieg wykrycia."}</Label>
    </Base>
  );
}

function AisSartDiagram() {
  const { lang } = useI18n();
  const ru = lang === "ru";
  return (
    <Base
      title={ru ? "Radar SART и AIS-SART используют разные экраны" : "Radar SART i AIS-SART uzywaja innych ekranow"}
      desc={ru ? "Radar SART отвечает радару X-band, AIS-SART передает позицию на AIS и обозначается кругом с крестом." : "Radar SART odpowiada radarowi X-band, AIS-SART wysyla pozycje do AIS i jest oznaczany okregiem z krzyzem."}
    >
      <rect x="40" y="52" width="290" height="230" rx="18" fill={C.panel} stroke={C.cyan} strokeWidth="2" />
      <Label x={185} y={84} size={16} fill={C.cyan}>RADAR SART</Label>
      {Array.from({ length: 12 }, (_, index) => (
        <circle key={index} cx={82 + index * 17} cy="160" r="4" fill={C.cyan} />
      ))}
      <Label x={185} y={208} size={12}>X-BAND 9 GHz</Label>
      <Label x={185} y={240} size={11} fill={C.muted}>{ru ? "нет координат AIS" : "bez pozycji AIS"}</Label>
      <rect x="390" y="52" width="290" height="230" rx="18" fill={C.panel} stroke={C.green} strokeWidth="2" />
      <Label x={535} y={84} size={16} fill={C.green}>AIS-SART</Label>
      <circle cx="535" cy="157" r="38" fill="none" stroke={C.green} strokeWidth="3" />
      <path d="M510 132 L560 182 M560 132 L510 182" stroke={C.green} strokeWidth="4" />
      <Label x={535} y={218} size={13}>970 XX YYYY</Label>
      <Label x={535} y={242} size={11} fill={C.muted}>{ru ? "позиция на AIS" : "pozycja w AIS"}</Label>
      <Label x={360} y={330} size={11} fill={C.muted}>
        {ru ? "Оба ведут к пострадавшим, но один не заменяет приемник другого." : "Oba prowadza do rozbitkow, ale wymagaja innych odbiornikow."}
      </Label>
    </Base>
  );
}

function WorldDiagram() {
  const { lang } = useI18n();
  const ru = lang === "ru";
  const regions = [
    { x: 32, title: ru ? "МОРЕ ЕВРОПЫ" : "MORZE EUROPA", lines: ["INT", "DSC CH 70", "VTS / PORT"], c: C.cyan },
    { x: 205, title: ru ? "EU INLAND" : "EU INLAND", lines: ["ATIS", ru ? "часто без DSC" : "czesto bez DSC", ru ? "малая мощность" : "mala moc"], c: C.amber },
    { x: 378, title: "USA / CAN", lines: ["USA / CAN mode", "CH 09 radio check", "Rescue 21 DSC"], c: C.green },
    { x: 551, title: ru ? "АВСТРАЛИЯ" : "AUSTRALIA", lines: ["local channels", "CH 16 / 67", "ACMA"], c: C.red },
  ];
  return (
    <Base
      title={ru ? "Глобальная основа и региональные правила" : "Globalny rdzen i reguly regionalne"}
      desc={ru ? "Международные MAYDAY, DSC и SMCP остаются общими, а каналы, ATIS и radio check меняются по региону." : "Miedzynarodowe MAYDAY, DSC i SMCP sa wspolne, a kanaly, ATIS i radio check zmieniaja sie regionalnie."}
    >
      <rect x="74" y="34" width="572" height="94" rx="22" fill="rgba(0,212,255,0.07)" stroke={C.cyan} strokeWidth="2" />
      <Label x={360} y={67} size={14} fill={C.cyan}>{ru ? "ГЛОБАЛЬНАЯ ОСНОВА" : "GLOBALNY RDZEN"}</Label>
      <Label x={360} y={92} size={18}>MAYDAY + DSC + SMCP + GMDSS</Label>
      <Label x={360} y={113} size={11} fill={C.muted}>ITU + IMO</Label>
      <path d="M360 128 V164" stroke={C.cyan} strokeWidth="3" />
      <Label x={360} y={155} size={11} fill={C.muted}>{ru ? "добавь местный слой" : "dodaj lokalna nakladke"}</Label>
      {regions.map((region) => (
        <g key={region.title} transform={`translate(${region.x} 174)`}>
          <rect width="138" height="136" rx="14" fill={C.panel} stroke={region.c} strokeWidth="2" />
          <Label x={69} y={28} size={11} fill={region.c}>{region.title}</Label>
          {region.lines.map((line, index) => (
            <g key={line}>
              <circle cx="18" cy={57 + index * 25} r="3" fill={region.c} />
              <Label x={30} y={61 + index * 25} anchor="start" size={10} fill={C.muted}>{line}</Label>
            </g>
          ))}
        </g>
      ))}
      <Label x={360} y={340} size={11} fill={C.muted}>
        {ru ? "Перед рейсом: план каналов, документы, VTS, Notices to Mariners" : "Przed rejsem: plan kanalow, dokumenty, VTS, Notices to Mariners"}
      </Label>
    </Base>
  );
}

export function TheoryDiagram({ id }: { id: DiagramId }) {
  switch (id) {
    case "system":
      return <SystemDiagram />;
    case "horizon":
      return <HorizonDiagram />;
    case "controls":
      return <ControlsDiagram />;
    case "channels":
      return <ChannelsDiagram />;
    case "identity":
      return <IdentityDiagram />;
    case "routine":
      return <RoutineDiagram />;
    case "dsc":
      return <DscDiagram />;
    case "priority":
      return <PriorityDiagram />;
    case "mayday":
      return <MaydayDiagram />;
    case "receive":
      return <ReceiveDiagram />;
    case "power":
      return <PowerDiagram />;
    case "smcp":
      return <SmcpDiagram />;
    case "navtex":
      return <NavtexDiagram />;
    case "epirb":
      return <EpirbDiagram />;
    case "sart":
      return <SartDiagram />;
    case "ais-sart":
      return <AisSartDiagram />;
    case "gmdss":
      return <GmdssDiagram />;
    case "world":
      return <WorldDiagram />;
  }
}
