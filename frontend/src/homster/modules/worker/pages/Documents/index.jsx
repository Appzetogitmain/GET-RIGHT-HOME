import React, { useState, useEffect, useLayoutEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiCamera, FiFileText } from 'react-icons/fi';
import { workerAuthService } from '../../../../services/authService';
import workerService from '../../../../services/workerService';
import flutterBridge from '../../../../utils/flutterBridge';
import { toast } from 'react-hot-toast';

const Documents = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // Files to upload
  const [frontFile, setFrontFile] = useState(null);
  const [backFile, setBackFile] = useState(null);

  // Previews
  const [frontPreview, setFrontPreview] = useState(null);
  const [backPreview, setBackPreview] = useState(null);

  useLayoutEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const root = document.getElementById('root');
    const bgStyle = '#F9FAFB'; // gray-50

    if (html) html.style.background = bgStyle;
    if (body) body.style.background = bgStyle;
    if (root) root.style.background = bgStyle;

    return () => {
      if (html) html.style.background = '';
      if (body) body.style.background = '';
      if (root) root.style.background = '';
    };
  }, []);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await workerAuthService.getProfile();
        if (response.success && response.worker) {
          setProfile(response.worker);
          setFrontPreview(response.worker.aadhar?.document || null);
          setBackPreview(response.worker.aadhar?.backDocument || null);
        } else {
          const localWorkerData = JSON.parse(localStorage.getItem('workerData') || '{}');
          setProfile(localWorkerData);
          setFrontPreview(localWorkerData.aadhar?.document || null);
          setBackPreview(localWorkerData.aadhar?.backDocument || null);
        }
      } catch (err) {
        const localWorkerData = JSON.parse(localStorage.getItem('workerData') || '{}');
        setProfile(localWorkerData);
        setFrontPreview(localWorkerData.aadhar?.document || null);
        setBackPreview(localWorkerData.aadhar?.backDocument || null);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const uploadFile = async (file) => {
    const formData = new FormData();
    formData.append('file', file);

    let baseUrl = import.meta.env.VITE_API_BASE_URL || '';
    if (!baseUrl) {
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        baseUrl = 'http://localhost:5000';
      } else {
        baseUrl = window.location.origin;
      }
    }
    baseUrl = baseUrl.replace(/\/api$/, '');
    const response = await fetch(`${baseUrl}/api/image/upload`, {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();
    if (!data.success) throw new Error(data.message || 'Upload failed');
    return data.imageUrl;
  };

  const handleNativeCamera = async (side) => {
    const file = await flutterBridge.openCamera();
    if (file) {
      if (side === 'front') {
        setFrontFile(file);
        setFrontPreview(URL.createObjectURL(file));
      } else {
        setBackFile(file);
        setBackPreview(URL.createObjectURL(file));
      }
      flutterBridge.hapticFeedback('success');
    }
  };

  const handlePhotoChange = (e, side) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size should be less than 5MB');
        return;
      }
      if (side === 'front') {
        setFrontFile(file);
        setFrontPreview(URL.createObjectURL(file));
      } else {
        setBackFile(file);
        setBackPreview(URL.createObjectURL(file));
      }
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const payload = {};
      
      if (frontFile) {
        payload.aadharFront = await uploadFile(frontFile);
      }
      if (backFile) {
        payload.aadharBack = await uploadFile(backFile);
      }

      if (!payload.aadharFront && !payload.aadharBack) {
        toast.error('No changes to save');
        setIsSaving(false);
        return;
      }

      const res = await workerService.updateProfile(payload);
      if (res.success) {
        toast.success('Documents updated successfully');
        
        // Update local storage
        const currentWorker = JSON.parse(localStorage.getItem('workerData') || '{}');
        const updatedWorker = { ...currentWorker, aadhar: res.worker.aadhar };
        localStorage.setItem('workerData', JSON.stringify(updatedWorker));
        
        setProfile(res.worker);
        setFrontFile(null);
        setBackFile(null);
      } else {
        toast.error('Failed to update documents');
      }
    } catch (error) {
      console.error('Update failed:', error);
      toast.error(error.response?.data?.message || error.message || 'Update failed');
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges = frontFile || backFile;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-white px-4 py-4 sticky top-0 z-50 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-gray-800">
            <FiArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-bold text-gray-800">My Documents</h1>
        </div>
        {hasChanges && (
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-blue-600 text-white px-4 py-1.5 rounded-lg font-semibold text-sm hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        )}
      </div>

      <div className="p-4">
        {isLoading ? (
          <div className="flex justify-center py-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1E3A8A]"></div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-blue-50 rounded-lg text-[#1E3A8A]">
                  <FiFileText className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-gray-800">Aadhar Card</h3>
              </div>
              
              <div className="space-y-6">
                {/* Front Side */}
                <div>
                  <p className="text-sm text-gray-500 mb-2 font-medium">Front Side</p>
                  <div className="relative rounded-xl overflow-hidden border border-gray-200">
                    {frontPreview ? (
                      <img src={frontPreview} alt="Aadhar Front" className="w-full h-48 object-cover" />
                    ) : (
                      <div className="h-48 bg-gray-100 flex flex-col items-center justify-center text-gray-400">
                        <FiCamera className="w-8 h-8 mb-2 opacity-50" />
                        <span>Tap to add front side</span>
                      </div>
                    )}
                    
                    <div 
                      className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                      onClick={() => flutterBridge.isFlutter ? handleNativeCamera('front') : document.getElementById('front-upload').click()}
                    >
                      <div className="bg-white/90 p-3 rounded-full shadow-lg">
                        <FiCamera className="w-6 h-6 text-gray-800" />
                      </div>
                    </div>
                  </div>
                  <input
                    type="file"
                    id="front-upload"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handlePhotoChange(e, 'front')}
                  />
                  <div 
                    className="mt-2 text-center text-sm font-medium text-blue-600 cursor-pointer"
                    onClick={() => flutterBridge.isFlutter ? handleNativeCamera('front') : document.getElementById('front-upload').click()}
                  >
                    Tap to change front photo
                  </div>
                </div>

                {/* Back Side */}
                <div>
                  <p className="text-sm text-gray-500 mb-2 font-medium">Back Side</p>
                  <div className="relative rounded-xl overflow-hidden border border-gray-200">
                    {backPreview ? (
                      <img src={backPreview} alt="Aadhar Back" className="w-full h-48 object-cover" />
                    ) : (
                      <div className="h-48 bg-gray-100 flex flex-col items-center justify-center text-gray-400">
                        <FiCamera className="w-8 h-8 mb-2 opacity-50" />
                        <span>Tap to add back side</span>
                      </div>
                    )}
                    
                    <div 
                      className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                      onClick={() => flutterBridge.isFlutter ? handleNativeCamera('back') : document.getElementById('back-upload').click()}
                    >
                      <div className="bg-white/90 p-3 rounded-full shadow-lg">
                        <FiCamera className="w-6 h-6 text-gray-800" />
                      </div>
                    </div>
                  </div>
                  <input
                    type="file"
                    id="back-upload"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handlePhotoChange(e, 'back')}
                  />
                  <div 
                    className="mt-2 text-center text-sm font-medium text-blue-600 cursor-pointer"
                    onClick={() => flutterBridge.isFlutter ? handleNativeCamera('back') : document.getElementById('back-upload').click()}
                  >
                    Tap to change back photo
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Documents;
