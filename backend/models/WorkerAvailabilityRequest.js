import mongoose from 'mongoose';

// A worker's request to be treated as Available on one calendar day (IST).
// Until an admin approves it, the date is NOT added to worker.availability and
// the worker takes no bookings / can't go online for that day.
const workerAvailabilityRequestSchema = new mongoose.Schema(
  {
    workerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Worker', required: true, index: true },
    dateStr: { type: String, required: true }, // YYYY-MM-DD (IST)
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'cancelled', 'revoked'],
      default: 'pending',
      index: true
    },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
    reviewedAt: { type: Date, default: null },
    rejectionReason: { type: String, trim: true, default: '' }
  },
  { timestamps: true }
);

workerAvailabilityRequestSchema.index({ workerId: 1, dateStr: 1, status: 1 });

export default mongoose.model('WorkerAvailabilityRequest', workerAvailabilityRequestSchema);
