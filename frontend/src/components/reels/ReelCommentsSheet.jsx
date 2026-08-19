import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Heart, CornerDownRight, ChevronDown, ChevronUp } from 'lucide-react';
import { reelService } from '../../services/reelService';

export default function ReelCommentsSheet({ isOpen, onClose, reel, onCommentAdded }) {
  const [comments, setComments] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Replies are fetched lazily, per parent comment, instead of coming down
  // with the main list — keyed by the top-level comment's id:
  // { [commentId]: { items, nextCursor, expanded, loading, loadingMore } }
  const [replyState, setReplyState] = useState({});
  // Which comment (always a top-level id — replies flatten onto their
  // top-level parent) the pending input submits as a reply to, if any.
  const [replyingTo, setReplyingTo] = useState(null);
  const inputRef = useRef(null);

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
    if (isOpen && reel?._id) {
      loadComments();
      setReplyState({});
      setReplyingTo(null);
    }
  }, [isOpen, reel?._id]);

  // A like can land on a top-level comment OR a reply tucked away inside
  // replyState — this updates whichever one actually matches, wherever it is.
  const applyCommentUpdate = (commentId, mapFn) => {
    setComments((prev) => prev.map((c) => (c._id === commentId ? mapFn(c) : c)));
    setReplyState((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const key of Object.keys(next)) {
        const group = next[key];
        if (group.items?.some((r) => r._id === commentId)) {
          next[key] = { ...group, items: group.items.map((r) => (r._id === commentId ? mapFn(r) : r)) };
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  };

  const handleCommentLike = async (commentId) => {
    const toggleLocal = (c) => {
      const liked = !c.likedByMe;
      return { ...c, likedByMe: liked, likesCount: Math.max(0, (c.likesCount || 0) + (liked ? 1 : -1)) };
    };
    applyCommentUpdate(commentId, toggleLocal);
    try {
      const res = await reelService.likeComment(commentId);
      applyCommentUpdate(commentId, (c) => ({ ...c, likedByMe: res.liked, likesCount: res.likesCount }));
    } catch (err) {
      applyCommentUpdate(commentId, toggleLocal);
    }
  };

  const toggleReplies = async (commentId) => {
    const existing = replyState[commentId];
    if (existing?.expanded) {
      setReplyState((prev) => ({ ...prev, [commentId]: { ...prev[commentId], expanded: false } }));
      return;
    }
    if (existing?.items?.length) {
      setReplyState((prev) => ({ ...prev, [commentId]: { ...prev[commentId], expanded: true } }));
      return;
    }
    setReplyState((prev) => ({ ...prev, [commentId]: { items: [], nextCursor: null, expanded: true, loading: true } }));
    try {
      const res = await reelService.getReplies(commentId, { limit: 10 });
      setReplyState((prev) => ({
        ...prev,
        [commentId]: { items: res.comments || [], nextCursor: res.nextCursor || null, expanded: true, loading: false },
      }));
    } catch (e) {
      console.error('Failed to load replies', e);
      setReplyState((prev) => ({ ...prev, [commentId]: { items: [], nextCursor: null, expanded: true, loading: false } }));
    }
  };

  const loadMoreReplies = async (commentId) => {
    const group = replyState[commentId];
    if (!group?.nextCursor || group.loadingMore) return;
    setReplyState((prev) => ({ ...prev, [commentId]: { ...prev[commentId], loadingMore: true } }));
    try {
      const res = await reelService.getReplies(commentId, { limit: 10, cursor: group.nextCursor });
      setReplyState((prev) => ({
        ...prev,
        [commentId]: {
          ...prev[commentId],
          items: [...prev[commentId].items, ...(res.comments || [])],
          nextCursor: res.nextCursor || null,
          loadingMore: false,
        },
      }));
    } catch (e) {
      console.error('Failed to load more replies', e);
      setReplyState((prev) => ({ ...prev, [commentId]: { ...prev[commentId], loadingMore: false } }));
    }
  };

  const startReply = (topLevelId, authorName) => {
    setReplyingTo({ commentId: topLevelId, authorName });
    setText((prev) => (prev.trim() ? prev : `@${authorName} `));
    inputRef.current?.focus();
  };

  const cancelReply = () => {
    setReplyingTo(null);
    setText('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    try {
      const res = await reelService.comment(reel._id, trimmed, replyingTo?.commentId || null);
      if (replyingTo) {
        const parentId = replyingTo.commentId;
        setComments((prev) =>
          prev.map((c) => (c._id === parentId ? { ...c, repliesCount: (c.repliesCount || 0) + 1 } : c))
        );
        setReplyState((prev) => {
          const group = prev[parentId] || { items: [], nextCursor: null };
          return { ...prev, [parentId]: { ...group, items: [...group.items, res.comment], expanded: true } };
        });
        setReplyingTo(null);
      } else {
        setComments((prev) => [res.comment, ...prev]);
      }
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

  const renderCommentRow = (c, { isReply = false, topLevelId = null } = {}) => (
    <div className={`flex gap-3 ${isReply ? 'mt-3' : ''}`}>
      <div className={`${isReply ? 'w-6 h-6' : 'w-8 h-8'} rounded-full bg-surface/20 shrink-0 overflow-hidden flex items-center justify-center`}>
        {c.user?.profileImage ? (
          <img src={c.user.profileImage} alt="" className="w-full h-full object-cover" />
        ) : (
          <span className="text-surface font-bold text-xs">{(c.user?.name || 'U').charAt(0)}</span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-gray-900">{c.user?.name || 'User'}</p>
        <p className="text-sm text-gray-700 break-words">{c.text}</p>
        <button
          type="button"
          onClick={() => startReply(isReply ? topLevelId : c._id, c.user?.name || 'User')}
          className="mt-1 flex items-center gap-1 text-xs font-semibold text-gray-400 hover:text-gray-600"
        >
          <CornerDownRight size={12} />
          Reply
        </button>
      </div>
      <div className="flex flex-col items-center gap-0.5">
        <button
          type="button"
          onClick={() => handleCommentLike(c._id)}
          className={`p-1.5 rounded-full transition-colors ${c.likedByMe ? 'text-red-500' : 'text-gray-400 hover:bg-gray-100'}`}
        >
          <Heart size={isReply ? 14 : 16} className={c.likedByMe ? 'fill-current' : ''} />
        </button>
        {c.likesCount > 0 && (
          <span className="text-[10px] font-bold text-gray-500">{c.likesCount}</span>
        )}
      </div>
    </div>
  );

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
                  {comments.map((c) => {
                    const replies = replyState[c._id];
                    return (
                      <li key={c._id}>
                        {renderCommentRow(c)}

                        <div className="pl-11">
                          {(c.repliesCount > 0) && (
                            <button
                              type="button"
                              onClick={() => toggleReplies(c._id)}
                              className="mt-1.5 flex items-center gap-1 text-xs font-bold text-gray-500 hover:text-gray-700"
                            >
                              {replies?.expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                              {replies?.expanded ? 'Hide replies' : `View ${c.repliesCount} ${c.repliesCount === 1 ? 'reply' : 'replies'}`}
                            </button>
                          )}

                          {replies?.expanded && (
                            <div className="mt-1">
                              {replies.loading ? (
                                <p className="text-xs text-gray-400 py-2">Loading replies...</p>
                              ) : (
                                replies.items.map((r) => (
                                  <div key={r._id}>{renderCommentRow(r, { isReply: true, topLevelId: c._id })}</div>
                                ))
                              )}
                              {replies.nextCursor && (
                                <button
                                  type="button"
                                  onClick={() => loadMoreReplies(c._id)}
                                  disabled={replies.loadingMore}
                                  className="mt-2 text-xs font-semibold text-surface block"
                                >
                                  {replies.loadingMore ? 'Loading...' : 'View more replies'}
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </li>
                    );
                  })}
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
            {replyingTo && (
              <div className="px-4 pt-2 flex items-center justify-between bg-gray-50 border-t border-gray-100">
                <span className="text-xs text-gray-500 font-medium py-1.5">
                  Replying to <span className="font-bold text-gray-700">@{replyingTo.authorName}</span>
                </span>
                <button
                  type="button"
                  onClick={cancelReply}
                  className="p-1 rounded-full hover:bg-gray-200 text-gray-400"
                >
                  <X size={14} />
                </button>
              </div>
            )}
            <form
              onSubmit={handleSubmit}
              className="p-4 border-t border-gray-100 flex gap-2 items-center"
            >
              <input
                ref={inputRef}
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={replyingTo ? `Reply to @${replyingTo.authorName}...` : 'Add a comment...'}
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
