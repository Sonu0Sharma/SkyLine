// src/components/mock/SidebarToggle.jsx
import React from "react";
import { FaBars } from "react-icons/fa";

/**
 * Small floating toggle on mobile to open/close sidebar
 */
export default function SidebarToggle({ open, setOpen }) {
  return (
    <button
      onClick={() => setOpen((s) => !s)}
      className="md:hidden fixed left-4 top-6 z-40 bg-white border rounded-full p-3 shadow-lg"
      aria-label="Toggle sidebar"
      title={open ? "Close sidebar" : "Open sidebar"}
    >
      <FaBars />
    </button>
  );
}
