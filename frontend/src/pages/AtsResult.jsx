// frontend/src/pages/AtsResult.jsx
import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FaArrowLeft, FaCopy, FaDownload, FaMagic } from "react-icons/fa";
import Gauge from "../components/Gauge";
import { toast } from "react-hot-toast";
import axios from "axios";

/**
 * Patched AtsResult.jsx (improved cleaning & dedupe)
 *
 * Key fixes:
 * - Aggressively clean noisy tokens and fragments
 * - Normalize camel/case concatenations into spaced words
 * - Remove one-word fragments and repetitive fragments
 * - Deduplicate items while preserving order
 * - Keep card UI and Fix (AI) behavior unchanged
 * - Changed Missing Keywords UI to pill/chips (no plus sign)
 */

/* ---------- Utilities ---------- */

function safeStr(x) {
  if (x === null || x === undefined) return "";
  return String(x);
}

// Aggressive cleaning: collapse newlines/fragments, split concatenated words,
// remove repeated words, remove trailing partial fragments like "S…", "Ove…"
function cleanSnippet(raw, maxLen = 200) {
  if (!raw) return "";
  let s = safeStr(raw);

  // Replace common unicode ellipses and weird chars with space
  s = s.replace(/[\u2026\uFFFD]+/g, " ");

  // Replace line breaks and multiple spaces with single space
  s = s.replace(/\r\n|\r|\n/g, " ").replace(/\s{2,}/g, " ").trim();

  // Insert space between letters+digits/letters if concatenated like "aws.js" or "angular.js"
  s = s.replace(/([a-z])\.([a-z])/gi, "$1.$2"); // keep dots
  // Insert spaces between letters and numbers or letter-case boundaries: "experiencewithAngularJS" -> "experience with Angular JS"
  s = s.replace(/([a-z])([A-Z])/g, "$1 $2");
  s = s.replace(/([a-zA-Z])([0-9])/g, "$1 $2");
  s = s.replace(/([0-9])([a-zA-Z])/g, "$1 $2");

  // Break joined words that look like 'experiencewithangularjs' into tokens with heuristics:
  // insert space before common keywords if detected without punctuation
  const keywords = ["experience", "skills", "angular", "react", "node", "aws", "javascript", "communication", "preferred", "required", "css", "html", "mongodb"];
  const lower = s.toLowerCase();
  keywords.forEach((kw) => {
    const re = new RegExp(`(${kw})([a-z]{3,})`, "gi");
    s = s.replace(re, (m, a, b) => `${a} ${b}`);
  });

  // Remove isolated one-letter tokens or nonsense fragments like "S…" "M…" "To…"
  s = s.replace(/\b\w\b/g, "").replace(/\s{2,}/g, " ").trim();

  // Remove duplicated adjacent words like "strong strong communication"
  s = s.replace(/\b(\w+)(?:\s+\1\b)+/gi, "$1");

  // Remove sequences of repeated short fragments separated by punctuation/newlines turned into spaces
  // If the snippet contains many very short tokens (<3 chars) in a row, collapse them
  const tokens = s.split(" ");
  let compactTokens = [];
  let shortSeq = 0;
  for (let t of tokens) {
    if (!t) continue;
    if (t.length <= 2) {
      shortSeq++;
    } else {
      shortSeq = 0;
    }
    // drop short tokens if they appear in long runs
    if (shortSeq > 2) continue;
    compactTokens.push(t);
  }
  s = compactTokens.join(" ").trim();

  // Trim stray punctuation at ends
  s = s.replace(/^[\-\–\—\:\;\.]+/, "").replace(/[\-\–\—\:\;\.]+$/, "").trim();

  // If still tiny fragments (1-3 chars) likely noise, mark as empty
  if (s.length <= 3) return "";

  // Finally, enforce maxLen at word boundary
  if (s.length > maxLen) {
    s = s.slice(0, maxLen);
    const lastSpace = s.lastIndexOf(" ");
    if (lastSpace > Math.floor(maxLen * 0.6)) s = s.slice(0, lastSpace) + "…";
    else s = s + "…";
  }

  return s;
}

// Normalize & dedupe an array of strings (preserve order)
function dedupeLines(lines) {
  const seen = new Set();
  const out = [];
  for (let l of lines) {
    const c = cleanSnippet(l);
    if (!c) continue;
    const key = c.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      out.push(c);
    }
  }
  return out;
}

/* ---------- Heuristic extractors ---------- */

// Try to compute a concise sentence like "Resume matches X/Y required skills"
function sentenceFromCounts(report) {
  try {
    const kb = (report.raw && report.raw.keywords && report.raw.keywords.breakdown) || {};
    const requiredBlock = kb.required || {};
    const preferredBlock = kb.preferred || {};

    const required_found = requiredBlock.found_count || (Array.isArray(requiredBlock.found) ? requiredBlock.found.length : 0) || 0;
    const required_total = requiredBlock.total || requiredBlock.required_total || (Array.isArray(requiredBlock.required_keywords) ? requiredBlock.required_keywords.length : 0) || 0;

    const pref_found = preferredBlock.found_count || (Array.isArray(preferredBlock.found) ? preferredBlock.found.length : 0) || 0;
    const pref_total = preferredBlock.total || preferredBlock.preferred_total || (Array.isArray(preferredBlock.preferred_keywords) ? preferredBlock.preferred_keywords.length : 0) || 0;

    if (required_total) {
      let txt = `Resume matches ${required_found}/${required_total} required skills`;
      if (pref_total) txt += ` and ${pref_found}/${pref_total} preferred skills`;
      txt += ".";
      return txt;
    }
  } catch (e) {
    // ignore
  }
  return null;
}

// Good points: try backend first, else heuristics from semantics.high_matches, keywords found, and a fallback generic line
function extractGoodPointsFromReport(report) {
  const backendGood = (report.insights && Array.isArray(report.insights.good_points) ? report.insights.good_points : []).map(String);
  let candidates = [];

  if (backendGood.length) candidates = backendGood;

  // Add deterministic sentence from counts if available
  const summary = sentenceFromCounts(report);
  if (summary) candidates.push(summary);

  // Semantics high_matches
  try {
    const highMatches = (report.raw && report.raw.semantics && report.raw.semantics.high_matches) || [];
    if (Array.isArray(highMatches) && highMatches.length) {
      highMatches.slice(0, 4).forEach((hm) => {
        const resume = hm.resume || hm.match || hm.bullet || "";
        const jd = hm.jd || hm.requirement || "";
        const sim = hm.similarity || hm.score || "";
        const line = resume ? `Strong alignment: ${resume}${sim ? ` (sim ${sim})` : ""}` : `Strong alignment: ${jd}`;
        candidates.push(line);
      });
    }
  } catch (e) {}

  // Keywords raw counts (if present)
  try {
    const kwRaw = (report.raw && report.raw.keywords) || {};
    const rawCounts = kwRaw.raw_counts || kwRaw.found_counts || {};
    const short = [];
    if (rawCounts && typeof rawCounts === "object") {
      Object.keys(rawCounts).slice(0, 6).forEach((k) => {
        short.push(`${k}: ${rawCounts[k]}`);
      });
    }
    if (short.length) candidates.push(`Keyword hits — ${short.join(", ")}`);
  } catch (e) {}

  // fallback: take quick_wins that don't contain negative words
  if (!candidates.length) {
    const quick = (report.insights && Array.isArray(report.insights.quick_wins) ? report.insights.quick_wins : []);
    quick.forEach((q) => {
      const s = String(q || "");
      const low = s.toLowerCase();
      if (!/no |not |missing|does not|lack|insufficient|unavailable|problem|weak|needs/.test(low)) {
        candidates.push(s);
      }
    });
  }

  // final fallback generic positive line
  if (!candidates.length) candidates.push("Resume contains relevant skills and experience for the role (see details).");

  return dedupeLines(candidates).slice(0, 6);
}

// Issues: prefer semantics.missing_requirements and keywords.breakdown.missing; create readable lines
function extractIssuesFromReport(report) {
  const backendIssues = (report.insights && Array.isArray(report.insights.issues) ? report.insights.issues : []).map(String);
  let candidates = [];

  if (backendIssues.length) candidates = backendIssues;

  // Semantics missing_requirements
  try {
    const semMissing = (report.raw && report.raw.semantics && report.raw.semantics.missing_requirements) || [];
    if (Array.isArray(semMissing) && semMissing.length) {
      semMissing.slice(0, 6).forEach((m) => {
        candidates.push(`Missing context: ${m}`);
      });
    }
  } catch (e) {}

  // Keywords missing
  try {
    const kb = (report.raw && report.raw.keywords && report.raw.keywords.breakdown) || {};
    ["required", "preferred", "bonus"].forEach((tier) => {
      const block = kb[tier] || {};
      const missing = block.missing || [];
      if (Array.isArray(missing) && missing.length) {
        missing.slice(0, 6).forEach((m) => {
          const txt = typeof m === "string" ? m : (m && (m.phrase || m.text)) || JSON.stringify(m);
          candidates.push(`${tier} keyword missing: ${txt}`);
        });
      }
    });
  } catch (e) {}

  // Fallback: pick negative quick_wins
  if (!candidates.length) {
    const quick = (report.insights && Array.isArray(report.insights.quick_wins) ? report.insights.quick_wins : []);
    quick.forEach((q) => {
      const s = String(q || "");
      const low = s.toLowerCase();
      if (/no |not |missing|does not|lack|insufficient|unavailable|problem|weak|needs/.test(low)) {
        candidates.push(s);
      }
    });
  }

  if (!candidates.length) candidates.push("Some role-specific keywords or context are missing; consider aligning bullets to the JD.");

  return dedupeLines(candidates).slice(0, 8);
}

/* ---------- Component ---------- */

export default function AtsResult() {
  const navigate = useNavigate();
  const location = useLocation();
  const [report, setReport] = useState(null);
  const [rewrites, setRewrites] = useState({});
  const [expanded, setExpanded] = useState({});
  const [enhancingAll, setEnhancingAll] = useState(false);

  useEffect(() => {
    const fromState = location.state && location.state.report;
    if (fromState) {
      setReport(fromState);
      return;
    }
    try {
      const saved = sessionStorage.getItem("ats_report");
      if (saved) setReport(JSON.parse(saved));
    } catch (e) {
      console.warn("Could not load report from sessionStorage:", e);
    }
  }, [location.state]);

  if (!report) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-700 text-lg">
        No report data found. Please run an ATS check first.
      </div>
    );
  }

  const breakdown = report.breakdown || {};
  const totalScore = report.total_score || 0;
  const getMetricScore = (key) => {
    const val = breakdown[key];
    if (!val) return 0;
    return val.score || val.readability_score || val.structure_score || val.semantic_score || val.tone_score || 0;
  };

  const goodPoints = extractGoodPointsFromReport(report);
  const issues = extractIssuesFromReport(report);

  const needsAttentionRaw = Array.isArray(report.insights && report.insights.quick_wins ? report.insights.quick_wins : (report.insights && report.insights.gap_analysis ? report.insights.gap_analysis : []))
    ? (report.insights && (report.insights.quick_wins || report.insights.gap_analysis)) : [];

  // Missing keywords: normalize to list of {tier, text}
  const missingKeywords = (() => {
    try {
      const kb = (report.raw && report.raw.keywords && report.raw.keywords.breakdown) || {};
      const out = [];
      ["required", "preferred", "bonus"].forEach((tier) => {
        const block = kb[tier] || {};
        const missing = block.missing || [];
        if (Array.isArray(missing)) {
          missing.forEach((m) => {
            const txt = typeof m === "string" ? m : (m && (m.phrase || m.text)) || JSON.stringify(m);
            const cleaned = cleanSnippet(txt, 140);
            if (cleaned) out.push({ tier, text: cleaned });
          });
        }
      });
      return out;
    } catch (e) {
      return [];
    }
  })();

  const toggleExpand = (key) => setExpanded((s) => ({ ...s, [key]: !s[key] }));

  async function rewriteItem(type, idx) {
    // type: "needs"|"good"|"issue"
    let item;
    if (type === "good") item = goodPoints[idx];
    else if (type === "issue") item = issues[idx];
    else item = needsAttentionRaw[idx];

    if (!item) {
      toast.error("Item not found.");
      return;
    }

    const key = `${type}-${idx}`;
    if (rewrites[key] && rewrites[key].after) {
      setExpanded((s) => ({ ...s, [key]: true }));
      return;
    }

    setRewrites((s) => ({ ...s, [key]: { ...(s[key] || {}), loading: true } }));

    const payload = { report, quick_win: item };
    const endpoints = ["/api/ai/enhance-ats", "/ai/enhance-ats"];
    let resp = null;
    try {
      for (const ep of endpoints) {
        try {
          resp = await axios.post(ep, payload, { timeout: 30000 });
          if (resp && resp.status >= 200 && resp.status < 300) break;
        } catch (e) {
          // try next
        }
      }
      if (!resp) throw new Error("No AI response");

      const candidate = resp.data && (resp.data.data && resp.data.data.enhanced ? resp.data.data.enhanced : (resp.data.enhanced || resp.data.data || resp.data));
      let afterText = null;
      if (Array.isArray(candidate) && candidate.length) {
        const first = candidate[0];
        afterText = first.after || first.rewrite || first.recommendation || first.enhanced || (typeof first === "string" ? first : null);
      } else if (candidate && typeof candidate === "object") {
        afterText = candidate.after || candidate.rewrite || candidate.recommendation || candidate.enhanced || candidate.text || null;
      } else if (typeof candidate === "string") {
        afterText = candidate;
      }

      if (!afterText) afterText = resp.data && (resp.data.text || resp.data.output) || null;

      if (!afterText) {
        afterText = `Rewrite suggestion (AI returned unexpected shape). Original: ${String(item).slice(0, 200)}`;
        toast("AI responded but output couldn't be parsed exactly — showing fallback.", { icon: "⚠️" });
      } else {
        toast.success("Rewrite generated by AI");
      }

      setRewrites((s) => ({ ...s, [key]: { before: String(item), after: afterText, loading: false } }));
      setExpanded((s) => ({ ...s, [key]: true }));
    } catch (err) {
      console.error("Rewrite error:", err);
      setRewrites((s) => ({ ...s, [key]: { ...(s[key] || {}), loading: false, error: "AI rewrite failed." } }));
      toast.error("AI rewrite failed. See console.");
    }
  }

  const enhanceAll = async () => {
    setEnhancingAll(true);
    try {
      const endpoints = ["/api/ai/enhance-ats", "/ai/enhance-ats"];
      let resp = null;
      for (const ep of endpoints) {
        try {
          resp = await axios.post(ep, { report }, { timeout: 30000 });
          if (resp && resp.status >= 200 && resp.status < 300) break;
        } catch (e) {}
      }
      if (!resp) throw new Error("No AI response");
      const candidate = resp.data && (resp.data.data && resp.data.data.enhanced ? resp.data.data.enhanced : (resp.data.enhanced || resp.data.data || resp.data));
      if (Array.isArray(candidate)) {
        setReport((r) => ({ ...r, enhanced_quick_wins: candidate }));
        toast.success("Enhanced quick wins applied");
      } else {
        toast.success("AI responded (unexpected shape)");
        console.debug("enhanceAll response:", resp.data);
      }
    } catch (err) {
      console.error("Enhance all failed:", err);
      toast.error("AI enhancement failed for all items.");
    } finally {
      setEnhancingAll(false);
    }
  };

  const exportEnhanced = (data) => {
    try {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "quick_wins.json";
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Exported");
    } catch {
      toast.error("Export failed");
    }
  };

  const cardClass = "backdrop-blur-xl bg-white/40 shadow-xl border border-white/30 rounded-3xl p-6";

  const needsToShow = Array.isArray(report.enhanced_quick_wins) ? report.enhanced_quick_wins : needsAttentionRaw;

  return (
    <div
      className="min-h-screen py-12 px-6 rounded-[18px] overflow-hidden"
      style={{
        background: `
          radial-gradient(900px 500px at 8% 8%, rgba(145, 165, 245, 0.55), transparent 65%),
          radial-gradient(900px 500px at 92% 22%, rgba(170, 195, 255, 0.50), transparent 65%),
          linear-gradient(135deg, #DCE4FF 0%, #EAF0FF 45%, #FFFFFF 100%)
        `
      }}
>

      <div className="max-w-6xl mx-auto space-y-10">
        <button onClick={() => navigate("/ats")} className="inline-flex items-center gap-2 text-gray-600 hover:text-indigo-600">
          <FaArrowLeft /> Back to ATS Checker
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className={`${cardClass} flex flex-col items-center justify-center pb-10`}>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Overall ATS Score</h2>
            <Gauge value={totalScore} animate />
            <div className="mt-4 text-sm text-gray-600 text-center">Combined: Keywords, Structure, Semantics, Readability, Tone</div>
          </div>

          <div className={`${cardClass} col-span-1 lg:col-span-2`}>
            <h2 className="text-xl font-bold text-gray-900">Role Detection</h2>
            <p className="mt-2">
              <span className="font-semibold text-indigo-700">{report.role && report.role.role ? report.role.role : "general"}</span>{" "}
              ({Math.round(((report.role && report.role.confidence) || 0) * 100)}% confidence)
            </p>
            <p className="mt-4 text-gray-600 leading-relaxed">{report.insights && report.insights.overall_summary ? report.insights.overall_summary : ""}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          {[
            ["structure", "Structural Quality", "Sections & formatting"],
            ["keywords", "Keyword Match", "JD alignment"],
            ["semantics", "Semantic Relevance", "Contextual similarity"],
            ["readability", "Readability", "Clarity & concision"],
            ["tone", "Tone & Impact", "Action words & achievements"],
          ].map(([key, title, desc]) => {
            const score = getMetricScore(key) || 0;
            return (
              <div key={key} className={`${cardClass} flex flex-col justify-between`}>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
                  <p className="text-sm text-gray-500 mt-1">{desc}</p>
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <div className="text-3xl font-bold text-indigo-600">{score}</div>
                  <div style={{ minWidth: 120, marginLeft: 16, flex: 1 }}>
                    <div className="mt-4 w-full bg-white/60 rounded-full h-2.5 overflow-hidden border border-white/20">
                      <div
                        className={`h-2.5 bg-gradient-to-r from-indigo-400 to-blue-500 rounded-full transition-all duration-600`}
                        style={{ width: `${Math.max(0, Math.min(100, Math.round(score)))}%`, boxShadow: "0 6px 18px rgba(59,130,246,0.12)" }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Quick Wins */}
        <div className={cardClass}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Quick Wins</h2>
              <div className="text-xs text-gray-400">Good matches, Issues, and Needs Attention</div>
            </div>

            <div className="flex items-center gap-3">
              <button onClick={enhanceAll} disabled={enhancingAll} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-600 text-white text-sm hover:bg-indigo-700 transition">
                <FaMagic /> Fix (AI)
              </button>

              <button onClick={() => { const source = report.enhanced_quick_wins || needsToShow; if (!source || source.length === 0) { toast.error("No quick wins to copy."); return; } navigator.clipboard.writeText(JSON.stringify(source, null, 2)); toast.success("Copied quick wins JSON"); }} className="px-3 py-1 rounded-full bg-white border border-gray-200 text-xs inline-flex items-center gap-2 hover:bg-gray-50 transition">
                <FaCopy /> Copy
              </button>

              <button onClick={() => { const source = report.enhanced_quick_wins || needsToShow; if (!source || source.length === 0) { toast.error("No quick wins to export."); return; } exportEnhanced(source); }} className="px-3 py-1 rounded-full bg-white border border-gray-200 text-xs inline-flex items-center gap-2 hover:bg-gray-50 transition">
                <FaDownload /> Export
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Good */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Good (Matches)</h4>
              <ul className="space-y-3">
                {goodPoints && goodPoints.length ? (
                  goodPoints.map((g, i) => (
                    <li key={`good-${i}`} className="rounded-lg bg-white p-3 border border-gray-100 text-sm shadow-sm">
                      <div className="font-medium text-gray-800">{g}</div>
                    </li>
                  ))
                ) : (
                  <li className="rounded-lg bg-white p-3 border border-gray-100 text-sm shadow-sm text-gray-500">No strong positives detected.</li>
                )}
              </ul>
            </div>

            {/* Issues */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Issues</h4>
              <ul className="space-y-3">
                {issues && issues.length ? (
                  issues.map((it, i) => (
                    <li key={`issue-${i}`} className="rounded-lg bg-white p-3 border border-gray-100 text-sm shadow-sm">
                      <div className="font-medium text-gray-800">{it}</div>
                    </li>
                  ))
                ) : (
                  <li className="rounded-lg bg-white p-3 border border-gray-100 text-sm shadow-sm text-gray-500">No major issues detected.</li>
                )}
              </ul>
            </div>

            {/* Needs Attention */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Needs Attention</h4>
              <ul className="space-y-3">
                {needsToShow && needsToShow.length ? (
                  needsToShow.map((item, idx) => {
                    const title = typeof item === "string" ? item : (item && (item.title || item.recommendation)) || JSON.stringify(item);
                    const subtitle = item && item.reason ? item.reason : "";
                    const key = `needs-${idx}`;
                    const r = rewrites[key] || {};
                    const isExpanded = !!expanded[key];
                    return (
                      <li key={key} className="rounded-xl bg-white/60 backdrop-blur border border-gray-100 shadow overflow-hidden">
                        <div className="px-4 py-3 flex items-center justify-between gap-4">
                          <div className="flex-1 text-gray-800">
                            <div className="font-semibold">{cleanSnippet(title)}</div>
                            {subtitle ? <div className="text-xs text-gray-500 mt-1">{cleanSnippet(subtitle)}</div> : null}
                          </div>

                          <div className="flex items-center gap-2">
                            <button onClick={() => rewriteItem("needs", idx)} disabled={r.loading || !!r.after} className={`px-3 py-1 rounded-full text-xs inline-flex items-center gap-2 ${r.loading ? "bg-gray-200 text-gray-600" : r.after ? "bg-green-50 text-green-700 border border-green-100" : "bg-white border border-gray-200 hover:bg-gray-50"}`}>
                              {r.loading ? "Thinking..." : r.after ? "Rewritten" : "Rewrite (AI)"}
                            </button>

                            <button onClick={() => toggleExpand(key)} className="p-2 rounded-full bg-white border border-gray-100 hover:bg-gray-50">
                              {isExpanded ? "−" : "+"}
                            </button>
                          </div>
                        </div>

                        <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isExpanded ? "max-h-96 p-4 opacity-100" : "max-h-0 p-0 opacity-0"}`}>
                          <div className="text-sm text-gray-700">
                            <div className="mb-3">
                              <div className="text-xs text-gray-500 mb-1">Before</div>
                              <div className="p-3 rounded-lg bg-white border border-gray-100 text-sm">{cleanSnippet(title) || "[no before text]"}</div>
                            </div>
                            <div>
                              <div className="text-xs text-gray-500 mb-1">After (AI rewrite)</div>
                              {r.loading ? (
                                <div className="p-3 rounded-lg bg-white border border-gray-100 text-sm text-gray-500">Generating rewrite...</div>
                              ) : r.error ? (
                                <div className="p-3 rounded-lg bg-red-50 border border-red-100 text-sm text-red-700">{r.error}</div>
                              ) : r.after ? (
                                <div className="p-3 rounded-lg bg-white border border-gray-100 text-sm text-gray-800">{r.after}</div>
                              ) : (
                                <div className="p-3 rounded-lg bg-white border border-dashed border-gray-200 text-sm text-gray-500">No rewrite yet. Click <strong>Rewrite (AI)</strong>.</div>
                              )}
                            </div>
                          </div>
                        </div>
                      </li>
                    );
                  })
                ) : (
                  <li className="rounded-lg bg-white p-3 border border-gray-100 text-sm shadow-sm text-gray-500">No items requiring attention.</li>
                )}
              </ul>
            </div>
          </div>
        </div>

        {/* Missing Keywords (CHIPS UI) */}
        <div className={cardClass}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Missing Keywords</h2>
              <div className="text-xs text-gray-400">Keywords from JD not found or underrepresented in the resume</div>
            </div>

            <div>
              <button onClick={() => { if (!missingKeywords || missingKeywords.length === 0) { toast.error("No missing keywords detected."); return; } exportEnhanced(missingKeywords); }} className="px-3 py-1 rounded-full bg-white border border-gray-200 text-xs inline-flex items-center gap-2 hover:bg-gray-50 transition">
                <FaDownload /> Export
              </button>
            </div>
          </div>

          <div>
            {missingKeywords && missingKeywords.length ? (
              <div className="flex flex-wrap gap-3">
                {missingKeywords.map((k, i) => (
                  <span
                    key={`mk-${i}`}
                    className="inline-flex items-center px-3 py-1 rounded-full border border-gray-200 bg-white text-sm text-gray-700 shadow-sm"
                    title={`Tier: ${k.tier}`}
                  >
                    {k.text}
                  </span>
                ))}
              </div>
            ) : (
              <div className="rounded-lg bg-white p-3 border border-gray-100 text-sm shadow-sm text-gray-500">No missing keywords detected (based on current analysis).</div>
            )}
          </div>
        </div>

        <div className="text-center text-xs text-gray-500 mt-10">Structure · Keywords · Semantic Match · Readability · Tone</div>
      </div>
    </div>
  );
}
