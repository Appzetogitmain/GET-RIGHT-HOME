import ContactMessage from '../models/ContactMessage.js';
import emailService from '../services/emailService.js';
import notificationService from '../services/notificationService.js';
import Notification from '../models/Notification.js';
import Admin from '../models/Admin.js';
import mongoose from 'mongoose';

export const createContactMessage = async (req, res) => {
  try {
    const { audience } = req.params;
    const { name, email, phone, subject, message } = req.body;

    if (!['user', 'partner'].includes(audience)) {
      return res.status(400).json({ success: false, message: 'Invalid audience' });
    }

    if (!name || !subject || !message) {
      return res.status(400).json({ success: false, message: 'Name, subject and message are required' });
    }

    const doc = await ContactMessage.create({
      audience,
      name,
      email,
      phone,
      subject,
      message
    });

    // NOTIFICATION: Notify Admin (Email + In-App)
    try {
      // Dynamic import or ensure model is registered
      // Best to rely on User model if Admin is a User with role='admin', 
      // BUT if you have a separate Admin schema, we must use that.
      // Based on previous file reads, it seems 'User' is used for everything usually, 
      // but 'Admin' model reference exists in code. Let's try finding User with role 'admin' first.

      const adminUsers = await Admin.find({ role: { $in: ['admin', 'superadmin'] }, isActive: true });

      for (const adminUser of adminUsers) {
        // 1. Send Email (Optional: maybe just send to one? For now, sending to all active admins is safer for visibility)
        if (adminUser.email) {
          emailService.sendAdminSupportQueryEmail(adminUser.email, doc).catch(e => console.error('Email failed:', e));
        }

        // 2. Create In-App Notification
        await Notification.create({
          userId: adminUser._id,
          userType: 'admin',
          title: `New Support Message: ${subject}`,
          body: `From: ${name} (${audience}). Click to view.`,
          type: 'support_message',
          data: { messageId: doc._id, audience },
          isRead: false
        });

        // 3. Trigger Push Notification
        notificationService.sendToUser(adminUser._id, {
          title: `New Support Message: ${subject}`,
          body: `From: ${name} (${audience}).`
        }, { type: 'support_message', messageId: doc._id }, 'admin').catch(e => console.error('Push failed:', e));
      }
    } catch (err) {
      console.warn('Could not notify admin about support query:', err);
    }

    res.status(201).json({ success: true, message: 'Message submitted successfully', contact: doc });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error submitting message' });
  }
};

