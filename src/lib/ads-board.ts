// In-game board creatives from the Hybrid SSP answer (GET /auction/getad). Pure,
// shared by the app (which may read Hybrid without CORS) and the 3D lab page.
// The answer is HTML for a web view: a hidden impression pixel, a view script and
// an iframe (Ad/Load) that holds the real <img>. A board needs that image and must
// fire the trackers itself, only when the board is really visible.

export interface AdsBoardAd {
  readonly adId: string;
  readonly advertiser: string | null;
  readonly width: number;
  readonly height: number;
  readonly frameUrl: string;
  readonly loadUrls: readonly string[];
  readonly impressionUrls: readonly string[];
  readonly viewUrls: readonly string[];
}
export interface AdsBoardFrame { readonly imageUrl: string; readonly clickUrl: string | null }

/** What the app sends to the page. The image travels as data: the page CSP allows no remote image. */
export type AdsBoardFeed =
  | { readonly status: "loading" | "no-fill" | "failed" }
  | { readonly status: "filled"; readonly id: string; readonly src: string; readonly width: number; readonly height: number; readonly advertiser: string | null; readonly canOpen: boolean };

export type AdsBoardAction = "ready" | "reload" | "loaded" | "viewable" | "open";
export interface AdsBoardMessage { readonly type: "ads.board"; readonly action: AdsBoardAction; readonly id?: string }

export const ADS_BOARD_EVENT = "regatta:ads-board";
/** A static creative larger than this is not a board image. */
export const ADS_BOARD_MAX_IMAGE_BYTES = 2_000_000;
const ACTIONS: readonly AdsBoardAction[] = ["ready", "reload", "loaded", "viewable", "open"];

const decode = (value: string) => value.replace(/&amp;/g, "&");

/** Every address we call or load comes from Hybrid over HTTPS; anything else is dropped. */
export function hybridUrl(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  try {
    const url = new URL(decode(raw));
    return url.protocol === "https:" && /(^|\.)hybrid\.ai$/.test(url.hostname) ? url.toString() : null;
  } catch { return null; }
}

const urls = (raw: unknown): string[] => (Array.isArray(raw) ? raw : []).map(hybridUrl).filter((url): url is string => url !== null);
const unique = (values: readonly (string | null)[]) => [...new Set(values.filter((value): value is string => value !== null))];
const inContent = (content: string, marker: string) => hybridUrl(content.match(new RegExp(`https://[^"'\\s]*${marker}[^"'\\s]*`))?.[0]);

/** The getad JSON, or null when it carries no usable board creative. */
export function parseBoardAd(json: unknown): AdsBoardAd | null {
  if (!json || typeof json !== "object") return null;
  const ad = json as { adId?: unknown; adomain?: unknown; width?: unknown; height?: unknown; content?: unknown; isPassback?: unknown; actionUrls?: Record<string, unknown> };
  if (ad.isPassback === true || typeof ad.content !== "string" || typeof ad.adId !== "string" || !ad.adId) return null;
  const width = Number(ad.width), height = Number(ad.height);
  if (!(width > 0) || !(height > 0)) return null;
  const frameUrl = hybridUrl(ad.content.match(/<iframe[^>]+src=["']([^"']+)/i)?.[1]);
  if (!frameUrl) return null;
  const advertiser = Array.isArray(ad.adomain) && typeof ad.adomain[0] === "string" ? ad.adomain[0] : null;
  return {
    adId: ad.adId, advertiser, width, height, frameUrl,
    loadUrls: urls(ad.actionUrls?.loadUrls),
    impressionUrls: unique([...urls(ad.actionUrls?.impressionUrls), inContent(ad.content, "SaveImpression2")]),
    viewUrls: unique([...urls(ad.actionUrls?.viewUrls), inContent(ad.content, "SaveView2")]),
  };
}

/** The Ad/Load document. Only a static <img> creative can go on a board; HTML5 ads answer null. */
export function parseBoardFrame(html: string): AdsBoardFrame | null {
  const imageUrl = hybridUrl(html.match(/<img[^>]+id=["']tx_img["'][^>]*>/i)?.[0].match(/src=["']([^"']+)/i)?.[1]);
  if (!imageUrl) return null;
  return { imageUrl, clickUrl: hybridUrl(html.match(/<a[^>]+href=["']([^"']+)/i)?.[1]) };
}

export function parseBoardMessage(raw: string): AdsBoardMessage | null {
  if (raw.length > 512 || !raw.startsWith("{")) return null;
  try {
    const message = JSON.parse(raw) as { type?: unknown; action?: unknown; id?: unknown };
    if (message.type !== "ads.board" || !ACTIONS.includes(message.action as AdsBoardAction)) return null;
    if (message.id !== undefined && typeof message.id !== "string") return null;
    return { type: "ads.board", action: message.action as AdsBoardAction, ...(message.id === undefined ? {} : { id: message.id }) };
  } catch { return null; }
}

/** Script the app injects into the page to hand over a feed state. */
export function boardFeedScript(feed: AdsBoardFeed): string {
  return `window.dispatchEvent(new CustomEvent(${JSON.stringify(ADS_BOARD_EVENT)},{detail:${JSON.stringify(feed)}}));true;`;
}
