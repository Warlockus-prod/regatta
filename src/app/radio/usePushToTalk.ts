'use client';

import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';

// ============================================================================
// Hold to speak. One implementation, because the bug was in both copies.
//
// THE RACE. getUserMedia is asynchronous: on a first visit it waits for the
// permission prompt, and on a Bluetooth headset it waits for the device to open -
// easily 300ms. A normal short tap releases the button long before that. The old
// code called recorder.stop() on pointer-up, found no recorder yet, and did
// nothing; the recorder then started AFTER the finger had lifted and kept running.
// The result: the mic stays hot with the recording light on, the UI is stuck on
// "recording", and the learner's answer is never graded. Leaving the page did not
// stop it either.
//
// The fix is a generation counter. Every press takes a ticket. If the press has
// already been released (or superseded, or unmounted) by the time the microphone
// finally opens, the stream is closed immediately and nothing is recorded.
//
// THE OTHER RACE. Grading is asynchronous too. Switching to another question
// while a transcript is in flight used to land question 1's verdict under question
// 3's coordinates. The same ticket settles that: a result from a stale generation
// is dropped.
// ============================================================================

export type PttPhase = 'idle' | 'recording' | 'working';

interface Options {
  /** Called with the recorded audio. Runs only if the press is still current. */
  onAudio: (blob: Blob, isCurrent: () => boolean) => Promise<void> | void;
  /** Refuse to start (radio off, wrong channel). Return false to cancel the press. */
  canStart?: () => boolean;
}

export function usePushToTalk({ onAudio, canStart }: Options) {
  const [phase, setPhase] = useState<PttPhase>('idle');

  const gen = useRef(0);            // the current press
  const held = useRef(false);       // is the button still down?
  const rec = useRef<MediaRecorder | null>(null);
  const chunks = useRef<BlobPart[]>([]);
  const alive = useRef(true);

  useEffect(() => () => {
    alive.current = false;
    gen.current += 1;
    try { rec.current?.stop(); } catch { /* already stopped */ }
    rec.current = null;
  }, []);

  /** Abandon anything in flight: used when the learner moves to another item. */
  const cancel = useCallback(() => {
    gen.current += 1;
    held.current = false;
    try { rec.current?.stop(); } catch { /* already stopped */ }
    rec.current = null;
    setPhase('idle');
  }, []);

  const start = useCallback(async () => {
    if (phase !== 'idle') return;
    if (canStart && !canStart()) return;

    const ticket = ++gen.current;
    const isCurrent = () => alive.current && gen.current === ticket;
    held.current = true;

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
    } catch {
      if (isCurrent()) setPhase('idle');
      return;
    }

    // The whole point: by the time the mic opened, the finger may already be up.
    if (!isCurrent() || !held.current) {
      stream.getTracks().forEach((t) => t.stop());
      if (isCurrent()) setPhase('idle');
      return;
    }

    const r = new MediaRecorder(stream);
    rec.current = r;
    chunks.current = [];
    r.ondataavailable = (e) => { if (e.data.size > 0) chunks.current.push(e.data); };
    r.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());
      if (rec.current === r) rec.current = null;
      if (!isCurrent()) return;

      const blob = new Blob(chunks.current, { type: r.mimeType || 'audio/webm' });
      if (blob.size === 0) { setPhase('idle'); return; }

      setPhase('working');
      try {
        await onAudio(blob, isCurrent);
      } finally {
        if (isCurrent()) setPhase('idle');
      }
    };

    r.start();
    setPhase('recording');
  }, [canStart, onAudio, phase]);

  const stop = useCallback(() => {
    held.current = false;
    try { rec.current?.stop(); } catch { /* not started yet - the ticket handles it */ }
  }, []);

  /**
   * Pointer AND keyboard. The buttons were pointer-only, so a keyboard user could
   * not record at all: tab to the control, press Space, nothing happens, no error.
   */
  const handlers = {
    onPointerDown: () => { void start(); },
    onPointerUp: stop,
    onPointerLeave: stop,
    onPointerCancel: stop,
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key !== ' ' && e.key !== 'Enter') return;
      if (e.repeat) return;
      e.preventDefault();
      void start();
    },
    onKeyUp: (e: React.KeyboardEvent) => {
      if (e.key !== ' ' && e.key !== 'Enter') return;
      e.preventDefault();
      stop();
    },
    onBlur: stop,
  };

  return { phase, handlers, cancel };
}
