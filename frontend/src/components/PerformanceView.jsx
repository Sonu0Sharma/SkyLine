// frontend/src/components/PerformanceView.jsx

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const data = [
  { name: 'Test 1', score: 65 },
  { name: 'Test 2', score: 78 },
  { name: 'Test 3', score: 72 },
  { name: 'Test 4', score: 85 },
  { name: 'Test 5', score: 91 },
];

function PerformanceView() {
  return (
    <div>
      <h3 className="text-2xl font-semibold text-gray-800 mb-4">Mock Test Performance</h3>
      <p className="text-gray-600 mb-6">Performance analysis of your last five mock tests.</p>
      <div style={{ width: '100%', height: 400 }}>
        <ResponsiveContainer>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="score" fill="#4f46e5" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default PerformanceView;