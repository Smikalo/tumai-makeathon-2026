import type { TraceLine as TraceLineType } from "../../types";

const tagConfig: Record<TraceLineType["tag"], { bg: string; color: string; textColor: string; prefix: string; borderColor: string }> = {
  PLAN: { bg: "#3b2f6e", color: "#c4b5fd", textColor: "#a1a1aa", prefix: "",    borderColor: "#8b5cf6" },
  TOOL: { bg: "#1e3a5f", color: "#93c5fd", textColor: "#a1a1aa", prefix: "→ ",  borderColor: "#3b82f6" },
  LLM:  { bg: "#0f3d38", color: "#5eead4", textColor: "#5eead4", prefix: "→ ",  borderColor: "#14b8a6" },
  HTTP: { bg: "#27272a", color: "#a1a1aa", textColor: "#71717a", prefix: "→ ",  borderColor: "#52525b" },
  WARN: { bg: "#422006", color: "#fcd34d", textColor: "#fcd34d", prefix: "⚠ ",  borderColor: "#f59e0b" },
  OK:   { bg: "#14401e", color: "#86efac", textColor: "#86efac", prefix: "← ",  borderColor: "#22c55e" },
  ERR:  { bg: "#450a0a", color: "#fca5a5", textColor: "#fca5a5", prefix: "✗ ",  borderColor: "#ef4444" },
};

export function TraceLine({ line }: { line: TraceLineType }) {
  const cfg = tagConfig[line.tag];

  return (
    <div
      className="trace-line font-mono text-[12px] py-0.5 pl-3 pr-3"
      style={{ "--tag-color": cfg.borderColor } as React.CSSProperties}
    >
      <div className="flex items-baseline gap-1.5">
        <span className="shrink-0 tabular-nums text-[10px] w-14" style={{ color: "var(--text-tertiary)" }}>
          {line.timestamp}
        </span>
        <span
          className="text-[9px] font-medium px-1 py-px rounded shrink-0 uppercase tracking-wide"
          style={{ background: cfg.bg, color: cfg.color }}
        >
          {line.tag}
        </span>
        <span className="break-all leading-snug" style={{ color: cfg.textColor }}>
          <span style={{ opacity: 0.4 }}>{cfg.prefix}</span>{line.text}
        </span>
      </div>
      {line.detail && (
        <div className="ml-20 text-[11px] mt-px" style={{ color: "var(--text-tertiary)" }}>{line.detail}</div>
      )}
    </div>
  );
}
