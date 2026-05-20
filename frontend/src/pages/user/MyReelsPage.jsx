import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, X, Loader2, ArrowLeft, Video, Link, MapPin, Phone, Pencil, Trash2, Heart, Eye, MessageCircle } from 'lucide-react';
import { reelService } from '../../services/reelService';
import toast from 'react-hot-toast';

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

export default function MyReelsPage() {
  const navigate = useNavigate();
  const [reels, setReels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [previewReel, setPreviewReel] = useState(null);

  // Stats
  const [totalViews, setTotalViews] = useState(0);
  const [totalLikes, setTotalLikes] = useState(0);

  // Multi-step Upload Wizard State
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadStep, setUploadStep] = useState(1); // Steps 1 to 4
  const [uploading, setUploading] = useState(false);
  const [editingReel, setEditingReel] = useState(null);

  // Form Fields
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedBudget, setSelectedBudget] = useState('');
  const [videoType, setVideoType] = useState('file'); // 'file' or 'url'
  const [videoUrl, setVideoUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedFileName, setSelectedFileName] = useState('');
  const [title, setTitle] = useState('');
  const [address, setAddress] = useState('');
  const [status, setStatus] = useState('Ready to move');
  const [propertyType, setPropertyType] = useState('Apartment');
  const [contactNumber, setContactNumber] = useState('');
  const [caption, setCaption] = useState('');
  const [bhkSelections, setBhkSelections] = useState({}); // { "2 BHK": "₹3.2 Cr" }

  const fileInputRef = useRef(null);

  const fetchMyReels = async () => {
    try {
      setLoading(true);
      const res = await reelService.getFeed({ creatorOnly: 'true', limit: 100 });
      if (res.success && res.reels) {
        setReels(res.reels);
        
        // Compute stats
        const views = res.reels.reduce((acc, curr) => acc + (curr.viewsCount || 0), 0);
        const likes = res.reels.reduce((acc, curr) => acc + (curr.likesCount || 0), 0);
        setTotalViews(views);
        setTotalLikes(likes);
      }
    } catch (error) {
      console.error('Error fetching my reels:', error);
      toast.error('Failed to load your reels');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyReels();
  }, []);

  const handleDeleteReel = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this reel?')) return;
    try {
      await reelService.deleteReel(id);
      toast.success('Reel deleted successfully');
      setReels(prev => prev.filter(r => r._id !== id));
      fetchMyReels(); // Refresh stats
    } catch (error) {
      console.error('Failed to delete reel:', error);
      toast.error('Failed to delete reel');
    }
  };

  const handleEditClick = (reel, e) => {
    e.stopPropagation();
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
    setUploadOpen(true);
    setUploadStep(1);
  };

  const handleOpenCreateModal = () => {
    setEditingReel(null);
    setSelectedCity('');
    setSelectedBudget('');
    setVideoType('file');
    setVideoUrl('');
    setSelectedFile(null);
    setSelectedFileName('');
    setTitle('');
    setAddress('');
    setStatus('Ready to move');
    setPropertyType('Apartment');
    setContactNumber('');
    setCaption('');
    setBhkSelections({});
    setUploadOpen(true);
    setUploadStep(1);
  };

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
    setBhkSelections((prev) => ({
      ...prev,
      [bhk]: val
    }));
  };

  const handleUploadSubmit = async (e) => {
    if (e) e.preventDefault();

    if (!editingReel && videoType === 'file' && !selectedFile) {
      toast.error('Please select a video file');
      return;
    }

    try {
      setUploading(true);

      const configurations = Object.entries(bhkSelections)
        .filter(([_, price]) => price.trim() !== '')
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

      setUploadOpen(false);
      fetchMyReels();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to submit reel');
    } finally {
      setUploading(false);
    }
  };

  const getVideoThumbnail = (reel) => {
    if (!reel.videoUrl) return '';
    const url = reel.videoUrl;
    const ytMatch = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=|shorts\/)|youtu\.be\/)([^"&?\/\s]{11})/i);
    if (ytMatch) {
      return `https://img.youtube.com/vi/${ytMatch[1]}/0.jpg`;
    }
    return reel.thumbnailUrl || '';
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-white flex flex-col">
      {/* Top Navigation */}
      <header className="border-b border-white/10 px-4 py-4 flex items-center justify-between sticky top-0 bg-neutral-950/80 backdrop-blur-md z-30">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              if (window.history.length > 1) {
                navigate(-1);
              } else {
                navigate('/reels');
              }
            }}
            className="p-2 rounded-full bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-sm font-black tracking-wider uppercase text-white">GRH-shorts Dashboard</h1>
            <p className="text-[10px] text-white/55 font-bold uppercase tracking-wider">Manage Your Shorts</p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleOpenCreateModal}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-blue-500/20"
        >
          <Plus size={14} />
          <span>Add Reel</span>
        </button>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-6">
        {/* Profile Statistics Header */}
        <section className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-neutral-900 border border-white/5 p-4 rounded-2xl text-center">
            <span className="text-[10px] font-black text-white/45 uppercase tracking-wider">Total Reels</span>
            <h4 className="text-2xl font-black mt-1 text-white">{reels.length}</h4>
          </div>
          <div className="bg-neutral-900 border border-white/5 p-4 rounded-2xl text-center">
            <span className="text-[10px] font-black text-white/45 uppercase tracking-wider">Total Views</span>
            <h4 className="text-2xl font-black mt-1 text-blue-500">
              {totalViews >= 1000 ? `${(totalViews / 1000).toFixed(1)}k+` : totalViews}
            </h4>
          </div>
          <div className="bg-neutral-900 border border-white/5 p-4 rounded-2xl text-center">
            <span className="text-[10px] font-black text-white/45 uppercase tracking-wider">Total Likes</span>
            <h4 className="text-2xl font-black mt-1 text-rose-500">
              {totalLikes >= 1000 ? `${(totalLikes / 1000).toFixed(1)}k+` : totalLikes}
            </h4>
          </div>
        </section>

        {/* Loading Indicator */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            <span className="text-[10px] font-black uppercase tracking-widest text-white/45 mt-4">Loading your catalog...</span>
          </div>
        ) : reels.length === 0 ? (
          <div className="text-center py-20 bg-neutral-900 border border-white/5 rounded-3xl p-6">
            <Video className="w-12 h-12 text-white/20 mx-auto mb-4" />
            <h3 className="font-extrabold text-sm uppercase tracking-wider text-white">No Reels Published Yet</h3>
            <p className="text-xs text-white/50 mt-1.5 max-w-[280px] mx-auto">Create and publish promotional video reels to reach out to potential home buyers!</p>
            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="mt-6 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 font-bold text-xs uppercase tracking-widest rounded-xl transition-all shadow-lg"
            >
              Publish First Reel
            </button>
          </div>
        ) : (
          /* Grid of Reels */
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {reels.map((reel) => {
              const hasThumb = getVideoThumbnail(reel);
              const isInsta = reel.videoUrl && reel.videoUrl.includes('instagram.com');
              
              return (
                <div
                  key={reel._id}
                  onClick={() => setPreviewReel(reel)}
                  className="group aspect-[9/16] bg-neutral-900 border border-white/10 rounded-2xl overflow-hidden relative cursor-pointer hover:border-white/25 transition-all shadow-md"
                >
                  {/* Thumbnail Image or Fallback */}
                  {hasThumb ? (
                    <img
                      src={hasThumb}
                      alt={reel.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-neutral-900 to-neutral-950 p-4 text-center">
                      <Video className="w-10 h-10 text-white/20 mb-2" />
                      <span className="text-[9px] font-black text-white/45 uppercase tracking-widest truncate w-full">
                        {isInsta ? 'Instagram Reel' : 'Direct Upload'}
                      </span>
                    </div>
                  )}

                  {/* Gradient bottom overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent opacity-90" />

                  {/* Top Stats display (Views, Likes) */}
                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white/90">
                    <div className="flex items-center gap-1">
                      <Eye size={12} className="text-white/60" />
                      <span className="text-[10px] font-bold">{reel.viewsCount || 0}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Heart size={12} className="text-rose-500 fill-rose-500" />
                      <span className="text-[10px] font-bold">{reel.likesCount || 0}</span>
                    </div>
                  </div>

                  {/* Top Header Title */}
                  <div className="absolute top-3 left-3 right-12">
                    <h5 className="text-[11px] font-black uppercase tracking-wider text-white drop-shadow truncate">
                      {reel.title || 'Untitled Property'}
                    </h5>
                    <p className="text-[9px] text-white/70 truncate">{reel.city}</p>
                  </div>

                  {/* Floating Action Controls Overlay (Visible always/hover) */}
                  <div className="absolute top-3 right-3 flex flex-col gap-2 z-10 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={(e) => handleEditClick(reel, e)}
                      className="p-2 rounded-xl bg-blue-600/90 text-white hover:bg-blue-600 transition-all border border-blue-500/20 shadow-md"
                      title="Edit Reel"
                    >
                      <Pencil size={12} />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleDeleteReel(reel._id, e)}
                      className="p-2 rounded-xl bg-red-600/90 text-white hover:bg-red-600 transition-all border border-red-500/20 shadow-md"
                      title="Delete Reel"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Play Reel Preview Modal */}
      {previewReel && (
        <div 
          onClick={() => setPreviewReel(null)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer animate-fade-in"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-neutral-950 w-full max-w-sm aspect-[9/16] rounded-2xl overflow-hidden relative shadow-2xl flex flex-col justify-between border border-neutral-800"
          >
            <button
              onClick={() => setPreviewReel(null)}
              className="absolute top-4 right-4 z-50 p-2 rounded-full bg-black/40 hover:bg-black/60 text-white transition-colors"
            >
              <X size={16} />
            </button>
            
            {previewReel.videoType === 'file' ? (
              <video 
                src={previewReel.videoUrl} 
                className="w-full h-full object-cover" 
                controls 
                autoPlay 
                loop
              />
            ) : (() => {
              const url = previewReel.videoUrl || '';
              const ytMatch = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=|shorts\/)|youtu\.be\/)([^"&?\/\s]{11})/i);
              const instaMatch = url.match(/(?:instagram\.com\/(?:p|reel|reels|tv)\/)([^/?#&\s]+)/i);

              if (ytMatch) {
                return (
                  <iframe
                    src={`https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&mute=1&loop=1&playlist=${ytMatch[1]}`}
                    className="w-full h-full object-cover"
                    style={{ border: 0 }}
                    title="Reel Preview"
                    allow="autoplay; encrypted-media"
                  />
                );
              } else if (instaMatch) {
                return (
                  <iframe
                    src={`https://www.instagram.com/reel/${instaMatch[1]}/embed/`}
                    className="w-full h-full object-cover bg-neutral-900"
                    style={{ border: 0 }}
                    title="Reel Preview"
                    allow="autoplay; encrypted-media; picture-in-picture"
                    allowFullScreen
                    sandbox="allow-scripts allow-same-origin allow-presentation allow-popups allow-popups-to-escape-sandbox"
                  />
                );
              } else {
                return (
                  <video
                    src={previewReel.videoUrl}
                    className="w-full h-full object-cover"
                    controls
                    autoPlay
                    loop
                  />
                );
              }
            })()}
          </div>
        </div>
      )}

      {/* Multi-step Upload Modal Wizard */}
      {uploadOpen && (
        <div className="fixed inset-0 z-[110] bg-black/90 flex items-end justify-center overscroll-none animate-fade-in">
          <div className="bg-neutral-950 border border-white/10 w-full rounded-t-3xl md:max-w-md p-6 pb-20 safe-area-bottom shadow-2xl overflow-y-auto max-h-[90%] no-scrollbar">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
              <div>
                <span className="font-black text-[9px] uppercase tracking-widest text-blue-500">Step {uploadStep} of 4</span>
                <h3 className="font-extrabold text-sm uppercase tracking-wider text-white">
                  {uploadStep === 1 && "Select Bangalore City Area"}
                  {uploadStep === 2 && "Select Target Budget"}
                  {uploadStep === 3 && "Add Video Reel Source"}
                  {uploadStep === 4 && "Add Property Specifications"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setUploadOpen(false)}
                className="p-1 rounded-full bg-white/5 border border-white/10 text-white"
              >
                <X size={16} />
              </button>
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

            {/* STEP 4: Property Details Form */}
            {uploadStep === 4 && (
              <form onSubmit={handleUploadSubmit} className="space-y-4 text-white">
                {/* Property Title */}
                <div>
                  <label className="block text-[9px] font-black text-white/60 uppercase tracking-wider mb-1.5">Property Title</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Ambience Creacions"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-blue-500 font-semibold"
                    required
                  />
                </div>

                {/* Address */}
                <div>
                  <label className="block text-[9px] font-black text-white/60 uppercase tracking-wider mb-1.5">Address / Locality</label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="e.g. Sector 22, Gurgaon"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-blue-500 font-semibold"
                    required
                  />
                </div>

                {/* Grid of Status & Property Type */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[9px] font-black text-white/60 uppercase tracking-wider mb-1.5">Status</label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 text-white rounded-xl py-2 px-3 text-xs focus:outline-none focus:border-blue-500"
                    >
                      <option value="Ready to move" className="bg-neutral-950 text-white">Ready to move</option>
                      <option value="Under construction" className="bg-neutral-950 text-white">Under construction</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[9px] font-black text-white/60 uppercase tracking-wider mb-1.5">Property Type</label>
                    <select
                      value={propertyType}
                      onChange={(e) => setPropertyType(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 text-white rounded-xl py-2 px-3 text-xs focus:outline-none focus:border-blue-500"
                    >
                      {PROPERTY_TYPES.map((t) => (
                        <option key={t} value={t} className="bg-neutral-950 text-white">{t}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* BHK Configuration with dynamic inputs */}
                <div>
                  <label className="block text-[9px] font-black text-white/60 uppercase tracking-wider mb-2">BHK configuration & manual price (Onwards)</label>
                  <div className="space-y-2 border border-white/5 bg-white/5 rounded-2xl p-3">
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
                              type="text"
                              value={bhkSelections[bhk] || ''}
                              onChange={(e) => handleBhkPriceChange(bhk, e.target.value)}
                              placeholder="e.g. ₹5.4 Cr"
                              className="flex-1 bg-black/45 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-blue-500 font-semibold"
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Contact details */}
                <div>
                  <label className="block text-[9px] font-black text-white/60 uppercase tracking-wider mb-1.5">Contact Number</label>
                  <input
                    type="tel"
                    value={contactNumber}
                    onChange={(e) => setContactNumber(e.target.value)}
                    placeholder="e.g. 9999999999"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-blue-500 font-semibold"
                    required
                  />
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
      )}

      {/* Hidden native input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="video/mp4,video/webm"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}
