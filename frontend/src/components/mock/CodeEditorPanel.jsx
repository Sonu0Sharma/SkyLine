import React from 'react';
import Editor from '@monaco-editor/react';
import { FaCode, FaExpand, FaCompress } from 'react-icons/fa';

function CodeEditorPanel({ code, setCode, language, setLanguage, isOpen }) {
  if (!isOpen) return null;

  return (
    <div className="flex flex-col h-full bg-white border-l border-gray-200 shadow-xl w-full md:w-1/2 transition-all duration-300 ease-in-out">
      
      {/* Header */}
      <div className="flex justify-between items-center px-4 py-3 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center gap-2 text-gray-700 font-bold text-sm">
          <FaCode className="text-indigo-600" /> 
          <span>Code Editor</span>
        </div>
        
        <select 
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="bg-white border border-gray-300 text-gray-700 text-xs rounded-lg px-2 py-1 focus:ring-2 focus:ring-indigo-500 outline-none"
        >
          <option value="javascript">JavaScript</option>
          <option value="python">Python</option>
          <option value="java">Java</option>
          <option value="cpp">C++</option>
          <option value="sql">SQL</option>
          <option value="html">HTML</option>
        </select>
      </div>

      {/* Monaco Editor Instance */}
      <div className="flex-grow overflow-hidden relative">
        <Editor
          height="100%"
          language={language}
          value={code}
          onChange={(value) => setCode(value || "")}
          theme="light"
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            lineNumbers: "on",
            scrollBeyondLastLine: false,
            automaticLayout: true,
            padding: { top: 16, bottom: 16 },
            fontFamily: "'Fira Code', 'Consolas', monospace",
          }}
        />
      </div>
      
      <div className="bg-gray-50 px-4 py-2 text-xs text-gray-400 border-t border-gray-200 text-center">
        Code written here is submitted with your answer.
      </div>
    </div>
  );
}

export default CodeEditorPanel;