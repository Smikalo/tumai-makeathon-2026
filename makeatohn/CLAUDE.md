# Campus Co-Pilot — CLAUDE.md

## Project overview
Campus Co-Pilot is a hackathon demo for TUM students. It is an agentic assistant
that helps students manage university logistics: booking rooms, summarizing Moodle
slides, registering for events, detecting schedule conflicts, and similar tasks.

The UI is split into two panels:
- Left: multi-session chat interface where the user types intents and sees results.
  Certain agent actions require explicit user approval before executing (human-in-the-loop).
- Right: live execution trace panel showing every step the agent system takes,
  with timestamps, tool names, HTTP-style calls, and status tags.

There is ONE agentic system — not one agent per feature. The system receives a
user intent, plans tasks, executes tool calls, and streams results back. All of
this is reflected in the trace on the right.

---

## Tech stack
- React 18 with TypeScript
- Vite (not Next.js — keep it simple for hackathon)
- Tailwind CSS
- No UI component library — keep components custom and lean
- No state management library — React context + useReducer is enough

---

## Architecture: the adapter pattern (critical)

All agent I/O goes through a single adapter interface. Right now the adapter
returns mock data. Later it can be swapped for a real backend with zero UI changes.

### The interface (never bypass this)

```ts
// src/agent/types.ts
export interface AgentAdapter {
  sendMessage(
    sessionId: string,
    userMessage: string,
    onEvent: (event: AgentEvent) => void
  ): Promise;
}

export type AgentEvent =
  | { type: "task_started";   taskId: string; label: string }
  | { type: "trace_line";     taskId: string; line: TraceLine }
  | { type: "chat_message";   message: ChatMessage }
  | { type: "action_request"; action: ActionRequest }
  | { type: "conflict";       conflict: ConflictCard }
  | { type: "task_done";      taskId: string }
  | { type: "task_failed";    taskId: string; error: string };

export interface TraceLine {
  id: string;
  timestamp: string;       // "14:02:11"
  tag: "PLAN"|"TOOL"|"LLM"|"HTTP"|"WARN"|"OK"|"ERR";
  text: string;            // e.g. "GET tum.de/roomfinder?building=MI"
  detail?: string;         // optional second line, e.g. response body
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  cards?: ChatCard[];      // inline result cards rendered below the message
  timestamp: string;
}

export interface ChatCard {
  type: "room_booked" | "summary" | "event_registered" | "conflict" | "info";
  title: string;
  body: string;
  meta?: string;
}

export interface ActionRequest {
  id: string;
  taskId: string;
  label: string;            // "Book room MI 02.06.011 for 14:00–16:00?"
  riskLevel: "low" | "medium" | "high";
  detail: string;           // longer description shown to user
  consequence?: string;     // "This will charge your university account."
}

export interface ConflictCard {
  id: string;
  title: string;
  detail: string;
  resolvePrompt: string;    // pre-filled text sent to chat if user clicks Resolve
}
```

### The mock adapter
`src/agent/mockAdapter.ts` — implements AgentAdapter using hardcoded scenario
data with setTimeout to simulate streaming. This is what runs by default.

### Swapping to real backend
To connect a real backend, write `src/agent/httpAdapter.ts` that implements the
same AgentAdapter interface, reading from a server-sent events stream or WebSocket.
Then change one line in `src/agent/index.ts`:

```ts
// src/agent/index.ts
export { mockAdapter as adapter } from "./mockAdapter";
// swap to:
export { httpAdapter as adapter } from "./httpAdapter";
```

No UI code changes required.

---

## State model

### Sessions (multiple chats)
```ts
interface Session {
  id: string;
  title: string;          // auto-generated from first user message
  createdAt: string;
  messages: ChatMessage[];
  trace: TraceLine[];     // all trace lines for this session
  pendingAction: ActionRequest | null;
  conflicts: ConflictCard[];
}
```

All sessions live in a top-level React context (`SessionContext`). The active
session ID is tracked separately. Switching sessions swaps the displayed messages
and trace — do NOT share trace state across sessions.

---

## UI layout

```
┌─────────────────┬────────────────────────────────┐
│  Session list   │                                │
│  (sidebar)      │  [Left panel]  [Right panel]   │
│                 │  Chat          Trace           │
└─────────────────┴────────────────────────────────┘
```

- Sidebar: list of sessions, "New chat" button at top
- Left panel (flex: 1): scrollable message list + input bar at bottom
- Right panel (flex: 1.3): tabbed — "Trace" tab active by default,
  second tab is "Schedule" (a simple timeline of actions taken this session:
  what was booked, registered, or flagged — useful as a session summary)

---

## Human-in-the-loop: action approval

When the agent emits an `action_request` event, the chat renders an approval card
INLINE in the message flow. The user must click Approve or Reject before the agent
continues. The agent adapter must pause (awaiting a promise resolution) until the
user responds. The mock adapter simulates this with a Promise that resolves when
the UI calls `adapter.resolveAction(sessionId, actionId, approved: boolean)`.

Risk level affects the card appearance:
- low: neutral border, no warning text
- medium: amber border, show consequence
- high: coral/red border, show consequence, require typing "confirm" to approve

---

## Trace panel design rules
- Monospace font for all trace lines
- Each line: [timestamp] [TAG badge] [text]
- TAG colors: PLAN=purple, TOOL=blue, LLM=teal, HTTP=gray, OK=green, WARN=amber, ERR=red
- Trace lines stream in — new lines append at the bottom, panel auto-scrolls
- "Ask the trace" section at bottom: 3 quick-action buttons that send pre-filled
  prompts to the chat input

---

## Mock data

All mock scenarios live in `src/agent/scenarios/`. Each scenario is a function
that accepts `(emit: (event: AgentEvent) => void)` and fires events with delays.
Start with one scenario: the "study room + Moodle + workshop" scenario from the demo.

---

## File structure
```
src/
  agent/
    types.ts              # All interfaces (source of truth)
    index.ts              # Exports active adapter
    mockAdapter.ts        # Mock implementation
    httpAdapter.ts        # (stub, not implemented) Real backend adapter
    scenarios/
      studyRoomMoodle.ts  # The main demo scenario
  components/
    layout/
      AppShell.tsx        # Sidebar + main area
      Sidebar.tsx         # Session list
    chat/
      ChatPanel.tsx       # Left panel container
      MessageList.tsx     # Scrollable message area
      MessageBubble.tsx   # Single message with optional cards
      ChatCard.tsx        # Inline result card (room booked, summary, etc.)
      ActionApproval.tsx  # Human-in-the-loop approval card
      ConflictCard.tsx    # Proactive conflict alert card
      ChatInput.tsx       # Bottom input bar
    trace/
      TracePanel.tsx      # Right panel container
      TraceLog.tsx        # Scrollable trace lines
      TraceLine.tsx       # Single trace line
      AskTrace.tsx        # Quick-action buttons at bottom
      ScheduleTab.tsx     # Second tab: session action timeline
  context/
    SessionContext.tsx    # All session state + dispatch
  hooks/
    useAgent.ts           # Connects adapter events to session dispatch
  types/
    index.ts              # Re-exports from agent/types.ts
  App.tsx
  main.tsx
```

---

## Design rules
- Flat design. No gradients, no box-shadows (except focus rings).
- White card surfaces on a light gray page background.
- Minimal 0.5px borders everywhere.
- Two font weights only: 400 (body) and 500 (labels, headings).
- Sentence case everywhere. No Title Case, no ALL CAPS.
- Font sizes: 13px for UI chrome, 14px for chat messages, 12px for trace lines.
- Tailwind only — no inline style blocks unless unavoidable.
- Dark mode: use Tailwind's `dark:` variants on every color class.

---

## What NOT to do
- Do not implement real TUMonline, Moodle, or ZHS integrations — mock only for now.
- Do not use a state management library (Redux, Zustand, etc.).
- Do not use an animation library — CSS transitions only.
- Do not put business logic inside React components — keep components dumb,
  logic in hooks and the adapter layer.
- Do not hardcode agent behavior inside UI components — always go through the adapter.
