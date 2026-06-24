// Inline SVG assets — no network font dependency.

// Material `touch_app` ghost finger, copied from ink-bloom.
export function GhostFinger({ size = 64 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <path
        d="M9 11.24V7.5a2.5 2.5 0 0 1 5 0v3.74c1.21-.81 2-2.18 2-3.74a4 4 0 1 0-8 0c0 1.56.79 2.93 2 3.74zM18.84 15.87l-4.54-2.26c-.17-.07-.35-.11-.54-.11H13v-6a1.5 1.5 0 0 0-3 0v10.74l-3.43-.72a1 1 0 0 0-1.05.49 1 1 0 0 0 .12 1.16l3.84 4.15c.37.4.89.63 1.43.63h6.55c.85 0 1.56-.6 1.74-1.42l.95-4.47a1.5 1.5 0 0 0-.8-1.92z"
        fill="rgba(30, 32, 44, 0.92)"
        style={{
          filter:
            'drop-shadow(0 0 5px rgba(255,255,255,0.95)) drop-shadow(0 2px 3px rgba(0,0,0,0.30))',
        }}
      />
    </svg>
  );
}

// Speech-bubble / messages glyph for the wall button.
export function WallIcon({ size = 16 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <path
        d="M4 5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9l-4 3v-3H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function BackIcon({ size = 22 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <path
        d="M15 5l-7 7 7 7"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
