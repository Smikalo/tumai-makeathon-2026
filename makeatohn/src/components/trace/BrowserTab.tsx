import { useCallback, useEffect, useRef, useState } from "react";

interface Props {
  browserStarted: boolean;
  browserRetried: boolean;
}

// ── entry types ───────────────────────────────────────────────────────────────

type TraceTag = "BROWSER" | "HTTP" | "WARN" | "ERR" | "OK" | "TOOL";

type BrowserEntry =
  | { id: string; kind: "trace"; tag: TraceTag; text: string; ts: string }
  | { id: string; kind: "think"; text: string; color: string; ts: string }
  | { id: string; kind: "video"; src: string; videoType: "failure" | "success" }
  | { id: string; kind: "divider"; label: string }
  | { id: string; kind: "done" };

// ── palette (mirrors execution trace) ────────────────────────────────────────

const tagCfg: Record<TraceTag, { bg: string; color: string; textColor: string; prefix: string }> = {
  BROWSER: { bg: "#1e3a5f", color: "#93c5fd", textColor: "#a1a1aa", prefix: "→ " },
  TOOL:    { bg: "#1e3a5f", color: "#93c5fd", textColor: "#a1a1aa", prefix: "→ " },
  HTTP:    { bg: "#27272a", color: "#a1a1aa", textColor: "#71717a", prefix: "→ " },
  WARN:    { bg: "#422006", color: "#fcd34d", textColor: "#fcd34d", prefix: "⚠ " },
  ERR:     { bg: "#450a0a", color: "#fca5a5", textColor: "#fca5a5", prefix: "✗ " },
  OK:      { bg: "#14401e", color: "#86efac", textColor: "#86efac", prefix: "← " },
};

// ── helpers ───────────────────────────────────────────────────────────────────

let _uid = 0;
const uid = () => `be-${++_uid}`;
const nowTs = () => new Date().toTimeString().slice(0, 8);

const mkTrace = (tag: TraceTag, text: string): BrowserEntry =>
  ({ id: uid(), kind: "trace", tag, text, ts: nowTs() });
const mkThink = (text: string, color: string): BrowserEntry =>
  ({ id: uid(), kind: "think", text, color, ts: nowTs() });
const mkVideo = (src: string, videoType: "failure" | "success"): BrowserEntry =>
  ({ id: uid(), kind: "video", src, videoType });
const mkDivider = (label: string): BrowserEntry =>
  ({ id: uid(), kind: "divider", label });
const mkDone = (): BrowserEntry =>
  ({ id: uid(), kind: "done" });

function seq(tasks: Array<[number, () => void]>): () => void {
  const timers: ReturnType<typeof setTimeout>[] = [];
  tasks.forEach(([ms, fn]) => timers.push(setTimeout(fn, ms)));
  return () => timers.forEach(clearTimeout);
}

// ── InlineVideo ───────────────────────────────────────────────────────────────

function InlineVideo({ src, onEnded }: { src: string; onEnded: () => void }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [ended, setEnded] = useState(false);
  const [error, setError] = useState(false);
  const firedRef = useRef(false);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    // Attempt autoplay. If blocked, show video paused — do NOT hide it.
    // Only onError (actual 404 / codec failure) hides the video.
    v.play()
      .then(() => setPlaying(true))
      .catch(() => {
        // Autoplay blocked — video is still visible, user can click to play
      });
  }, []);

  function handleClick() {
    const v = ref.current;
    if (!v || ended) return;
    if (v.paused) {
      v.play().then(() => setPlaying(true)).catch(() => {});
    }
  }

  function handleEnded() {
    if (firedRef.current) return;
    firedRef.current = true;
    setEnded(true);
    setPlaying(false);
    onEnded();
  }

  if (error) {
    return (
      <div
        className="mx-3 my-2 flex items-center justify-center font-mono text-[10px]"
        style={{
          height: "80px", borderRadius: "6px",
          background: "var(--bg-card)", border: "1px solid var(--border-card)",
          color: "var(--text-tertiary)",
        }}
      >
        Could not load video
      </div>
    );
  }

  return (
    <div
      className="mx-3 my-2 relative overflow-hidden"
      style={{ borderRadius: "6px", border: "1px solid var(--border-card)", cursor: ended ? "default" : "pointer" }}
      onClick={handleClick}
    >
      <video
        ref={ref}
        src={src}
        muted
        playsInline
        style={{ display: "block", width: "100%", objectFit: "cover" }}
        onEnded={handleEnded}
        onPlay={() => setPlaying(true)}
        onError={() => setError(true)}
      />

      {/* click-to-play hint when autoplay is blocked */}
      {!playing && !ended && (
        <div
          style={{
            position: "absolute", inset: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(0,0,0,0.35)",
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              width: "36px", height: "36px", borderRadius: "50%",
              background: "rgba(255,255,255,0.15)",
              border: "1px solid rgba(255,255,255,0.3)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "14px", color: "rgba(255,255,255,0.8)",
            }}
          >
            ▶
          </div>
        </div>
      )}

      {/* scan line — visible only while playing */}
      {playing && !ended && (
        <div
          style={{
            position: "absolute", left: 0, right: 0,
            height: "1px",
            background: "rgba(59,130,246,0.4)",
            animation: "scan-line 2.5s linear infinite",
            pointerEvents: "none",
          }}
        />
      )}

      {/* AGENT VIEW badge */}
      <div
        style={{
          position: "absolute", bottom: 7, right: 9,
          fontSize: "9px", letterSpacing: "0.1em", textTransform: "uppercase",
          color: "rgba(255,255,255,0.4)", background: "rgba(0,0,0,0.55)",
          padding: "2px 6px", borderRadius: "3px",
          fontFamily: "JetBrains Mono, monospace", pointerEvents: "none",
        }}
      >
        AGENT VIEW
      </div>

      {/* ended overlay */}
      {ended && (
        <div
          style={{
            position: "absolute", inset: 0,
            background: "rgba(0,0,0,0.15)",
            pointerEvents: "none",
          }}
        />
      )}
    </div>
  );
}

// ── row renderers ─────────────────────────────────────────────────────────────

function TraceRow({ entry }: { entry: Extract<BrowserEntry, { kind: "trace" }> }) {
  const cfg = tagCfg[entry.tag];
  return (
    <div className="font-mono text-[12px] py-0.5 pl-3 pr-3 flex items-baseline gap-1.5">
      <span className="shrink-0 tabular-nums text-[10px] w-14" style={{ color: "var(--text-tertiary)" }}>
        {entry.ts}
      </span>
      <span
        className="text-[9px] font-medium px-1 py-px rounded shrink-0 uppercase tracking-wide"
        style={{ background: cfg.bg, color: cfg.color }}
      >
        {entry.tag}
      </span>
      <span className="break-all leading-snug" style={{ color: cfg.textColor }}>
        <span style={{ opacity: 0.4 }}>{cfg.prefix}</span>{entry.text}
      </span>
    </div>
  );
}

function ThinkRow({ entry }: { entry: Extract<BrowserEntry, { kind: "think" }> }) {
  return (
    <div
      className="font-mono text-[12px] py-0.5 pl-3 pr-3 flex items-baseline gap-1.5"
      style={{ animation: "fadeInUp 0.25s ease both" }}
    >
      <span className="shrink-0 tabular-nums text-[10px] w-14" style={{ color: "var(--text-tertiary)" }}>
        {entry.ts}
      </span>
      <span
        className="text-[9px] font-medium px-1 py-px rounded shrink-0 uppercase tracking-wide"
        style={{ background: "rgba(168,85,247,0.15)", color: "#c4b5fd" }}
      >
        THINK
      </span>
      <span className="break-all leading-snug" style={{ color: entry.color }}>
        {entry.text}
      </span>
    </div>
  );
}

function Divider({ label }: { label: string }) {
  return (
    <div
      className="flex items-center gap-2 px-3 py-2 font-mono text-[10px] uppercase tracking-widest"
      style={{ color: "#f59e0b" }}
    >
      <div style={{ flex: 1, height: "1px", background: "rgba(245,158,11,0.18)" }} />
      <span>{label}</span>
      <div style={{ flex: 1, height: "1px", background: "rgba(245,158,11,0.18)" }} />
    </div>
  );
}

function DoneRow() {
  return (
    <div
      className="mx-3 my-2 flex items-center gap-3 px-3 py-3"
      style={{
        borderRadius: "6px",
        background: "rgba(34,197,94,0.07)",
        border: "1px solid rgba(34,197,94,0.2)",
        animation: "fadeInUp 0.3s ease both",
      }}
    >
      <span style={{ fontSize: "18px", color: "#22c55e", lineHeight: 1 }}>✓</span>
      <div>
        <p className="font-mono text-[12px]" style={{ color: "#86efac", margin: 0 }}>
          Document retrieved
        </p>
        <p className="font-mono text-[10px] mt-0.5" style={{ color: "var(--text-tertiary)", margin: 0 }}>
          Transcript_of_Records_SS2025.pdf · 84 KB
        </p>
      </div>
    </div>
  );
}

// ── BrowserTab ────────────────────────────────────────────────────────────────

export function BrowserTab({ browserStarted, browserRetried }: Props) {
  const [entries, setEntries] = useState<BrowserEntry[]>([]);

  // Video-ended flags — trigger post-video entry sequences via useEffect
  const [failureEnded, setFailureEnded] = useState(false);
  const [successEnded, setSuccessEnded] = useState(false);

  // One-shot guards
  const p1Started     = useRef(false);
  const p1PostStarted = useRef(false);
  const p2Started     = useRef(false);
  const p2PostStarted = useRef(false);

  const bottomRef = useRef<HTMLDivElement>(null);

  const push = useCallback(
    (e: BrowserEntry) => setEntries((prev) => [...prev, e]),
    []
  );

  // ── Phase 1: pre-video entries → failure video ────────────────────────────

  useEffect(() => {
    if (!browserStarted || p1Started.current) return;
    p1Started.current = true;

    const base = import.meta.env.BASE_URL;
    return seq([
      [0,   () => push(mkTrace("BROWSER", "Spawning browser_agent · headless Chromium"))],
      [400, () => push(mkTrace("HTTP",    "GET campus.tum.de/documents/transcripts"))],
      [800, () => push(mkVideo(`${base}videos/failure.mp4`, "failure"))],
    ]);
  }, [browserStarted, push]);

  // ── Phase 1 post: runs after failure.mp4 ends ─────────────────────────────

  useEffect(() => {
    if (!failureEnded || p1PostStarted.current) return;
    p1PostStarted.current = true;

    return seq([
      [0,    () => push(mkTrace("TOOL", "Parsing downloaded PDF · extracting document metadata"))],
      [600,  () => push(mkTrace("WARN", "Document type: Immatrikulationsbescheinigung (enrollment certificate)"))],
      [1200, () => push(mkTrace("ERR",  "Mismatch — expected Transcript of Records, got enrollment cert"))],
      [1800, () => push(mkDivider("Agent reflecting"))],
      [2600, () => push(mkThink("✗  Downloaded wrong document — enrollment cert, not academic transcript", "#fca5a5"))],
      [3400, () => push(mkThink("→  Portal lists both documents under same section · selected wrong entry", "#fcd34d"))],
      [4200, () => push(mkThink("→  Will re-navigate and target Transcript of Records specifically", "#93c5fd"))],
    ]);
  }, [failureEnded, push]);

  // ── Phase 2: user approved retry → pre-video entries → success video ──────

  useEffect(() => {
    if (!browserRetried || p2Started.current) return;
    p2Started.current = true;

    const base = import.meta.env.BASE_URL;
    return seq([
      [0,   () => push(mkDivider("Retrying — correct document"))],
      [400, () => push(mkTrace("TOOL", "Re-navigating portal · targeting Transcript of Records"))],
      [800, () => push(mkTrace("HTTP", "GET campus.tum.de/documents/transcripts/academic/SS2025"))],
      [1200, () => push(mkVideo(`${base}videos/success.mp4`, "success"))],
    ]);
  }, [browserRetried, push]);

  // ── Phase 2 post: runs after success.mp4 ends ─────────────────────────────

  useEffect(() => {
    if (!successEnded || p2PostStarted.current) return;
    p2PostStarted.current = true;

    return seq([
      [0,   () => push(mkTrace("OK",   "← Transcript of Records (SS2025) confirmed · correct document"))],
      [500, () => push(mkTrace("HTTP", "GET campus.tum.de/documents/transcript_SS2025.pdf"))],
      [900, () => push(mkTrace("OK",   "← 200 OK · PDF · 84KB · download complete"))],
      [1300, () => push(mkDone())],
    ]);
  }, [successEnded, push]);

  // ── Auto-scroll ───────────────────────────────────────────────────────────

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [entries]);

  // ── Idle state ─────────────────────────────────────────────────────────────

  if (!browserStarted && entries.length === 0) {
    return (
      <div
        style={{
          flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
          flexDirection: "column", gap: "10px", background: "var(--bg-panel)",
          minHeight: 0,
        }}
      >
        <span
          style={{
            display: "inline-block", width: "7px", height: "7px", borderRadius: "50%",
            background: "var(--text-tertiary)", animation: "pulse-dot 2s ease-in-out infinite",
          }}
        />
        <p style={{ fontSize: "12px", fontFamily: "JetBrains Mono, monospace", color: "var(--text-tertiary)" }}>
          Waiting for browser agent...
        </p>
      </div>
    );
  }

  // ── Log view ──────────────────────────────────────────────────────────────

  return (
    <div style={{ flex: 1, overflowY: "auto", paddingTop: "4px", paddingBottom: "8px", minHeight: 0 }}>
      {entries.map((entry) => {
        if (entry.kind === "trace")
          return <TraceRow key={entry.id} entry={entry} />;

        if (entry.kind === "think")
          return <ThinkRow key={entry.id} entry={entry} />;

        if (entry.kind === "video") {
          const onEnded = entry.videoType === "failure"
            ? () => setFailureEnded(true)
            : () => setSuccessEnded(true);
          return <InlineVideo key={entry.id} src={entry.src} onEnded={onEnded} />;
        }

        if (entry.kind === "divider")
          return <Divider key={entry.id} label={entry.label} />;

        if (entry.kind === "done")
          return <DoneRow key={entry.id} />;

        return null;
      })}
      <div ref={bottomRef} />
    </div>
  );
}
