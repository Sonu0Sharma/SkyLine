import React from 'react';
import AiAssistantView from '../components/AiAssistantView';
import { FaRobot } from 'react-icons/fa';

function AiPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-10">
      <div className="max-w-4xl mx-auto h-[80vh] flex flex-col">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <FaRobot className="text-indigo-600" /> AI Career Assistant
          </h1>
          <p className="text-gray-600 mt-2">
            Your personal AI coach. Ask about interview tips, salary negotiation, or career path planning.
          </p>
        </div>
        
        {/* Reuse the existing component, but styled for full page */}
        <div className="flex-grow shadow-xl rounded-2xl overflow-hidden border border-gray-200">
           <AiAssistantView />
        </div>
      </div>
    </div>
  );
}

export default AiPage;