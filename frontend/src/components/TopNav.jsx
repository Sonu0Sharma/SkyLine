// frontend/src/components/TopNav.jsx
import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  FaBars,
  FaTimes,
  FaCog,
  FaSignOutAlt,
  FaUser,
  FaBell,
} from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";

const NAV_ITEMS = [
  { label: "Dashboard", path: "/" },
  { label: "Job Aggregator", path: "/jobs" },
  { label: "Resume Generator", path: "/resume" },
  { label: "ATS Checker", path: "/ats" },
  { label: "Mock Practice", path: "/mock" },
  { label: "AI Assistant", path: "/ai" },
];

function TopNav() {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  return (
    <header className="sticky top-0 z-50" aria-label="Global">
      <div
        className="backdrop-blur-md bg-white/60 border-b border-white/20 shadow-soft-lg"
        style={{ WebkitBackdropFilter: "saturate(120%) blur(6px)" }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="flex items-center justify-between h-16 relative">
            {/* Left: Logo + Name */}
            <div className="flex items-center gap-3 z-20">
              <Link to="/" className="flex items-center gap-3">
                <span
                  className="inline-flex items-center justify-center w-10 h-10 rounded-lg text-white font-bold"
                  style={{
                    background:
                      "linear-gradient(135deg,#6366f1 0%,#3b82f6 100%)",
                    boxShadow:
                      "0 6px 18px rgba(59,130,246,0.18), inset 0 -1px 0 rgba(255,255,255,0.06)",
                  }}
                  aria-hidden
                >
                  S
                </span>

                {/* Product name structured into two lines */}
                <div className="flex flex-col leading-tight">
                  <span className="text-lg font-extrabold text-gray-900 tracking-tight -mb-0.5">
                    Skyline
                  </span>
                  <span className="text-xs text-gray-500">AI Career Assistant</span>
                </div>
              </Link>
            </div>

            {/* Center: Nav (absolute-centered so it remains visually centered) */}
            <div className="absolute left-1/2 transform -translate-x-1/2 z-10 hidden md:block">
              <nav className="flex items-center gap-1" aria-label="Primary">
                {NAV_ITEMS.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`relative px-4 py-2 text-sm font-medium rounded-md transition-colors duration-200 ${
                      isActive(item.path)
                        ? "text-indigo-700"
                        : "text-gray-600 hover:text-indigo-700 hover:bg-white/40"
                    }`}
                    aria-current={isActive(item.path) ? "page" : undefined}
                  >
                    {item.label}
                    {isActive(item.path) && (
                      <motion.span
                        layoutId="nav-underline"
                        className="absolute left-3 right-3 -bottom-2 h-0.5 rounded-md"
                        style={{ background: "linear-gradient(90deg,#6366f1,#3b82f6)" }}
                      />
                    )}
                  </Link>
                ))}
              </nav>
            </div>

            {/* Right: Notifications + Profile + Mobile toggle */}
            <div className="flex items-center gap-3 z-20">
              {/* Notifications */}
              <button
                aria-label="Notifications"
                className="relative inline-flex items-center justify-center p-2 rounded-lg bg-white/70 border border-white/30 hover:scale-105 transition"
                title="Notifications"
              >
                <FaBell className="text-gray-700" />
                <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-500 text-white">
                  3
                </span>
              </button>

              {/* Profile dropdown - avatar has visible border */}
              <div className="relative">
                <button
                  onClick={() => setIsProfileOpen((s) => !s)}
                  className="flex items-center gap-2 focus:outline-none"
                  aria-expanded={isProfileOpen}
                  aria-haspopup="true"
                >
                  <div
                    className="w-9 h-9 rounded-full bg-white/80 flex items-center justify-center font-semibold text-indigo-700 shadow"
                    style={{
                      border: "2px solid rgba(99,102,241,0.18)",
                    }}
                  >
                    US
                  </div>
                </button>

                <AnimatePresence>
                  {isProfileOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      className="absolute right-0 mt-3 w-64 bg-white/90 backdrop-blur-md rounded-xl shadow-2xl border border-white/20 py-2"
                      role="menu"
                    >
                      <div className="px-4 py-3 border-b border-white/10">
                        <p className="text-sm font-semibold text-gray-900">Demo User</p>
                        <p className="text-xs text-gray-500 truncate">user@example.com</p>
                      </div>

                      <Link
                        to="/profile"
                        onClick={() => setIsProfileOpen(false)}
                        className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700"
                        role="menuitem"
                      >
                        <FaUser className="text-gray-400" /> Profile
                      </Link>

                      <Link
                        to="#"
                        onClick={() => setIsProfileOpen(false)}
                        className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700"
                        role="menuitem"
                      >
                        <FaCog className="text-gray-400" /> Settings
                      </Link>

                      <div className="border-t border-white/10 my-1" />

                      <button
                        className="w-full flex items-center gap-3 px-4 py-2 text-sm text-rose-600 hover:bg-rose-50"
                      >
                        <FaSignOutAlt className="text-rose-400" /> Sign Out
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Mobile toggle */}
              <div className="md:hidden">
                <button
                  onClick={() => setIsMobileMenuOpen((s) => !s)}
                  className="inline-flex items-center justify-center p-2 rounded-lg bg-white/70 border border-white/20 text-gray-700"
                  aria-expanded={isMobileMenuOpen}
                  aria-controls="mobile-menu"
                >
                  {isMobileMenuOpen ? <FaTimes size={18} /> : <FaBars size={18} />}
                </button>
              </div>
            </div>
          </div>

          {/* Mobile slide-down menu */}
          <AnimatePresence>
            {isMobileMenuOpen && (
              <motion.nav
                id="mobile-menu"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="md:hidden bg-white/80 border-t border-white/10 backdrop-blur-md"
              >
                <div className="px-4 pt-4 pb-6 space-y-3">
                  {NAV_ITEMS.map((item) => (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`block px-3 py-2 rounded-md text-base font-medium ${
                        isActive(item.path) ? "text-indigo-700 bg-indigo-50" : "text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      {item.label}
                    </Link>
                  ))}

                  <div className="pt-2 border-t border-white/10" />

                  <div className="mt-2">
                    <Link
                      to="/profile"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center gap-3 px-3 py-2 rounded-md text-gray-700"
                    >
                      <FaUser /> Profile
                    </Link>
                  </div>
                </div>
              </motion.nav>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}

export default TopNav;
