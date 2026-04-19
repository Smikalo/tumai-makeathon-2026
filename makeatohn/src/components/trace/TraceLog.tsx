import { useEffect, useRef } from "react";
import type { TraceLine as TraceLineType } from "../../types";
import { TraceLine } from "./TraceLine";

interface Props {
  lines: TraceLineType[];
}

export function TraceLog({ lines }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lines]);

  if (lines.length === 0) {
    return (
      <div className="flex-1 px-4 py-6 font-mono text-[12px]" style={{ color: "var(--text-tertiary)" }}>
        Waiting for agent activity…
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto py-1">
      {lines.map((line) => (
        <TraceLine key={line.id} line={line} />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
