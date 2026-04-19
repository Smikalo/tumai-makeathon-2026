import type { LogEntry, LogEntryKind } from "../../types";

interface Props {
  logs: LogEntry[];
}

const kindConfig: Record<LogEntryKind, { dot: string; label: string; labelColor: string }> = {
  SUCCESS:  { dot: "var(--accent-green)",  label: "success",  labelColor: "#86efac" },
  FAILED:   { dot: "var(--accent-red)",    label: "failed",   labelColor: "#fca5a5" },
  REJECTED: { dot: "var(--accent-amber)",  label: "rejected", labelColor: "#fcd34d" },
  CONFLICT: { dot: "#f97316",              label: "conflict", labelColor: "#fdba74" },
};

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function LogRow({ entry }: { entry: LogEntry }) {
  const cfg = kindConfig[entry.kind];
  return (
    <div
      className="px-3 py-2 flex flex-col gap-0.5 transition-colors"
      style={{ borderBottom: "1px solid var(--border-panel)" }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--bg-hover)"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = ""; }}
    >
      <div className="flex items-center gap-2">
        {/* Status dot */}
        <span
          className="shrink-0 w-1.5 h-1.5 rounded-full"
          style={{ background: cfg.dot, boxShadow: `0 0 4px ${cfg.dot}` }}
        />
        {/* Label */}
        <span className="flex-1 text-[12px] font-medium truncate" style={{ color: "var(--text-primary)" }}>
          {entry.label}
        </span>
        {/* Kind badge */}
        <span
          className="shrink-0 text-[10px] font-mono font-medium uppercase tracking-wider px-1.5 py-0.5 rounded"
          style={{ color: cfg.labelColor, background: `${cfg.dot}18` }}
        >
          {cfg.label}
        </span>
      </div>
      {entry.summary && (
        <p className="text-[11px] pl-3.5 truncate" style={{ color: "var(--text-secondary)" }}>
          {entry.summary}
        </p>
      )}
      <div className="flex items-center gap-2 pl-3.5">
        <span className="text-[10px] font-mono" style={{ color: "var(--text-tertiary)" }}>
          {entry.timestamp}
        </span>
        {entry.durationMs !== undefined && (
          <span className="text-[10px] font-mono" style={{ color: "var(--text-tertiary)" }}>
            · {formatDuration(entry.durationMs)}
          </span>
        )}
      </div>
    </div>
  );
}

export function LogsTab({ logs }: Props) {
  if (logs.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center px-6">
        <p className="text-center text-[12px] font-mono" style={{ color: "var(--text-tertiary)" }}>
          No completed actions yet.<br />Logs appear here after tasks finish.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {logs.map((entry) => (
        <LogRow key={entry.id} entry={entry} />
      ))}
    </div>
  );
}
