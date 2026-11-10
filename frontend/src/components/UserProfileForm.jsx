// frontend/src/components/UserProfileForm.jsx

import React from 'react';
import FormInput from './FormInput';

// The props { profile, handleInputChange, handleSubmit } will be passed from the Dashboard page.
function UserProfileForm({ profile, handleInputChange, handleSubmit }) {
  return (
    <form onSubmit={handleSubmit} className="space-y-8 divide-y divide-gray-200">
      <div className="space-y-8 divide-y divide-gray-200">
        <div>
          <div>
            <h3 className="text-lg leading-6 font-medium text-gray-900">Personal Information</h3>
            <p className="mt-1 text-sm text-gray-500">This information will be used to generate your resumes.</p>
          </div>
          <div className="mt-6 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
            <div className="sm:col-span-3">
              <FormInput label="Full Name" name="fullName" value={profile.fullName} onChange={handleInputChange} placeholder="John Doe" />
            </div>
            <div className="sm:col-span-3">
              <FormInput label="Email address" name="email" type="email" value={profile.email} onChange={handleInputChange} placeholder="you@example.com" />
            </div>
            <div className="sm:col-span-3">
              <FormInput label="Phone Number" name="phone" value={profile.phone} onChange={handleInputChange} placeholder="(123) 456-7890" />
            </div>
            <div className="sm:col-span-3">
              <FormInput label="LinkedIn Profile URL" name="linkedin" value={profile.linkedin} onChange={handleInputChange} placeholder="linkedin.com/in/yourprofile" />
            </div>
          </div>
        </div>

        <div className="pt-8">
          <div>
            <h3 className="text-lg leading-6 font-medium text-gray-900">Skills</h3>
            <p className="mt-1 text-sm text-gray-500">Enter your skills, separated by commas.</p>
          </div>
          <div className="mt-6">
            <label htmlFor="skills" className="block text-sm font-medium text-gray-700">Skills</label>
            <textarea
              id="skills"
              name="skills"
              rows={3}
              className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border border-gray-300 rounded-md p-2"
              placeholder="Python, React.js, FastAPI, SQL, AWS"
              value={profile.skills}
              onChange={handleInputChange}
            />
          </div>
        </div>

        {/* We will add Work Experience and Education sections later to keep this step simple */}

      </div>

      <div className="pt-5">
        <div className="flex justify-end">
          <button
            type="submit"
            className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Save Profile
          </button>
        </div>
      </div>
    </form>
  );
}

export default UserProfileForm;