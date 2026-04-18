'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { MPClient, getWsUrl, type MPMessage } from '@/lib/mp-client';
import { WORLD, makeStandardCourse, deg2rad } from '@/lib/race-physics';

type Phase = 'menu' | 'lobby' | 'countdown' | 'racing' | 'finished' | 'error';

interface BoatSnap { id: string; x: number; y: number; h: number; s: number; l: number; f: number | null }
interface LobbyPlayer { id: string; nickname: string; ready: boolean }

const COLORS = ['#00d4ff', '#ff6688', '#ffdd44', '#44ff88', '#aa88ff', '#ff8844'];

export default function MultiplayerClient() {
  const [phase, setPhase] = useState<Phase>('menu');
  const [error, setError] = useState<string | null>(null);
  const [nickname, setNickname] = useState<string>('');
  const [joinCode, setJoinCode] = useState('');
  const [sid, setSid] = useState<string | null>(null);

  const [room, setRoom] = useState<{ code: string; hostId: string; myId: string; isHost: boolean } | null>(null);
  const [lobbyPlayers, setLobbyPlayers] = useState<LobbyPlayer[]>([]);
  const [countdown, setCountdown] = useState(5);

  const clientRef = useRef<MPClient | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // --- Boat state with interpolation ---
  const latestRef = useRef<{ t: number; boats: BoatSnap[] }>({ t: 0, boats: [] });
  const prevRef = useRef<{ t: number; boats: BoatSnap[] }>({ t: 0, boats: [] });
  const windRef = useRef<{ dir: number; gust: number }>({ dir: 0, gust: 1 });
  const resultsRef = useRef<{ id: string; nickname: string; time: number | null }[]>([]);

  // Load nickname + sid from server
  useEffect(() => {
    fetch('/api/player').then((r) => r.json()).then((d) => {
      if (d?.sid) setSid(d.sid);
      if (d?.nickname) setNickname(d.nickname);
    }).catch(() => {});
  }, []);

  const connect = useCallback(async (): Promise<MPClient> => {
    if (clientRef.current?.isOpen) return clientRef.current;
    const c = new MPClient();
    await c.connect(getWsUrl());
    c.on((msg) => handleServerMsg(msg));
    c.onClose(() => {
      if (phase === 'racing' || phase === 'lobby') {
        setError('Соединение потеряно');
        setPhase('error');
      }
    });
    clientRef.current = c;
    return c;
  }, [phase]);

  const handleServerMsg = (msg: MPMessage) => {
    switch (msg.type) {
      case 'joined':
        setRoom({ code: msg.code, hostId: msg.id, myId: msg.id, isHost: msg.isHost });
        setPhase('lobby');
        break;
      case 'lobby-state':
        setRoom((r) => r ? { ...r, code: msg.code, hostId: msg.hostId } : null);
        setLobbyPlayers(msg.players);
        break;
      case 'phase':
        if (msg.phase === 'countdown') setPhase('countdown');
        else if (msg.phase === 'racing') setPhase('racing');
        else if (msg.phase === 'finished') setPhase('finished');
        break;
      case 'countdown':
        setCountdown(Math.max(0, Math.ceil(msg.remain)));
        break;
      case 'state':
        prevRef.current = latestRef.current;
        latestRef.current = { t: msg.t, boats: msg.boats };
        windRef.current = msg.wind;
        break;
      case 'finished':
        resultsRef.current = msg.results;
        setPhase('finished');
        break;
      case 'error':
        setError(msg.message);
        setPhase('error');
        break;
    }
  };

  const createLobby = useCallback(async () => {
    if (!nickname.trim()) { setError('Введи ник'); return; }
    setError(null);
    try {
      const c = await connect();
      c.send({ type: 'create', nickname: nickname.trim(), sid });
    } catch {
      setError('Не удалось подключиться к серверу');
      setPhase('error');
    }
  }, [nickname, sid, connect]);

  const joinLobby = useCallback(async () => {
    if (!nickname.trim()) { setError('Введи ник'); return; }
    if (joinCode.length !== 4) { setError('Код должен быть 4 символа'); return; }
    setError(null);
    try {
      const c = await connect();
      c.send({ type: 'join', code: joinCode.toUpperCase(), nickname: nickname.trim(), sid });
    } catch {
      setError('Не удалось подключиться к серверу');
      setPhase('error');
    }
  }, [nickname, joinCode, sid, connect]);

  const startRace = useCallback(() => {
    clientRef.current?.send({ type: 'start-race' });
  }, []);

  const leaveLobby = useCallback(() => {
    clientRef.current?.send({ type: 'leave' });
    clientRef.current?.close();
    clientRef.current = null;
    setRoom(null);
    setLobbyPlayers([]);
    setPhase('menu');
  }, []);

  // Player input (keyboard + touch)
  const inputRef = useRef<{ left: boolean; right: boolean }>({ left: false, right: false });
  useEffect(() => {
    if (phase !== 'racing' && phase !== 'countdown') return;
    const onDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === 'arrowleft' || k === 'a') inputRef.current.left = true;
      if (k === 'arrowright' || k === 'd') inputRef.current.right = true;
      if (['arrowleft','arrowright','a','d'].includes(k)) e.preventDefault();
    };
    const onUp = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === 'arrowleft' || k === 'a') inputRef.current.left = false;
      if (k === 'arrowright' || k === 'd') inputRef.current.right = false;
    };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    // Send input at 20Hz
    const sendId = setInterval(() => {
      const turn = (inputRef.current.right ? 1 : 0) - (inputRef.current.left ? 1 : 0);
      clientRef.current?.send({ type: 'input', turn });
    }, 50);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
      clearInterval(sendId);
    };
  }, [phase]);

  // Canvas render loop (interpolating between two latest server snapshots)
  useEffect(() => {
    if (phase !== 'racing' && phase !== 'countdown' && phase !== 'finished') return;
    const cv = canvasRef.current;
    if (!cv) return;

    const course = makeStandardCourse();
    let rafId = 0;

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

      // Bg
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#051425'); g.addColorStop(1, '#0a1f3d');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

      // Fit course into canvas (top-down world 800x1200)
      const sx = W / WORLD.width;
      const sy = H / WORLD.height;
      const s = Math.min(sx, sy);
      const ox = (W - WORLD.width * s) / 2;
      const oy = (H - WORLD.height * s) / 2;
      const toXY = (p: { x: number; y: number }) => ({ x: ox + p.x * s, y: oy + p.y * s });

      // Start/finish
      const la = toXY(course.startLine.a), lb = toXY(course.startLine.b);
      ctx.strokeStyle = '#ffaa00'; ctx.setLineDash([6, 4]); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(la.x, la.y); ctx.lineTo(lb.x, lb.y); ctx.stroke();
      ctx.setLineDash([]);

      // Windward mark
      const wm = toXY(course.marks[0].pos);
      ctx.beginPath(); ctx.arc(wm.x, wm.y, 10 * s + 6, 0, Math.PI * 2);
      ctx.fillStyle = '#ffaa00'; ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();

      // Interpolation factor
      const now = performance.now() / 1000;
      const cur = latestRef.current, prev = prevRef.current;
      const dtServer = cur.t - prev.t;
      // Target render is ~50ms behind latest (typical lag comp)
      const alpha = dtServer > 0
        ? Math.min(1, Math.max(0, (now - (now - 0.05)) / dtServer))
        : 1;

      // Boats
      const idxMap = new Map(prev.boats.map((b) => [b.id, b]));
      for (let i = 0; i < cur.boats.length; i++) {
        const b = cur.boats[i];
        const p = idxMap.get(b.id) ?? b;
        const x = p.x + (b.x - p.x) * alpha;
        const y = p.y + (b.y - p.y) * alpha;
        // Short angle interp
        let dh = b.h - p.h;
        if (dh > 180) dh -= 360; else if (dh < -180) dh += 360;
        const h = p.h + dh * alpha;
        const screen = toXY({ x, y });
        const isMe = room?.myId === b.id;
        drawBoat(ctx, screen.x, screen.y, h, COLORS[i % COLORS.length], isMe);
      }

      // HUD: wind + phase
      ctx.fillStyle = '#ffffff';
      ctx.font = '11px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`Ветер ${Math.round(windRef.current.dir)}°  ${windRef.current.gust.toFixed(2)}×`, 10, 18);

      if (phase === 'countdown') {
        ctx.fillStyle = 'rgba(10, 22, 40, 0.6)';
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#00d4ff';
        ctx.font = 'bold 72px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(countdown === 0 ? 'СТАРТ!' : String(countdown), W / 2, H / 2);
      }

      rafId = requestAnimationFrame(render);
    };
    rafId = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
    };
  }, [phase, countdown, room]);

  // --- UI ---

  if (phase === 'menu' || phase === 'error') {
    return (
      <div className="page-enter max-w-lg mx-auto px-4 py-10">
        <Link href="/game" className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]">← Одиночная гонка</Link>
        <h1 className="text-3xl font-bold mt-4 mb-2">Мультиплеер</h1>
        <p className="text-sm text-[var(--text-secondary)] mb-6">
          2-6 игроков на одной трассе. Хост создаёт лобби и делится 4-символьным кодом.
        </p>
        <div className="card p-4 mb-4">
          <label className="text-xs text-[var(--text-muted)] block mb-1">Твой ник</label>
          <input
            type="text" value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            maxLength={20}
            className="w-full px-3 py-2 rounded text-sm"
            style={{ background: 'var(--bg-secondary)', border: '1px solid rgba(0,212,255,0.2)', color: 'var(--text-primary)' }}
            placeholder="Введи ник"
          />
        </div>
        <button onClick={createLobby}
          className="w-full py-3 rounded-lg font-semibold text-sm mb-3"
          style={{ background: 'linear-gradient(135deg, var(--accent-cyan), #0099cc)', color: '#0a1628' }}>
          Создать лобби
        </button>
        <div className="card p-4 mb-3">
          <div className="text-xs text-[var(--text-muted)] mb-2">Присоединиться по коду</div>
          <div className="flex gap-2">
            <input
              type="text" value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 4))}
              maxLength={4}
              className="flex-1 px-3 py-2 rounded text-base font-mono text-center tracking-widest"
              style={{ background: 'var(--bg-secondary)', border: '1px solid rgba(0,212,255,0.2)', color: 'var(--text-primary)' }}
              placeholder="XXXX"
            />
            <button onClick={joinLobby}
              disabled={joinCode.length !== 4}
              className="px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-40"
              style={{ background: 'var(--accent-cyan)', color: '#0a1628' }}>
              Войти
            </button>
          </div>
        </div>
        {error && (
          <div className="text-sm px-3 py-2 rounded" style={{ background: 'rgba(255,68,68,0.1)', color: 'var(--danger)' }}>
            {error}
          </div>
        )}
        <div className="text-[10px] text-[var(--text-muted)] mt-6 leading-relaxed">
          Мультиплеер BETA. Физика считается на сервере (authoritative), клиент интерполирует. Защищён от читов.
        </div>
      </div>
    );
  }

  if (phase === 'lobby' && room) {
    const iAmHost = room.isHost;
    const shareUrl = typeof window !== 'undefined'
      ? `${window.location.origin}/multiplayer?code=${room.code}`
      : '';
    return (
      <div className="page-enter max-w-lg mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-4">
          <button onClick={leaveLobby} className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]">← Выйти</button>
          <span className="text-[10px] px-2 py-0.5 rounded" style={{ background: 'rgba(0,212,255,0.15)', color: 'var(--accent-cyan)' }}>
            {iAmHost ? 'Ты хост' : 'Игрок'}
          </span>
        </div>
        <div className="card p-5 text-center mb-4" style={{ background: 'rgba(0, 212, 255, 0.04)', borderColor: 'rgba(0, 212, 255, 0.3)' }}>
          <div className="text-xs text-[var(--text-muted)] mb-1">КОД ЛОББИ</div>
          <div className="text-5xl font-bold font-mono tracking-[0.2em]" style={{ color: 'var(--accent-cyan)' }}>
            {room.code}
          </div>
          <button onClick={() => navigator.clipboard?.writeText(shareUrl)}
            className="text-[11px] text-[var(--text-muted)] hover:text-[var(--accent-cyan)] mt-2">
            📋 Копировать ссылку
          </button>
        </div>

        <div className="card p-4 mb-4">
          <div className="text-xs text-[var(--text-muted)] mb-2">ИГРОКИ · {lobbyPlayers.length} / 6</div>
          <div className="space-y-1.5">
            {lobbyPlayers.map((p, i) => (
              <div key={p.id} className="flex items-center gap-2 text-sm">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                <span className="flex-1 text-[var(--text-primary)]">{p.nickname}</span>
                {p.id === room.hostId && <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(255,170,0,0.15)', color: 'var(--warning)' }}>хост</span>}
                {p.id === room.myId && <span className="text-[10px] text-[var(--accent-cyan)]">ты</span>}
              </div>
            ))}
          </div>
        </div>

        {iAmHost ? (
          <button onClick={startRace}
            disabled={lobbyPlayers.length < 1}
            className="w-full py-3 rounded-lg font-semibold text-base disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg, #44ff88, #22cc66)', color: '#0a1628' }}>
            Старт гонки ({lobbyPlayers.length} {lobbyPlayers.length === 1 ? 'игрок' : 'игроков'})
          </button>
        ) : (
          <div className="text-center text-sm text-[var(--text-muted)] py-3">
            Ждём, когда хост нажмёт «Старт»…
          </div>
        )}
      </div>
    );
  }

  // Racing / countdown / finished
  return (
    <div className="relative w-full" style={{ height: 'calc(100vh - 56px)' }}>
      <canvas ref={canvasRef} className="block w-full h-full" style={{ touchAction: 'none' }} />

      {/* Mobile controls */}
      {phase === 'racing' && (
        <div className="absolute bottom-6 left-0 right-0 flex justify-between px-6 md:hidden pointer-events-none">
          <button
            onTouchStart={() => { inputRef.current.left = true; }}
            onTouchEnd={() => { inputRef.current.left = false; }}
            className="pointer-events-auto w-20 h-20 rounded-full text-3xl font-bold"
            style={{ background: 'rgba(21,37,64,0.7)', border: '2px solid rgba(0,212,255,0.5)', color: 'var(--accent-cyan)' }}
          >←</button>
          <button
            onTouchStart={() => { inputRef.current.right = true; }}
            onTouchEnd={() => { inputRef.current.right = false; }}
            className="pointer-events-auto w-20 h-20 rounded-full text-3xl font-bold"
            style={{ background: 'rgba(21,37,64,0.7)', border: '2px solid rgba(0,212,255,0.5)', color: 'var(--accent-cyan)' }}
          >→</button>
        </div>
      )}

      {/* Finished overlay */}
      {phase === 'finished' && (
        <div className="absolute inset-0 flex items-center justify-center p-4" style={{ background: 'rgba(10,22,40,0.9)', backdropFilter: 'blur(8px)' }}>
          <div className="card p-6 max-w-md w-full">
            <div className="text-center mb-4">
              <div className="text-2xl font-bold mb-1">Гонка окончена</div>
              <div className="text-xs text-[var(--text-muted)]">{room?.code}</div>
            </div>
            <div className="space-y-1 mb-5">
              {resultsRef.current.map((r, i) => (
                <div key={r.id} className="flex items-center justify-between py-1.5 px-2 rounded"
                     style={{ background: r.id === room?.myId ? 'rgba(0,212,255,0.1)' : 'transparent' }}>
                  <span className="text-sm">
                    <span className="font-mono text-xs text-[var(--text-muted)] mr-2">{i + 1}.</span>
                    {r.nickname}
                    {r.id === room?.myId && <span className="text-[10px] text-[var(--accent-cyan)] ml-2">ты</span>}
                  </span>
                  <span className="font-mono text-sm text-[var(--accent-cyan)]">
                    {r.time != null ? formatTime(r.time) : 'DNF'}
                  </span>
                </div>
              ))}
            </div>
            <button onClick={leaveLobby}
              className="w-full py-2 rounded-lg border text-sm"
              style={{ borderColor: 'rgba(0,212,255,0.3)', color: 'var(--accent-cyan)' }}>
              В меню
            </button>
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
  // hull
  ctx.fillStyle = isMe ? '#e8f4f8' : '#c5d4dd';
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, -12);
  ctx.quadraticCurveTo(6, 0, 4, 10);
  ctx.lineTo(-4, 10);
  ctx.quadraticCurveTo(-6, 0, 0, -12);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // sail
  ctx.fillStyle = isMe ? color : '#ffffff';
  ctx.beginPath();
  ctx.moveTo(0, -6);
  ctx.quadraticCurveTo(4, 0, 1, 6);
  ctx.lineTo(0, 6);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // "me" ring
  if (isMe) {
    ctx.beginPath();
    ctx.arc(x, y, 16, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(0, 212, 255, 0.5)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  const ms = Math.floor((s * 10) % 10);
  return `${m}:${sec.toString().padStart(2, '0')}.${ms}`;
}
