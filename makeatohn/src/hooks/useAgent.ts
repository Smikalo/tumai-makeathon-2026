import { useCallback, useRef } from "react";
import { adapter } from "../agent";
import { useSession } from "../context/SessionContext";
import type { AgentEvent, ChatMessage, LogEntry, ScheduleEntry } from "../types";

function nowTimestamp(): string {
  return new Date().toTimeString().slice(0, 8); // "HH:MM:SS"
}

export function useAgent() {
  const { activeSessionId, dispatch } = useSession();
  const sessionRef = useRef(activeSessionId);
  sessionRef.current = activeSessionId;

  // Refs for log entry derivation — no re-renders needed
  const taskStartTimesRef = useRef<Map<string, number>>(new Map());
  const taskLabelsRef = useRef<Map<string, string>>(new Map());
  const lastOkLineRef = useRef<Map<string, string>>(new Map());
  const pendingActionsRef = useRef<Map<string, { label: string; taskId: string }>>(new Map());
  const rejectedTaskIdsRef = useRef<Set<string>>(new Set());

  const sendMessage = useCallback(
    async (userMessage: string) => {
      const sessionId = sessionRef.current;

      // Clear per-run refs for this session
      taskStartTimesRef.current.clear();
      taskLabelsRef.current.clear();
      lastOkLineRef.current.clear();
      pendingActionsRef.current.clear();
      rejectedTaskIdsRef.current.clear();

      const userMsg: ChatMessage = {
        id: `msg-user-${Date.now()}`,
        role: "user",
        content: userMessage,
        timestamp: new Date().toTimeString().slice(0, 5),
      };
      dispatch({ type: "ADD_MESSAGE", sessionId, message: userMsg });
      dispatch({ type: "SET_TITLE", sessionId, title: userMessage.slice(0, 40) });
      dispatch({ type: "SET_AGENT_RUNNING", sessionId, running: true });

      const onEvent = (event: AgentEvent) => {
        switch (event.type) {
          case "task_started":
            taskStartTimesRef.current.set(event.taskId, Date.now());
            taskLabelsRef.current.set(event.taskId, event.label);
            dispatch({ type: "TASK_STARTED", sessionId, taskId: event.taskId, label: event.label });
            break;

          case "task_done": {
            dispatch({ type: "TASK_DONE", sessionId, taskId: event.taskId });
            if (!rejectedTaskIdsRef.current.has(event.taskId)) {
              const startTime = taskStartTimesRef.current.get(event.taskId);
              const label = taskLabelsRef.current.get(event.taskId) ?? "Task";
              const summary = lastOkLineRef.current.get(event.taskId);
              const entry: LogEntry = {
                id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
                kind: "SUCCESS",
                label,
                summary,
                taskId: event.taskId,
                durationMs: startTime ? Date.now() - startTime : undefined,
                timestamp: nowTimestamp(),
              };
              dispatch({ type: "ADD_LOG_ENTRY", sessionId, entry });
            }
            break;
          }

          case "task_failed": {
            dispatch({ type: "TASK_FAILED", sessionId, taskId: event.taskId });
            const startTime = taskStartTimesRef.current.get(event.taskId);
            const label = taskLabelsRef.current.get(event.taskId) ?? "Task";
            const entry: LogEntry = {
              id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
              kind: "FAILED",
              label,
              summary: event.error,
              taskId: event.taskId,
              durationMs: startTime ? Date.now() - startTime : undefined,
              timestamp: nowTimestamp(),
            };
            dispatch({ type: "ADD_LOG_ENTRY", sessionId, entry });
            break;
          }

          case "trace_line":
            if (event.line.tag === "OK") {
              lastOkLineRef.current.set(event.taskId, event.line.text);
            }
            dispatch({ type: "ADD_TRACE", sessionId, line: event.line });
            break;

          case "chat_message":
            dispatch({ type: "ADD_MESSAGE", sessionId, message: event.message });
            if (event.message.cards) {
              for (const card of event.message.cards) {
                if (card.type === "room_booked" || card.type === "event_registered") {
                  const schedEntry: ScheduleEntry = {
                    id: `se-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
                    type: card.type,
                    title: card.title,
                    time: card.body,
                  };
                  dispatch({ type: "ADD_SCHEDULE_ENTRY", sessionId, entry: schedEntry });
                }
              }
            }
            break;

          case "action_request":
            pendingActionsRef.current.set(event.action.id, {
              label: event.action.label,
              taskId: event.action.taskId,
            });
            dispatch({ type: "SET_PENDING_ACTION", sessionId, action: event.action });
            break;

          case "browser_start":
            dispatch({ type: "BROWSER_START", sessionId });
            break;
          case "login_success" as any:
            dispatch({ type: "SET_LOGGED_IN", sessionId, loggedIn: true });
            break;
          case "browser_retry":
            dispatch({ type: "BROWSER_RETRY", sessionId });
            break;

          case "conflict": {
            dispatch({ type: "ADD_CONFLICT", sessionId, conflict: event.conflict });
            const conflictEntry: LogEntry = {
              id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
              kind: "CONFLICT",
              label: event.conflict.title,
              summary: event.conflict.detail,
              timestamp: nowTimestamp(),
            };
            dispatch({ type: "ADD_LOG_ENTRY", sessionId, entry: conflictEntry });
            break;
          }
        }
      };

      await adapter.sendMessage(sessionId, userMessage, onEvent);
      dispatch({ type: "SET_AGENT_RUNNING", sessionId, running: false });
    },
    [dispatch]
  );

  const resolveAction = useCallback(
    (actionId: string, approved: boolean, input?: string) => {
      const sessionId = sessionRef.current;
      dispatch({ type: "SET_PENDING_ACTION", sessionId, action: null });

      if (!approved) {
        const info = pendingActionsRef.current.get(actionId);
        if (info) {
          rejectedTaskIdsRef.current.add(info.taskId);
          const entry: LogEntry = {
            id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
            kind: "REJECTED",
            label: info.label,
            summary: "User rejected this action",
            taskId: info.taskId,
            timestamp: nowTimestamp(),
          };
          dispatch({ type: "ADD_LOG_ENTRY", sessionId, entry });
        }
      }

      adapter.resolveAction(sessionId, actionId, approved, input);
    },
    [dispatch]
  );

  const dismissConflict = useCallback(
    (conflictId: string) => {
      const sessionId = sessionRef.current;
      dispatch({ type: "REMOVE_CONFLICT", sessionId, conflictId });
    },
    [dispatch]
  );

  return { sendMessage, resolveAction, dismissConflict };
}
