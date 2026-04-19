import { useSession } from "../../context/SessionContext";

function relativeTime(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return "now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

const quickActions = [
  { icon: "◈", label: "View my week",      prompt: "What does my schedule look like this week?" },
  { icon: "⌕", label: "Find a study room", prompt: "Find me an available study room near the math building." },
  { icon: "≡", label: "Summarize slides",  prompt: "Summarize this week's Moodle slides for my courses." },
];

interface Props {
  sendMessage: (msg: string) => void;
}

export function Sidebar({ sendMessage }: Props) {
  const { sessions, activeSessionId, dispatch } = useSession();

  const lastMessage = (sid: string) => {
    const s = sessions.find((x) => x.id === sid);
    const msgs = s?.messages ?? [];
    return msgs.length > 0 ? msgs[msgs.length - 1].content : null;
  };

  const activeSession = sessions.find((s) => s.id === activeSessionId);

  return (
    <aside
      className="w-60 shrink-0 flex flex-col h-full"
      style={{ background: "var(--bg-sidebar)", borderRight: "1px solid var(--border-panel)" }}
    >
      {/* New chat */}
      <div className="px-3 pt-3 pb-2" style={{ borderBottom: "1px solid var(--border-panel)" }}>
        <button
          onClick={() => dispatch({ type: "NEW_SESSION" })}
          className="w-full text-left text-[12px] font-medium rounded px-3 py-1.5 transition-colors"
          style={{ color: "var(--accent-blue)", border: "1px solid rgba(59,130,246,0.3)" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--bg-hover)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = ""; }}
        >
          + New chat
        </button>
      </div>

      {/* Quick actions */}
      <div className="px-3 pt-3 pb-2" style={{ borderBottom: "1px solid var(--border-panel)" }}>
        <p className="text-[10px] font-medium uppercase tracking-widest mb-2" style={{ color: "var(--text-tertiary)" }}>
          Quick actions
        </p>
        <div className="flex flex-col gap-0.5">
          {quickActions.map((qa) => (
            <button
              key={qa.label}
              onClick={() => activeSession?.isLoggedIn && sendMessage(qa.prompt)}
              disabled={!activeSession?.isLoggedIn}
              className="flex items-center gap-2.5 px-2 py-1.5 rounded text-[12px] text-left transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              style={{ color: "var(--text-secondary)" }}
              onMouseEnter={(e) => {
                if (!activeSession?.isLoggedIn) return;
                (e.currentTarget as HTMLElement).style.background = "var(--bg-hover)";
                (e.currentTarget as HTMLElement).style.color = "var(--text-primary)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = "";
                (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)";
              }}
            >
              <span className="text-[13px] w-4 text-center shrink-0" style={{ color: "var(--text-tertiary)" }}>{qa.icon}</span>
              {qa.label}
            </button>
          ))}
        </div>
      </div>

      {/* Session list */}
      <nav className="flex-1 overflow-y-auto py-2">
        <p className="text-[10px] font-medium uppercase tracking-widest px-3 mb-1.5" style={{ color: "var(--text-tertiary)" }}>
          Sessions
        </p>
        {sessions.map((session) => {
          const isActive = session.id === activeSessionId;
          const preview = lastMessage(session.id);
          return (
            <button
              key={session.id}
              onClick={() => dispatch({ type: "SET_ACTIVE", sessionId: session.id })}
              className="w-full text-left px-3 py-2 transition-colors relative"
              style={isActive
                ? { background: "var(--bg-card)", borderLeft: "2px solid var(--accent-blue)" }
                : { paddingLeft: "14px" }
              }
              onMouseEnter={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "var(--bg-hover)"; }}
              onMouseLeave={(e) => { if (!isActive) (e.currentTarget as HTMLElement).style.background = ""; }}
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[12px] font-medium truncate" style={{ color: isActive ? "var(--text-primary)" : "var(--text-secondary)" }}>
                  {session.title}
                </span>
                <span className="text-[10px] shrink-0" style={{ color: "var(--text-tertiary)" }}>
                  {relativeTime(session.createdAt)}
                </span>
              </div>
              {preview && (
                <p className="text-[11px] truncate mt-0.5 leading-tight" style={{ color: "var(--text-tertiary)" }}>
                  {preview}
                </p>
              )}
            </button>
          );
        })}
      </nav>

      {/* User chip */}
      <div
        className="px-3 py-3 flex items-center gap-2.5"
        style={{ borderTop: "1px solid var(--border-panel)" }}
      >
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-medium shrink-0"
          style={{ background: "rgba(59,130,246,0.2)", border: "1px solid rgba(59,130,246,0.35)", color: "var(--accent-blue)" }}
        >
          DS
        </div>
        <div className="min-w-0">
          <p className="text-[12px] font-medium leading-tight" style={{ color: "var(--text-primary)" }}>Student User</p>
          <p className="text-[10px] leading-tight" style={{ color: "var(--text-tertiary)" }}>TUM Student</p>
        </div>
        {activeSession?.isAgentRunning && (
          <div className="ml-auto w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse-dot shrink-0" />
        )}
      </div>
    </aside>
  );
}
