import React, { useState } from 'react';
import { FaPlus, FaTrash, FaPen, FaCheck, FaGraduationCap } from 'react-icons/fa';
import { motion } from 'framer-motion';

function EducationTab({ education, onChange }) {
  // Track which item is currently being edited by its index. -1 means none.
  const [editingIndex, setEditingIndex] = useState(-1);

  const addEducation = () => {
    const newEdu = [...education, { school: '', degree: '', year: '' }];
    onChange(newEdu);
    setEditingIndex(newEdu.length - 1); // Auto-open the new item
  };

  const removeEducation = (index) => {
    const newEdu = [...education];
    newEdu.splice(index, 1);
    onChange(newEdu);
    setEditingIndex(-1);
  };

  const updateEducation = (index, field, value) => {
    const newEdu = [...education];
    newEdu[index][field] = value;
    onChange(newEdu);
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {education.map((edu, i) => (
        <div key={i} className="bg-white rounded-xl border shadow-sm overflow-hidden transition hover:shadow-md">
          
          {/* VIEW MODE */}
          {editingIndex !== i && (
            <div className="p-5 flex justify-between items-center group">
              <div className="flex gap-4 items-center">
                <div className="bg-indigo-50 p-3 rounded-lg text-indigo-600">
                  <FaGraduationCap size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-800 text-lg">{edu.school || "University Name"}</h3>
                  <p className="text-gray-500 text-sm">{edu.degree} • {edu.year}</p>
                </div>
              </div>
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition">
                <button onClick={() => setEditingIndex(i)} className="p-2 text-gray-400 hover:text-indigo-600">
                  <FaPen />
                </button>
                <button onClick={() => removeEducation(i)} className="p-2 text-gray-400 hover:text-red-500">
                  <FaTrash />
                </button>
              </div>
            </div>
          )}

          {/* EDIT MODE */}
          {editingIndex === i && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6 bg-gray-50/50">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide">Editing Education</h3>
                <button onClick={() => removeEducation(i)} className="text-red-400 hover:text-red-600 text-sm">Remove</button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">School / University</label>
                  <input 
                    type="text" value={edu.school} 
                    onChange={(e) => updateEducation(i, 'school', e.target.value)}
                    className="w-full p-2 border rounded focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g. Stanford University"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Degree / Certificate</label>
                  <input 
                    type="text" value={edu.degree} 
                    onChange={(e) => updateEducation(i, 'degree', e.target.value)}
                    className="w-full p-2 border rounded focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g. B.S. Computer Science"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Year</label>
                  <input 
                    type="text" value={edu.year} 
                    onChange={(e) => updateEducation(i, 'year', e.target.value)}
                    className="w-full p-2 border rounded focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g. 2024"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button 
                  onClick={() => setEditingIndex(-1)} 
                  className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-indigo-700 flex items-center gap-2"
                >
                  <FaCheck /> Done
                </button>
              </div>
            </motion.div>
          )}
        </div>
      ))}

      <button 
        onClick={addEducation}
        className="w-full py-3 border-2 border-dashed border-indigo-200 text-indigo-600 font-bold rounded-xl hover:bg-indigo-50 transition flex items-center justify-center gap-2"
      >
        <FaPlus /> Add Education
      </button>
    </div>
  );
}

export default EducationTab;