import mongoose from 'mongoose';

const feedbackSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  review: {
    type: String,
    trim: true,
    default: ''
  }
}, { timestamps: true });

// Ensure a user can only have one feedback
feedbackSchema.index({ userId: 1 }, { unique: true });

const Feedback = mongoose.model('Feedback', feedbackSchema);
export default Feedback;
