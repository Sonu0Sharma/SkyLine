// frontend/src/pages/Profile.jsx

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ProfileHero from '../components/profile/ProfileHero';
import ResumeHub from '../components/profile/ResumeHub';
import ExperienceTab from '../components/profile/ExperienceTab';
import EducationTab from '../components/profile/EducationTab';
import ProjectsTab from '../components/profile/ProjectsTab';
import SkillsTab from '../components/profile/SkillsTab';
import AiImproveButton from '../components/profile/AiImproveButton';
import { FaUser, FaBriefcase, FaGraduationCap, FaCode, FaSave } from 'react-icons/fa';
import toast from 'react-hot-toast';

function Profile() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('experience');
  
  // State
  const [profile, setProfile] = useState({
    full_name: '', email: '', phone: '', location: '', bio: '', skills: '',
    experience: [], education: [], projects: []
  });
  const [resumes, setResumes] = useState([]);

  // Fetch Data
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [pRes, rRes] = await Promise.all([
        axios.get('/api/profile/'),
        axios.get('/api/profile/resumes')
      ]);
      setProfile(pRes.data);
      setResumes(rRes.data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  // Save Changes
  const handleSave = async () => {
    try {
      await axios.post('/api/profile/', profile);
      toast.success("Profile Saved!");
    } catch (err) {
      toast.error("Error saving profile");
    }
  };

  // Handlers for updating nested state
  const updateExperience = (newExp) => setProfile({ ...profile, experience: newExp });
  const updateEducation = (newEdu) => setProfile({ ...profile, education: newEdu });
  const updateProjects = (newProjs) => setProfile({ ...profile, projects: newProjs });
  
  // -- Render --
  if (loading) return <div className="flex items-center justify-center h-screen text-gray-500">Loading Skyline Profile...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-10 overflow-x-hidden">
      <div className="max-w-6xl mx-auto">
        
        {/* 1. HERO SECTION */}
        <ProfileHero profile={profile} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* 2. LEFT COLUMN (Static Info + Resume Hub) */}
          <div className="space-y-8">
            
            {/* Contact Card */}
            <div className="bg-white p-6 rounded-xl shadow-sm border">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <FaUser className="text-indigo-600" /> Contact Info
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-400 uppercase font-bold">Full Name</label>
                  <input 
                    type="text" value={profile.full_name} 
                    onChange={e => setProfile({...profile, full_name: e.target.value})}
                    className="w-full p-2 border rounded mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 uppercase font-bold">Location</label>
                  <input 
                    type="text" value={profile.location || ''} 
                    onChange={e => setProfile({...profile, location: e.target.value})}
                    className="w-full p-2 border rounded mt-1"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs text-gray-400 uppercase font-bold">Bio / Tagline</label>
                    <AiImproveButton 
                      originalText={profile.bio}
                      context="refine_bio"
                      fieldLabel="Bio"
                      onAccept={(newText) => setProfile({...profile, bio: newText})}
                    />
                  </div>
                  <textarea 
                    rows="3" value={profile.bio || ''} 
                    onChange={e => setProfile({...profile, bio: e.target.value})}
                    className="w-full p-2 border rounded mt-1 text-sm"
                  ></textarea>
                </div>
              </div>
            </div>

            {/* Resume Hub Component */}
            <ResumeHub resumes={resumes} onUpdate={fetchData} />
          </div>

          {/* 3. RIGHT COLUMN (Tabs) */}
          <div className="lg:col-span-2">
            
            {/* Tab Header */}
            <div className="bg-white rounded-t-xl border-b flex overflow-x-auto">
              {['experience', 'education', 'projects', 'skills'].map((tab) => (
                <button 
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-6 py-4 font-bold text-sm capitalize border-b-2 transition whitespace-nowrap ${
                    activeTab === tab 
                      ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50' 
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="bg-white rounded-b-xl border border-t-0 p-6 shadow-sm min-h-[400px]">
              
              {activeTab === 'experience' && (
                <ExperienceTab experience={profile.experience} onChange={updateExperience} />
              )}

              {activeTab === 'skills' && (
                <SkillsTab 
                  skillsString={profile.skills || ''} 
                  onChange={(newString) => setProfile({ ...profile, skills: newString })} 
                />
              )}

              {activeTab === 'projects' && (
                <ProjectsTab projects={profile.projects} onChange={updateProjects} />
              )}

              {activeTab === 'education' && (
                <EducationTab education={profile.education} onChange={updateEducation} />
              )}

              {/* Save Button */}
              <div className="mt-8 pt-6 border-t flex justify-end">
                <button 
                  onClick={handleSave}
                  className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:bg-indigo-700 hover:shadow-xl transition transform hover:-translate-y-1 flex items-center gap-2"
                >
                  <FaSave /> Save Profile
                </button>
              </div>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

export default Profile;