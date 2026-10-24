'use client';
import { useState } from "react";
import { useRadioI18n } from "@/app/radio/localization/context";
import { LocalTranscriptEntry, type TranscriptInputMode } from "@/app/radio/LocalTranscriptEntry";
import { playLocalSpeech } from "@/app/radio/audio/localSpeech";

export default function OfflineMicCheck({ compact = false }: { compact?: boolean }) {
  const { tp } = useRadioI18n();
  const [checked, setChecked] = useState<{text: string; mode: TranscriptInputMode} | null>(null);
  const [voiceFailed, setVoiceFailed] = useState(false);
  return (
    <div className={compact ? "rounded-xl border p-3 text-xs" : "rounded-2xl border p-4 text-sm"} style={{ background: "var(--bg-card)", borderColor: "var(--border-subtle)", color: "var(--text-secondary)" }}>
      <strong>{tp("Проверка речи на устройстве", "On-device speech check", "Sprawdzenie mowy na urządzeniu")}</strong>
      <p className="mt-2 leading-relaxed">{tp("Для проверки микрофона удерживай кнопку и произнеси RADIO CHECK, OVER. Разрешение запрашивается только при нажатии. Если английская модель недоступна, текстовая тренировка продолжает работать без сети.", "To check the microphone, hold the button and say RADIO CHECK, OVER. Permission is requested only when you press. If the English model is unavailable, text practice still works offline.", "Aby sprawdzić mikrofon, przytrzymaj przycisk i powiedz RADIO CHECK, OVER. Zgoda jest wymagana dopiero po naciśnięciu. Jeśli angielski model jest niedostępny, trening tekstowy nadal działa bez internetu.")}</p>
      <LocalTranscriptEntry onSubmit={(text, mode) => setChecked({text, mode})} />
      {checked && <p className="mt-3" data-testid="offline-mic-transcript"><b>{checked.mode === "voice" ? tp("Распознано на устройстве", "Recognized on device", "Rozpoznano na urządzeniu") : tp("Введённый текст", "Typed text", "Wpisany tekst")}:</b> <span lang="en">{checked.text}</span></p>}
      <button type="button" className="mt-3 min-h-[44px] rounded-xl border px-3" style={{borderColor:"var(--border-subtle)"}} onClick={() => { void playLocalSpeech("RADIO CHECK, OVER").then(played => setVoiceFailed(!played)); }}>{tp("Проверить локальный голос", "Test the local voice", "Sprawdź lokalny głos")}</button>
      {voiceFailed && <p className="mt-2" role="status">{tp("Локальный английский голос недоступен. Письменные примеры остаются доступны.", "A local English voice is unavailable. Written examples remain available.", "Lokalny angielski głos jest niedostępny. Pisemne przykłady pozostają dostępne.")}</p>}
    </div>
  );
}
