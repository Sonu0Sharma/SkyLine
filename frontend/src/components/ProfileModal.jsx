import React from "react";
import UserProfileForm from "./UserProfileForm";

function ProfileModal({ isOpen, onClose, profile, handleInputChange, handleSubmit }) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label="Edit profile"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />

      {/* Modal card */}
      <div className="relative z-10 w-full max-w-3xl mx-4">
        <div className="bg-white/80 backdrop-blur-md border border-white/20 rounded-2xl shadow-2xl p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Edit Profile</h3>
              <p className="text-sm text-gray-500 mt-1">Update your details used across the app.</p>
            </div>
            <div>
              <button
                onClick={onClose}
                aria-label="Close profile modal"
                className="inline-flex items-center justify-center p-2 rounded-md text-gray-600 hover:bg-gray-100"
              >
                ✕
              </button>
            </div>
          </div>

          <div className="mt-4">
            <UserProfileForm
              profile={profile}
              handleInputChange={handleInputChange}
              handleSubmit={handleSubmit}
            />
          </div>

          <div className="mt-4 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-md bg-white/70 border border-white/20 text-sm hover:bg-gray-100"
            >
              Cancel
            </button>

            <button
              onClick={handleSubmit}
              className="px-4 py-2 rounded-md bg-gradient-to-r from-indigo-600 to-blue-500 text-white text-sm font-semibold shadow"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProfileModal;
