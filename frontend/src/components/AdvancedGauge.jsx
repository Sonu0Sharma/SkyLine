// frontend/src/components/AdvancedGauge.jsx
import React, { useEffect, useRef, useState } from "react";

/**
 * AdvancedGauge
 * Props:
 *  - value: number (0-100)
 *  - size: px (default 140)
 *  - thickness: stroke width (default 10)
 *  - animate: boolean (default true)
 *  - label: string (optional subtitle)
 *  - ariaLabel: string for accessibility
 *
 * Features:
 *  - Smooth numeric counter animation (requestAnimationFrame)
 *  - Smooth SVG arc sweep using strokeDashoffset
 *  - Gradient arc, rounded stroke caps
 *  - Center label + optional subtitle
 */
export default function AdvancedGauge({
  value = 0,
  size = 140,
  thickness = 12,
  animate = true,
  label = "",
  ariaLabel = "Score gauge"
}) {
  const circleRef = useRef(null);
  const rafRef = useRef(null);
  const prevRef = useRef(0);
  const [display, setDisplay] = useState(Math.max(0, Math.min(100, Math.round(value || 0))));

  useEffect(() => {
    const to = Math.max(0, Math.min(100, Math.round(value || 0)));
    const from = prevRef.current ?? display;
    if (!animate) {
      setDisplay(to);
      prevRef.current = to;
      // update arc immediately
      const circle = circleRef.current;
      if (circle) {
        const r = (size - thickness) / 2;
        const c = 2 * Math.PI * r;
        const filled = (to / 100) * c;
        circle.style.strokeDasharray = `${c} ${c}`;
        circle.style.strokeDashoffset = `${Math.max(0, c - filled)}`;
      }
      return;
    }

    const dur = 900; // ms
    const start = performance.now();

    // easeOutCubic
    const ease = (t) => 1 - Math.pow(1 - t, 3);

    // numeric counter animation
    const tick = (ts) => {
      const t = Math.min(1, (ts - start) / dur);
      const eased = ease(t);
      const curr = Math.round(from + (to - from) * eased);
      setDisplay(curr);

      // arc update
      const circle = circleRef.current;
      if (circle) {
        const r = (size - thickness) / 2;
        const c = 2 * Math.PI * r;
        const filled = (curr / 100) * c;
        circle.style.strokeDasharray = `${c} ${c}`;
        circle.style.strokeDashoffset = `${Math.max(0, c - filled)}`;
      }

      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        prevRef.current = to;
      }
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, size, thickness, animate]);

  // svg geometry
  const r = (size - thickness) / 2;
  const viewBox = `0 0 ${size} ${size}`;

  return (
    <div className="flex flex-col items-center justify-center" role="img" aria-label={ariaLabel}>
      <svg width={size} height={size} viewBox={viewBox} className="rounded-full" aria-hidden="true">
        <defs>
          <linearGradient id="ag-gradient" x1="0" x2="1">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="60%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>
        </defs>

        {/* background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="#eef2ff"
          strokeWidth={thickness}
          fill="none"
        />

        {/* animated arc */}
        <circle
          ref={circleRef}
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="url(#ag-gradient)"
          strokeWidth={thickness}
          strokeLinecap="round"
          fill="none"
          style={{
            transform: "rotate(-90deg)",
            transformOrigin: "50% 50%",
            strokeDasharray: 0,
            strokeDashoffset: 0,
            transition: "stroke-dashoffset 0.9s cubic-bezier(.22,.9,.3,1)"
          }}
        />

        {/* inner circle to make it look like a gauge */}
        <circle cx={size / 2} cy={size / 2} r={Math.max(0, r - thickness - 2)} fill="white" />
      </svg>

      {/* numeric + label */}
      <div className="mt-3 text-center">
        <div className="text-2xl font-extrabold text-gray-900" aria-hidden>
          {display}%
        </div>
        {label && <div className="text-xs text-gray-500 mt-1">{label}</div>}
      </div>
    </div>
  );
}
