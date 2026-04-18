/**
 * Multiplayer WebSocket client with auto-reconnect + typed message bus.
 */

export type MPMessage =
  | { type: 'joined'; code: string; id: string; isHost: boolean }
  | { type: 'lobby-state'; code: string; hostId: string; phase: string;
      missionId: string | null;
      difficulty: string; windStrength: string;
      maxPlayers: number;
      players: { id: string; nickname: string; ready: boolean; isBot: boolean; connected: boolean }[] }
  | { type: 'phase'; phase: 'lobby' | 'countdown' | 'racing' | 'finished'; seed?: number }
  | { type: 'countdown'; remain: number }
  | { type: 'state'; t: number;
      wind: { dir: number; gust: number };
      boats: { id: string; x: number; y: number; h: number; s: number; l: number; f: number | null }[];
      events: { id: string; type: string; t: number }[] }
  | { type: 'finished'; results: {
        id: string; nickname: string; isBot: boolean; time: number | null;
        mission: { passed: boolean; reasons: string[] } | null;
      }[] }
  | { type: 'error'; message: string };

interface ResumePayload {
  code: string;
  nickname: string;
  sid: string;
}

const RECONNECT_DELAYS = [500, 1000, 2000, 4000, 8000];  // ms

export class MPClient {
  private ws: WebSocket | null = null;
  private url: string | null = null;
  private listeners = new Set<(msg: MPMessage) => void>();
  private openListeners = new Set<() => void>();
  private closeListeners = new Set<(wasReconnect: boolean) => void>();
  private intentionalClose = false;
  private resumeInfo: ResumePayload | null = null;
  private reconnectAttempt = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  connect(url: string): Promise<void> {
    this.url = url;
    this.intentionalClose = false;
    return this.openSocket();
  }

  private openSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.url) return reject(new Error('no url'));
      this.ws = new WebSocket(this.url);
      this.ws.onopen = () => {
        this.reconnectAttempt = 0;
        if (this.resumeInfo) {
          // Auto-resume after reconnect
          this.send({
            type: 'join',
            code: this.resumeInfo.code,
            nickname: this.resumeInfo.nickname,
            sid: this.resumeInfo.sid,
          });
        }
        this.openListeners.forEach((l) => l());
        resolve();
      };
      this.ws.onerror = () => reject(new Error('WebSocket error'));
      this.ws.onclose = () => {
        const wasReconnect = !!this.resumeInfo && !this.intentionalClose;
        this.closeListeners.forEach((l) => l(wasReconnect));
        if (!this.intentionalClose && this.resumeInfo) this.scheduleReconnect();
      };
      this.ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data) as MPMessage;
          this.listeners.forEach((l) => l(msg));
        } catch { /* ignore malformed */ }
      };
    });
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    const delay = RECONNECT_DELAYS[Math.min(this.reconnectAttempt, RECONNECT_DELAYS.length - 1)];
    this.reconnectAttempt++;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.openSocket().catch(() => this.scheduleReconnect());
    }, delay);
  }

  /** Remember info so we can auto-rejoin the same room on reconnect. */
  rememberForResume(info: ResumePayload) {
    this.resumeInfo = info;
  }

  on(listener: (msg: MPMessage) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  onOpen(l: () => void) { this.openListeners.add(l); return () => this.openListeners.delete(l); }
  onClose(l: (wasReconnect: boolean) => void) { this.closeListeners.add(l); return () => this.closeListeners.delete(l); }

  send(msg: Record<string, unknown>) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  close() {
    this.intentionalClose = true;
    if (this.reconnectTimer) { clearTimeout(this.reconnectTimer); this.reconnectTimer = null; }
    this.ws?.close();
    this.ws = null;
    this.listeners.clear();
    this.openListeners.clear();
    this.closeListeners.clear();
    this.resumeInfo = null;
    this.reconnectAttempt = 0;
  }

  get isOpen(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

export function getWsUrl(): string {
  const override = process.env.NEXT_PUBLIC_WS_URL;
  if (override) return override;
  if (typeof window === 'undefined') return '';
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${proto}//${window.location.host}/ws`;
}

// ============================================================================
// SnapshotBuffer - smooth interpolation with render-delay
// ============================================================================

export interface Snapshot {
  t: number;            // race-relative seconds
  recvAt: number;       // performance.now() when received
  boats: { id: string; x: number; y: number; h: number; s: number; l: number; f: number | null }[];
  wind: { dir: number; gust: number };
}

/**
 * Buffer of server snapshots + helper to render 100 ms behind the latest.
 * Smooths out jitter from variable RTT and dropped packets.
 */
export class SnapshotBuffer {
  private snaps: Snapshot[] = [];
  /** Render delay (ms) - we display what the server sent this many ms ago. */
  readonly RENDER_DELAY_MS = 100;
  readonly MAX_SIZE = 12;

  push(snap: Omit<Snapshot, 'recvAt'>) {
    this.snaps.push({ ...snap, recvAt: performance.now() });
    if (this.snaps.length > this.MAX_SIZE) this.snaps.shift();
  }

  /** Return interpolated boat positions at "now - RENDER_DELAY". */
  sample(): Snapshot | null {
    if (this.snaps.length === 0) return null;
    if (this.snaps.length === 1) return this.snaps[0];

    const targetRecv = performance.now() - this.RENDER_DELAY_MS;
    // Find two snapshots around targetRecv
    let prev: Snapshot | null = null;
    let next: Snapshot | null = null;
    for (let i = this.snaps.length - 1; i >= 0; i--) {
      if (this.snaps[i].recvAt <= targetRecv) { prev = this.snaps[i]; next = this.snaps[i + 1] ?? null; break; }
    }
    if (!prev) prev = this.snaps[0];
    if (!next) return prev;

    const span = next.recvAt - prev.recvAt;
    const alpha = span > 0 ? Math.min(1, Math.max(0, (targetRecv - prev.recvAt) / span)) : 1;

    const interpBoats = next.boats.map((nb) => {
      const pb = prev!.boats.find((b) => b.id === nb.id);
      if (!pb) return nb;
      let dh = nb.h - pb.h;
      if (dh > 180) dh -= 360;
      else if (dh < -180) dh += 360;
      return {
        id: nb.id,
        x: pb.x + (nb.x - pb.x) * alpha,
        y: pb.y + (nb.y - pb.y) * alpha,
        h: pb.h + dh * alpha,
        s: pb.s + (nb.s - pb.s) * alpha,
        l: nb.l,
        f: nb.f,
      };
    });

    return {
      t: prev.t + (next.t - prev.t) * alpha,
      recvAt: targetRecv,
      boats: interpBoats,
      wind: {
        dir: prev.wind.dir + (next.wind.dir - prev.wind.dir) * alpha,
        gust: prev.wind.gust + (next.wind.gust - prev.wind.gust) * alpha,
      },
    };
  }

  reset() { this.snaps = []; }
}
