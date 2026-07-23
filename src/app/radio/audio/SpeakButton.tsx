'use client';

import { useState } from 'react';
import { playRadioSpeech } from './radioPlayback';

// A small round "listen" button. Speaks `text` in the radio voice so a learner
// can hear how a proword / phonetic word / phrase is pronounced. Falls silent
// (no error) when audio is unavailable - the written phrase is always there.
export function SpeakButton({
  text,
  label,
  size = 22,
}: {
  /** Exactly what to speak (clean, no placeholders or slashes). */
  text: string;
  /** Accessible label, e.g. tp('Прослушать', 'Listen', 'Posluchaj'). */
  label: string;
  size?: number;
}) {
  const [playing, setPlaying] = useState(false);

  const play = async () => {
    if (playing) return;
    setPlaying(true);
    try {
      await playRadioSpeech(text);
    } finally {
      setPlaying(false);
    }
  };

  return (
    <button
      type="button"
      onClick={() => void play()}
      aria-label={`${label}: ${text}`}
      aria-busy={playing}
      title={label}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: Math.max(44, size),
        height: Math.max(44, size),
        minWidth: Math.max(44, size),
        borderRadius: '50%',
        border: '1px solid var(--border-subtle)',
        background: playing ? 'var(--accent-cyan)' : 'rgba(0, 212, 255, 0.10)',
        color: playing ? 'var(--accent-ink, #04222e)' : 'var(--accent-cyan)',
        fontSize: Math.max(10, Math.round(size * 0.5)),
        lineHeight: 1,
        cursor: 'pointer',
        flexShrink: 0,
      }}
    >
      <span aria-hidden>{playing ? '■' : '▶'}</span>
    </button>
  );
}
