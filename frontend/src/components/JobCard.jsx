// frontend/src/components/JobCard.jsx

import React from 'react';
import { formatDistanceToNow } from 'date-fns'; // We'll install this library next

function JobCard({ job }) {
  // Format the date to be human-readable (e.g., "about 7 days ago")
  const postedTimeAgo = formatDistanceToNow(new Date(job.posted_date), { addSuffix: true });

  return (
    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 transition-transform transform hover:-translate-y-1 flex flex-col">
      <div className="flex-grow">
        <h3 className="text-xl font-bold text-indigo-700">{job.title}</h3>
        <p className="text-md font-semibold text-gray-800 mt-1">{job.company}</p>
        <p className="text-sm text-gray-500 mt-1">{job.location}</p>
        <p className="text-xs text-gray-400 mt-2">{postedTimeAgo}</p>
      </div>
      <div className="mt-4 flex justify-between items-center">
        <a 
          href={job.url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="inline-block bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700"
        >
          View Job
        </a>
        <span className="text-xs font-semibold text-gray-500">via {job.source}</span>
      </div>
    </div>
  );
}

export default JobCard;