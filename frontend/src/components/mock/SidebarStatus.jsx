// src/components/mock/SidebarStatus.jsx
import React from "react";

/**
 * SidebarStatus
 * Props:
 *   currentIndex, total, difficulty, role
 */
export default function SidebarStatus({ currentIndex = 0, total = 0, difficulty = "Medium", role = "" }) {
  const pct = total ? Math.round((currentIndex / total) * 100) : 0;
  return (
    <aside className="w-72 bg-white border-r flex flex-col p-6 gap-6 h-screen sticky top-0">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold shadow">AI</div>
        <div>
          <div className="text-sm text-gray-500">Interviewer</div>
          <div className="font-semibold text-gray-900">{role || "AI Interviewer"}</div>
        </div>
      </div>

      <div className="flex flex-col items-center gap-2 mt-2">
        <div className="relative">
          <svg className="w-28 h-28">
            <circle cx="56" cy="56" r="50" stroke="#EEF2FF" strokeWidth="12" fill="none" />
            <circle
              cx="56"
              cy="56"
              r="50"
              stroke="#4F46E5"
              strokeWidth="12"
              strokeDasharray={`${pct} ${100 - pct}`}
              strokeLinecap="round"
              transform="rotate(-90 56 56)"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-xl font-bold text-gray-900">{pct}%</div>
              <div className="text-xs text-gray-500">Progress</div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-2 space-y-2">
        <div className="text-xs text-gray-500 uppercase font-semibold">Difficulty</div>
        <div className="text-sm font-medium">{difficulty}</div>

        <div className="text-xs text-gray-500 uppercase font-semibold mt-4">Questions</div>
        <div className="text-sm font-medium">{currentIndex}/{total || "?"}</div>
      </div>

      <div className="mt-auto text-xs text-gray-400">
        Tip: Use the STAR format for behavioral answers. Be concise and quantify impact.
      </div>
    </aside>
  );
}
