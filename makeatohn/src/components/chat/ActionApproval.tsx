import { useState } from "react";
import type { ActionRequest } from "../../types";

interface Props {
  action: ActionRequest;
  onResolve: (actionId: string, approved: boolean) => void;
}

const riskAccent = {
  low:    "var(--accent-blue)",
  medium: "var(--accent-amber)",
  high:   "var(--accent-red)",
};

const riskLabel = {
  low:    "Reversible",
  medium: "Binding action",
  high:   "Requires confirmation",
};

export function ActionApproval({ action, onResolve }: Props) {
  const [inputValue, setInputValue] = useState("");
  const accent = riskAccent[action.riskLevel];
  
  const canApprove = 
    (action.riskLevel !== "high" || inputValue.toLowerCase() === "confirm") || 
    (action.needsInput && inputValue.trim().length > 0);

  return (
    <div
      className="my-2 rounded-lg p-3"
      style={{ background: "var(--bg-card)", border: `1px solid var(--border-card)`, borderLeft: `3px solid ${accent}` }}
    >
      <div className="flex items-start gap-2.5">
        <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5"
          style={{ background: `${accent}22`, border: `1px solid ${accent}44` }}>
          <span className="text-[11px]" style={{ color: accent }}>?</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span
              className="text-[10px] font-medium px-1.5 py-px rounded"
              style={{ background: `${accent}22`, color: accent }}
            >
              {action.needsInput ? "Input Required" : riskLabel[action.riskLevel]}
            </span>
          </div>
          <p className="text-[13px] font-medium leading-snug" style={{ color: "var(--text-primary)" }}>{action.label}</p>
          <p className="text-[12px] mt-1" style={{ color: "var(--text-secondary)" }}>{action.detail}</p>
          {(action.riskLevel === "medium" || action.riskLevel === "high") && action.consequence && (
            <p className="text-[12px] mt-1" style={{ color: "var(--accent-amber)" }}>{action.consequence}</p>
          )}
          
          {(action.riskLevel === "high" || action.needsInput) && (
            <div className="mt-2.5">
              <label className="text-[11px] block mb-1" style={{ color: "var(--text-secondary)" }}>
                {action.needsInput ? "Enter required information:" : <>Type <span className="font-mono" style={{ color: "var(--text-primary)" }}>confirm</span> to approve</>}
              </label>
              <input
                type={action.needsInput && (action.label.toLowerCase().includes("token") || action.label.toLowerCase().includes("password")) ? "password" : "text"}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={action.needsInput ? (action.inputPlaceholder || "Enter here...") : "confirm"}
                className="w-full text-[12px] rounded px-2 py-1.5 outline-none focus:ring-1"
                style={{
                  background: "var(--bg-page)",
                  border: "1px solid var(--border-card)",
                  color: "var(--text-primary)",
                }}
              />
            </div>
          )}
          <div className="flex gap-2 mt-3">
            <button
              disabled={!canApprove}
              onClick={() => onResolve(action.id, true, action.needsInput ? inputValue : undefined)}
              className="text-[12px] font-medium px-3 py-1.5 rounded-md text-white disabled:opacity-30 disabled:cursor-not-allowed transition-opacity"
              style={{ background: "var(--accent-blue)" }}
            >
              {action.needsInput ? "Submit" : "Approve"}
            </button>
            <button
              onClick={() => onResolve(action.id, false)}
              className="text-[12px] font-medium px-3 py-1.5 rounded-md transition-colors"
              style={{ border: "1px solid var(--border-card)", color: "var(--text-secondary)" }}
            >
              Reject
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
