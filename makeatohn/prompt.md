Read CLAUDE.md fully before writing any code.

I'm building Campus Co-Pilot — a hackathon demo described in CLAUDE.md. Scaffold
the full project now. I want everything in the file structure defined there, with
each file implemented (not stubbed) except httpAdapter.ts which can be an empty
stub with a TODO comment.

## What to implement in this first pass

### 1. Vite + React + TypeScript + Tailwind setup
Scaffold with `npm create vite@latest . -- --template react-ts`, then install
Tailwind following the Vite guide. Do not use Next.js.

### 2. All types in src/agent/types.ts
Implement every interface from CLAUDE.md exactly as defined. This is the source
of truth — nothing in the UI should import types from anywhere else.

### 3. Mock adapter with one full scenario
Implement `src/agent/mockAdapter.ts` with `src/agent/scenarios/studyRoomMoodle.ts`.

The scenario fires the following sequence of events when the user sends any message
(ignore the actual message content for now — always run the same demo scenario):

Timing (all relative to message send):
- 0ms:    task_started { taskId: "t1", label: "Planning tasks" }
- 100ms:  trace_line PLAN "Decomposed 3 goals → room booking, Moodle summary, event registration"
- 400ms:  trace_line TOOL "Spawning tool: tum_roomfinder"
- 800ms:  trace_line HTTP "GET tum.de/roomfinder?building=MI&from=14:00&duration=120"
- 1200ms: trace_line OK   "← 200 OK · 4 rooms available · ranked by proximity"
- 1400ms: action_request {
            id: "ar1", taskId: "t1",
            label: "Book room MI 02.06.011 for 14:00–16:00?",
            riskLevel: "low",
            detail: "Closest available room to math building. Capacity 6.",
            consequence: undefined
          }
  (pause here — wait for user approval)
- on approve +300ms: trace_line HTTP "POST tum.de/booking { room: '02.06.011', from: '14:00', to: '16:00' }"
- on approve +700ms: trace_line OK   "← 200 OK · Confirmation #RB-8841"
- on approve +800ms: chat_message (assistant) "Done! I booked **MI 02.06.011** for 14:00–16:00."
                     with card: { type: "room_booked", title: "MI 02.06.011", body: "Today · 14:00–16:00", meta: "Conf. #RB-8841" }
- on reject +200ms:  chat_message (assistant) "No problem — I skipped the room booking."

- 2000ms (regardless of approval): task_started { taskId: "t2", label: "Fetching Moodle slides" }
- 2100ms: trace_line TOOL "Spawning tool: moodle_fetcher"
- 2300ms: trace_line HTTP "GET moodle.tum.de/course/view.php?id=IN0015"
- 2700ms: trace_line OK   "← 3 PDFs · 47 slides"
- 2800ms: trace_line LLM  "Invoking LLM: summarize 47 slides (chunk 1/3)"
- 3500ms: trace_line LLM  "Invoking LLM: summarize 47 slides (chunk 2/3)"
- 4200ms: trace_line LLM  "Invoking LLM: summarize 47 slides (chunk 3/3)"
- 4400ms: trace_line OK   "← Summary generated · 340 words"
- 4600ms: task_done { taskId: "t2" }
- 4700ms: chat_message (assistant) "Here's your Discrete Math summary for this week:"
          with card: { type: "summary", title: "Discrete Math — Week 8", body: "Topics: graph coloring, chromatic polynomials, planarity. Key theorem: four-color theorem proof sketch. 2 new exercise sheets added.", meta: "3 PDFs · 47 slides" }

- 5000ms: task_started { taskId: "t3", label: "Registering for Reply workshop" }
- 5100ms: trace_line TOOL "Spawning tool: tum_event_register"
- 5300ms: trace_line HTTP "GET tum.de/events?search=Reply+workshop"
- 5600ms: trace_line OK   "← Event found: Reply Makeathon Workshop · Tue 19:00 · 12 spots left"
- 5800ms: action_request {
            id: "ar2", taskId: "t3",
            label: "Register for Reply Workshop on Tuesday at 19:00?",
            riskLevel: "medium",
            detail: "12 spots remaining. Registration is binding.",
            consequence: "You will receive a confirmation email from TUMonline."
          }
  (pause here — wait for user approval)
- on approve +400ms: trace_line HTTP "POST tum.de/events/register { eventId: 'EV-441' }"
- on approve +800ms: trace_line OK   "← 200 OK · Registered"
- on approve +900ms: chat_message (assistant) "Registered! The Reply workshop is in your calendar."
                     with card: { type: "event_registered", title: "Reply Workshop", body: "Tuesday · 19:00 · Room MI HS 1", meta: "12 → 11 spots" }

- 6500ms: conflict {
            id: "c1",
            title: "S4 delay may affect your gym slot",
            detail: "S-Bahn S4 is running +22 min tonight. Your gym booking at ZHS Stachus starts at 17:30.",
            resolvePrompt: "The S4 is delayed 22 minutes tonight — should I push my gym slot back or cancel it?"
          }

Pre-fill the chat input on load with:
"Find me a study room near the math building at 2 PM, summarize this week's Moodle
slides for discrete math, and sign me up for the Reply workshop on Tuesday."

### 4. Session management
- SessionContext stores an array of Session objects
- New session created on "New chat" button click
- First message in a session auto-generates the session title (first 40 chars of user message)
- Switching sessions in the sidebar instantly swaps the chat and trace panels
- Start with one default session on load

### 5. UI components — implement all of them per CLAUDE.md file structure

ChatPanel:
- Scrollable MessageList (auto-scroll to bottom on new messages)
- MessageBubble: user messages right-aligned (light gray bg), assistant messages
  left-aligned (white bg with border)
- ChatCard renders below an assistant message — card types:
  room_booked (teal accent), summary (purple accent), event_registered (blue accent),
  conflict (amber accent), info (gray accent)
- ActionApproval renders inline in the message flow as a card with Approve/Reject buttons.
  Medium risk shows the consequence text. High risk requires typing "confirm".
- ConflictCard renders at the bottom of the message list (above the input bar) as a
  sticky amber-bordered card. Has a "Resolve ↗" button that copies resolvePrompt into
  the input.
- ChatInput: full-width input at bottom, send on Enter or button click. Disabled while
  an action_request is pending.

TracePanel (right panel):
- Tab 1 "Trace": scrollable list of TraceLine components. Auto-scrolls to bottom.
  Each line: timestamp (muted), TAG badge (colored), text. Detail on second line if present.
  TAG color map: PLAN=purple, TOOL=blue, LLM=teal, HTTP=gray, OK=green, WARN=amber, ERR=red
- Tab 2 "Schedule": simple vertical timeline of completed actions this session.
  Each entry shows an icon, title, and time. Entries are added when task_done fires
  or when a room_booked/event_registered card is emitted.
- AskTrace: fixed at the bottom of the trace panel (below the tabs). 3 buttons:
  "Why this room? →" "Preview summary →" "Replay trace →"
  Each button copies a pre-filled question into the chat input.

Sidebar:
- "Campus Co-Pilot" header at top
- "New chat" button
- List of sessions showing title and relative time ("2 min ago")
- Active session highlighted

### 6. Tailwind dark mode
Use `class` strategy. Add dark: variants for every background, text, and border color.
Keep it consistent — don't mix light-only styles with dark: overrides.

---

## Deliverable
After implementing, run `npm run dev` and confirm there are no TypeScript errors
or console errors. Then tell me what you built and what I should test first.

Do NOT implement httpAdapter.ts beyond an empty stub. Do NOT connect to any real
API. Do NOT add routing — single page is fine.
