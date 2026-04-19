import { useState, useRef, useEffect, type KeyboardEvent } from "react";
import { SuggestionChips } from "./SuggestionChips";

interface Props {
  onSend: (message: string) => void;
  disabled?: boolean;
  externalValue?: string;
  onExternalValueConsumed?: () => void;
  isAgentRunning?: boolean;
}

const PREFILL = "";

export function ChatInput({ onSend, disabled, externalValue, onExternalValueConsumed, isAgentRunning }: Props) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (externalValue !== undefined) {
      setValue(externalValue);
      onExternalValueConsumed?.();
      inputRef.current?.focus();
    }
  }, [externalValue, onExternalValueConsumed]);

  const handleSend = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
  };

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const showChips = !value.trim() && !isAgentRunning && !disabled;

  return (
    <div className="px-4 py-3" style={{ borderTop: "1px solid var(--border-panel)" }}>
      <div
        className="rounded-xl px-3.5 py-2.5"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border-card)" }}
      >
        {showChips && (
          <div className="mb-2">
            <SuggestionChips onSelect={(t) => { setValue(t); inputRef.current?.focus(); }} />
          </div>
        )}
        <div className="flex items-center gap-2">
          <span className="text-[13px] select-none" style={{ color: "var(--text-tertiary)" }}>/</span>
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKey}
            disabled={disabled}
            placeholder="Ask or command…"
            className="flex-1 text-[13px] bg-transparent outline-none disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ color: "var(--text-primary)" }}
          />
          <span className="text-[11px] shrink-0 tabular-nums" style={{ color: "var(--text-tertiary)" }}>
            {value.length > 0 ? value.length : ""}
          </span>
          <button
            onClick={handleSend}
            disabled={disabled || !value.trim()}
            className="shrink-0 px-3 py-1.5 rounded-lg text-[12px] font-medium text-white disabled:opacity-30 disabled:cursor-not-allowed transition-opacity"
            style={{ background: "var(--accent-blue)" }}
          >
            Send
          </button>
        </div>
      </div>
      <p className="text-[10px] mt-1.5 px-0.5" style={{ color: "var(--text-tertiary)" }}>
        {disabled
          ? "⚠ Waiting for your approval above…"
          : "⌘K for commands · Enter to send · Shift+Enter for new line"
        }
      </p>
    </div>
  );
}
