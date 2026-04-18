/**
 * Multiplayer WebSocket client for the race server.
 * Thin wrapper around WS with a typed message bus.
 */

export type MPMessage =
  | { type: 'joined'; code: string; id: string; isHost: boolean }
  | { type: 'lobby-state'; code: string; hostId: string; phase: string;
      players: { id: string; nickname: string; ready: boolean }[] }
  | { type: 'phase'; phase: 'lobby' | 'countdown' | 'racing' | 'finished'; seed?: number }
  | { type: 'countdown'; remain: number }
  | { type: 'state'; t: number;
      wind: { dir: number; gust: number };
      boats: { id: string; x: number; y: number; h: number; s: number; l: number; f: number | null }[];
      events: { id: string; type: string; t: number }[] }
  | { type: 'finished'; results: { id: string; nickname: string; time: number | null }[] }
  | { type: 'error'; message: string };

export class MPClient {
  private ws: WebSocket | null = null;
  private listeners = new Set<(msg: MPMessage) => void>();
  private openListeners = new Set<() => void>();
  private closeListeners = new Set<() => void>();

  connect(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(url);
      this.ws.onopen = () => {
        this.openListeners.forEach((l) => l());
        resolve();
      };
      this.ws.onerror = () => reject(new Error('WebSocket error'));
      this.ws.onclose = () => {
        this.closeListeners.forEach((l) => l());
      };
      this.ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data) as MPMessage;
          this.listeners.forEach((l) => l(msg));
        } catch { /* ignore malformed */ }
      };
    });
  }

  on(listener: (msg: MPMessage) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  onOpen(l: () => void): () => void {
    this.openListeners.add(l);
    return () => this.openListeners.delete(l);
  }

  onClose(l: () => void): () => void {
    this.closeListeners.add(l);
    return () => this.closeListeners.delete(l);
  }

  send(msg: Record<string, unknown>) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  close() {
    this.ws?.close();
    this.ws = null;
    this.listeners.clear();
    this.openListeners.clear();
    this.closeListeners.clear();
  }

  get isOpen(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

/**
 * Get the WS server URL relative to the current page.
 * In prod: wss://regatta.icoffio.com/ws  (nginx proxy to ws-server:3001)
 * Local dev: override with NEXT_PUBLIC_WS_URL=ws://localhost:3001
 */
export function getWsUrl(): string {
  const override = process.env.NEXT_PUBLIC_WS_URL;
  if (override) return override;
  if (typeof window === 'undefined') return '';
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${proto}//${window.location.host}/ws`;
}
