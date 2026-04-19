import type { ChatCard as ChatCardType } from "../../types";

const CARD_BORDER: Record<ChatCardType["type"], string> = {
  room_booked:      "var(--accent-teal)",
  summary:          "var(--accent-purple)",
  event_registered: "var(--accent-blue)",
  conflict:         "var(--accent-amber)",
  info:             "var(--text-tertiary)",
};

function CardShell({ card, icon, badge, badgeColor, children }: {
  card: ChatCardType;
  icon: string;
  badge?: string;
  badgeColor?: string;
  children: React.ReactNode;
}) {
  const accent = CARD_BORDER[card.type];
  return (
    <div
      className="mt-2 rounded-lg overflow-hidden"
      style={{ background: "var(--bg-card)", border: "1px solid var(--border-card)", borderLeft: `3px solid ${accent}` }}
    >
      <div className="px-3 py-2.5 flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[13px]">{icon}</span>
            <span className="text-[13px] font-medium" style={{ color: "var(--text-primary)" }}>{card.title}</span>
          </div>
          {children}
        </div>
        {badge && (
          <span
            className="shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full"
            style={{ background: `${badgeColor}22`, color: badgeColor, border: `1px solid ${badgeColor}44` }}
          >
            {badge}
          </span>
        )}
      </div>
    </div>
  );
}

function Line({ text, muted }: { text: string; muted?: boolean }) {
  return (
    <p className="text-[12px] leading-snug" style={{ color: muted ? "var(--text-tertiary)" : "var(--text-secondary)" }}>
      {text}
    </p>
  );
}

export function ChatCard({ card }: { card: ChatCardType }) {
  const renderLink = () => {
    if (!card.link) return null;
    return (
      <a
        href={card.link}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-colors"
        style={{ background: "rgba(59,130,246,0.1)", color: "var(--accent-blue)", border: "1px solid rgba(59,130,246,0.2)" }}
        onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(59,130,246,0.2)")}
        onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(59,130,246,0.1)")}
      >
        <span>📄</span> View Document
      </a>
    );
  };

  switch (card.type) {
    case "room_booked":
      return (
        <CardShell card={card} icon="📍" badge="Confirmed" badgeColor="var(--accent-teal)">
          <Line text={card.body} />
          {card.meta && <Line text={card.meta} muted />}
          {renderLink()}
        </CardShell>
      );
    case "summary":
      return (
        <CardShell card={card} icon="≡">
          <Line text={card.body} />
          {renderLink()}
          {card.meta && (
            <p
              className="text-[11px] mt-2 pt-2"
              style={{ color: "var(--text-tertiary)", borderTop: "1px solid var(--border-panel)" }}
            >
              {card.meta}
            </p>
          )}
        </CardShell>
      );
    case "event_registered":
      return (
        <CardShell card={card} icon="📅" badge="Registered" badgeColor="var(--accent-blue)">
          <Line text={card.body} />
          {card.meta && <Line text={card.meta} muted />}
        </CardShell>
      );
    default:
      return (
        <CardShell card={card} icon="ℹ">
          <Line text={card.body} />
          {card.meta && <Line text={card.meta} muted />}
        </CardShell>
      );
  }
}
