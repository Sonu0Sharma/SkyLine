// frontend/src/components/FormInput.jsx

import React from 'react';

// This is a reusable component for a label and an input field.
// It takes props to make it flexible.
function FormInput({ label, name, value, onChange, placeholder, type = 'text' }) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-gray-700">
        {label}
      </label>
      <div className="mt-1">
        <input
          type={type}
          id={name}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        />
      </div>
    </div>
  );
}

export default FormInput;