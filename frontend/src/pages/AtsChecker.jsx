// frontend/src/pages/AtsChecker.jsx
import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { FaSpinner, FaArrowRight, FaUpload } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import Gauge from "../components/Gauge";

/**
 * AtsChecker.jsx — layout fixes + applied ATSResult background
 * - left content spans 8/12 on lg
 * - right Quick Preview spans 4/12
 * - ambient gradient + soft vignette applied to page
 * - preserved all functionality (endpoints, file upload, sample loader)
 */

// --- HARDCODED SAMPLE DATA (Replaces broken dev endpoint) ---
const SAMPLE_RESUME = `JACKSON MACARTHUR
Web Developer
Atlanta, GA | 123-456-7890 | jack@email.com

SUMMARY
Software engineer with a proven ability to adapt in collaborative environments.
Spearheaded transition from Firebase to AWS, saving company $3,700+ monthly.

SKILLS
JavaScript, HTML, CSS, React.js, Node.js, Angular.js, MongoDB, AWS, Java

EXPERIENCE
Web Developer | Squarespace | August 2020 - Current
- Coached 4 junior designers in ARIA accessibility standards.
- Created and oversaw wireframe designs from client requests.
- Developed documentation to teach new team members company standards.

Web Designer | Coca-Cola | Jan 2017 - Aug 2020
- Built mock designs and wireframes for landing pages.
- Collaborated on Complexity Score tool to remove process bottlenecks.`;

const SAMPLE_JD = `We are looking for a Senior Web Developer.

REQUIRED SKILLS:
- JavaScript, HTML, CSS
- Experience with React.js and Node.js is essential.
- Knowledge of AWS and database management (MongoDB).

PREFERRED:
- Experience with Angular.js
- Strong communication skills.`;

export default function AtsChecker() {
  const navigate = useNavigate();
  const [resumeText, setResumeText] = useState("");
  const [jdText, setJdText] = useState("");
  const [savedResumes, setSavedResumes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(true);
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);

  // load saved resumes (try both /api/ prefix and no-prefix)
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const tryUrls = ["/api/profile/resumes", "/profile/resumes"];
        let payload = null;
        for (const url of tryUrls) {
          try {
            const res = await axios.get(url);
            const data = res.data?.data ?? res.data;
            if (Array.isArray(data)) {
              payload = data;
              break;
            }
          } catch {
            /* ignore and try next */
          }
        }
        if (mounted && payload) setSavedResumes(payload);
      } catch (e) {
        console.debug("Saved resumes not available:", e?.message || e);
      }
    })();
    return () => (mounted = false);
  }, []);

  const validateInputs = () => {
    if (!resumeText || !resumeText.trim()) {
      setError("Please paste or upload a resume first.");
      return false;
    }
    if (!jdText || !jdText.trim()) {
      setError("Please paste the Job Description to compare.");
      return false;
    }
    setError("");
    return true;
  };

  // POST to ATS endpoint with fallback logic (v2 -> v1)
  const postAtsWithFallback = async (rText, jText) => {
    const payload = { resume_text: rText, jd_text: jText };
    const endpoints = [
      "/api/resume/ats-score-v2",
      "/api/resume/ats-score",
      "/resume/ats-score-v2",
      "/resume/ats-score",
    ];
    let lastErr = null;
    for (const ep of endpoints) {
      try {
        const resp = await axios.post(ep, payload);
        return resp.data?.data ?? resp.data;
      } catch (err) {
        lastErr = err;
      }
    }
    throw lastErr ?? new Error("No ATS endpoint reachable.");
  };

  // run analysis and navigate to results
  const runAnalysisAndNavigate = async (rText, jText) => {
    setLoading(true);
    setError("");
    try {
      const payload = await postAtsWithFallback(rText, jText);
      try {
        sessionStorage.setItem("ats_report", JSON.stringify(payload));
      } catch {
        /* ignore storage errors */
      }
      navigate("/ats-result", { state: { report: payload } });
    } catch (err) {
      console.error("ATS analysis failed:", err);
      const msg = err?.response?.data?.detail || err?.message || "Analysis failed. Check backend or endpoint.";
      setError(msg);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyzeClick = async () => {
    if (!validateInputs()) return;
    await runAnalysisAndNavigate(resumeText, jdText);
  };

  // Upload with fallback endpoints
  const uploadWithFallback = async (file) => {
    const form = new FormData();
    form.append("file", file);
    const endpoints = ["/api/resume/upload-resume", "/resume/upload-resume"];
    let lastErr = null;
    for (const ep of endpoints) {
      try {
        const res = await axios.post(ep, form, { headers: { "Content-Type": "multipart/form-data" } });
        return res.data?.data ?? res.data;
      } catch (err) {
        lastErr = err;
      }
    }
    throw lastErr ?? new Error("No upload endpoint reachable.");
  };

  const handleUploadFile = async (file) => {
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const payload = await uploadWithFallback(file);
      const content = payload?.content ?? "";
      if (!content || !content.trim()) {
        setError("Uploaded file parsed no text. Try a different file or paste manually.");
      } else {
        setResumeText(content);
        setPreviewOpen(true);
      }
    } catch (err) {
      console.error("Upload failed:", err);
      setError(err?.response?.data?.detail || err?.message || "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const onUploadButtonClick = () => fileInputRef.current?.click();

  const handleSelectSaved = (ev) => {
    const id = ev.target.value;
    if (!id) {
      setResumeText("");
      return;
    }
    const selected = savedResumes.find((r) => String(r.id) === String(id));
    if (selected?.content) {
      setResumeText(selected.content);
      setPreviewOpen(true);
    } else {
      alert("Selected saved resume has no parsed text available on the server.");
    }
  };

  // --- UPDATED: Client-side Sample Loader (Replaces broken /api/dev call) ---
  const handleLoadSampleAndAutoRun = async () => {
    setLoading(true);
    setError("");
    
    // 1. Load Data Instantly
    setResumeText(SAMPLE_RESUME);
    setJdText(SAMPLE_JD);
    setPreviewOpen(true);

    // 2. Small delay to visualize the load, then run
    setTimeout(async () => {
      await runAnalysisAndNavigate(SAMPLE_RESUME, SAMPLE_JD);
    }, 600);
  };

  const resumeCharCount = resumeText ? resumeText.length : 0;
  const jdWordCount = jdText ? jdText.trim().split(/\s+/).length : 0;

  return (
    // page background: consistent ultra-premium gradient + soft vignette
    <div
      className="min-h-screen py-12 px-6 rounded-[18px] overflow-hidden"
      style={{
        background:`
          radial-gradient(900px 500px at 8% 8%, rgba(145, 165, 245, 0.55), transparent 65%),
          radial-gradient(900px 500px at 92% 22%, rgba(170, 195, 255, 0.50), transparent 65%),
          linear-gradient(135deg, #DCE4FF 0%, #EAF0FF 45%, #FFFFFF 100%)
        `
      }}
    >
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="mb-8 flex items-start justify-between gap-6">
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">ATS Score Checker</h1>
            <p className="text-gray-600 mt-2 max-w-2xl leading-relaxed">
              Compare your resume against a job description. Results open in a detailed dashboard with prioritized, AI-guided fixes.
            </p>
          </div>

          <div className="hidden sm:flex items-center gap-3">
            <button
              onClick={handleLoadSampleAndAutoRun}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-gradient-to-r from-purple-100 to-indigo-50 text-indigo-700 border border-white/40 shadow-sm"
              title="Load developer sample and auto-run (dev)"
              disabled={loading}
            >
              Load sample
            </button>

            <button
              onClick={onUploadButtonClick}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-white/80 backdrop-blur-sm border border-gray-100 text-sm shadow-md"
              aria-label="Upload resume file"
              disabled={uploading}
            >
              <FaUpload /> Upload Resume
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.txt"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleUploadFile(f);
                e.target.value = "";
              }}
            />
          </div>
        </header>

        {/* use 12-col grid so left has room and right doesn't hug left */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Left main input area: span 8 columns on large screens */}
          <div className="lg:col-span-7 space-y-6">
            <section
              className="rounded-2xl p-6 shadow-xl border border-white/30 backdrop-blur-md bg-white/60"
              aria-labelledby="resume-section"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 id="resume-section" className="text-lg font-semibold text-gray-800">1. Resume</h3>
                  <p className="text-sm text-gray-500 mt-1">Paste parsed resume text (or upload a file / load the sample).</p>
                </div>

                <div className="flex items-center gap-3">
                  <select onChange={handleSelectSaved} className="text-sm border rounded-lg px-3 py-1 bg-white/80 hidden sm:block">
                    <option value="">Use saved resume...</option>
                    {savedResumes.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.filename} {r.primary_flag ? "(Primary)" : ""}
                      </option>
                    ))}
                  </select>

                  <div className="sm:hidden flex items-center gap-2">
                    <button onClick={handleLoadSampleAndAutoRun} className="px-3 py-1 rounded-full bg-gradient-to-r from-purple-100 to-indigo-50 text-indigo-700 text-sm" disabled={loading}>
                      Sample
                    </button>
                    <button onClick={onUploadButtonClick} className="px-3 py-1 rounded-full bg-white/80 border text-sm" disabled={uploading}>
                      Upload
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <div className="flex items-center justify-between gap-4">
                  <button onClick={() => setPreviewOpen((s) => !s)} className="text-sm text-indigo-700 font-medium hover:underline" aria-expanded={previewOpen}>
                    {previewOpen ? "Hide resume preview" : "Show resume preview"}
                  </button>

                  <div className="text-xs text-gray-500">{resumeCharCount.toLocaleString()} chars</div>
                </div>

                {previewOpen && (
                  <textarea
                    value={resumeText}
                    onChange={(e) => setResumeText(e.target.value)}
                    rows={12}
                    className="mt-3 w-full rounded-2xl border border-white/40 p-4 text-sm shadow-sm focus:ring-2 focus:ring-indigo-200 resize-y bg-white/60 backdrop-blur-sm"
                    placeholder="Paste resume text here (contact info, summary, skills, experience bullets, education)..."
                    aria-label="Resume text"
                  />
                )}

                <div className="mt-3 text-xs text-gray-500 flex items-center justify-between">
                  <div>Tip: include a Skills section formatted as bullet points or comma-separated tags.</div>
                  <div>
                    {uploading ? (
                      <span className="inline-flex items-center gap-2 text-sm text-gray-600">
                        <FaSpinner className="animate-spin" /> Uploading...
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-2xl p-6 shadow-xl border border-white/30 backdrop-blur-md bg-white/60" aria-labelledby="jd-section">
              <div className="flex items-start justify-between">
                <div>
                  <h3 id="jd-section" className="text-lg font-semibold text-gray-800">2. Job Description</h3>
                  <p className="text-sm text-gray-500 mt-1">Paste the full job description you want to target. Include Requirements & Skills sections.</p>
                </div>

                <div className="text-xs text-gray-400">{jdWordCount} words</div>
              </div>

              <textarea
                id="jd-input"
                value={jdText}
                onChange={(e) => setJdText(e.target.value)}
                rows={12}
                className="mt-4 w-full rounded-2xl border border-white/40 p-4 text-sm shadow-sm focus:ring-2 focus:ring-indigo-200 resize-y bg-white/60 backdrop-blur-sm"
                placeholder="Paste job description here..."
                aria-label="Job description"
              />

              <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
                <div>Tip: highlight MUST HAVE skills in the JD for better tier detection.</div>
                <div />
              </div>
            </section>
          </div>

          {/* Middle spacing */}
          <div className="hidden lg:block lg:col-span-1" />

          {/* Right preview/CTA: span 4 columns on large screens */}
          <aside className="lg:col-span-4">
            {/* decorative floating glow behind the right card */}
            <div
              aria-hidden
              className="pointer-events-none absolute right-0 hidden lg:block"
              style={{
                width: 340,
                height: 340,
                transform: "translate(16%, -10%)",
                filter: "blur(60px)",
                background: "radial-gradient(circle at 30% 40%, rgba(99,102,241,0.18), rgba(99,102,241,0.08) 30%, transparent 60%)",
                borderRadius: "50%",
                zIndex: 0,
              }}
            />

            <div style={{ position: "relative", zIndex: 10 }}>
              <div className="rounded-2xl p-6 shadow-2xl border border-white/30 backdrop-blur-md bg-white/65">
                <div className="mb-4">
                  <h4 className="text-sm text-gray-500">Quick Preview</h4>
                  <p className="text-lg font-semibold text-gray-900">Snapshot & actions</p>
                </div>

                {/* Gauge (compact) centered */}
                <div className="flex items-center justify-center mb-2">
                  {/* compact true -> only SVG arc is rendered */}
                  <div className="w-36 h-36">
                    <Gauge value={0} compact={true} size={144} thickness={12} />
                  </div>
                </div>

                {/* Score Text (single source of truth) */}
                <div className="mb-6 text-center">
                  <p className="text-sm text-gray-500 font-medium">Overall Match</p>
                  <h2 className="text-3xl font-bold text-gray-900 mt-1">0%</h2>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                    Combined: Keywords, Structure, Semantics,
                    <br />
                    Readability, Tone.
                  </p>
                </div>

                <div className="space-y-3">
                  <button
                    onClick={handleAnalyzeClick}
                    disabled={loading}
                    className="w-full inline-flex items-center justify-center gap-3 px-4 py-3 rounded-full bg-gradient-to-r from-indigo-600 to-blue-500 text-white font-semibold shadow-lg hover:from-indigo-700 hover:to-blue-600 transition"
                  >
                    {loading ? (
                      <>
                        <FaSpinner className="animate-spin" /> Calculating...
                      </>
                    ) : (
                      <>
                        Calculate Score <FaArrowRight />
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleLoadSampleAndAutoRun}
                    disabled={loading}
                    className="w-full inline-flex items-center justify-center gap-2
                              px-4 py-2 rounded-lg
                              border border-gray-300
                              bg-gray-200/60
                              text-gray-700
                              hover:bg-gray-300
                              text-sm
                              backdrop-blur-sm
                              transition"
                  >
                    Load sample & auto-run
                  </button>

                  <div className="pt-2 text-xs text-gray-500">Results open in a dedicated dashboard with detailed recommendations.</div>
                </div>
              </div>

              <div className="mt-6 text-center text-sm text-gray-500">We analyze Structure · Keywords · Semantics · Readability · Tone</div>
            </div>
          </aside>
        </div>

        {/* error area */}
        {error && (
          <div className="mt-6 max-w-3xl mx-auto text-center text-sm text-red-700 bg-red-50 p-3 rounded">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}