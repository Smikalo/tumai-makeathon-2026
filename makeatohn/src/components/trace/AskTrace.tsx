interface Props {
  onAsk: (question: string) => void;
}

const questions = [
  { label: "Why this room? ↗",  prompt: "Why did you choose room MI 02.06.011 specifically?" },
  { label: "Preview summary ↗", prompt: "Can you show me the full Discrete Math summary?" },
  { label: "Replay for demo ↗", prompt: "Walk me through what the agent did step by step." },
];

export function AskTrace({ onAsk }: Props) {
  return (
    <div
      className="px-3 py-2.5"
      style={{ background: "var(--bg-sidebar)", borderTop: "1px solid var(--border-panel)" }}
    >
      <p className="text-[10px] font-medium uppercase tracking-widest mb-2" style={{ color: "var(--text-tertiary)" }}>
        Ask the trace
      </p>
      <div className="flex gap-1.5 flex-wrap">
        {questions.map((q) => (
          <button
            key={q.label}
            onClick={() => onAsk(q.prompt)}
            className="text-[11px] px-2.5 py-1 rounded transition-colors"
            style={{
              border: "1px solid var(--border-card)",
              color: "var(--text-secondary)",
              minWidth: "110px",
              background: "var(--bg-card)",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = "var(--bg-hover)";
              (e.currentTarget as HTMLElement).style.color = "var(--text-primary)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "var(--bg-card)";
              (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)";
            }}
          >
            {q.label}
          </button>
        ))}
      </div>
    </div>
  );
}
