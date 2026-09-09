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
        required: false
    },

    brokerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false
    },

    builderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false
    },

    targetType: {
        type: String,
        enum: ['property', 'broker', 'builder', 'owner', 'general'],
        default: 'property'
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
        required: false,
        default: ''
    },

    // ── Enquiry & Action Details ──────────────────────────────────────────────
    actionType: {
        type: String,
        enum: ['call', 'whatsapp', 'view_number', 'brochure_download', 'download_brochure', 'visit', 'schedule_visit', 'callback', 'document_view', 'profile_view', 'chat', 'request_photos', 'general'],
        default: 'callback'
    },

    enquiryType: {
        type: String,
        enum: ['call', 'whatsapp', 'view_number', 'brochure_download', 'download_brochure', 'visit', 'schedule_visit', 'callback', 'document_view', 'profile_view', 'chat', 'request_photos', 'general'],
        default: 'callback'
    },

    sourceContext: {
        type: String,
        enum: ['card', 'property_card', 'detail_page', 'details_page', 'broker_profile', 'builder_profile', 'profile_page', 'quick_view', 'search_card', 'home_section', 'general'],
        default: 'detail_page'
    },

    sourceUrl: {
        type: String,
        default: ''
    },

    // ── Captured Customer Requirement Snapshot ──────────────────────────────
    requirement: {
        text: { type: String, default: '' },
        bhk: { type: String, default: '' },
        propertyType: { type: String, default: '' },
        budgetMax: { type: Number, default: 0 },
        budgetMin: { type: Number, default: 0 },
        location: { type: String, default: '' },
        city: { type: String, default: '' },
        purpose: { type: String, default: '' }
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
        enum: ['new', 'contacted', 'scheduled', 'follow-up', 'negotiation', 'closed', 'sold', 'rented', 'dropped'],
        default: 'new'
    },

    // ── Admin Notes ───────────────────────────────────────────────────────────
    adminNotes: {
        type: String,
        default: ''
    }

}, { timestamps: true });

// Indexes for fast lookups and deduplication
enquirySchema.index({ propertyId: 1, createdAt: -1 });
enquirySchema.index({ brokerId: 1, createdAt: -1 });
enquirySchema.index({ builderId: 1, createdAt: -1 });
enquirySchema.index({ userId: 1, createdAt: -1 });
enquirySchema.index({ phone: 1, propertyId: 1, actionType: 1, createdAt: -1 });

export default mongoose.model('Enquiry', enquirySchema);
