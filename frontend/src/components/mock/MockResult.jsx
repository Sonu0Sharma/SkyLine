import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import ReactMarkdown from "react-markdown"; // <--- IMPORTED
import { 
  FaClipboard, FaRedo, FaCheckCircle, FaLightbulb, 
  FaQuoteLeft, FaMagic, FaChartPie, FaExclamationCircle 
} from "react-icons/fa";
import { motion } from "framer-motion";
import AdvancedGauge from "../AdvancedGauge";
import "./mock_result.css";

// --- Helpers ---
function parseRichFeedback(text) {
  if (!text) return { feedback: "No feedback available." };
  const result = { score: null, feedback: "", strengths: [], weaknesses: [] };

  const scoreMatch = text.match(/Score:\s*(\d+)/i);
  if (scoreMatch) result.score = parseInt(scoreMatch[1]);

  const feedbackMatch = text.match(/Feedback:\s*([\s\S]*?)(?=(Strengths:|Weaknesses:|$))/i);
  if (feedbackMatch) result.feedback = feedbackMatch[1].trim();
  else result.feedback = text;

  const strengthsMatch = text.match(/Strengths:\s*([\s\S]*?)(?=(Weaknesses:|$))/i);
  if (strengthsMatch) {
    result.strengths = strengthsMatch[1].split(/\n|-/).map(s => s.trim()).filter(s => s.length > 2);
  }

  const weaknessesMatch = text.match(/Weaknesses:\s*([\s\S]*?)(?=$)/i);
  if (weaknessesMatch) {
    result.weaknesses = weaknessesMatch[1].split(/\n|-/).map(s => s.trim()).filter(s => s.length > 2);
  }
  return result;
}

export default function MockResult({ report = {}, onRestart = () => {} }) {
  const overallScore = report.overall_score ?? 0;
  const [copied, setCopied] = useState(false);

  return (
    <div className="max-w-7xl mx-auto space-y-12 pb-20 animate-fade-in-up font-sans text-gray-800">
      
      {/* --- HERO SECTION --- */}
      <div className="relative overflow-hidden rounded-3xl bg-white shadow-xl ring-1 ring-gray-100 p-8 md:p-12">
        <div className="absolute top-0 right-0 -mt-20 -mr-20 w-96 h-96 bg-indigo-50 rounded-full blur-3xl opacity-60 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-80 h-80 bg-blue-50 rounded-full blur-3xl opacity-60 pointer-events-none"></div>

        <div className="relative z-10 grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-bold uppercase tracking-wider mb-4">
                <FaMagic className="text-indigo-500" /> AI Analysis Complete
              </div>
              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-gray-900 leading-tight">
                Your Interview <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-blue-500">
                  Performance Report
                </span>
              </h1>
              <p className="text-lg text-gray-500 mt-4 leading-relaxed max-w-lg">
                We've analyzed your responses. Review the detailed transcript to see the AI's perfect code solutions and behavioral rewrites.
              </p>
            </div>

            <div className="flex flex-wrap gap-4 pt-2">
              <button 
                onClick={onRestart}
                className="px-8 py-4 bg-gray-900 text-white rounded-xl font-bold shadow-lg shadow-gray-200 hover:bg-black hover:scale-[1.02] transition-all flex items-center gap-3"
              >
                <FaRedo /> Start New Session
              </button>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(`Scored ${overallScore}/100 on Skyline AI Mock Interview!`);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="px-8 py-4 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-50 hover:border-gray-300 transition-all flex items-center gap-3"
              >
                <FaClipboard /> {copied ? "Copied!" : "Share Result"}
              </button>
            </div>
          </div>

          <div className="flex justify-center lg:justify-end">
            <div className="relative bg-white/50 backdrop-blur-sm p-8 rounded-full shadow-sm border border-white/60">
               <AdvancedGauge score={overallScore} size={280} thickness={20} />
            </div>
          </div>
        </div>
      </div>

      {/* --- METRICS GRID --- */}
      <div className="grid md:grid-cols-12 gap-6">
        {/* Dimensions */}
        <div className="md:col-span-4 bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col h-full">
          <div className="flex items-center gap-2 mb-6 pb-4 border-b border-gray-50">
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600"><FaChartPie /></div>
            <h3 className="font-bold text-gray-900 text-lg">Key Dimensions</h3>
          </div>
          <div className="space-y-6 flex-grow">
            {report.dimensions && Object.entries(report.dimensions).map(([key, val]) => (
              <div key={key}>
                <div className="flex justify-between text-sm font-medium mb-2">
                  <span className="capitalize text-gray-600">{key}</span>
                  <span className={`font-bold ${val >= 70 ? "text-gray-900" : "text-indigo-600"}`}>{val}%</span>
                </div>
                <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${val}%` }}
                    transition={{ duration: 1, delay: 0.2 }}
                    className={`h-full rounded-full ${val >= 80 ? "bg-green-500" : val >= 50 ? "bg-indigo-500" : "bg-orange-400"}`} 
                  />
                </div>
              </div>
            ))}
            {(!report.dimensions || Object.keys(report.dimensions).length === 0) && (
              <p className="text-gray-400 text-sm italic">Not enough data to generate dimensions.</p>
            )}
          </div>
        </div>

        {/* Quick Wins */}
        <div className="md:col-span-8 bg-gradient-to-br from-indigo-900 to-blue-900 rounded-2xl p-8 shadow-lg text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl -translate-y-10 translate-x-10 pointer-events-none"></div>
          <div className="relative z-10">
            <h3 className="font-bold text-2xl mb-6 flex items-center gap-3">
              <FaLightbulb className="text-yellow-300" /> Strategic Quick Wins
            </h3>
            <div className="grid sm:grid-cols-2 gap-4">
              {report.feedback?.quick_wins?.length > 0 ? (
                report.feedback.quick_wins.map((win, i) => (
                  <div key={i} className="bg-white/10 backdrop-blur-md border border-white/10 p-4 rounded-xl hover:bg-white/20 transition-all duration-300">
                    <div className="flex gap-3 items-start">
                      <div className="mt-1 w-2 h-2 rounded-full bg-blue-400 shrink-0 shadow-[0_0_8px_rgba(96,165,250,0.8)]"></div>
                      <p className="text-sm md:text-base font-medium leading-relaxed text-blue-50">
                        {typeof win === 'string' ? win : win.description || win.title}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-white/60">No specific quick wins detected. Good job!</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* --- DETAILED TRANSCRIPT --- */}
      <div className="space-y-6">
        <div className="flex items-center gap-3 px-2">
          <div className="h-8 w-1 bg-indigo-600 rounded-full"></div>
          <h2 className="text-2xl font-bold text-gray-900">Detailed Transcript Analysis</h2>
        </div>

        <div className="grid gap-8">
          {report.transcript?.map((item, i) => {
            const analysis = parseRichFeedback(item.feedback);
            const scoreColor = analysis.score >= 70 ? "bg-green-100 text-green-800 border-green-200" 
                             : analysis.score >= 40 ? "bg-yellow-100 text-yellow-800 border-yellow-200" 
                             : "bg-red-100 text-red-800 border-red-200";

            return (
              <motion.div 
                key={i} 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden"
              >
                {/* Header */}
                <div className="bg-gray-50/50 p-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex gap-4">
                    <span className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-200 text-gray-600 font-bold flex items-center justify-center text-sm">
                      {i + 1}
                    </span>
                    <h4 className="text-lg font-bold text-gray-800 leading-snug">{item.question}</h4>
                  </div>
                  {analysis.score !== null && (
                    <div className={`flex-shrink-0 px-4 py-1.5 rounded-full border text-sm font-bold shadow-sm ${scoreColor}`}>
                      Score: {analysis.score}/100
                    </div>
                  )}
                </div>

                {/* Grid */}
                <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-100">
                  
                  {/* LEFT: Your Answer */}
                  <div className="p-6 md:p-8 flex flex-col h-full bg-white">
                    <h5 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                      <FaQuoteLeft /> Your Response
                    </h5>
                    <div className="flex-grow">
                      {/* Render User Answer as Markdown (supports code blocks in user input too) */}
                      <div className="text-gray-700 leading-relaxed text-base prose prose-sm max-w-none prose-p:my-0">
                        <ReactMarkdown>{item.user_answer || "*No answer provided.*"}</ReactMarkdown>
                      </div>
                    </div>

                    <div className="mt-8 bg-red-50/50 border border-red-100 rounded-xl p-5">
                      <h6 className="text-xs font-bold text-red-800 uppercase tracking-wide mb-2 flex items-center gap-1">
                        <FaExclamationCircle /> Critique
                      </h6>
                      <p className="text-sm text-red-700 mb-3 leading-relaxed">{analysis.feedback}</p>
                      {analysis.weaknesses.length > 0 && (
                        <ul className="space-y-1">
                          {analysis.weaknesses.map((w, idx) => (
                            <li key={idx} className="text-xs text-red-600 flex items-start gap-2">
                              <span className="mt-0.5">•</span> {w}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>

                  {/* RIGHT: Improved Answer */}
                  <div className="p-6 md:p-8 flex flex-col h-full bg-gradient-to-b from-indigo-50/30 to-white">
                    <div className="flex justify-between items-center mb-4">
                      <h5 className="text-xs font-bold text-indigo-600 uppercase tracking-wider flex items-center gap-2">
                        <FaCheckCircle /> AI Suggested Answer
                      </h5>
                      <button 
                        onClick={() => navigator.clipboard.writeText(item.improved_answer)}
                        className="text-xs font-bold text-gray-400 hover:text-indigo-600 transition flex items-center gap-1"
                        title="Copy text"
                      >
                        <FaClipboard /> Copy
                      </button>
                    </div>

                    <div className="flex-grow">
                      <div className="bg-white border border-indigo-100 rounded-xl p-5 shadow-sm overflow-hidden">
                        {/* 
                           SAFE MARKDOWN RENDERING
                           The 'prose' classes style headers, lists, and code blocks automatically.
                           We add specific overrides for 'pre' and 'code' to look like an IDE.
                        */}
                        <div className="prose prose-sm prose-indigo max-w-none 
                                        prose-p:text-gray-800 prose-p:leading-relaxed
                                        prose-pre:bg-gray-900 prose-pre:text-gray-100 prose-pre:rounded-lg prose-pre:p-4
                                        prose-code:text-indigo-700 prose-code:bg-indigo-50 prose-code:px-1 prose-code:rounded prose-code:font-mono prose-code:text-xs
                                        prose-pre:code:bg-transparent prose-pre:code:text-gray-100 prose-pre:code:p-0">
                          <ReactMarkdown>{item.improved_answer || "No improvement suggested."}</ReactMarkdown>
                        </div>
                      </div>
                    </div>

                    {analysis.strengths.length > 0 && (
                      <div className="mt-8 pt-4 border-t border-indigo-100">
                        <span className="text-xs font-bold text-green-700 uppercase tracking-wide block mb-2">What you did well</span>
                        <div className="flex flex-wrap gap-2">
                          {analysis.strengths.map((s, idx) => (
                            <span key={idx} className="px-3 py-1 bg-green-50 text-green-700 text-xs font-medium rounded-full border border-green-100">
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

MockResult.propTypes = {
  report: PropTypes.object,
  onRestart: PropTypes.func
};