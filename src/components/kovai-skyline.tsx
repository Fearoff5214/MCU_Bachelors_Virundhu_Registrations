import clsx from "clsx";

/**
 * Neon line-art of the Kovai horizon: the Western Ghats ridge with Marudhamalai's hilltop temple
 * on the left, and the city with the Gandhipuram flyover arch on the right.
 */
export function KovaiSkyline({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 1200 220"
      fill="none"
      className={clsx("w-full", className)}
      aria-hidden="true"
      preserveAspectRatio="xMidYMax slice"
    >
      <defs>
        <linearGradient id="ridge" x1="0" x2="1">
          <stop offset="0" stopColor="#00e5ff" />
          <stop offset=".55" stopColor="#ff2e88" />
          <stop offset="1" stopColor="#ff9f1c" />
        </linearGradient>
        <filter id="glow" x="-20%" y="-50%" width="140%" height="200%">
          <feGaussianBlur stdDeviation="3" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <g filter="url(#glow)" stroke="url(#ridge)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round">
        {/* Western Ghats, far ridge */}
        <path opacity=".45" d="M0 150 L70 118 L130 132 L210 86 L280 112 L340 96 L420 128 L500 110 L560 130" />
        {/* Marudhamalai hill + temple gopuram */}
        <path d="M0 190 L60 160 L120 150 L170 110 L205 78 L240 104 L300 140 L360 165 L420 175" />
        <path d="M197 80 L197 62 L201 62 L201 52 L205 44 L209 52 L209 62 L213 62 L213 80" />
        <circle cx="205" cy="38" r="2.5" fill="#ff9f1c" stroke="none" />
        {/* City blocks */}
        <path d="M560 200 V150 H600 V170 H630 V128 H668 V160 H700 V140 H730 V182" />
        <path d="M900 182 V136 H935 V158 H965 V118 H1000 V150 H1040 V132 H1075 V170 H1110 V146 H1150 V200" />
        {/* Gandhipuram flyover */}
        <path d="M720 186 Q815 120 910 186" />
        <path d="M700 192 H930" />
        <path d="M750 192 V170 M815 192 V152 M880 192 V170" opacity=".7" />
      </g>
      {/* Lit windows */}
      <g fill="#c6ff00" opacity=".8">
        <rect x="640" y="140" width="4" height="4" />
        <rect x="652" y="150" width="4" height="4" />
        <rect x="975" y="130" width="4" height="4" />
        <rect x="985" y="142" width="4" height="4" />
        <rect x="1050" y="145" width="4" height="4" />
        <rect x="1122" y="160" width="4" height="4" />
      </g>
      <path d="M0 205 H1200" stroke="#ffffff1a" />
    </svg>
  );
}
