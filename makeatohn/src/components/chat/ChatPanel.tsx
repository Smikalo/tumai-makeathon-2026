import { useState } from "react";
import { useSession } from "../../context/SessionContext";
import { MessageList } from "./MessageList";
import { ChatInput } from "./ChatInput";
import { ConflictCard } from "./ConflictCard";

interface Props {
  sendMessage: (msg: string) => void;
  resolveAction: (actionId: string, approved: boolean) => void;
  dismissConflict: (conflictId: string) => void;
}

export function ChatPanel({ sendMessage, resolveAction, dismissConflict }: Props) {
  const { activeSession } = useSession();
  const [resolvePrompt, setResolvePrompt] = useState<string | undefined>();

  if (!activeSession) return null;

  return (
    <div className="flex flex-col flex-1 min-w-0" style={{ background: "var(--bg-panel)" }}>
      {/* Panel label */}
      <div
        className="px-4 py-2 flex items-center justify-between shrink-0"
        style={{ borderBottom: "1px solid var(--border-panel)" }}
      >
        <span className="text-[10px] font-medium text-app-fg3 uppercase tracking-widest">Your intent</span>
        {activeSession.messages.length > 0 && (
          <span className="text-[11px] text-app-fg3">{activeSession.messages.length} messages</span>
        )}
      </div>

      <MessageList
        messages={activeSession.messages}
        pendingAction={activeSession.pendingAction}
        onResolveAction={resolveAction}
      />

      {activeSession.conflicts.map((conflict) => (
        <ConflictCard
          key={conflict.id}
          conflict={conflict}
          onResolve={setResolvePrompt}
          onDismiss={dismissConflict}
        />
      ))}

      <ChatInput
        onSend={sendMessage}
        disabled={!!activeSession.pendingAction}
        externalValue={resolvePrompt}
        onExternalValueConsumed={() => setResolvePrompt(undefined)}
        isAgentRunning={activeSession.isAgentRunning}
      />
    </div>
  );
}
