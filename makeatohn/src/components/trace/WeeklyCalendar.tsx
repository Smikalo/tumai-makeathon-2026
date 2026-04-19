import { useState, useRef, useEffect } from "react";
import type { ScheduleEntry } from "../../types";
import {
  MOCK_EVENTS, getWeekDates, isSameDay, sessionEntryToEvent,
  formatTime, type CalendarEvent, type CalendarEventKind,
} from "./calendarData";
import { EventPopover } from "./EventPopover";

interface Props {
  sessionEntries: ScheduleEntry[];
  sendMessage: (msg: string) => void;
}

const GRID_START_HOUR = 8;
const GRID_END_HOUR = 20;
const TOTAL_SLOTS = (GRID_END_HOUR - GRID_START_HOUR) * 4;
const ROW_HEIGHT_PX = 14;
const HOURS = Array.from({ length: GRID_END_HOUR - GRID_START_HOUR }, (_, i) => GRID_START_HOUR + i);
const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const kindStyles: Record<CalendarEventKind, { bg: string; leftBorder: string; text: string }> = {
  course:           { bg: "rgba(59,130,246,0.12)",  leftBorder: "#3b82f6", text: "#93c5fd" },
  tutor:            { bg: "rgba(168,85,247,0.12)",  leftBorder: "#a855f7", text: "#d8b4fe" },
  personal:         { bg: "rgba(20,184,166,0.12)",  leftBorder: "#14b8a6", text: "#5eead4" },
  room_booked:      { bg: "rgba(20,184,166,0.08)",  leftBorder: "#14b8a6", text: "#5eead4" },
  event_registered: { bg: "rgba(59,130,246,0.08)",  leftBorder: "#3b82f6", text: "#93c5fd" },
};

function formatDayLabel(date: Date): string {
  return `${DAY_NAMES[date.getDay() - 1]} ${MONTH_NAMES[date.getMonth()]} ${date.getDate()}`;
}

function DayPopover({
  date, dayLabel, eventsOnDay, onClose, sendMessage, flipLeft,
}: {
  date: Date; dayLabel: string; eventsOnDay: CalendarEvent[];
  onClose: () => void; sendMessage: (msg: string) => void; flipLeft: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const keyHandler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", keyHandler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("keydown", keyHandler);
    };
  }, [onClose]);

  const moveableCount = eventsOnDay.filter((e) => e.moveable).length;

  const actions = [
    { label: "Make this day easier →", prompt: `My ${dayLabel} looks heavy. I have ${eventsOnDay.length} items scheduled. What can I drop, delegate, or reschedule?` },
    { label: "What's free on this day? →", prompt: `Show me the free time slots on ${dayLabel} so I can schedule something.` },
    { label: "Find a tutor on this day →", prompt: `Find me a tutor available on ${dayLabel}.` },
    ...(moveableCount > 0 ? [{ label: "Reschedule something here →", prompt: `Reschedule one of my moveable events on ${dayLabel}. There are ${moveableCount} flexible items.` }] : []),
    { label: "Book a study room →", prompt: `Book me a study room on ${dayLabel}.` },
  ];

  return (
    <div
      ref={ref}
      className={`absolute top-full mt-1 z-50 w-52 rounded-lg shadow-xl ${flipLeft ? "right-0" : "left-0"}`}
      style={{ background: "var(--bg-card)", border: "1px solid var(--border-card)" }}
    >
      <div className="px-3 pt-3 pb-2" style={{ borderBottom: "1px solid var(--border-panel)" }}>
        <p className="text-[12px] font-medium" style={{ color: "var(--text-primary)" }}>{dayLabel}</p>
        <p className="text-[11px] mt-0.5" style={{ color: "var(--text-tertiary)" }}>{eventsOnDay.length} events · {moveableCount} flexible</p>
        <p className="text-[11px] mt-0.5" style={{ color: "var(--text-tertiary)" }}>{date.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}</p>
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

export function WeeklyCalendar({ sessionEntries, sendMessage }: Props) {
  const today = new Date();
  const weekDates = getWeekDates(today);
  const [activeEventId, setActiveEventId] = useState<string | null>(null);
  const [activeDayIndex, setActiveDayIndex] = useState<number | null>(null);
  const eventPopoverRef = useRef<HTMLDivElement>(null);

  const sessionEvents = sessionEntries
    .map((e) => sessionEntryToEvent(e, weekDates))
    .filter((e): e is CalendarEvent => e !== null);
  const allEvents = [...MOCK_EVENTS, ...sessionEvents];

  const activeEvent = allEvents.find((e) => e.id === activeEventId) ?? null;
  const todayDayIndex = weekDates.findIndex((d) => isSameDay(d, today));

  const closeAll = () => { setActiveEventId(null); setActiveDayIndex(null); };

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--bg-panel)" }}>
      {/* Calendar header */}
      <div
        className="px-3 pt-2.5 pb-2 flex items-center justify-between shrink-0"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
      >
        <div>
          <p className="text-[12px] font-medium text-app-fg">
            Week of {MONTH_NAMES[weekDates[0].getMonth()]} {weekDates[0].getDate()}
          </p>
          <div className="flex gap-3 mt-1">
            {(["course", "tutor", "personal"] as CalendarEventKind[]).map((k) => (
              <span key={k} className="text-[10px] font-medium flex items-center gap-1" style={{ color: kindStyles[k].text }}>
                <span className="inline-block w-2 h-2 rounded-sm" style={{ background: kindStyles[k].bg, borderLeft: `2px solid ${kindStyles[k].leftBorder}` }} />
                {k}
              </span>
            ))}
          </div>
        </div>
        <button
          onClick={() => sendMessage("My schedule today looks heavy — what non-essential events can I drop or delegate to make it lighter?")}
          className="text-[11px] font-medium text-tum-light hover:underline transition-colors whitespace-nowrap"
        >
          Make today lighter →
        </button>
      </div>

      {/* Scrollable grid */}
      <div className="flex-1 overflow-y-auto calendar-scroll">
        {/* Day header row */}
        <div
          style={{ display: "grid", gridTemplateColumns: "40px repeat(5, 1fr)", borderBottom: "1px solid var(--border-panel)", position: "sticky", top: 0, zIndex: 10, background: "var(--bg-panel)" }}
        >
          <div />
          {weekDates.map((date, i) => {
            const isToday = i === todayDayIndex;
            const isActive = activeDayIndex === i;
            const eventsOnDay = allEvents.filter((e) => e.day === i);
            const flipLeft = i >= 3;

            return (
              <div key={i} className="relative">
                <button
                  onClick={() => { setActiveEventId(null); setActiveDayIndex(isActive ? null : i); }}
                  className="w-full text-center py-1.5 transition-colors"
                  style={isActive ? { background: "rgba(255,255,255,0.05)" } : undefined}
                >
                  <div className="text-[11px] font-medium" style={{ color: isToday ? "#64A0C8" : "#55556a" }}>
                    {DAY_NAMES[i]}
                  </div>
                  <div className="text-[13px] font-medium leading-tight" style={{ color: isToday ? "#64A0C8" : "#f0f0f0" }}>
                    {date.getDate()}
                  </div>
                </button>
                {isActive && (
                  <DayPopover
                    date={date}
                    dayLabel={formatDayLabel(date)}
                    eventsOnDay={eventsOnDay}
                    onClose={() => setActiveDayIndex(null)}
                    sendMessage={sendMessage}
                    flipLeft={flipLeft}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Time grid */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "40px repeat(5, 1fr)",
          gridTemplateRows: `repeat(${TOTAL_SLOTS}, ${ROW_HEIGHT_PX}px)`,
          position: "relative",
        }}>
          {/* Hour lines */}
          {HOURS.map((_, hi) => (
            <div key={`line-${hi}`} style={{ gridColumn: "1 / 7", gridRow: hi * 4 + 1, borderTop: "1px solid rgba(255,255,255,0.04)" }} className="pointer-events-none" />
          ))}

          {/* Time labels */}
          {HOURS.map((hour, hi) => (
            <div key={`label-${hour}`} style={{ gridColumn: 1, gridRow: hi * 4 + 1, color: "#55556a", fontSize: "10px", paddingLeft: "4px", paddingTop: "2px", lineHeight: 1, fontFamily: "JetBrains Mono, monospace" }} className="pointer-events-none select-none">
              {hour}:00
            </div>
          ))}

          {/* Today column tint */}
          {todayDayIndex >= 0 && (
            <div style={{ gridColumn: todayDayIndex + 2, gridRow: `1 / span ${TOTAL_SLOTS}`, background: "rgba(100,160,200,0.04)" }} className="pointer-events-none" />
          )}

          {/* Events */}
          {allEvents.map((event) => {
            const row = Math.floor(event.startMinute / 15) + 1;
            const span = Math.max(1, Math.floor(event.durationMinutes / 15));
            const col = event.day + 2;
            const s = kindStyles[event.kind];
            const isActive = activeEventId === event.id;
            const flipLeft = event.day >= 3;

            return (
              <div key={event.id} style={{ gridColumn: col, gridRow: `${row} / span ${span}` }} className="relative px-0.5 py-0.5">
                <button
                  onClick={() => { setActiveDayIndex(null); setActiveEventId(isActive ? null : event.id); }}
                  className="w-full h-full rounded text-left overflow-hidden px-1.5 py-1 transition-opacity hover:opacity-80"
                  style={{
                    background: s.bg,
                    borderLeft: `2px solid ${s.leftBorder}`,
                    outline: isActive ? `1px solid ${s.leftBorder}` : "none",
                    outlineOffset: "1px",
                  }}
                >
                  <p className="text-[10px] font-medium leading-tight truncate" style={{ color: s.text }}>{event.title}</p>
                  {span >= 6 && event.subtitle && (
                    <p className="text-[9px] leading-tight truncate mt-0.5 opacity-70" style={{ color: s.text }}>{event.subtitle}</p>
                  )}
                  {span >= 4 && (
                    <p className="text-[9px] font-mono leading-tight mt-0.5 opacity-50" style={{ color: s.text }}>
                      {formatTime(event.startMinute, event.durationMinutes)}
                    </p>
                  )}
                </button>

                {isActive && activeEvent && (
                  <EventPopover
                    event={activeEvent}
                    dayLabel={formatDayLabel(weekDates[event.day])}
                    onClose={() => setActiveEventId(null)}
                    sendMessage={sendMessage}
                    popoverRef={eventPopoverRef}
                    flipLeft={flipLeft}
                  />
                )}
              </div>
            );
          })}

          {(activeEventId || activeDayIndex !== null) && (
            <div
              style={{ gridColumn: "1 / 7", gridRow: `1 / span ${TOTAL_SLOTS}`, zIndex: 0 }}
              className="pointer-events-auto"
              onClick={closeAll}
            />
          )}
        </div>
      </div>
    </div>
  );
}
