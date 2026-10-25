"use client";

import { useCallback, useRef, useState, useSyncExternalStore } from "react";
import { emptyFoundation, FOUNDATION_EVENT, FOUNDATION_KEY, LEGACY_FOUNDATION_KEY, loadFoundation, readLegacyFoundation, saveFoundation, type FoundationProgress } from "@/lib/learning/foundation-progress";

import { saveLearningBookmark } from "@/lib/product/learning-web";

interface Snapshot { ready: boolean; readError: boolean; progress: FoundationProgress; visited: string[]; legacyCurrent: string | null; legacyVisits: number; lesson: string | null; step: string | null }
const server: Snapshot = { ready: false, readError: false, progress: emptyFoundation(), visited: [], legacyCurrent: null, legacyVisits: 0, lesson: null, step: null };
let cacheKey: string | undefined;
let cached = server;
function snapshot(): Snapshot {
  if (typeof window === "undefined") return server;
  let raw: string | null; let legacy: string | null;
  try { raw = localStorage.getItem(FOUNDATION_KEY); legacy = localStorage.getItem(LEGACY_FOUNDATION_KEY); }
  catch { if (cacheKey !== "storage-error") { cacheKey = "storage-error"; cached = { ...server, ready: true, readError: true }; } return cached; }
  const key = JSON.stringify([raw, legacy, window.location.search]);
  if (cacheKey === key) return cached;
  cacheKey = key;
  const search = new URLSearchParams(window.location.search);
  try {
    const loaded = loadFoundation({ getItem: name => name === FOUNDATION_KEY ? raw : legacy });
    cached = { ready: true, readError: false, progress: loaded.progress, visited: loaded.visited, legacyCurrent: loaded.legacy.current, legacyVisits: loaded.legacy.visited.length, lesson: search.get("lesson"), step: search.get("step") };
  } catch { cached = { ...server, ready: true, readError: true, visited: readLegacyFoundation(legacy).visited, lesson: search.get("lesson"), step: search.get("step") }; }
  return cached;
}
export function announceFoundation() { window.dispatchEvent(new Event(FOUNDATION_EVENT)); }
function subscribe(listener: () => void) {
  window.addEventListener(FOUNDATION_EVENT, listener); window.addEventListener("storage", listener); window.addEventListener("focus", listener); window.addEventListener("popstate", listener);
  return () => { window.removeEventListener(FOUNDATION_EVENT, listener); window.removeEventListener("storage", listener); window.removeEventListener("focus", listener); window.removeEventListener("popstate", listener); };
}
export function useFoundationProgress() {
  const saved = useSyncExternalStore(subscribe, snapshot, () => server);
  const [pending, setPending] = useState<FoundationProgress | null>(null);
  const [saveError, setSaveError] = useState(false);
  const pendingRef = useRef<FoundationProgress | null>(null);
  const write = useCallback((change: (previous: FoundationProgress) => FoundationProgress) => {
    let next: FoundationProgress | null = null;
    try {
      next = change(pendingRef.current ?? loadFoundation(localStorage).progress);
      saveFoundation(localStorage, next);
      if (next.current) saveLearningBookmark({ version: 1, course: "course", lesson: next.current });
      pendingRef.current = null; setPending(null); setSaveError(false); announceFoundation(); return true;
    } catch { if (next) { pendingRef.current = next; setPending(next); } setSaveError(true); return false; }
  }, []);
  return { ...saved, display: pending ?? saved.progress, saveError,
    write, retry: () => pending ? write(() => pending) : announceFoundation() };
}
