import React from 'react';
import { FaMapMarkerAlt, FaLinkedin, FaEnvelope } from 'react-icons/fa';
import { motion } from 'framer-motion';

function ProfileHero({ profile }) {
  // Derive "Current Role" from the first experience entry, or fallback
  const currentRole = profile.experience?.[0]?.title || "Member";
  const currentCompany = profile.experience?.[0]?.company || "Skyline";

  return (
    <div className="relative bg-white rounded-2xl shadow-sm border overflow-hidden mb-8 group">
      {/* 1. Abstract Gradient Background */}
      <div className="h-32 bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-500"></div>

      <div className="px-8 pb-6 flex flex-col md:flex-row items-end -mt-12 gap-6">
        {/* 2. Avatar with border */}
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="relative w-32 h-32 rounded-full border-4 border-white bg-white shadow-md overflow-hidden flex items-center justify-center text-4xl font-bold text-indigo-600 bg-indigo-50"
        >
          {profile.full_name?.charAt(0).toUpperCase() || "U"}
        </motion.div>

        {/* 3. User Info */}
        <div className="flex-grow pb-2">
          <h1 className="text-3xl font-bold text-gray-900">{profile.full_name || "User Name"}</h1>
          <p className="text-lg text-gray-600 font-medium">
            {currentRole} <span className="text-gray-400 font-normal">at {currentCompany}</span>
          </p>
          
          <div className="flex gap-4 mt-3 text-sm text-gray-500">
            {profile.location && (
              <span className="flex items-center gap-1"><FaMapMarkerAlt /> {profile.location}</span>
            )}
            <span className="flex items-center gap-1"><FaEnvelope /> {profile.email}</span>
            {profile.linkedin && (
              <a href={profile.linkedin} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-indigo-600 hover:underline">
                <FaLinkedin /> LinkedIn
              </a>
            )}
          </div>
        </div>

        {/* 4. Profile Strength (Static for now) */}
        <div className="hidden md:block pb-4">
           <div className="text-right">
             <span className="text-xs font-bold uppercase text-gray-400 tracking-wider">Profile Strength</span>
             <div className="flex items-center gap-2 mt-1">
               <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                 <div className="h-full bg-green-500 w-[75%]"></div>
               </div>
               <span className="text-sm font-bold text-green-600">75%</span>
             </div>
           </div>
        </div>
      </div>
    </div>
  );
}

export default ProfileHero;