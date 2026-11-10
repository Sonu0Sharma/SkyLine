import React, { useState } from 'react';
import { FaPlus, FaTrash, FaPen, FaCheck, FaCode, FaGithub } from 'react-icons/fa';
import { motion } from 'framer-motion';
import AiImproveButton from './AiImproveButton';

function ProjectsTab({ projects, onChange }) {
  const [editingIndex, setEditingIndex] = useState(-1);

  const addProject = () => {
    const newProjs = [...projects, { name: '', tech_stack: '', description: '', link: '' }];
    onChange(newProjs);
    setEditingIndex(newProjs.length - 1);
  };

  const removeProject = (index) => {
    const newProjs = [...projects];
    newProjs.splice(index, 1);
    onChange(newProjs);
    setEditingIndex(-1);
  };

  const updateProject = (index, field, value) => {
    const newProjs = [...projects];
    newProjs[index][field] = value;
    onChange(newProjs);
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {projects.map((proj, i) => (
        <div key={i} className="relative bg-white rounded-xl border shadow-sm hover:shadow-md transition overflow-visible">
          
          {/* VIEW MODE */}
          {editingIndex !== i && (
            <div className="p-5 flex justify-between items-start group min-w-0">
              <div className="flex gap-4 min-w-0">
                <div className="bg-purple-50 p-3 rounded-lg text-purple-600 h-fit">
                  <FaCode size={20} />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-gray-800 text-lg break-words">{proj.name || "Project Name"}</h3>
                  <p className="text-purple-600 text-sm font-medium break-words">{proj.tech_stack}</p>
                  {proj.description && <p className="text-sm text-gray-600 mt-2 line-clamp-1 break-words">{proj.description}</p>}
                </div>
              </div>
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition">
                <button onClick={() => setEditingIndex(i)} className="p-2 text-gray-400 hover:text-purple-600">
                  <FaPen />
                </button>
                <button onClick={() => removeProject(i)} className="p-2 text-gray-400 hover:text-red-500">
                  <FaTrash />
                </button>
              </div>
            </div>
          )}

          {/* EDIT MODE */}
          {editingIndex === i && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6 bg-gray-50/50">
              <div className="flex justify-between items-center mb-4">
                 <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wide">Editing Project</h3>
                 <button onClick={() => removeProject(i)} className="text-red-400 hover:text-red-600 text-sm">Remove</button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Project Name</label>
                  <input type="text" value={proj.name} onChange={(e) => updateProject(i, 'name', e.target.value)} className="w-full p-2 border rounded focus:ring-2 focus:ring-purple-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">Tech Stack</label>
                  <input type="text" value={proj.tech_stack} onChange={(e) => updateProject(i, 'tech_stack', e.target.value)} className="w-full p-2 border rounded focus:ring-2 focus:ring-purple-500" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-500 mb-1 flex items-center gap-1"><FaGithub/> Link</label>
                  <input type="text" value={proj.link || ''} onChange={(e) => updateProject(i, 'link', e.target.value)} className="w-full p-2 border rounded focus:ring-2 focus:ring-purple-500" />
                </div>
              </div>

              <div className="mb-4">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-gray-500">Description</label>
                  <AiImproveButton 
                    originalText={proj.description} 
                    context="rewrite_project" 
                    fieldLabel="Project"
                    onAccept={(newText) => updateProject(i, 'description', newText)}
                  />
                </div>
                <textarea rows="3" value={proj.description || ''} onChange={(e) => updateProject(i, 'description', e.target.value)} className="w-full p-2 border rounded focus:ring-2 focus:ring-purple-500 break-words"></textarea>
              </div>

              <div className="flex justify-end">
                <button onClick={() => setEditingIndex(-1)} className="bg-purple-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-purple-700 flex items-center gap-2">
                  <FaCheck /> Done
                </button>
              </div>
            </motion.div>
          )}
        </div>
      ))}

      <button onClick={addProject} className="w-full py-3 border-2 border-dashed border-purple-200 text-purple-600 font-bold rounded-xl hover:bg-purple-50 transition flex items-center justify-center gap-2">
        <FaPlus /> Add Project
      </button>
    </div>
  );
}

export default ProjectsTab;