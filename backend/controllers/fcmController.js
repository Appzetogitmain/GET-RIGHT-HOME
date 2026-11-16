import User from '../models/User.js';

// @desc    Save FCM token
// @route   POST /api/fcm-tokens/save
// @access  Private
export const saveFcmToken = async (req, res) => {
  try {
    const { token, platform = 'web' } = req.body;
    const userId = req.user._id;

    if (!token) {
      return res.status(400).json({ success: false, message: 'Token is required' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (!user.fcmTokens) user.fcmTokens = {};
    if (platform === 'web') {
      user.fcmTokens.web = token;
    } else {
      user.fcmTokens.app = token;
    }

    // Since it's a mixed/nested object, tell mongoose it changed
    user.markModified('fcmTokens');
    await user.save();

    res.status(200).json({ success: true, message: 'FCM token saved successfully' });
  } catch (error) {
    console.error('Save FCM token error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Remove FCM token
// @route   DELETE /api/fcm-tokens/remove
// @access  Private
export const removeFcmToken = async (req, res) => {
  try {
    const { platform = 'web' } = req.body;
    const userId = req.user._id;

    const user = await User.findById(userId);
    if (user && user.fcmTokens) {
      if (platform === 'web') user.fcmTokens.web = null;
      else user.fcmTokens.app = null;
      user.markModified('fcmTokens');
      await user.save();
    }

    res.status(200).json({ success: true, message: 'FCM token removed successfully' });
  } catch (error) {
    console.error('Remove FCM token error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

