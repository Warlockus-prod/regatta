'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import dynamic from "next/dynamic";
import Link from 'next/link';
import { recordControlChange, recordPreferenceChange } from "@/lib/diagnostics-controls";
import { initializeDiagnosticBridge } from "@/lib/diagnostics-bridge";
import { MPClient, getWsUrl, SnapshotBuffer, type MPMessage, type MissionReason } from '@/lib/mp-client';
import { useI18n } from '@/lib/i18n';
import { useVenue } from '@/features/venues/useVenue';
import { sanitizeNickname } from '@/lib/race-submission';
import type { Race3DBoat, RaceCamera } from "@/features/race-3d/pose";
import { MultiplayerCockpit } from "./MultiplayerCockpit";
import { createServerStartSignals } from "./start-signals";
import { playerHapticEvents, playerSoundEvents } from "./haptics";
import { playMarkRound, playFinish, playNoGo, readRaceSound, subscribeRaceSound } from "@/lib/sounds";
import { useMultiplayerSoundscape } from "./useMultiplayerSoundscape";
import { raceHaptic } from "@/lib/race-haptics";
import { createMultiplayerPresentation, multiplayerTurn, withMultiplayerCourse, FLEET_COLORS, MULTIPLAYER_COURSE, type MultiplayerFrame } from "./presentation";
import { createRaceNavigationSnapshot, raceWindReading, type RaceNavigationSnapshot, type RaceWindReading } from "@/features/race-hud/navigation-model";
import { recordTrackPoint } from "@/features/race-hud/map-view";
import { useRacePrefs } from "../game/race-prefs";
import { MultiplayerMenu, MultiplayerRoom, type LobbyPlayer } from "./MultiplayerLobby";
import { canShareNatively, createLobbyBlocker, createTapAction, defaultSailorName, shareRoomInvite, type ShareOutcome } from "./lobby";

const RaceScene = dynamic(() => import("@/features/race-scene/RaceScene").then(module => module.RaceScene), { ssr: false });
// F5: the race intro, only on request from the menu ("How to race"), never by itself here.
const RaceIntro = dynamic(() => import("@/features/race-hud/RaceIntro").then(module => module.RaceIntro), { ssr: false });

type Phase = 'menu' | 'lobby' | 'countdown' | 'racing' | 'finished' | 'error';

interface Results { id: string; nickname: string; isBot: boolean; time: number | null; mission: { passed: boolean; reasons: MissionReason[] } | null }

const COLORS = FLEET_COLORS;

// Localize a mission-evaluation reason code from the (language-agnostic) server.
// All seven languages via tp(): RU / EN / PL positional, ES / FR / DE / IT in
// the 4th argument.
function missionReasonText(
  tp: (ru: string, en: string, pl: string, extras?: { es?: string; fr?: string; de?: string; it?: string }) => string,
  r: MissionReason,
): string {
  switch (r.code) {
    case 'dnf':
      return tp('Не финишировал', 'Did not finish', 'Nie ukończono', { es: 'No has terminado', fr: 'Course non terminée', de: 'Nicht im Ziel', it: 'Regata non conclusa' });
    case 'no-go':
      return tp(`Вошёл в мёртвую зону ${r.count}x`, `Entered the no-go zone ${r.count}x`, `Wejścia w kąt martwy: ${r.count}×`, {
        es: `Entradas en la zona muerta: ${r.count}×`,
        fr: `Entrées dans la zone morte : ${r.count}×`,
        de: `Im toten Winkel: ${r.count}×`,
        it: `Ingressi nell'angolo morto: ${r.count}×`,
      });
    case 'time-over': {
      // Decimal comma for every language except English.
      const t = String(r.time).replace('.', ',');
      return tp(`Время ${r.time}с > ${r.limit}с`, `Time ${r.time}s > ${r.limit}s`, `Czas ${t} s > ${r.limit} s`, {
        es: `Tiempo ${t} s > ${r.limit} s`,
        fr: `Temps ${t} s > ${r.limit} s`,
        de: `Zeit ${t} s > ${r.limit} s`,
        it: `Tempo ${t} s > ${r.limit} s`,
      });
    }
    case 'tacks-over':
      return tp(`Поворотов ${r.count}, нужно <= ${r.max}`, `Tacks ${r.count}, need <= ${r.max}`, `Zwrotów: ${r.count}, dozwolone <= ${r.max}`, {
        es: `Viradas: ${r.count}, máximo ${r.max}`,
        fr: `Virements : ${r.count}, maximum ${r.max}`,
        de: `Wenden: ${r.count}, erlaubt <= ${r.max}`,
        it: `Virate: ${r.count}, massimo ${r.max}`,
      });
    case 'passed':
      return tp('Все условия выполнены', 'All conditions met', 'Wszystkie warunki spełnione', { es: 'Cumpliste todas las condiciones', fr: 'Toutes les conditions sont remplies', de: 'Alle Bedingungen erfüllt', it: 'Tutte le condizioni soddisfatte' });
  }
}

export default function MultiplayerClient() {
  useEffect(() => { initializeDiagnosticBridge(); }, []);
  const { tp, tl, lang } = useI18n();
  const { prefs: visualPrefs, update: updateVisualPrefs } = useRacePrefs("multiplayer");
  // Scenery around the race area: each player sees the venue they picked (cosmetic, not synced).
  const { venue } = useVenue();
  const embed = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('embed') === '1';
  const [phase, setPhase] = useState<Phase>('menu');
  const [error, setError] = useState<string | null>(null);
  const [nickname, setNickname] = useState<string>('');
  const [joinCode, setJoinCode] = useState('');
  const [sid, setSid] = useState<string | null>(null);
  const [reconnecting, setReconnecting] = useState(false);
  const [shareOutcome, setShareOutcome] = useState<ShareOutcome | null>(null);
  const [connecting, setConnecting] = useState(false);

  const [room, setRoom] = useState<{
    code: string; hostId: string; myId: string; isHost: boolean;
    missionId: string | null;
    difficulty: string; windStrength: string;
    maxPlayers: number;
  } | null>(null);
  const [lobbyPlayers, setLobbyPlayers] = useState<LobbyPlayer[]>([]);
  const [countdown, setCountdown] = useState(5);
  const [startSignals] = useState(createServerStartSignals);
  const [results, setResults] = useState<Results[]>([]);

  const clientRef = useRef<MPClient | null>(null);
  // M3-4: the player's own id for the mark and finish vibrations of server state events.
  const myIdRef = useRef("");
  const bufferRef = useRef<SnapshotBuffer>(new SnapshotBuffer());
  const presentationRef = useRef(createMultiplayerPresentation());
  const boatsRef = useRef<Race3DBoat[]>([]);
  const courseRef = useRef(MULTIPLAYER_COURSE);
  const windDirRef = useRef(0);
  // F3: the player's track for the big map, one point a second of race time
  // (the online race keeps no log); a new race starts a new track.
  const trackRef = useRef<{ x: number; y: number; t: number }[]>([]);
  const readTrack = useCallback(() => trackRef.current, []);
  const [frame, setFrame] = useState<MultiplayerFrame | null>(null);
  const [windReading, setWindReading] = useState<RaceWindReading | null>(null);
  const [navigation, setNavigation] = useState<RaceNavigationSnapshot | null>(null);
  const [camera, setCamera] = useState<RaceCamera>("orbit");
  const [cameraRevision, setCameraRevision] = useState(0);
  const [guidanceOn, setGuidanceOn] = useState(true);
  const inputRef = useRef({ left: false, right: false, rudder: 0, course: null as number | null });
  const [helm, setHelm] = useState({ rudder: 0, course: null as number | null });
  const releaseInput = useCallback(() => {
    inputRef.current = { left: false, right: false, rudder: 0, course: null };
    setHelm({ rudder: 0, course: null });
  }, []);
  const setRudder = useCallback((value: number) => {
    const rudder = Number.isFinite(value) ? Math.max(-1, Math.min(1, value)) : 0;
    const previous = inputRef.current.rudder;
    inputRef.current.rudder = rudder; inputRef.current.course = null;
    setHelm({ rudder, course: null });
    recordControlChange("multiplayer", "rudder", rudder, previous);
  }, []);
  const setCourse = useCallback((degrees: number) => {
    const previous = inputRef.current.course;
    const next = withMultiplayerCourse(inputRef.current, degrees);
    if (next === inputRef.current) return;
    inputRef.current = next;
    setHelm({ rudder: next.rudder, course: next.course });
    if (next.course !== null) recordControlChange("multiplayer", "course", next.course, previous ?? undefined);
  }, []);
  const courseDelta = useCallback((degrees: number) => {
    if (!Number.isFinite(degrees)) return;
    const heading = boatsRef.current.find(boat => boat.isPlayer)?.heading ?? 0;
    setCourse((inputRef.current.course ?? heading) + degrees);
  }, [setCourse]);
  const sceneLabels = useMemo(() => ({
    metres: tl({ ru: "м", en: "m", pl: "m", es: "m", fr: "m", de: "m", it: "m" }),
    scene: "3D",
    loading: tl({ ru: "Загрузка яхты", en: "Loading yacht", pl: "Ładowanie jachtu", es: "Cargando yate", fr: "Chargement du bateau", de: "Yacht wird geladen", it: "Caricamento della barca" }),
    error: tl({ ru: "Не удалось загрузить 3D сцену", en: "Could not load the 3D scene", pl: "Nie udało się wczytać sceny 3D", es: "No se pudo cargar la escena 3D", fr: "Impossible de charger la scène 3D", de: "3D-Szene konnte nicht geladen werden", it: "Impossibile caricare la scena 3D" }),
    retry: tl({ ru: "Повторить", en: "Retry", pl: "Ponów", es: "Reintentar", fr: "Réessayer", de: "Erneut versuchen", it: "Riprova" }),
  }), [tl]);

  useEffect(() => () => { clientRef.current?.close(); clientRef.current = null; }, []);

  // Load session info. M2-8: a first-time player (no stored nickname) gets a
  // ready name, so "Create lobby" works on the first tap; typing replaces it.
  const langRef = useRef(lang);
  useEffect(() => { langRef.current = lang; }, [lang]);
  // A Create tap made before the session arrived (see createLobby) runs here,
  // with the new session id, as soon as it is known.
  const pendingCreateRef = useRef(false);
  const createLobbyRef = useRef<((sessionId: string | null) => Promise<void>) | null>(null);
  useEffect(() => {
    const fallback = (id: string) => setNickname(current => current || defaultSailorName(langRef.current, id));
    const sessionReady = (id: string) => { setSid(id); if (pendingCreateRef.current) void createLobbyRef.current?.(id); };
    fetch('/api/player').then((r) => r.json()).then((d) => {
      const id = typeof d?.sid === "string" ? d.sid : crypto.randomUUID();
      if (d?.nickname) setNickname(d.nickname);
      else fallback(id);
      sessionReady(id);
    }).catch(() => { const id = crypto.randomUUID(); fallback(id); sessionReady(id); });
  }, []);

  // URL code prefill (e.g. /multiplayer?code=ABCD). One-time read of
  // window.location on mount - deterministic, not a cascade. React Compiler
  // flags the setJoinCode call but it's correct.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    const code = url.searchParams.get('code');
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (code) setJoinCode(code.toUpperCase().slice(0, 4));
  }, []);

  const handleServerMsg = useCallback((msg: MPMessage) => {
    // M3-3: the horn, the short signals and the gun from the server's countdown events.
    startSignals.onMessage(msg);
    switch (msg.type) {
      case 'joined':
        myIdRef.current = msg.id;
        setConnecting(false);
        setError(null);
        // msg.id is the server-assigned OPAQUE player id (never our sid). We
        // identify "me" everywhere by room.myId === boat/player.id - never by
        // assuming id === sid - so the server can keep sid fully private.
        // hostId stays empty for non-hosts until the first lobby-state arrives.
        // Previously we set hostId: msg.id here which made guests briefly see
        // the "хост" badge next to their own name until lobby-state overrode it.
        setRoom((r) => r
          ? { ...r, code: msg.code, myId: msg.id, isHost: msg.isHost, hostId: r.hostId || (msg.isHost ? msg.id : '') }
          : { code: msg.code, hostId: msg.isHost ? msg.id : '', myId: msg.id, isHost: msg.isHost, missionId: null, difficulty: 'medium', windStrength: 'medium', maxPlayers: 10 });
        setPhase((p) => p === 'menu' || p === 'error' ? 'lobby' : p);
        setReconnecting(false);
        break;
      case 'lobby-state':
        setRoom((r) => r ? {
          ...r, code: msg.code, hostId: msg.hostId, isHost: msg.hostId === r.myId,
          missionId: msg.missionId, difficulty: msg.difficulty, windStrength: msg.windStrength,
          maxPlayers: msg.maxPlayers,
        } : null);
        setLobbyPlayers(msg.players);
        break;
      case 'phase':
        if (msg.phase === 'lobby') setPhase('lobby');
        else if (msg.phase === 'countdown') {
          setPhase('countdown'); bufferRef.current.reset(); presentationRef.current.reset();
          boatsRef.current = []; trackRef.current = []; setFrame(null); setWindReading(null); setNavigation(null); releaseInput();
        }
        else if (msg.phase === 'racing') setPhase('racing');
        else if (msg.phase === 'finished') setPhase('finished');
        break;
      case 'countdown':
        setCountdown(Math.max(0, Math.ceil(msg.remain)));
        break;
      case 'state':
        bufferRef.current.push({ t: msg.t, wind: msg.wind, boats: msg.boats });
        for (const event of playerHapticEvents(msg.events, myIdRef.current)) raceHaptic(event);
        // M3-3: the solo race sounds for our own mark, finish and no-go entry.
        for (const sound of playerSoundEvents(msg.events, myIdRef.current)) {
          if (sound === "mark") playMarkRound();
          else if (sound === "finish") playFinish();
          else playNoGo();
        }
        break;
      case 'finished':
        setResults(msg.results);
        setPhase('finished');
        break;
      case 'error':
        setConnecting(false);
        setError(msg.code === "players-not-ready"
          ? tp("Дождись готовности всех игроков", "Wait until everyone is ready", "Poczekaj, aż wszyscy będą gotowi", { es: "Espera a que todos estén listos", fr: "Attends que tout le monde soit prêt", de: "Warte, bis alle bereit sind", it: "Attendi che tutti siano pronti" })
          : msg.code === "room-not-found" ? tp("Комната закрыта или код неверен", "Room closed or code incorrect", "Pokój zamknięty lub błędny kod", { es: "Sala cerrada o código incorrecto", fr: "Salon fermé ou code incorrect", de: "Raum geschlossen oder falscher Code", it: "Stanza chiusa o codice errato" })
          : msg.code === "race-in-progress" ? tp("Гонка уже началась", "The race has already started", "Wyścig już się rozpoczął", { es: "La regata ya ha empezado", fr: "La course a déjà commencé", de: "Das Rennen läuft bereits", it: "La regata è già iniziata" })
          : msg.code === "room-full" ? tp("Комната заполнена", "The room is full", "Pokój jest pełny", { es: "La sala está llena", fr: "Le salon est plein", de: "Der Raum ist voll", it: "La stanza è piena" })
          : msg.code === "server-full" || msg.code === "too-many-rooms" ? tl({ ru: "Сейчас нельзя создать комнату, попробуй чуть позже", en: "Can't create a room right now, try again a bit later", pl: "Nie można teraz utworzyć pokoju, spróbuj za chwilę", es: "Ahora no se puede crear una sala, inténtalo un poco más tarde", fr: "Impossible de créer un salon pour l'instant, réessaie un peu plus tard", de: "Gerade kann kein Raum erstellt werden, versuch es gleich noch einmal", it: "Al momento non si può creare una stanza, riprova tra poco" })
          : msg.message);
        if (msg.code === "room-not-found" || msg.code === "race-in-progress" || msg.code === "room-full") {
          setReconnecting(false);
          setPhase("error");
          clientRef.current?.close();
          clientRef.current = null;
          setRoom(null);
        }
        setPhase((p) => p === 'menu' ? 'error' : p);
        break;
    }
  }, [tp, tl, releaseInput, startSignals]);

  const ensureClient = useCallback(async (): Promise<MPClient> => {
    if (clientRef.current?.isOpen) return clientRef.current;
    const c = clientRef.current ?? new MPClient();
    if (!clientRef.current) {
      c.on(handleServerMsg);
      c.onClose((wasReconnect) => {
        releaseInput();
        if (wasReconnect) setReconnecting(true);
      });
      clientRef.current = c;
    }
    await c.connect(getWsUrl());
    return c;
  }, [handleServerMsg, releaseInput]);

  // The leaderboard's own rule (/api/race-result refuses anything else): the
  // server stores this cleaned value, so it is what we send and show.
  const cleanNickname = sanitizeNickname(nickname);
  const nicknameInvalid = nickname.trim().length > 0 && cleanNickname === null;
  const nicknameHint = tl({
    ru: 'Ник: минимум 2 буквы или цифры, без эмодзи',
    en: 'Nickname: at least 2 letters or digits, no emoji',
    pl: 'Nick: co najmniej 2 litery lub cyfry, bez emoji',
    es: 'Apodo: al menos 2 letras o cifras, sin emojis',
    fr: 'Pseudo : au moins 2 lettres ou chiffres, sans emoji',
    de: 'Nickname: mindestens 2 Buchstaben oder Ziffern, keine Emojis',
    it: 'Nickname: almeno 2 lettere o cifre, niente emoji',
  });

  // M2-8: Create is never disabled; while something is missing the lobby names
  // it under the button. A tap before the session has loaded is remembered and
  // creates the lobby once the session arrives (the disabled button used to
  // hold that tap back until then).
  const createBlocker = createLobbyBlocker({ nickname, sid });
  const createLobby = useCallback(async (sessionId: string | null) => {
    const tap = createTapAction({ blocker: createLobbyBlocker({ nickname, sid: sessionId }), connecting });
    pendingCreateRef.current = tap === "wait-for-session";
    if (tap !== "create" || !cleanNickname) return;
    setError(null);
    setConnecting(true);
    try {
      const c = await ensureClient();
      c.send({ type: 'create', nickname: cleanNickname, sid: sessionId });
    } catch {
      setConnecting(false);
      setError(tp('Не удалось подключиться к серверу', 'Could not connect to server', 'Nie udało się połączyć z serwerem', { es: 'No se pudo conectar con el servidor', fr: 'Impossible de se connecter au serveur', de: 'Keine Verbindung zum Server', it: 'Impossibile connettersi al server' }));
      setPhase('error');
    }
  }, [connecting, nickname, cleanNickname, ensureClient, tp]);
  useEffect(() => { createLobbyRef.current = createLobby; }, [createLobby]);

  const joinLobby = useCallback(async () => {
    if (!nickname.trim()) { setError(tp('Введи ник', 'Enter a nickname', 'Podaj nick', { es: 'Escribe un apodo', fr: 'Entre un pseudo', de: 'Gib einen Nickname ein', it: 'Inserisci un nickname' })); return; }
    if (!cleanNickname) { setError(nicknameHint); return; }
    if (joinCode.length !== 4) { setError(tp('Код должен быть 4 символа', 'Code must be 4 characters', 'Kod musi mieć 4 znaki', { es: 'El código debe tener 4 caracteres', fr: 'Le code doit faire 4 caractères', de: 'Der Code muss 4 Zeichen haben', it: 'Il codice deve avere 4 caratteri' })); return; }
    setError(null);
    setConnecting(true);
    try {
      const c = await ensureClient();
      c.send({ type: 'join', code: joinCode.toUpperCase(), nickname: cleanNickname, sid });
      if (sid) c.rememberForResume({ code: joinCode.toUpperCase(), nickname: cleanNickname, sid });
    } catch {
      setConnecting(false);
      setError(tp('Не удалось подключиться к серверу', 'Could not connect to server', 'Nie udało się połączyć z serwerem', { es: 'No se pudo conectar con el servidor', fr: 'Impossible de se connecter au serveur', de: 'Keine Verbindung zum Server', it: 'Impossibile connettersi al server' }));
      setPhase('error');
    }
  }, [nickname, cleanNickname, nicknameHint, joinCode, sid, ensureClient, tp]);

  // Once we've joined, enable auto-resume on WS drop
  useEffect(() => {
    if (!room || !sid || !clientRef.current) return;
    clientRef.current.rememberForResume({
      code: room.code, nickname: cleanNickname ?? 'Player', sid,
    });
  }, [room, sid, cleanNickname]);

  const pickMission = useCallback((missionId: string | null, overrides?: { difficulty?: string; windStrength?: string }) => {
    clientRef.current?.send({
      type: 'set-mission',
      missionId,
      difficulty: overrides?.difficulty,
      windStrength: overrides?.windStrength,
    });
  }, []);

  const addBot = useCallback(() => clientRef.current?.send({ type: 'add-bot' }), []);
  const removeBot = useCallback(() => clientRef.current?.send({ type: 'remove-bot' }), []);

  const startRace = useCallback(() => clientRef.current?.send({ type: 'start-race' }), []);

  const leaveLobby = useCallback(() => {
    clientRef.current?.send({ type: 'leave' });
    clientRef.current?.close();
    clientRef.current = null;
    bufferRef.current.reset(); startSignals.reset(); myIdRef.current = "";
    presentationRef.current.reset(); boatsRef.current = []; setFrame(null); setWindReading(null); setNavigation(null); releaseInput();
    setRoom(null);
    setLobbyPlayers([]);
    setResults([]);
    setPhase('menu');
    setError(null);
    setShareOutcome(null);
  }, [releaseInput, startSignals]);

  // M2-8: the system share sheet where there is one, the clipboard otherwise;
  // if both fail the link is shown so it can be copied by hand.
  const shareCode = useCallback(async () => {
    if (!room) return;
    const url = `${window.location.origin}/multiplayer?code=${room.code}`;
    const outcome = await shareRoomInvite(navigator, { title: "Week to Regatta", url,
      text: tl({ ru: `Гонка с друзьями: код ${room.code}`, en: `Race with friends: code ${room.code}`, pl: `Regaty ze znajomymi: kod ${room.code}`, es: `Regata con amigos: código ${room.code}`, fr: `Course entre amis : code ${room.code}`, de: `Rennen mit Freunden: Code ${room.code}`, it: `Regata con amici: codice ${room.code}` }) });
    setShareOutcome(outcome);
    if (outcome === "failed") setError(url);
  }, [room, tl]);

  // Input capture + 20Hz send
  useEffect(() => {
    if ((phase !== 'racing' && phase !== 'countdown') || reconnecting) return;
    const onDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest("input,textarea,select,[contenteditable=true],[role=slider]") || e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k === 'arrowleft' || k === 'a') inputRef.current.left = true;
      if (k === 'arrowright' || k === 'd') inputRef.current.right = true;
      if (['arrowleft', 'arrowright', 'a', 'd'].includes(k)) e.preventDefault();
    };
    const onUp = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === 'arrowleft' || k === 'a') inputRef.current.left = false;
      if (k === 'arrowright' || k === 'd') inputRef.current.right = false;
    };
    window.addEventListener("blur", releaseInput);
    const onHidden = () => { if (document.hidden) releaseInput(); };
    document.addEventListener("visibilitychange", onHidden);
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    const id = setInterval(() => {
      const heading = boatsRef.current.find(boat => boat.isPlayer)?.heading ?? 0;
      const turn = multiplayerTurn(inputRef.current, heading);
      clientRef.current?.send({ type: 'input', turn });
    }, 50);
    return () => {
      releaseInput();
      window.removeEventListener('blur', releaseInput);
      document.removeEventListener("visibilitychange", onHidden);
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
      clearInterval(id);
    };
  }, [phase, reconnecting, releaseInput]);

  // Only interpolate received positions. The view never steps a local boat.
  useEffect(() => {
    if (phase !== "racing" && phase !== "countdown" && phase !== "finished") return;
    let raf = 0;
    let lastHud = -Infinity;
    const render = () => {
      const snapshot = bufferRef.current.sample();
      if (snapshot && room) {
        const next = presentationRef.current.frame(snapshot, lobbyPlayers, room.myId, room.windStrength);
        boatsRef.current = next.boats;
        windDirRef.current = next.windDir;
        const now = performance.now();
        if (now - lastHud >= 100) {
          lastHud = now; setFrame(next);
          const player = next.boats.find(boat => boat.isPlayer);
          recordTrackPoint(trackRef.current, player?.pos, next.time);
          setWindReading(player ? raceWindReading({ heading: player.heading, boatSpeedKn: player.speed,
            windFrom: next.windDir, windKnots: next.windKnots, leeway: player.physics?.leeway }) : null);
          setNavigation(createRaceNavigationSnapshot({ course: courseRef.current, boats: next.boats, windFrom: next.windDir }));
        }
      }
      raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render);
    return () => cancelAnimationFrame(raf);
  }, [phase, room, lobbyPlayers]);

  // M3-2 tail: the solo race's wind, water, slap and flog beds for our own
  // boat, fed by each HUD frame; silent on the results, in the lobby, while
  // reconnecting, with race sound off and after leaving the page.
  const raceSoundOn = useSyncExternalStore(subscribeRaceSound, readRaceSound, () => true);
  useMultiplayerSoundscape({ phase, reconnecting, soundOn: raceSoundOn, frame, windReading });

  // F5: the race intro opened from the menu (last state of the page, after the ones the tests seed by order).
  const [intro, setIntro] = useState<"closed" | "multiplayer">("closed");
  // It belongs to the menu: a lobby that arrives while it is open (Create or
  // Join was still connecting) closes it, so it never comes back by itself.
  useEffect(() => { if (phase !== "menu" && phase !== "error") setIntro("closed"); }, [phase]);

  // --- UI ---

  if (phase === 'menu' || phase === 'error') {
    return <>
      <MultiplayerMenu embed={embed} nickname={nickname} setNickname={setNickname}
        nicknameInvalid={nicknameInvalid} nicknameHint={nicknameHint} joinCode={joinCode} setJoinCode={setJoinCode}
        createBlocker={createBlocker} connecting={connecting} onCreate={() => void createLobby(sid)} onJoin={joinLobby}
        joinDisabled={connecting || joinCode.length !== 4 || !cleanNickname || !sid} error={error} onShowIntro={() => setIntro("multiplayer")} />
      {intro === "multiplayer" && <RaceIntro open="multiplayer" pro={false} onEnd={() => setIntro("closed")} />}
    </>;
  }

  if (phase === 'lobby' && room) {
    return <MultiplayerRoom room={room} players={lobbyPlayers} colors={COLORS} reconnecting={reconnecting} error={error}
      canShare={canShareNatively(typeof navigator === 'undefined' ? undefined : navigator)} share={shareOutcome} onShare={shareCode}
      onLeave={leaveLobby} onPickMission={missionId => pickMission(missionId)} onAddBot={addBot} onRemoveBot={removeBot}
      onStart={startRace} onReady={ready => clientRef.current?.send({ type: "ready", ready })} />;
  }

  if (phase === "lobby") return null;

  // The scene and every control occupy separate, reserved layout regions.
  const finishedPanel = phase === "finished" ? (
          <div className="w-full">
            <div className="text-center mb-4">
              <div className="text-2xl font-bold mb-1">{tp('Гонка окончена', 'Race finished', 'Wyścig zakończony', { es: 'Regata terminada', fr: 'Course terminée', de: 'Rennen beendet', it: 'Regata conclusa' })}</div>
              <div className="text-xs text-[var(--text-muted)]">{room?.code}</div>
            </div>
            <div className="space-y-1 mb-4">
              {results.map((r, i) => (
                <div key={r.id} className="flex items-center justify-between py-1.5 px-2 rounded"
                     style={{ background: r.id === room?.myId ? 'rgba(0,212,255,0.1)' : 'transparent' }}>
                  <span className="text-sm">
                    <span className="font-mono text-xs text-[var(--text-muted)] mr-2">
                      {r.time == null ? '·' : i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}
                    </span>
                    {r.nickname}
                    {r.isBot && <span className="text-[9px] text-[var(--text-muted)] ml-2">AI</span>}
                    {r.id === room?.myId && <span className="text-[10px] text-[var(--accent-cyan)] ml-2">{tp('ты', 'you', 'ty', { es: 'tú', fr: 'toi', de: 'du', it: 'tu' })}</span>}
                  </span>
                  <span className="font-mono text-sm text-[var(--accent-cyan)]">
                    {r.time != null ? formatTime(r.time) : 'DNF'}
                  </span>
                </div>
              ))}
            </div>
            {room?.hostId === room?.myId && <button onClick={() => clientRef.current?.send({ type: "rematch" })} className="w-full min-h-11 mb-3 rounded-lg bg-[var(--accent-cyan)] text-[var(--bg-primary)] font-semibold">{tp("Ещё гонка", "Race again", "Jeszcze jeden wyścig", { es: "Otra regata", fr: "Nouvelle course", de: "Noch ein Rennen", it: "Un'altra regata" })}</button>}
            {/* Mission result for "me" */}
            {(() => {
              const mine = results.find((r) => r.id === room?.myId);
              if (!mine?.mission) return null;
              return (
                <div className="mb-4 p-3 rounded-lg" style={{
                  background: mine.mission.passed ? 'rgba(68, 255, 136, 0.08)' : 'rgba(255, 170, 0, 0.08)',
                  border: `1px solid ${mine.mission.passed ? 'rgba(68, 255, 136, 0.35)' : 'rgba(255, 170, 0, 0.35)'}`,
                }}>
                  <div className="text-sm font-semibold" style={{ color: mine.mission.passed ? 'var(--success)' : 'var(--warning)' }}>
                    {mine.mission.passed
                      ? tp('✓ Миссия пройдена', '✓ Mission passed', '✓ Misja zaliczona', { es: '✓ Misión cumplida', fr: '✓ Mission réussie', de: '✓ Mission geschafft', it: '✓ Missione compiuta' })
                      : tp('⚠ Миссия провалена', '⚠ Mission failed', '⚠ Misja niezaliczona', { es: '⚠ Misión fallida', fr: '⚠ Mission ratée', de: '⚠ Mission gescheitert', it: '⚠ Missione fallita' })}
                  </div>
                  <ul className="text-xs text-[var(--text-secondary)] mt-1 list-disc list-inside">
                    {mine.mission.reasons.map((r, idx) => <li key={idx}>{missionReasonText(tp, r)}</li>)}
                  </ul>
                </div>
              );
            })()}
            <div className="flex gap-2">
              <button onClick={leaveLobby}
                className="flex-1 py-2 rounded-lg border text-sm"
                style={{ borderColor: 'rgba(0,212,255,0.3)', color: 'var(--accent-cyan)' }}>
                {tp('В меню', 'To menu', 'Do menu', { es: 'Al menú', fr: 'Au menu', de: 'Zum Menü', it: 'Al menu' })}
              </button>
              {!embed && <Link href="/leaderboard"
                className="flex-1 py-2 rounded-lg border text-sm text-center"
                style={{ borderColor: 'rgba(68,255,136,0.35)', color: 'var(--success)' }}>
                {tp('Лидерборд', 'Leaderboard', 'Ranking', { es: 'Clasificación', fr: 'Classement', de: 'Bestenliste', it: 'Classifica' })}
              </Link>}
            </div>
          </div>
  ) : null;
  return (
    <div style={{ height: embed ? "100dvh" : "calc(100dvh - var(--site-nav-h, 56px))" }}>
      <MultiplayerCockpit frame={frame} phase={phase} countdown={countdown} reconnecting={reconnecting} code={room?.code ?? ""}
        windReading={windReading} navigation={navigation} windDisplay={visualPrefs.windDisplay} setWindDisplay={windDisplay => updateVisualPrefs({ windDisplay })}
        miniMap={visualPrefs.miniMap} setMiniMap={miniMap => updateVisualPrefs({ miniMap })} track={readTrack}
        softLight={visualPrefs.softLight === true} setSoftLight={softLight => updateVisualPrefs({ softLight })}
        rudder={helm.rudder} course={helm.course} setRudder={setRudder} setCourse={setCourse} courseDelta={courseDelta}
        camera={camera} setCamera={view => { setCamera(view); recordControlChange("multiplayer", "camera", view, camera); }} onResetCamera={() => { setCameraRevision(value => value + 1); recordControlChange("multiplayer", "camera", camera); }} onLeave={leaveLobby} results={finishedPanel} guidanceOn={guidanceOn} setGuidanceOn={value => { setGuidanceOn(value); recordPreferenceChange("multiplayer", "guidance", value, guidanceOn); }}>
        <RaceScene boatsRef={boatsRef} courseRef={courseRef} windDirRef={windDirRef} venue={venue} camera={camera} cameraRevision={cameraRevision} labels={sceneLabels} maxDpr={embed ? 1.5 : 2} guidance={guidanceOn ? frame?.guidance : null} started={phase === "racing"}
          showWind={visualPrefs.windDisplay === "arrows" || visualPrefs.windDisplay === "both"} softLight={visualPrefs.softLight === true} />
      </MultiplayerCockpit>
    </div>
  );
}

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  const ms = Math.floor((s * 10) % 10);
  return `${m}:${sec.toString().padStart(2, '0')}.${ms}`;
}
