import { createBoardFeed } from "../src/ads/board-feed";

const GETAD = "https://ssp.hybrid.ai/auction/getad";
const FRAME = "https://dsa-eu.hybrid.ai/Ad/Load?sid=a";
const IMAGE = "https://content.hybrid.ai/Hybrid/E6.png";
const CLICK = "https://ssp.hybrid.ai/seance/Click/s";
const BROWSER = { url: "https://weektoregatta.com/", referrer: "", language: "en", timezoneOffset: 0, screenWidth: 390, screenHeight: 844 };
const answer = {
  adId: "ad1", adomain: ["hybridadtech.com"], width: 970, height: 250,
  content: `<img style="display:none" src="https://dsa-eu.hybrid.ai/DeliverySeance/SaveImpression2?sid=a" /><iframe src="${FRAME}"></iframe><script>var vu=["https://dsa-eu.hybrid.ai/DeliverySeance/SaveView2?sid=a"];</script>`,
  actionUrls: { impressionUrls: ["https://ssp.hybrid.ai/seance/Impression/s"], viewUrls: ["https://ssp.hybrid.ai/seance/View/s"], loadUrls: ["https://dsa-eu.hybrid.ai/DeliverySeance/SaveLoadBannerEvent?a=1"] },
};
const frameHtml = `<a href="${CLICK}"><img id="tx_img" src="${IMAGE}" /></a>`;
const reply = (status: number, body = "") => ({ status, ok: status >= 200 && status < 300, text: async () => body, headers: new Headers() }) as unknown as Response;

function setup(routes: Record<string, () => Response> = {}) {
  const calls: string[] = [];
  const fetchMock = jest.fn(async (input: RequestInfo | URL) => {
    const url = String(input); calls.push(url);
    const key = Object.keys(routes).find(prefix => url.startsWith(prefix));
    if (key) return routes[key]();
    if (url.startsWith(GETAD)) return reply(200, JSON.stringify(answer));
    if (url.startsWith(FRAME)) return reply(200, frameHtml);
    return reply(200);
  });
  const openUrl = jest.fn();
  const feed = createBoardFeed(["place1", "place2"], { fetch: fetchMock as unknown as typeof fetch, readImage: async () => "data:image/png;base64,AA", openUrl, browser: () => BROWSER });
  const scripts: string[] = [];
  const inject = (script: string) => { scripts.push(script); };
  const send = (action: string, id?: string) => feed.handle(JSON.stringify({ type: "ads.board", action, ...(id ? { id } : {}) }), inject);
  const settle = () => new Promise(resolve => setImmediate(resolve));
  const trackers = () => calls.filter(url => /seance|DeliverySeance/.test(url));
  const last = () => JSON.parse(scripts[scripts.length - 1].match(/detail:(.*)}\)\);true;$/)?.[1] ?? "null");
  return { calls, feed, scripts, inject, send, settle, trackers, last, openUrl };
}

describe("In-game board feed", () => {
  it("does nothing until the page asks", () => {
    const { calls } = setup();
    expect(calls).toEqual([]);
  });

  it("asks non-personalised, as the app's own address, and hands over the image as data", async () => {
    const t = setup();
    t.send("ready"); await t.settle();
    const request = JSON.parse(decodeURIComponent(t.calls[0].split("request=")[1]));
    expect(request).toEqual({ placeId: "place1", gdpr: 1, browser: BROWSER });
    expect(t.calls).toEqual([expect.stringContaining(GETAD), FRAME, IMAGE]); // A filled first place ends the search.
    expect(t.last()).toEqual({ status: "filled", id: "ad1", src: "data:image/png;base64,AA", width: 970, height: 250, advertiser: "hybridadtech.com", canOpen: true });
  });

  it("fires no impression tracker before the page reports a counted view", async () => {
    const t = setup();
    t.send("ready"); await t.settle();
    expect(t.trackers()).toEqual([]);
    t.send("loaded", "ad1"); await t.settle();
    expect(t.trackers()).toEqual(["https://dsa-eu.hybrid.ai/DeliverySeance/SaveLoadBannerEvent?a=1"]);
    t.send("viewable", "ad1"); await t.settle();
    expect(t.trackers()).toEqual(expect.arrayContaining([
      "https://ssp.hybrid.ai/seance/Impression/s", "https://ssp.hybrid.ai/seance/View/s",
      "https://dsa-eu.hybrid.ai/DeliverySeance/SaveImpression2?sid=a", "https://dsa-eu.hybrid.ai/DeliverySeance/SaveView2?sid=a",
    ]));
  });

  it("counts one creative once and ignores reports about another", async () => {
    const t = setup();
    t.send("ready"); await t.settle();
    t.send("viewable", "other"); await t.settle();
    expect(t.trackers()).toEqual([]);
    t.send("viewable", "ad1"); t.send("viewable", "ad1"); await t.settle();
    expect(t.trackers()).toHaveLength(4);
  });

  it("says no fill on 204, on an empty answer and on an HTML5 creative, without loading further", async () => {
    for (const routes of [{ [GETAD]: () => reply(204) }, { [GETAD]: () => reply(200, "  ") }]) {
      const t = setup(routes);
      t.send("ready"); await t.settle();
      expect(t.last()).toEqual({ status: "no-fill" }); expect(t.calls).toHaveLength(2); // Both places asked.
    }
    const html5 = setup({ [FRAME]: () => reply(200, "<script>draw()</script>") });
    html5.send("ready"); await html5.settle();
    expect(html5.last()).toEqual({ status: "no-fill" }); expect(html5.calls).toHaveLength(4);
  });

  it("falls back to the next place while the first has no ad", async () => {
    let asked = 0;
    const t = setup({ [GETAD]: () => (++asked === 1 ? reply(204) : reply(200, JSON.stringify(answer))) });
    t.send("ready"); await t.settle();
    const places = t.calls.filter(url => url.startsWith(GETAD)).map(url => JSON.parse(decodeURIComponent(url.split("request=")[1])).placeId);
    expect(places).toEqual(["place1", "place2"]);
    expect(t.last()).toMatchObject({ status: "filled", id: "ad1" });
  });

  it("reports a failure on a server error or a broken answer", async () => {
    const broken: Record<string, () => Response>[] = [{ [GETAD]: () => reply(500) }, { [GETAD]: () => reply(200, "{broken") }, { [FRAME]: () => reply(502) }];
    for (const routes of broken) {
      const t = setup(routes);
      t.send("ready"); await t.settle();
      expect(t.last()).toEqual({ status: "failed" });
    }
  });

  it("opens the advertiser once, by the click tracker, on the user's request", async () => {
    const t = setup();
    t.send("open", "ad1"); expect(t.openUrl).not.toHaveBeenCalled();
    t.send("ready"); await t.settle();
    t.send("open", "ad1"); t.send("open", "ad1");
    expect(t.openUrl).toHaveBeenCalledTimes(1); expect(t.openUrl).toHaveBeenCalledWith(CLICK);
  });

  it("drops a late answer after the screen left", async () => {
    const t = setup();
    t.send("ready"); t.feed.dispose(); await t.settle();
    expect(t.last()).toEqual({ status: "loading" });
  });

  it("leaves other messages to the screen", () => {
    const t = setup();
    expect(t.feed.handle('{"type":"native-navigate","href":"/x"}', t.inject)).toBe(false);
    expect(t.calls).toEqual([]);
  });
});
