import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

export interface VoiceResult {
  transcript: string;
  checks: { id: string; label: string; ok: boolean; mandatory?: boolean }[];
  score: number;
  mandatoryOk?: boolean;
}

interface Props {
  lines: string[];
  ru: boolean;
  hideScript?: boolean;
  allowLinePractice?: boolean;
  onComplete: (result: VoiceResult | null) => void;
}

export interface VoicePttHandle {
  startRecording: () => void;
  stopRecording: () => void;
}

const OfflineVoicePtt = forwardRef<VoicePttHandle, Props>(
  function OfflineVoicePtt({
    lines,
    ru,
    hideScript = false,
    allowLinePractice = true,
    onComplete,
  }, ref) {
    const [linesRead, setLinesRead] = useState(0);
    const [pttNotice, setPttNotice] = useState(false);
    const doneRef = useRef(false);

    const finish = useCallback(() => {
      if (doneRef.current) return;
      doneRef.current = true;
      onComplete(null);
    }, [onComplete]);

    const nextLine = useCallback(() => {
      setLinesRead((current) => {
        const next = Math.min(lines.length, current + 1);
        if (next === lines.length) window.setTimeout(finish, 250);
        return next;
      });
    }, [finish, lines.length]);

    useImperativeHandle(ref, () => ({
      startRecording: () => setPttNotice(true),
      stopRecording: () => setPttNotice(true),
    }), []);

    return (
      <div
        data-testid="voice-panel"
        className="rounded-2xl p-4"
        style={{
          background: "rgba(0,212,255,0.06)",
          border: "1px solid rgba(0,212,255,0.25)",
        }}
      >
        <div className="mb-2 text-sm font-semibold" style={{ color: "var(--accent-cyan)" }}>
          {ru ? "Голосовой этап без сетевой оценки" : "Etap glosowy bez oceny sieciowej"}
        </div>

        {!hideScript && (
          <ol className="mb-3 space-y-1 font-mono text-xs leading-relaxed">
            {lines.map((line, index) => (
              <li
                key={`${index}-${line}`}
                style={{
                  color: index < linesRead ? "var(--success)" : "var(--text-secondary)",
                }}
              >
                {index < linesRead ? "✓ " : "· "}{line}
              </li>
            ))}
          </ol>
        )}

        <p className="mb-3 text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>
          {ru
            ? "Произнеси сообщение вслух. Приложение не будет придумывать оценку без распознавания речи."
            : "Wypowiedz komunikat na glos. Aplikacja nie wymysla oceny bez rozpoznawania mowy."}
        </p>

        {allowLinePractice && !hideScript ? (
          <button
            type="button"
            data-testid="voice-line"
            onClick={nextLine}
            disabled={linesRead >= lines.length}
            className="min-h-[44px] rounded-xl px-4 text-sm font-semibold disabled:opacity-40"
            style={{
              background: "var(--bg-card)",
              color: "var(--text-primary)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            {ru ? "Следующая строка" : "Nastepna linia"} ({linesRead}/{lines.length})
          </button>
        ) : (
          <button
            type="button"
            data-testid="voice-offline-finish"
            onClick={finish}
            className="min-h-[44px] rounded-xl px-4 text-sm font-semibold"
            style={{
              background: "var(--bg-card)",
              color: "var(--text-primary)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            {ru ? "Я произнёс сообщение" : "Wypowiedzialem komunikat"}
          </button>
        )}

        {pttNotice && (
          <div className="mt-2 text-xs" style={{ color: "var(--warning)" }}>
            {ru
              ? "PTT работает как орган управления. Запись и оценка голоса доступны только в сетевой версии."
              : "PTT dziala jako element sterowania. Nagranie i ocena glosu sa dostepne tylko online."}
          </div>
        )}
      </div>
    );
  },
);

export default OfflineVoicePtt;
