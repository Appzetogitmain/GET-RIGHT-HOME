// models/BuilderProjectDetails.js
import mongoose from "mongoose";

const builderProjectDetailsSchema = new mongoose.Schema({
  propertyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Property",
    required: true,
    unique: true
  },
  possessionStatus: {
    type: String,
    enum: ['Ongoing', 'Ready To Move', 'New Launch']
  },
  possessionYear: {
    type: Number
  },
  ratings: {
    constructionQuality: {
      type: Number,
      min: 1,
      max: 5
    },
    aiSummary: {
      type: String
    }
  },
  priceHistory: {
    currentPricePerSqft: {
      type: Number
    },
    appreciationLast3Years: {
      type: Number // in percentage
    }
  }
}, { timestamps: true });

export default mongoose.model("BuilderProjectDetails", builderProjectDetailsSchema);
