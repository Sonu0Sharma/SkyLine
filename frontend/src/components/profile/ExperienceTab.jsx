import React, { useState } from 'react';
import { FaPlus, FaTrash, FaPen, FaCheck, FaBriefcase } from 'react-icons/fa';
import { motion } from 'framer-motion';
import AiImproveButton from './AiImproveButton';

function ExperienceTab({ experience, onChange }) {
  const [editingIndex, setEditingIndex] = useState(-1);

  const addExp = () => {
    const newExp = [...experience, { title: '', company: '', start_date: '', description: '' }];
    onChange(newExp);
    setEditingIndex(newExp.length - 1);
  };

  const removeExp = (index) => {
    const newExp = [...experience];
    newExp.splice(index, 1);
    onChange(newExp);
    setEditingIndex(-1);
  };

  const updateExp = (index, field, value) => {
    const newExp = [...experience];
    newExp[index][field] = value;
    onChange(newExp);
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {experience.map((exp, i) => (
        // Make card relative and allow visible overflow for the popover
        <div key={i} className="relative bg-white rounded-xl border shadow-sm hover:shadow-md transition overflow-visible">
          
          {/* VIEW MODE */}
          {editingIndex !== i && (
            // Ensure inner container can shrink and not force width on the card
            <div className="p-5 flex justify-between items-start group min-w-0">
              <div className="flex gap-4 min-w-0">
                <div className="bg-blue-50 p-3 rounded-lg text-blue-600 h-fit">
                  <FaBriefcase size={20} />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-gray-800 text-lg break-words">{exp.title || "Job Title"}</h3>
                  <p className="text-gray-600 font-medium break-words">{exp.company}</p>
                  <p className="text-xs text-gray-400 mt-1">{exp.start_date} - {exp.end_date || "Present"}</p>
                  {exp.description && (
                     <p className="text-sm text-gray-600 mt-3 line-clamp-2 break-words">{exp.description}</p>
                  )}
                </div>
              </div>
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition">
                <button onClick={() => setEditingIndex(i)} className="p-2 text-gray-400 hover:text-blue-600">
                  <FaPen />
                </button>
                <button onClick={() => removeExp(i)} className="p-2 text-gray-400 hover:text-red-500">
                  <FaTrash />
                </button>
              </div>
            </div>
          )}

          {/* EDIT MODE */}
          {editingIndex === i && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6 bg-gray-50/50">
              <div className="flex justify-between items-center mb-4">
                 <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide">Editing Experience</h3>
                 <button onClick={() => removeExp(i)} className="text-red-400 hover:text-red-600 text-sm">Remove</button>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Job Title</label>
                  <input type="text" value={exp.title} onChange={(e) => updateExp(i, 'title', e.target.value)} className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Company</label>
                  <input type="text" value={exp.company} onChange={(e) => updateExp(i, 'company', e.target.value)} className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Start Date</label>
                  <input type="text" value={exp.start_date} onChange={(e) => updateExp(i, 'start_date', e.target.value)} className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">End Date</label>
                  <input type="text" value={exp.end_date || ''} onChange={(e) => updateExp(i, 'end_date', e.target.value)} className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500" placeholder="Present" />
                </div>
              </div>

              <div className="mb-4">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-gray-500">Description</label>
                  <AiImproveButton 
                    originalText={exp.description} 
                    context="improve_experience" 
                    fieldLabel="Description"
                    onAccept={(newText) => updateExp(i, 'description', newText)}
                  />
                </div>
                <textarea rows="4" value={exp.description || ''} onChange={(e) => updateExp(i, 'description', e.target.value)} className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 break-words"></textarea>
              </div>

              <div className="flex justify-end">
                <button onClick={() => setEditingIndex(-1)} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700 flex items-center gap-2">
                  <FaCheck /> Done
                </button>
              </div>
            </motion.div>
          )}
        </div>
      ))}

      <button onClick={addExp} className="w-full py-3 border-2 border-dashed border-blue-200 text-blue-600 font-bold rounded-xl hover:bg-blue-50 transition flex items-center justify-center gap-2">
        <FaPlus /> Add Position
      </button>
    </div>
  );
}

export default ExperienceTab;