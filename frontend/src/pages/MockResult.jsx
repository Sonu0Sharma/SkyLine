// src/pages/MockResult.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { FaArrowLeft, FaCopy, FaDownload, FaClipboard, FaMagic } from "react-icons/fa";
import toast from "react-hot-toast";
import '../styles/mock_result.css'; // make sure path matches where you saved the CSS

/**
 * MockResult.jsx
 *
 * - Uses inline SVG gauge (no external Gauge required).
 * - Triggers a subtle pulse + confetti when score >= CELEBRATION_THRESHOLD.
 * - Provides quick actions: copy JSON, export JSON, copy suggested answers.
 * - Expects `report` from location.state.report OR sessionStorage "mock_report".
 *
 * NOTE: This file is intentionally self-contained and defensive about missing fields.
 */

const CELEBRATION_THRESHOLD = 75;

function CompactGauge({ value = 0, size = 160, thickness = 12 }) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const filled = (v / 100) * c;
  const dashoffset = Math.max(0, c - filled);

  return (
    <div className="mr-gauge" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <defs>
          <linearGradient id="mr-g1" x1="0" x2="1">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>
        </defs>

        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="#eef2ff"
          strokeWidth={thickness}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="url(#mr-g1)"
          strokeWidth={thickness}
          strokeLinecap="round"
          fill="none"
          style={{
            transform: "rotate(-90deg)",
            transformOrigin: "50% 50%",
            strokeDasharray: `${c} ${c}`,
            strokeDashoffset: `${dashoffset}`,
            transition: "stroke-dashoffset 1s cubic-bezier(.22,.9,.3,1)",
          }}
        />
        <circle cx={size / 2} cy={size / 2} r={Math.max(0, r - thickness - 2)} fill="#fff" />
      </svg>

      <div className="mr-gauge-text">
        <div className="mr-gauge-value">{v}%</div>
        <div className="mr-gauge-label">Overall</div>
      </div>
    </div>
  );
}

export default function MockResult() {
  const navigate = useNavigate();
  const location = useLocation();
  const saved = useRef(null);

  // Try to get report from location.state, else sessionStorage
  const initialReport = useMemo(() => {
    const fromState = location.state && location.state.report;
    if (fromState) return fromState;
    try {
      const raw = sessionStorage.getItem("mock_report") || sessionStorage.getItem("ats_report") || null;
      if (raw) return JSON.parse(raw);
    } catch (e) {
      // ignore parse errors
    }
    return null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [report, setReport] = useState(initialReport);
  const [celebrated, setCelebrated] = useState(false);
  const confettiRootRef = useRef(null);

  useEffect(() => {
    // persist for refresh
    if (report) {
      try {
        sessionStorage.setItem("mock_report", JSON.stringify(report));
      } catch {}
    }
  }, [report]);

  useEffect(() => {
    // Auto-celebrate when mounted if score high enough
    const score = (report && (report.total_score ?? report.overall_score ?? 0)) || 0;
    if (score >= CELEBRATION_THRESHOLD && !celebrated) {
      // small delay before celebration for nicer UX
      setTimeout(() => {
        triggerPulse();
        burstConfetti();
        setCelebrated(true);
      }, 300);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [report]);

  function triggerPulse() {
    const root = document.querySelector(".mr-result-root");
    if (!root) return;
    root.classList.remove("mr-pulse");
    // force reflow to restart animation
    // eslint-disable-next-line no-unused-expressions
    root.offsetWidth;
    root.classList.add("mr-pulse");
  }

  function burstConfetti(count = 22) {
    const root = confettiRootRef.current;
    if (!root) return;

    const colors = ["#60A5FA", "#8B5CF6", "#06B6D4", "#34D399", "#FBBF24", "#FB7185"];
    const fragments = [];
    for (let i = 0; i < count; i++) {
      const el = document.createElement("div");
      el.className = "mr-confetti";
      // random size & delay
      const size = Math.round(6 + Math.random() * 10);
      el.style.width = `${size}px`;
      el.style.height = `${Math.round(size * (0.6 + Math.random() * 0.9))}px`;
      el.style.background = colors[Math.floor(Math.random() * colors.length)];
      el.style.left = `${40 + Math.random() * 20}%`;
      el.style.top = `${10 + Math.random() * 10}%`;
      el.style.transform = `translate3d(${Math.round(-120 + Math.random() * 240)}px, ${Math.round(-20 + Math.random() * 200)}px, 0) rotate(${Math.round(Math.random() * 360)}deg)`;
      el.style.opacity = `${0.9 - Math.random() * 0.6}`;
      el.style.animationDelay = `${(Math.random() * 500) | 0}ms`;
      root.appendChild(el);
      fragments.push(el);
    }
    // remove after animation window
    setTimeout(() => {
      fragments.forEach((f) => f && f.remove());
    }, 4200);
  }

  const getScore = () => {
    return report ? (report.total_score ?? report.overall_score ?? 0) : 0;
  };

  const getMetrics = () => {
    // prefer breakdown object patterns we've seen; be defensive
    const breakdown = (report && report.breakdown) || (report && report.dimensions) || {};
    // Normalize into {key: score}
    if (Array.isArray(breakdown)) return {};
    const out = {};
    Object.entries(breakdown).forEach(([k, v]) => {
      if (v && typeof v === "object") {
        out[k] = v.score ?? v.semantic_score ?? v.readability_score ?? v;
      } else if (typeof v === "number") {
        out[k] = v;
      } else {
        out[k] = v || 0;
      }
    });
    return out;
  };

  const quickWins = (report && ((report.insights && report.insights.quick_wins) || (report.feedback && report.feedback.quick_wins))) || [];
  const strengths = (report && ((report.insights && report.insights.good_points) || (report.feedback && report.feedback.strengths))) || [];
  const transcript = (report && (report.transcript || report.raw_transcript || report.history || [])) || [];

  // actions
  const copyQuickWins = () => {
    try {
      navigator.clipboard.writeText(JSON.stringify(quickWins, null, 2));
      toast.success("Quick wins copied");
    } catch {
      toast.error("Copy failed");
    }
  };

  const exportReport = () => {
    try {
      const blob = new Blob([JSON.stringify(report || {}, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "mock_report.json";
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Report exported");
    } catch {
      toast.error("Export failed");
    }
  };

  const copyImproved = (text) => {
    try {
      navigator.clipboard.writeText(text || "");
      toast.success("Copied");
    } catch {
      toast.error("Copy failed");
    }
  };

  if (!report) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="mr-card text-center">
          <h2 className="text-2xl font-bold">No report available</h2>
          <p className="text-sm text-gray-600 mt-2">Run an interview session to see the results here.</p>
          <div className="mt-6 flex gap-3 justify-center">
            <button onClick={() => navigate("/mock")} className="mr-btn">Back to Mock</button>
            <button onClick={() => navigate("/ats")} className="mr-btn mr-btn-outline">Open ATS</button>
          </div>
        </div>
      </div>
    );
  }

  const metrics = getMetrics();
  const overall = getScore();

  return (
    <div className="mr-result-root" style={{ position: "relative" }}>
      {/* confetti container */}
      <div ref={confettiRootRef} className="mr-confetti-root" aria-hidden />

      <div className="max-w-6xl mx-auto py-12 px-6">
        <div className="flex items-center justify-between mb-8">
          <div>
            <button onClick={() => navigate("/mock")} className="mr-back">
              <FaArrowLeft /> Back
            </button>
            <h1 className="text-3xl font-bold mt-4">Interview Results</h1>
            <p className="text-sm text-gray-500 mt-1">{report.role?.role ? `Role: ${report.role.role}` : ""}</p>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={copyQuickWins} className="mr-action">
              <FaCopy /> Copy Quick Wins
            </button>
            <button onClick={exportReport} className="mr-action">
              <FaDownload /> Export
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className={`mr-card flex flex-col items-center justify-center p-6 ${overall >= CELEBRATION_THRESHOLD ? 'mr-card--highlight' : ''}`}>
            <CompactGauge value={overall} size={160} thickness={12} />
            <div className="mt-4 text-center">
              <div className="text-sm text-gray-500">Combined metrics</div>
              <div className="text-xs text-gray-400 mt-1">Keywords · Structure · Semantics · Readability · Tone</div>
            </div>
            {overall >= CELEBRATION_THRESHOLD && (
              <div className="mt-4 text-sm text-indigo-700 font-semibold">Great job — your score is high 🎉</div>
            )}
          </div>

          <div className="lg:col-span-2 space-y-4">
            <div className="mr-card p-4">
              <h3 className="text-lg font-semibold mb-3">Performance Breakdown</h3>
              <div className="space-y-3">
                {Object.keys(metrics).length ? (
                  Object.entries(metrics).map(([k, v]) => {
                    const label = k.replace(/_/g, " ");
                    const score = Math.round(Number(v) || 0);
                    return (
                      <div key={k}>
                        <div className="flex justify-between text-sm font-medium mb-1">
                          <span className="capitalize text-gray-600">{label}</span>
                          <span className="text-gray-900">{score}%</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2.5">
                          <div className="mr-progress" style={{ width: `${Math.max(0, Math.min(100, score))}%` }} />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-sm text-gray-500">No breakdown available.</div>
                )}
              </div>
            </div>

            <div className="mr-card p-4">
              <div className="flex items-start justify-between">
                <h3 className="text-lg font-semibold">Quick Wins & Strengths</h3>
                <div className="text-sm text-gray-500">{(quickWins && quickWins.length) ? `${quickWins.length} items` : "—"}</div>
              </div>

              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Strengths</h4>
                  <ul className="space-y-2">
                    {strengths.length ? strengths.map((s, i) => <li key={i} className="mr-chip">{s}</li>)
                      : <li className="text-sm text-gray-500">No specific strengths detected.</li>}
                  </ul>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Quick Wins</h4>
                  <ul className="space-y-2">
                    {quickWins.length ? quickWins.map((q, i) => (
                      <li key={i} className="p-3 bg-indigo-50 rounded-lg border border-indigo-100">
                        <div className="text-sm text-indigo-900 font-semibold">{typeof q === "string" ? q : (q.title || q)}</div>
                        {typeof q === "object" && q.description ? <div className="text-xs text-indigo-700 mt-1">{q.description}</div> : null}
                      </li>
                    )) : <li className="text-sm text-gray-500">No quick wins available.</li>}
                  </ul>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Transcript */}
        <div className="mt-8 mr-card p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Detailed Transcript & Improvements</h3>
            <div className="flex items-center gap-2">
              <button className="mr-small" onClick={() => { navigator.clipboard.writeText(JSON.stringify(transcript || [], null, 2)); toast.success("Transcript copied"); }}>
                <FaClipboard /> Copy transcript
              </button>
              <button className="mr-small" onClick={() => { exportReport(); }}>
                <FaDownload /> Export
              </button>
            </div>
          </div>

          <div className="divide-y">
            {transcript.length ? transcript.map((t, i) => {
              // try to normalize known shapes
              const question = t.question || t.prompt || t.q || `Question ${i+1}`;
              const user_answer = t.user_answer || t.answer || t.response || "(No answer)";
              const improved = t.improved_answer || t.improved || t.rewrite || (t.after && t.after.text) || t.suggested || "";
              const feedbackText = t.feedback || t.evaluation || (t.meta && t.meta.feedback) || "";

              return (
                <div key={i} className="p-4 hover:bg-gray-50 transition">
                  <div className="mb-3">
                    <div className="text-xs font-bold text-indigo-700 uppercase">Question {i + 1}</div>
                    <h4 className="text-lg font-medium text-gray-900 mt-1">{question}</h4>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                      <div className="text-sm font-semibold text-red-700 mb-2">Your Answer</div>
                      <div className="text-sm text-gray-800 whitespace-pre-wrap">{user_answer}</div>
                      {feedbackText ? <div className="mt-3 text-xs italic text-red-700">Feedback: {feedbackText}</div> : null}
                    </div>

                    <div className="bg-green-50 p-4 rounded-xl border border-green-100">
                      <div className="text-sm font-semibold text-green-800 mb-2">AI Suggested Answer</div>
                      <div className="text-sm text-gray-800 whitespace-pre-wrap">{improved || "(No suggestion provided)"}</div>
                      <div className="mt-3 text-right">
                        <button onClick={() => copyImproved(improved)} className="mr-copy">Copy</button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            }) : (
              <div className="p-6 text-sm text-gray-500">No transcript available for this session.</div>
            )}
          </div>
        </div>

        <div className="mt-8 text-center text-xs text-gray-500">Structure · Content · Clarity · Impact</div>
      </div>
    </div>
  );
}
