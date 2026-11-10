// frontend/src/App.jsx

import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// Layout Components
import TopNav from './components/TopNav';
import Footer from './components/Footer';

// Pages
import Dashboard from './pages/Dashboard';
import JobAggregator from './pages/JobAggregator';
import ResumeGenerator from './pages/ResumeGenerator';
import MockPractice from './pages/MockPractice';
import AtsChecker from './pages/AtsChecker';
import AtsResult from './pages/AtsResult'; // NEW: results dashboard
import Profile from './pages/Profile';
import AiPage from './pages/AiPage';

import ErrorBoundary from "./components/ErrorBoundary";

function App() {
  return (
    <div className="bg-gray-50 min-h-screen flex flex-col font-sans text-gray-900">
      <Toaster position="top-right" />
      
      {/* 1. Sticky Header (Replaces Sidebar + Old Navbar) */}
      <TopNav />

      {/* 2. Main Content Area */}
      <div className="flex-grow flex flex-col">
        <main className="w-full mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 flex-grow">
          <ErrorBoundary>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/jobs" element={<JobAggregator />} />
            <Route path="/resume" element={<ResumeGenerator />} />
            <Route path="/ats" element={<AtsChecker />} />
            <Route path="/ats-result" element={<AtsResult />} /> {/* NEW */}
            <Route path="/mock" element={<MockPractice />} />
            <Route path="/ai" element={<AiPage />} />
            <Route path="/profile" element={<Profile />} />
          </Routes>
          </ErrorBoundary>
        </main>
        
        <Footer />
      </div>
    </div>
  );
}

export default App;
