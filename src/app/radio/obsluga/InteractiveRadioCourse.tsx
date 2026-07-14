'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { useSternikPrefs } from '../../sternik/prefs';
import RadioFront from '../symulator/RadioFront';
import { InspectPanel } from '../symulator/InspectPanel';
import VoicePtt, { type VoiceResult } from '../symulator/VoicePtt';
import { useRadioAudio } from '../symulator/audio/useRadioAudio';
import { fetchStationVoice } from '../symulator/audio/stationVoice';
import { SIG_STRONG, SIG_WEAK, scriptOver } from '../symulator/radioTraffic';
import { stationReply } from '../symulator/stationReply';
import type { VariantData } from '../symulator/scenarios';
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
    say: 'ALL STATIONS, ALL STATIONS, THIS IS POLISH RESCUE RADIO. SECURITE. NAVIGATIONAL WARNING FOLLOWS ON CHANNEL SIX SEVEN. OUT.',
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
  const { tp, lang } = useI18n();
  const { explLang } = useSternikPrefs();
  // Same language policy as the rest of the section: PL for everyone, RU only as
  // an opt-in aid on the RU site version.
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

  const lessons = useMemo<Lesson[]>(() => [
    {
      id: 'power',
      title: tp('1. Питание', '1. Power', '1. Zasilanie'),
      instruction: tp('Удерживай центр ручки DIAL ровно 1 секунду.', 'Hold the center of DIAL for one second.', 'Przytrzymaj srodek DIAL przez 1 sekunde.'),
      why: tp('Короткое нажатие не включает рацию: оно открывает настройку громкости. На экзамене важно именно удержание.', 'A short press does not power the set: it opens volume adjustment. The one second hold matters in the exam.', 'Krotkie nacisniecie nie wlacza radia: otwiera regulacje glosnosci. Na egzaminie liczy sie przytrzymanie.'),
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
      title: tp('2. Открой шумоподавитель', '2. Open the squelch', '2. Otworz blokade szumow'),
      instruction: tp('Нажимай DIAL, пока не появится SQL, и крути влево до значения OPEN. Услышишь шум эфира - так и должно быть.', 'Push DIAL until SQL appears and turn it down to OPEN. You will hear the hiss of the open channel - that is the point.', 'Naciskaj DIAL, az pojawi sie SQL, i krec w lewo do pozycji OPEN. Uslyszysz szum eteru - o to wlasnie chodzi.'),
      why: tp('Пустой канал не бывает тихим: приёмник усиливает шум. Этот шум - твой эталон, по нему ты сейчас выставишь громкость.', 'An idle channel is not silent: the receiver amplifies noise. That hiss is your reference signal - you are about to set the volume against it.', 'Pusty kanal nie jest cichy: odbiornik wzmacnia szum. Ten szum to twoj wzorzec - zaraz ustawisz wedlug niego glosnosc.'),
      highlight: (s) => (s.screen === 'squelch' ? 'dial-ccw' : 'dial-center'),
      check: (_event, prev, next) => next.screen === 'squelch' && next.squelch === 0 && prev.squelch !== 0,
    },
    {
      id: 'volume',
      title: tp('3. Громкость - по шуму', '3. Volume - against the hiss', '3. Glosnosc - wedlug szumu'),
      instruction: tp('Нажми DIAL, чтобы выйти на VOL, и выставь громкость так, чтобы шум был слышен у руля.', 'Push DIAL to reach VOL and set the volume so the hiss is audible at the helm.', 'Nacisnij DIAL, aby wejsc na VOL, i ustaw glosnosc tak, by szum bylo slychac przy sterze.'),
      why: tp('У рации 20 уровней и OFF. Громкость влияет только на динамик и никак не на дальность передачи. Именно поэтому громкость ставят по шуму: тишину настроить нельзя.', 'The set has 20 levels plus OFF. Volume affects the speaker, never the transmit range. And it is set against the hiss because you cannot set a level against silence.', 'Radio ma 20 poziomow i OFF. Glosnosc wplywa na glosnik, nigdy na zasieg nadawania. Ustawia sie ja wedlug szumu, bo ciszy nie da sie wyregulowac.'),
      highlight: () => 'dial-cw',
      check: (event, prev, next) => event.type === 'dial-rotate' && next.screen === 'volume' && next.volume !== prev.volume,
    },
    {
      id: 'squelch',
      title: tp('4. Порог SQL', '4. The squelch threshold', '4. Prog blokady szumow'),
      instruction: tp('Вернись на SQL и поднимай порог, пока шум не пропадёт. Остановись на этом делении.', 'Go back to SQL and raise it until the hiss just disappears. Stop at that click.', 'Wroc na SQL i podnos prog, az szum wlasnie zniknie. Zatrzymaj sie na tym miejscu.'),
      why: tp('Слишком высокий SQL скрывает слабые вызовы: далёкая лодка на 1 Вт просто не пробьётся. Порог - это первое деление, на котором ровный шум исчез, не выше.', 'Too much squelch hides weak calls: a distant boat on 1 W simply will not break through. The threshold is the first click where the steady hiss dies - no further.', 'Zbyt wysoki SQL ukrywa slabe wywolania: odlegla lodz na 1 W po prostu sie nie przebije. Prog to pierwsze miejsce, w ktorym staly szum zniknal - ani kroku dalej.'),
      highlight: (s) => (s.screen === 'squelch' ? 'dial-cw' : 'dial-center'),
      check: (event, prev, next) => event.type === 'dial-rotate' && next.screen === 'squelch' && next.squelch > prev.squelch && next.squelch >= 3,
    },
    {
      id: 'channel',
      title: tp('5. Рабочий канал', '5. Working channel', '5. Kanal roboczy'),
      instruction: tp('Клавишами вверх/вниз выбери канал 12.', 'Use the up/down keys to select channel 12.', 'Klawiszami gora/dol wybierz kanal 12.'),
      why: tp('На M330 каналы выбирают стрелками, не вращением DIAL в режиме ожидания. Канал 12 используется портом и мариной Гдыня.', 'On M330, standby channels use the arrow keys, not DIAL rotation. Channel 12 is used by Gdynia port and marina.', 'Na M330 kanaly w trybie czuwania wybiera sie strzalkami, nie DIAL. Kanal 12 jest uzywany przez port i marine Gdynia.'),
      highlight: (s) => ['volume', 'squelch', 'channel-select', 'backlight'].includes(s.screen) ? 'key-clr' : 'key-down',
      check: (_event, prev, next) => channelNumber(prev) !== '12' && channelNumber(next) === '12',
    },
    {
      id: 'channel16',
      title: tp('6. Аварийный канал 16', '6. Distress channel 16', '6. Kanal alarmowy 16'),
      instruction: tp('Коротко нажми 16/C.', 'Press 16/C briefly.', 'Nacisnij krotko 16/C.'),
      why: tp('Короткое нажатие из любого обычного экрана немедленно возвращает на канал бедствия и вызова 16.', 'A short press from any normal screen immediately selects distress and calling channel 16.', 'Krotkie nacisniecie z normalnego ekranu natychmiast wybiera kanal alarmowy i wywolawczy 16.'),
      highlight: () => 'key-16c',
      check: (event, _prev, next) => event.type === 'key-16c' && channelNumber(next) === '16',
    },
    {
      id: 'call-channel',
      title: tp('7. Call Channel', '7. Call Channel', '7. Kanal wywolawczy'),
      instruction: tp('Теперь удерживай 16/C 1 секунду.', 'Now hold 16/C for one second.', 'Teraz przytrzymaj 16/C przez 1 sekunde.'),
      why: tp('Длинное нажатие выбирает запрограммированный Call Channel. В тренажере это канал 06.', 'The long press selects the programmed Call Channel. In this trainer it is channel 06.', 'Dlugie nacisniecie wybiera zaprogramowany kanal wywolawczy. W trenerze jest to kanal 06.'),
      highlight: () => 'key-16c',
      check: (event, _prev, next) => event.type === 'key-16c-hold' && channelNumber(next) === '06',
    },
    {
      id: 'power-level',
      title: tp('8. Мощность 25W / 1W', '8. Power 25W / 1W', '8. Moc 25W / 1W'),
      instruction: tp('Перейди на первую страницу софтклавиш и нажми HI/LO.', 'Return to the first softkey page and press HI/LO.', 'Wroc do pierwszej strony klawiszy i nacisnij HI/LO.'),
      why: tp('В порту выбирай 1W, на большой дистанции 25W. Каналы 15, 17, 75 и 76 принудительно ограничены малой мощностью.', 'Use 1W in port and 25W for longer range. Channels 15, 17, 75 and 76 are limited to low power.', 'W porcie uzywaj 1W, na duzym dystansie 25W. Kanaly 15, 17, 75 i 76 sa ograniczone do malej mocy.'),
      highlight: (s) => s.softPage === 0 ? 'soft-2' : 'key-left',
      check: (event, prev, next) => event.type === 'soft' && prev.hiPower && !next.hiPower,
    },
    {
      id: 'dual-watch',
      title: tp('9. Dual Watch', '9. Dual Watch', '9. Nasluch podwojny'),
      instruction: tp('Стрелкой вправо открой страницу DW и нажми клавишу под DW.', 'Use the right arrow to reveal DW, then press the key below DW.', 'Strzalka w prawo pokaz DW, potem nacisnij klawisz pod DW.'),
      why: tp('Dual Watch попеременно слушает выбранный рабочий канал и 16, чтобы не пропустить бедствие.', 'Dual Watch alternates between the working channel and channel 16, so distress traffic is not missed.', 'Nasluch podwojny sprawdza kanal roboczy i 16, aby nie przegapic ruchu alarmowego.'),
      highlight: (s) => s.model === 'M323' || s.softPage === 1 ? 'soft-1' : 'key-right',
      check: (event, _prev, next) => event.type === 'soft' && next.dualWatch,
    },
    {
      id: 'backlight',
      title: tp('10. Подсветка', '10. Backlight', '10. Podswietlenie'),
      instruction: tp('На странице DW нажми BKLT, затем поверни DIAL.', 'On the DW page press BKLT, then rotate DIAL.', 'Na stronie DW nacisnij BKLT, potem obroc DIAL.'),
      why: tp('Подсветка экрана и клавиш регулируется от OFF до 7. Ночью используй минимальный читаемый уровень.', 'Display and key backlight runs from OFF to 7. At night use the lowest readable level.', 'Podswietlenie ekranu i klawiszy ma zakres OFF do 7. W nocy uzyj najnizszego czytelnego poziomu.'),
      highlight: (s) => s.screen === 'backlight' ? 'dial-cw' : s.softPage === 1 ? 'soft-3' : 'key-right',
      check: (event, prev, next) => event.type === 'dial-rotate' && next.screen === 'backlight' && next.backlight !== prev.backlight,
    },
    {
      id: 'menu',
      title: tp('11. Главное меню', '11. Main menu', '11. Menu glowne'),
      instruction: tp('Вернись кнопкой CLEAR/CLR и открой MENU.', 'Return with CLEAR/CLR and open MENU.', 'Wroc przyciskiem CLEAR/CLR i otworz MENU.'),
      why: tp('M330 и M323 имеют разное дерево меню. Тренажер переключает не только надпись на панели, но и набор пунктов.', 'M330 and M323 have different menu trees. The trainer changes both the faceplate and the available items.', 'M330 i M323 maja rozne drzewa menu. Trener zmienia panel i dostepne pozycje.'),
      highlight: (s) => s.screen === 'standby' ? 'key-menu' : 'key-clr',
      check: (_event, prev, next) => prev.screen !== 'menu' && next.screen === 'menu',
    },
    {
      id: 'other-dsc',
      title: tp('12. Меню вызовов DSC', '12. DSC calls menu', '12. Menu wywolan DSC'),
      instruction: tp('M330: выбери Other DSC. M323: ENT на DSC Calls, затем выбери All Ships Call.', 'M330: select Other DSC. M323: press ENT on DSC Calls, then select All Ships Call.', 'M330: wybierz Other DSC. M323: ENT na DSC Calls, potem wybierz All Ships Call.'),
      why: tp('Здесь создаются Individual, Group, All Ships и Test вызовы. Красная DISTRESS для них не используется.', 'This is where Individual, Group, All Ships and Test calls are composed. The red DISTRESS key is not used.', 'Tutaj tworzysz wywolania Individual, Group, All Ships i Test. Czerwony DISTRESS nie jest do tego uzywany.'),
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
      instruction: tp('Выбери Category: Safety, оставь рабочий канал 16 и отправь Send.', 'Select Category: Safety, keep working channel 16, and send.', 'Wybierz Category: Safety, zostaw kanal roboczy 16 i wyslij Send.'),
      why: tp('Цифровое объявление уходит на 70 канале, после чего голосовое SECURITE передают на 16 или указанном рабочем канале.', 'The digital announcement goes on channel 70, followed by the spoken SECURITE on 16 or a stated working channel.', 'Zapowiedz cyfrowa idzie na kanale 70, potem glosowe SECURITE na 16 lub wskazanym kanale roboczym.'),
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
      instruction: tp('Удержи PTT на ручном микрофоне, затем отпусти.', 'Hold PTT on the fist microphone, then release it.', 'Przytrzymaj PTT na mikrofonie recznym, potem pusc.'),
      why: tp('Пока PTT нажата, рация передает и не принимает. Говори короткими фразами и отпускай кнопку для ответа.', 'While PTT is held, the set transmits and cannot receive. Use short phrases and release to listen.', 'Gdy PTT jest wcisniety, radio nadaje i nie odbiera. Mow krotko i puszczaj, aby sluchac.'),
      highlight: () => 'ptt',
      check: (event, _prev, next) => event.type === 'ptt-down' && next.ptt,
    },
    {
      id: 'distress',
      title: tp('15. DISTRESS под крышкой', '15. DISTRESS under the cover', '15. DISTRESS pod oslona'),
      instruction: tp('Вернись STBY, открой защитную крышку и удерживай красную DISTRESS 3 секунды.', 'Return to STBY, open the cover, and hold red DISTRESS for three seconds.', 'Wroc do STBY, otworz oslone i trzymaj czerwony DISTRESS przez 3 sekundy.'),
      why: tp('Три коротких сигнала переходят в непрерывный. Только после полного удержания DSC-алерт уходит на канале 70.', 'Three short beeps become a continuous tone. Only after the full hold is the DSC alert sent on channel 70.', 'Trzy krotkie sygnaly przechodza w ciagly. Dopiero po pelnym przytrzymaniu alert DSC idzie na kanale 70.'),
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
      const s = stateRef.current;
      scriptOver(CHANNELS[s.channelIndex].num, {
        startMs: Date.now(), durMs: 14_000, signal: SIG_STRONG, voice: 'male',
      });
      if (raw) await a.speak(raw);
    } finally {
      setSpeaking(false);
    }
  }, [pushJournal]);

  const onVoiceDone = useCallback((r: VoiceResult | null) => {
    if (!r) return;
    // the whole point of the journal: you see YOUR OWN words, and what was missing
    pushJournal(`🎙 ${tp('Ты сказал', 'You said', 'Powiedziales')}: "${r.transcript.trim()}"`, 'tx');
    for (const c of r.checks.filter((x) => !x.ok)) {
      pushJournal(`✗ ${tp('Не прозвучало', 'Missing', 'Nie padlo')}: ${c.label}`, 'bad');
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
    } catch { /* ignore */ }
  }, []);

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
    const next = radioReducer(prev, event);
    stateRef.current = next;
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
    setLessonIndex(0);
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

  return (
    <section id="interaktywny-kurs" className="mb-10 scroll-mt-24" data-testid="interactive-radio-course">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <div>
          <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
            {tp('Интерактивный курс на настоящих органах управления', 'Interactive course on real controls', 'Interaktywny kurs na prawdziwych elementach sterowania')}
          </h2>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
            {tp('Выполняй действие на рации. Следующий урок откроется только после правильного нажатия или поворота.', 'Perform the action on the radio. The next lesson unlocks only after the correct press or rotation.', 'Wykonaj czynnosci na radiu. Nastepna lekcja odblokuje sie dopiero po prawidlowym nacisnieciu lub obrocie.')}
          </p>
        </div>
        <div className="ml-auto inline-flex overflow-hidden rounded-lg" role="group" aria-label="Radio model" style={{ border: '1px solid var(--border-subtle)' }}>
          {(['M330', 'M323'] as RadioModel[]).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => chooseModel(item)}
              className="min-h-[44px] px-4 text-sm font-semibold"
              style={model === item ? { background: 'var(--accent-cyan)', color: 'var(--accent-ink, #04222e)' } : { background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}
            >
              IC-{item}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-3 flex items-center gap-3 text-xs" style={{ color: 'var(--text-muted)' }}>
        <div className="h-2 flex-1 overflow-hidden rounded-full" style={{ background: 'var(--bg-secondary)' }}>
          <div className="h-full transition-[width]" style={{ width: `${(savedProgress[model] / lessons.length) * 100}%`, background: 'var(--accent-cyan)' }} />
        </div>
        <span>{savedProgress[model]}/{lessons.length}</span>
        <button type="button" onClick={resetCourse} className="min-h-[44px] px-2 underline" style={{ color: 'var(--text-muted)' }}>
          {tp('Сбросить', 'Reset', 'Resetuj')}
        </button>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,520px)_1fr]">
        <div className="min-w-0">
          {/* Inspect ("Rozbior"): the course is where the learner meets the
              buttons, so this is where "what does this button even do" has to be
              answerable. While it is on, taps explain instead of acting. */}
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <button
              type="button"
              data-testid="course-inspect-toggle"
              onClick={() => { setInspect((v) => !v); setInspectKey(null); }}
              aria-pressed={inspect}
              className="min-h-[40px] rounded-xl px-3 text-sm font-semibold transition"
              style={inspect
                ? { background: '#ffce4d', color: '#3a2a00' }
                : { background: 'var(--bg-card)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}
            >
              🔍 {tp('Разбор', 'Inspect', 'Rozbior')}
            </button>

            {/* Sound. Off by default it would be silent - and a silent radio
                cannot teach squelch at all - so it is ON, and the AudioContext
                unlocks on the first touch of the panel (browsers refuse one made
                any other way). */}
            <button
              type="button"
              data-testid="sound-toggle"
              onClick={audio.toggleMute}
              aria-pressed={!audio.muted}
              className="min-h-[40px] rounded-xl px-3 text-sm font-semibold transition"
              style={{ background: 'var(--bg-card)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}
            >
              {audio.muted ? '🔇' : '🔊'} {tp('Звук', 'Sound', 'Dzwiek')}
            </button>

            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {inspect
                ? tp('Жми любую кнопку - она объяснит себя. Рация не работает.', 'Press any control - it explains itself. The radio does not react.', 'Nacisnij dowolny element - wyjasni sie sam. Radio nie dziala.')
                : tp('Не знаешь, что делает кнопка? Включи Разбор.', 'Not sure what a control does? Turn Inspect on.', 'Nie wiesz, co robi przycisk? Wlacz Rozbior.')}
            </span>
          </div>

          <div onPointerDownCapture={audio.unlock}>
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
          />
          </div>

          {/* The squelch lesson only means something if there is a call to miss.
              This puts a weak, distant station on the air for 8 seconds: set the
              squelch correctly and you hear it, set it too high and you do not -
              which is exactly what the exam is testing. */}
          {currentLesson.id === 'squelch' && (
            <div className="mt-2 rounded-xl p-3" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
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
                className="min-h-[40px] rounded-lg px-3 text-sm font-semibold"
                style={{ background: 'var(--accent-cyan)', color: 'var(--accent-ink, #04222e)' }}
              >
                📡 {tp('Слабый вызов издалека', 'Weak distant call', 'Slabe wywolanie z daleka')}
              </button>
              <p className="mt-2 text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                {tp(
                  'Далёкая лодка на 1 Вт. Если SQL выставлен верно - услышишь её сквозь шум. Если задрал SQL ради тишины - не услышишь ничего, и на воде это будет чей-то вызов о помощи.',
                  'A distant boat on 1 W. With the squelch set correctly you hear it through the hiss. Turn the squelch up for silence and you hear nothing at all - and at sea that would be somebody calling for help.',
                  'Odlegla lodz na 1 W. Przy dobrze ustawionym SQL uslyszysz ja przez szum. Podkrec SQL dla ciszy i nie uslyszysz nic - a na wodzie bylby to czyjs wolanie o pomoc.',
                )}
              </p>
              {testCallAt !== null && (
                <p className="mt-1 text-xs font-semibold" style={{ color: 'var(--hl-amber, #ffce4d)' }}>
                  {tp('Станция в эфире 8 секунд. Слушай.', 'The station is on the air for 8 seconds. Listen.', 'Stacja jest w eterze przez 8 sekund. Sluchaj.')}
                </p>
              )}
            </div>
          )}

          {/* Listen before you speak. Hearing what a station actually sounds like -
              clipped, band-limited, coming out of the hiss - is half the exam, and
              a text-only trainer never touches it. */}
          <div className="mt-3 rounded-xl p-3" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
              {tp('Послушай станцию', 'Listen to a station', 'Posluchaj stacji')}
            </div>
            <div className="flex flex-wrap gap-2">
              {LISTEN_LINES.map((l) => (
                <button
                  key={l.station}
                  type="button"
                  data-testid={`listen-${l.station.split(' ')[0].toLowerCase()}`}
                  disabled={speaking}
                  onClick={() => void stationSpeaks(l.station, l.say)}
                  className="min-h-[40px] rounded-lg px-3 text-xs font-semibold disabled:opacity-40"
                  style={{ background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }}
                >
                  📻 {l.station}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              {tp(
                'Голос приходит как обычный сигнал: через твой шумоподавитель и твою громкость. Задерёшь SQL - не услышишь и станцию.',
                'The voice arrives like any other signal: through your squelch and your volume. Turn the squelch up too far and you will not hear the station either.',
                'Glos przychodzi jak kazdy inny sygnal: przez twoja blokade szumow i twoja glosnosc. Podkrec SQL za wysoko, a nie uslyszysz nawet stacji.',
              )}
            </p>
          </div>

          {inspect && <InspectPanel inspectKey={inspectKey} showPl={showPl} showRu={showRu} />}

          {/* The Dziennik - the same one the simulator has. It records what the
              radio did AND what you said, word for word, plus what was missing. */}
          <div className="mt-3 rounded-2xl p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
            <div className="mb-2 text-sm font-semibold" style={{ color: 'var(--accent-cyan)' }}>
              📋 {tp('Дневник', 'Journal', 'Dziennik')}
            </div>
            {journal.length === 0 ? (
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {tp('пусто - начни с включения рации', 'empty - start by switching the radio on', 'pusto - zacznij od wlaczenia radia')}
              </p>
            ) : (
              <ol data-testid="course-journal" className="max-h-56 space-y-1 overflow-y-auto">
                {journal.map((r, i) => {
                  const color = r.kind === 'bad' ? 'var(--danger)'
                    : r.kind === 'step' ? 'var(--success)'
                    : r.kind === 'tx' ? 'var(--warning)'
                    : r.kind === 'rx' ? 'var(--accent-cyan)'
                    : 'var(--text-secondary)';
                  return (
                    <li key={i} className="flex gap-2 text-xs leading-relaxed" style={{ color }}>
                      <span className="shrink-0 font-mono" style={{ color: 'var(--text-muted)' }}>
                        {new Date(r.t).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                      <span>{r.text}</span>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        </div>

        <div className="min-w-0 rounded-lg p-4 sm:p-5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
          <div className="mb-3 flex items-center justify-between gap-3">
            <span className="text-xs font-semibold uppercase" style={{ color: 'var(--accent-cyan)' }}>
              {tp('Урок', 'Lesson', 'Lekcja')} {lessonIndex + 1}/{lessons.length}
            </span>
            <span aria-live="polite" className="text-sm font-semibold" style={{ color: lessonDone ? 'var(--success)' : 'var(--text-muted)' }}>
              {lessonDone ? tp('Выполнено', 'Complete', 'Wykonano') : tp('Жду действие', 'Waiting for action', 'Czekam na dzialanie')}
            </span>
          </div>
          <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{currentLesson.title}</h3>
          <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{currentLesson.instruction}</p>
          <div className="mt-4 border-l-2 pl-3 text-sm leading-relaxed" style={{ borderColor: 'var(--accent-cyan)', color: 'var(--text-muted)' }}>
            {currentLesson.why}
          </div>

          {/* The lesson used to stop here - "press HI/LO", and one line of why.
              A learner who does not know what transmit power IS cannot pass an
              oral exam on it, so every lesson now answers what / why / when, and
              names what the examiner watches for. */}
          {text && (
            <div className="mt-4 space-y-3">
              <LessonBlock label={tp('Что это', 'What it is', 'Co to jest')} pl={showPl ? text.whatPl : null} ru={showRu ? text.whatRu : null} />
              <LessonBlock label={tp('Зачем это нужно', 'Why it exists', 'Po co to jest')} pl={showPl ? text.whyPl : null} ru={showRu ? text.whyRu : null} />
              <LessonBlock label={tp('Когда используешь', 'When you use it', 'Kiedy uzywasz')} pl={showPl ? text.whenPl : null} ru={showRu ? text.whenRu : null} />
              <LessonBlock label={tp('На экзамене', 'At the exam', 'Na egzaminie')} pl={showPl ? text.examPl : null} ru={showRu ? text.examRu : null} exam />
            </div>
          )}
          {/* Say it out loud. The PTT lesson is where the learner first keys the
              mic, so it is where they first find out that a transmission is
              graded on the WORDS, not on the button - and the Dziennik shows them
              exactly which words they left out. */}
          {currentLesson.id === 'ptt' && (
            <div className="mt-4 rounded-xl p-3" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
              <div className="mb-1 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--hl-amber, #ffce4d)' }}>
                🎙 {tp('Скажи в эфир', 'Say it on air', 'Powiedz do eteru')}
              </div>
              <p className="mb-2 text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                {tp(
                  'Проверка связи с мариной - самая безопасная первая передача. Наговори её, и марина ответит голосом. Всё, что ты сказал, попадёт в дневник.',
                  'A radio check with the marina is the safest first transmission. Speak it and the marina answers out loud. Everything you said goes into the journal.',
                  'Sprawdzenie lacznosci z marina to najbezpieczniejsze pierwsze nadanie. Powiedz je, a marina odpowie glosem. Wszystko, co powiedziales, trafi do dziennika.',
                )}
              </p>
              <VoicePtt
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

          {complete ? (
            <div className="mt-5 rounded-md px-4 py-3 text-sm font-semibold" style={{ background: 'rgba(68,255,136,0.08)', color: 'var(--success)', border: '1px solid rgba(68,255,136,0.25)' }}>
              {tp('Курс управления пройден. Теперь переходи к экзаменационным сценариям.', 'Control course complete. Continue with the exam scenarios.', 'Kurs obslugi ukonczony. Przejdz teraz do scenariuszy egzaminacyjnych.')}
            </div>
          ) : (
            <button
              type="button"
              onClick={nextLesson}
              disabled={!lessonDone}
              className="mt-5 min-h-[44px] rounded-lg px-4 text-sm font-semibold disabled:opacity-35"
              style={{ background: 'var(--accent-cyan)', color: 'var(--accent-ink, #04222e)' }}
            >
              {tp('Следующий урок', 'Next lesson', 'Nastepna lekcja')} {'>'}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

/**
 * One labelled block of a lesson (what / why / when / exam). The label is what
 * makes it an answer: "press HI/LO" is an instruction, "WHY: 25 W in a marina
 * blocks the channel for everyone to the radio horizon" is a lesson.
 */
function LessonBlock({ label, pl, ru, exam }: { label: string; pl: string | null; ru: string | null; exam?: boolean }) {
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
        {label}
      </div>
      {pl && <p className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>{pl}</p>}
      {ru && <p className="mt-1 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{ru}</p>}
    </div>
  );
}

function otherDscSendIndex(state: RadioState): number {
  return otherDscRows(state).length;
}
