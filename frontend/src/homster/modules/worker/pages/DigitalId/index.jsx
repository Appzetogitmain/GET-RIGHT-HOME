import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiSave, FiCreditCard, FiCamera } from 'react-icons/fi';
import Header from '../../components/layout/Header';
import BottomNav from '../../components/layout/BottomNav';
import workerService from '../../../../services/workerService';
import { toast } from 'react-hot-toast';
import flutterBridge from '../../../../utils/flutterBridge';

const DigitalId = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [digitalIdUrl, setDigitalIdUrl] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const res = await workerService.getProfile();
        if (res.success && res.worker) {
          const w = res.worker;
          // We use digitalIdCard to store the digital card
          if (w.digitalIdCard) {
            setDigitalIdUrl(w.digitalIdCard);
          }
        }
      } catch (error) {
        console.error('Fetch profile error:', error);
        toast.error('Failed to load profile data');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleNativeCamera = async () => {
    const file = await flutterBridge.openCamera();
    if (file) {
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
      flutterBridge.hapticFeedback('success');
    }
  };

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

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size should be less than 5MB');
        return;
      }
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async () => {
    if (!photoFile && !digitalIdUrl) {
      toast.error('Please upload a digital card photo');
      return;
    }

    try {
      setSaving(true);
      let payload = {};

      if (photoFile) {
        try {
          const photoUrl = await uploadFile(photoFile);
          payload.digitalIdCard = photoUrl;
        } catch (uploadErr) {
          console.error('Photo upload failed', uploadErr);
          toast.error('Failed to upload digital card');
          setSaving(false);
          return;
        }
      } else {
        toast.success('Digital Card saved successfully');
        navigate('/worker/profile');
        return;
      }

      await workerService.updateProfile(payload);
      toast.success('Digital Card updated successfully');
      navigate('/worker/profile');
    } catch (error) {
      console.error('Update failed:', error);
      toast.error(error.response?.data?.message || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-4 border-[#3B82F6] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm text-gray-500 font-medium">Loading...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <Header title="Digital ID Card" />

      <main className="max-w-md mx-auto px-4 py-6 space-y-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col items-center">
          <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
            <FiCreditCard className="w-8 h-8 text-[#3B82F6]" />
          </div>
          <h2 className="text-lg font-black text-gray-800 tracking-tight text-center mb-1">
            Upload Digital Card
          </h2>
          <p className="text-sm text-gray-500 text-center mb-6">
            Please upload a clear photo of your digital ID card or Aadhar card. This will be visible on your profile.
          </p>

          <div className="w-full">
            <div
              className="relative w-full aspect-[1.58] bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl overflow-hidden flex flex-col items-center justify-center cursor-pointer transition-colors hover:bg-gray-100"
              onClick={() => flutterBridge.isFlutter ? handleNativeCamera() : document.getElementById('digital-card-upload').click()}
            >
              {photoPreview || digitalIdUrl ? (
                <img src={photoPreview || digitalIdUrl} className="w-full h-full object-cover" alt="Digital Card" />
              ) : (
                <div className="flex flex-col items-center gap-2 text-gray-400">
                  <FiCamera className="w-8 h-8" />
                  <span className="text-sm font-bold">Tap to take photo</span>
                </div>
              )}
            </div>
            {!flutterBridge.isFlutter && (
              <input
                type="file"
                id="digital-card-upload"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoChange}
              />
            )}
          </div>
        </div>

        <div className="pt-2 flex flex-col gap-3">
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="w-full py-4 bg-gradient-to-r from-[#60A5FA] to-[#3B82F6] text-white rounded-2xl font-black text-base shadow-[0_8px_20px_rgba(59,130,246,0.3)] active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Saving...
              </>
            ) : (
              <>
                <FiSave className="w-5 h-5" />
                Save Digital Card
              </>
            )}
          </button>

          <button
            onClick={() => navigate('/worker/profile')}
            className="w-full py-3.5 bg-white text-gray-500 border border-gray-200 rounded-2xl font-bold text-sm uppercase tracking-wider active:scale-95 transition-all"
          >
            Cancel
          </button>
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default DigitalId;
