import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, X, Loader2, ArrowLeft, Search, SlidersHorizontal, Video, Link, MapPin, Phone, User } from 'lucide-react';
import ReelCard from '../../components/reels/ReelCard';
import ReelCommentsSheet from '../../components/reels/ReelCommentsSheet';
import { reelService } from '../../services/reelService';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

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

export default function ReelsPage() {
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();
  const [reels, setReels] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [initialScrollDone, setInitialScrollDone] = useState(false);
  const [commentReel, setCommentReel] = useState(null);

  // Search & Filter State
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterCity, setFilterCity] = useState('All');
  const [filterBudget, setFilterBudget] = useState('All');
  const [filterType, setFilterType] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');

  // Multi-step Upload Wizard State
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadStep, setUploadStep] = useState(1); // Steps 1 to 4
  const [uploading, setUploading] = useState(false);

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
  const [bhkSelections, setBhkSelections] = useState({}); // { "2 BHK": "₹3.2 Cr", "3 BHK": "₹5.4 Cr" }

  const [filterOnlyMine, setFilterOnlyMine] = useState(false);
  const [editingReel, setEditingReel] = useState(null);
  const [isMuted, setIsMuted] = useState(false);

  const fileInputRef = useRef(null);
  const containerRef = useRef(null);
  const viewReportedRef = useRef(new Set());
  const loadingMoreRef = useRef(false);

  const handleEditClick = useCallback((reel) => {
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
    setUploadStep(4);
    setUploadOpen(true);
  }, []);

  // Load Feed with active filters & search query
  const loadFeed = useCallback(async (cursor = null, isFresh = false) => {
    if (cursor && !isFresh) {
      loadingMoreRef.current = true;
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    try {
      const params = {
        limit: 20,
        city: filterCity,
        budgetRange: filterBudget,
        propertyType: filterType,
        status: filterStatus,
        search: searchQuery,
        creatorOnly: filterOnlyMine ? 'true' : 'false'
      };
      if (cursor && !isFresh) {
        params.cursor = cursor;
      }
      const res = await reelService.getFeed(params);
      const list = res.reels || [];

      if (cursor && !isFresh) {
        setReels((prev) => [...prev, ...list]);
      } else {
        setReels(list);
      }
      setNextCursor(res.nextCursor || null);
    } catch (err) {
      console.error('Feed load error', err);
      toast.error('Failed to load reels');
    } finally {
      setLoading(false);
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [filterCity, filterBudget, filterType, filterStatus, searchQuery, filterOnlyMine]);

  useEffect(() => {
    loadFeed(null, true);
  }, [filterCity, filterBudget, filterType, filterStatus, filterOnlyMine]);

  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    loadFeed(null, true);
  };

  const handleViewed = useCallback((reelId) => {
    if (viewReportedRef.current.has(reelId)) return;
    viewReportedRef.current.add(reelId);
    reelService.recordView(reelId, 3).catch(() => { });
  }, []);

  const likeLockRef = useRef({});

  const handleLikeToggle = useCallback(async (reelId) => {
    if (!isLoggedIn) {
      toast.error('Please login to like reels');
      navigate('/login');
      return;
    }
    if (likeLockRef.current[reelId]) return;
    likeLockRef.current[reelId] = true;

    setReels((prev) =>
      prev.map((r) => {
        if (r._id !== reelId) return r;
        const liked = !r.likedByMe;
        return {
          ...r,
          likedByMe: liked,
          likesCount: Math.max(0, (r.likesCount || 0) + (liked ? 1 : -1)),
        };
      })
    );

    try {
      const res = await reelService.like(reelId);
      setReels((prev) =>
        prev.map((r) =>
          r._id === reelId ? { ...r, likedByMe: res.liked, likesCount: res.likesCount } : r
        )
      );
    } catch (err) {
      // Revert on error
      setReels((prev) =>
        prev.map((r) => {
          if (r._id !== reelId) return r;
          const liked = !r.likedByMe;
          return {
            ...r,
            likedByMe: liked,
            likesCount: Math.max(0, (r.likesCount || 0) + (liked ? 1 : -1)),
          };
        })
      );
      toast.error('Failed to update like');
    } finally {
      likeLockRef.current[reelId] = false;
    }
  }, [isLoggedIn, navigate]);

  const handleShortlistToggle = useCallback(async (reelId) => {
    if (!isLoggedIn) {
      toast.error('Please login to shortlist projects');
      navigate('/login');
      return;
    }
    try {
      const res = await reelService.shortlist(reelId);
      setReels((prev) =>
        prev.map((r) =>
          r._id === reelId ? { ...r, shortlistedByMe: res.shortlisted } : r
        )
      );
      toast.success(res.shortlisted ? 'Project shortlisted!' : 'Removed from shortlist');
    } catch (err) {
      toast.error('Failed to update shortlist status');
    }
  }, [isLoggedIn, navigate]);

  const handleCommentClick = useCallback((reel) => {
    if (!isLoggedIn) {
      toast.error('Please login to view or add comments');
      navigate('/login');
      return;
    }
    setCommentReel(reel);
  }, [isLoggedIn, navigate]);
  const handleCloseComments = useCallback(() => setCommentReel(null), []);

  const handleCommentAdded = useCallback((reelId) => {
    setReels((prev) =>
      prev.map((r) =>
        r._id === reelId ? { ...r, commentsCount: (r.commentsCount || 0) + 1 } : r
      )
    );
  }, []);

  const handleDeleteReel = useCallback(async (reelId) => {
    try {
      await reelService.deleteReel(reelId);
      setReels((prev) => prev.filter((r) => r._id !== reelId));
      toast.success('Reel deleted');
    } catch (err) {
      toast.error('Failed to delete reel');
    }
  }, []);

  const handleShareClick = useCallback((reel) => {
    const shareUrl = `${window.location.origin}/reels?id=${reel._id}`;
    if (navigator.share) {
      navigator.share({
        title: reel.title || 'Check out this property!',
        text: reel.caption || 'Look at this property listing on Get Right Home!',
        url: shareUrl,
      })
        .then(() => {}) // Don't show generic success toast on share open
        .catch(() => { });
    } else {
      navigator.clipboard.writeText(shareUrl)
        .then(() => toast.success('Link copied to clipboard!'))
        .catch(() => toast.error('Failed to copy link'));
    }
  }, []);

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
    if (!title) {
      toast.error('Please enter property title');
      return;
    }
    if (!address) {
      toast.error('Please enter property address');
      return;
    }
    if (!contactNumber) {
      toast.error('Please enter contact details');
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

      setUploadOpen(false);
      resetWizard();
      loadFeed(null, true);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to submit reel');
    } finally {
      setUploading(false);
    }
  };

  const resetWizard = () => {
    setUploadStep(1);
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

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const index = parseInt(entry.target.dataset.reelIndex, 10);
          if (!Number.isNaN(index)) setActiveIndex(index);
        });
      },
      { threshold: 0.5, root: container }
    );
    const slides = container.querySelectorAll('[data-reel-index]');
    slides.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [reels.length]);

  const hasScrolledToTargetRef = useRef(false);

  // Reset scroll state on URL param changes
  useEffect(() => {
    hasScrolledToTargetRef.current = false;
  }, [window.location.search]);

  // Scroll to active target reel index on load
  useEffect(() => {
    if (reels.length === 0 || hasScrolledToTargetRef.current) return;

    const params = new URLSearchParams(window.location.search);
    const targetReelId = params.get('reel') || params.get('id');
    if (!targetReelId) {
      setInitialScrollDone(true);
      return;
    }

    const targetIndex = reels.findIndex(r => r._id === targetReelId);
    if (targetIndex !== -1) {
      hasScrolledToTargetRef.current = true;
      setActiveIndex(targetIndex);

      setTimeout(() => {
        const container = containerRef.current;
        if (container) {
          const element = container.querySelector(`[data-reel-index="${targetIndex}"]`);
          if (element) {
            // Use jump immediately for the initial load
            element.scrollIntoView({ behavior: 'auto', block: 'start' });
            container.scrollTop = element.offsetTop;
          }
        }
        setTimeout(() => setInitialScrollDone(true), 50);
      }, 50);
    } else {
      setInitialScrollDone(true);
    }
  }, [reels]);

  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container || !nextCursor || loadingMoreRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = container;
    if (scrollHeight - scrollTop - clientHeight < 300) {
      loadFeed(nextCursor);
    }
  }, [nextCursor, loadFeed]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  // Top Bar component with Search and Filter buttons
  const ReelsTopBar = () => (
    <div className="fixed top-0 left-0 right-0 z-50 md:max-w-md md:left-1/2 md:-translate-x-1/2 flex items-center justify-between p-3.5 pt-safe bg-gradient-to-b from-black/80 to-transparent">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => {
            if (window.history.length > 1) {
              navigate(-1);
            } else {
              navigate('/');
            }
          }}
          className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all"
          aria-label="Go back"
        >
          <ArrowLeft size={18} />
        </button>
        <span className="text-white font-black text-sm tracking-widest uppercase">GRH-shorts</span>
      </div>

      <div className="flex items-center gap-2">
        {/* Search Toggle */}
        <button
          type="button"
          onClick={() => setSearchOpen(!searchOpen)}
          className={`p-2 rounded-full border transition-all ${searchOpen ? 'bg-blue-600 border-blue-500 text-white' : 'bg-white/10 border-white/10 text-white hover:bg-white/20'
            }`}
        >
          <Search size={18} />
        </button>

        {/* Filter Toggle */}
        <button
          type="button"
          onClick={() => setFilterOpen(true)}
          className={`p-2 rounded-full border transition-all ${filterCity !== 'All' || filterBudget !== 'All' || filterType !== 'All' || filterStatus !== 'All'
              ? 'bg-blue-600 border-blue-500 text-white'
              : 'bg-white/10 border-white/10 text-white hover:bg-white/20'
            }`}
        >
          <SlidersHorizontal size={18} />
        </button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[100] bg-black md:max-w-md md:mx-auto overflow-hidden overscroll-none select-none">
      <ReelsTopBar />

      {/* Floating search input underneath top bar */}
      {searchOpen && (
        <form
          onSubmit={handleSearchSubmit}
          className="fixed top-14 left-3 right-3 z-50 md:max-w-[420px] md:mx-auto"
        >
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, location or city..."
              className="w-full bg-black/85 backdrop-blur-md text-white text-xs border border-white/15 rounded-xl py-2.5 pl-3.5 pr-10 focus:outline-none focus:border-blue-500 shadow-xl transition-all"
            />
            <button
              type="submit"
              className="absolute right-3 top-2.5 text-blue-500 hover:text-blue-400 font-bold text-xs"
            >
              Go
            </button>
          </div>
        </form>
      )}

      {/* Snap feed container */}
      {loading && reels.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-white">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <span className="text-[11px] font-bold uppercase tracking-widest text-white/55 mt-3">Loading feed...</span>
        </div>
      ) : reels.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-center p-6 text-white bg-neutral-950">
          <div className="p-4 rounded-full bg-white/5 border border-white/10 mb-4">
            <SlidersHorizontal className="w-8 h-8 text-neutral-400" />
          </div>
          <h3 className="font-extrabold text-sm uppercase tracking-wider text-white">No reels match your criteria</h3>
          <p className="text-xs text-white/60 mt-1 max-w-[240px]">Try adjusting your search queries or location filters.</p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setFilterCity('All');
              setFilterBudget('All');
              setFilterType('All');
              setFilterStatus('All');
              setSearchOpen(false);
            }}
            className="mt-5 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 font-bold text-xs uppercase tracking-widest rounded-xl transition-all"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        <>
          {!initialScrollDone && (
            <div className="flex flex-col items-center justify-center h-full text-white bg-black z-[100] absolute inset-0">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
          )}
          <div
            ref={containerRef}
            className={`h-full w-full overflow-y-auto snap-y snap-mandatory no-scrollbar ${!initialScrollDone ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
            style={{ scrollSnapType: 'y mandatory', overscrollBehaviorY: 'contain' }}
          >
          {reels.map((reel, index) => (
            <ReelCard
              key={reel._id}
              reel={reel}
              index={index}
              isActive={activeIndex === index && !uploadOpen && !editingReel}
              onLikeToggle={handleLikeToggle}
              onShortlistToggle={handleShortlistToggle}
              onCommentClick={handleCommentClick}
              onShareClick={handleShareClick}
              onViewed={handleViewed}
              onDelete={handleDeleteReel}
              onEditClick={handleEditClick}
              isMuted={isMuted}
              onMuteToggle={setIsMuted}
            />
          ))}
          {loadingMore && (
            <div className="h-20 flex items-center justify-center bg-black">
              <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
            </div>
          )}
        </div>
        </>
      )}

      {/* Floating Comments Overlay Sheet */}
      <ReelCommentsSheet
        isOpen={!!commentReel}
        onClose={handleCloseComments}
        reel={commentReel}
        onCommentAdded={handleCommentAdded}
      />

      {/* Slide-up Filter Bottom Sheet */}
      {filterOpen && (
        <div className="fixed inset-0 z-[100] bg-black/85 flex items-end justify-center animate-fade-in">
          <div className="bg-neutral-900 border-t border-white/10 w-full rounded-t-3xl md:max-w-md p-6 pb-8 safe-area-bottom shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <span className="font-black text-xs uppercase tracking-widest text-white/50">Filter Shorts</span>
              <button
                type="button"
                onClick={() => setFilterOpen(false)}
                className="p-1 rounded-full bg-white/5 border border-white/10 text-white"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4">
              {/* City Selection */}
              <div>
                <label className="block text-[10px] font-black text-white/60 uppercase tracking-wider mb-2">City Area</label>
                <select
                  value={filterCity}
                  onChange={(e) => setFilterCity(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 text-white rounded-xl py-2 px-3 text-xs focus:outline-none focus:border-blue-500"
                >
                  <option value="All" className="bg-neutral-950 text-white">All Bengaluru</option>
                  {BENGALURU_AREAS.map((a) => (
                    <option key={a} value={a} className="bg-neutral-950 text-white">{a}</option>
                  ))}
                </select>
              </div>

              {/* Property Type */}
              <div>
                <label className="block text-[10px] font-black text-white/60 uppercase tracking-wider mb-2">Property Type</label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 text-white rounded-xl py-2 px-3 text-xs focus:outline-none focus:border-blue-500"
                >
                  <option value="All" className="bg-neutral-950 text-white">All Types</option>
                  {PROPERTY_TYPES.map((t) => (
                    <option key={t} value={t} className="bg-neutral-950 text-white">{t}</option>
                  ))}
                </select>
              </div>

              {/* Status */}
              <div>
                <label className="block text-[10px] font-black text-white/60 uppercase tracking-wider mb-2">Property Status</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 text-white rounded-xl py-2 px-3 text-xs focus:outline-none focus:border-blue-500"
                >
                  <option value="All" className="bg-neutral-950 text-white">All Statuses</option>
                  <option value="Ready to move" className="bg-neutral-950 text-white">Ready to move</option>
                  <option value="Under construction" className="bg-neutral-950 text-white">Under construction</option>
                </select>
              </div>

              {/* Budget Range */}
              <div>
                <label className="block text-[10px] font-black text-white/60 uppercase tracking-wider mb-2">Budget Target</label>
                <select
                  value={filterBudget}
                  onChange={(e) => setFilterBudget(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 text-white rounded-xl py-2 px-3 text-xs focus:outline-none focus:border-blue-500"
                >
                  <option value="All" className="bg-neutral-950 text-white">All Budgets</option>
                  {BUDGET_RANGES.map((r) => (
                    <option key={r} value={r} className="bg-neutral-950 text-white">{r}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => {
                  setFilterCity('All');
                  setFilterBudget('All');
                  setFilterType('All');
                  setFilterStatus('All');
                  setFilterOpen(false);
                }}
                className="flex-1 py-2.5 rounded-xl border border-white/10 text-white font-bold text-xs uppercase tracking-wider"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={() => setFilterOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs uppercase tracking-wider shadow-lg"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Multi-page Multi-step Upload Modal Wizard */}
      {uploadOpen && (
        <div className="fixed inset-0 z-[110] bg-black/90 flex items-end justify-center overscroll-none animate-fade-in">
          <div className="bg-neutral-950 border-t border-white/10 w-full rounded-t-3xl md:max-w-md p-6 pb-20 safe-area-bottom shadow-2xl overflow-y-auto max-h-[90%] no-scrollbar">
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
                <span className="text-[10px] text-white/50 uppercase tracking-wide block mb-2">Select the area closest to the property:</span>
                <div className="grid grid-cols-2 gap-2 max-h-[220px] overflow-y-auto pr-1 no-scrollbar">
                  {BENGALURU_AREAS.map((area) => (
                    <button
                      key={area}
                      type="button"
                      onClick={() => setSelectedCity(area)}
                      className={`py-3 px-3.5 rounded-xl border text-left text-xs font-bold transition-all flex items-center justify-between ${selectedCity === area
                          ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20'
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
                <span className="text-[10px] text-white/50 uppercase tracking-wide block mb-2">Select the budget category:</span>
                <div className="flex flex-col gap-2">
                  {BUDGET_RANGES.map((budget) => (
                    <button
                      key={budget}
                      type="button"
                      onClick={() => setSelectedBudget(budget)}
                      className={`py-3.5 px-4 rounded-xl border text-left text-xs font-bold transition-all flex items-center justify-between ${selectedBudget === budget
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
                    className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${videoType === 'file' ? 'bg-blue-600 text-white' : 'text-white/60 hover:text-white'
                      }`}
                  >
                    <Video size={13} />
                    <span>Upload Video File</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setVideoType('url')}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${videoType === 'url' ? 'bg-blue-600 text-white' : 'text-white/60 hover:text-white'
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
                    <span className="text-[9px] text-neutral-500 mt-1.5 block">Paste complete URL of YouTube Shorts or Instagram Reels.</span>
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
                    disabled={videoType === 'file' ? !selectedFile : !videoUrl}
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
                              value={bhkSelections[bhk]}
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
                        <span>Publishing...</span>
                      </>
                    ) : (
                      <span>Publish Reel</span>
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
