// frontend/src/components/FilterSidebar.jsx

import React from 'react';

function FilterSidebar({ filters, onFilterChange, onApplyFilters }) {
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    onFilterChange(name, type === 'checkbox' ? checked : value);
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg h-full">
      <h3 className="text-xl font-bold mb-4">Filters</h3>
      <form onSubmit={onApplyFilters} className="space-y-6">
        {/* Keyword search is now the main bar, but kept here for potential future use */}
        
        {/* Location Filter */}
        <div>
          <label htmlFor="location" className="block text-sm font-medium text-gray-700">Location</label>
          <input
            type="text"
            name="location"
            id="location"
            value={filters.location}
            onChange={handleInputChange}
            placeholder="e.g., London, UK"
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
          />
        </div>
        
        {/* Company Filter */}
        <div>
          <label htmlFor="company" className="block text-sm font-medium text-gray-700">Company</label>
          <input
            type="text"
            name="company"
            id="company"
            value={filters.company}
            onChange={handleInputChange}
            placeholder="e.g., Google"
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
          />
        </div>

        {/* Date Posted Filter */}
        <div>
          <label htmlFor="days_old" className="block text-sm font-medium text-gray-700">Date Posted</label>
          <select
            name="days_old"
            id="days_old"
            value={filters.days_old}
            onChange={handleInputChange}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
          >
            <option value="0">All Time</option>
            <option value="1">Last 24 hours</option>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
          </select>
        </div>

        {/* Apply Button */}
        <button
          type="submit"
          className="w-full px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700"
        >
          Apply Filters
        </button>
      </form>
    </div>
  );
}

export default FilterSidebar;
