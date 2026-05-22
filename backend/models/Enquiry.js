// models/Enquiry.js
// Completely separate model for property enquiries (contact, visit, callback)
// NOT related to the Booking/Hotel reservation system.

import mongoose from 'mongoose';

const enquirySchema = new mongoose.Schema({

    // ── Enquiry Reference ─────────────────────────────────────────────────────
    enquiryId: {
        type: String,
        required: true,
        unique: true
    },

    // ── Parties ───────────────────────────────────────────────────────────────
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    propertyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Property',
        required: true
    },

    // ── Enquiry Type ──────────────────────────────────────────────────────────
    enquiryType: {
        type: String,
        enum: ['contact_owner', 'schedule_visit', 'request_callback', 'general'],
        default: 'general'
    },

    // ── Content ───────────────────────────────────────────────────────────────
    message: {
        type: String,
        default: ''
    },

    // ── Visit / Schedule details ──────────────────────────────────────────────
    preferredDate: {
        type: Date
    },

    timeSlot: {
        type: String,
        default: ''
    },

    // ── Financial context ─────────────────────────────────────────────────────
    budget: {
        type: Number,
        default: 0
    },

    // ── Status Tracking ───────────────────────────────────────────────────────
    status: {
        type: String,
        enum: ['new', 'contacted', 'scheduled', 'closed', 'sold', 'rented', 'dropped'],
        default: 'new'
    },

    // ── Admin Notes ───────────────────────────────────────────────────────────
    adminNotes: {
        type: String,
        default: ''
    }

}, { timestamps: true });

// Index for fast lookup by property and user
enquirySchema.index({ propertyId: 1, createdAt: -1 });
enquirySchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model('Enquiry', enquirySchema);
