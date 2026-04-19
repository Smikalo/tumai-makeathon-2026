import { createContext, useContext, useReducer, type ReactNode } from "react";
import type {
  Session, ChatMessage, TraceLine, ActionRequest,
  ConflictCard, ScheduleEntry, TaskStatus, LogEntry,
} from "../types";

function makeSessionId() {
  return `s-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function makeDefaultSession(): Session {
  return {
    id: makeSessionId(),
    title: "New session",
    createdAt: new Date().toISOString(),
    messages: [],
    trace: [],
    pendingAction: null,
    conflicts: [],
    scheduleEntries: [],
    tasks: [],
    logs: [],
    isAgentRunning: false,
    isLoggedIn: false,
    browserStarted: false,
    browserRetried: false,
  };
}

type Action =
  | { type: "NEW_SESSION" }
  | { type: "SET_ACTIVE"; sessionId: string }
  | { type: "ADD_MESSAGE"; sessionId: string; message: ChatMessage }
  | { type: "ADD_TRACE"; sessionId: string; line: TraceLine }
  | { type: "SET_PENDING_ACTION"; sessionId: string; action: ActionRequest | null }
  | { type: "ADD_CONFLICT"; sessionId: string; conflict: ConflictCard }
  | { type: "REMOVE_CONFLICT"; sessionId: string; conflictId: string }
  | { type: "SET_TITLE"; sessionId: string; title: string }
  | { type: "ADD_SCHEDULE_ENTRY"; sessionId: string; entry: ScheduleEntry }
  | { type: "TASK_STARTED"; sessionId: string; taskId: string; label: string }
  | { type: "TASK_DONE"; sessionId: string; taskId: string }
  | { type: "TASK_FAILED"; sessionId: string; taskId: string }
  | { type: "SET_AGENT_RUNNING"; sessionId: string; running: boolean }
  | { type: "SET_LOGGED_IN"; sessionId: string; loggedIn: boolean }
  | { type: "ADD_LOG_ENTRY"; sessionId: string; entry: LogEntry }
  | { type: "BROWSER_START"; sessionId: string }
  | { type: "BROWSER_RETRY"; sessionId: string };

interface State {
  sessions: Session[];
  activeSessionId: string;
}

function updateSession(state: State, sessionId: string, fn: (s: Session) => Session): State {
  return {
    ...state,
    sessions: state.sessions.map((s) => s.id === sessionId ? fn(s) : s),
  };
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "NEW_SESSION": {
      const session = makeDefaultSession();
      return { sessions: [session, ...state.sessions], activeSessionId: session.id };
    }
    case "SET_ACTIVE":
      return { ...state, activeSessionId: action.sessionId };
    case "ADD_MESSAGE":
      return updateSession(state, action.sessionId, (s) => ({
        ...s, messages: [...s.messages, action.message],
      }));
    case "ADD_TRACE":
      return updateSession(state, action.sessionId, (s) => ({
        ...s, trace: [...s.trace, action.line],
      }));
    case "SET_PENDING_ACTION":
      return updateSession(state, action.sessionId, (s) => ({
        ...s, pendingAction: action.action,
      }));
    case "ADD_CONFLICT":
      return updateSession(state, action.sessionId, (s) => ({
        ...s, conflicts: [...s.conflicts, action.conflict],
      }));
    case "REMOVE_CONFLICT":
      return updateSession(state, action.sessionId, (s) => ({
        ...s, conflicts: s.conflicts.filter((c) => c.id !== action.conflictId),
      }));
    case "SET_TITLE":
      return updateSession(state, action.sessionId, (s) => ({ ...s, title: action.title }));
    case "ADD_SCHEDULE_ENTRY":
      return updateSession(state, action.sessionId, (s) => ({
        ...s, scheduleEntries: [...s.scheduleEntries, action.entry],
      }));
    case "TASK_STARTED":
      return updateSession(state, action.sessionId, (s) => {
        const existing = s.tasks.find((t) => t.id === action.taskId);
        if (existing) return s;
        const task: TaskStatus = { id: action.taskId, label: action.label, status: "running" };
        return { ...s, tasks: [...s.tasks, task] };
      });
    case "TASK_DONE":
      return updateSession(state, action.sessionId, (s) => ({
        ...s, tasks: s.tasks.map((t) =>
          t.id === action.taskId ? { ...t, status: "done" } : t
        ),
      }));
    case "TASK_FAILED":
      return updateSession(state, action.sessionId, (s) => ({
        ...s, tasks: s.tasks.map((t) =>
          t.id === action.taskId ? { ...t, status: "failed" } : t
        ),
      }));
    case "SET_AGENT_RUNNING":
      return updateSession(state, action.sessionId, (s) => ({
        ...s, isAgentRunning: action.running,
      }));
    case "SET_LOGGED_IN":
      return updateSession(state, action.sessionId, (s) => ({
        ...s, isLoggedIn: action.loggedIn,
      }));
    case "ADD_LOG_ENTRY":
      return updateSession(state, action.sessionId, (s) => ({
        ...s, logs: [...s.logs, action.entry],
      }));
    case "BROWSER_START":
      return updateSession(state, action.sessionId, (s) => ({
        ...s, browserStarted: true,
      }));
    case "BROWSER_RETRY":
      return updateSession(state, action.sessionId, (s) => ({
        ...s, browserRetried: true,
      }));
    default:
      return state;
  }
}

interface SessionContextValue {
  sessions: Session[];
  activeSessionId: string;
  activeSession: Session | null;
  dispatch: React.Dispatch<Action>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

const initialSession = makeDefaultSession();
const initialState: State = {
  sessions: [initialSession],
  activeSessionId: initialSession.id,
};

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const activeSession = state.sessions.find((s) => s.id === state.activeSessionId) ?? null;

  return (
    <SessionContext.Provider value={{ sessions: state.sessions, activeSessionId: state.activeSessionId, activeSession, dispatch }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within SessionProvider");
  return ctx;
}
