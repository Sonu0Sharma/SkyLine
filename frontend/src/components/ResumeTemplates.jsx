import React from 'react';

const templates = [
  {
    id: 'modern',
    name: 'Modern Clean',
    color: 'bg-blue-50',
    preview: 'https://via.placeholder.com/150?text=Modern', // Placeholder or local image
    description: 'Clean lines with a blue accent. Best for Tech & Startups.',
  },
  {
    id: 'classic',
    name: 'Professional Classic',
    color: 'bg-gray-50',
    preview: 'https://via.placeholder.com/150?text=Classic',
    description: 'Traditional serif fonts. Best for Corporate & Finance.',
  },
  {
    id: 'creative',
    name: 'Creative Portfolio',
    color: 'bg-purple-50',
    preview: 'https://via.placeholder.com/150?text=Creative',
    description: 'Bold headers and spacing. Best for Design & Marketing.',
  }
];

function ResumeTemplates({ onSelectTemplate, selectedTemplateId }) {
  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Choose a Template</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {templates.map((t) => (
          <div 
            key={t.id}
            onClick={() => onSelectTemplate(t.id)}
            className={`
              cursor-pointer border-2 rounded-lg p-4 transition-all hover:shadow-lg
              ${selectedTemplateId === t.id ? 'border-indigo-600 ring-2 ring-indigo-200' : 'border-gray-200'}
              ${t.color}
            `}
          >
            <div className="h-40 bg-white mb-4 flex items-center justify-center border rounded text-gray-400">
              {/* Replace this with real screenshots later */}
              <span className="text-sm">Preview: {t.name}</span>
            </div>
            <h3 className="font-bold text-gray-900">{t.name}</h3>
            <p className="text-sm text-gray-600 mt-2">{t.description}</p>
            {selectedTemplateId === t.id && (
              <div className="mt-3 text-indigo-600 text-sm font-bold flex items-center gap-1">
                ✓ Selected
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default ResumeTemplates;