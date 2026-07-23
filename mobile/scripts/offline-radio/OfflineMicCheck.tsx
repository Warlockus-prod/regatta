import { useI18n } from "./i18n";

export default function OfflineMicCheck({ compact = false }: { compact?: boolean }) {
  const { tp } = useI18n();
  return (
    <div
      className={compact ? "rounded-xl p-3 text-xs" : "rounded-2xl p-4 text-sm"}
      style={{
        background: "rgba(255,170,0,0.07)",
        border: "1px solid rgba(255,170,0,0.3)",
        color: "var(--text-secondary)",
      }}
    >
      <strong style={{ color: "var(--warning)" }}>
        {tp("Офлайн-проверка", "Offline check", "Tryb offline")}
      </strong>
      <div className="mt-1 leading-relaxed">
        {tp(
          "Микрофон и автоматическая оценка речи требуют интернета. Теория, эталонные фразы и управление рацией доступны без сети.",
          "The microphone and automatic speech grading require a connection. Theory, model phrases and radio controls remain available offline.",
          "Mikrofon i automatyczna ocena mowy wymagaja internetu. Teoria, wzorcowe frazy i obsluga radia dzialaja bez sieci.",
        )}
      </div>
    </div>
  );
}
