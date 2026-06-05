import mongoose from "mongoose";

const localityReviewSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  localityName: { type: String, required: true }, // e.g. "Goregaon East, Mumbai"
  rating: { type: Number, min: 1, max: 5, default: 4, required: true }, // Overall rating
  connectivityRating: { type: Number, min: 1, max: 5, default: 4 },
  lifestyleRating: { type: Number, min: 1, max: 5, default: 4 },
  safetyRating: { type: Number, min: 1, max: 5, default: 4 },
  greenAreaRating: { type: Number, min: 1, max: 5, default: 4 },
  comment: { type: String },
  positives: [{ type: String }], // e.g. ["Good Public Transport"]
  negatives: [{ type: String }], // e.g. ["Frequent Traffic Jams"]
  userType: { type: String, enum: ['Tenant', 'Owner', 'Visitor', 'Resident'], default: 'Resident' },
  stayDuration: { type: String, default: 'living since 1Y+' },
  helpfulVotes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  status: { type: String, enum: ["pending", "approved", "rejected"], default: "approved" }
}, { timestamps: true });

localityReviewSchema.index({ localityName: 1 });

export default mongoose.model("LocalityReview", localityReviewSchema);
