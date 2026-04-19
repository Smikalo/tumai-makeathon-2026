import type { ScheduleEntry } from "../../types";

export type CalendarEventKind =
  | "course"
  | "tutor"
  | "personal"
  | "room_booked"
  | "event_registered";

export interface CalendarEvent {
  id: string;
  title: string;
  subtitle?: string;
  kind: CalendarEventKind;
  day: 0 | 1 | 2 | 3 | 4; // 0=Mon … 4=Fri
  startMinute: number;     // minutes since 08:00
  durationMinutes: number;
  moveable: boolean;
}

export function getWeekDates(today: Date): Date[] {
  const d = new Date(today);
  const dow = d.getDay();
  let daysToMon: number;
  if (dow === 0) daysToMon = 1;
  else if (dow === 6) daysToMon = 2;
  else daysToMon = -(dow - 1);
  d.setDate(d.getDate() + daysToMon);
  d.setHours(0, 0, 0, 0);
  return Array.from({ length: 5 }, (_, i) => {
    const day = new Date(d);
    day.setDate(d.getDate() + i);
    return day;
  });
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function formatTime(startMinute: number, durationMinutes: number): string {
  const toHHMM = (m: number) => {
    const h = Math.floor((m + 480) / 60);
    const min = (m + 480) % 60;
    return `${h}:${String(min).padStart(2, "0")}`;
  };
  return `${toHHMM(startMinute)}–${toHHMM(startMinute + durationMinutes)}`;
}

// REMOVED HARDCODED MOCK_EVENTS
export const MOCK_EVENTS: CalendarEvent[] = [];

const DAY_INDEX: Record<string, 0 | 1 | 2 | 3 | 4> = {
  monday: 0, mon: 0,
  tuesday: 1, tue: 1,
  wednesday: 2, wed: 2,
  thursday: 3, thu: 3,
  friday: 4, fri: 4,
};

function parseTimeToMinutes(hhmm: string): number | null {
  const [h, m] = hhmm.split(":").map(Number);
  if (isNaN(h) || isNaN(m)) return null;
  return (h * 60 + m) - 480;
}

export function sessionEntryToEvent(
  entry: ScheduleEntry,
  weekDates: Date[]
): CalendarEvent | null {
  const kind: CalendarEventKind =
    entry.type === "room_booked" ? "room_booked" : 
    entry.type === "event_registered" ? "event_registered" : "course";

  const lowerTime = entry.time.toLowerCase();
  let dayIndex: 0 | 1 | 2 | 3 | 4 | null = null;

  if (lowerTime.includes("today")) {
    const today = new Date();
    for (let i = 0; i < weekDates.length; i++) {
      if (isSameDay(weekDates[i], today)) {
        dayIndex = i as 0 | 1 | 2 | 3 | 4;
        break;
      }
    }
    if (dayIndex === null) dayIndex = 0;
  } else {
    for (const [name, idx] of Object.entries(DAY_INDEX)) {
      if (lowerTime.includes(name)) {
        dayIndex = idx;
        break;
      }
    }
  }
  if (dayIndex === null) return null;

  const timeMatch = entry.time.match(/(\d{1,2}:\d{2})(?:[–-](\d{1,2}:\d{2}))?/);
  if (!timeMatch) return null;

  const startMin = parseTimeToMinutes(timeMatch[1]);
  if (startMin === null || startMin < 0) return null;

  let duration = 60;
  if (timeMatch[2]) {
    const endMin = parseTimeToMinutes(timeMatch[2]);
    if (endMin !== null && endMin > startMin) duration = endMin - startMin;
  }

  return {
    id: `session-${entry.id}`,
    title: entry.title,
    kind,
    day: dayIndex,
    startMinute: startMin,
    durationMinutes: duration,
    moveable: false,
  };
}
