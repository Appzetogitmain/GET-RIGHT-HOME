import React, { useRef, useEffect, useCallback, memo, useState } from 'react';
import { Heart, MessageCircle, Share2, Volume2, VolumeX, Trash2, Phone, Eye, Download, MapPin, Pencil, Play } from 'lucide-react';
import { motion } from 'framer-motion';

const SafeIframe = memo(function SafeIframe({ src, className, style, title, allow }) {
  const iframeRef = useRef(null);
  const isMounted = useRef(false);

  useEffect(() => {
    if (!isMounted.current) {
      isMounted.current = true;
      return;
    }
    const iframe = iframeRef.current;
    if (!iframe) return;
    try {
      iframe.contentWindow.location.replace(src);
    } catch (e) {
      iframe.src = src;
    }
  }, [src]);

  return (
    <iframe
      ref={iframeRef}
      src={src}
      className={className}
      style={style}
      title={title}
      allow={allow}
    />
  );
});

const ReelCard = memo(function ReelCard({
  reel,
  index,
  isActive,
  onLikeToggle,
  onShortlistToggle,
  onCommentClick,
  onShareClick,
  onViewed,
  onDelete,
  onEditClick,
  isMuted,
  onMuteToggle,
}) {
  const videoRef = useRef(null);
  const viewReported = useRef(false);
  const [isPlaying, setIsPlaying] = useState(true);

  // Get current user from localStorage
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const isOwner = currentUser._id === (reel.user?._id || reel.user);
  const isAdmin = currentUser.role === 'admin' || currentUser.role === 'superadmin';
  const isOwnerOrAdmin = isOwner || isAdmin;

  // Sync isPlaying when active index changes
  useEffect(() => {
    if (isActive) {
      setIsPlaying(true);
    } else {
      setIsPlaying(false);
    }
  }, [isActive]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = isMuted;
    if (isActive && isPlaying) {
      video.play().catch(() => {
        // Fallback: autoplay muted if blocked by browser policy
        video.muted = true;
        video.play().catch(() => {});
      });
    } else {
      video.pause();
    }
  }, [isActive, isPlaying, isMuted]);

  const handleTimeUpdate = useCallback(() => {
    if (!isActive || viewReported.current || !onViewed) return;
    const video = videoRef.current;
    if (video && video.currentTime >= 2) {
      viewReported.current = true;
      onViewed(reel._id);
    }
  }, [isActive, reel._id, onViewed]);

  const togglePlayPause = () => {
    setIsPlaying((prev) => !prev);
  };

  const toggleMute = (e) => {
    e.stopPropagation();
    onMuteToggle(!isMuted);
  };

  const user = reel.user || {};
  const displayName = user.name || 'Hoomzo Agent';

  // Detect and parse video links (Instagram / YouTube)
  const getVideoDetails = (url) => {
    if (!url) return { type: 'unknown' };

    // YouTube Shorts / Videos
    const ytMatch = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=|shorts\/)|youtu\.be\/)([^"&?\/\s]{11})/i);
    if (ytMatch) {
      return { type: 'youtube', id: ytMatch[1] };
    }

    // Instagram Reel / Post
    const instaMatch = url.match(/(?:instagram\.com\/(?:p|reel|tv)\/)([^/?#&\s]+)/i);
    if (instaMatch) {
      return { type: 'instagram', id: instaMatch[1] };
    }

    return { type: 'generic', url };
  };

  const videoDetails = getVideoDetails(reel.videoUrl);

  // Get thumbnail URL
  let thumbUrl = reel.thumbnailUrl;
  if (!thumbUrl) {
    if (videoDetails.type === 'youtube') {
      thumbUrl = `https://img.youtube.com/vi/${videoDetails.id}/hqdefault.jpg`;
    } else {
      thumbUrl = 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=600&q=80';
    }
  }

  return (
    <div
      data-reel-index={index}
      className="relative w-full h-dvh snap-start flex items-end justify-center bg-black overflow-hidden"
    >
      {/* Video Content Layer */}
      {reel.videoType === 'url' ? (
        <div className="absolute inset-0 w-full h-full z-0 flex items-center justify-center bg-black">
          {videoDetails.type === 'youtube' ? (
            (isActive && isPlaying) ? (
              <SafeIframe
                src={`https://www.youtube.com/embed/${videoDetails.id}?autoplay=1&mute=${isMuted ? 1 : 0}&loop=1&playlist=${videoDetails.id}&controls=0&modestbranding=1&rel=0&playsinline=1`}
                className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                style={{ border: 0, height: '100%', width: '100%' }}
                title={reel.title}
                allow="autoplay; encrypted-media; picture-in-picture"
              />
            ) : (
              <img
                src={thumbUrl}
                alt={reel.title}
                className="absolute inset-0 w-full h-full object-cover"
              />
            )
          ) : videoDetails.type === 'instagram' ? (
            (isActive && isPlaying) ? (
              <SafeIframe
                src={`https://www.instagram.com/reel/${videoDetails.id}/embed/`}
                className={`absolute inset-0 w-full h-full object-cover ${isPlaying ? '' : 'pointer-events-none'}`}
                style={{ border: 0, height: '100%', width: '100%' }}
                title={reel.title}
                allow="autoplay"
              />
            ) : (
              <img
                src={thumbUrl}
                alt={reel.title}
                className="absolute inset-0 w-full h-full object-cover"
              />
            )
          ) : (
            <video
              ref={videoRef}
              src={reel.videoUrl}
              className="absolute inset-0 w-full h-full object-cover"
              loop
              muted={isMuted}
              playsInline
              preload="auto"
              onTimeUpdate={handleTimeUpdate}
            />
          )}
          {/* Transparent Overlay to capture click gestures */}
          <div 
            className={`absolute inset-0 z-10 cursor-pointer ${videoDetails.type === 'instagram' && isPlaying ? 'pointer-events-none' : ''}`}
            onClick={togglePlayPause}
          />
        </div>
      ) : (
        <div className="absolute inset-0 w-full h-full z-0 bg-black">
          <video
            ref={videoRef}
            src={reel.videoUrl}
            className="w-full h-full object-cover"
            loop
            muted={isMuted}
            playsInline
            preload="auto"
            onTimeUpdate={handleTimeUpdate}
          />
          {/* Transparent Overlay to capture click gestures */}
          <div 
            className="absolute inset-0 z-10 cursor-pointer"
            onClick={togglePlayPause}
          />
        </div>
      )}

      {/* Big Play Button Overlay when paused */}
      {!isPlaying && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/25 pointer-events-none">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            className="p-5 rounded-full bg-black/50 backdrop-blur-md text-white border border-white/10 shadow-2xl"
          >
            <Play size={36} className="fill-white translate-x-0.5" />
          </motion.div>
        </div>
      )}

      {/* Mute toggle indicator - top right */}
      <div className="absolute top-4 right-16 z-20">
        <button
          type="button"
          onClick={toggleMute}
          className="p-2 rounded-full bg-black/40 backdrop-blur-md text-white border border-white/10 shadow-lg transition-transform active:scale-95"
        >
          {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>
      </div>

      {/* Right side floating controls */}
      <div className="absolute right-3 bottom-24 flex flex-col items-center gap-4 z-20">
        {/* Like Button */}
        <div className="flex flex-col items-center gap-0.5">
          <button
            type="button"
            onClick={() => onLikeToggle(reel._id)}
            className="p-3 rounded-full bg-black/40 backdrop-blur-md text-white border border-white/10 shadow-lg hover:bg-black/60 transition-all"
          >
            <Heart
              size={24}
              className={reel.likedByMe ? 'fill-red-500 text-red-500' : ''}
            />
          </button>
          <span className="text-[10px] font-black text-white drop-shadow-md">{reel.likesCount ?? 0}</span>
        </div>

        {/* Comment Button */}
        <div className="flex flex-col items-center gap-0.5">
          <button
            type="button"
            onClick={() => onCommentClick(reel)}
            className="p-3 rounded-full bg-black/40 backdrop-blur-md text-white border border-white/10 shadow-lg hover:bg-black/60 transition-all"
          >
            <MessageCircle size={24} />
          </button>
          <span className="text-[10px] font-black text-white drop-shadow-md">{reel.commentsCount ?? 0}</span>
        </div>

        {/* Call Button */}
        <div className="flex flex-col items-center gap-0.5">
          <a
            href={`tel:${reel.contactNumber || '9999999999'}`}
            className="p-3 rounded-full bg-black/40 backdrop-blur-md text-white border border-white/10 shadow-lg hover:bg-black/60 transition-all flex items-center justify-center"
          >
            <Phone size={24} />
          </a>
          <span className="text-[10px] font-black text-white drop-shadow-md">Call</span>
        </div>

        {/* Share Button */}
        <div className="flex flex-col items-center gap-0.5">
          <button
            type="button"
            onClick={() => onShareClick(reel)}
            className="p-3 rounded-full bg-black/40 backdrop-blur-md text-white border border-white/10 shadow-lg hover:bg-black/60 transition-all"
          >
            <Share2 size={24} />
          </button>
          <span className="text-[10px] font-black text-white drop-shadow-md">Share</span>
        </div>

        {/* Views Display */}
        <div className="flex flex-col items-center gap-0.5">
          <div className="p-3 rounded-full bg-black/40 backdrop-blur-md text-white border border-white/10 shadow-lg">
            <Eye size={24} />
          </div>
          <span className="text-[10px] font-black text-white drop-shadow-md uppercase text-center leading-none">
            {reel.viewsCount >= 1000 ? `${(reel.viewsCount / 1000).toFixed(1)}k+` : reel.viewsCount || 0}
            <br />
            views
          </span>
        </div>

        {/* Brochure Download Button */}
        {reel.brochureUrl && (
          <div className="flex flex-col items-center gap-0.5">
            <a
              href={reel.brochureUrl}
              target="_blank"
              rel="noreferrer"
              className="p-3 rounded-full bg-blue-600/80 backdrop-blur-md text-white border border-blue-500/20 shadow-lg hover:bg-blue-700 transition-all flex items-center justify-center"
            >
              <Download size={24} />
            </a>
            <span className="text-[10px] font-black text-white drop-shadow-md">Brochure</span>
          </div>
        )}

        {/* Edit button for Owner / Admin */}
        {isOwnerOrAdmin && onEditClick && (
          <button
            type="button"
            onClick={() => onEditClick(reel)}
            className="p-3 rounded-full bg-blue-600/30 backdrop-blur-md text-blue-400 border border-blue-500/40 hover:bg-blue-600/50 transition-all mt-2"
            title="Edit Reel"
          >
            <Pencil size={20} />
          </button>
        )}

        {/* Delete button for Owner / Admin */}
        {isOwnerOrAdmin && (
          <button
            type="button"
            onClick={() => {
              if (window.confirm('Delete this reel?')) {
                onDelete(reel._id);
              }
            }}
            className="p-3 rounded-full bg-red-600/30 backdrop-blur-md text-red-500 border border-red-500/40 hover:bg-red-600/50 transition-all mt-2"
          >
            <Trash2 size={20} />
          </button>
        )}
      </div>

      {/* Bottom overlay details: Title, Address, BHK Configurations list, Shortlist Project Button */}
      <div
        className="absolute left-0 right-0 bottom-0 pl-4 pr-20 pb-8 pt-24 z-10 text-left pointer-events-none"
        style={{
          background: 'linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.5) 60%, transparent 100%)',
        }}
      >
        <div className="pointer-events-auto flex flex-col gap-3.5">
          {/* Property status, title, and address */}
          <div>
            <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-md text-[9px] font-black uppercase bg-blue-600 text-white tracking-wide shadow-sm">
                {reel.status || 'Ready To Move'}
              </span>
              {reel.propertyType && (
                <span className="px-2.5 py-0.5 rounded-md text-[9px] font-black uppercase bg-white/20 text-white backdrop-blur-sm tracking-wide">
                  {reel.propertyType}
                </span>
              )}
            </div>
            <h2 className="font-extrabold text-base text-white drop-shadow-md leading-tight">
              {reel.title || 'Ambience Creacions'}
            </h2>
            <p className="text-[11px] text-white/80 flex items-center gap-1 mt-0.5 drop-shadow-sm font-medium">
              <MapPin size={11} className="text-blue-400 shrink-0" />
              {reel.address || 'Sector 22, Gurgaon'}
            </p>
          </div>

          {/* BHK Configurations Horizontal Scroll bar */}
          {reel.configurations && reel.configurations.length > 0 && (
            <div className="flex overflow-x-auto gap-2 py-1.5 no-scrollbar max-w-full">
              {reel.configurations.map((config, idx) => (
                <div
                  key={idx}
                  className="flex-shrink-0 bg-white/10 backdrop-blur-md border border-white/15 rounded-lg px-3 py-1.5 text-white flex flex-col min-w-[110px] shadow-md"
                >
                  <span className="text-[8px] text-white/60 font-black uppercase tracking-wider">{config.bhk}</span>
                  <span className="text-[11px] font-black tracking-tight mt-0.5">{config.price} onwards</span>
                </div>
              ))}
            </div>
          )}

          {/* Shortlist Project Action Button */}
          <button
            type="button"
            onClick={() => onShortlistToggle(reel._id)}
            className={`w-full py-2.5 rounded-xl font-black text-[11px] uppercase tracking-widest transition-all duration-300 shadow-lg ${
              reel.shortlistedByMe
                ? 'bg-emerald-600 text-white hover:bg-emerald-700 border border-emerald-500/20'
                : 'bg-blue-600 text-white hover:bg-blue-700 border border-blue-500/20'
            }`}
          >
            {reel.shortlistedByMe ? '✓ Shortlisted' : '♡ Shortlist project'}
          </button>
        </div>
      </div>
    </div>
  );
});

export default ReelCard;
