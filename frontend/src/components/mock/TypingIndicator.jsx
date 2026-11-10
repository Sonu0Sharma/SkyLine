// src/components/mock/TypingIndicator.jsx
import React from "react";
import { motion } from "framer-motion";

export default function TypingIndicator() {
  const dot = { scale: [1, 1.6, 1], opacity: [0.7, 1, 0.7] };
  const container = { transition: { staggerChildren: 0.12 } };

  return (
    <div className="flex items-start gap-3 max-w-4xl mx-auto mt-2 mb-6">
      <div className="flex-shrink-0 mt-1">
        <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white shadow">AI</div>
      </div>

      <motion.div className="bg-indigo-100 p-3 rounded-xl" initial="hidden" animate="visible" variants={container}>
        <div className="flex items-center gap-1">
          <motion.span className="w-2 h-2 bg-indigo-600 rounded-full" animate={dot} transition={{ repeat: Infinity, duration: 0.9 }} />
          <motion.span className="w-2 h-2 bg-indigo-600 rounded-full" animate={dot} transition={{ repeat: Infinity, duration: 0.9, delay: 0.12 }} />
          <motion.span className="w-2 h-2 bg-indigo-600 rounded-full" animate={dot} transition={{ repeat: Infinity, duration: 0.9, delay: 0.24 }} />
          <div className="ml-3 text-xs text-indigo-700 font-medium">AI is typing...</div>
        </div>
      </motion.div>
    </div>
  );
}
