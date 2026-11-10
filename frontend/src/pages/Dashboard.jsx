// frontend/src/pages/Dashboard.jsx

import React, { useState } from 'react';
import PerformanceView from '../components/PerformanceView';
import AiAssistantView from '../components/AiAssistantView';
import ApplicationStatusView from '../components/ApplicationStatusView';

// This is a new, clean helper component for our three top cards (or "tabs")
const DashboardTabCard = ({ title, subtitle, onClick, isActive }) => {
    
    // Base classes for all cards
    const baseClasses = "w-full text-left p-6 bg-white rounded-lg shadow-md transition-all duration-300 transform cursor-pointer";

    // Classes that are ADDED only when the card is active
    const activeClasses = "scale-105 shadow-xl border-b-4 border-indigo-600";
    
    // Classes for inactive cards, providing a subtle hover effect
    const inactiveClasses = "hover:shadow-lg hover:-translate-y-1";

    return (
        <div onClick={onClick} className={`${baseClasses} ${isActive ? activeClasses : inactiveClasses}`}>
            <h2 className="text-xl font-semibold text-gray-700">{title}</h2>
            <p className="mt-2 text-sm text-gray-500">{subtitle}</p>
        </div>
    );
};

// This function remains the same, it decides which component to show
const renderActiveView = (activeView) => {
    switch (activeView) {
        case 'performance':
            return <PerformanceView />;
        case 'ai':
            return <AiAssistantView />;
        case 'status':
        default:
            return <ApplicationStatusView />;
    }
};

function Dashboard() {
    // This state logic also remains the same
    const [activeView, setActiveView] = useState('status');

    return (
        <div className="p-10">
            {/* This is the top container for our three horizontal cards.
                It uses a grid layout that will stack on smaller screens. */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <DashboardTabCard
                    title="Application Status"
                    subtitle="Track starred jobs and dates"
                    onClick={() => setActiveView('status')}
                    isActive={activeView === 'status'}
                />
                <DashboardTabCard
                    title="Mock Test Performance"
                    subtitle="Analyze your scores and progress"
                    onClick={() => setActiveView('performance')}
                    isActive={activeView === 'performance'}
                />
                <DashboardTabCard
                    title="AI Suggestions"
                    subtitle="Chat with your career assistant"
                    onClick={() => setActiveView('ai')}
                    isActive={activeView === 'ai'}
                />
            </div>

            {/* This is the main content area below the cards.
                It has a margin-top to create space. The content is rendered directly inside it. */}
            <div className="mt-12">
                {renderActiveView(activeView)}
            </div>
        </div>
    );
}

export default Dashboard;