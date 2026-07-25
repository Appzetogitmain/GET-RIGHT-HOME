import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Loader2, ArrowLeft, Video, Link, MapPin, Phone, User } from 'lucide-react';
import toast from 'react-hot-toast';
import { reelService } from '../../services/reelService';
import { useAuth } from '../../context/AuthContext';
import { useLocation } from 'react-router-dom';
const BENGALURU_AREAS = [
  "Bengaluru North",
  "Bengaluru South",
  "Bengaluru East",
  "Anekal",
  "Yelahanka",
  "Devanahalli",
  "Doddaballapura",
  "Hosakote",
  "Nelamangala"
];

const BUDGET_RANGES = [
  "Less than 1.5 Cr",
  "1.5 Cr to 2.5 Cr",
  "2.5 Cr to 3.5 Cr",
  "More than 3.5 Cr"
];

const PROPERTY_TYPES = [
  "PG",
  "Hotel",
  "Rent",
  "Sell",
  "Apartment",
  "Independent House / Villa",
  "Builder Floor",
  "Plot / Land",
  "Commercial Office",
  "Retail Space"
];

const BHK_OPTIONS = ["1 BHK", "2 BHK", "3 BHK", "4 BHK", "5 BHK"];



export default function ReelUploadPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isLoggedIn } = useAuth();
  
  const [uploadStep, setUploadStep] = useState(1);
  const [uploading, setUploading] = useState(false);
  const [editingReel, setEditingReel] = useState(null);

  const [selectedCity, setSelectedCity] = useState('');
  const [selectedBudget, setSelectedBudget] = useState('');
  const [videoType, setVideoType] = useState('file');
  const [videoUrl, setVideoUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedFileName, setSelectedFileName] = useState('');
  const [title, setTitle] = useState('');
  const [address, setAddress] = useState('');
  const [status, setStatus] = useState('Ready to move');
  const [propertyType, setPropertyType] = useState('Apartment');
  const [contactNumber, setContactNumber] = useState('');
  const [caption, setCaption] = useState('');
  const [bhkSelections, setBhkSelections] = useState({});
  const [errors, setErrors] = useState({});

  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!isLoggedIn) {
      toast.error('Please login to upload reels');
      navigate('/login');
      return;
    }
    
    if (location.state?.reel) {
      const reel = location.state.reel;
      setEditingReel(reel);
      setSelectedCity(reel.city || '');
      setSelectedBudget(reel.budgetRange || '');
      setVideoType(reel.videoType || 'url');
      setVideoUrl(reel.videoUrl || '');
      setSelectedFile(null);
      setSelectedFileName('');
      setTitle(reel.title || '');
      setAddress(reel.address || '');
      setStatus(reel.status || 'Ready to move');
      setPropertyType(reel.propertyType || 'Apartment');
      setContactNumber(reel.contactNumber || '');
      setCaption(reel.caption || '');

      const bhks = {};
      if (reel.configurations && Array.isArray(reel.configurations)) {
        reel.configurations.forEach(config => {
          bhks[config.bhk] = config.price;
        });
      }
      setBhkSelections(bhks);
      setUploadStep(1);
    }
  }, [isLoggedIn, navigate, location]);

  const validateForm = () => {
    const newErrors = {};
    if (!title.trim()) newErrors.title = 'Property Title is required';
    if (!address.trim()) newErrors.address = 'Address is required';
    if (!status) newErrors.status = 'Status is required';
    if (!propertyType) newErrors.propertyType = 'Property Type is required';
    if (!contactNumber || contactNumber.length !== 10) {
      newErrors.contactNumber = 'Valid 10-digit Contact Number is required';
    }
    const configurations = Object.entries(bhkSelections).filter(([_, value]) => value && value.trim());
    if (configurations.length === 0) {
      newErrors.bhk = 'Please select at least one BHK and enter its price';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

const handleUploadSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!editingReel && videoType === 'file' && !selectedFile) {
      toast.error('Please select a video file');
      return;
    }
    if (videoType === 'url' && !videoUrl) {
      toast.error('Please provide a video URL link');
      return;
    }
    
    if (!validateForm()) {
      toast.error('Please fill all required fields correctly');
      return;
    }

    setUploading(true);

    try {
      // Assemble BHK configurations
      const configurations = Object.entries(bhkSelections)
        .filter(([_, value]) => value && value.trim())
        .map(([bhk, price]) => ({ bhk, price }));

      let res;
      if (editingReel) {
        if (videoType === 'file') {
          const formData = new FormData();
          if (selectedFile) {
            formData.append('video', selectedFile);
          }
          formData.append('videoType', 'file');
          formData.append('title', title);
          formData.append('address', address);
          formData.append('city', selectedCity);
          formData.append('budgetRange', selectedBudget);
          formData.append('status', status);
          formData.append('propertyType', propertyType);
          formData.append('contactNumber', contactNumber);
          formData.append('caption', caption);
          formData.append('configurations', JSON.stringify(configurations));
          formData.append('category', 'General');

          res = await reelService.updateReel(editingReel._id, formData, true);
        } else {
          const payload = {
            videoType: 'url',
            videoUrl,
            title,
            address,
            city: selectedCity,
            budgetRange: selectedBudget,
            status,
            propertyType,
            contactNumber,
            caption,
            configurations,
            category: 'General'
          };
          res = await reelService.updateReel(editingReel._id, payload, false);
        }
        toast.success('Reel updated successfully!');
      } else {
        if (videoType === 'file') {
          const formData = new FormData();
          formData.append('video', selectedFile);
          formData.append('videoType', 'file');
          formData.append('title', title);
          formData.append('address', address);
          formData.append('city', selectedCity);
          formData.append('budgetRange', selectedBudget);
          formData.append('status', status);
          formData.append('propertyType', propertyType);
          formData.append('contactNumber', contactNumber);
          formData.append('caption', caption);
          formData.append('configurations', JSON.stringify(configurations));
          formData.append('category', 'General');

          res = await reelService.uploadReel(formData, true);
        } else {
          const payload = {
            videoType: 'url',
            videoUrl,
            title,
            address,
            city: selectedCity,
            budgetRange: selectedBudget,
            status,
            propertyType,
            contactNumber,
            caption,
            configurations,
            category: 'General'
          };
          res = await reelService.uploadReel(payload, false);
        }
        toast.success('Reel created successfully!');
      }

      navigate('/reels/my');
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to submit reel');
    } finally {
      setUploading(false);
    }
  };

  const resetWizard = () => { navigate(-1); };

const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 30 * 1024 * 1024) {
        toast.error('Video must be under 30MB');
        return;
      }
      setSelectedFile(file);
      setSelectedFileName(file.name);
    }
  };

  const handleBhkCheck = (bhk) => {
    setBhkSelections((prev) => {
      const copy = { ...prev };
      if (copy[bhk] !== undefined) {
        delete copy[bhk];
      } else {
        copy[bhk] = '';
      }
      return copy;
    });
  };

  const handleBhkPriceChange = (bhk, val) => {
    // Only allow positive numbers
    const numStr = val.replace(/[^0-9]/g, '');
    setBhkSelections((prev) => ({
      ...prev,
      [bhk]: numStr
    }));
  };

  const handleContactNumberChange = (e) => {
    let val = e.target.value;
    if (val.startsWith('+91 ')) {
      val = val.substring(4);
    } else if (val.startsWith('+91')) {
      val = val.substring(3);
    }
    val = val.replace(/\D/g, '');
    if (val.length > 0 && !/^[6-9]/.test(val)) return;
    if (val.length > 10) val = val.substring(0, 10);
    setContactNumber(val);
  };

  return (
    <div className="min-h-screen bg-black pb-20 pt-safe text-white selection:bg-blue-500/30">
      <div className="fixed top-0 left-0 right-0 z-50 flex items-center p-4 bg-black/80 backdrop-blur-md border-b border-white/10 md:max-w-md md:mx-auto">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all mr-3"
          aria-label="Go back"
        >
          <ArrowLeft size={18} />
        </button>
        <span className="font-bold text-sm uppercase tracking-widest text-white">
          {editingReel ? 'Edit Reel' : 'Upload Reel'}
        </span>
      </div>

      <div className="pt-20 px-4 md:max-w-md md:mx-auto">
        <div className="mb-6">
          <span className="font-black text-[9px] uppercase tracking-widest text-blue-500">Step {uploadStep} of 4</span>
          <h3 className="font-extrabold text-sm uppercase tracking-wider text-white">
            {uploadStep === 1 && "Select Bangalore City Area"}
            {uploadStep === 2 && "Select Target Budget"}
            {uploadStep === 3 && "Add Video Reel Source"}
            {uploadStep === 4 && "Add Property Specifications"}
          </h3>
        </div>
            {/* STEP 1: Bangalore City Selector */}
            {uploadStep === 1 && (
              <div className="space-y-3">
                <span className="text-[10px] text-white/55 uppercase tracking-wide block mb-2">Select the area closest to the property:</span>
                <div className="grid grid-cols-2 gap-2 max-h-[220px] overflow-y-auto pr-1 no-scrollbar">
                  {BENGALURU_AREAS.map((area) => (
                    <button
                      key={area}
                      type="button"
                      onClick={() => setSelectedCity(area)}
                      className={`py-3 px-3.5 rounded-xl border text-left text-xs font-bold transition-all flex items-center justify-between ${
                        selectedCity === area
                          ? 'bg-blue-600 border-blue-500 text-white shadow-lg'
                          : 'bg-white/5 border-white/10 text-white/80 hover:bg-white/10'
                      }`}
                    >
                      <span>{area}</span>
                      <MapPin size={11} className={selectedCity === area ? 'text-white' : 'text-neutral-500'} />
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  disabled={!selectedCity}
                  onClick={() => setUploadStep(2)}
                  className="w-full mt-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-widest disabled:opacity-50 transition-all shadow-lg"
                >
                  Continue to Budget
                </button>
              </div>
            )}

            {/* STEP 2: Budget Selector */}
            {uploadStep === 2 && (
              <div className="space-y-3">
                <span className="text-[10px] text-white/55 uppercase tracking-wide block mb-2">Select the budget category:</span>
                <div className="flex flex-col gap-2">
                  {BUDGET_RANGES.map((budget) => (
                    <button
                      key={budget}
                      type="button"
                      onClick={() => setSelectedBudget(budget)}
                      className={`py-3.5 px-4 rounded-xl border text-left text-xs font-bold transition-all flex items-center justify-between ${
                        selectedBudget === budget
                          ? 'bg-blue-600 border-blue-500 text-white shadow-lg'
                          : 'bg-white/5 border-white/10 text-white/80 hover:bg-white/10'
                      }`}
                    >
                      <span>{budget}</span>
                      <span className={`w-2.5 h-2.5 rounded-full ${selectedBudget === budget ? 'bg-white border border-white' : 'border border-neutral-600'}`} />
                    </button>
                  ))}
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setUploadStep(1)}
                    className="flex-1 py-2.5 rounded-xl border border-white/10 text-white font-bold text-xs uppercase tracking-widest"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    disabled={!selectedBudget}
                    onClick={() => setUploadStep(3)}
                    className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-widest disabled:opacity-50 transition-all shadow-lg"
                  >
                    Next Step
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: Video File Upload OR URL Paste */}
            {uploadStep === 3 && (
              <div className="space-y-4 text-white">
                <div className="flex border border-white/10 rounded-xl overflow-hidden p-1 bg-white/5">
                  <button
                    type="button"
                    onClick={() => setVideoType('file')}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                      videoType === 'file' ? 'bg-blue-600 text-white' : 'text-white/60 hover:text-white'
                    }`}
                  >
                    <Video size={13} />
                    <span>Upload Video File</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setVideoType('url')}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                      videoType === 'url' ? 'bg-blue-600 text-white' : 'text-white/60 hover:text-white'
                    }`}
                  >
                    <Link size={13} />
                    <span>Paste Link URL</span>
                  </button>
                </div>

                {videoType === 'file' ? (
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="border border-dashed border-white/15 rounded-2xl p-8 flex flex-col items-center justify-center bg-white/5 cursor-pointer hover:bg-white/10 transition-all"
                  >
                    <Video className="w-8 h-8 text-neutral-400 mb-2 animate-pulse" />
                    <span className="text-xs font-bold text-white">
                      {selectedFileName ? 'Change Selected Video' : 'Select MP4/WebM Video'}
                    </span>
                    <span className="text-[9px] text-white/55 mt-1">Maximum size 30MB, duration max 30s.</span>
                    {selectedFileName && (
                      <span className="mt-3 text-[10px] text-emerald-400 bg-emerald-950/40 border border-emerald-900/30 rounded-lg px-3 py-1 font-mono truncate max-w-[200px]">
                        {selectedFileName}
                      </span>
                    )}
                  </div>
                ) : (
                  <div>
                    <label className="block text-[9px] font-black text-white/60 uppercase tracking-wider mb-2">Video/Short URL (Instagram Reel or YouTube Short Link)</label>
                    <input
                      type="text"
                      value={videoUrl}
                      onChange={(e) => setVideoUrl(e.target.value)}
                      placeholder="e.g. https://www.instagram.com/reel/Code/"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500 font-medium"
                    />
                    <span className="text-[9px] text-neutral-550 mt-1.5 block">Paste complete URL of YouTube Shorts or Instagram Reels.</span>
                  </div>
                )}

                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setUploadStep(2)}
                    className="flex-1 py-2.5 rounded-xl border border-white/10 text-white font-bold text-xs uppercase tracking-widest"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    disabled={videoType === 'file' ? (!editingReel && !selectedFile) : !videoUrl}
                    onClick={() => setUploadStep(4)}
                    className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-widest disabled:opacity-50 transition-all shadow-lg"
                  >
                    Details Step
                  </button>
                </div>
              </div>
            )}

            {/* STEP 4: Submit Details */}
            {uploadStep === 4 && (
              <form onSubmit={handleUploadSubmit} className="space-y-4 text-white" noValidate>
                {/* Property Title */}
                <div>
                  <label className="block text-[9px] font-black text-white/60 uppercase tracking-wider mb-1.5">Property Title <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => { setTitle(e.target.value); if(errors.title) setErrors({...errors, title: ''}); }}
                    placeholder="e.g. Ambience Creacions"
                    className={`w-full bg-white/5 border ${errors.title ? 'border-red-500' : 'border-white/10'} rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-blue-500 font-semibold`}
                    required
                  />
                  {errors.title && <p className="text-red-500 text-[10px] mt-1 font-medium">{errors.title}</p>}
                </div>

                {/* Address */}
                <div>
                  <label className="block text-[9px] font-black text-white/60 uppercase tracking-wider mb-1.5">Address / Locality <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => { setAddress(e.target.value); if(errors.address) setErrors({...errors, address: ''}); }}
                    placeholder="e.g. Sector 22, Gurgaon"
                    className={`w-full bg-white/5 border ${errors.address ? 'border-red-500' : 'border-white/10'} rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-blue-500 font-semibold`}
                    required
                  />
                  {errors.address && <p className="text-red-500 text-[10px] mt-1 font-medium">{errors.address}</p>}
                </div>

                {/* Grid of Status & Property Type */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[9px] font-black text-white/60 uppercase tracking-wider mb-1.5">Status <span className="text-red-500">*</span></label>
                    <select
                      value={status}
                      onChange={(e) => { setStatus(e.target.value); if(errors.status) setErrors({...errors, status: ''}); }}
                      className={`w-full bg-white/5 border ${errors.status ? 'border-red-500' : 'border-white/10'} text-white rounded-xl py-2 px-3 text-xs focus:outline-none focus:border-blue-500`}
                      required
                    >
                      <option value="Ready to move" className="bg-neutral-950 text-white">Ready to move</option>
                      <option value="Under construction" className="bg-neutral-950 text-white">Under construction</option>
                    </select>
                    {errors.status && <p className="text-red-500 text-[10px] mt-1 font-medium">{errors.status}</p>}
                  </div>
                  <div>
                    <label className="block text-[9px] font-black text-white/60 uppercase tracking-wider mb-1.5">Property Type <span className="text-red-500">*</span></label>
                    <select
                      value={propertyType}
                      onChange={(e) => { setPropertyType(e.target.value); if(errors.propertyType) setErrors({...errors, propertyType: ''}); }}
                      className={`w-full bg-white/5 border ${errors.propertyType ? 'border-red-500' : 'border-white/10'} text-white rounded-xl py-2 px-3 text-xs focus:outline-none focus:border-blue-500`}
                      required
                    >
                      {PROPERTY_TYPES.map((t) => (
                        <option key={t} value={t} className="bg-neutral-950 text-white">{t}</option>
                      ))}
                    </select>
                    {errors.propertyType && <p className="text-red-500 text-[10px] mt-1 font-medium">{errors.propertyType}</p>}
                  </div>
                </div>

                {/* BHK Configuration with dynamic inputs */}
                <div>
                  <label className="block text-[9px] font-black text-white/60 uppercase tracking-wider mb-2">BHK configuration & manual price (Onwards) <span className="text-red-500">*</span></label>
                  <div className={`space-y-2 border ${errors.bhk ? 'border-red-500/50' : 'border-white/5'} bg-white/5 rounded-2xl p-3`}>
                    {BHK_OPTIONS.map((bhk) => {
                      const isChecked = bhkSelections[bhk] !== undefined;
                      return (
                        <div key={bhk} className="flex items-center gap-3">
                          <label className="flex items-center gap-2 text-xs font-bold min-w-[70px] cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleBhkCheck(bhk)}
                              className="rounded border-white/20 bg-neutral-900 text-blue-600 focus:ring-0 focus:ring-offset-0 w-3.5 h-3.5"
                            />
                            <span>{bhk}</span>
                          </label>
                          {isChecked && (
                            <input
                              type="number"
                              min="0"
                              value={bhkSelections[bhk] || ''}
                              onChange={(e) => { handleBhkPriceChange(bhk, e.target.value); if(errors.bhk) setErrors({...errors, bhk: ''}); }}
                              onKeyDown={(e) => {
                                if (['e', 'E', '+', '-', '.'].includes(e.key)) {
                                  e.preventDefault();
                                }
                              }}
                              placeholder="e.g. 5000000"
                              className="flex-1 bg-black/45 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-blue-500 font-semibold"
                              required
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {errors.bhk && <p className="text-red-500 text-[10px] mt-1 font-medium">{errors.bhk}</p>}
                </div>

                {/* Contact details */}
                <div>
                  <label className="block text-[9px] font-black text-white/60 uppercase tracking-wider mb-1.5">Contact Number <span className="text-red-500">*</span></label>
                  <input
                    type="tel"
                    value={contactNumber ? '+91 ' + contactNumber : '+91 '}
                    onChange={(e) => { handleContactNumberChange(e); if(errors.contactNumber) setErrors({...errors, contactNumber: ''}); }}
                    placeholder="+91 9999999999"
                    className={`w-full bg-white/5 border ${errors.contactNumber ? 'border-red-500' : 'border-white/10'} rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-blue-500 font-semibold`}
                    required
                  />
                  {errors.contactNumber && <p className="text-red-500 text-[10px] mt-1 font-medium">{errors.contactNumber}</p>}
                </div>

                {/* Optional Caption */}
                <div>
                  <label className="block text-[9px] font-black text-white/60 uppercase tracking-wider mb-1.5">Description/Caption (Optional)</label>
                  <textarea
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="Write details about the property..."
                    rows={2}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-blue-500 resize-none font-medium"
                  />
                </div>

                {/* Submit / Back Actions */}
                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setUploadStep(3)}
                    className="flex-1 py-2.5 rounded-xl border border-white/10 text-white font-bold text-xs uppercase tracking-widest"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={uploading}
                    className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-widest disabled:opacity-50 transition-all shadow-lg flex items-center justify-center gap-1.5"
                  >
                    {uploading ? (
                      <>
                        <Loader2 size={13} className="animate-spin" />
                        <span>Submitting...</span>
                      </>
                    ) : (
                      <span>{editingReel ? 'Update Reel' : 'Publish Reel'}</span>
                    )}
                  </button>
                </div>
              </form>
            )}


      </div>
    </div>
  );
}
