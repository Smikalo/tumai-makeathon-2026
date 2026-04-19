import type { ChatMessage } from "../../types";
import { ChatCard } from "./ChatCard";

function renderContent(content: string): string {
  return content
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\n/g, "<br />");
}

interface Props {
  message: ChatMessage;
  isGrouped?: boolean;
  isLastInGroup?: boolean;
}

export function MessageBubble({ message, isGrouped, isLastInGroup }: Props) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} ${isGrouped ? "mt-1" : "mt-3"}`}>
      <div className={`flex flex-col ${isUser ? "items-end max-w-[70%]" : "items-start w-[85%]"}`}>
        <div className="group relative w-full">
          <div
            className="rounded-xl px-3 py-2 text-[13px] leading-relaxed w-full"
            style={isUser
              ? { background: "#1d2d42", border: "1px solid rgba(59,130,246,0.2)", color: "#e0eaff" }
              : { background: "var(--bg-card)", border: "1px solid var(--border-card)", color: "var(--text-primary)" }
            }
            dangerouslySetInnerHTML={{ __html: renderContent(message.content) }}
          />
          <div
            className={`opacity-0 group-hover:opacity-100 transition-opacity duration-150 text-[10px] mt-0.5 ${isUser ? "text-right" : "text-left"}`}
            style={{ color: "var(--text-tertiary)" }}
          >
            {message.timestamp}
          </div>
        </div>

        {message.cards && message.cards.length > 0 && (
          <div className="w-full">
            {message.cards.map((card, i) => (
              <ChatCard key={i} card={card} />
            ))}
          </div>
        )}

        {!isUser && isLastInGroup && (
          <p className="text-[11px] mt-1.5 pl-0.5" style={{ color: "var(--text-tertiary)" }}>
            via Campus Co-Pilot
          </p>
        )}
      </div>
    </div>
  );
}
