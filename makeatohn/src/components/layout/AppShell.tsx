import { Sidebar } from "./Sidebar";
import { ChatPanel } from "../chat/ChatPanel";
import { TracePanel } from "../trace/TracePanel";
import { LoginGate } from "./LoginGate";
import { useAgent } from "../../hooks/useAgent";
import { useSession } from "../../context/SessionContext";

function AppHeader({ isAgentRunning, sessionTitle }: {
  isAgentRunning: boolean;
  sessionTitle: string;
}) {
  return (
    <div
      className="h-11 shrink-0 flex items-center px-4 gap-4"
      style={{ background: "var(--bg-sidebar)", borderBottom: "1px solid var(--border-panel)" }}
    >
      <div className="flex items-center gap-2.5 shrink-0">
        <div className="w-6 h-6 rounded-md bg-tum-blue flex items-center justify-center text-white text-[10px] font-medium tracking-wide">
          CC
        </div>
        <span className="text-[13px] font-medium text-app-fg">Campus Co-Pilot</span>
        {sessionTitle && sessionTitle !== "New session" && (
          <>
            <span className="text-app-fg3 text-[12px]">/</span>
            <span className="text-[12px] text-app-fg2 truncate max-w-[200px]">{sessionTitle.slice(0, 32)}</span>
          </>
        )}
      </div>

      <div className="flex-1" />

      <div className="flex items-center gap-2 shrink-0">
        {isAgentRunning ? (
          <>
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse-green" />
            <span className="text-[11px] text-app-fg2">Agent active</span>
          </>
        ) : (
          <>
            <div className="w-2 h-2 rounded-full bg-app-fg3" />
            <span className="text-[11px] text-app-fg3">Ready</span>
          </>
        )}
      </div>
    </div>
  );
}

export function AppShell() {
  const { sendMessage, resolveAction, dismissConflict } = useAgent();
  const { activeSession, activeSessionId, dispatch } = useSession();

  const handleLogin = () => {
    // Start the browser SSO handshake via agent
    // The dispatch for SET_LOGGED_IN will now happen when we receive 'login_success' event
    sendMessage("Log me into TUMonline via Shibboleth SSO");
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: "var(--bg-page)" }}>
      <AppHeader
        isAgentRunning={activeSession?.isAgentRunning ?? false}
        sessionTitle={activeSession?.title ?? ""}
      />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar sendMessage={sendMessage} />
        <div className="flex flex-1 overflow-hidden min-w-0">
          {!activeSession?.isLoggedIn ? (
            <LoginGate onLogin={handleLogin} />
          ) : (
            <ChatPanel
              sendMessage={sendMessage}
              resolveAction={resolveAction}
              dismissConflict={dismissConflict}
            />
          )}
          <TracePanel sendMessage={sendMessage} />
        </div>
      </div>
    </div>
  );
}
