import type { ConflictCard as ConflictCardType } from "../../types";

interface Props {
  conflict: ConflictCardType;
  onResolve: (prompt: string) => void;
  onDismiss: (id: string) => void;
}

export function ConflictCard({ conflict, onResolve, onDismiss }: Props) {
  return (
    <div
      className="mx-3 mb-2 rounded-lg p-3"
      style={{
        background: "var(--bg-card)",
        border: "1px dashed rgba(245,158,11,0.35)",
        borderLeft: "3px solid var(--accent-amber)",
      }}
    >
      <div className="flex items-start gap-2.5">
        <div
          className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-[11px] font-bold"
          style={{ background: "rgba(245,158,11,0.15)", color: "var(--accent-amber)" }}
        >
          !
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-medium" style={{ color: "var(--text-primary)" }}>{conflict.title}</p>
          <p className="text-[12px] leading-snug mt-0.5" style={{ color: "var(--text-secondary)" }}>{conflict.detail}</p>
          <div className="flex items-center justify-between mt-2">
            <button
              onClick={() => onResolve(conflict.resolvePrompt)}
              className="text-[11px] font-medium px-2 py-0.5 rounded transition-colors"
              style={{
                border: "1px solid rgba(245,158,11,0.35)",
                color: "var(--accent-amber)",
              }}
            >
              Resolve →
            </button>
            <button
              onClick={() => onDismiss(conflict.id)}
              className="text-[16px] leading-none transition-colors"
              style={{ color: "var(--text-tertiary)" }}
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
