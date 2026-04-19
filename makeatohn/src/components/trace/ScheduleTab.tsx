import type { ScheduleEntry } from "../../types";
import { WeeklyCalendar } from "./WeeklyCalendar";

interface Props {
  entries: ScheduleEntry[];
  sendMessage: (msg: string) => void;
}

export function ScheduleTab({ entries, sendMessage }: Props) {
  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      <WeeklyCalendar sessionEntries={entries} sendMessage={sendMessage} />
    </div>
  );
}
