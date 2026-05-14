import React, { useRef, useEffect, useCallback, memo } from 'react';
import { Heart, MessageCircle, Share2, Volume2, VolumeX, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';

const ReelCard = memo(function ReelCard({
  reel,
  index,
  isActive,
  onLikeToggle,
  onCommentClick,
  onShareClick,
  onViewed,
  onDelete,
}) {
  const videoRef = useRef(null);
  const viewReported = useRef(false);
  const [muted, setMuted] = React.useState(true);

  // Get current user from localStorage
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const isOwner = currentUser._id === (reel.user?._id || reel.user);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = muted;
  }, [muted]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (isActive) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [isActive]);

  const handleTimeUpdate = useCallback(() => {
    if (!isActive || viewReported.current || !onViewed) return;
    const video = videoRef.current;
    if (video && video.currentTime >= 2) {
      viewReported.current = true;
      onViewed(reel._id);
    }
  }, [isActive, reel._id, onViewed]);

  const handleDoubleTap = useCallback(() => {
    if (!reel.likedByMe) onLikeToggle(reel._id);
  }, [reel._id, reel.likedByMe, onLikeToggle]);

  const user = reel.user || {};
  const displayName = user.name || 'User';

  return (
    <div
      data-reel-index={index}
      className="relative w-full h-dvh snap-start flex items-end justify-center bg-black"
    >
      <video
        ref={videoRef}
        src={reel.videoUrl}
        className="absolute inset-0 w-full h-full object-cover"
        loop
        muted
        playsInline
        preload="auto"
        onTimeUpdate={handleTimeUpdate}
      />

      {/* Mute toggle - top right */}
      <div className="absolute top-4 right-20 z-10">
        <button
          type="button"
          onClick={() => setMuted((m) => !m)}
          className="p-2 rounded-full bg-black/30 backdrop-blur-sm text-white"
        >
          {muted ? <VolumeX size={22} /> : <Volume2 size={22} />}
        </button>
      </div>

      {/* Right side controls */}
      <div className="absolute right-2 bottom-24 flex flex-col items-center gap-5 z-10">
        <div className="flex flex-col items-center gap-1">
          <button
            type="button"
            onClick={() => onLikeToggle(reel._id)}
            className="p-2 rounded-full bg-black/30 backdrop-blur-sm text-white"
          >
            <Heart
              size={28}
              className={reel.likedByMe ? 'fill-red-500 text-red-500' : ''}
            />
          </button>
          <span className="text-xs font-bold text-white">{reel.likesCount ?? 0}</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <button
            type="button"
            onClick={() => onCommentClick(reel)}
            className="p-2 rounded-full bg-black/30 backdrop-blur-sm text-white"
          >
            <MessageCircle size={28} />
          </button>
          <span className="text-xs font-bold text-white">{reel.commentsCount ?? 0}</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <button
            type="button"
            onClick={() => onShareClick(reel)}
            className="p-2 rounded-full bg-black/30 backdrop-blur-sm text-white"
          >
            <Share2 size={28} />
          </button>
          <span className="text-xs font-bold text-white">{reel.sharesCount ?? 0}</span>
        </div>
        {isOwner && (
          <div className="flex flex-col items-center gap-1">
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Delete this reel?')) {
                  onDelete(reel._id);
                }
              }}
              className="p-2 rounded-full bg-red-500/20 backdrop-blur-sm text-red-500 border border-red-500/30"
            >
              <Trash2 size={24} />
            </button>
          </div>
        )}
        <div className="mt-2">
          <div className="w-10 h-10 rounded-full border-2 border-white overflow-hidden bg-gray-700 flex items-center justify-center">
            {user.profileImage ? (
              <img
                src={user.profileImage}
                alt=""
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-white font-bold text-sm">
                {displayName.charAt(0)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Bottom: user + caption - gradient backdrop so text stays readable */}
      <div
        className="absolute left-0 right-0 bottom-0 pl-3 pr-20 pb-24 pt-16 z-10 text-left"
        style={{
          background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 50%, transparent 100%)',
        }}
      >
        <p className="font-bold text-sm text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
          {displayName}
        </p>
        {reel.caption ? (
          <p className="text-sm text-white mt-0.5 line-clamp-2 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
            {reel.caption}
          </p>
        ) : null}
      </div>

      {/* Double-tap heart animation overlay */}
      <DoubleTapHeart reelId={reel._id} onLikeToggle={onLikeToggle} likedByMe={reel.likedByMe} />
    </div>
  );
});

function DoubleTapHeart({ reelId, onLikeToggle, likedByMe }) {
  const [show, setShow] = React.useState(false);
  const handleDoubleTap = React.useCallback(
    (e) => {
      if (e.target.closest('button')) return;
      if (!likedByMe) {
        onLikeToggle(reelId);
        setShow(true);
        setTimeout(() => setShow(false), 800);
      }
    },
    [reelId, likedByMe, onLikeToggle]
  );
  return (
    <>
      <div
        className="absolute inset-0 z-[1] pointer-events-none flex items-center justify-center"
        aria-hidden
      >
        {show && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1.2 }}
            exit={{ scale: 0, opacity: 0 }}
            className="text-red-500 drop-shadow-lg"
          >
            <Heart size={80} fill="currentColor" />
          </motion.div>
        )}
      </div>
      <div
        className="absolute inset-0 z-0"
        onDoubleClick={handleDoubleTap}
        aria-hidden
      />
    </>
  );
}

export default ReelCard;
