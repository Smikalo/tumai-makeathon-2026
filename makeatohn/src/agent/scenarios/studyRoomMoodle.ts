import type { AgentEvent, TraceLine } from "../types";

let traceCounter = 0;
function makeTrace(tag: TraceLine["tag"], text: string, detail?: string): TraceLine {
  const now = new Date();
  const timestamp = now.toTimeString().slice(0, 8);
  return {
    id: `trace-${++traceCounter}-${Date.now()}`,
    timestamp,
    tag,
    text,
    detail,
  };
}

function msgId() {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function delay(ms: number): Promise<void> {
  return new Promise((res) => setTimeout(res, ms));
}

export async function runStudyRoomMoodleScenario(
  emit: (event: AgentEvent) => void,
  waitForAction: (actionId: string) => Promise<boolean>
): Promise<void> {
  // t1: room booking
  emit({ type: "task_started", taskId: "t1", label: "Planning tasks" });

  await delay(100);
  emit({ type: "trace_line", taskId: "t1", line: makeTrace("PLAN", "Decomposed 3 goals → room booking, Moodle summary, event registration") });

  await delay(300);
  emit({ type: "trace_line", taskId: "t1", line: makeTrace("TOOL", "Spawning tool: tum_roomfinder") });

  await delay(400);
  emit({ type: "trace_line", taskId: "t1", line: makeTrace("HTTP", "GET tum.de/roomfinder?building=MI&from=14:00&duration=120") });

  await delay(400);
  emit({ type: "trace_line", taskId: "t1", line: makeTrace("OK", "← 200 OK · 4 rooms available · ranked by proximity") });

  await delay(200);
  const ar1Id = "ar1";
  emit({
    type: "action_request",
    action: {
      id: ar1Id,
      taskId: "t1",
      label: "Book room MI 02.06.011 for 14:00–16:00?",
      riskLevel: "low",
      detail: "Closest available room to math building. Capacity 6.",
      consequence: undefined,
    },
  });

  // pause until user approves/rejects
  const approved1 = await waitForAction(ar1Id);

  if (approved1) {
    await delay(300);
    emit({ type: "trace_line", taskId: "t1", line: makeTrace("HTTP", "POST tum.de/booking { room: '02.06.011', from: '14:00', to: '16:00' }") });
    await delay(400);
    emit({ type: "trace_line", taskId: "t1", line: makeTrace("OK", "← 200 OK · Confirmation #RB-8841") });
    await delay(100);
    emit({
      type: "chat_message",
      message: {
        id: msgId(),
        role: "assistant",
        content: "Done! I booked **MI 02.06.011** for 14:00–16:00.",
        cards: [
          { type: "room_booked", title: "MI 02.06.011", body: "Today · 14:00–16:00", meta: "Conf. #RB-8841" },
        ],
        timestamp: new Date().toTimeString().slice(0, 5),
      },
    });
  } else {
    await delay(200);
    emit({
      type: "chat_message",
      message: {
        id: msgId(),
        role: "assistant",
        content: "No problem — I skipped the room booking.",
        timestamp: new Date().toTimeString().slice(0, 5),
      },
    });
  }

  emit({ type: "task_done", taskId: "t1" });

  // t2: Moodle
  await delay(200);
  emit({ type: "task_started", taskId: "t2", label: "Fetching Moodle slides" });
  await delay(100);
  emit({ type: "trace_line", taskId: "t2", line: makeTrace("TOOL", "Spawning tool: moodle_fetcher") });
  await delay(200);
  emit({ type: "trace_line", taskId: "t2", line: makeTrace("HTTP", "GET moodle.tum.de/course/view.php?id=IN0015") });
  await delay(400);
  emit({ type: "trace_line", taskId: "t2", line: makeTrace("OK", "← 3 PDFs · 47 slides") });
  await delay(100);
  emit({ type: "trace_line", taskId: "t2", line: makeTrace("LLM", "Invoking LLM: summarize 47 slides (chunk 1/3)") });
  await delay(700);
  emit({ type: "trace_line", taskId: "t2", line: makeTrace("LLM", "Invoking LLM: summarize 47 slides (chunk 2/3)") });
  await delay(700);
  emit({ type: "trace_line", taskId: "t2", line: makeTrace("LLM", "Invoking LLM: summarize 47 slides (chunk 3/3)") });
  await delay(200);
  emit({ type: "trace_line", taskId: "t2", line: makeTrace("OK", "← Summary generated · 340 words") });
  await delay(200);
  emit({ type: "task_done", taskId: "t2" });
  await delay(100);
  emit({
    type: "chat_message",
    message: {
      id: msgId(),
      role: "assistant",
      content: "Here's your Discrete Math summary for this week:",
      cards: [
        {
          type: "summary",
          title: "Discrete Math — Week 8",
          body: "Topics: graph coloring, chromatic polynomials, planarity. Key theorem: four-color theorem proof sketch. 2 new exercise sheets added.",
          meta: "3 PDFs · 47 slides",
        },
      ],
      timestamp: new Date().toTimeString().slice(0, 5),
    },
  });

  // t3: event registration
  await delay(300);
  emit({ type: "task_started", taskId: "t3", label: "Registering for Reply workshop" });
  await delay(100);
  emit({ type: "trace_line", taskId: "t3", line: makeTrace("TOOL", "Spawning tool: tum_event_register") });
  await delay(200);
  emit({ type: "trace_line", taskId: "t3", line: makeTrace("HTTP", "GET tum.de/events?search=Reply+workshop") });
  await delay(300);
  emit({ type: "trace_line", taskId: "t3", line: makeTrace("OK", "← Event found: Reply Makeathon Workshop · Tue 19:00 · 12 spots left") });
  await delay(200);

  const ar2Id = "ar2";
  emit({
    type: "action_request",
    action: {
      id: ar2Id,
      taskId: "t3",
      label: "Register for Reply Workshop on Tuesday at 19:00?",
      riskLevel: "medium",
      detail: "12 spots remaining. Registration is binding.",
      consequence: "You will receive a confirmation email from TUMonline.",
    },
  });

  const approved2 = await waitForAction(ar2Id);

  if (approved2) {
    await delay(400);
    emit({ type: "trace_line", taskId: "t3", line: makeTrace("HTTP", "POST tum.de/events/register { eventId: 'EV-441' }") });
    await delay(400);
    emit({ type: "trace_line", taskId: "t3", line: makeTrace("OK", "← 200 OK · Registered") });
    await delay(100);
    emit({
      type: "chat_message",
      message: {
        id: msgId(),
        role: "assistant",
        content: "Registered! The Reply workshop is in your calendar.",
        cards: [
          { type: "event_registered", title: "Reply Workshop", body: "Tuesday · 19:00 · Room MI HS 1", meta: "12 → 11 spots" },
        ],
        timestamp: new Date().toTimeString().slice(0, 5),
      },
    });
  } else {
    await delay(200);
    emit({
      type: "chat_message",
      message: {
        id: msgId(),
        role: "assistant",
        content: "Got it — I skipped the workshop registration.",
        timestamp: new Date().toTimeString().slice(0, 5),
      },
    });
  }

  emit({ type: "task_done", taskId: "t3" });

  // conflict
  await delay(500);
  emit({
    type: "conflict",
    conflict: {
      id: "c1",
      title: "S4 delay may affect your gym slot",
      detail: "S-Bahn S4 is running +22 min tonight. Your gym booking at ZHS Stachus starts at 17:30.",
      resolvePrompt: "The S4 is delayed 22 minutes tonight — should I push my gym slot back or cancel it?",
    },
  });
}
