import mongoose from 'mongoose';

const workerOfflineRequestSchema = new mongoose.Schema(
  {
    workerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Worker',
      required: true,
      index: true
    },
    date: {
      type: Date,
      required: true
    },
    dateStr: {
      type: String, // e.g. "2026-09-24"
      required: true
    },
    startSlot: {
      value: { type: String, required: true }, // e.g. "15:00"
      display: { type: String, required: true } // e.g. "3:00 PM"
    },
    endSlot: {
      value: { type: String, required: true }, // e.g. "18:00"
      display: { type: String, required: true } // e.g. "6:00 PM"
    },
    startDateTime: {
      type: Date,
      required: true
    },
    endDateTime: {
      type: Date,
      required: true
    },
    reason: {
      type: String,
      trim: true,
      default: 'Personal Leave'
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'cancelled'],
      default: 'pending',
      index: true
    },
    adminAdjusted: {
      type: Boolean,
      default: false
    },
    originalSlots: {
      startSlot: { value: String, display: String },
      endSlot: { value: String, display: String },
      dateStr: String
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      default: null
    },
    reviewedAt: {
      type: Date,
      default: null
    },
    rejectionReason: {
      type: String,
      default: null
    },
    notes: {
      type: String,
      default: null
    }
  },
  {
    timestamps: true
  }
);

workerOfflineRequestSchema.index({ workerId: 1, status: 1 });
workerOfflineRequestSchema.index({ startDateTime: 1, endDateTime: 1 });
workerOfflineRequestSchema.index({ status: 1, createdAt: -1 });

export default mongoose.model('WorkerOfflineRequest', workerOfflineRequestSchema);
