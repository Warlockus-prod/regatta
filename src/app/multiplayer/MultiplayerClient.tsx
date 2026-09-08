'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { MPClient, getWsUrl, SnapshotBuffer, type MPMessage, type MissionReason } from '@/lib/mp-client';
import { WORLD, makeStandardCourse, deg2rad } from '@/lib/race-physics';
import { missions } from '@/data/missions';
import { useI18n } from '@/lib/i18n';

type Phase = 'menu' | 'lobby' | 'countdown' | 'racing' | 'finished' | 'error';

interface LobbyPlayer { id: string; nickname: string; ready: boolean; isBot: boolean; connected: boolean }
interface Results { id: string; nickname: string; isBot: boolean; time: number | null; mission: { passed: boolean; reasons: MissionReason[] } | null }

const COLORS = ['#00d4ff', '#ff6688', '#ffdd44', '#44ff88', '#aa88ff', '#ff8844', '#55ccee', '#ff99cc', '#c6f0a5', '#bb99ff'];

// Localize a mission-evaluation reason code from the (language-agnostic) server.
// RU / EN / PL via tp(); ES/FR/DE/IT fall back to EN, matching the rest of this
// screen's tp() call sites.
function missionReasonText(
  tp: (ru: string, en: string, pl: string) => string,
  r: MissionReason,
): string {
  switch (r.code) {
    case 'dnf':
      return tp('Не финишировал', 'Did not finish', 'Nie ukonczono');
    case 'no-go':
      return tp(`Вошёл в мёртвую зону ${r.count}x`, `Entered the no-go zone ${r.count}x`, `Wejscie w martwa strefe ${r.count}x`);
    case 'time-over':
      return tp(`Время ${r.time}с > ${r.limit}с`, `Time ${r.time}s > ${r.limit}s`, `Czas ${r.time}s > ${r.limit}s`);
    case 'tacks-over':
      return tp(`Поворотов ${r.count}, нужно <= ${r.max}`, `Tacks ${r.count}, need <= ${r.max}`, `Zwrotow ${r.count}, trzeba <= ${r.max}`);
    case 'passed':
      return tp('Все условия выполнены', 'All conditions met', 'Wszystkie warunki spelnione');
  }
}

export default function MultiplayerClient() {
  const { tp } = useI18n();
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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bufferRef = useRef<SnapshotBuffer>(new SnapshotBuffer());
  const windRef = useRef<{ dir: number; gust: number }>({ dir: 0, gust: 1 });

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
        else if (msg.phase === 'countdown') { setPhase('countdown'); bufferRef.current.reset(); }
        else if (msg.phase === 'racing') setPhase('racing');
        else if (msg.phase === 'finished') setPhase('finished');
        break;
      case 'countdown':
        setCountdown(Math.max(0, Math.ceil(msg.remain)));
        break;
      case 'state':
        bufferRef.current.push({ t: msg.t, wind: msg.wind, boats: msg.boats });
        windRef.current = msg.wind;
        break;
      case 'finished':
        setResults(msg.results);
        setPhase('finished');
        break;
      case 'error':
        setConnecting(false);
        setError(msg.code === "players-not-ready"
          ? tp("Дождись готовности всех игроков", "Wait until everyone is ready", "Poczekaj na gotowość wszystkich", { es: "Espera a todos", fr: "Attendez tous les joueurs", de: "Warte, bis alle bereit sind", it: "Attendi che tutti siano pronti" })
          : msg.code === "room-not-found" ? tp("Комната закрыта или код неверен", "Room closed or code incorrect", "Pokój zamknięty lub błędny kod", { es: "Sala cerrada o código incorrecto", fr: "Salle fermée ou code incorrect", de: "Raum geschlossen oder falscher Code", it: "Stanza chiusa o codice errato" })
          : msg.code === "race-in-progress" ? tp("Гонка уже началась", "The race has already started", "Wyścig już się rozpoczął", { es: "La carrera ya comenzó", fr: "La course a déjà commencé", de: "Das Rennen läuft bereits", it: "La regata è già iniziata" })
          : msg.code === "room-full" ? tp("Комната заполнена", "The room is full", "Pokój jest pełny", { es: "La sala está llena", fr: "La salle est pleine", de: "Der Raum ist voll", it: "La stanza è piena" })
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
  }, [tp]);

  const ensureClient = useCallback(async (): Promise<MPClient> => {
    if (clientRef.current?.isOpen) return clientRef.current;
    const c = clientRef.current ?? new MPClient();
    if (!clientRef.current) {
      c.on(handleServerMsg);
      c.onClose((wasReconnect) => {
        if (wasReconnect) setReconnecting(true);
      });
      clientRef.current = c;
    }
    await c.connect(getWsUrl());
    return c;
  }, [handleServerMsg]);

  const createLobby = useCallback(async () => {
    if (!nickname.trim()) { setError(tp('Введи ник', 'Enter a nickname', 'Podaj ksywe')); return; }
    setError(null);
    setConnecting(true);
    try {
      const c = await ensureClient();
      c.send({ type: 'create', nickname: nickname.trim(), sid });
    } catch {
      setConnecting(false);
      setError(tp('Не удалось подключиться к серверу', 'Could not connect to server', 'Nie udalo sie polaczyc z serwerem'));
      setPhase('error');
    }
  }, [nickname, sid, ensureClient, tp]);

  const joinLobby = useCallback(async () => {
    if (!nickname.trim()) { setError(tp('Введи ник', 'Enter a nickname', 'Podaj ksywe')); return; }
    if (joinCode.length !== 4) { setError(tp('Код должен быть 4 символа', 'Code must be 4 characters', 'Kod musi miec 4 znaki')); return; }
    setError(null);
    setConnecting(true);
    try {
      const c = await ensureClient();
      c.send({ type: 'join', code: joinCode.toUpperCase(), nickname: nickname.trim(), sid });
      if (sid) c.rememberForResume({ code: joinCode.toUpperCase(), nickname: nickname.trim(), sid });
    } catch {
      setConnecting(false);
      setError(tp('Не удалось подключиться к серверу', 'Could not connect to server', 'Nie udalo sie polaczyc z serwerem'));
      setPhase('error');
    }
  }, [nickname, joinCode, sid, ensureClient, tp]);

  // Once we've joined, enable auto-resume on WS drop
  useEffect(() => {
    if (!room || !sid || !clientRef.current) return;
    clientRef.current.rememberForResume({
      code: room.code, nickname: nickname.trim() || 'Player', sid,
    });
  }, [room, sid, nickname]);

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
    setRoom(null);
    setLobbyPlayers([]);
    setResults([]);
    setPhase('menu');
    setError(null);
  }, []);

  // Input capture + 20Hz send
  const inputRef = useRef<{ left: boolean; right: boolean }>({ left: false, right: false });
  useEffect(() => {
    if (phase !== 'racing' && phase !== 'countdown') return;
    const onDown = (e: KeyboardEvent) => {
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
    const releaseInput = () => { inputRef.current = { left: false, right: false }; };
    window.addEventListener("blur", releaseInput);
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    const id = setInterval(() => {
      const turn = (inputRef.current.right ? 1 : 0) - (inputRef.current.left ? 1 : 0);
      clientRef.current?.send({ type: 'input', turn });
    }, 50);
    return () => {
      releaseInput();
      window.removeEventListener('blur', releaseInput);
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
      clearInterval(id);
    };
  }, [phase]);

  // Canvas render loop - interpolated
  useEffect(() => {
    if (phase !== 'racing' && phase !== 'countdown' && phase !== 'finished') return;
    const cv = canvasRef.current;
    if (!cv) return;
    const course = makeStandardCourse();
    let raf = 0;

    const resize = () => {
      const rect = cv.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      cv.width = rect.width * dpr;
      cv.height = rect.height * dpr;
      const ctx = cv.getContext('2d');
      if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const render = () => {
      const ctx = cv.getContext('2d');
      if (!ctx) return;
      const rect = cv.getBoundingClientRect();
      const W = rect.width, H = rect.height;

      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#051425'); g.addColorStop(1, '#0a1f3d');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

      const s = Math.min(W / WORLD.width, H / WORLD.height);
      const ox = (W - WORLD.width * s) / 2;
      const oy = (H - WORLD.height * s) / 2;
      const toXY = (p: { x: number; y: number }) => ({ x: ox + p.x * s, y: oy + p.y * s });

      // Start/finish line
      const la = toXY(course.startLine.a), lb = toXY(course.startLine.b);
      ctx.strokeStyle = '#ffaa00'; ctx.setLineDash([6, 4]); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(la.x, la.y); ctx.lineTo(lb.x, lb.y); ctx.stroke();
      ctx.setLineDash([]);
      // Windward
      const wm = toXY(course.marks[0].pos);
      ctx.beginPath(); ctx.arc(wm.x, wm.y, 10 * s + 6, 0, Math.PI * 2);
      ctx.fillStyle = '#ffaa00'; ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();

      // Boats (interpolated)
      const snap = bufferRef.current.sample();
      if (snap) {
        for (let i = 0; i < snap.boats.length; i++) {
          const b = snap.boats[i];
          const screen = toXY({ x: b.x, y: b.y });
          const isMe = room?.myId === b.id;
          if (isMe && b.target && b.f == null) {
            const target = toXY(b.target);
            ctx.strokeStyle = "#00d4ff"; ctx.lineWidth = 1.5; ctx.setLineDash([5, 5]);
            ctx.beginPath(); ctx.moveTo(screen.x, screen.y); ctx.lineTo(target.x, target.y); ctx.stroke();
            ctx.setLineDash([]); ctx.beginPath(); ctx.arc(target.x, target.y, 8, 0, Math.PI * 2); ctx.stroke();
          }
          drawBoat(ctx, screen.x, screen.y, b.h, COLORS[i % COLORS.length], isMe);
          ctx.fillStyle = isMe ? "#00d4ff" : "#d9e8f1";
          ctx.font = "12px system-ui, sans-serif"; ctx.textAlign = "center";
          ctx.fillText(lobbyPlayers.find((p) => p.id === b.id)?.nickname.slice(0, 16) ?? "", screen.x, screen.y + 26);

        }
      }

      // HUD wind
      ctx.fillStyle = '#ffffff';
      ctx.font = '13px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`${tp('Ветер', 'Wind', 'Wiatr')} ${Math.round(windRef.current.dir)}°  ${(12 * (room?.windStrength === "light" ? 0.65 : room?.windStrength === "heavy" ? 1.3 : 1) * windRef.current.gust).toFixed(1)} kn`, 10, 18);

      if (phase === 'countdown') {
        ctx.fillStyle = 'rgba(10, 22, 40, 0.6)';
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#00d4ff';
        ctx.font = 'bold 72px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(countdown === 0 ? tp('СТАРТ!', 'START!', 'START!') : String(countdown), W / 2, H / 2);
      }

      raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, [phase, countdown, room, lobbyPlayers, tp]);

  // --- UI ---

  if (phase === 'menu' || phase === 'error') {
    return (
      <div className="page-enter max-w-lg mx-auto px-4 py-10">
        {!embed && <Link href="/game" className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]">
          ← {tp('Одиночная гонка', 'Single race', 'Wyscig solo')}
        </Link>}
        <h1 className="text-3xl font-bold mt-4 mb-2">{tp('Мультиплеер', 'Multiplayer', 'Multiplayer')}</h1>
        <p className="text-sm text-[var(--text-secondary)] mb-6">
          {tp(
            'До 10 игроков на одной трассе. Хост создаёт лобби и делится 4-символьным кодом. Можно добавить ботов.',
            'Up to 10 players on one course. The host creates a lobby and shares the 4-character code. Bots can be added.',
            'Do 10 graczy na jednej trasie. Host tworzy lobby i udostepnia 4-znakowy kod. Mozna dodac boty.',
          )}
        </p>
        <div className="card p-4 mb-4">
          <label className="text-xs text-[var(--text-muted)] block mb-1">{tp('Твой ник', 'Your nickname', 'Twoja ksywa')}</label>
          <input
            aria-label={tp("Твой ник", "Your nickname", "Twoja ksywa")}
            type="text" value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            maxLength={20}
            className="w-full px-3 py-2 rounded text-sm"
            style={{ background: 'var(--bg-secondary)', border: '1px solid rgba(0,212,255,0.2)', color: 'var(--text-primary)' }}
            placeholder={tp('Введи ник', 'Enter nickname', 'Podaj ksywe')}
          />
        </div>
        <button disabled={connecting || !nickname.trim() || !sid} onClick={createLobby}
          className="w-full py-3 rounded-lg font-semibold text-sm mb-3 disabled:opacity-40"
          style={{ background: 'linear-gradient(135deg, var(--accent-cyan), #0099cc)', color: '#0a1628' }}>
          {tp('Создать лобби', 'Create lobby', 'Utworz lobby')}
        </button>
        <div className="card p-4 mb-3">
          <div className="text-xs text-[var(--text-muted)] mb-2">{tp('Присоединиться по коду', 'Join by code', 'Dolacz po kodzie')}</div>
          <div className="flex gap-2">
            <input
              type="text" value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 4))}
              maxLength={4}
              aria-label={tp("Код комнаты", "Room code", "Kod pokoju")}
              className="min-w-0 flex-1 px-3 py-2 rounded text-base font-mono text-center tracking-widest"
              style={{ background: 'var(--bg-secondary)', border: '1px solid rgba(0,212,255,0.2)', color: 'var(--text-primary)' }}
              placeholder="XXXX"
            />
            <button onClick={joinLobby} disabled={connecting || joinCode.length !== 4 || !nickname.trim() || !sid}
              className="px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-40"
              style={{ background: 'var(--accent-cyan)', color: '#0a1628' }}>
              {tp('Войти', 'Join', 'Dolacz')}
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
            'При обрыве связи твоё место сохраняется на 20 секунд. Управляй стрелками или кнопками поворота.',
            "Your place is held for 20 seconds if you disconnect. Steer with the arrow keys or turn buttons.",
            'Po rozłączeniu miejsce czeka 20 sekund. Steruj strzałkami lub przyciskami skrętu.',
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
            ← {tp('Выйти', 'Leave', 'Wyjdz')}
          </button>
          <span className="text-[10px] px-2 py-0.5 rounded" style={{ background: 'rgba(0,212,255,0.15)', color: 'var(--accent-cyan)' }}>
            {iAmHost ? tp('Ты хост', 'You are host', 'Jestes hostem') : tp('Игрок', 'Player', 'Gracz')}
          </span>
        </div>
        <div className="card p-5 text-center mb-4" style={{ background: 'rgba(0, 212, 255, 0.04)', borderColor: 'rgba(0, 212, 255, 0.3)' }}>
          <div className="text-xs text-[var(--text-muted)] mb-1">{tp('КОД ЛОББИ', 'LOBBY CODE', 'KOD LOBBY')}</div>
          <div className="text-5xl font-bold font-mono tracking-[0.2em]" style={{ color: 'var(--accent-cyan)' }}>
            {room.code}
          </div>
          <button onClick={async () => { try { await navigator.clipboard.writeText(shareUrl); setLinkCopied(true); } catch { setError(shareUrl); } }}
            className="text-[11px] text-[var(--text-muted)] hover:text-[var(--accent-cyan)] mt-2">
            {linkCopied ? tp("Ссылка скопирована", "Link copied", "Link skopiowany", { es: "Enlace copiado", fr: "Lien copié", de: "Link kopiert", it: "Link copiato" }) : tp('Копировать ссылку', 'Copy link', 'Kopiuj link')}
          </button>
        </div>

        <p className="mb-4 text-sm text-[var(--text-secondary)]">
          {activeMission ? tp(activeMission.descRu, activeMission.descEn, activeMission.descPl) : tp("Обычная регата: старт, знак слева, финиш.", "Standard race: start, leave the mark to port, finish.", "Zwykła regata: start, znak lewą burtą, meta.", { es: "Regata: salida, boya por babor y llegada.", fr: "Régate : départ, marque à bâbord, arrivée.", de: "Regatta: Start, Marke an Backbord, Ziel.", it: "Regata: partenza, boa a sinistra, arrivo." })}
        </p>
        {iAmHost && (
          <details className="mb-4 border-y border-[var(--border-subtle)]">
            <summary className="cursor-pointer py-3 text-sm text-[var(--text-secondary)]">
              {tp("Условия гонки", "Race settings", "Ustawienia regaty", { es: "Opciones de regata", fr: "Réglages de course", de: "Renneinstellungen", it: "Impostazioni regata" })}
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
                🏁 {tp('Свободная', 'Free', 'Swobodna')}
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
                  title={tp(m.descRu, m.descEn, m.descPl)}
                >
                  {m.emoji} {tp(m.titleRu, m.titleEn, m.titlePl)}
                </button>
              ))}
            </div>
            {activeMission && (
              <div className="mt-2 text-[10px] text-[var(--text-secondary)]">
                💡 {tp(activeMission.hintRu, activeMission.hintEn, activeMission.hintPl)}
              </div>
            )}
          </details>
        )}

        <div className="card p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs text-[var(--text-muted)]">{tp('ИГРОКИ', 'PLAYERS', 'GRACZE')} · {totalCount} / {room.maxPlayers}</div>
            {iAmHost && (
              <div className="flex gap-1">
                <button onClick={removeBot} disabled={botCount === 0}
                  aria-label={tp('Убрать бота', 'Remove bot', 'Usun bota')}
                  className="text-xs px-3 rounded disabled:opacity-30 min-h-[40px] min-w-[44px]"
                  style={{ border: '1px solid rgba(139, 167, 184, 0.3)' }}>- {tp('бот', 'bot', 'bot')}</button>
                <button onClick={addBot} disabled={totalCount >= room.maxPlayers}
                  aria-label={tp('Добавить бота', 'Add bot', 'Dodaj bota')}
                  className="text-xs px-3 rounded disabled:opacity-30 min-h-[40px] min-w-[44px]"
                  style={{ border: '1px solid rgba(0, 212, 255, 0.35)', color: 'var(--accent-cyan)' }}>+ {tp('бот', 'bot', 'bot')}</button>
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
                  {!p.connected && !p.isBot && <span className="text-[9px] text-[var(--warning)] ml-2">{tp('разрыв', 'disconnected', 'rozlaczony')}</span>}
                </span>
                {p.id === room.hostId && <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(255,170,0,0.15)', color: 'var(--warning)' }}>{tp('хост', 'host', 'host')}</span>}
                {!p.isBot && p.id !== room.hostId && <span className="text-xs text-[var(--text-secondary)]">{p.ready ? tp("Готов", "Ready", "Gotowy", { es: "Listo", fr: "Prêt", de: "Bereit", it: "Pronto" }) : tp("Не готов", "Not ready", "Niegotowy", { es: "No listo", fr: "Pas prêt", de: "Nicht bereit", it: "Non pronto" })}</span>}
                {p.id === room.myId && <span className="text-[10px] text-[var(--accent-cyan)]">{tp('ты', 'you', 'ty')}</span>}
              </div>
            ))}
          </div>
          <div className="text-[10px] text-[var(--text-muted)] mt-2">
            {tp('людей', 'humans', 'ludzi')}: {humanCount} · {tp('ботов', 'bots', 'botow')}: {botCount}
          </div>
        </div>

        {iAmHost ? (
          <button onClick={startRace} disabled={totalCount < 1 || !allReady || reconnecting}
            className="w-full py-3 rounded-lg font-semibold text-base disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg, #44ff88, #22cc66)', color: '#0a1628' }}>
            {tp('Старт гонки', 'Start race', 'Rozpocznij wyscig')} · {totalCount} {
              tp(
                totalCount === 1 ? 'лодка' : 'лодок',
                totalCount === 1 ? 'boat' : 'boats',
                totalCount === 1 ? 'lodz' : 'lodzi',
              )
            }
          </button>
        ) : (
          <div className="text-center text-sm text-[var(--text-muted)] py-3">
            <button className="w-full min-h-11 rounded-lg border px-4 py-3 text-[var(--accent-cyan)]" aria-pressed={!!me?.ready} disabled={reconnecting} onClick={() => clientRef.current?.send({ type: "ready", ready: !me?.ready })}>
              {me?.ready ? tp("Готов, жду старта", "Ready, waiting for start", "Gotowy, czekam na start", { es: "Listo, esperando", fr: "Prêt, en attente", de: "Bereit, warte auf Start", it: "Pronto, in attesa" }) : tp("Я готов", "I'm ready", "Jestem gotowy", { es: "Estoy listo", fr: "Je suis prêt", de: "Ich bin bereit", it: "Sono pronto" })}
            </button>
          </div>
        )}

        {error && <p role="alert" className="mt-3 break-all text-sm text-[var(--warning)]">{error}</p>}
        {iAmHost && !allReady && <p role="status" className="mt-3 text-sm text-[var(--text-secondary)]">{tp("Ждём готовности игроков", "Waiting for players to be ready", "Czekamy na gotowość graczy", { es: "Esperando a los jugadores", fr: "En attente des joueurs", de: "Warte auf die Spieler", it: "In attesa dei giocatori" })}</p>}
        {reconnecting && (
          <div className="mt-3 text-xs text-center px-3 py-2 rounded" style={{ background: 'rgba(255, 170, 0, 0.1)', color: 'var(--warning)' }}>
            {tp('Переподключаюсь…', 'Reconnecting…', 'Lacze ponownie…')}
          </div>
        )}
      </div>
    );
  }

  // Racing / countdown / finished
  return (
    <div className="relative w-full" style={{ height: embed ? '100dvh' : 'calc(100dvh - var(--site-nav-h, 56px))' }}>
      <canvas ref={canvasRef} className="block w-full h-full" style={{ touchAction: 'none' }} />

      {phase !== "finished" && <button onClick={leaveLobby} className="absolute top-2 right-3 min-h-11 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-3 text-xs">
        {tp("Выйти", "Leave", "Wyjdź", { es: "Salir", fr: "Quitter", de: "Verlassen", it: "Esci" })}
      </button>}
      {reconnecting && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full text-xs font-semibold"
             style={{ background: 'rgba(255,170,0,0.2)', color: 'var(--warning)', backdropFilter: 'blur(8px)' }}>
          {tp('Переподключаюсь…', 'Reconnecting…', 'Lacze ponownie…')}
        </div>
      )}

      {phase === 'racing' && (
        <div className="absolute bottom-6 left-0 right-0 flex justify-between px-6 pointer-events-none">
          <button
            aria-label={tp("Поворот влево", "Turn left", "Skręt w lewo", { es: "Girar a la izquierda", fr: "Tourner à gauche", de: "Nach links steuern", it: "Virare a sinistra" })}
            onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); inputRef.current.left = true; }}
            onPointerUp={() => { inputRef.current.left = false; }}
            onPointerCancel={() => { inputRef.current.left = false; }}
            className="pointer-events-auto w-20 h-20 rounded-full text-3xl font-bold select-none"
            style={{ background: 'rgba(21,37,64,0.7)', border: '2px solid rgba(0,212,255,0.5)', color: 'var(--accent-cyan)', touchAction: 'none' }}
          >←</button>
          <button
            aria-label={tp("Поворот вправо", "Turn right", "Skręt w prawo", { es: "Girar a la derecha", fr: "Tourner à droite", de: "Nach rechts steuern", it: "Virare a destra" })}
            onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); inputRef.current.right = true; }}
            onPointerUp={() => { inputRef.current.right = false; }}
            onPointerCancel={() => { inputRef.current.right = false; }}
            className="pointer-events-auto w-20 h-20 rounded-full text-3xl font-bold select-none"
            style={{ background: 'rgba(21,37,64,0.7)', border: '2px solid rgba(0,212,255,0.5)', color: 'var(--accent-cyan)', touchAction: 'none' }}
          >→</button>
        </div>
      )}

      {phase === 'finished' && (
        <div className="absolute inset-0 flex items-center justify-center p-4 overflow-y-auto" style={{ background: 'rgba(10,22,40,0.9)', backdropFilter: 'blur(8px)' }}>
          <div className="card p-6 max-w-md w-full my-4">
            <div className="text-center mb-4">
              <div className="text-2xl font-bold mb-1">{tp('Гонка окончена', 'Race finished', 'Wyscig zakonczony')}</div>
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
                    {r.id === room?.myId && <span className="text-[10px] text-[var(--accent-cyan)] ml-2">{tp('ты', 'you', 'ty')}</span>}
                  </span>
                  <span className="font-mono text-sm text-[var(--accent-cyan)]">
                    {r.time != null ? formatTime(r.time) : 'DNF'}
                  </span>
                </div>
              ))}
            </div>
            {room?.hostId === room?.myId && <button onClick={() => clientRef.current?.send({ type: "rematch" })} className="w-full min-h-11 mb-3 rounded-lg bg-[var(--accent-cyan)] text-[var(--bg-primary)] font-semibold">{tp("Ещё гонка", "Race again", "Jeszcze jeden wyścig", { es: "Otra carrera", fr: "Nouvelle course", de: "Noch ein Rennen", it: "Altra regata" })}</button>}
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
                      ? tp('✓ Миссия пройдена', '✓ Mission passed', '✓ Misja zaliczona')
                      : tp('⚠ Миссия провалена', '⚠ Mission failed', '⚠ Misja nieudana')}
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
                {tp('В меню', 'To menu', 'Do menu')}
              </button>
              {!embed && <Link href="/leaderboard"
                className="flex-1 py-2 rounded-lg border text-sm text-center"
                style={{ borderColor: 'rgba(68,255,136,0.35)', color: 'var(--success)' }}>
                {tp('Лидерборд', 'Leaderboard', 'Ranking')}
              </Link>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function drawBoat(ctx: CanvasRenderingContext2D, x: number, y: number, heading: number, color: string, isMe: boolean) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(deg2rad(heading));
  ctx.fillStyle = isMe ? '#e8f4f8' : '#c5d4dd';
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, -12);
  ctx.quadraticCurveTo(6, 0, 4, 10);
  ctx.lineTo(-4, 10);
  ctx.quadraticCurveTo(-6, 0, 0, -12);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = isMe ? color : '#ffffff';
  ctx.beginPath();
  ctx.moveTo(0, -6); ctx.quadraticCurveTo(4, 0, 1, 6); ctx.lineTo(0, 6);
  ctx.closePath(); ctx.fill();
  ctx.restore();
  if (isMe) {
    ctx.beginPath(); ctx.arc(x, y, 16, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(0, 212, 255, 0.5)'; ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]); ctx.stroke(); ctx.setLineDash([]);
  }
}

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  const ms = Math.floor((s * 10) % 10);
  return `${m}:${sec.toString().padStart(2, '0')}.${ms}`;
}
