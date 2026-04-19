import { useEffect, useRef } from "react";
import type { ChatMessage, ActionRequest } from "../../types";
import { MessageBubble } from "./MessageBubble";
import { ActionApproval } from "./ActionApproval";

interface Props {
  messages: ChatMessage[];
  pendingAction: ActionRequest | null;
  onResolveAction: (actionId: string, approved: boolean) => void;
}

export function MessageList({ messages, pendingAction, onResolveAction }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, pendingAction]);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4">
      {messages.length === 0 && (
        <div className="flex flex-col items-center justify-center h-full gap-3 select-none">
          <p
            className="text-[11px] font-mono uppercase tracking-[0.2em]"
            style={{ color: "var(--text-tertiary)" }}
          >
            campus co-pilot
          </p>
          <h1
            className="text-[32px] font-bold leading-tight text-center"
            style={{
              color: "transparent",
              background: "linear-gradient(135deg, var(--text-primary) 30%, var(--accent-blue) 70%)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              letterSpacing: "-0.03em",
            }}
          >
            What is your<br />current GPA?
          </h1>
          <p
            className="text-[12px] text-center max-w-[200px]"
            style={{ color: "var(--text-tertiary)", lineHeight: 1.6 }}
          >
            Ask me anything about your schedule, rooms, or courses.
          </p>
        </div>
      )}

      {messages.map((msg, i) => {
        const prev = messages[i - 1];
        const next = messages[i + 1];
        const isGrouped = !!prev && prev.role === msg.role && msg.role === "assistant";
        const isLastInGroup = !next || next.role !== msg.role || msg.role === "user";
        return (
          <MessageBubble
            key={msg.id}
            message={msg}
            isGrouped={isGrouped}
            isLastInGroup={isLastInGroup}
          />
        );
      })}

      {pendingAction && (
        <ActionApproval action={pendingAction} onResolve={onResolveAction} />
      )}
      <div ref={bottomRef} />
    </div>
  );
}
