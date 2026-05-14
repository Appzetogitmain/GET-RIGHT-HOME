// models/RoomType.js
import mongoose from "mongoose";

const roomTypeSchema = new mongoose.Schema({

  propertyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Property",
    required: true
  },

  name: { type: String, required: true },

  inventoryType: {
    type: String,
    enum: ["room", "bed", "entire", "tent"],
    required: true
  },

  roomCategory: {
    type: String,
    // Supports both standard room categories relative to 'room' inventory, and tent types relative to 'tent' inventory
    enum: [
      // Standard
      "private", "shared", "entire", "triple", "double",
      // Tent Types
      "Luxury Swiss Tent", "Dome Tent", "Safari Tent", "Camping Tent", "Glamping Pod"
    ]
  },

  bathroomType: {
    type: String,
    enum: ["Attached (Private)", "Shared Complex", "Dry/Eco Toilet"]
  },

  // CAPACITY
  maxAdults: { type: Number, required: true },
  maxChildren: { type: Number, default: 0 },

  // INVENTORY COUNT
  bedsPerRoom: {
    type: Number
  },
  totalInventory: {
    type: Number,
    required: true // villa = 1
  },

  // PRICING (PER NIGHT – SINGLE SOURCE OF TRUTH)
  pricePerNight: { type: Number, required: true },
  extraAdultPrice: { type: Number, default: 0 },
  extraChildPrice: { type: Number, default: 0 },

  // MEDIA
  images: {
    type: [String],
    validate: v => (Array.isArray(v) ? v.length >= 3 : true)
  },

  amenities: [String],

  isActive: { type: Boolean, default: true }

}, { timestamps: true });

export default mongoose.model("RoomType", roomTypeSchema);
