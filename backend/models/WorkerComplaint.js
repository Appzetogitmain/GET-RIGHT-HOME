import mongoose from 'mongoose';

const workerComplaintSchema = new mongoose.Schema({
  ticketId: {
    type: String,
    required: true,
    unique: true,
    default: () => {
      const timestamp = Date.now().toString(36).toUpperCase();
      const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
      return `TKT-${timestamp}-${randomStr}`;
    }
  },
  workerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Worker',
    required: true
  },
  subject: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['Open', 'In Progress', 'Resolved', 'Closed'],
    default: 'Open'
  },
  adminResponse: {
    type: String,
    default: ''
  }
}, { timestamps: true });



const WorkerComplaint = mongoose.model('WorkerComplaint', workerComplaintSchema);

export default WorkerComplaint;
