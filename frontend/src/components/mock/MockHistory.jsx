import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, ResponsiveContainer, 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis 
} from 'recharts';
import { FaTrophy, FaChartLine, FaHistory, FaArrowLeft, FaArrowRight } from 'react-icons/fa';

function MockHistory({ onBack, onViewSession }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get('/mock-v3/history/all')
      .then(res => setData(res.data.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
    </div>
  );

  // --- Process Data for Charts ---
  // 1. Line Chart: Reverse data so oldest is first
  const chartData = [...data].reverse().map(s => ({
    date: format(new Date(s.date), 'MM/dd'),
    score: s.score,
    role: s.role
  }));

  // 2. Radar Chart: Aggregate dimensions
  const dimStats = {};
  let dimCount = 0;
  data.forEach(s => {
    if (s.dimensions) {
      dimCount++;
      Object.entries(s.dimensions).forEach(([key, val]) => {
        const k = key.replace(/_/g, ' '); // Clean key
        dimStats[k] = (dimStats[k] || 0) + val;
      });
    }
  });
  
  const radarData = Object.keys(dimStats).map(k => ({
    subject: k,
    A: Math.round(dimStats[k] / dimCount),
    fullMark: 100
  })).slice(0, 6); // Limit to top 6 dimensions

  const avgScore = data.length > 0 
    ? Math.round(data.reduce((acc, curr) => acc + curr.score, 0) / data.length) 
    : 0;

  const bestRole = data.length > 0 
    ? [...data].sort((a,b) => b.score - a.score)[0].role 
    : "N/A";

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-10 animate-fade-in-up font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Performance Analytics</h2>
            <p className="text-gray-500">Track your interview progress over time.</p>
          </div>
          <button 
            onClick={onBack} 
            className="flex items-center gap-2 text-gray-600 hover:text-indigo-600 font-medium transition bg-white px-4 py-2 rounded-lg shadow-sm border border-gray-200"
          >
            <FaArrowLeft /> Back to Setup
          </button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
            <div className="p-4 bg-indigo-50 rounded-xl text-indigo-600 text-2xl"><FaHistory /></div>
            <div>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Sessions</p>
              <p className="text-3xl font-bold text-gray-900">{data.length}</p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
            <div className="p-4 bg-green-50 rounded-xl text-green-600 text-2xl"><FaChartLine /></div>
            <div>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Avg Score</p>
              <p className="text-3xl font-bold text-gray-900">{avgScore}</p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
            <div className="p-4 bg-yellow-50 rounded-xl text-yellow-600 text-2xl"><FaTrophy /></div>
            <div>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Best Role</p>
              <p className="text-lg font-bold text-gray-900 truncate max-w-[150px]" title={bestRole}>
                {bestRole}
              </p>
            </div>
          </div>
        </div>

        {/* Charts Row */}
        {data.length > 1 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Progress Chart */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h3 className="text-lg font-bold text-gray-800 mb-6">Score Trend</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} domain={[0, 100]} />
                    <ChartTooltip 
                      contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'}}
                    />
                    <Line type="monotone" dataKey="score" stroke="#4f46e5" strokeWidth={3} dot={{r: 4, fill: '#4f46e5'}} activeDot={{r: 6}} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Skills Radar */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h3 className="text-lg font-bold text-gray-800 mb-6">Skill Profile</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                    <PolarGrid stroke="#e5e7eb" />
                    <PolarAngleAxis dataKey="subject" tick={{fill: '#6b7280', fontSize: 11}} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                    <Radar name="Skills" dataKey="A" stroke="#0ea5e9" fill="#0ea5e9" fillOpacity={0.4} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white p-10 rounded-2xl border border-dashed border-gray-300 text-center text-gray-500">
            Complete at least 2 sessions to unlock analytics charts!
          </div>
        )}

        {/* Recent Sessions List */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-50 bg-gray-50/50">
            <h3 className="text-lg font-bold text-gray-800">Recent Sessions</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {data.map((session) => (
              <div key={session.session_id} className="p-6 flex items-center justify-between hover:bg-gray-50 transition group cursor-pointer" onClick={() => onViewSession(session.session_id)}>
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-white shadow-sm ${
                    session.score >= 80 ? 'bg-green-500' : session.score >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}>
                    {session.score}
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900">{session.role}</h4>
                    <p className="text-xs text-gray-500">
                      {session.type} • {session.difficulty} • {format(new Date(session.date), 'MMM d, h:mm a')}
                    </p>
                  </div>
                </div>
                <button 
                  className="px-4 py-2 text-sm font-bold text-indigo-600 bg-indigo-50 rounded-lg opacity-0 group-hover:opacity-100 transition flex items-center gap-2"
                >
                  View Report <FaArrowRight />
                </button>
              </div>
            ))}
            {data.length === 0 && <p className="p-6 text-center text-gray-500">No sessions yet.</p>}
          </div>
        </div>

      </div>
    </div>
  );
}

export default MockHistory;