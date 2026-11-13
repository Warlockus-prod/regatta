import { boardFeedScript, hybridUrl, parseBoardAd, parseBoardFrame, parseBoardMessage, ADS_BOARD_MAX_IMAGE_BYTES, type AdsBoardAd, type AdsBoardFeed } from "../../../src/lib/ads-board";
import { VOX_APP_BUNDLE_ID, VOX_ENDPOINT } from "./vox-placements";

/**
 * Feeds the in-game board of the 3D lab. The page has a CSP without remote images
 * and cannot read Hybrid across origins, so the app does the network part: it asks
 * the SSP (the same GET and gdpr=1 as VOX SDK 1), takes the image out of the HTML
 * answer and hands it over as data. Hybrid's trackers fire from here and only on
 * the page's report: load once the board shows the image, impression and view once
 * the view is counted. Nothing runs before the page says it is ready.
 */
export interface BoardFeedDeps {
  fetch: typeof fetch;
  /** Reads a downloaded image as a data: URL; null when it is not a usable image. */
  readImage: (response: Response) => Promise<string | null>;
  openUrl: (url: string) => unknown;
  /**
   * The app's identity (VOX_APP_PAGE_URL) and the screen. Without browser.url Hybrid
   * records the fallback page https://icoffio.com/ (PageSource 5), as if the app were
   * that website; with it the request counts as Domain com.icoffio.regatta, PageSource 1
   * (measured 2026-11-06), and that is the domain a campaign must whitelist.
   */
  browser: () => BoardBrowser;
}
export interface BoardBrowser { url: string; referrer: string; language: string; timezoneOffset: number; screenWidth: number; screenHeight: number }

const REQUEST_TIMEOUT_MS = 8000;
const IMAGE_TYPE = /^image\/(png|jpeg|webp)\b/i;

/** expo's fetch has no arrayBuffer in every runtime: Blob and FileReader work on both. */
export async function readImageAsDataUrl(response: Response): Promise<string | null> {
  if (!IMAGE_TYPE.test(response.headers.get("content-type") ?? "")) return null;
  const blob = await response.blob();
  if (blob.size <= 0 || blob.size > ADS_BOARD_MAX_IMAGE_BYTES) return null;
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : null);
    reader.onerror = () => reject(reader.error ?? new Error("image read failed"));
    reader.readAsDataURL(blob);
  });
}

/** `placeIds` in order of preference: the next one is asked only when one has no image ad. */
export function createBoardFeed(placeIds: readonly string[], deps: BoardFeedDeps) {
  let request = 0;
  let current: { ad: AdsBoardAd; clickUrl: string | null; loaded: boolean; viewed: boolean; opened: boolean } | null = null;

  const get = async (url: string, headers?: Record<string, string>) => {
    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort(), REQUEST_TIMEOUT_MS);
    try { return await deps.fetch(url, { headers, signal: abort.signal }); } finally { clearTimeout(timer); }
  };
  const fire = (urls: readonly string[]) => { for (const url of urls) void get(url).catch(() => undefined); };

  async function load(): Promise<AdsBoardFeed> {
    let feed: AdsBoardFeed = { status: "no-fill" };
    for (const placeId of placeIds) {
      feed = await loadPlace(placeId);
      if (feed.status !== "no-fill") break;
    }
    return feed;
  }

  async function loadPlace(placeId: string): Promise<AdsBoardFeed> {
    // sdkInfo carries the app id and nothing else, as VOX SDK 1.3.0 will. Hybrid ignores it
    // today, and it costs no ad: the same ad with and without it, 3 of 3 (measured 2026-11-06).
    const query = encodeURIComponent(JSON.stringify({ placeId, gdpr: 1, browser: deps.browser(), sdkInfo: { applicationId: VOX_APP_BUNDLE_ID } }));
    const answer = await get(`${VOX_ENDPOINT}?request=${query}`, { "User-Agent": "iOS SDK" });
    if (answer.status === 204) return { status: "no-fill" };
    if (!answer.ok) return { status: "failed" };
    const text = await answer.text();
    if (!text.trim()) return { status: "no-fill" };
    const ad = parseBoardAd(JSON.parse(text));
    if (!ad) return { status: "no-fill" };
    const frameAnswer = await get(ad.frameUrl);
    if (!frameAnswer.ok) return { status: "failed" };
    const frame = parseBoardFrame(await frameAnswer.text());
    if (!frame) return { status: "no-fill" }; // An HTML5 creative cannot go on a board.
    const image = await get(frame.imageUrl);
    if (!image.ok) return { status: "failed" };
    const src = await deps.readImage(image);
    if (!src) return { status: "no-fill" };
    current = { ad, clickUrl: frame.clickUrl, loaded: false, viewed: false, opened: false };
    return { status: "filled", id: ad.adId, src, width: ad.width, height: ad.height, advertiser: ad.advertiser, canOpen: Boolean(frame.clickUrl) };
  }

  async function refresh(inject: (script: string) => void) {
    const mine = ++request;
    current = null;
    inject(boardFeedScript({ status: "loading" }));
    let feed: AdsBoardFeed;
    try { feed = await load(); } catch { feed = { status: "failed" }; }
    if (mine === request) inject(boardFeedScript(feed));
  }

  return {
    /** True when the message was the board's. */
    handle(raw: string, inject: (script: string) => void): boolean {
      const message = parseBoardMessage(raw);
      if (!message) return false;
      if (message.action === "ready" || message.action === "reload") { void refresh(inject); return true; }
      if (!current || message.id !== current.ad.adId) return true;
      if (message.action === "loaded" && !current.loaded) { current.loaded = true; fire(current.ad.loadUrls); }
      if (message.action === "viewable" && !current.viewed) { current.viewed = true; fire([...current.ad.impressionUrls, ...current.ad.viewUrls]); }
      if (message.action === "open" && !current.opened && current.clickUrl) {
        const url = hybridUrl(current.clickUrl);
        if (url) { current.opened = true; deps.openUrl(url); }
      }
      return true;
    },
    /** The screen left: a late answer no longer reaches the page. */
    dispose() { request += 1; current = null; },
  };
}
