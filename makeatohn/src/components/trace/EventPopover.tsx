import { useEffect, type RefObject } from "react";
import type { CalendarEvent } from "./calendarData";
import { formatTime } from "./calendarData";

interface Props {
  event: CalendarEvent;
  dayLabel: string;
  onClose: () => void;
  sendMessage: (msg: string) => void;
  popoverRef: RefObject<HTMLDivElement>;
  flipLeft: boolean;
}

function getActions(event: CalendarEvent, dayLabel: string, timeStr: string) {
  const actions: { label: string; prompt: string }[] = [];

  if (event.kind === "tutor") {
    actions.push({
      label: "Cancel & find another slot →",
      prompt: `I want to reschedule my tutor session "${event.title}" on ${dayLabel}. Find me another slot this week.`,
    });
  }
  if (event.moveable && event.kind !== "tutor") {
    actions.push({
      label: "Move to a better slot →",
      prompt: `Can you move "${event.title}" on ${dayLabel} at ${timeStr} to a less busy time this week?`,
    });
  }
  if (event.kind === "room_booked" || event.kind === "event_registered") {
    actions.push({
      label: "See booking details →",
      prompt: `Show me the booking details for "${event.title}".`,
    });
  }
  actions.push({
    label: "Ask about this →",
    prompt: `Tell me more about ${event.title} on ${dayLabel} at ${timeStr}.`,
  });

  return actions;
}

export function EventPopover({ event, dayLabel, onClose, sendMessage, popoverRef, flipLeft }: Props) {
  const timeStr = formatTime(event.startMinute, event.durationMinutes);
  const actions = getActions(event, dayLabel, timeStr);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) onClose();
    };
    const keyHandler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", keyHandler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("keydown", keyHandler);
    };
  }, [onClose, popoverRef]);

  return (
    <div
      ref={popoverRef}
      className={`absolute top-0 z-50 w-52 rounded-lg shadow-xl ${flipLeft ? "right-[calc(100%+4px)]" : "left-[calc(100%+4px)]"}`}
      style={{ background: "var(--bg-card)", border: "1px solid var(--border-card)" }}
    >
      <div className="px-3 pt-3 pb-2" style={{ borderBottom: "1px solid var(--border-panel)" }}>
        <p className="text-[12px] font-medium leading-tight" style={{ color: "var(--text-primary)" }}>{event.title}</p>
        {event.subtitle && <p className="text-[11px] mt-0.5" style={{ color: "var(--text-tertiary)" }}>{event.subtitle}</p>}
        <p className="text-[11px] mt-1 font-mono" style={{ color: "var(--text-tertiary)" }}>{timeStr}</p>
      </div>
      <div className="px-3 py-2 flex flex-col gap-1.5">
        {actions.map((action) => (
          <button
            key={action.label}
            onClick={() => { sendMessage(action.prompt); onClose(); }}
            className="text-left text-[11px] font-mono hover:underline transition-colors"
            style={{ color: "var(--accent-blue)" }}
          >
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
}
