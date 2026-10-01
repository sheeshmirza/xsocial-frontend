type IconName =
  | "spark"
  | "calendar"
  | "publish"
  | "chart"
  | "users"
  | "shield"
  | "link"
  | "clock"
  | "check"
  | "alert"
  | "menu"
  | "panel"
  | "search"
  | "plus"
  | "close"
  | "home"
  | "help"
  | "chevron"
  | "bot"
  | "settings"
  | "rocket"
  | "pulse"
  | "trend"
  | "activity"
  | "command"
  | "send"
  | "pause"
  | "play"
  | "grid"
  | "folder"
  | "target"
  | "bolt";

type Props = {
  name: IconName;
  className?: string;
};

export default function AppIcon({ name, className }: Props) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  if (name === "calendar") {
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <rect x="3" y="5" width="18" height="16" rx="2.5" {...common} />
        <path d="M8 3v4M16 3v4M3 10h18" {...common} />
      </svg>
    );
  }

  if (name === "publish") {
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <path d="M12 16V5" {...common} />
        <path d="M8.5 8.5 12 5l3.5 3.5" {...common} />
        <path d="M4 15.5v2A2.5 2.5 0 0 0 6.5 20h11a2.5 2.5 0 0 0 2.5-2.5v-2" {...common} />
      </svg>
    );
  }

  if (name === "chart") {
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <path d="M4 19V6" {...common} />
        <path d="M4 19h16" {...common} />
        <path d="M8 15v-3M12 15V8M16 15v-5" {...common} />
      </svg>
    );
  }

  if (name === "users") {
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <circle cx="9" cy="8" r="3" {...common} />
        <path d="M3.5 18a5.5 5.5 0 0 1 11 0" {...common} />
        <path d="M17 11a2.5 2.5 0 1 0 0-5" {...common} />
        <path d="M20.5 18a4.2 4.2 0 0 0-3.6-4.1" {...common} />
      </svg>
    );
  }

  if (name === "shield") {
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <path d="M12 3 5.5 6v5.8c0 4.2 2.7 6.9 6.5 9.2 3.8-2.3 6.5-5 6.5-9.2V6L12 3Z" {...common} />
        <path d="m9.2 12.1 2.1 2.1 3.7-3.7" {...common} />
      </svg>
    );
  }

  if (name === "link") {
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <path d="M9.5 14.5 14.5 9.5" {...common} />
        <path d="M8 17H6.5a3.5 3.5 0 1 1 0-7H8" {...common} />
        <path d="M16 7h1.5a3.5 3.5 0 1 1 0 7H16" {...common} />
      </svg>
    );
  }

  if (name === "clock") {
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <circle cx="12" cy="12" r="9" {...common} />
        <path d="M12 7v5l3 2" {...common} />
      </svg>
    );
  }

  if (name === "check") {
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <path d="M5 12.5 9.3 17 19 7.5" {...common} />
      </svg>
    );
  }

  if (name === "alert") {
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <path d="M12 3.8 3.8 18h16.4L12 3.8Z" {...common} />
        <path d="M12 9v4.8M12 17.2h.01" {...common} />
      </svg>
    );
  }

  if (name === "menu") {
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <path d="M4 7h16M4 12h16M4 17h16" {...common} />
      </svg>
    );
  }

  if (name === "panel") {
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <rect x="3" y="4" width="18" height="16" rx="2.5" {...common} />
        <path d="M9 4v16" {...common} />
      </svg>
    );
  }

  if (name === "search") {
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <circle cx="11" cy="11" r="6.5" {...common} />
        <path d="m16 16 4 4" {...common} />
      </svg>
    );
  }

  if (name === "plus") {
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <path d="M12 5v14M5 12h14" {...common} />
      </svg>
    );
  }

  if (name === "close") {
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <path d="m6 6 12 12M18 6 6 18" {...common} />
      </svg>
    );
  }

  if (name === "home") {
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <path d="m3.5 11.2 8.5-6.7 8.5 6.7" {...common} />
        <path d="M5.5 10.7V20h13v-9.3" {...common} />
      </svg>
    );
  }

  if (name === "help") {
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <circle cx="12" cy="12" r="9" {...common} />
        <path d="M9.4 9.3a2.7 2.7 0 1 1 4.7 2c-.7.7-1.4 1-1.9 1.7-.3.4-.4.8-.4 1.4" {...common} />
        <path d="M12 17.2h.01" {...common} />
      </svg>
    );
  }

  if (name === "chevron") {
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <path d="m7 10 5 5 5-5" {...common} />
      </svg>
    );
  }

  if (name === "bot") {
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <rect x="5" y="7" width="14" height="11" rx="3" {...common} />
        <path d="M12 4v3M8.5 12h.01M15.5 12h.01M9 15h6" {...common} />
      </svg>
    );
  }

  if (name === "settings") {
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <circle cx="12" cy="12" r="3.2" {...common} />
        <path d="M19 12a7 7 0 0 0-.1-1.2l1.6-1.2-1.8-3.1-1.9.6a6.7 6.7 0 0 0-2-.9L14.4 4h-4.8l-.4 2.2a6.7 6.7 0 0 0-2 .9l-1.9-.6-1.8 3.1 1.6 1.2a7 7 0 0 0 0 2.4l-1.6 1.2 1.8 3.1 1.9-.6a6.7 6.7 0 0 0 2 .9l.4 2.2h4.8l.4-2.2a6.7 6.7 0 0 0 2-.9l1.9.6 1.8-3.1-1.6-1.2c.1-.4.1-.8.1-1.2Z" {...common} />
      </svg>
    );
  }

  if (name === "rocket") {
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <path d="M14.2 4.5c2.2-.4 4.5-.3 5.3.5.8.8.9 3.1.5 5.3l-5.1 5.1-5.8 1.6 1.6-5.8 5.1-5.1Z" {...common} />
        <path d="M8.5 15.5 5 19m4.6-2.2L7.2 14.4" {...common} />
        <circle cx="15.5" cy="8.5" r="1.3" {...common} />
      </svg>
    );
  }

  if (name === "pulse") {
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <path d="M3 12h4l2-4 4 8 2-4h6" {...common} />
      </svg>
    );
  }

  if (name === "trend") {
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <path d="M4 17 10 11l3.3 3.3L20 7.5" {...common} />
        <path d="M15.5 7.5H20V12" {...common} />
      </svg>
    );
  }

  if (name === "activity") {
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <rect x="4" y="4" width="16" height="16" rx="3" {...common} />
        <path d="M8 12h2l1.5-3 3 6 1.5-3H16" {...common} />
      </svg>
    );
  }

  if (name === "command") {
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <path d="M8 3.8a2.2 2.2 0 1 0 0 4.4h8a2.2 2.2 0 1 1 0 4.4H8a2.2 2.2 0 1 0 0 4.4h8" {...common} />
      </svg>
    );
  }

  if (name === "send") {
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <path d="m4 12 15-7-3.4 14-3.5-5.1L4 12Z" {...common} />
        <path d="m11.8 13.9 7.2-8.9" {...common} />
      </svg>
    );
  }

  if (name === "pause") {
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <path d="M9 6v12M15 6v12" {...common} />
      </svg>
    );
  }

  if (name === "play") {
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <path d="m8 6 10 6-10 6V6Z" {...common} />
      </svg>
    );
  }

  if (name === "grid") {
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <rect x="4" y="4" width="6" height="6" rx="1" {...common} />
        <rect x="14" y="4" width="6" height="6" rx="1" {...common} />
        <rect x="4" y="14" width="6" height="6" rx="1" {...common} />
        <rect x="14" y="14" width="6" height="6" rx="1" {...common} />
      </svg>
    );
  }

  if (name === "folder") {
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <path d="M3.8 7.5h6l1.7 2h8.7v8.7a2 2 0 0 1-2 2H5.8a2 2 0 0 1-2-2V7.5Z" {...common} />
      </svg>
    );
  }

  if (name === "target") {
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <circle cx="12" cy="12" r="8" {...common} />
        <circle cx="12" cy="12" r="4" {...common} />
        <circle cx="12" cy="12" r="1" {...common} />
      </svg>
    );
  }

  if (name === "bolt") {
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
        <path d="M13 3 6.5 12h4.5L10.5 21 17.5 11H13V3Z" {...common} />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="m6 16 3-8 3.4 6 2.8-4.3L18 16" {...common} />
      <path d="M4 19h16" {...common} />
    </svg>
  );
}
