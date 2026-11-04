'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { VENUES } from "../../data/venues/venues";
import { ADS_CAMERAS, ADS_FOVS, ADS_PLACEMENTS, ADS_SCENES, appendAdsPreview, type AdsCamera, type AdsFov, type AdsPlacement, type AdsPreviewAction, type AdsPreviewEvent, type AdsScene } from "../../lib/ads-preview";
import { recordWebDiagnostic } from "../../lib/diagnostics-web";
import { RegattaScene } from "../simulator-3d/RegattaScene";
import { NEUTRAL_YACHT } from "../simulator-3d/types";
import { AdsCameraRig } from "./AdsCameraRig";
import { TestPlacements } from "./TestPlacements";
import { BoardMeter } from "./BoardMeter";
import { boardSize } from "./board-viewability";
import { FloatingBoard, type BoardCreative, type BoardReading } from "./FloatingBoard";
import { ADS_BOARD_EVENT, type AdsBoardAction, type AdsBoardFeed } from "../../lib/ads-board";
import { adsCopy } from "../../lib/ads-copy";
import type { AdsCameraCommand, AdsCameraDirection } from "./camera";
import styles from "./AdsLab.module.css";

const BOARD_AREAS = [128, 288] as const;
const postToApp = (action: AdsBoardAction, id?: string) => {
  const host = (window as Window & { ReactNativeWebView?: { postMessage(message: string): void } }).ReactNativeWebView;
  host?.postMessage(JSON.stringify({ type: "ads.board", action, ...(id ? { id } : {}) }));
  return Boolean(host);
};

export default function AdsLab() {
  const { lang } = useI18n();
  const [scene, setScene] = useState<AdsScene>("gocek");
  const [view, setView] = useState<AdsCamera>("race");
  const [fov, setFov] = useState<AdsFov>(60);
  const [reset, setReset] = useState(0);
  const [command, setCommand] = useState<AdsCameraCommand | null>(null);
  const [visible, setVisible] = useState<Record<AdsPlacement, boolean>>({ "floating-board": true, "port-board": false, "bow-board": false, "stern-board": false });
  const [expanded, setExpanded] = useState(false);
  const [area, setArea] = useState<number>(BOARD_AREAS[0]);
  const [feed, setFeed] = useState<AdsBoardFeed | null>(null);
  const [counted, setCounted] = useState(0);
  const meter = useRef<((reading: BoardReading) => void) | null>(null);
  const [events, setEvents] = useState<readonly AdsPreviewEvent[]>([]);
  const [sceneReady, setSceneReady] = useState(false);
  const state = useRef({ scene, camera: view, fov });
  useLayoutEffect(() => { state.current = { scene, camera: view, fov }; }, [scene, view, fov]);
  const alive = useRef(false);
  const opened = useRef(false);
  const yacht = useRef({ ...NEUTRAL_YACHT, heading: 90, mainHoisted: true });
  const emit = useCallback((action: AdsPreviewAction, patch: Partial<Pick<AdsPreviewEvent, "scene" | "camera" | "fov" | "placement">> = {}, outcome: "accepted" | "noop" = "accepted") => {
    if (!alive.current) return;
    const event = { ...state.current, ...patch, action, outcome };
    setEvents(previous => appendAdsPreview(previous, event));
    recordWebDiagnostic({ type: "ads.preview", surface: "ads", ...(action === "open" ? { source: "system" as const } : {}), ...event });
  }, []);
  useEffect(() => {
    alive.current = true;
    if (!opened.current) { opened.current = true; emit("open"); }
    return () => { alive.current = false; };
  }, [emit]);
  useEffect(() => {
    const receive = (event: Event) => setFeed((event as CustomEvent<AdsBoardFeed>).detail);
    window.addEventListener(ADS_BOARD_EVENT, receive);
    postToApp("ready");
    return () => window.removeEventListener(ADS_BOARD_EVENT, receive);
  }, []);
  const creative = useMemo<BoardCreative | null>(() => feed?.status === "filled" ? { id: feed.id, src: feed.src, width: feed.width, height: feed.height } : null, [feed]);
  const onReading = useCallback((reading: BoardReading) => meter.current?.(reading), []);
  const onImageReady = useCallback((id: string) => { postToApp("loaded", id); }, []);
  const onCounted = useCallback((id: string) => { setCounted(value => value + 1); postToApp("viewable", id); }, []);
  const rotate = (direction: AdsCameraDirection) => setCommand(previous => ({ seq: (previous?.seq ?? 0) + 1, direction }));
  const onOrbit = useCallback((outcome: "accepted" | "noop") => emit("orbit", {}, outcome), [emit]);
  const ready = useCallback(() => setSceneReady(true), []);
  const failed = useCallback(() => setSceneReady(false), []);
  const feedText = !feed ? adsCopy.feedLocal[lang] : feed.status === "loading" ? adsCopy.feedLoading[lang] : feed.status === "filled" ? adsCopy.feedFilled[lang] : feed.status === "no-fill" ? adsCopy.feedNoFill[lang] : adsCopy.feedFailed[lang];
  const shape = feed?.status === "filled" ? feed.width / feed.height : 2;
  return <main className={styles.lab} data-expanded={expanded}>
    <section className={styles.scene} aria-label={adsCopy.settingsHint[lang]}>
      {visible["floating-board"] ? <BoardMeter lang={lang} channelRef={meter} /> : null}
      <button type="button" className={styles.expand} aria-pressed={expanded} onClick={() => setExpanded(value => !value)}>{expanded ? adsCopy.collapse[lang] : adsCopy.expand[lang]}</button>
      <RegattaScene stateRef={yacht} venue={VENUES.find(value => value.id === scene)} maxDpr={1.5} showFlow={false}
        loadingLabel={adsCopy.loading[lang]} sceneLabel={adsCopy.settingsHint[lang]} errorLabel={adsCopy.error[lang]} retryLabel={adsCopy.retry[lang]} onReady={ready} onError={failed}
        cameraRig={<AdsCameraRig view={view} fov={fov} reset={reset} command={command} onOrbit={onOrbit} />}>
        <TestPlacements visible={visible} />
        {visible["floating-board"] ? <FloatingBoard creative={creative} area={area} onReading={onReading} onImageReady={onImageReady} onCounted={onCounted} /> : null}
      </RegattaScene>
    </section>
    <aside className={styles.dock} aria-label="Ads">
      <header><h1>Ads</h1><p>{adsCopy.intro[lang]}</p></header>
      <section className={styles.sdk} data-testid="board-feed"><strong>{adsCopy.sdk[lang]}</strong><p className={styles.feedStatus}>{feedText}{feed?.status === "filled" && feed.advertiser ? `: ${feed.advertiser}` : ""}. {counted > 0 ? `${adsCopy.counted[lang]}: ${counted}.` : adsCopy.notCounted[lang] + "."}</p><p>{adsCopy.sdkHelp[lang]}</p>
        <div className={styles.adActions}>
          <button type="button" className={styles.button} disabled={feed === null || feed.status === "loading"} onClick={() => postToApp("reload")}>{adsCopy.newAd[lang]}</button>
          {feed?.status === "filled" && feed.canOpen ? <button type="button" className={styles.button} onClick={() => postToApp("open", feed.id)}>{adsCopy.openAd[lang]}</button> : null}
        </div></section>
      <section><h2>{adsCopy.boardArea[lang]}</h2><div className={styles.row}>{BOARD_AREAS.map(value => { const size = boardSize(shape, value); return <button type="button" className={styles.button} aria-pressed={area === value} key={value} onClick={() => setArea(value)}>{Math.round(size.width)} x {Math.round(size.height)} {adsCopy.metres[lang]}</button>; })}</div></section>
      <section><h2>{adsCopy.scene[lang]}</h2><div className={styles.row}>{ADS_SCENES.map(id => <button type="button" className={styles.button} aria-pressed={scene === id} key={id} onClick={() => { setScene(id); emit("scene", { scene: id }); }}>{adsCopy[id][lang]}</button>)}</div></section>
      <section><h2>{adsCopy.camera[lang]}</h2><div className={`${styles.row} ${styles.cameras}`}>{ADS_CAMERAS.map(id => <button type="button" className={styles.button} aria-pressed={view === id} key={id} onClick={() => { setView(id); setReset(value => value + 1); emit("camera", { camera: id }); }}>{adsCopy[id][lang]}</button>)}</div></section>
      <div className={styles.arrows}>{(["left", "up", "down", "right"] as const).map((direction, index) => <button className={styles.button} type="button" key={direction} disabled={!sceneReady} aria-label={adsCopy[direction][lang]} onClick={() => rotate(direction)}>{["←", "↑", "↓", "→"][index]}</button>)}</div>
      <button type="button" className={styles.button} disabled={!sceneReady} onClick={() => { setReset(value => value + 1); emit("reset"); }}>{adsCopy.reset[lang]}</button>
      <p>{adsCopy.hint[lang]}</p>
      <section><h2>{adsCopy.fov[lang]}</h2><div className={styles.row}>{ADS_FOVS.map(value => <button type="button" className={styles.button} aria-pressed={value === fov} key={value} onClick={() => { setFov(value); emit("camera", { fov: value }); }}>{value}°</button>)}</div></section>
      <section><h2>{adsCopy.placements[lang]}</h2><div className={styles.placements}>{ADS_PLACEMENTS.map(id => <button type="button" className={`${styles.button} ${styles.placement}`} key={id} aria-pressed={visible[id]} onClick={() => { const next = !visible[id]; setVisible(previous => ({ ...previous, [id]: next })); emit(next ? "show" : "hide", { placement: id }); }}><span>{adsCopy[id][lang]}</span><span aria-hidden="true">{visible[id] ? "✓" : "+"}</span></button>)}</div></section>
      <section><h2>{adsCopy.log[lang]}</h2><p>{adsCopy.logHelp[lang]}</p><ul className={styles.events}>{events.length ? [...events].reverse().map(event => <li key={event.seq}>{event.seq} · preview · {event.action} · {event.outcome} · {event.placement ?? event.camera} · {event.fov}°</li>) : <li>{adsCopy.empty[lang]}</li>}</ul><button type="button" className={styles.button} onClick={() => { setEvents([]); recordWebDiagnostic({ type: "ads.preview", surface: "ads", action: "clear", outcome: "accepted", source: "pointer" }); }}>{adsCopy.clear[lang]}</button></section>
    </aside>
  </main>;
}
