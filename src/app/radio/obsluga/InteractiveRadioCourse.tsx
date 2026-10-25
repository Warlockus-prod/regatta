'use client';

import { useRadioI18n } from "@/app/radio/localization/context";
import { useRouter } from 'next/navigation';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSternikPrefs, RadioVariantToggle } from "@/app/radio/prefs";
import RadioFront from '../symulator/RadioFront';
import { recordRadioCommand, recordRadioCommandFailure } from '../symulator/commandDiagnostics';
import { InspectPanel } from '../symulator/InspectPanel';
import { InspectToggle, PanelSection, RadioWorkspace, DockPanel, SoundToggle, useRadioWorkspace } from '../symulator/RadioWorkspace';
import { radioRuntimeSearch } from '../runtimeSearch';
import VoicePtt, { type VoiceResult } from '../symulator/VoicePtt';
import { useRadioAudio } from '../symulator/audio/useRadioAudio';
import { fetchStationVoice } from '../symulator/audio/stationVoice';
import { SIG_STRONG, SIG_WEAK, scriptOver } from '../symulator/radioTraffic';
import { stationReply } from '../symulator/stationReply';
import type { VariantData } from '../symulator/scenarios';
import { DEFAULT_VENUE } from '../symulator/venues';
import { LESSON_TEXT } from './lessonData';
import {
  CHANNELS, DEFAULT_VARIANT, OTHERDSC_CATEGORIES, POSITION_POOL, VESSEL_POOL,
  createInitialRadio, otherDscRows, radioProfile, radioReducer,
  type RadioEvent, type RadioModel, type RadioState,
} from '../symulator/radioModel';

const COURSE_KEY = 'sternik.radio.guide.v2';

interface JournalRow { t: number; text: string; kind: 'tx' | 'rx' | 'ui' | 'step' | 'bad' }

/** the identity the learner speaks as during the guide's voice practice */
const VARIANT: VariantData = {
  vessel: VESSEL_POOL[DEFAULT_VARIANT.vesselIdx],
  posSpoken: POSITION_POOL[DEFAULT_VARIANT.posIdx].spoken,
  pobWord: 'FOUR',
  pob: DEFAULT_VARIANT.pob,
  venue: DEFAULT_VENUE,
};

/** what the learner says at the PTT lesson - a radio check, the safest first transmission */
const CHECK_LINES = (v: VariantData) => [
  'MARINA GDYNIA, MARINA GDYNIA',
  `THIS IS ${v.vessel.name}, ${v.vessel.name}`,
  'RADIO CHECK, OVER',
];

/**
 * Two station transmissions the learner can just LISTEN to, before ever keying
 * the mic. Hearing what a radio voice actually sounds like - clipped, band-limited,
 * arriving out of the hiss - is a skill of its own, and it is the half of the
 * exam that a text-only trainer never touches.
 */
const LISTEN_LINES = [
  {
    station: 'MARINA GDYNIA',
    say: 'WIND DANCER, THIS IS MARINA GDYNIA, READING YOU LOUD AND CLEAR. BERTH AVAILABLE ON PONTOON C. OVER.',
  },
  {
    station: 'POLISH RESCUE RADIO',
    say: 'SECURITE SECURITE SECURITE, ALL STATIONS ALL STATIONS ALL STATIONS, THIS IS POLISH RESCUE RADIO POLISH RESCUE RADIO POLISH RESCUE RADIO. FOR A NAVIGATIONAL WARNING LISTEN ON CHANNEL SIX SEVEN. OUT.',
  },
];

interface Lesson {
  id: string;
  title: string;
  instruction: string;
  why: string;
  highlight: (state: RadioState) => string;
  check: (event: RadioEvent, prev: RadioState, next: RadioState) => boolean;
}

function channelNumber(state: RadioState): string {
  return CHANNELS[state.channelIndex].num;
}

export default function InteractiveRadioCourse() {
  const router = useRouter();
  const { rt: radioText } = useRadioI18n();
  const { tp, tl, lang } = useRadioI18n();
  const { explLang, radioRealistic } = useSternikPrefs();
  // The realistic look is amber; the trainer models are green.
  const skin = radioRealistic ? 'amber' : 'green';
  // Explanation strings are adapted to the selected radio course language.
  const showRu = lang === 'ru' && explLang !== 'pl';
  const showPl = explLang !== 'ru' || lang !== 'ru';
  const [inspect, setInspect] = useState(false);
  const [inspectKey, setInspectKey] = useState<string | null>(null);
  const [model, setModel] = useState<RadioModel>('M330');
  const [testCallAt, setTestCallAt] = useState<number | null>(null);
  const stateRef = useRef<RadioState>(createInitialRadio('M330'));
  const [, render] = useState(0);
  const state = stateRef.current;
  const [lessonIndex, setLessonIndex] = useState(0);
  const [lessonDone, setLessonDone] = useState(false);
  const [savedProgress, setSavedProgress] = useState<Record<RadioModel, number>>({ M330: 0, M323: 0 });
  const [holdPct, setHoldPct] = useState(0);
  const holdRaf = useRef<number | null>(null);
  const audioRef = useRef<AudioContext | null>(null);
  const soundTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  /** the lessons' work screen is open (pinned radio, lesson panel under it);
   *  the Practice list links here with ?kurs=1 to open it straight away */
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (new URLSearchParams(radioRuntimeSearch()).get('kurs') === '1') setOpen(true);
  }, []);
  const { stacked, compact } = useRadioWorkspace(open, radioRealistic);
  const dockRef = useRef<HTMLDivElement | null>(null);

  const lessons = useMemo<Lesson[]>(() => [
    {
      id: 'power',
      title: tp('1. Питание', '1. Power', '1. Zasilanie'),
      instruction: tp('Удерживай центр ручки DIAL ровно 1 секунду.', 'Hold the center of DIAL for one second.', 'Przytrzymaj środek DIAL przez 1 sekundę.'),
      why: tp('Короткое нажатие не включает рацию: оно открывает настройку громкости. На экзамене важно именно удержание.', 'A short press does not power the set: it opens volume adjustment. The one second hold matters in the exam.', 'Krótkie naciśnięcie nie włącza radia: otwiera regulację głośności. Na egzaminie liczy się przytrzymanie.'),
      highlight: () => 'dial-center',
      check: (event, prev, next) => event.type === 'dial-hold' && !prev.power && next.power,
    },
    // The order below is the manual's, not ours: "First, open the squelch. Then,
    // adjust the audio output level. After that, adjust the squelch level until
    // the noise just disappears." (IC-M323 p.13). We used to teach volume first,
    // which cannot work: at the factory squelch the radio is silent, and you
    // cannot set a volume against silence. That is precisely why the real
    // procedure starts by opening the squelch.
    {
      id: 'squelch-open',
      title: tp('2. Открой шумоподавитель', '2. Open the squelch', '2. Otwórz blokadę szumów'),
      instruction: tp('Нажимай DIAL, пока не появится SQL, и крути влево до значения OPEN. Услышишь шум эфира - так и должно быть.', 'Push DIAL until SQL appears and turn it down to OPEN. You will hear the hiss of the open channel - that is the point.', 'Naciskaj DIAL, aż pojawi się SQL, i kręć w lewo do pozycji OPEN. Usłyszysz szum eteru - o to właśnie chodzi.'),
      why: tp('Пустой канал не бывает тихим: приёмник усиливает шум. Этот шум - твой эталон, по нему ты сейчас выставишь громкость.', 'An idle channel is not silent: the receiver amplifies noise. That hiss is your reference signal - you are about to set the volume against it.', 'Pusty kanał nie jest cichy: odbiornik wzmacnia szum. Ten szum to twój wzorzec - zaraz ustawisz według niego głośność.'),
      highlight: (s) => (s.screen === 'squelch' ? 'dial-ccw' : 'dial-center'),
      check: (_event, prev, next) => next.screen === 'squelch' && next.squelch === 0 && prev.squelch !== 0,
    },
    {
      id: 'volume',
      title: tp('3. Громкость - по шуму', '3. Volume - against the hiss', '3. Głośność - według szumu'),
      instruction: tp('Нажми DIAL, чтобы выйти на VOL, и выставь громкость так, чтобы шум был слышен у руля.', 'Push DIAL to reach VOL and set the volume so the hiss is audible at the helm.', 'Naciśnij DIAL, aby wejść na VOL, i ustaw głośność tak, by szum było słychać przy sterze.'),
      why: tp('У рации 20 уровней и OFF. Громкость влияет только на динамик и никак не на дальность передачи. Именно поэтому громкость ставят по шуму: тишину настроить нельзя.', 'The set has 20 levels plus OFF. Volume affects the speaker, never the transmit range. And it is set against the hiss because you cannot set a level against silence.', 'Radio ma 20 poziomów i OFF. Głośność wpływa na głośnik, nigdy na zasięg nadawania. Ustawia się ją według szumu, bo ciszy nie da się wyregulować.'),
      highlight: () => 'dial-cw',
      check: (event, prev, next) => event.type === 'dial-rotate' && next.screen === 'volume' && next.volume !== prev.volume,
    },
    {
      id: 'squelch',
      title: tp('4. Порог SQL', '4. The squelch threshold', '4. Próg blokady szumów'),
      instruction: tp('Вернись на SQL и поднимай порог, пока шум не пропадёт. Остановись на этом делении.', 'Go back to SQL and raise it until the hiss just disappears. Stop at that click.', 'Wróć na SQL i podnoś próg, aż szum właśnie zniknie. Zatrzymaj się na tym miejscu.'),
      why: tp('Слишком высокий SQL скрывает слабые вызовы: далёкая лодка на 1 Вт просто не пробьётся. Порог - это первое деление, на котором ровный шум исчез, не выше.', 'Too much squelch hides weak calls: a distant boat on 1 W simply will not break through. The threshold is the first click where the steady hiss dies - no further.', 'Zbyt wysoki SQL ukrywa słabe wywołania: odległa łódź na 1 W po prostu się nie przebije. Próg to pierwsze miejsce, w którym stały szum zniknął - ani kroku dalej.'),
      highlight: (s) => (s.screen === 'squelch' ? 'dial-cw' : 'dial-center'),
      check: (event, prev, next) => event.type === 'dial-rotate' && next.screen === 'squelch' && next.squelch > prev.squelch && next.squelch >= 3,
    },
    {
      id: 'channel',
      title: tp('5. Рабочий канал', '5. Working channel', '5. Kanał roboczy'),
      instruction: tp('Клавишами вверх/вниз выбери канал 12.', 'Use the up/down keys to select channel 12.', 'Klawiszami góra/dół wybierz kanał 12.'),
      why: tp('На M330 каналы выбирают стрелками, не вращением DIAL в режиме ожидания. Канал 12 используется портом и мариной Гдыня.', 'On M330, standby channels use the arrow keys, not DIAL rotation. Channel 12 is used by Gdynia port and marina.', 'Na M330 kanały w trybie czuwania wybiera się strzałkami, nie DIAL. Kanał 12 jest używany przez port i marinę Gdynia.'),
      highlight: (s) => ['volume', 'squelch', 'channel-select', 'backlight'].includes(s.screen) ? 'key-clr' : 'key-down',
      check: (_event, prev, next) => channelNumber(prev) !== '12' && channelNumber(next) === '12',
    },
    {
      id: 'channel16',
      title: tp('6. Аварийный канал 16', '6. Distress channel 16', '6. Kanał alarmowy 16'),
      instruction: tp('Коротко нажми 16/C.', 'Press 16/C briefly.', 'Naciśnij krótko 16/C.'),
      why: tp('Короткое нажатие из любого обычного экрана немедленно возвращает на канал бедствия и вызова 16.', 'A short press from any normal screen immediately selects distress and calling channel 16.', 'Krótkie naciśnięcie z normalnego ekranu natychmiast wybiera kanał alarmowy i wywoławczy 16.'),
      highlight: () => 'key-16c',
      check: (event, _prev, next) => event.type === 'key-16c' && channelNumber(next) === '16',
    },
    {
      id: 'call-channel',
      title: tp('7. Call Channel', '7. Call Channel', '7. Kanał wywoławczy'),
      instruction: tp('Теперь удерживай 16/C 1 секунду.', 'Now hold 16/C for one second.', 'Teraz przytrzymaj 16/C przez 1 sekundę.'),
      why: tp('Длинное нажатие выбирает запрограммированный Call Channel. В тренажере это канал 06.', 'The long press selects the programmed Call Channel. In this trainer it is channel 06.', 'Długie naciśnięcie wybiera zaprogramowany kanał wywoławczy. W trenerze jest to kanał 06.'),
      highlight: () => 'key-16c',
      check: (event, _prev, next) => event.type === 'key-16c-hold' && channelNumber(next) === '06',
    },
    {
      id: 'power-level',
      title: tp('8. Мощность 25W / 1W', '8. Power 25W / 1W', '8. Moc 25W / 1W'),
      instruction: tp('Перейди на первую страницу софтклавиш и нажми HI/LO.', 'Return to the first softkey page and press HI/LO.', 'Wróć do pierwszej strony klawiszy i naciśnij HI/LO.'),
      why: tp('Выбирай минимальную достаточную мощность: обычно 1W вблизи, 25W при слабой связи и бедствии. Каналы 15, 17, 75 и 76 принудительно ограничены малой мощностью.', 'Use the minimum effective power: normally 1 W nearby, 25 W for a weak link and distress. Channels 15, 17, 75 and 76 are limited to low power.', 'Używaj najmniejszej skutecznej mocy: zwykle 1 W blisko, 25 W przy słabym sygnale i w niebezpieczeństwie. Kanały 15, 17, 75 i 76 są ograniczone do małej mocy.'),
      highlight: (s) => s.softPage === 0 ? 'soft-2' : 'key-left',
      check: (event, prev, next) => event.type === 'soft' && prev.hiPower && !next.hiPower,
    },
    {
      id: 'dual-watch',
      title: tp('9. Dual Watch', '9. Dual Watch', '9. Nasłuch podwójny'),
      instruction: tp('Стрелкой вправо открой страницу DW и нажми клавишу под DW.', 'Use the right arrow to reveal DW, then press the key below DW.', 'Strzałką w prawo pokaż DW, potem naciśnij klawisz pod DW.'),
      why: tp('Dual Watch попеременно слушает выбранный рабочий канал и 16, чтобы не пропустить бедствие.', 'Dual Watch alternates between the working channel and channel 16, so distress traffic is not missed.', 'Nasłuch podwójny sprawdza kanał roboczy i 16, aby nie przegapić ruchu alarmowego.'),
      highlight: (s) => s.model === 'M323' || s.softPage === 1 ? 'soft-1' : 'key-right',
      check: (event, _prev, next) => event.type === 'soft' && next.dualWatch,
    },
    {
      id: 'backlight',
      title: tp('10. Подсветка', '10. Backlight', '10. Podświetlenie'),
      instruction: tp('На странице DW нажми BKLT, затем поверни DIAL.', 'On the DW page press BKLT, then rotate DIAL.', 'Na stronie DW naciśnij BKLT, potem obróć DIAL.'),
      why: tp('Подсветка экрана и клавиш регулируется от OFF до 7. Ночью используй минимальный читаемый уровень.', 'Display and key backlight runs from OFF to 7. At night use the lowest readable level.', 'Podświetlenie ekranu i klawiszy ma zakres OFF do 7. W nocy użyj najniższego czytelnego poziomu.'),
      highlight: (s) => s.screen === 'backlight' ? 'dial-cw' : s.softPage === 1 ? 'soft-3' : 'key-right',
      check: (event, prev, next) => event.type === 'dial-rotate' && next.screen === 'backlight' && next.backlight !== prev.backlight,
    },
    {
      id: 'menu',
      title: tp('11. Главное меню', '11. Main menu', '11. Menu główne'),
      instruction: tp('Вернись кнопкой CLEAR/CLR и открой MENU.', 'Return with CLEAR/CLR and open MENU.', 'Wróć przyciskiem CLEAR/CLR i otwórz MENU.'),
      why: tp('M330 и M323 имеют разное дерево меню. Тренажер переключает не только надпись на панели, но и набор пунктов.', 'M330 and M323 have different menu trees. The trainer changes both the faceplate and the available items.', 'M330 i M323 mają różne drzewa menu. Trener zmienia panel i dostępne pozycje.'),
      highlight: (s) => s.screen === 'standby' ? 'key-menu' : 'key-clr',
      check: (_event, prev, next) => prev.screen !== 'menu' && next.screen === 'menu',
    },
    {
      id: 'other-dsc',
      title: tp('12. Меню вызовов DSC', '12. DSC calls menu', '12. Menu wywołań DSC'),
      instruction: tp('M330: выбери Other DSC. M323: ENT на DSC Calls, затем выбери All Ships Call.', 'M330: select Other DSC. M323: press ENT on DSC Calls, then select All Ships Call.', 'M330: wybierz Other DSC. M323: ENT na DSC Calls, potem wybierz All Ships Call.'),
      why: tp('Здесь создаются Individual, Group, All Ships и Test вызовы. Красная DISTRESS для них не используется.', 'This is where Individual, Group, All Ships and Test calls are composed. The red DISTRESS key is not used.', 'Tutaj tworzysz wywołania Individual, Group, All Ships i Test. Czerwony DISTRESS nie jest do tego używany.'),
      highlight: (s) => {
        if (s.model === 'M323') {
          if (s.screen === 'menu') return s.menuCursor === 0 ? 'key-ent' : 'key-up';
          if (s.screen === 'm323-dsc-calls') return s.m323CallCursor === 2 ? 'key-ent' : 'key-down';
          return 'key-menu';
        }
        return s.screen === 'menu' && s.menuCursor === 1 ? 'key-ent' : 'key-down';
      },
      check: (_event, prev, next) => prev.screen !== 'otherdsc-compose' && next.screen === 'otherdsc-compose',
    },
    {
      id: 'safety-dsc',
      title: tp('13. All Ships Safety', '13. All Ships Safety', '13. All Ships Safety'),
      instruction: tp('Выбери Category: Safety, оставь рабочий канал 16 и отправь Send.', 'Select Category: Safety, keep working channel 16, and send.', 'Wybierz Category: Safety, zostaw kanał roboczy 16 i wyślij Send.'),
      why: tp('Цифровое объявление уходит на 70 канале, после чего голосовое SECURITE передают на 16 или указанном рабочем канале.', 'The digital announcement goes on channel 70, followed by the spoken SECURITE on 16 or a stated working channel.', 'Zapowiedź cyfrowa idzie na kanale 70, potem głosowe SECURITE na 16 lub wskazanym kanale roboczym.'),
      highlight: (s) => {
        if (s.screen === 'otherdsc-field') return s.odFieldCursor === 1 ? 'key-ent' : 'key-down';
        const rows = otherDscRows(s);
        const categoryIndex = rows.indexOf('category');
        if (OTHERDSC_CATEGORIES[s.odCategory] !== 'Safety') return s.odCursor === categoryIndex ? 'key-ent' : 'key-down';
        return s.odCursor === otherDscSendIndex(s) ? 'key-ent' : 'key-down';
      },
      check: (event, _prev, next) => event.type === 'ent' && next.screen === 'otherdsc-sent' && next.odSent?.type === 'All Ships' && next.odSent?.category === 'Safety',
    },
    {
      id: 'ptt',
      title: tp('14. Физическая PTT', '14. Physical PTT', '14. Fizyczny PTT'),
      instruction: tp('Удержи PTT на ручном микрофоне, затем отпусти.', 'Hold PTT on the fist microphone, then release it.', 'Przytrzymaj PTT na mikrofonie ręcznym, potem puść.'),
      why: tp('Пока PTT нажата, рация передает и не принимает. Говори короткими фразами и отпускай кнопку для ответа.', 'While PTT is held, the set transmits and cannot receive. Use short phrases and release to listen.', 'Gdy PTT jest wciśnięty, radio nadaje i nie odbiera. Mów krótko i puszczaj, aby słuchać.'),
      highlight: () => 'ptt',
      check: (event, _prev, next) => event.type === 'ptt-down' && next.ptt,
    },
    {
      id: 'distress',
      title: tp('15. DISTRESS под крышкой', '15. DISTRESS under the cover', '15. DISTRESS pod osłoną'),
      instruction: tp('Вернись STBY, открой защитную крышку и удерживай красную DISTRESS 3 секунды.', 'Return to STBY, open the cover, and hold red DISTRESS for three seconds.', 'Wróć do STBY, otwórz osłonę i trzymaj czerwony DISTRESS przez 3 sekundy.'),
      why: tp('Три коротких сигнала переходят в непрерывный. Только после полного удержания DSC-алерт уходит на канале 70.', 'Three short beeps become a continuous tone. Only after the full hold is the DSC alert sent on channel 70.', 'Trzy krótkie sygnały przechodzą w ciągły. Dopiero po pełnym przytrzymaniu alert DSC idzie na kanale 70.'),
      highlight: (s) => s.screen === 'otherdsc-sent' ? 'soft-0' : 'distress-cover',
      check: (event) => event.type === 'distress-held',
    },
  ], [tp]);

  const currentLesson = lessons[lessonIndex];
  const audio = useRadioAudio(stateRef.current);

  // The Dziennik. The simulator had one and the guide did not - so the learner
  // meeting the radio for the FIRST time got no record of what the set actually
  // did, and no record of what they said. Same panel, same rules, here too.
  const [journal, setJournal] = useState<JournalRow[]>([]);
  const pushJournal = useCallback((text: string, kind: JournalRow['kind'] = 'ui') => {
    setJournal((l) => [...l.slice(-60), { t: Date.now(), text, kind }]);
  }, []);
  const audioApi = useRef(audio);
  audioApi.current = audio;

  const [speaking, setSpeaking] = useState(false);

  /**
   * A station comes on the air. The voice is a CARRIER on the channel you are
   * sitting on - so it opens your squelch, quiets the hiss, and is scaled by your
   * volume, exactly like every other signal. Set the squelch too high and you
   * will not hear it, which is the lesson rather than a bug.
   */
  const stationSpeaks = useCallback(async (station: string, say: string) => {
    const a = audioApi.current;
    a.unlock();
    pushJournal(`📻 ${station}: ${say}`, 'rx');
    setSpeaking(true);
    try {
      const raw = await fetchStationVoice(say);
      // No TTS (offline / no key) means no transmission: the written reply is
      // still in the journal, but we do NOT put a carrier on the air just to make
      // the synthetic babble wail into silence.
      if (!raw) return;
      const voiceMs = await a.speak(raw);
      if (voiceMs <= 0) return;
      // The carrier lasts exactly as long as the voice (+ a short tail), so the
      // squelch closes when the station stops - no droning after the words.
      const s = stateRef.current;
      scriptOver(CHANNELS[s.channelIndex].num, {
        startMs: Date.now(), durMs: Math.round(voiceMs) + 300, signal: SIG_STRONG, voice: 'male',
      });
    } finally {
      setSpeaking(false);
    }
  }, [pushJournal]);

  const onVoiceDone = useCallback((r: VoiceResult | null) => {
    if (!r) return;
    // the whole point of the journal: you see YOUR OWN words, and what was missing
    pushJournal(`🎙 ${tp('Ты сказал', 'You said', 'Powiedziałeś')}: "${r.transcript.trim()}"`, 'tx');
    for (const c of r.checks.filter((x) => !x.ok)) {
      pushJournal(`✗ ${tp('Не прозвучало', 'Missing', 'Nie padło')}: ${c.label}`, 'bad');
    }
    pushJournal(`${tp('Оценка передачи', 'Transmission graded', 'Ocena nadania')}: ${r.score}%`, r.score >= 70 ? 'step' : 'ui');
    if (r.score >= 40) {
      const reply = stationReply('radio-check', VARIANT.vessel.name);
      if (reply) void stationSpeaks(reply.station, reply.say);
    }
  }, [pushJournal, stationSpeaks, tp]);

  useEffect(() => {
    try {
      const parsed = JSON.parse(window.localStorage.getItem(COURSE_KEY) ?? '{}') as Partial<Record<RadioModel, number>>;
      setSavedProgress({ M330: parsed.M330 ?? 0, M323: parsed.M323 ?? 0 });
      // Resume where the learner left off instead of forcing lesson 1 every visit.
      // The bar already showed N/15; the lesson header used to disagree with it.
      const done = parsed[model] ?? 0;
      if (done > 0) setLessonIndex(Math.min(done, lessons.length - 1));
    } catch { /* ignore */ }
    // model is the mount-time default here; chooseModel handles later switches.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessons.length]);

  const playTone = useCallback((frequency: number, durationMs: number) => {
    try {
      if (!audioRef.current) audioRef.current = new AudioContext();
      const context = audioRef.current;
      void context.resume();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.frequency.value = frequency;
      gain.gain.value = 0.035;
      oscillator.connect(gain).connect(context.destination);
      oscillator.start();
      setTimeout(() => { oscillator.stop(); oscillator.disconnect(); gain.disconnect(); }, durationMs);
    } catch { /* audio is optional */ }
  }, []);

  const dispatch = useCallback((event: RadioEvent) => {
    const prev = stateRef.current;
    let next: RadioState;
    try { next = radioReducer(prev, event); }
    catch (error) { recordRadioCommandFailure(prev, event); throw error; }
    stateRef.current = next;
    recordRadioCommand(prev, event, next);
    // The radio's own sounds: a keypress, a refusal, a dial detent, the hiss
    // behind the squelch. A refused PTT on CH 70 must not sound like success.
    audio.onEvent(event, prev, next);

    // whatever the radio itself logged goes into the Dziennik
    if (next.deviceLog.length > prev.deviceLog.length) {
      const added = next.deviceLog.slice(prev.deviceLog.length);
      setJournal((l) => [...l.slice(-60), ...added.map((d) => ({ t: d.t, text: d.text, kind: d.kind as JournalRow['kind'] }))]);
    }
    if (!lessonDone && currentLesson.check(event, prev, next)) {
      setLessonDone(true);
      setSavedProgress((old) => {
        const updated = { ...old, [model]: Math.max(old[model], lessonIndex + 1) };
        try { window.localStorage.setItem(COURSE_KEY, JSON.stringify(updated)); } catch { /* ignore */ }
        return updated;
      });
    }
    render((value) => value + 1);
  }, [audio, currentLesson, lessonDone, lessonIndex, model]);

  const clearHold = useCallback(() => {
    if (holdRaf.current !== null) cancelAnimationFrame(holdRaf.current);
    holdRaf.current = null;
    setHoldPct(0);
    soundTimers.current.forEach(clearTimeout);
    soundTimers.current = [];
  }, []);

  const onDistressDown = useCallback(() => {
    dispatch({ type: 'distress-down' });
    if (stateRef.current.screen !== 'distress-hold') return;
    clearHold();
    [0, 900, 1800].forEach((delay) => {
      soundTimers.current.push(setTimeout(() => playTone(1500, 100), delay));
    });
    soundTimers.current.push(setTimeout(() => playTone(1500, 500), 2700));
    const started = performance.now();
    const tick = () => {
      const progress = Math.min(1, (performance.now() - started) / 3000);
      setHoldPct(progress);
      if (progress >= 1) {
        holdRaf.current = null;
        setHoldPct(0);
        dispatch({ type: 'distress-held' });
      } else {
        holdRaf.current = requestAnimationFrame(tick);
      }
    };
    holdRaf.current = requestAnimationFrame(tick);
  }, [clearHold, dispatch, playTone]);

  const onDistressUp = useCallback(() => {
    if (holdRaf.current !== null) {
      clearHold();
      dispatch({ type: 'distress-up' });
    }
  }, [clearHold, dispatch]);

  useEffect(() => () => {
    clearHold();
    void audioRef.current?.close().catch(() => {});
  }, [clearHold]);

  const chooseModel = (nextModel: RadioModel) => {
    setModel(nextModel);
    stateRef.current = createInitialRadio(nextModel);
    // resume this model's saved lesson rather than dropping back to lesson 1
    setLessonIndex(Math.min(savedProgress[nextModel] ?? 0, lessons.length - 1));
    setLessonDone(false);
    clearHold();
    render((value) => value + 1);
  };

  const resetCourse = () => {
    stateRef.current = createInitialRadio(model);
    setLessonIndex(0);
    setLessonDone(false);
    clearHold();
    setSavedProgress((old) => {
      const updated = { ...old, [model]: 0 };
      try { window.localStorage.setItem(COURSE_KEY, JSON.stringify(updated)); } catch { /* ignore */ }
      return updated;
    });
    render((value) => value + 1);
  };

  const nextLesson = () => {
    if (!lessonDone) return;
    if (lessonIndex < lessons.length - 1) {
      setLessonIndex((index) => index + 1);
      setLessonDone(false);
    }
  };

  const highlight = currentLesson.highlight(state);
  const complete = lessonIndex === lessons.length - 1 && lessonDone;
  const text = LESSON_TEXT[currentLesson.id];
  // a new lesson or a part tapped in Rozbiór: back to the top of the panel,
  // right under the radio
  useEffect(() => {
    dockRef.current?.scrollTo({ top: 0 });
  }, [lessonIndex, inspect, inspectKey]);

  return (
    <section id="interaktywny-kurs" className="mb-10 scroll-mt-24" data-testid="interactive-radio-course">
      {/* screen 1: the start card in the guide. The lessons themselves open on
          the radio work screen (pinned radio, lesson panel under it), the same
          one the simulator uses. */}
      <div className="rounded-2xl p-4 sm:p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
        <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
          {radioText(tp('Интерактивный курс на настоящих органах управления', 'Interactive course on real controls', 'Interaktywny kurs na prawdziwych elementach sterowania'))}
        </h2>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
          {radioText(tp('Выполняй действие на рации. Следующий урок откроется только после правильного нажатия или поворота.', 'Perform the action on the radio. The next lesson unlocks only after the correct press or rotation.', 'Wykonaj czynności na radiu. Następna lekcja odblokuje się dopiero po prawidłowym naciśnięciu lub obrocie.'))}
        </p>
        <div className="mt-3 flex items-center gap-3 text-xs" style={{ color: 'var(--text-muted)' }}>
          <div className="h-2 flex-1 overflow-hidden rounded-full" style={{ background: 'var(--bg-secondary)' }}>
            <div className="h-full transition-[width]" style={{ width: `${(savedProgress[model] / lessons.length) * 100}%`, background: 'var(--accent-cyan)' }} />
          </div>
          <span>{radioText(savedProgress[model])}/{radioText(lessons.length)}</span>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            type="button"
            data-testid="course-open"
            onClick={() => setOpen(true)}
            className="min-h-[44px] rounded-xl px-4 text-sm font-semibold"
            style={{ background: 'var(--accent-cyan)', color: 'var(--accent-ink, #04222e)' }}
          >
            {radioText(savedProgress[model] > 0
              ? `${tp('Продолжить: урок', 'Continue: lesson', 'Kontynuuj: lekcja')} ${lessonIndex + 1}`
              : tp('Начать уроки', 'Start the lessons', 'Zacznij lekcje'))}
          </button>
          <RadioVariantToggle model={model} onModel={chooseModel} />
        </div>
      </div>

      {open && (
        <RadioWorkspace
          testId="course-workspace"
          stacked={stacked}
          onExit={() => new URLSearchParams(radioRuntimeSearch()).get('kurs') === '1' ? router.back() : setOpen(false)}
          exitTestId="course-exit"
          exitTitle={new URLSearchParams(radioRuntimeSearch()).get('kurs') === '1'
            ? tl({ ru: "Назад", en: "Back", pl: "Wstecz", es: "Atrás", fr: "Retour", de: "Zurück", it: "Indietro" })
            : tp('Вернуться к инструкции', 'Back to the guide', 'Wróć do poradnika')}
          status={(
            <>
              <span className="text-xs font-semibold uppercase" style={{ color: 'var(--accent-cyan)' }}>
                {radioText(tp('Урок', 'Lesson', 'Lekcja'))} {radioText(lessonIndex + 1)}/{radioText(lessons.length)}
              </span>
              <span aria-live="polite" className="text-xs font-semibold" style={{ color: lessonDone ? 'var(--success)' : 'var(--text-muted)' }}>
                {radioText(lessonDone ? tp('Выполнено', 'Complete', 'Wykonano') : tp('Жду действие', 'Waiting for action', 'Czekam na działanie'))}
              </span>
            </>
          )}
          actions={(
            <>
              {/* Inspect ("Rozbior"): the course is where the learner meets the
                  buttons, so this is where "what does this button even do" has to be
                  answerable. While it is on, taps explain instead of acting. */}
              <InspectToggle on={inspect} onToggle={() => { setInspect((v) => !v); setInspectKey(null); }} testId="course-inspect-toggle" />
              {/* Sound. Off by default it would be silent - and a silent radio
                  cannot teach squelch at all - so it is ON, and the AudioContext
                  unlocks on the first touch of the panel (browsers refuse one made
                  any other way). */}
              <SoundToggle muted={audio.muted} onToggle={audio.toggleMute} />
            </>
          )}
          onRadioPointerDown={audio.unlock}
          radio={(
            <RadioFront
              s={state}
              dispatch={dispatch}
              model={model}
              holdPct={holdPct}
              onDistressDown={onDistressDown}
              onDistressUp={onDistressUp}
              onPttDown={() => dispatch({ type: 'ptt-down' })}
              onPttUp={() => dispatch({ type: 'ptt-up' })}
              clock="12:00"
              nextTxSec={radioProfile(model).retxSeconds}
              highlightControl={inspect ? undefined : highlight}
              inspect={inspect}
              inspectKey={inspectKey}
              onInspect={setInspectKey}
              busy={audio.busy}
              skin={skin}
              realistic={radioRealistic}
              compact={compact}
            />
          )}
          requestedPanel={inspect ? "help" : "task"}
          requestVersion={lessonIndex}
          dockRef={dockRef}
          dock={(
            <>
              <DockPanel id="help" label={tp("Справка","Help","Pomoc")}>
                <InspectPanel inspectKey={inspectKey} showPl={showPl} showRu={showRu} onSelect={(key)=>{setInspect(true);setInspectKey(key);}} className="" />
                {text && (
                  <div className="mt-4 space-y-3">
                    <LessonBlock label={tp('Что это', 'What it is', 'Co to jest')} pl={showPl ? text.whatPl : null} ru={showRu ? text.whatRu : null} />
                    <LessonBlock label={tp('Зачем это нужно', 'Why it exists', 'Po co to jest')} pl={showPl ? text.whyPl : null} ru={showRu ? text.whyRu : null} />
                    <LessonBlock label={tp('Когда используешь', 'When you use it', 'Kiedy używasz')} pl={showPl ? text.whenPl : null} ru={showRu ? text.whenRu : null} />
                    <LessonBlock label={tp('На экзамене', 'At the exam', 'Na egzaminie')} pl={showPl ? text.examPl : null} ru={showRu ? text.examRu : null} exam />
                  </div>
                )}
              </DockPanel>
              <DockPanel id="task" label={tp("Задание","Task","Zadanie")}>

              <div data-testid="course-lesson" className="rounded-2xl p-4 sm:p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
                <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{radioText(currentLesson.title)}</h3>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{radioText(currentLesson.instruction)}</p>
                <div className="mt-4 border-l-2 pl-3 text-sm leading-relaxed" style={{ borderColor: 'var(--accent-cyan)', color: 'var(--text-muted)' }}>
                  {radioText(currentLesson.why)}
                </div>

                {complete ? (
                  <div className="mt-4 rounded-md px-4 py-3 text-sm font-semibold" style={{ background: 'rgba(68,255,136,0.08)', color: 'var(--success)', border: '1px solid rgba(68,255,136,0.25)' }}>
                    {radioText(tp('Курс управления пройден. Теперь переходи к экзаменационным сценариям.', 'Control course complete. Continue with the exam scenarios.', 'Kurs obsługi ukończony. Przejdź teraz do scenariuszy egzaminacyjnych.'))}
                  </div>
                ) : (
                  // right under the task, so the next lesson is one tap away
                  // without scrolling past the long explanation
                  <button
                    type="button"
                    data-testid="course-next"
                    onClick={nextLesson}
                    disabled={!lessonDone}
                    className="mt-4 min-h-[44px] rounded-lg px-4 text-sm font-semibold disabled:opacity-35"
                    style={{ background: 'var(--accent-cyan)', color: 'var(--accent-ink, #04222e)' }}
                  >
                    {radioText(tp('Следующий урок', 'Next lesson', 'Następna lekcja'))} {radioText('>')}
                  </button>
                )}

                {/* The lesson used to stop here - "press HI/LO", and one line of why.
                    A learner who does not know what transmit power IS cannot pass an
                    oral exam on it, so every lesson now answers what / why / when, and
                    names what the examiner watches for. */}
                {/* Say it out loud. The PTT lesson is where the learner first keys the
                    mic, so it is where they first find out that a transmission is
                    graded on the WORDS, not on the button - and the Dziennik shows them
                    exactly which words they left out. */}
                {currentLesson.id === 'ptt' && (
                  <div className="mt-4 rounded-xl p-3" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
                    <div className="mb-1 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--hl-amber, #ffce4d)' }}>
                      🎙 {radioText(tp('Скажи в эфир', 'Say it on air', 'Powiedz do eteru'))}
                    </div>
                    <p className="mb-2 text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                      {radioText(tp(
                        'Проверка связи с мариной - самая безопасная первая передача. Наговори её, и марина ответит голосом. Всё, что ты сказал, попадёт в дневник.',
                        'A radio check with the marina is the safest first transmission. Speak it and the marina answers out loud. Everything you said goes into the journal.',
                        'Sprawdzenie łączności z mariną to najbezpieczniejsze pierwsze nadanie. Powiedz je, a marina odpowie głosem. Wszystko, co powiedziałeś, trafi do dziennika.',
                      ))}
                    </p>
                    <VoicePtt
                      key={`${model}-${lessonIndex}`}
                      kind="radio-check"
                      lines={CHECK_LINES(VARIANT)}
                      vesselIdx={DEFAULT_VARIANT.vesselIdx}
                      positionIdx={DEFAULT_VARIANT.posIdx}
                      pob={DEFAULT_VARIANT.pob}
                      ru={showRu}
                      minimumScore={50}
                      onComplete={onVoiceDone}
                    />
                  </div>
                )}
              </div>

              </DockPanel>
              <DockPanel id="listen" label={tp("Эфир","Listen","Eter")}>
              {/* The squelch lesson only means something if there is a call to miss.
                  This puts a weak, distant station on the air for 8 seconds: set the
                  squelch correctly and you hear it, set it too high and you do not -
                  which is exactly what the exam is testing. */}
              {currentLesson.id === 'squelch' && (
                <div className="rounded-xl p-3" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
                  <button
                    type="button"
                    data-testid="test-call"
                    onClick={() => {
                      audio.unlock();
                      const at = Date.now() + 400;
                      scriptOver(CHANNELS[stateRef.current.channelIndex].num, {
                        startMs: at, durMs: 8000, signal: SIG_WEAK, voice: 'male',
                      });
                      setTestCallAt(at);
                    }}
                    className="min-h-[44px] rounded-lg px-3 text-sm font-semibold"
                    style={{ background: 'var(--accent-cyan)', color: 'var(--accent-ink, #04222e)' }}
                  >
                    📡 {radioText(tp('Слабый вызов издалека', 'Weak distant call', 'Słabe wywołanie z daleka'))}
                  </button>
                  <p className="mt-2 text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                    {radioText(tp(
                      'Далёкая лодка на 1 Вт. Если SQL выставлен верно - услышишь её сквозь шум. Если задрал SQL ради тишины - не услышишь ничего, и на воде это будет чей-то вызов о помощи.',
                      'A distant boat on 1 W. With the squelch set correctly you hear it through the hiss. Turn the squelch up for silence and you hear nothing at all - and at sea that would be somebody calling for help.',
                      'Odległa łódź na 1 W. Przy dobrze ustawionym SQL usłyszysz ją przez szum. Podkręć SQL dla ciszy i nie usłyszysz nic - a na wodzie byłoby to czyjeś wołanie o pomoc.',
                    ))}
                  </p>
                  {testCallAt !== null && (
                    <p className="mt-1 text-xs font-semibold" style={{ color: 'var(--hl-amber, #ffce4d)' }}>
                      {radioText(tp('Станция в эфире 8 секунд. Слушай.', 'The station is on the air for 8 seconds. Listen.', 'Stacja jest w eterze przez 8 sekund. Słuchaj.'))}
                    </p>
                  )}
                </div>
              )}

              {/* Listen before you speak. Hearing what a station actually sounds like -
                  clipped, band-limited, coming out of the hiss - is half the exam, and
                  a text-only trainer never touches it. */}
              <PanelSection
                defaultOpen={false}
                title={radioText((
                  <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                    {tp('Послушай станцию', 'Listen to a station', 'Posłuchaj stacji')}
                  </span>
                ))}
              >
                <div className="flex flex-wrap gap-2">
                  {LISTEN_LINES.map((l) => (
                    <button
                      key={l.station}
                      type="button"
                      data-testid={`listen-${l.station.split(' ')[0].toLowerCase()}`}
                      disabled={speaking}
                      onClick={() => void stationSpeaks(l.station, l.say)}
                      className="min-h-[44px] rounded-lg px-3 text-xs font-semibold disabled:opacity-40"
                      style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }}
                    >
                      📻 {radioText(l.station)}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                  {radioText(tp(
                    'Голос приходит как обычный сигнал: через твой шумоподавитель и твою громкость. Станция рядом - сильная, она пробьёт даже тугой SQL. А вот далёкая лодка на 1 Вт при том же SQL уже не пробьётся: именно в этом и опасность.',
                    'The voice arrives like any other signal: through your squelch and your volume. A station nearby is strong - it breaks even a tight squelch. A distant boat on 1 W, at that same squelch, does not. That is where the danger is.',
                    'Głos przychodzi jak każdy inny sygnał: przez twoją blokadę szumów i twoją głośność. Stacja obok jest mocna - przebije nawet ciasny SQL. Odległa łódź na 1 W przy tym samym SQL już nie: i właśnie w tym tkwi niebezpieczeństwo.',
                  ))}
                </p>
              </PanelSection>

              </DockPanel>
              <DockPanel id="log" label={tp("Журнал","Log","Dziennik")}>
              {/* The Dziennik - the same one the simulator has. It records what the
                  radio did AND what you said, word for word, plus what was missing. */}
              <PanelSection
                title={radioText((
                  <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    📋 {tp('Дневник', 'Journal', 'Dziennik')} {journal.length > 0 && <span className="font-normal" style={{ color: 'var(--text-muted)' }}>({journal.length})</span>}
                  </span>
                ))}
              >
                {journal.length === 0 ? (
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {radioText(tp('пусто - начни с включения рации', 'empty - start by switching the radio on', 'pusto - zacznij od włączenia radia'))}
                  </p>
                ) : (
                  <ol data-testid="course-journal" className={`space-y-1 ${stacked ? '' : 'max-h-56 overflow-y-auto'}`}>
                    {journal.map((r, i) => {
                      const color = r.kind === 'bad' ? 'var(--danger)'
                        : r.kind === 'step' ? 'var(--success)'
                        : r.kind === 'tx' ? 'var(--warning)'
                        : r.kind === 'rx' ? 'var(--accent-cyan)'
                        : 'var(--text-secondary)';
                      return (
                        <li key={i} className="flex gap-2 text-xs leading-relaxed" style={{ color }}>
                          <span className="shrink-0 font-mono" style={{ color: 'var(--text-muted)' }}>
                            {radioText(new Date(r.t).toLocaleTimeString(lang, { hour: '2-digit', minute: '2-digit', second: '2-digit' }))}
                          </span>
                          <span>{radioText(r.text)}</span>
                        </li>
                      );
                    })}
                  </ol>
                )}
              </PanelSection>

              </DockPanel>
              <DockPanel id="device" label={tp("Рация","Radio","Radio")}>
              {/* rarely used: which set, and starting the course over */}
              <PanelSection
                defaultOpen={false}
                title={radioText((
                  <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                    {tp('Рация и прогресс', 'Radio and progress', 'Radio i postęp')} · {savedProgress[model]}/{lessons.length}
                  </span>
                ))}
              >
                <RadioVariantToggle model={model} onModel={chooseModel} />
                <button type="button" onClick={resetCourse} className="mt-2 block min-h-[44px] px-1 text-xs underline" style={{ color: 'var(--text-muted)' }}>
                  {radioText(tp('Начать курс заново', 'Start the course over', 'Zacznij kurs od nowa'))}
                </button>
              </PanelSection>
              </DockPanel>
            </>
          )}
        />
      )}
    </section>
  );
}

/**
 * One labelled block of a lesson (what / why / when / exam). The label is what
 * makes it an answer: "press HI/LO" is an instruction, "WHY: 25 W in a marina
 * blocks the channel for everyone to the radio horizon" is a lesson.
 */
function LessonBlock({ label, pl, ru, exam }: { label: string; pl: string | null; ru: string | null; exam?: boolean }) {
  const { rt: radioText } = useRadioI18n();
  if (!pl && !ru) return null;
  return (
    <div
      className="rounded-xl p-3"
      style={exam
        ? { background: 'rgba(255,206,77,0.08)', border: '1px solid rgba(255,206,77,0.3)' }
        : { background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}
    >
      <div
        className="mb-1 text-[11px] font-bold uppercase tracking-wide"
        style={{ color: exam ? 'var(--hl-amber, #ffce4d)' : 'var(--accent-cyan)' }}
      >
        {radioText(label)}
      </div>
      {pl && <p className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>{radioText(pl)}</p>}
      {ru && <p className="mt-1 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{radioText(ru)}</p>}
    </div>
  );
}

function otherDscSendIndex(state: RadioState): number {
  return otherDscRows(state).length;
}
