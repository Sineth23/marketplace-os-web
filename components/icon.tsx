const paths = {
  overview: "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z",
  box: "m12 3 9 5v9l-9 5-9-5V8l9-5Zm0 10L3 8m9 5 9-5m-9 5v9M7.5 5.5l9 5",
  photos: "M4 4h16v16H4zM4 16l5-5 4 4 3-3 4 4M15 8h.01",
  check: "m5 12 4 4L19 6",
  arrow: "M4 12h16m-6-6 6 6-6 6",
  link: "m10 13 4-4m-6 6-1 1a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0m2 2 1-1a4 4 0 0 1 6 6l-4 4a4 4 0 0 1-6 0",
  zap: "M13 2L3 14h9l-1 8 10-12h-9l1-8z",
  "trend-up": "M17 4l-4 4-4-4M13 20v-6l4 4m0 0 4-4m-4 4V8",
  monitor: "M9 15V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H10a1 1 0 0 1-1-1zM5 5h14v2H5z",
  cpu: "M12 2A10 10 0 1 0 22 12A10 10 0 0 0 12 2ZM12 18A6 6 0 0 1 6 12A6 6 0 0 1 12 18Z",
  dollar:
    "M12 2a1 1 0 0 0-1 1v4H5a1 1 0 0 0 0 2h10a1 1 0 0 0 0-2H13V3a1 1 0 0 0-1-1zM12 17a1 1 0 0 0-1 1v4H5a1 1 0 0 0 0 2h10a1 1 0 0 0 0-2h-4v-4a1 1 0 0 0-1-1z",
  globe: "M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  trending: "M13 5l7 7M5 19l7-7 7 7",
} as const;

export function Icon({ name, className }: { name: keyof typeof paths; className?: string }) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={paths[name]} />
    </svg>
  );
}
