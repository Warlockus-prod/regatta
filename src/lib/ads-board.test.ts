import { describe, expect, it } from "vitest";
import { boardFeedScript, hybridUrl, parseBoardAd, parseBoardFrame, parseBoardMessage } from "./ads-board";

// Shapes recorded from ssp.hybrid.ai/auction/getad on 2026-11-04, identifiers replaced.
const content = `<!DOCTYPE html><html><body>
<img height="0" width="0" style="display:none" src="https://dsa-eu.hybrid.ai/DeliverySeance/SaveImpression2?ssp=15&sid=a&r=" />
<span><iframe id="tx_frame_x" src="https://dsa-eu.hybrid.ai/Ad/Load?ssp=15&sid=a&adid=b" width="970" height="250"></iframe></span>
<script>var vu=["https://dsa-eu.hybrid.ai/DeliverySeance/SaveView2?ssp=15&sid=a&r="];</script></body></html>`;
const answer = {
  placeId: "p", adId: "ad1", adomain: ["hybridadtech.com"], width: 970, height: 250, isPassback: false, content,
  actionUrls: {
    impressionUrls: ["https://ssp.hybrid.ai/seance/Impression/s"], viewUrls: ["https://ssp.hybrid.ai/seance/View/s"],
    clickUrls: ["https://ssp.hybrid.ai/seance/Click/s"], loadUrls: ["https://dsa-eu.hybrid.ai/DeliverySeance/SaveLoadBannerEvent?a=1"],
  },
};
const frame = `<html><body><span id="tx_ad"><a href="https://ssp.hybrid.ai/seance/Click/s?redirect=x&amp;r=" target="_blank">
<img id="tx_img" src="https://content.hybrid.ai/Hybrid/E6/5B/E65B.png" width="970" height="250" alt="" /></a></span></body></html>`;

describe("Hybrid answer to board creative", () => {
  it("takes the frame, the size and both tracker sets out of the HTML answer", () => {
    expect(parseBoardAd(answer)).toEqual({
      adId: "ad1", advertiser: "hybridadtech.com", width: 970, height: 250,
      frameUrl: "https://dsa-eu.hybrid.ai/Ad/Load?ssp=15&sid=a&adid=b",
      loadUrls: ["https://dsa-eu.hybrid.ai/DeliverySeance/SaveLoadBannerEvent?a=1"],
      impressionUrls: ["https://ssp.hybrid.ai/seance/Impression/s", "https://dsa-eu.hybrid.ai/DeliverySeance/SaveImpression2?ssp=15&sid=a&r="],
      viewUrls: ["https://ssp.hybrid.ai/seance/View/s", "https://dsa-eu.hybrid.ai/DeliverySeance/SaveView2?ssp=15&sid=a&r="],
    });
  });
  it.each([
    ["no answer", null], ["a passback", { ...answer, isPassback: true }], ["no size", { ...answer, width: 0 }],
    ["no frame", { ...answer, content: "<div>html5</div>" }],
    ["a frame on another host", { ...answer, content: '<iframe src="https://evil.example/Ad/Load"></iframe>' }],
    ["plain http", { ...answer, content: '<iframe src="http://dsa-eu.hybrid.ai/Ad/Load"></iframe>' }],
  ])("refuses %s", (_name, value) => { expect(parseBoardAd(value)).toBeNull(); });
  it("drops trackers outside Hybrid instead of calling them", () => {
    const ad = parseBoardAd({ ...answer, actionUrls: { impressionUrls: ["https://evil.example/pixel", "javascript:alert(1)"], viewUrls: "x" } });
    expect(ad?.impressionUrls).toEqual(["https://dsa-eu.hybrid.ai/DeliverySeance/SaveImpression2?ssp=15&sid=a&r="]);
    expect(ad?.viewUrls).toEqual(["https://dsa-eu.hybrid.ai/DeliverySeance/SaveView2?ssp=15&sid=a&r="]);
  });
  it("reads the image and the click address, decoding the HTML ampersand", () => {
    expect(parseBoardFrame(frame)).toEqual({ imageUrl: "https://content.hybrid.ai/Hybrid/E6/5B/E65B.png", clickUrl: "https://ssp.hybrid.ai/seance/Click/s?redirect=x&r=" });
  });
  it("gives no board for an HTML5 creative or a foreign image", () => {
    expect(parseBoardFrame("<html><body><script>draw()</script></body></html>")).toBeNull();
    expect(parseBoardFrame('<img id="tx_img" src="https://evil.example/a.png">')).toBeNull();
    expect(parseBoardFrame('<img src="https://content.hybrid.ai/pixel.png">')).toBeNull();
  });
  it("accepts only HTTPS addresses on hybrid.ai", () => {
    expect(hybridUrl("https://ssp.hybrid.ai/a")).toBe("https://ssp.hybrid.ai/a");
    for (const bad of ["http://ssp.hybrid.ai/a", "https://hybrid.ai.evil.example/a", "https://nothybrid.ai/a", "tel:1", 7, null]) expect(hybridUrl(bad)).toBeNull();
  });
});

describe("Board messages", () => {
  it("reads only the known actions", () => {
    expect(parseBoardMessage('{"type":"ads.board","action":"viewable","id":"ad1"}')).toEqual({ type: "ads.board", action: "viewable", id: "ad1" });
    for (const bad of ['{"type":"ads.board","action":"click"}', '{"type":"other","action":"ready"}', '{"type":"ads.board","action":"open","id":7}', "ready", "{broken"]) expect(parseBoardMessage(bad)).toBeNull();
  });
  it("hands the feed over as one event script", () => {
    expect(boardFeedScript({ status: "no-fill" })).toBe('window.dispatchEvent(new CustomEvent("regatta:ads-board",{detail:{"status":"no-fill"}}));true;');
  });
});
