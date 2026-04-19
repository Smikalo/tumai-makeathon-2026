import type { AgentEvent, TraceLine } from "../types";

let traceCounter = 1000;
function makeTrace(tag: TraceLine["tag"], text: string, detail?: string): TraceLine {
  return {
    id: `trace-td-${++traceCounter}-${Date.now()}`,
    timestamp: new Date().toTimeString().slice(0, 8),
    tag,
    text,
    detail,
  };
}

function msgId() {
  return `msg-td-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function delay(ms: number): Promise<void> {
  return new Promise((res) => setTimeout(res, ms));
}

// failure.mp4 = 17.73s  →  traces spread across it
// success.mp4 = 12.57s  →  traces spread across it

export async function runTranscriptDownloadScenario(
  emit: (event: AgentEvent) => void,
  waitForAction: (actionId: string) => Promise<boolean>
): Promise<void> {

  // ── Phase 1: navigates, gets WRONG document ──────────────────────────────

  emit({ type: "task_started", taskId: "td1", label: "Downloading transcript of records" });

  await delay(300);
  emit({ type: "trace_line", taskId: "td1", line: makeTrace("TOOL", "Spawning tool: browser_agent · headless Chromium") });

  await delay(400);
  emit({ type: "trace_line", taskId: "td1", line: makeTrace("HTTP", "GET campus.tum.de/documents/transcripts") });

  await delay(300);
  // ← browser_start fires here; failure.mp4 begins (17.73s total)
  emit({ type: "browser_start" });

  // spread trace events across the ~17.7s video window
  await delay(2500);
  emit({ type: "trace_line", taskId: "td1", line: makeTrace("HTTP", "← 200 OK · Authenticated · Loading documents portal") });

  await delay(3000);
  emit({ type: "trace_line", taskId: "td1", line: makeTrace("TOOL", "Computer vision scan · enumerating document list") });

  await delay(3500);
  emit({ type: "trace_line", taskId: "td1", line: makeTrace("HTTP", "GET campus.tum.de/documents/Immatrikulationsbescheinigung.pdf") });

  await delay(3500);
  emit({ type: "trace_line", taskId: "td1", line: makeTrace("OK", "← 200 OK · PDF · 156KB · download complete") });

  await delay(3000);
  // video ends around here (~17.7s after browser_start was set)
  emit({ type: "trace_line", taskId: "td1", line: makeTrace("TOOL", "Parsing PDF · extracting document type metadata") });

  await delay(1500);
  emit({ type: "trace_line", taskId: "td1", line: makeTrace("WARN", "Document type: Immatrikulationsbescheinigung (enrollment certificate)") });

  await delay(700);
  emit({ type: "trace_line", taskId: "td1", line: makeTrace("ERR", "Mismatch — expected 'Transcript of Records', got enrollment certificate") });

  await delay(400);
  emit({ type: "task_failed", taskId: "td1", error: "Wrong document retrieved — Immatrikulationsbescheinigung instead of Transcript of Records" });

  await delay(300);
  emit({
    type: "chat_message",
    message: {
      id: msgId(),
      role: "assistant",
      content: "I navigated to your documents portal and downloaded a file, but it turned out to be your **Immatrikulationsbescheinigung** (enrollment certificate) — not your Transcript of Records. The portal lists both documents under the same section and I picked the wrong one.",
      cards: [{
        type: "conflict",
        title: "Wrong document retrieved",
        body: "Downloaded: Immatrikulationsbescheinigung.pdf (enrollment cert)\nExpected: Transcript of Records (SS2025)",
        meta: "campus.tum.de/documents · 156KB",
      }],
      timestamp: new Date().toTimeString().slice(0, 5),
    },
  });

  await delay(400);
  emit({
    type: "action_request",
    action: {
      id: "ar-retry",
      taskId: "td1",
      label: "Retry and download the correct Transcript of Records?",
      riskLevel: "medium",
      detail: "I will re-navigate to the portal and specifically target the Transcript of Records entry, avoiding the enrollment certificate.",
      consequence: "The previous file will be discarded.",
    },
  });

  // ── Wait for user decision ────────────────────────────────────────────────

  const approved = await waitForAction("ar-retry");

  if (!approved) {
    await delay(200);
    emit({ type: "trace_line", taskId: "td1", line: makeTrace("WARN", "User cancelled retry — task aborted") });
    await delay(200);
    emit({
      type: "chat_message",
      message: {
        id: msgId(),
        role: "assistant",
        content: "Understood. The incorrect file has been discarded. Let me know if you'd like to try again.",
        timestamp: new Date().toTimeString().slice(0, 5),
      },
    });
    return;
  }

  // ── Phase 2: retry, gets CORRECT document ────────────────────────────────

  await delay(300);
  emit({ type: "task_started", taskId: "td2", label: "Retrying — fetching Transcript of Records" });

  await delay(300);
  emit({ type: "trace_line", taskId: "td2", line: makeTrace("TOOL", "Re-navigating portal · targeting Transcript of Records entry") });

  await delay(400);
  emit({ type: "trace_line", taskId: "td2", line: makeTrace("HTTP", "GET campus.tum.de/documents/transcripts/academic/SS2025") });

  await delay(300);
  // ← browser_retry fires; success.mp4 begins (12.57s total)
  emit({ type: "browser_retry" });

  // spread trace events across the ~12.6s success video
  await delay(2500);
  emit({ type: "trace_line", taskId: "td2", line: makeTrace("HTTP", "← 200 OK · Transcript of Records page loaded") });

  await delay(3000);
  emit({ type: "trace_line", taskId: "td2", line: makeTrace("TOOL", "Locating download button · computer vision confirmed correct document") });

  await delay(3000);
  emit({ type: "trace_line", taskId: "td2", line: makeTrace("HTTP", "GET campus.tum.de/documents/transcript_SS2025.pdf") });

  await delay(2500);
  emit({ type: "trace_line", taskId: "td2", line: makeTrace("OK", "← 200 OK · PDF · 84KB · Transcript of Records SS2025") });

  await delay(800);
  // video ends around here (~12.6s after browser_retry)
  emit({ type: "task_done", taskId: "td2" });

  await delay(200);
  emit({
    type: "chat_message",
    message: {
      id: msgId(),
      role: "assistant",
      content: "Got it — this time I retrieved the correct document. Your Transcript of Records for Summer Semester 2025 is ready.",
      cards: [{
        type: "room_booked",
        title: "Transcript_of_Records_SS2025.pdf",
        body: "Summer Semester 2025 · 84 KB · campus.tum.de",
        meta: "Downloaded successfully",
      }],
      timestamp: new Date().toTimeString().slice(0, 5),
    },
  });
}
