import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  notificationId: { type: String, unique: true, required: true },
  userId: String,
  tokens: [String],
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 86400 // auto delete after 24h
  }
});

const NotificationLog = mongoose.model('NotificationLog', schema);
export default NotificationLog;
