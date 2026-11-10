// src/components/mock/ChatMessage.jsx
import React from "react";
import { motion } from "framer-motion";
import { FaRobot } from "react-icons/fa";

/**
 * ChatMessage
 * Props:
 * - id
 * - type: 'ai' | 'user' | 'feedback'
 * - text
 */
export default function ChatMessage({ id, type = "ai", text }) {
  const isAI = type === "ai";
  const isFeedback = type === "feedback";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className={`w-full flex ${isAI ? "justify-start" : "justify-end"} mb-4`}
      id={id}
      aria-live="polite"
    >
      {isAI ? (
        <div className="flex items-start gap-3 max-w-3xl">
          <div className="flex-shrink-0 mt-1">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-600 to-blue-500 flex items-center justify-center text-white shadow">
              <FaRobot />
            </div>
          </div>

          <div className="bg-indigo-600 text-white p-4 rounded-2xl rounded-tl-sm shadow-sm prose prose-sm max-w-none whitespace-pre-wrap">
            {text}
          </div>
        </div>
      ) : isFeedback ? (
        <div className="flex items-center gap-3 max-w-3xl">
          <div className="bg-yellow-50 text-yellow-900 p-3 rounded-xl border border-yellow-100">
            <div className="text-sm whitespace-pre-wrap">{text}</div>
          </div>
        </div>
      ) : (
        <div className="flex items-end gap-3 max-w-3xl">
          <div className="bg-white p-4 rounded-2xl rounded-tr-sm shadow-sm border">
            <div className="text-sm text-gray-900 whitespace-pre-wrap">{text}</div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
