// A simple football, drawn in code so it stays sharp at any size.
export default function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" role="img" aria-label="Football" className="shrink-0">
      <path
        d="M4 28 C3 13 13 3 28 4 C29 19 19 29 4 28 Z"
        fill="#8B4A1F"
        stroke="#5A2F12"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      {/* stripes near each tip */}
      <path d="M8.2 20.6 L11.4 23.8" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" fill="none" />
      <path d="M20.6 8.2 L23.8 11.4" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" fill="none" />
      {/* laces */}
      <g stroke="#fff" strokeWidth="1.3" strokeLinecap="round" fill="none">
        <path d="M12 20 L20 12" />
        <path d="M13.2 16.4 L15.6 18.8" />
        <path d="M15.2 14.4 L17.6 16.8" />
        <path d="M17.2 12.4 L19.6 14.8" />
      </g>
    </svg>
  );
}
