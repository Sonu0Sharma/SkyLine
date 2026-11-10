import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { FaHistory } from 'react-icons/fa';
import ChatTimeline from "../components/mock/ChatTimeline";
import SidebarStatus from "../components/mock/SidebarStatus";
import AnswerBar from "../components/mock/AnswerBar";
import TypingIndicator from "../components/mock/TypingIndicator";
import MockResult from "../components/mock/MockResult";
import MockHistory from "../components/mock/MockHistory"; // <--- Import
import CodeEditorPanel from "../components/mock/CodeEditorPanel";
import "../components/mock/mock_result.css";

function MockPractice() {
  const [mode, setMode] = useState("setup");
  const [sessionConfig, setSessionConfig] = useState({
    target_role: "", difficulty: "Medium", question_count: 5, resume_id: "",
    interview_type: "Mixed", personality: "Professional"
  });
  const [resumes, setResumes] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [report, setReport] = useState(null);
  const timelineRef = useRef(null);

  // CODE EDITOR STATE
  const [showCode, setShowCode] = useState(false);
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("javascript");

  useEffect(() => {
    axios.get("/profile/resumes").then(res => setResumes(res.data)).catch(() => {});
  }, []);

  const pushMessage = (msg) => setMessages((prev) => [...prev, msg]);

  const startSession = async () => {
    if (!sessionConfig.target_role.trim()) return toast.error("Role required");
    try {
      setIsLoading(true);
      const res = await axios.post("/mock-v3/start", {
        role: sessionConfig.target_role,
        difficulty: sessionConfig.difficulty,
        question_count: sessionConfig.question_count,
        interview_type: sessionConfig.interview_type,
        personality: sessionConfig.personality
      });
      
      const data = res.data.data;
      setSessionId(data.session_id);
      
      const q = { question_id: "q1", question_text: data.question, current_index: 1 };
      setCurrentQuestion(q);
      pushMessage({ id: "q1", type: "ai", text: data.question });
      setMode("intro");
    } catch (err) {
      toast.error("Failed to start");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitAnswer = async (textAnswer) => {
    let finalAnswer = textAnswer;
    if (showCode && code.trim()) {
      finalAnswer += `\n\nCode Solution (${language}):\n\`\`\`${language}\n${code}\n\`\`\``;
    }

    if (!finalAnswer.trim()) return toast.error("Please provide an answer.");

    pushMessage({ id: Date.now(), type: "user", text: finalAnswer });
    setIsLoading(true);
    
    setCode(""); 
    setShowCode(false); 
    
    try {
      const res = await axios.post("/mock-v3/submit-answer", {
        session_id: sessionId,
        answer: finalAnswer
      });
      
      const data = res.data.data;
      pushMessage({ id: Date.now(), type: "feedback", text: data.evaluation.feedback });

      if (data.is_finished || !data.next_question) {
        await generateReport();
      } else {
        const next = data.next_question;
        setTimeout(() => {
          const q = { question_text: next.question, current_index: next.current_index };
          setCurrentQuestion(q);
          pushMessage({ id: Date.now(), type: "ai", text: next.question });
        }, 1000);
      }
    } catch (err) {
      toast.error("Error submitting");
    } finally {
      setIsLoading(false);
    }
  };

  const generateReport = async () => {
    setMode("analyzing");
    try {
      const res = await axios.get(`/mock-v3/${sessionId}/results`);
      setReport(res.data.data);
      setMode("result");
    } catch (err) {
      toast.error("Failed to generate report");
    }
  };

  // --- RENDER ---
  if (mode === "setup") {
      return (
          <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
              <div className="bg-white p-10 rounded-xl shadow-lg w-full max-w-lg relative">
                  
                  {/* HISTORY BUTTON */}
                  <button 
                    onClick={() => setMode("history")}
                    className="absolute top-6 right-6 text-gray-400 hover:text-indigo-600 transition"
                    title="View Past Sessions"
                  >
                    <FaHistory size={20} />
                  </button>

                  <h2 className="text-3xl font-bold mb-6 text-gray-800">Mock Interview Setup</h2>
                  <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-gray-600 mb-1">Target Role</label>
                        <input className="w-full border p-3 rounded-lg" placeholder="e.g. Product Manager" value={sessionConfig.target_role} onChange={e => setSessionConfig({...sessionConfig, target_role: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-600 mb-1">Type</label>
                            <select className="w-full border p-3 rounded-lg" value={sessionConfig.interview_type} onChange={e => setSessionConfig({...sessionConfig, interview_type: e.target.value})}>
                                <option>Mixed</option><option>Technical</option><option>Behavioral</option><option>HR</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-600 mb-1">Persona</label>
                            <select className="w-full border p-3 rounded-lg" value={sessionConfig.personality} onChange={e => setSessionConfig({...sessionConfig, personality: e.target.value})}>
                                <option>Professional</option><option>Friendly</option><option>Strict</option>
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-600 mb-1">Difficulty</label>
                            <select className="w-full border p-3 rounded-lg" value={sessionConfig.difficulty} onChange={e => setSessionConfig({...sessionConfig, difficulty: e.target.value})}>
                                <option>Easy</option><option>Medium</option><option>Hard</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-600 mb-1">Questions</label>
                            <select className="w-full border p-3 rounded-lg" value={sessionConfig.question_count} onChange={e => setSessionConfig({...sessionConfig, question_count: parseInt(e.target.value)})}>
                                <option value="3">3 (Quick)</option><option value="5">5 (Standard)</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-600 mb-1">Use Resume</label>
                        <select className="w-full border p-3 rounded-lg" value={sessionConfig.resume_id} onChange={e => setSessionConfig({...sessionConfig, resume_id: e.target.value})}>
                            <option value="">No, Generic</option>
                            {resumes.map(r => <option key={r.id} value={r.id}>{r.filename}</option>)}
                        </select>
                    </div>
                    <button className="w-full bg-indigo-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-indigo-700 transition" onClick={startSession} disabled={isLoading}>Start</button>
                  </div>
              </div>
          </div>
      );
  }

  // --- NEW: HISTORY MODE ---
  if (mode === "history") {
    return (
      <MockHistory 
        onBack={() => setMode("setup")} 
        onViewSession={(sid) => {
          setSessionId(sid);
          setMode("analyzing"); 
          axios.get(`/mock-v3/${sid}/results`)
            .then(res => {
              setReport(res.data.data);
              setMode("result");
            })
            .catch(() => {
              toast.error("Could not load session.");
              setMode("history");
            });
        }}
      />
    );
  }
  
  if (mode === "intro") {
      return (
          <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-6 text-center">
              <h1 className="text-4xl font-bold mb-4">Ready?</h1>
              <p className="text-xl text-gray-400 mb-8">AI Interviewer ({sessionConfig.interview_type}) is prepared.</p>
              <button onClick={() => setMode("interview")} className="bg-white text-indigo-900 px-8 py-3 rounded-full font-bold hover:scale-105 transition">Begin Interview</button>
          </div>
      );
  }

  if (mode === "interview") {
      return (
          <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">
              <SidebarStatus 
                  currentIndex={currentQuestion?.current_index || 1} 
                  total={sessionConfig.question_count} 
                  role={sessionConfig.target_role}
                  difficulty={sessionConfig.difficulty}
              />
              <div className="flex-grow flex overflow-hidden relative">
                  <div className={`flex-grow flex flex-col transition-all duration-300 ${showCode ? "w-1/2" : "w-full"}`}>
                      <div className="flex-grow overflow-auto p-4 md:p-8" ref={timelineRef}>
                          <ChatTimeline messages={messages} />
                          {isTyping && <TypingIndicator />}
                      </div>
                  </div>
                  <CodeEditorPanel 
                      isOpen={showCode}
                      code={code}
                      setCode={setCode}
                      language={language}
                      setLanguage={setLanguage}
                  />
              </div>
              <AnswerBar 
                  onSubmit={handleSubmitAnswer} 
                  isLoading={isLoading} 
                  onToggleCode={() => setShowCode(!showCode)}
                  isCodeOpen={showCode}
              />
          </div>
      );
  }

  if (mode === "analyzing") {
      return (
          <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
              <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
              <h2 className="text-xl font-bold text-gray-700">Generating Report...</h2>
          </div>
      );
  }

  if (mode === "result") return <MockResult report={report} onRestart={() => setMode("setup")} />;

  return null;
}

export default MockPractice;