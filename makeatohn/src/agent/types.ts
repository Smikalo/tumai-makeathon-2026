export interface AgentAdapter {
  sendMessage(
    sessionId: string,
    userMessage: string,
    onEvent: (event: AgentEvent) => void
  ): Promise<void>;
  resolveAction(sessionId: string, actionId: string, approved: boolean, input?: string): void;
}

export type AgentEvent =
  | { type: "task_started";   taskId: string; label: string }
  | { type: "trace_line";     taskId: string; line: TraceLine }
  | { type: "chat_message";   message: ChatMessage }
  | { type: "action_request"; action: ActionRequest }
  | { type: "conflict";       conflict: ConflictCard }
  | { type: "task_done";      taskId: string }
  | { type: "task_failed";    taskId: string; error: string }
  | { type: "browser_start" }
  | { type: "browser_retry" };

export interface TraceLine {
  id: string;
  timestamp: string;
  tag: "PLAN" | "TOOL" | "LLM" | "HTTP" | "WARN" | "OK" | "ERR";
  text: string;
  detail?: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  cards?: ChatCard[];
  timestamp: string;
}

export interface ChatCard {
  type: "room_booked" | "summary" | "event_registered" | "conflict" | "info";
  title: string;
  body: string;
  meta?: string;
  link?: string;
}

export interface ActionRequest {
  id: string;
  taskId: string;
  label: string;
  riskLevel: "low" | "medium" | "high";
  detail: string;
  consequence?: string;
  needsInput?: boolean;
  inputPlaceholder?: string;
}

export interface ConflictCard {
  id: string;
  title: string;
  detail: string;
  resolvePrompt: string;
}

export type LogEntryKind = "SUCCESS" | "FAILED" | "REJECTED" | "CONFLICT";

export interface LogEntry {
  id: string;
  kind: LogEntryKind;
  label: string;
  summary?: string;
  taskId?: string;
  durationMs?: number;
  timestamp: string;   // "HH:MM:SS"
}

export interface TaskStatus {
  id: string;
  label: string;
  status: "running" | "done" | "failed" | "queued";
}

export interface Session {
  id: string;
  title: string;
  createdAt: string;
  messages: ChatMessage[];
  trace: TraceLine[];
  pendingAction: ActionRequest | null;
  conflicts: ConflictCard[];
  scheduleEntries: ScheduleEntry[];
  tasks: TaskStatus[];
  logs: LogEntry[];
  isAgentRunning: boolean;
  isLoggedIn: boolean;
  browserStarted: boolean;
  browserRetried: boolean;
}

export interface ScheduleEntry {
  id: string;
  type: "room_booked" | "event_registered" | "task_done" | "conflict";
  title: string;
  time: string;
}
