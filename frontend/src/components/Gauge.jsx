// frontend/src/components/Gauge.jsx
import React, { useEffect, useRef, useState } from "react";

/**
 * Animated SVG gauge. Uses stroke-dashoffset animation to sweep.
 *
 * Props:
 *  - value: number 0-100
 *  - size: px (default 160)
 *  - thickness: stroke width (default 10)
 *  - compact: boolean (default false) -> if true, only renders the arc (no text block)
 */
export default function Gauge({ value = 0, size = 160, thickness = 10, compact = false }) {
  const circleRef = useRef(null);
  const frameRef = useRef(null);
  const fromRef = useRef(0); // keep previous displayed value across renders
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    // Ensure value bounded
    const to = Math.round(Math.max(0, Math.min(100, value || 0)));
    const from = fromRef.current ?? 0;
    const dur = 900;
    const start = performance.now();

    // easing
    const easeOutBack = (t) => 1 - Math.pow(1 - t, 3);

    // numeric counter animation using RAF
    const tick = (ts) => {
      const t = Math.min(1, (ts - start) / dur);
      const eased = easeOutBack(t);
      const current = Math.round(from + (to - from) * eased);
      setDisplay(current);
      if (t < 1) {
        frameRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = to; // persist final value for next animation
      }
    };
    frameRef.current = requestAnimationFrame(tick);

    // SVG arc animation (stroke-dashoffset)
    const circle = circleRef.current;
    if (circle) {
      const r = (size - thickness) / 2;
      const c = 2 * Math.PI * r;
      const pct = Math.max(0, Math.min(100, to));
      const filled = (pct / 100) * c;

      // set the dash array and animate offset
      circle.style.transition = "stroke-dashoffset 1.2s cubic-bezier(.22,.9,.3,1)";
      circle.style.strokeDasharray = `${c} ${c}`;
      // start from full circle (hidden)
      // ensure initial dashoffset is set synchronously to force transition
      // first set it to full (c) then next tick to c - filled
      // (some browsers require a reflow; using setTimeout 10ms ensures transition fires)
      circle.style.strokeDashoffset = `${c}`;
      setTimeout(() => {
        circle.style.strokeDashoffset = `${Math.max(0, c - filled)}`;
      }, 12);
    }

    return () => {
      // cleanup RAF
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    };
    // We intentionally omit `display` so animation uses fromRef for smooth steps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, size, thickness]);

  // compute circle geometry for render
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;

  return (
    <div className={compact ? "inline-flex items-center justify-center" : "flex items-center gap-4"}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="rounded-full"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="g1" x1="0" x2="1">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#3b82f6" />
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
          stroke="url(#g1)"
          strokeWidth={thickness}
          strokeLinecap="round"
          fill="none"
          style={{
            transform: "rotate(-90deg)",
            transformOrigin: "50% 50%",
            strokeDasharray: `${c} ${c}`,
            strokeDashoffset: `${c}`,
          }}
        />

        {/* center hole */}
        <circle cx={size / 2} cy={size / 2} r={Math.max(0, r - thickness - 2)} fill="white" />
      </svg>

      {/* when compact=true we render only the gauge (no text) */}
      {!compact && (
        <div>
          <div className="text-sm text-gray-500">Overall Match</div>
          <div className="text-2xl font-extrabold text-gray-900">{display}%</div>
          <div className="text-xs text-gray-500 mt-1 max-w-xs">
            Combined: Keywords, Structure, Semantics, Readability, Tone.
          </div>
        </div>
      )}
    </div>
  );
}
