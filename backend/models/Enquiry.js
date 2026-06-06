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

    // ── Customer Details (Stored directly in lead) ───────────────────────────
    name: {
        type: String,
        required: true
    },

    phone: {
        type: String,
        required: true
    },

    email: {
        type: String,
        required: true
    },

    // ── Enquiry Type ──────────────────────────────────────────────────────────
    enquiryType: {
        type: String,
        enum: ['call', 'whatsapp', 'callback'],
        default: 'callback'
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
        enum: ['new', 'contacted', 'follow-up', 'negotiation', 'closed'],
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
