'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { MPClient, getWsUrl, SnapshotBuffer, type MPMessage } from '@/lib/mp-client';
import { WORLD, makeStandardCourse, deg2rad } from '@/lib/race-physics';
import { missions } from '@/data/missions';
import { useI18n } from '@/lib/i18n';

type Phase = 'menu' | 'lobby' | 'countdown' | 'racing' | 'finished' | 'error';

interface LobbyPlayer { id: string; nickname: string; ready: boolean; isBot: boolean; connected: boolean }
interface Results { id: string; nickname: string; isBot: boolean; time: number | null; mission: { passed: boolean; reasons: string[] } | null }

const COLORS = ['#00d4ff', '#ff6688', '#ffdd44', '#44ff88', '#aa88ff', '#ff8844', '#55ccee', '#ff99cc', '#c6f0a5', '#bb99ff'];

export default function MultiplayerClient() {
  const { tp } = useI18n();
  const [phase, setPhase] = useState<Phase>('menu');
  const [error, setError] = useState<string | null>(null);
  const [nickname, setNickname] = useState<string>('');
  const [joinCode, setJoinCode] = useState('');
  const [sid, setSid] = useState<string | null>(null);
  const [reconnecting, setReconnecting] = useState(false);

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

  // Load session info
  useEffect(() => {
    fetch('/api/player').then((r) => r.json()).then((d) => {
      if (d?.sid) setSid(d.sid);
      if (d?.nickname) setNickname(d.nickname);
    }).catch(() => {});
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
          ...r, code: msg.code, hostId: msg.hostId,
          missionId: msg.missionId, difficulty: msg.difficulty, windStrength: msg.windStrength,
          maxPlayers: msg.maxPlayers,
        } : null);
        setLobbyPlayers(msg.players);
        break;
      case 'phase':
        if (msg.phase === 'countdown') { setPhase('countdown'); bufferRef.current.reset(); }
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
        setError(msg.message);
        setPhase((p) => p === 'menu' ? 'error' : p);
        break;
    }
  }, []);

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
    try {
      const c = await ensureClient();
      c.send({ type: 'create', nickname: nickname.trim(), sid });
    } catch {
      setError(tp('Не удалось подключиться к серверу', 'Could not connect to server', 'Nie udalo sie polaczyc z serwerem'));
      setPhase('error');
    }
  }, [nickname, sid, ensureClient, tp]);

  const joinLobby = useCallback(async () => {
    if (!nickname.trim()) { setError(tp('Введи ник', 'Enter a nickname', 'Podaj ksywe')); return; }
    if (joinCode.length !== 4) { setError(tp('Код должен быть 4 символа', 'Code must be 4 characters', 'Kod musi miec 4 znaki')); return; }
    setError(null);
    try {
      const c = await ensureClient();
      c.send({ type: 'join', code: joinCode.toUpperCase(), nickname: nickname.trim(), sid });
      if (sid) c.rememberForResume({ code: joinCode.toUpperCase(), nickname: nickname.trim(), sid });
    } catch {
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
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    const id = setInterval(() => {
      const turn = (inputRef.current.right ? 1 : 0) - (inputRef.current.left ? 1 : 0);
      clientRef.current?.send({ type: 'input', turn });
    }, 50);
    return () => {
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
          drawBoat(ctx, screen.x, screen.y, b.h, COLORS[i % COLORS.length], isMe);
        }
      }

      // HUD wind
      ctx.fillStyle = '#ffffff';
      ctx.font = '11px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`${tp('Ветер', 'Wind', 'Wiatr')} ${Math.round(windRef.current.dir)}°  ${windRef.current.gust.toFixed(2)}×`, 10, 18);

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
  }, [phase, countdown, room]);

  // --- UI ---

  if (phase === 'menu' || phase === 'error') {
    return (
      <div className="page-enter max-w-lg mx-auto px-4 py-10">
        <Link href="/game" className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]">
          ← {tp('Одиночная гонка', 'Single race', 'Wyscig solo')}
        </Link>
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
            type="text" value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            maxLength={20}
            className="w-full px-3 py-2 rounded text-sm"
            style={{ background: 'var(--bg-secondary)', border: '1px solid rgba(0,212,255,0.2)', color: 'var(--text-primary)' }}
            placeholder={tp('Введи ник', 'Enter nickname', 'Podaj ksywe')}
          />
        </div>
        <button onClick={createLobby}
          className="w-full py-3 rounded-lg font-semibold text-sm mb-3"
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
              className="flex-1 px-3 py-2 rounded text-base font-mono text-center tracking-widest"
              style={{ background: 'var(--bg-secondary)', border: '1px solid rgba(0,212,255,0.2)', color: 'var(--text-primary)' }}
              placeholder="XXXX"
            />
            <button onClick={joinLobby} disabled={joinCode.length !== 4}
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
            'Мультиплеер BETA. Физика authoritative на сервере. Reconnect 20 сек grace.',
            'Multiplayer BETA. Physics is server-authoritative. 20 sec reconnect grace.',
            'Multiplayer BETA. Fizyka jest obliczana na serwerze. 20 sek okresu laski przy rozlaczeniu.',
          )}
        </div>
      </div>
    );
  }

  if (phase === 'lobby' && room) {
    const iAmHost = room.isHost;
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
          <button onClick={() => navigator.clipboard?.writeText(shareUrl)}
            className="text-[11px] text-[var(--text-muted)] hover:text-[var(--accent-cyan)] mt-2">
            📋 {tp('Копировать ссылку', 'Copy link', 'Kopiuj link')}
          </button>
        </div>

        {iAmHost && (
          <div className="card p-3 mb-4">
            <div className="text-xs font-semibold tracking-wider text-[var(--text-muted)] mb-2">
              {tp('РЕЖИМ (только хост)', 'MODE (host only)', 'TRYB (tylko host)')}
            </div>
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
          </div>
        )}

        <div className="card p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs text-[var(--text-muted)]">{tp('ИГРОКИ', 'PLAYERS', 'GRACZE')} · {totalCount} / {room.maxPlayers}</div>
            {iAmHost && (
              <div className="flex gap-1">
                <button onClick={removeBot} disabled={botCount === 0}
                  className="text-[10px] px-2 py-0.5 rounded disabled:opacity-30"
                  style={{ border: '1px solid rgba(139, 167, 184, 0.3)' }}>- {tp('бот', 'bot', 'bot')}</button>
                <button onClick={addBot} disabled={totalCount >= room.maxPlayers}
                  className="text-[10px] px-2 py-0.5 rounded disabled:opacity-30"
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
                {p.id === room.myId && <span className="text-[10px] text-[var(--accent-cyan)]">{tp('ты', 'you', 'ty')}</span>}
              </div>
            ))}
          </div>
          <div className="text-[10px] text-[var(--text-muted)] mt-2">
            {tp('людей', 'humans', 'ludzi')}: {humanCount} · {tp('ботов', 'bots', 'botow')}: {botCount} · {tp('сложность', 'difficulty', 'trudnosc')}: {room.difficulty} · {tp('ветер', 'wind', 'wiatr')}: {room.windStrength}
          </div>
        </div>

        {iAmHost ? (
          <button onClick={startRace} disabled={totalCount < 1}
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
            {tp('Ждём, когда хост нажмёт «Старт»…', 'Waiting for host to press Start…', 'Czekamy, az host nacisnie Start…')}
          </div>
        )}

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
    <div className="relative w-full" style={{ height: 'calc(100vh - 56px)' }}>
      <canvas ref={canvasRef} className="block w-full h-full" style={{ touchAction: 'none' }} />

      {reconnecting && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full text-xs font-semibold"
             style={{ background: 'rgba(255,170,0,0.2)', color: 'var(--warning)', backdropFilter: 'blur(8px)' }}>
          {tp('Переподключаюсь…', 'Reconnecting…', 'Lacze ponownie…')}
        </div>
      )}

      {phase === 'racing' && (
        <div className="absolute bottom-6 left-0 right-0 flex justify-between px-6 md:hidden pointer-events-none">
          <button
            onPointerDown={() => { inputRef.current.left = true; }}
            onPointerUp={() => { inputRef.current.left = false; }}
            onPointerCancel={() => { inputRef.current.left = false; }}
            className="pointer-events-auto w-20 h-20 rounded-full text-3xl font-bold select-none"
            style={{ background: 'rgba(21,37,64,0.7)', border: '2px solid rgba(0,212,255,0.5)', color: 'var(--accent-cyan)', touchAction: 'none' }}
          >←</button>
          <button
            onPointerDown={() => { inputRef.current.right = true; }}
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
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}
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
                    {mine.mission.reasons.map((r, idx) => <li key={idx}>{r}</li>)}
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
              <Link href="/leaderboard"
                className="flex-1 py-2 rounded-lg border text-sm text-center"
                style={{ borderColor: 'rgba(68,255,136,0.35)', color: 'var(--success)' }}>
                {tp('Лидерборд', 'Leaderboard', 'Ranking')}
              </Link>
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
