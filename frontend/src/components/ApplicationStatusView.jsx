// frontend/src/components/ApplicationStatusView.jsx
import React from 'react';

function ApplicationStatusView() {
    return (
        <div>
            <h3 className="text-2xl font-semibold text-gray-800 mb-4">Application Status</h3>
            <p className="text-gray-600">Track your starred jobs and upcoming interview dates here.</p>
            {/* This will be replaced with dynamic data later */}
            <div className="mt-6 p-4 border rounded-lg">
                No starred applications yet.
            </div>
        </div>
    )
}

export default ApplicationStatusView