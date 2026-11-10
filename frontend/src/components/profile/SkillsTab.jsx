import React, { useState, useEffect } from 'react';
import { FaTimes, FaPlus, FaLightbulb } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';

function SkillsTab({ skillsString, onChange }) {
  const [inputValue, setInputValue] = useState('');
  const [tags, setTags] = useState([]);

  // Sync internal state with props
  useEffect(() => {
    if (skillsString) {
      // Split by comma, trim whitespace, remove empty strings
      setTags(skillsString.split(',').map(s => s.trim()).filter(s => s));
    } else {
      setTags([]);
    }
  }, [skillsString]);

  const updateParent = (newTags) => {
    // Convert array back to comma-separated string
    onChange(newTags.join(', '));
  };

  const addTag = (e) => {
    e.preventDefault();
    const val = inputValue.trim();
    if (val && !tags.includes(val)) {
      const newTags = [...tags, val];
      setTags(newTags);
      updateParent(newTags);
      setInputValue('');
    }
  };

  const removeTag = (tagToRemove) => {
    const newTags = tags.filter(tag => tag !== tagToRemove);
    setTags(newTags);
    updateParent(newTags);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      addTag(e);
    }
  };

  return (
    <div className="bg-white p-8 rounded-xl border shadow-sm animate-fade-in">
      <h3 className="font-bold text-gray-800 text-lg mb-2">Skills & Expertise</h3>
      <p className="text-gray-500 text-sm mb-6">
        Add skills to help the AI match you with jobs. Type a skill and press <b>Enter</b>.
      </p>

      {/* Input Area */}
      <div className="flex gap-2 mb-6">
        <input 
          type="text" 
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-grow p-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
          placeholder="e.g. Project Management, Python, Figma..."
        />
        <button 
          onClick={addTag}
          disabled={!inputValue.trim()}
          className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-indigo-700 disabled:opacity-50 transition flex items-center gap-2"
        >
          <FaPlus /> Add
        </button>
      </div>

      {/* Tags Display */}
      <div className="flex flex-wrap gap-3 min-h-[100px] content-start">
        <AnimatePresence>
          {tags.map((tag, index) => (
            <motion.span 
              key={index}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-indigo-50 text-indigo-700 px-4 py-2 rounded-full text-sm font-semibold border border-indigo-100 flex items-center gap-2 shadow-sm group hover:bg-indigo-100 transition"
            >
              {tag}
              <button 
                onClick={() => removeTag(tag)}
                className="text-indigo-400 hover:text-red-500 bg-white rounded-full p-0.5 group-hover:bg-white transition"
              >
                <FaTimes size={12} />
              </button>
            </motion.span>
          ))}
        </AnimatePresence>
        
        {tags.length === 0 && (
          <div className="w-full text-center py-8 text-gray-300 border-2 border-dashed rounded-lg flex flex-col items-center">
            <FaLightbulb className="mb-2 text-xl" />
            <p>No skills added yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default SkillsTab;