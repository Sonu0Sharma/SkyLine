import React, { useState, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { useDropzone } from 'react-dropzone';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import axios from 'axios';
import ResumeTemplates from '../components/ResumeTemplates';

// --- Simple Tab Card Component ---
const ResumeTabCard = ({ title, subtitle, onClick, isActive }) => {
  const baseClasses = "w-full text-left p-6 bg-white rounded-lg shadow-md transition-all duration-300 transform cursor-pointer border";
  const activeClasses = "scale-105 shadow-xl border-indigo-600 bg-indigo-50";
  const inactiveClasses = "hover:shadow-lg hover:-translate-y-1 border-transparent";
  
  return (
    <div onClick={onClick} className={`${baseClasses} ${isActive ? activeClasses : inactiveClasses}`}>
      <h2 className={`text-xl font-semibold ${isActive ? 'text-indigo-700' : 'text-gray-700'}`}>{title}</h2>
      <p className="mt-2 text-sm text-gray-500">{subtitle}</p>
    </div>
  );
};

function ResumeGenerator() {
  const [activeTab, setActiveTab] = useState('generate');
  const [selectedTemplate, setSelectedTemplate] = useState('modern');
  
  // --- Tab 1: Your Resumes State ---
  const [userResumes, setUserResumes] = useState([]);
  const [selectedResume, setSelectedResume] = useState(null);

  // --- Tab 2: Generator State ---
  const [genStep, setGenStep] = useState('input-jd'); // input-jd, input-profile, results
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Form Data
  const [jobUrl, setJobUrl] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [profile, setProfile] = useState({ fullName: '', email: '', skills: '', experience: '' });
  
  // Results Data
  const [generatedResume, setGeneratedResume] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  
  // Refs
  const previewRef = useRef(null); 

  // --- HELPER: PDF Export ---
  const handleExportPdf = () => {
    const input = previewRef.current;
    if(!input) return;
    html2canvas(input, { scale: 2 }).then((canvas) => {
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const ratio = Math.min(pdfWidth / canvas.width, pdfHeight / canvas.height);
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width * ratio, canvas.height * ratio);
      pdf.save("resume_skyline.pdf");
    });
  };

  // --- TAB 1 LOGIC: Upload ---
  const onDrop = async (acceptedFiles) => {
    const file = acceptedFiles[0];
    if(!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await axios.post('/api/resume/upload-resume', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      const newResume = {
        id: Date.now(),
        name: file.name,
        content: res.data.content || "Could not extract text.",
        lastModified: new Date().toLocaleDateString(),
      };
      
      setUserResumes(prev => [newResume, ...prev]);
      setSelectedResume(newResume);
    } catch (err) {
      console.error(err);
      alert("Failed to parse resume. Check backend console.");
    }
  };
  const { getRootProps, getInputProps } = useDropzone({ 
    onDrop, 
    accept: { 'application/pdf': ['.pdf'], 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'] } 
  });

  // --- TAB 2 LOGIC: Scrape & Generate ---
  const handleScrape = async () => {
    if (!jobUrl) return;
    setIsLoading(true);
    setError('');
    try {
      const res = await axios.post('/api/resume/extract-job-desc', { url: jobUrl });
      if (res.data.status === 'success') {
        setJobDescription(res.data.data);
      } else {
        setError('Could not auto-scrape. Please paste text manually.');
      }
    } catch (err) {
      setError('Failed to scrape URL.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!jobDescription || !profile.fullName) {
      setError('Name and Job Description are required.');
      return;
    }
    setIsLoading(true);
    setError('');

    try {
      const res = await axios.post('/api/resume/generate', { 
        profile, 
        job_description: jobDescription,
        template_style: selectedTemplate 
      });

      if (res.data.status === 'success' && res.data.data) {
        setGeneratedResume(res.data.data.resume_markdown || "**Error:** No resume content generated.");
        setSuggestions(res.data.data.suggestions || []);
        setGenStep('results');
      } else {
        setError('Backend returned success but no data.');
      }
    } catch (err) {
      console.error("Generation Error:", err);
      setError('AI Generation failed. Check console for details.');
    } finally {
      setIsLoading(false);
    }
  };

  // --- RENDERERS ---
  const renderYourResumes = () => (
    <div className="flex h-[70vh] gap-6">
      <div className="w-1/3 pr-2 overflow-y-auto border-r">
        <div {...getRootProps()} className="border-2 border-dashed border-indigo-300 rounded-lg p-6 text-center cursor-pointer hover:bg-indigo-50 mb-6 transition">
          <input {...getInputProps()} />
          <p className="text-indigo-600 font-bold">+ Upload Resume</p>
          <p className="text-xs text-gray-500 mt-1">PDF or DOCX</p>
        </div>
        <div className="space-y-3">
          {userResumes.map(r => (
            <div key={r.id} onClick={() => setSelectedResume(r)} 
              className={`p-4 rounded border cursor-pointer hover:bg-gray-50 ${selectedResume?.id === r.id ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500' : 'border-gray-200'}`}>
              <p className="font-medium text-gray-800 truncate">{r.name}</p>
              <p className="text-xs text-gray-500">{r.lastModified}</p>
            </div>
          ))}
          {userResumes.length === 0 && <p className="text-gray-400 text-center italic">No resumes yet.</p>}
        </div>
      </div>
      <div className="w-2/3 bg-gray-50 rounded-lg p-6 overflow-auto shadow-inner">
        {selectedResume ? (
          // FIXED: Moved class "prose" to the div wrapper
          <div className="prose max-w-none">
            <h3 className="text-lg font-bold border-b pb-2 mb-4">{selectedResume.name}</h3>
            <ReactMarkdown>{selectedResume.content || ''}</ReactMarkdown>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-gray-400">
            <span className="text-4xl mb-2">📄</span>
            <p>Select a resume to preview text content</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderGenerateResume = () => (
    <div className="bg-white p-6 rounded-lg shadow-sm border min-h-[60vh]">
      {/* Step 1: Job Input */}
      {genStep === 'input-jd' && (
        <div className="max-w-3xl mx-auto space-y-6">
          <h2 className="text-2xl font-bold text-gray-800">1. Target Job</h2>
          {error && <p className="text-red-500 bg-red-50 p-3 rounded border border-red-200">{error}</p>}
          
          <div className="flex gap-3">
            <input 
              type="text" 
              value={jobUrl} onChange={(e) => setJobUrl(e.target.value)}
              placeholder="Paste Job URL (LinkedIn, Indeed...)" 
              className="flex-grow p-3 border rounded shadow-sm"
            />
            <button onClick={handleScrape} disabled={isLoading} className="bg-blue-600 text-white px-6 rounded font-medium hover:bg-blue-700 disabled:opacity-50">
              {isLoading ? '...' : 'Auto-Fill'}
            </button>
          </div>
          
          <textarea 
            value={jobDescription} onChange={(e) => setJobDescription(e.target.value)}
            rows="8" 
            placeholder="Or paste the Job Description here manually..."
            className="w-full p-4 border rounded shadow-sm focus:ring-2 focus:ring-indigo-500"
          />
          
          <button 
            onClick={() => setGenStep('input-profile')} 
            disabled={!jobDescription}
            className="w-full py-3 bg-indigo-600 text-white font-bold rounded hover:bg-indigo-700 disabled:opacity-50"
          >
            Next: Your Profile
          </button>
        </div>
      )}

      {/* Step 2: Profile Input */}
      {genStep === 'input-profile' && (
        <div className="max-w-3xl mx-auto space-y-6">
          <h2 className="text-2xl font-bold text-gray-800">2. Your Details</h2>
          {error && <p className="text-red-500 bg-red-50 p-3 rounded border border-red-200">{error}</p>}
          
          <div className="grid grid-cols-2 gap-4">
            <input type="text" placeholder="Full Name" value={profile.fullName} onChange={e => setProfile({...profile, fullName: e.target.value})} className="p-3 border rounded" />
            <input type="email" placeholder="Email" value={profile.email} onChange={e => setProfile({...profile, email: e.target.value})} className="p-3 border rounded" />
          </div>
          <input type="text" placeholder="Skills (Python, React...)" value={profile.skills} onChange={e => setProfile({...profile, skills: e.target.value})} className="w-full p-3 border rounded" />
          <textarea rows="4" placeholder="Experience Summary..." value={profile.experience} onChange={e => setProfile({...profile, experience: e.target.value})} className="w-full p-3 border rounded" />
          
          <div className="flex gap-4">
            <button onClick={() => setGenStep('input-jd')} className="w-1/3 py-3 bg-gray-200 rounded hover:bg-gray-300">Back</button>
            <button onClick={handleGenerate} disabled={isLoading} className="w-2/3 py-3 bg-indigo-600 text-white font-bold rounded hover:bg-indigo-700 disabled:opacity-50">
              {isLoading ? 'Generating Magic...' : 'Generate Resume'}
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Results */}
      {genStep === 'results' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-full">
          <div className="lg:col-span-2 flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-800">Preview</h3>
              <button onClick={handleExportPdf} className="text-indigo-600 font-semibold hover:underline">Download PDF</button>
            </div>
            {/* FIXED: Removed className from ReactMarkdown and added it to the parent div */}
            <div ref={previewRef} className="flex-grow p-8 bg-white shadow border rounded overflow-y-auto max-h-[600px] prose max-w-none">
              <ReactMarkdown>
                {typeof generatedResume === 'string' ? generatedResume : "Error rendering resume."}
              </ReactMarkdown>
            </div>
          </div>
          <div className="space-y-4">
            <div className="bg-indigo-50 p-6 rounded border border-indigo-100">
              <h3 className="font-bold text-indigo-900 mb-3">💡 AI Suggestions</h3>
              <ul className="space-y-2 text-sm text-indigo-800">
                {Array.isArray(suggestions) && suggestions.map((tip, i) => (
                  <li key={i}>• {tip}</li>
                ))}
              </ul>
            </div>
            <button onClick={() => setGenStep('input-jd')} className="w-full py-3 bg-gray-800 text-white rounded hover:bg-gray-900">Start Over</button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="p-10 max-w-7xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <ResumeTabCard title="Your Resumes" subtitle="Upload & Parse" onClick={() => setActiveTab('yourResumes')} isActive={activeTab === 'yourResumes'}/>
        <ResumeTabCard title="Generate New Resume" subtitle="AI-Powered Tailoring" onClick={() => setActiveTab('generate')} isActive={activeTab === 'generate'}/>
        <ResumeTabCard title="Resume Templates" subtitle="Choose Layout" onClick={() => setActiveTab('templates')} isActive={activeTab === 'templates'}/>
      </div>
      {activeTab === 'yourResumes' && renderYourResumes()}
      {activeTab === 'generate' && renderGenerateResume()}
      {activeTab === 'templates' && (
        <ResumeTemplates 
          onSelectTemplate={(id) => {
            setSelectedTemplate(id);
            alert(`Selected ${id} style.`);
            setActiveTab('generate');
          }} 
          selectedTemplateId={selectedTemplate} 
        />
      )}
    </div>
  );
}

export default ResumeGenerator;