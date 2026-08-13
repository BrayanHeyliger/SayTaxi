interface PassengerLogoMarkProps {
  className?: string;
}

export default function PassengerLogoMark({ className = "" }: PassengerLogoMarkProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      role="img"
      aria-label="Passenger logo"
    >
      <defs>
        <linearGradient id="pax-bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0f172a" />
          <stop offset="100%" stopColor="#0f766e" />
        </linearGradient>
        <linearGradient id="pax-road" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#facc15" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
      </defs>

      <rect x="4" y="4" width="56" height="56" rx="16" fill="url(#pax-bg)" />
      <rect x="25" y="12" width="14" height="40" rx="7" fill="url(#pax-road)" />
      <rect x="29.5" y="16" width="5" height="15" rx="2.5" fill="#fef3c7" opacity="0.9" />
      <circle cx="22" cy="45" r="3.5" fill="#bae6fd" />
      <circle cx="42" cy="45" r="3.5" fill="#bae6fd" />
      <path d="M22 28c2-5 6-8 10-8 4 0 8 3 10 8" fill="none" stroke="#99f6e4" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
