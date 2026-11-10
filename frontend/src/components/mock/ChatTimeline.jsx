// src/components/mock/ChatTimeline.jsx
import React, { useEffect, useRef } from "react";
import ChatMessage from "./ChatMessage";

export default function ChatTimeline({ messages = [] }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const t = setTimeout(() => {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }, 60);
    return () => clearTimeout(t);
  }, [messages]);

  return (
    <div ref={containerRef} className="max-w-4xl mx-auto space-y-2" style={{ minHeight: 240 }} role="log" aria-live="polite">
      {messages.map((m) => (
        <ChatMessage key={m.id} id={m.id} type={m.type} text={m.text} />
      ))}
    </div>
  );
}
