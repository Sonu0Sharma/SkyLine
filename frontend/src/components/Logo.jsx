import React from "react";

/**
 * Logo.jsx
 * Small animated SVG logo for Skyline.
 *
 * - Gentle rotation for the core mark (SVG animateTransform)
 * - Soft 'breathe' vertical float via CSS keyframes
 * - Uses indigo -> blue gradient to match the app aesthetic
 *
 * Usage:
 *  import Logo from './Logo';
 *  <Logo size={40} />
 *
 * Props:
 *  - size: number (px) default 40
 */

export default function Logo({ size = 40 }) {
  const w = size;
  const h = size;
  const gradId = "skyline-grad-1";

  return (
    <div
      aria-hidden
      className="logo-breathe inline-flex items-center justify-center"
      style={{
        width: w,
        height: h,
        lineHeight: 0,
      }}
    >
      {/* local styles for breathe animation */}
      <style>{`
        @keyframes skyline-breathe {
          0% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-3px) scale(1.02); }
          100% { transform: translateY(0px) scale(1); }
        }
        .logo-breathe { animation: skyline-breathe 4.6s ease-in-out infinite; will-change: transform; }
        /* subtle shadow */
        .logo-drop { filter: drop-shadow(0 6px 14px rgba(59,130,246,0.12)); }
      `}</style>

      <svg
        width={w}
        height={h}
        viewBox="0 0 64 64"
        xmlns="http://www.w3.org/2000/svg"
        className="logo-drop"
        role="img"
        aria-label="Skyline logo"
      >
        <defs>
          <linearGradient id={gradId} x1="0" x2="1">
            <stop offset="0%" stopColor="#6366F1" />
            <stop offset="100%" stopColor="#3B82F6" />
          </linearGradient>
          <filter id="softGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur"/>
            <feMerge>
              <feMergeNode in="blur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* Outer ring */}
        <circle cx="32" cy="32" r="28" fill="url(#${gradId})" opacity="0.08" />

        {/* Rotating core group */}
        <g transform="translate(32,32)">
          {/* rotating shapes */}
          <g>
            <g>
              <path
                d="M -18 0 A 18 18 0 0 1 18 0" 
                fill="none"
                stroke={`url(#${gradId})`}
                strokeWidth="3.5"
                strokeLinecap="round"
                opacity="0.95"
              />
              <path
                d="M -14 5 A 14 14 0 0 1 14 5"
                fill="none"
                stroke={`url(#${gradId})`}
                strokeWidth="2.2"
                strokeLinecap="round"
                opacity="0.85"
              />
            </g>

            {/* small solid core */}
            <g>
              <circle cx="0" cy="-6" r="4.6" fill={`url(#${gradId})`} />
              <circle cx="0" cy="8" r="3.2" fill="#ffffff" opacity="0.9" />
            </g>
          </g>

          {/* animate rotation of the above group */}
          <animateTransform
            attributeName="transform"
            type="rotate"
            from="0"
            to="360"
            dur="9s"
            repeatCount="indefinite"
          />
        </g>

        {/* center shield/monogram - S shape */}
        <g transform="translate(32,32)">
          <path
            d="M -6 -2 C -6 -7, 6 -7, 6 -2 C 6 2, -6 2, -6 6 C -6 10, 6 10, 6 6"
            stroke={`url(#${gradId})`}
            strokeWidth="2.6"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.98"
          />
        </g>
      </svg>
    </div>
  );
}
