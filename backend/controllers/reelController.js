import Reel from '../models/Reel.js';
import ReelLike from '../models/ReelLike.js';
import ReelComment from '../models/ReelComment.js';
import ReelCommentLike from '../models/ReelCommentLike.js';
import User from '../models/User.js';
import mongoose from 'mongoose';
import fs from 'fs';
import { uploadVideoToCloudinary, getVideoThumbnailUrl, deleteVideoFromCloudinary } from '../utils/cloudinary.js';
import { safeRegex } from '../utils/escapeRegex.js';

const MAX_REEL_DURATION_SEC = 30;
const MAX_CAPTION_LENGTH = 500;
const MAX_COMMENT_LENGTH = 300;


/** Sanitize caption for storage: trim, strip control chars, normalize whitespace, max length */
function sanitizeCaption(input) {
  if (input == null || typeof input !== 'string') return '';
  return input
    .replace(/[\x00-\x1F\x7F]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_CAPTION_LENGTH);
}

/**
 * POST /api/reels/upload
 * Upload a reel (video only, max 30s, max 20MB). Caption optional, stored in DB.
 */
export const uploadReel = async (req, res) => {
  let filePath = null;
  try {
    const videoType = req.body.videoType || 'file';
    let videoUrl = '';
    let videoPublicId = null;
    let thumbnailUrl = null;

    if (videoType === 'file') {
      if (!req.file || !req.file.path) {
        return res.status(400).json({ success: false, message: 'No video file provided' });
      }
      filePath = req.file.path;
      const uploadResult = await uploadVideoToCloudinary(filePath, 'reels');
      const duration = uploadResult.duration;

      if (duration != null && duration > MAX_REEL_DURATION_SEC) {
        await deleteVideoFromCloudinary(uploadResult.publicId);
        return res.status(400).json({
          success: false,
          message: `Video must be ${MAX_REEL_DURATION_SEC} seconds or less. Your video is ${Math.ceil(duration)}s.`,
        });
      }

      videoUrl = uploadResult.url;
      videoPublicId = uploadResult.publicId;
      thumbnailUrl = getVideoThumbnailUrl(uploadResult.publicId);
    } else {
      videoUrl = req.body.videoUrl;
      if (!videoUrl) {
        return res.status(400).json({ success: false, message: 'No video URL provided' });
      }
    }

    const rawCaption = req.body.caption != null ? String(req.body.caption) : '';
    const caption = sanitizeCaption(rawCaption);

    let configurations = [];
    if (req.body.configurations) {
      try {
        configurations = typeof req.body.configurations === 'string'
          ? JSON.parse(req.body.configurations)
          : req.body.configurations;
      } catch (e) {
        console.error('Error parsing configurations:', e);
      }
    }

    const reel = await Reel.create({
      user: req.user._id,
      videoType,
      videoUrl,
      videoPublicId,
      thumbnailUrl,
      caption,
      title: req.body.title || '',
      address: req.body.address || '',
      city: req.body.city || '',
      budgetRange: req.body.budgetRange || '',
      status: req.body.status || 'Ready to move',
      propertyType: req.body.propertyType || '',
      configurations,
      contactNumber: req.body.contactNumber || '',
      brochureUrl: req.body.brochureUrl || '',
      category: req.body.category || 'General',
    });

    if (typeof req._reelUploadIncrement === 'function') {
      req._reelUploadIncrement();
    }

    const populated = await Reel.findById(reel._id).populate('user', 'name profileImage');
    res.status(201).json({ success: true, reel: populated });
  } catch (err) {
    if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
    console.error('Reel upload error:', err);
    res.status(500).json({
      success: false,
      message: err.message || 'Reel upload failed',
    });
  }
};

/**
 * GET /api/reels/feed?cursor=&limit=10
 * Cursor-based pagination. optionalProtect: if logged in, include likedByMe.
 */
export const getFeed = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 10, 50);
    const cursor = req.query.cursor;
    const category = req.query.category;
    const city = req.query.city;
    const budgetRange = req.query.budgetRange;
    const propertyType = req.query.propertyType;
    const status = req.query.status;
    const search = req.query.search;
    const creatorOnly = req.query.creatorOnly;

    let query = {};
    if (cursor) query._id = { $lt: new mongoose.Types.ObjectId(cursor) };
    if (category && category !== 'All') query.category = category;
    if (city && city !== 'All') query.city = safeRegex(city);
    if (budgetRange && budgetRange !== 'All') query.budgetRange = budgetRange;
    if (propertyType && propertyType !== 'All') query.propertyType = safeRegex(propertyType);
    if (status && status !== 'All') query.status = status;
    if (creatorOnly === 'true' && req.user) {
      query.user = req.user._id;
    }
    if (search) {
      query.$or = [
        { title: safeRegex(search) },
        { address: safeRegex(search) },
        { city: safeRegex(search) },
      ];
    }

    console.log('FEED_QUERY_DEBUG:', JSON.stringify(query), 'Limit:', limit, 'Category:', category);

    const reels = await Reel.find(query)
      .sort({ createdAt: -1 })
      .limit(limit + 1)
      .populate('user', 'name profileImage')
      .lean();

    const hasMore = reels.length > limit;
    const items = hasMore ? reels.slice(0, limit) : reels;
    const nextCursor = hasMore ? items[items.length - 1]._id.toString() : null;

    let likedSet = new Set();
    let shortlistedSet = new Set();
    if (req.user && items.length > 0) {
      const reelIds = items.map((r) => r._id);
      const likes = await ReelLike.find({
        user: req.user._id,
        reel: { $in: reelIds },
      }).select('reel');
      likes.forEach((l) => likedSet.add(l.reel.toString()));

      items.forEach((item) => {
        if (item.shortlistedBy && item.shortlistedBy.some(id => id.toString() === req.user._id.toString())) {
          shortlistedSet.add(item._id.toString());
        }
      });
    }

    const feed = items.map((r) => ({
      ...r,
      likedByMe: likedSet.has(r._id.toString()),
      shortlistedByMe: shortlistedSet.has(r._id.toString()),
    }));

    res.json({
      success: true,
      reels: feed,
      nextCursor,
      hasMore: !!nextCursor,
    });
  } catch (err) {
    console.error('Reel feed error:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to load feed' });
  }
};

/**
 * POST /api/reels/like/:id
 * Toggle like.
 */
export const toggleLike = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await ReelLike.findOneAndDelete({ user: req.user._id, reel: id });

    if (existing) {
      const updated = await Reel.findByIdAndUpdate(
        id,
        { $inc: { likesCount: -1 } },
        { new: true }
      );
      return res.json({ success: true, liked: false, likesCount: Math.max(0, updated.likesCount) });
    }

    await ReelLike.create({ user: req.user._id, reel: id });
    const updated = await Reel.findByIdAndUpdate(
      id,
      { $inc: { likesCount: 1 } },
      { new: true }
    );
    res.json({ success: true, liked: true, likesCount: updated.likesCount });
  } catch (err) {
    console.error('Reel like error:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to update like' });
  }
};

/**
 * POST /api/reels/comment/:id
 * Add comment. Sanitize text, max length.
 */
export const addComment = async (req, res) => {
  try {
    const { id } = req.params;
    let text = (req.body.text || '').trim().slice(0, MAX_COMMENT_LENGTH);
    if (!text) return res.status(400).json({ success: false, message: 'Comment text is required' });

    const reel = await Reel.findById(id);
    if (!reel) return res.status(404).json({ success: false, message: 'Reel not found' });

    const comment = await ReelComment.create({
      user: req.user._id,
      reel: id,
      text,
    });
    reel.commentsCount = (reel.commentsCount || 0) + 1;
    await reel.save();

    const populated = await ReelComment.findById(comment._id).populate('user', 'name profileImage');
    res.status(201).json({ success: true, comment: populated });
  } catch (err) {
    console.error('Reel comment error:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to add comment' });
  }
};

/**
 * GET /api/reels/:id/comments?cursor=&limit=20
 */
export const getComments = async (req, res) => {
  try {
    const { id } = req.params;
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 50);
    const cursor = req.query.cursor;
    const query = { reel: id };
    if (cursor) query._id = { $lt: new mongoose.Types.ObjectId(cursor) }

    const comments = await ReelComment.find(query)
      .sort({ createdAt: -1 })
      .limit(limit + 1)
      .populate('user', 'name profileImage')
      .lean();

    const hasMore = comments.length > limit;
    const items = hasMore ? comments.slice(0, limit) : comments;
    const nextCursor = hasMore ? items[items.length - 1]._id.toString() : null;

    let likedSet = new Set();
    if (req.user && items.length > 0) {
      const commentIds = items.map((c) => c._id);
      const likes = await ReelCommentLike.find({
        user: req.user._id,
        comment: { $in: commentIds },
      }).select('comment');
      likes.forEach((l) => likedSet.add(l.comment.toString()));
    }

    const feed = items.map((c) => ({
      ...c,
      likedByMe: likedSet.has(c._id.toString()),
    }));

    res.json({
      success: true,
      comments: feed,
      nextCursor,
      hasMore: !!nextCursor,
    });
  } catch (err) {
    console.error('Reel comments list error:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to load comments' });
  }
};

/**
 * POST /api/reels/comment/:id/like
 */
export const toggleCommentLike = async (req, res) => {
  try {
    const { id } = req.params; // comment id
    const existing = await ReelCommentLike.findOneAndDelete({ user: req.user._id, comment: id });

    if (existing) {
      const updated = await ReelComment.findByIdAndUpdate(
        id,
        { $inc: { likesCount: -1 } },
        { new: true }
      );
      return res.json({ success: true, liked: false, likesCount: Math.max(0, updated.likesCount) });
    }

    await ReelCommentLike.create({ user: req.user._id, comment: id });
    const updated = await ReelComment.findByIdAndUpdate(
      id,
      { $inc: { likesCount: 1 } },
      { new: true }
    );
    res.json({ success: true, liked: true, likesCount: updated.likesCount });
  } catch (err) {
    console.error('Comment like error:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to update comment like' });
  }
};

/**
 * POST /api/reels/share/:id
 * Increment sharesCount.
 */
export const shareReel = async (req, res) => {
  try {
    const reel = await Reel.findByIdAndUpdate(
      req.params.id,
      { $inc: { sharesCount: 1 } },
      { new: true }
    );
    if (!reel) return res.status(404).json({ success: false, message: 'Reel not found' });
    res.json({ success: true, sharesCount: reel.sharesCount });
  } catch (err) {
    console.error('Reel share error:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to record share' });
  }
};

/**
 * POST /api/reels/:id/view
 * Body: { watchedSeconds } - increment viewsCount only if watchedSeconds >= 2.
 */
export const recordView = async (req, res) => {
  try {
    const watchedSeconds = Number(req.body.watchedSeconds) || 0;
    if (watchedSeconds < 2) {
      return res.json({ success: true, viewsCount: null });
    }

    const reel = await Reel.findByIdAndUpdate(
      req.params.id,
      { $inc: { viewsCount: 1 } },
      { new: true }
    );
    if (!reel) return res.status(404).json({ success: false, message: 'Reel not found' });
    res.json({ success: true, viewsCount: reel.viewsCount });
  } catch (err) {
    console.error('Reel view error:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to record view' });
  }
};

/**
 * GET /api/reels/most-viewed?limit=10
 */
export const getMostViewed = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 10, 20);
    const reels = await Reel.find({})
      .sort({ viewsCount: -1, createdAt: -1 })
      .limit(limit)
      .populate('user', 'name profileImage')
      .lean();
    res.json({ success: true, reels });
  } catch (err) {
    console.error('Reel most-viewed error:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to load reels' });
  }
};

/**
 * GET /api/reels/:id
 * Single reel (e.g. deep link).
 */
export const getReelById = async (req, res) => {
  try {
    const reel = await Reel.findById(req.params.id)
      .populate('user', 'name profileImage')
      .lean();
    if (!reel) return res.status(404).json({ success: false, message: 'Reel not found' });

    let likedByMe = false;
    if (req.user) {
      const like = await ReelLike.findOne({ user: req.user._id, reel: reel._id });
      likedByMe = !!like;
    }
    res.json({ success: true, reel: { ...reel, likedByMe } });
  } catch (err) {
    console.error('Reel getById error:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to load reel' });
  }
};

/**
 * DELETE /api/reels/:id
 * Only reel owner (or admin) can delete. Remove from Cloudinary and delete related docs.
 */
export const deleteReel = async (req, res) => {
  try {
    const reel = await Reel.findById(req.params.id);
    if (!reel) return res.status(404).json({ success: false, message: 'Reel not found' });

    const isOwner = reel.user.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin' || req.user.role === 'superadmin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Not allowed to delete this reel' });
    }

    if (reel.videoPublicId) {
      try {
        await deleteVideoFromCloudinary(reel.videoPublicId);
      } catch (e) {
        console.warn('Cloudinary delete failed:', e.message);
      }
    }

    await ReelLike.deleteMany({ reel: reel._id });
    await ReelComment.deleteMany({ reel: reel._id });
    await Reel.findByIdAndDelete(reel._id);

    res.json({ success: true, message: 'Reel deleted' });
  } catch (err) {
    console.error('Reel delete error:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to delete reel' });
  }
};

export const updateReel = async (req, res) => {
  try {
    const { id } = req.params;
    const reel = await Reel.findById(id);
    if (!reel) return res.status(404).json({ success: false, message: 'Reel not found' });

    const isOwner = reel.user.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin' || req.user.role === 'superadmin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Not allowed to modify this reel' });
    }

    let configurations = reel.configurations;
    if (req.body.configurations) {
      try {
        configurations = typeof req.body.configurations === 'string'
          ? JSON.parse(req.body.configurations)
          : req.body.configurations;
      } catch (e) {
        console.error('Error parsing configurations:', e);
      }
    }

    const updated = await Reel.findByIdAndUpdate(
      id,
      {
        title: req.body.title !== undefined ? req.body.title : reel.title,
        caption: req.body.caption !== undefined ? sanitizeCaption(req.body.caption) : reel.caption,
        address: req.body.address !== undefined ? req.body.address : reel.address,
        city: req.body.city !== undefined ? req.body.city : reel.city,
        budgetRange: req.body.budgetRange !== undefined ? req.body.budgetRange : reel.budgetRange,
        status: req.body.status !== undefined ? req.body.status : reel.status,
        propertyType: req.body.propertyType !== undefined ? req.body.propertyType : reel.propertyType,
        configurations,
        contactNumber: req.body.contactNumber !== undefined ? req.body.contactNumber : reel.contactNumber,
        brochureUrl: req.body.brochureUrl !== undefined ? req.body.brochureUrl : reel.brochureUrl,
        category: req.body.category !== undefined ? req.body.category : reel.category,
        videoUrl: req.body.videoUrl !== undefined ? req.body.videoUrl : reel.videoUrl,
        videoType: req.body.videoType !== undefined ? req.body.videoType : reel.videoType,
      },
      { new: true }
    ).populate('user', 'name profileImage');

    res.json({ success: true, reel: updated });
  } catch (err) {
    console.error('Reel update error:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to update reel' });
  }
};

export const toggleShortlist = async (req, res) => {
  try {
    const { id } = req.params;
    const reel = await Reel.findById(id);
    if (!reel) return res.status(404).json({ success: false, message: 'Reel not found' });

    const userId = req.user._id;
    const index = reel.shortlistedBy.findIndex(id => id.toString() === userId.toString());

    let shortlisted = false;
    if (index > -1) {
      reel.shortlistedBy.splice(index, 1);
    } else {
      reel.shortlistedBy.push(userId);
      shortlisted = true;
    }
    await reel.save();

    res.json({ success: true, shortlisted, shortlistedCount: reel.shortlistedBy.length });
  } catch (err) {
    console.error('Reel shortlist toggle error:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to toggle shortlist' });
  }
};
