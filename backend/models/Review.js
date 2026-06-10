import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  propertyId: { type: mongoose.Schema.Types.ObjectId, ref: "Property" }, // Made optional for Home Service Reviews
  serviceId: { type: mongoose.Schema.Types.ObjectId, ref: "HomeServiceService" }, // For Home Service
  vendorId: { type: mongoose.Schema.Types.ObjectId, ref: "Partner" }, // For Home Service Vendor
  workerId: { type: mongoose.Schema.Types.ObjectId, ref: "Worker" }, // For Home Service Worker
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: "Booking" },
  hsBookingId: { type: mongoose.Schema.Types.ObjectId, ref: "HomeServiceBooking" }, // Ref for HS Booking
  rating: { type: Number, min: 1, max: 5, required: true },
  comment: { type: String }, // For property reviews
  review: { type: String }, // For HS reviews
  images: [{ type: String }], // Array of image URLs
  reply: { type: String }, // Partner's reply
  replyAt: { type: Date },
  helpfulVotes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // Array of user IDs who found this helpful
  status: { type: String, enum: ["pending", "approved", "rejected", "active", "hidden", "deleted"], default: "approved" }
}, { timestamps: true });

export default mongoose.model("Review", reviewSchema);
