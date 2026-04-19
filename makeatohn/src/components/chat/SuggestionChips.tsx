const CHIPS = [
  "Find a study room for tomorrow afternoon",
  "Summarize my Moodle uploads",
  "What's on my schedule this week?",
  "Download my transcript from campus.tum.de",
];

interface Props {
  onSelect: (text: string) => void;
}

export function SuggestionChips({ onSelect }: Props) {
  return (
    <div className="flex gap-1.5 overflow-x-auto chips-scroll pb-0.5">
      {CHIPS.map((chip) => (
        <button
          key={chip}
          onClick={() => onSelect(chip)}
          className="shrink-0 text-[11px] px-2.5 py-1 rounded-full whitespace-nowrap transition-colors"
          style={{
            border: "1px solid var(--border-card)",
            color: "var(--text-secondary)",
            background: "var(--bg-panel)",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = "var(--bg-hover)";
            (e.currentTarget as HTMLElement).style.color = "var(--text-primary)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = "var(--bg-panel)";
            (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)";
          }}
        >
          {chip}
        </button>
      ))}
    </div>
  );
}
