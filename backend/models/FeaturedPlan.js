import mongoose from "mongoose";

const featuredPlanSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true }, // e.g. "Gold", "Silver"
  color: { type: String, default: "blue" }, // e.g. "amber", "purple", "slate"
  description: { type: String },
  defaultDurationDays: { type: Number, default: 30 }, // Default lifespan
  weight: { type: Number, default: 0 }, // For sorting priority (higher = higher rank)
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

export default mongoose.model("FeaturedPlan", featuredPlanSchema);
