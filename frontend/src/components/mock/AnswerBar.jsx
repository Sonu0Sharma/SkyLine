import React, { useState } from 'react';
import { FaPaperPlane, FaMicrophone, FaCode } from 'react-icons/fa';

function AnswerBar({ onSubmit, isLoading, onToggleCode, isCodeOpen }) {
  const [text, setText] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!text.trim() && !isCodeOpen) return;
    onSubmit(text);
    setText('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="bg-white border-t border-gray-200 p-4 shadow-sm z-20">
      <form 
        onSubmit={handleSubmit}
        className="max-w-6xl mx-auto relative flex gap-3 items-end"
      >
        {/* Code Toggle Button */}
        <button
          type="button"
          onClick={onToggleCode}
          className={`p-3 rounded-xl border transition-all ${
            isCodeOpen 
              ? "bg-indigo-100 text-indigo-600 border-indigo-200" 
              : "bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100"
          }`}
          title="Toggle Code Editor"
        >
          <FaCode size={18} />
        </button>

        {/* Text Input */}
        <div className="flex-grow relative">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your answer here... (Shift+Enter for new line)"
            className="w-full bg-gray-50 border border-gray-200 text-gray-800 rounded-xl px-4 py-3 pr-12 focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all outline-none resize-none shadow-inner"
            rows={1}
            style={{ minHeight: '50px', maxHeight: '150px' }}
          />
          <button 
            type="button"
            className="absolute right-3 top-3 text-gray-400 hover:text-indigo-500 transition"
            title="Voice Input (Coming Soon)"
          >
            <FaMicrophone />
          </button>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading || (!text.trim() && !isCodeOpen)}
          className="bg-indigo-600 text-white p-3 rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md transition-transform active:scale-95 flex-shrink-0"
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <FaPaperPlane size={18} />
          )}
        </button>
      </form>
    </div>
  );
}

export default AnswerBar;