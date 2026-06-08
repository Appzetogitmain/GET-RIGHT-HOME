import Feedback from '../models/Feedback.js';

// Get logged-in user's feedback
export const getMyFeedback = async (req, res) => {
  try {
    const feedback = await Feedback.findOne({ userId: req.user._id });
    res.status(200).json({
      success: true,
      feedback: feedback || null
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch feedback'
    });
  }
};

// Create or update feedback
export const createOrUpdateFeedback = async (req, res) => {
  try {
    const { rating, review } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5'
      });
    }

    const feedback = await Feedback.findOneAndUpdate(
      { userId: req.user._id },
      { rating, review: review || '' },
      { new: true, upsert: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Feedback saved successfully',
      feedback
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to save feedback'
    });
  }
};

// Delete feedback
export const deleteFeedback = async (req, res) => {
  try {
    const result = await Feedback.findOneAndDelete({ userId: req.user._id });
    
    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'No feedback found to delete'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Feedback deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete feedback'
    });
  }
};
