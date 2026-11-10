import React, { useState } from 'react';
import axios from 'axios';
import { FaFilePdf, FaStar, FaRegStar, FaTrash, FaStickyNote, FaCloudUploadAlt } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';

function ResumeHub({ resumes, onUpdate }) {
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [tempNote, setTempNote] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  // --- Actions ---
  const handleSetPrimary = async (id) => {
    await axios.put(`/api/profile/resumes/${id}/primary`);
    onUpdate();
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure? This cannot be undone.")) {
      await axios.delete(`/api/profile/resumes/${id}`);
      onUpdate();
    }
  };

  const handleSaveNote = async (id) => {
    await axios.put(`/api/profile/resumes/${id}/note`, null, { params: { note: tempNote } });
    setEditingNoteId(null);
    onUpdate();
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      await axios.post('/api/profile/resumes', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      onUpdate();
    } catch(err) { alert("Upload failed"); }
    setIsUploading(false);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <FaFilePdf className="text-indigo-600" /> Resume Hub
        </h2>
        <label className="cursor-pointer bg-indigo-50 text-indigo-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-indigo-100 transition flex items-center gap-2">
          <FaCloudUploadAlt /> {isUploading ? "Uploading..." : "Upload New"}
          <input type="file" className="hidden" accept=".pdf,.docx" onChange={handleUpload} disabled={isUploading} />
        </label>
      </div>

      <div className="space-y-3">
        <AnimatePresence>
          {resumes.map((resume) => (
            <motion.div 
              key={resume.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0 }}
              className={`group relative p-4 rounded-lg border transition-all hover:shadow-md ${resume.primary_flag ? 'border-indigo-500 bg-indigo-50/30' : 'border-gray-200 bg-white'}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex gap-3 items-center">
                  {/* Icon */}
                  <div className={`p-2 rounded-lg ${resume.primary_flag ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-500'}`}>
                    <FaFilePdf size={20} />
                  </div>
                  
                  {/* Info */}
                  <div>
                    <h3 className={`font-semibold text-sm ${resume.primary_flag ? 'text-indigo-900' : 'text-gray-700'}`}>
                      {resume.filename}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                      <span>{format(new Date(resume.upload_date), 'MMM d, yyyy')}</span>
                      {resume.primary_flag && (
                        <span className="bg-indigo-600 text-white px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide">Primary</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  {/* Primary Toggle */}
                  <button 
                    onClick={() => handleSetPrimary(resume.id)}
                    className={`p-1.5 rounded-md transition ${resume.primary_flag ? 'text-yellow-500 bg-yellow-50' : 'text-gray-300 hover:text-yellow-400'}`}
                    title="Set as Primary"
                  >
                    {resume.primary_flag ? <FaStar /> : <FaRegStar />}
                  </button>

                  {/* Note Toggle */}
                  <div className="relative">
                    <button 
                      onClick={() => { setEditingNoteId(resume.id); setTempNote(resume.note || ""); }}
                      className={`p-1.5 rounded-md transition ${resume.note ? 'text-blue-500 bg-blue-50' : 'text-gray-300 hover:text-blue-400'}`}
                      title="Add Note"
                    >
                      <FaStickyNote />
                    </button>
                    {/* Tooltip for Note */}
                    {resume.note && editingNoteId !== resume.id && (
                      <div className="absolute bottom-full mb-2 right-0 w-48 bg-gray-800 text-white text-xs p-2 rounded shadow-lg opacity-0 group-hover:opacity-100 transition pointer-events-none z-10">
                        {resume.note}
                        <div className="absolute top-full right-2 border-4 border-transparent border-t-gray-800"></div>
                      </div>
                    )}
                  </div>

                  {/* Delete */}
                  <button onClick={() => handleDelete(resume.id)} className="p-1.5 text-gray-300 hover:text-red-500 transition">
                    <FaTrash />
                  </button>
                </div>
              </div>

              {/* Note Editor (Visible only when editing) */}
              {editingNoteId === resume.id && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  className="mt-3 pt-3 border-t border-gray-200"
                >
                  <input 
                    type="text" 
                    value={tempNote}
                    onChange={(e) => setTempNote(e.target.value)}
                    placeholder="Add a note (e.g., 'Use for Backend roles')..." 
                    className="w-full text-sm p-2 border rounded focus:ring-2 focus:ring-indigo-500"
                    maxLength={140}
                  />
                  <div className="flex justify-end gap-2 mt-2">
                    <button onClick={() => setEditingNoteId(null)} className="text-xs text-gray-500 hover:text-gray-700">Cancel</button>
                    <button onClick={() => handleSaveNote(resume.id)} className="text-xs bg-indigo-600 text-white px-3 py-1 rounded hover:bg-indigo-700">Save Note</button>
                  </div>
                </motion.div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
        
        {resumes.length === 0 && (
          <div className="text-center py-8 text-gray-400 border-2 border-dashed rounded-lg">
            No resumes found. Upload one to get started.
          </div>
        )}
      </div>
    </div>
  );
}

export default ResumeHub;