'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from "next/dynamic";
import Link from 'next/link';
import { MPClient, getWsUrl, SnapshotBuffer, type MPMessage, type MissionReason } from '@/lib/mp-client';
import { missions } from '@/data/missions';
import { useI18n } from '@/lib/i18n';
import { useVenue } from '@/features/venues/useVenue';
import { sanitizeNickname } from '@/lib/race-submission';
import type { Race3DBoat, RaceCamera } from "@/features/race-3d/pose";
import { MultiplayerCockpit } from "./MultiplayerCockpit";
import { createMultiplayerPresentation, multiplayerTurn, withMultiplayerCourse, FLEET_COLORS, MULTIPLAYER_COURSE, type MultiplayerFrame } from "./presentation";

const RaceScene = dynamic(() => import("@/features/race-scene/RaceScene").then(module => module.RaceScene), { ssr: false });

type Phase = 'menu' | 'lobby' | 'countdown' | 'racing' | 'finished' | 'error';

interface LobbyPlayer { id: string; nickname: string; ready: boolean; isBot: boolean; connected: boolean }
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
  const { tp, tl } = useI18n();
  // Scenery around the race area: each player sees the venue they picked (cosmetic, not synced).
  const { venue } = useVenue();
  const embed = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('embed') === '1';
  const [phase, setPhase] = useState<Phase>('menu');
  const [error, setError] = useState<string | null>(null);
  const [nickname, setNickname] = useState<string>('');
  const [joinCode, setJoinCode] = useState('');
  const [sid, setSid] = useState<string | null>(null);
  const [reconnecting, setReconnecting] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const [room, setRoom] = useState<{
    code: string; hostId: string; myId: string; isHost: boolean;
    missionId: string | null;
    difficulty: string; windStrength: string;
    maxPlayers: number;
  } | null>(null);
  const [lobbyPlayers, setLobbyPlayers] = useState<LobbyPlayer[]>([]);
  const [countdown, setCountdown] = useState(5);
  const [results, setResults] = useState<Results[]>([]);

  const clientRef = useRef<MPClient | null>(null);
  const bufferRef = useRef<SnapshotBuffer>(new SnapshotBuffer());
  const presentationRef = useRef(createMultiplayerPresentation());
  const boatsRef = useRef<Race3DBoat[]>([]);
  const courseRef = useRef(MULTIPLAYER_COURSE);
  const windDirRef = useRef(0);
  const [frame, setFrame] = useState<MultiplayerFrame | null>(null);
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
    inputRef.current.rudder = rudder; inputRef.current.course = null;
    setHelm({ rudder, course: null });
  }, []);
  const setCourse = useCallback((degrees: number) => {
    const next = withMultiplayerCourse(inputRef.current, degrees);
    if (next === inputRef.current) return;
    inputRef.current = next;
    setHelm({ rudder: next.rudder, course: next.course });
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

  // Load session info
  useEffect(() => {
    fetch('/api/player').then((r) => r.json()).then((d) => {
      setSid(typeof d?.sid === "string" ? d.sid : crypto.randomUUID());
      if (d?.nickname) setNickname(d.nickname);
    }).catch(() => { setSid(crypto.randomUUID()); });
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
    switch (msg.type) {
      case 'joined':
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
          boatsRef.current = []; setFrame(null); releaseInput();
        }
        else if (msg.phase === 'racing') setPhase('racing');
        else if (msg.phase === 'finished') setPhase('finished');
        break;
      case 'countdown':
        setCountdown(Math.max(0, Math.ceil(msg.remain)));
        break;
      case 'state':
        bufferRef.current.push({ t: msg.t, wind: msg.wind, boats: msg.boats });
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
  }, [tp, tl, releaseInput]);

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

  const createLobby = useCallback(async () => {
    if (!nickname.trim()) { setError(tp('Введи ник', 'Enter a nickname', 'Podaj nick', { es: 'Escribe un apodo', fr: 'Entre un pseudo', de: 'Gib einen Nickname ein', it: 'Inserisci un nickname' })); return; }
    if (!cleanNickname) { setError(nicknameHint); return; }
    setError(null);
    setConnecting(true);
    try {
      const c = await ensureClient();
      c.send({ type: 'create', nickname: cleanNickname, sid });
    } catch {
      setConnecting(false);
      setError(tp('Не удалось подключиться к серверу', 'Could not connect to server', 'Nie udało się połączyć z serwerem', { es: 'No se pudo conectar con el servidor', fr: 'Impossible de se connecter au serveur', de: 'Keine Verbindung zum Server', it: 'Impossibile connettersi al server' }));
      setPhase('error');
    }
  }, [nickname, cleanNickname, nicknameHint, sid, ensureClient, tp]);

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
    bufferRef.current.reset();
    presentationRef.current.reset(); boatsRef.current = []; setFrame(null); releaseInput();
    setRoom(null);
    setLobbyPlayers([]);
    setResults([]);
    setPhase('menu');
    setError(null);
  }, [releaseInput]);

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
        if (now - lastHud >= 100) { lastHud = now; setFrame(next); }
      }
      raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render);
    return () => cancelAnimationFrame(raf);
  }, [phase, room, lobbyPlayers]);

  // --- UI ---

  if (phase === 'menu' || phase === 'error') {
    return (
      <div className="page-enter max-w-lg mx-auto px-4 py-10">
        {!embed && <Link href="/game" className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]">
          ← {tp('Одиночная гонка', 'Single race', 'Wyścig solo', { es: 'Regata en solitario', fr: 'Course en solo', de: 'Solo-Rennen', it: 'Regata in solitario' })}
        </Link>}
        <h1 className="text-3xl font-bold mt-4 mb-2">{tp('Мультиплеер', 'Multiplayer', 'Multiplayer', { es: 'Multijugador', fr: 'Multijoueur', de: 'Mehrspieler', it: 'Multigiocatore' })}</h1>
        <p className="text-sm text-[var(--text-secondary)] mb-6">
          {tp(
            'До 10 игроков на одной трассе. Хост создаёт лобби и делится 4-символьным кодом. Можно добавить ботов.',
            'Up to 10 players on one course. The host creates a lobby and shares the 4-character code. Bots can be added.',
            'Do 10 graczy na jednej trasie. Host tworzy lobby i udostępnia 4-znakowy kod. Można dodać boty.',
            {
              es: 'Hasta 10 jugadores en el mismo recorrido. El anfitrión crea una sala y comparte el código de 4 caracteres. Se pueden añadir bots.',
              fr: 'Jusqu\'à 10 joueurs sur le même parcours. L\'hôte crée un salon et partage le code à 4 caractères. Tu peux ajouter des bots.',
              de: 'Bis zu 10 Spieler auf einer Bahn. Der Host erstellt eine Lobby und teilt den 4-stelligen Code. Bots lassen sich hinzufügen.',
              it: 'Fino a 10 giocatori sullo stesso percorso. L\'host crea una lobby e condivide il codice di 4 caratteri. Puoi aggiungere dei bot.',
            },
          )}
        </p>
        <div className="card p-4 mb-4">
          <label className="text-xs text-[var(--text-muted)] block mb-1">{tp('Твой ник', 'Your nickname', 'Twój nick', { es: 'Tu apodo', fr: 'Ton pseudo', de: 'Dein Nickname', it: 'Il tuo nickname' })}</label>
          <input
            aria-label={tp("Твой ник", "Your nickname", "Twój nick", { es: "Tu apodo", fr: "Ton pseudo", de: "Dein Nickname", it: "Il tuo nickname" })}
            type="text" value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            maxLength={20}
            aria-invalid={nicknameInvalid || undefined}
            aria-describedby={nicknameInvalid ? 'mp-nickname-hint' : undefined}
            className="w-full px-3 py-2 rounded text-sm"
            style={{ background: 'var(--bg-secondary)', border: '1px solid rgba(0,212,255,0.2)', color: 'var(--text-primary)' }}
            placeholder={tp('Введи ник', 'Enter nickname', 'Podaj nick', { es: 'Escribe un apodo', fr: 'Entre un pseudo', de: 'Nickname eingeben', it: 'Inserisci un nickname' })}
          />
          {nicknameInvalid && (
            <p id="mp-nickname-hint" className="text-xs mt-1" style={{ color: 'var(--warning)' }}>
              {nicknameHint}
            </p>
          )}
        </div>
        <button disabled={connecting || !cleanNickname || !sid} onClick={createLobby}
          className="w-full py-3 rounded-lg font-semibold text-sm mb-3 disabled:opacity-40"
          style={{ background: 'linear-gradient(135deg, var(--accent-cyan), #0099cc)', color: '#0a1628' }}>
          {tp('Создать лобби', 'Create lobby', 'Utwórz lobby', { es: 'Crear sala', fr: 'Créer un salon', de: 'Lobby erstellen', it: 'Crea lobby' })}
        </button>
        <div className="card p-4 mb-3">
          <div className="text-xs text-[var(--text-muted)] mb-2">{tp('Присоединиться по коду', 'Join by code', 'Dołącz z kodem', { es: 'Unirse con un código', fr: 'Rejoindre avec un code', de: 'Mit Code beitreten', it: 'Entra con un codice' })}</div>
          <div className="flex gap-2">
            <input
              type="text" value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 4))}
              maxLength={4}
              aria-label={tp("Код комнаты", "Room code", "Kod pokoju", { es: "Código de sala", fr: "Code du salon", de: "Raumcode", it: "Codice stanza" })}
              className="min-w-0 flex-1 px-3 py-2 rounded text-base font-mono text-center tracking-widest"
              style={{ background: 'var(--bg-secondary)', border: '1px solid rgba(0,212,255,0.2)', color: 'var(--text-primary)' }}
              placeholder="XXXX"
            />
            <button onClick={joinLobby} disabled={connecting || joinCode.length !== 4 || !cleanNickname || !sid}
              className="px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-40"
              style={{ background: 'var(--accent-cyan)', color: '#0a1628' }}>
              {tp('Войти', 'Join', 'Dołącz', { es: 'Unirse', fr: 'Rejoindre', de: 'Beitreten', it: 'Entra' })}
            </button>
          </div>
        </div>
        {error && (
          <div className="text-sm px-3 py-2 rounded" style={{ background: 'rgba(255,68,68,0.1)', color: 'var(--danger)' }}>
            {error}
          </div>
        )}
        <div className="text-[10px] text-[var(--text-muted)] mt-6 leading-relaxed">
          {tp(
            'При обрыве связи твоё место сохраняется на 20 секунд. Управляй штурвалом, ползунком или стрелками.',
            "Your place is held for 20 seconds if you disconnect. Steer with the wheel, slider or arrow keys.",
            'Po zerwaniu połączenia twoje miejsce czeka 20 sekund. Steruj kołem, suwakiem lub strzałkami.',
            {
              es: 'Si se corta la conexión, tu plaza se guarda 20 segundos. Gobierna con la rueda, el deslizador o las flechas.',
              fr: 'En cas de déconnexion, ta place est gardée 20 secondes. Barre avec la roue, le curseur ou les flèches.',
              de: 'Bei Verbindungsabbruch bleibt dein Platz 20 Sekunden reserviert. Steuere mit dem Rad, dem Regler oder den Pfeiltasten.',
              it: 'Se cade la connessione, il tuo posto resta riservato per 20 secondi. Timona con la ruota, il cursore o le frecce.',
            },
          )}
        </div>
      </div>
    );
  }

  if (phase === 'lobby' && room) {
    const iAmHost = room.hostId === room.myId;
    const me = lobbyPlayers.find((p) => p.id === room.myId);
    const allReady = lobbyPlayers.every((p) => p.isBot || (p.connected && (p.id === room.hostId || p.ready)));
    const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/multiplayer?code=${room.code}` : '';
    const activeMission = room.missionId ? missions.find((m) => m.id === room.missionId) : null;
    const botCount = lobbyPlayers.filter((p) => p.isBot).length;
    const humanCount = lobbyPlayers.filter((p) => !p.isBot).length;
    const totalCount = lobbyPlayers.length;
    return (
      <div className="page-enter max-w-lg mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-4">
          <button onClick={leaveLobby} className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]">
            ← {tp('Выйти', 'Leave', 'Wyjdź', { es: 'Salir', fr: 'Quitter', de: 'Verlassen', it: 'Esci' })}
          </button>
          <span className="text-[10px] px-2 py-0.5 rounded" style={{ background: 'rgba(0,212,255,0.15)', color: 'var(--accent-cyan)' }}>
            {iAmHost ? tp('Ты хост', 'You are host', 'Jesteś hostem', { es: 'Eres el anfitrión', fr: 'Tu es l\'hôte', de: 'Du bist Host', it: 'Sei l\'host' }) : tp('Игрок', 'Player', 'Gracz', { es: 'Jugador', fr: 'Joueur', de: 'Spieler', it: 'Giocatore' })}
          </span>
        </div>
        <div className="card p-5 text-center mb-4" style={{ background: 'rgba(0, 212, 255, 0.04)', borderColor: 'rgba(0, 212, 255, 0.3)' }}>
          <div className="text-xs text-[var(--text-muted)] mb-1">{tp('КОД ЛОББИ', 'LOBBY CODE', 'KOD LOBBY', { es: 'CÓDIGO DE SALA', fr: 'CODE DU SALON', de: 'LOBBY-CODE', it: 'CODICE LOBBY' })}</div>
          <div className="text-5xl font-bold font-mono tracking-[0.2em]" style={{ color: 'var(--accent-cyan)' }}>
            {room.code}
          </div>
          <button onClick={async () => { try { await navigator.clipboard.writeText(shareUrl); setLinkCopied(true); } catch { setError(shareUrl); } }}
            className="text-[11px] text-[var(--text-muted)] hover:text-[var(--accent-cyan)] mt-2">
            {linkCopied ? tp("Ссылка скопирована", "Link copied", "Link skopiowany", { es: "Enlace copiado", fr: "Lien copié", de: "Link kopiert", it: "Link copiato" }) : tp('Копировать ссылку', 'Copy link', 'Kopiuj link', { es: 'Copiar enlace', fr: 'Copier le lien', de: 'Link kopieren', it: 'Copia link' })}
          </button>
        </div>

        <p className="mb-4 text-sm text-[var(--text-secondary)]">
          {activeMission ? tp(activeMission.descRu, activeMission.descEn, activeMission.descPl, { es: activeMission.descEs, fr: activeMission.descFr, de: activeMission.descDe, it: activeMission.descIt }) : tp("Обычная регата: старт, знак слева, финиш.", "Standard race: start, leave the mark to port, finish.", "Zwykła regata: start, znak zostawiasz lewą burtą, meta.", { es: "Regata normal: salida, baliza por babor, llegada.", fr: "Course standard : départ, bouée à bâbord, arrivée.", de: "Normales Rennen: Start, Bahnmarke an Backbord, Ziel.", it: "Regata standard: partenza, boa lasciata a sinistra, arrivo." })}
        </p>
        {iAmHost && (
          <details className="mb-4 border-y border-[var(--border-subtle)]">
            <summary className="cursor-pointer py-3 text-sm text-[var(--text-secondary)]">
              {tp("Условия гонки", "Race settings", "Ustawienia wyścigu", { es: "Ajustes de la regata", fr: "Réglages de la course", de: "Renneinstellungen", it: "Impostazioni regata" })}
            </summary>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
              <button
                onClick={() => pickMission(null)}
                className="p-2 rounded-lg text-xs transition border"
                style={{
                  borderColor: !room.missionId ? 'var(--accent-cyan)' : 'rgba(139, 167, 184, 0.2)',
                  background: !room.missionId ? 'rgba(0, 212, 255, 0.08)' : 'transparent',
                }}
              >
                🏁 {tp('Свободная', 'Free', 'Wolny', { es: 'Libre', fr: 'Libre', de: 'Frei', it: 'Libera' })}
              </button>
              {missions.map((m) => (
                <button
                  key={m.id}
                  onClick={() => pickMission(m.id)}
                  className="p-2 rounded-lg text-xs transition border text-left"
                  style={{
                    borderColor: room.missionId === m.id ? 'var(--accent-cyan)' : 'rgba(139, 167, 184, 0.2)',
                    background: room.missionId === m.id ? 'rgba(0, 212, 255, 0.08)' : 'transparent',
                  }}
                  title={tp(m.descRu, m.descEn, m.descPl, { es: m.descEs, fr: m.descFr, de: m.descDe, it: m.descIt })}
                >
                  {m.emoji} {tp(m.titleRu, m.titleEn, m.titlePl, { es: m.titleEs, fr: m.titleFr, de: m.titleDe, it: m.titleIt })}
                </button>
              ))}
            </div>
            {activeMission && (
              <div className="mt-2 text-[10px] text-[var(--text-secondary)]">
                💡 {tp(activeMission.hintRu, activeMission.hintEn, activeMission.hintPl, { es: activeMission.hintEs, fr: activeMission.hintFr, de: activeMission.hintDe, it: activeMission.hintIt })}
              </div>
            )}
          </details>
        )}

        <div className="card p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs text-[var(--text-muted)]">{tp('ИГРОКИ', 'PLAYERS', 'GRACZE', { es: 'JUGADORES', fr: 'JOUEURS', de: 'SPIELER', it: 'GIOCATORI' })} · {totalCount} / {room.maxPlayers}</div>
            {iAmHost && (
              <div className="flex gap-1">
                <button onClick={removeBot} disabled={botCount === 0}
                  aria-label={tp('Убрать бота', 'Remove bot', 'Usuń bota', { es: 'Quitar un bot', fr: 'Retirer un bot', de: 'Bot entfernen', it: 'Rimuovi un bot' })}
                  className="text-xs px-3 rounded disabled:opacity-30 min-h-[40px] min-w-[44px]"
                  style={{ border: '1px solid rgba(139, 167, 184, 0.3)' }}>- {tp('бот', 'bot', 'bot', { es: 'bot', fr: 'bot', de: 'Bot', it: 'bot' })}</button>
                <button onClick={addBot} disabled={totalCount >= room.maxPlayers}
                  aria-label={tp('Добавить бота', 'Add bot', 'Dodaj bota', { es: 'Añadir un bot', fr: 'Ajouter un bot', de: 'Bot hinzufügen', it: 'Aggiungi un bot' })}
                  className="text-xs px-3 rounded disabled:opacity-30 min-h-[40px] min-w-[44px]"
                  style={{ border: '1px solid rgba(0, 212, 255, 0.35)', color: 'var(--accent-cyan)' }}>+ {tp('бот', 'bot', 'bot', { es: 'bot', fr: 'bot', de: 'Bot', it: 'bot' })}</button>
              </div>
            )}
          </div>
          <div className="space-y-1.5 max-h-[40vh] overflow-y-auto">
            {lobbyPlayers.map((p, i) => (
              <div key={p.id} className="flex items-center gap-2 text-sm">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                <span className="flex-1 text-[var(--text-primary)]">
                  {p.nickname}
                  {p.isBot && <span className="text-[9px] text-[var(--text-muted)] ml-2">AI</span>}
                  {!p.connected && !p.isBot && <span className="text-[9px] text-[var(--warning)] ml-2">{tp('разрыв', 'disconnected', 'rozłączony', { es: 'desconectado', fr: 'déconnecté', de: 'getrennt', it: 'disconnesso' })}</span>}
                </span>
                {p.id === room.hostId && <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(255,170,0,0.15)', color: 'var(--warning)' }}>{tp('хост', 'host', 'host', { es: 'anfitrión', fr: 'hôte', de: 'Host', it: 'host' })}</span>}
                {!p.isBot && p.id !== room.hostId && <span className="text-xs text-[var(--text-secondary)]">{p.ready ? tp("Готов", "Ready", "Gotowy", { es: "Listo", fr: "Prêt", de: "Bereit", it: "Pronto" }) : tp("Не готов", "Not ready", "Niegotowy", { es: "No está listo", fr: "Pas prêt", de: "Nicht bereit", it: "Non pronto" })}</span>}
                {p.id === room.myId && <span className="text-[10px] text-[var(--accent-cyan)]">{tp('ты', 'you', 'ty', { es: 'tú', fr: 'toi', de: 'du', it: 'tu' })}</span>}
              </div>
            ))}
          </div>
          <div className="text-[10px] text-[var(--text-muted)] mt-2">
            {tp('людей', 'humans', 'ludzi', { es: 'personas', fr: 'humains', de: 'Menschen', it: 'umani' })}: {humanCount} · {tp('ботов', 'bots', 'botów', { es: 'bots', fr: 'bots', de: 'Bots', it: 'bot' })}: {botCount}
          </div>
        </div>

        {iAmHost ? (
          <button onClick={startRace} disabled={totalCount < 1 || !allReady || reconnecting}
            className="w-full py-3 rounded-lg font-semibold text-base disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg, #44ff88, #22cc66)', color: '#0a1628' }}>
            {tp('Старт гонки', 'Start race', 'Rozpocznij wyścig', { es: 'Empezar la regata', fr: 'Lancer la course', de: 'Rennen starten', it: 'Avvia la regata' })} · {totalCount} {
              tp(
                totalCount === 1 ? 'лодка' : totalCount < 5 ? 'лодки' : 'лодок',
                totalCount === 1 ? 'boat' : 'boats',
                totalCount === 1 ? 'łódź' : totalCount < 5 ? 'łodzie' : 'łodzi',
                {
                  es: totalCount === 1 ? 'barco' : 'barcos',
                  fr: totalCount === 1 ? 'bateau' : 'bateaux',
                  de: totalCount === 1 ? 'Boot' : 'Boote',
                  it: totalCount === 1 ? 'barca' : 'barche',
                },
              )
            }
          </button>
        ) : (
          <div className="text-center text-sm text-[var(--text-muted)] py-3">
            <button className="w-full min-h-11 rounded-lg border px-4 py-3 text-[var(--accent-cyan)]" aria-pressed={!!me?.ready} disabled={reconnecting} onClick={() => clientRef.current?.send({ type: "ready", ready: !me?.ready })}>
              {me?.ready ? tp("Готов, жду старта", "Ready, waiting for start", "Gotowy, czekam na start", { es: "Listo, esperando la salida", fr: "Prêt, j'attends le départ", de: "Bereit, warte auf den Start", it: "Pronto, attendo la partenza" }) : tp("Я готов", "I'm ready", "Jestem gotowy", { es: "Estoy listo", fr: "Je suis prêt", de: "Ich bin bereit", it: "Sono pronto" })}
            </button>
          </div>
        )}

        {error && <p role="alert" className="mt-3 break-all text-sm text-[var(--warning)]">{error}</p>}
        {iAmHost && !allReady && <p role="status" className="mt-3 text-sm text-[var(--text-secondary)]">{tp("Ждём готовности игроков", "Waiting for players to be ready", "Czekamy, aż gracze będą gotowi", { es: "Esperando a que los jugadores estén listos", fr: "En attente des joueurs", de: "Warten, bis alle bereit sind", it: "In attesa dei giocatori" })}</p>}
        {reconnecting && (
          <div className="mt-3 text-xs text-center px-3 py-2 rounded" style={{ background: 'rgba(255, 170, 0, 0.1)', color: 'var(--warning)' }}>
            {tp('Переподключаюсь...', 'Reconnecting...', 'Łączę ponownie...', { es: 'Reconectando...', fr: 'Reconnexion...', de: 'Verbinde neu...', it: 'Riconnessione...' })}
          </div>
        )}
      </div>
    );
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
        rudder={helm.rudder} course={helm.course} setRudder={setRudder} setCourse={setCourse} courseDelta={courseDelta}
        camera={camera} setCamera={setCamera} onResetCamera={() => setCameraRevision(value => value + 1)} onLeave={leaveLobby} results={finishedPanel} guidanceOn={guidanceOn} setGuidanceOn={setGuidanceOn}>
        <RaceScene boatsRef={boatsRef} courseRef={courseRef} windDirRef={windDirRef} venue={venue} camera={camera} cameraRevision={cameraRevision} labels={sceneLabels} maxDpr={embed ? 1.5 : 2} guidance={guidanceOn ? frame?.guidance : null} />
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
