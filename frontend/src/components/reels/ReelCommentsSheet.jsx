import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Heart } from 'lucide-react';
import { reelService } from '../../services/reelService';

export default function ReelCommentsSheet({ isOpen, onClose, reel, onCommentAdded }) {
  const [comments, setComments] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadComments = useCallback(async (cursor = null) => {
    if (!reel?._id) return;
    if (cursor) setLoadingMore(true);
    else setLoading(true);
    try {
      const res = await reelService.getComments(reel._id, {
        limit: 20,
        ...(cursor && { cursor }),
      });
      if (cursor) {
        setComments((prev) => [...prev, ...res.comments]);
      } else {
        setComments(res.comments || []);
      }
      setNextCursor(res.nextCursor || null);
    } catch (e) {
      console.error('Failed to load comments', e);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [reel?._id]);

  useEffect(() => {
    if (isOpen && reel?._id) loadComments();
  }, [isOpen, reel?._id]);

  const handleCommentLike = async (commentId) => {
    setComments((prev) =>
      prev.map((c) => {
        if (c._id !== commentId) return c;
        const liked = !c.likedByMe;
        return {
          ...c,
          likedByMe: liked,
          likesCount: Math.max(0, (c.likesCount || 0) + (liked ? 1 : -1)),
        };
      })
    );
    try {
      const res = await reelService.likeComment(commentId);
      setComments((prev) =>
        prev.map((c) =>
          c._id === commentId ? { ...c, likedByMe: res.liked, likesCount: res.likesCount } : c
        )
      );
    } catch (err) {
      setComments((prev) =>
        prev.map((c) => {
          if (c._id !== commentId) return c;
          const liked = !c.likedByMe;
          return {
            ...c,
            likedByMe: liked,
            likesCount: Math.max(0, (c.likesCount || 0) + (liked ? 1 : -1)),
          };
        })
      );
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    try {
      const res = await reelService.comment(reel._id, trimmed);
      setComments((prev) => [res.comment, ...prev]);
      setText('');
      onCommentAdded?.(reel._id);
    } catch (err) {
      console.error('Comment failed', err);
    } finally {
      setSubmitting(false);
    }
  };

  const loadMore = () => {
    if (nextCursor && !loadingMore) loadComments(nextCursor);
  };

  if (!reel) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-[60]"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'tween', duration: 0.3 }}
            className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl max-h-[70vh] flex flex-col z-[61] safe-area-bottom"
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h3 className="font-bold text-surface">Comments</h3>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-full hover:bg-gray-100"
              >
                <X size={22} className="text-gray-600" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto min-h-0">
              {loading ? (
                <div className="p-6 text-center text-gray-500">Loading comments...</div>
              ) : comments.length === 0 ? (
                <div className="p-6 text-center text-gray-500">No comments yet.</div>
              ) : (
                <ul className="p-4 space-y-3">
                  {comments.map((c) => (
                    <li key={c._id} className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-surface/20 shrink-0 overflow-hidden flex items-center justify-center">
                        {c.user?.profileImage ? (
                          <img
                            src={c.user.profileImage}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-surface font-bold text-xs">
                            {(c.user?.name || 'U').charAt(0)}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-gray-900">
                          {c.user?.name || 'User'}
                        </p>
                        <p className="text-sm text-gray-700 break-words">{c.text}</p>
                      </div>
                      <div className="flex flex-col items-center gap-0.5">
                        <button
                          type="button"
                          onClick={() => handleCommentLike(c._id)}
                          className={`p-1.5 rounded-full transition-colors ${c.likedByMe ? 'text-red-500' : 'text-gray-400 hover:bg-gray-100'}`}
                        >
                          <Heart size={16} className={c.likedByMe ? 'fill-current' : ''} />
                        </button>
                        {c.likesCount > 0 && (
                          <span className="text-[10px] font-bold text-gray-500">
                            {c.likesCount}
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              {nextCursor && (
                <div className="p-4 text-center">
                  <button
                    type="button"
                    onClick={loadMore}
                    disabled={loadingMore}
                    className="text-sm font-medium text-surface"
                  >
                    {loadingMore ? 'Loading...' : 'Load more'}
                  </button>
                </div>
              )}
            </div>
            <form
              onSubmit={handleSubmit}
              className="p-4 border-t border-gray-100 flex gap-2 items-center"
            >
              <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Add a comment..."
                maxLength={300}
                className="flex-1 rounded-full border border-gray-200 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-surface/30"
              />
              <button
                type="submit"
                disabled={!text.trim() || submitting}
                className="p-2 rounded-full bg-surface text-white disabled:opacity-50"
              >
                <Send size={20} />
              </button>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
