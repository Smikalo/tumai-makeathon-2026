import { useState, useEffect } from "react";
import { useSession } from "../../context/SessionContext";
import { TraceLog } from "./TraceLog";
import { AskTrace } from "./AskTrace";
import { ScheduleTab } from "./ScheduleTab";
import { LogsTab } from "./LogsTab";
import { BrowserTab } from "./BrowserTab";

interface Props {
  sendMessage: (msg: string) => void;
}

export function TracePanel({ sendMessage }: Props) {
  const { activeSession } = useSession();
  const [activeTab, setActiveTab] = useState<"trace" | "calendar" | "logs" | "browser">("trace");

  // Auto-switch to Browser tab when the browser agent starts
  useEffect(() => {
    if (activeSession?.browserStarted) {
      setActiveTab("browser");
    }
  }, [activeSession?.browserStarted]);

  if (!activeSession) return null;

  const traceCount = activeSession.trace.length;

  return (
    <div
      className="flex flex-col shrink-0 overflow-hidden"
      style={{ width: "380px", background: "var(--bg-panel)", borderLeft: "1px solid var(--border-panel)" }}
    >
      {/* Tab bar */}
      <div
        className="flex items-center px-3"
        style={{ borderBottom: "1px solid var(--border-panel)" }}
      >
        <div className="flex flex-1">
          {(["trace", "calendar", "logs", "browser"] as const).map((tab) => {
            const label =
              tab === "trace" ? "Execution trace" :
              tab === "calendar" ? "Calendar" :
              tab === "logs" ? "Logs" : "Browser";
            const isBrowserAvailable = tab === "browser" && activeSession.browserStarted;
            const isDisabled = tab === "browser" && !activeSession.browserStarted;
            return (
              <button
                key={tab}
                onClick={() => !isDisabled && setActiveTab(tab)}
                className="px-3 py-2.5 text-[12px] font-medium border-b-2 -mb-px transition-all"
                style={activeTab === tab
                  ? { borderBottomColor: "var(--text-primary)", color: "var(--text-primary)" }
                  : isDisabled
                  ? { borderBottomColor: "transparent", color: "var(--text-tertiary)", opacity: 0.25, cursor: "default" }
                  : { borderBottomColor: "transparent", color: "var(--text-tertiary)", opacity: 0.6 }
                }
              >
                {label}
                {isBrowserAvailable && activeTab !== "browser" && (
                  <span
                    style={{
                      display: "inline-block",
                      width: "5px",
                      height: "5px",
                      borderRadius: "50%",
                      background: "var(--accent-blue)",
                      marginLeft: "4px",
                      verticalAlign: "middle",
                      animation: "pulse-dot 1.4s ease-in-out infinite",
                    }}
                  />
                )}
              </button>
            );
          })}
        </div>
        {activeTab === "trace" && traceCount > 0 && (
          <span className="text-[10px] shrink-0 tabular-nums" style={{ color: "var(--text-tertiary)" }}>
            {traceCount} events
          </span>
        )}
        {activeTab === "logs" && activeSession.logs.length > 0 && (
          <span className="text-[10px] shrink-0 tabular-nums" style={{ color: "var(--text-tertiary)" }}>
            {activeSession.logs.length} entries
          </span>
        )}
      </div>

      {/* Conditionally rendered tabs */}
      {activeTab === "trace" && <TraceLog lines={activeSession.trace} />}
      {activeTab === "calendar" && <ScheduleTab entries={activeSession.scheduleEntries} sendMessage={sendMessage} />}
      {activeTab === "logs" && <LogsTab logs={activeSession.logs} />}

      {/* BrowserTab: ALWAYS mounted so it reacts to browserStarted the instant it fires.
          Shown/hidden with CSS — never unmounted mid-demo. */}
      <div
        style={{
          display: activeTab === "browser" ? "flex" : "none",
          flex: 1,
          flexDirection: "column",
          overflow: "hidden",
          minHeight: 0,
        }}
      >
        <BrowserTab
          browserStarted={activeSession.browserStarted}
          browserRetried={activeSession.browserRetried}
        />
      </div>

      <AskTrace onAsk={sendMessage} />
    </div>
  );
}
