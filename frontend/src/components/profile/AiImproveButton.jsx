// frontend/src/components/profile/AiImproveButton.jsx
import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { FaMagic, FaTimes, FaSpinner, FaCheck } from "react-icons/fa";
import axios from "axios";
import toast from "react-hot-toast";

/**
 * AiImproveButton (portal-based) — improved positioning + layout
 *
 * Fixes:
 * - Popover will try to appear below the button; if there's not enough space it will appear above.
 * - Popover is a fixed-position, flex column with an internal scrollable content area so footer buttons
 *   (Cancel / Apply) remain visible.
 * - Clamps horizontal position so the popover doesn't run off-screen.
 * - Title changed from "AI Suggestions" => "AI Improve".
 *
 * Props:
 * - originalText (string)
 * - context (string)
 * - fieldLabel (string)
 * - onAccept(newText) => void
 *
 * Uses the existing backend endpoint `/api/ai/generate` and expects the suggestion in `res.data.data`.
 */

export default function AiImproveButton({
  originalText = "",
  context = "general",
  fieldLabel = "Text",
  onAccept = (t) => {},
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [suggestion, setSuggestion] = useState(null);
  const [editing, setEditing] = useState("");
  const btnRef = useRef(null);
  const popRef = useRef(null);
  const [pos, setPos] = useState({ top: 0, left: 0, placement: "bottom", width: 0 });

  // Compute position when popover opens
  useEffect(() => {
    if (!open || !btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const popupWidth = 360;
    const popupMaxHeight = Math.floor(viewportHeight * 0.6); // 60% of viewport

    // clamp left so popup fits inside viewport with 12px padding
    let left = rect.left;
    if (left + popupWidth > viewportWidth - 12) {
      left = Math.max(12, viewportWidth - popupWidth - 12);
    }
    if (left < 12) left = 12;

    // prefer to place below; if not enough space, place above
    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;

    let placement = "bottom";
    let top = rect.bottom + 8; // default below

    if (spaceBelow < 220 && spaceAbove > spaceBelow) {
      // place above if it fits better
      placement = "top";
      // top will be rect.top - popupMaxHeight - 8, but ensure >= 12
      top = Math.max(12, rect.top - popupMaxHeight - 8);
    } else {
      // make sure top doesn't push popup off bottom; if it would, clamp top a bit upward
      const estimatedHeight = Math.min(420, popupMaxHeight);
      if (top + estimatedHeight > viewportHeight - 12) {
        top = Math.max(12, viewportHeight - estimatedHeight - 12);
      }
    }

    setPos({ top, left, placement, width: rect.width });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // close on ESC or outside click
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") setOpen(false);
    }
    function onClick(e) {
      if (!open) return;
      if (
        popRef.current &&
        !popRef.current.contains(e.target) &&
        btnRef.current &&
        !btnRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onClick);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  const fetchSuggestion = async () => {
    if (!originalText || originalText.trim().length < 5) {
      toast.error("Write something (at least 5 characters) so AI can improve it.");
      return;
    }

    setLoading(true);
    setSuggestion(null);
    try {
      const res = await axios.post("/api/ai/generate", {
        prompt: originalText,
        context,
      });

      const suggested = res?.data?.data ?? "";
      if (!suggested) {
        setSuggestion("No suggestion returned.");
        setEditing(originalText);
        toast.error("AI returned no suggestion.");
      } else {
        setSuggestion(suggested);
        setEditing(suggested);
      }
    } catch (err) {
      console.error("AI suggestion error", err);
      setSuggestion("Failed to fetch suggestion.");
      setEditing(originalText);
      toast.error("AI service unavailable.");
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = async () => {
    const willOpen = !open;
    setOpen(willOpen);

    if (willOpen) {
      setSuggestion(null);
      setEditing(originalText || "");
      // Fetch suggestion immediately (mirrors old behavior)
      // Fire-and-forget but awaited to ensure suggestion appears early
      await fetchSuggestion();
    }
  };

  const handleAccept = () => {
    onAccept(editing);
    setOpen(false);
    toast.success(`${fieldLabel} updated`);
  };

  // Popover layout: fixed-position, column flex, internal scroll area so footer stays visible
  const popover = open
    ? createPortal(
        <div
          ref={popRef}
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            top: pos.top,
            left: pos.left,
            width: 360,
            zIndex: 9999,
            display: "flex",
            flexDirection: "column",
            maxHeight: Math.floor(window.innerHeight * 0.6),
          }}
          className="shadow-2xl rounded-lg bg-white border"
        >
          {/* Header */}
          <div className="p-3 flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <FaMagic className="text-indigo-600" />
              <div>
                <div className="text-sm font-semibold">AI Improve</div>
                <div className="text-xs text-gray-400">Context: {context}</div>
              </div>
            </div>

            <button
              onClick={() => setOpen(false)}
              className="text-gray-400 hover:text-gray-600 p-1"
              aria-label="Close AI improve dialog"
            >
              <FaTimes />
            </button>
          </div>

          {/* Scrollable content */}
          <div className="px-3 pb-3" style={{ overflow: "hidden", flex: "1 1 auto", display: "flex", flexDirection: "column" }}>
            <div className="text-xs text-gray-500">Original</div>
            <div className="mt-1 max-h-28 overflow-auto text-sm p-2 bg-gray-50 rounded border break-words">
              {originalText && originalText.length ? originalText : <span className="text-gray-300">— empty —</span>}
            </div>

            <div className="mt-3 flex items-center justify-between">
              <div className="text-xs text-gray-500">Suggestion</div>
              <button
                onClick={fetchSuggestion}
                disabled={loading}
                className="text-xs text-indigo-600 font-medium disabled:opacity-50"
              >
                {loading ? "Thinking..." : "Regenerate"}
              </button>
            </div>

            <textarea
              rows={6}
              value={editing}
              onChange={(e) => setEditing(e.target.value)}
              className="w-full p-2 border rounded mt-2 text-sm resize-y flex-shrink-0"
              placeholder="AI suggestion will appear here"
              style={{ minHeight: 120 }}
            />
          </div>

          {/* Footer — always visible */}
          <div className="p-3 border-t bg-white flex justify-end gap-2">
            <button onClick={() => setOpen(false)} className="px-3 py-1 text-sm rounded border hover:bg-gray-50">
              Cancel
            </button>
            <button
              onClick={handleAccept}
              className="px-4 py-1 bg-indigo-600 text-white rounded text-sm font-medium hover:bg-indigo-700 flex items-center gap-2"
            >
              <FaCheck /> Apply
            </button>
          </div>
        </div>,
        document.body
      )
    : null;

  return (
    <>
      <button
        ref={btnRef}
        onClick={handleOpen}
        type="button"
        className="text-xs px-2 py-1 border rounded bg-indigo-50 text-indigo-700 hover:bg-indigo-100 flex items-center gap-2"
        aria-expanded={open}
        aria-haspopup="dialog"
        title={`AI Improve ${fieldLabel}`}
      >
        {loading ? <FaSpinner className="animate-spin" /> : <FaMagic />}
        <span className="hidden sm:inline">AI</span>
      </button>

      {popover}
    </>
  );
}
