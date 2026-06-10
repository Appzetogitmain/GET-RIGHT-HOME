import Enquiry from '../models/Enquiry.js';
import Property from '../models/Property.js';
import Partner from '../models/Partner.js';
import User from '../models/User.js';
import RoomType from '../models/RoomType.js';

// Helper to attach starting price to a populated property doc
const attachPropertyStartingPrice = async (property) => {
    if (!property) return null;
    
    let propDoc;
    if (typeof property.toObject === 'function') {
        propDoc = property.toObject({ flattenMaps: true });
    } else {
        propDoc = JSON.parse(JSON.stringify(property));
        // If it's a plain object but dynamicData was an ES6 Map, JSON.stringify would make it {}
        // So let's copy dynamicData properly if it was a Map on the original property object
        if (property.dynamicData) {
            if (typeof property.dynamicData.get === 'function') {
                propDoc.dynamicData = Object.fromEntries(property.dynamicData);
            } else if (property.dynamicData instanceof Map) {
                propDoc.dynamicData = Object.fromEntries(property.dynamicData);
            } else {
                propDoc.dynamicData = property.dynamicData;
            }
        }
    }
    
    // 1. Try to find RoomTypes
    const roomTypes = await RoomType.find({ propertyId: propDoc._id, isActive: true }).select('pricePerNight');
    if (roomTypes.length > 0) {
        propDoc.startingPrice = Math.min(...roomTypes.map(rt => rt.pricePerNight));
        return propDoc;
    }
    
    // 2. Try to get from dynamicData if it exists
    const dd = propDoc.dynamicData || {};
    const getVal = (key) => {
        if (typeof dd.get === 'function') return dd.get(key);
        return dd[key];
    };
    
    const priceVal =
        propDoc.startingPrice ??
        propDoc.rentDetails?.monthlyRent ??
        propDoc.pgDetails?.monthlyRent ??
        propDoc.buyDetails?.expectedPrice ??
        propDoc.plotDetails?.expectedPrice ??
        getVal('price') ??
        getVal('expectedPrice') ??
        getVal('rent') ??
        getVal('monthlyRent') ??
        propDoc.price;
        
    propDoc.startingPrice = priceVal || null;
    return propDoc;
};

// Helper to attach starting prices to an array of enquiries
const attachStartingPricesToEnquiries = async (enquiries) => {
    const enriched = [];
    for (const e of enquiries) {
        const doc = e.toObject ? e.toObject() : e;
        if (doc.propertyId) {
            doc.propertyId = await attachPropertyStartingPrice(doc.propertyId);
        }
        enriched.push(doc);
    }
    return enriched;
};


// controllers/enquiryController.js
// Handles all enquiry operations — completely separate from bookings

// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// USER: Submit a new enquiry for a property
// POST /api/enquiries
// ─────────────────────────────────────────────────────────────────────────────
export const createEnquiry = async (req, res) => {
    try {
        const { propertyId, enquiryType, message, preferredDate, timeSlot, budget } = req.body;

        if (!propertyId) {
            return res.status(400).json({ success: false, message: 'propertyId is required' });
        }

        const property = await Property.findById(propertyId);
        if (!property) {
            return res.status(404).json({ success: false, message: 'Property not found' });
        }

        let userId = null;
        let customerName = '';
        let customerPhone = '';
        let customerEmail = '';

        if (req.user) {
            userId = req.user._id;
            customerName = req.user.name;
            customerPhone = req.user.phone;
            customerEmail = req.user.email || '';
        } else {
            // Guest User Form Submission
            const { name, email, phone } = req.body;
            if (!name || !phone || !email) {
                return res.status(400).json({ success: false, message: 'Name, email, and phone are required for guest enquiries' });
            }

            customerName = name.trim();
            customerPhone = phone.trim();
            customerEmail = email.trim().toLowerCase();

            // Look up if user exists by phone or email in either User or Partner collection
            let existingUser = await User.findOne({
                $or: [{ phone: customerPhone }, { email: customerEmail }]
            });

            if (!existingUser) {
                existingUser = await Partner.findOne({
                    $or: [{ phone: customerPhone }, { email: customerEmail }]
                });
            }

            if (existingUser) {
                userId = existingUser._id;
                customerName = existingUser.name || customerName;
                customerPhone = existingUser.phone || customerPhone;
                customerEmail = existingUser.email || customerEmail;
            } else {
                // Auto-register guest as user/customer
                const newUser = new User({
                    name: customerName,
                    phone: customerPhone,
                    email: customerEmail,
                    role: 'user'
                });
                await newUser.save();
                userId = newUser._id;
            }
        }

        const enquiryId = `ENQ-${Date.now()}-${Math.floor(Math.random() * 9000 + 1000)}`;

        const enquiry = new Enquiry({
            enquiryId,
            userId,
            propertyId,
            name: customerName,
            phone: customerPhone,
            email: customerEmail,
            enquiryType: enquiryType || 'callback',
            message: message || '',
            preferredDate: preferredDate ? new Date(preferredDate) : null,
            timeSlot: timeSlot || '',
            budget: budget || 0,
            status: 'new'
        });

        await enquiry.save();

        // --- ACTION-BASED LEAD TRACKING ---
        // Increment the property's enquiry count (used in UI for social proof)
        await Property.findByIdAndUpdate(propertyId, { $inc: { enquiryCount: 1 } });

        // Increment the partner/owner's leadsUsedThisMonth (for subscription lead capping)
        if (property.partnerId) {
            await Partner.findByIdAndUpdate(property.partnerId, {
                $inc: { 'subscription.leadsUsedThisMonth': 1 }
            });
        } else if (property.userId) {
            await User.findByIdAndUpdate(property.userId, {
                $inc: { 'subscription.leadsUsedThisMonth': 1 }
            });
        }

        return res.status(201).json({
            success: true,
            message: 'Enquiry submitted successfully',
            enquiry
        });
    } catch (error) {
        console.error('Create Enquiry Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Helper function to mask phone number
const maskPhone = (ph) => {
    if (!ph) return '';
    const str = ph.toString().trim();
    if (str.length < 4) return str;
    return `${str.substring(0, 4)}XXXXX${str.substring(str.length - 1)}`;
};

// Helper function to mask email address
const maskEmail = (em) => {
    if (!em) return '';
    const str = em.toString().trim();
    const parts = str.split('@');
    if (parts.length !== 2) return str;
    const local = parts[0];
    const domain = parts[1];
    if (local.length <= 3) {
        return `${local.substring(0, 1)}***@${domain}`;
    }
    return `${local.substring(0, 3)}***@${domain}`;
};

// ─────────────────────────────────────────────────────────────────────────────
// USER: Get enquiries submitted by the logged-in user (buyer view)
// GET /api/enquiries/my
// ─────────────────────────────────────────────────────────────────────────────
export const getMyEnquiries = async (req, res) => {
    try {
        const enquiries = await Enquiry.find({ userId: req.user._id })
            .populate({
                path: 'propertyId',
                select: 'propertyName coverImage address propertyType transactionType buyDetails rentDetails plotDetails pgDetails dynamicData price startingPrice userId partnerId',
                populate: [
                    { path: 'userId', select: 'name phone email' },
                    { path: 'partnerId', select: 'name phone email' }
                ]
            })
            .sort({ createdAt: -1 });

        const enriched = await attachStartingPricesToEnquiries(enquiries);
        res.json({ success: true, enquiries: enriched });
    } catch (error) {
        console.error('Get My Enquiries Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// OWNER: Get enquiries received on their properties
// GET /api/enquiries/received
// ─────────────────────────────────────────────────────────────────────────────
export const getReceivedEnquiries = async (req, res) => {
    try {
        const { propertyId, status } = req.query;

        // Find all properties owned by this user
        const ownerQuery = {
            $or: [
                { partnerId: req.user._id },
                { userId: req.user._id }
            ]
        };
        if (propertyId) ownerQuery._id = propertyId;

        const properties = await Property.find(ownerQuery).select('_id');
        const propertyIds = properties.map(p => p._id);

        if (propertyIds.length === 0) {
            return res.json({ success: true, isPremium: false, enquiries: [] });
        }

        const query = { propertyId: { $in: propertyIds } };
        if (status && status !== 'all') {
            query.status = status;
        }

        // Check if the current user has premium access (admin/superadmin or active subscription)
        const sub = req.user.subscription;
        const isPremium = sub && sub.status === 'active' && sub.expiryDate && new Date(sub.expiryDate) >= new Date();
        const isAdmin = ['admin', 'superadmin'].includes(req.user.role);
        const hasAccess = isPremium || isAdmin;

        const enquiries = await Enquiry.find(query)
            .populate('userId', 'name phone email avatar')
            .populate('propertyId', 'propertyName coverImage address propertyType transactionType buyDetails rentDetails plotDetails pgDetails dynamicData price startingPrice partnerId userId')
            .sort({ createdAt: -1 });

        const processedEnquiries = enquiries.map(e => {
            const doc = e.toObject();
            if (!hasAccess) {
                doc.phone = maskPhone(doc.phone);
                doc.email = maskEmail(doc.email);
                if (doc.userId) {
                    doc.userId.phone = maskPhone(doc.userId.phone);
                    doc.userId.email = maskEmail(doc.userId.email);
                }
            }
            return doc;
        });

        const enriched = await attachStartingPricesToEnquiries(processedEnquiries);
        res.json({ success: true, isPremium: hasAccess, enquiries: enriched });
    } catch (error) {
        console.error('Get Received Enquiries Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// OWNER: Update enquiry status (mark as contacted, scheduled, etc.)
// PUT /api/enquiries/:id/status
// ─────────────────────────────────────────────────────────────────────────────
export const updateEnquiryStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const rawStatus = req.body.status;

        const ALLOWED = ['new', 'contacted', 'scheduled', 'follow-up', 'negotiation', 'closed', 'sold', 'rented', 'dropped'];
        const status = (rawStatus || '').toLowerCase().trim();
        if (!ALLOWED.includes(status)) {
            return res.status(400).json({ success: false, message: `Invalid status "${rawStatus}". Allowed: ${ALLOWED.join(', ')}` });
        }

        const enquiry = await Enquiry.findById(id).populate('propertyId', 'partnerId userId');
        if (!enquiry) {
            return res.status(404).json({ success: false, message: 'Enquiry not found' });
        }

        const prop = enquiry.propertyId;
        const isOwner =
            String(prop?.partnerId) === String(req.user._id) ||
            String(prop?.userId) === String(req.user._id);

        // Allow admin/superadmin to update any enquiry
        const isAdmin = ['admin', 'superadmin'].includes(req.user.role);

        if (!isOwner && !isAdmin) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        enquiry.status = status;
        await enquiry.save();

        res.json({ success: true, message: 'Status updated', enquiry });
    } catch (error) {
        console.error('Update Enquiry Status Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN: Get all enquiries with pagination + search + status filter
// GET /api/admin/enquiries
// ─────────────────────────────────────────────────────────────────────────────
export const adminGetAllEnquiries = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const { status, search, propertyId, startDate, endDate, category, ownerBroker } = req.query;

        const query = {};
        if (propertyId) {
            query.propertyId = propertyId;
        }

        if (status && status !== 'all') {
            query.status = status;
        }

        // Date filters
        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) {
                query.createdAt.$gte = new Date(startDate);
            }
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                query.createdAt.$lte = end;
            }
        }

        // Category or Owner/Broker property level filters
        if (category || ownerBroker) {
            const propertyQuery = {};
            if (category) {
                propertyQuery.propertyType = new RegExp(category, 'i');
            }
            if (ownerBroker) {
                if (ownerBroker === 'owner') {
                    propertyQuery.userId = { $ne: null };
                } else if (ownerBroker === 'broker') {
                    propertyQuery.partnerId = { $ne: null };
                }
            }

            const matchingProperties = await Property.find(propertyQuery).select('_id');
            const matchingPropertyIds = matchingProperties.map(p => p._id);

            // If query filters returned no matching properties, result is immediately empty
            if (matchingPropertyIds.length === 0) {
                return res.status(200).json({ success: true, enquiries: [], total: 0, page, limit });
            }

            if (query.propertyId) {
                if (matchingPropertyIds.map(id => id.toString()).includes(query.propertyId.toString())) {
                    // stays as is
                } else {
                    return res.status(200).json({ success: true, enquiries: [], total: 0, page, limit });
                }
            } else {
                query.propertyId = { $in: matchingPropertyIds };
            }
        }

        if (search) {
            const searchRegex = new RegExp(search, 'i');
            // We need to search by user name/email/phone or property name
            // Fetch matching users and properties first
            const User = (await import('../models/User.js')).default;
            const users = await User.find({
                $or: [{ name: searchRegex }, { email: searchRegex }, { phone: searchRegex }]
            }).select('_id');

            const properties = await Property.find({ propertyName: searchRegex }).select('_id');

            query.$or = [
                { enquiryId: searchRegex },
                { userId: { $in: users.map(u => u._id) } },
                { propertyId: { $in: properties.map(p => p._id) } }
            ];
        }

        const total = await Enquiry.countDocuments(query);
        const enquiries = await Enquiry.find(query)
            .populate('userId', 'name email phone avatar')
            .populate({
                path: 'propertyId',
                select: 'propertyName coverImage address buyDetails rentDetails plotDetails pgDetails propertyType transactionType partnerId userId dynamicData price startingPrice',
                populate: [
                    { path: 'partnerId', select: 'name phone email' },
                    { path: 'userId', select: 'name phone email' }
                ]
            })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const enriched = await attachStartingPricesToEnquiries(enquiries);
        res.status(200).json({ success: true, enquiries: enriched, total, page, limit });
    } catch (error) {
        console.error('Admin Get All Enquiries Error:', error);
        res.status(500).json({ success: false, message: 'Server error fetching enquiries' });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN: Update enquiry details (status, preferredDate, adminNotes, message)
// PUT /api/admin/enquiries/:id
// ─────────────────────────────────────────────────────────────────────────────
export const adminUpdateEnquiry = async (req, res) => {
    try {
        const { id } = req.params;
        const { preferredDate, timeSlot, message, adminNotes } = req.body;
        const rawStatus = req.body.status;

        const ALLOWED = ['new', 'contacted', 'scheduled', 'follow-up', 'negotiation', 'closed', 'sold', 'rented', 'dropped'];

        const enquiry = await Enquiry.findById(id);
        if (!enquiry) {
            return res.status(404).json({ success: false, message: 'Enquiry not found' });
        }

        if (rawStatus !== undefined) {
            const status = (rawStatus || '').toLowerCase().trim();
            if (!ALLOWED.includes(status)) {
                return res.status(400).json({ success: false, message: `Invalid status "${rawStatus}". Allowed: ${ALLOWED.join(', ')}` });
            }
            enquiry.status = status;
        }
        if (preferredDate) enquiry.preferredDate = new Date(preferredDate);
        if (timeSlot !== undefined) enquiry.timeSlot = timeSlot;
        if (message !== undefined) enquiry.message = message;
        if (adminNotes !== undefined) enquiry.adminNotes = adminNotes;

        await enquiry.save();

        const updated = await Enquiry.findById(id)
            .populate('userId', 'name email phone avatar')
            .populate('propertyId', 'propertyName coverImage address buyDetails rentDetails plotDetails propertyType transactionType dynamicData price startingPrice');

        let enrichedEnquiry = updated.toObject();
        if (enrichedEnquiry.propertyId) {
            enrichedEnquiry.propertyId = await attachPropertyStartingPrice(enrichedEnquiry.propertyId);
        }
        res.status(200).json({ success: true, enquiry: enrichedEnquiry });
    } catch (error) {
        console.error('Admin Update Enquiry Error:', error);
        try {
            const fs = await import('fs');
            const path = await import('path');
            fs.appendFileSync(path.join('e:/Appzeto/Get-Right-home/backend', 'error.log'), `[${new Date().toISOString()}] Admin Update Enquiry Error\nError: ${error.message}\nStack: ${error.stack}\n\n`);
        } catch (e) {
            console.error('Failed to log to file:', e);
        }
        res.status(500).json({ success: false, message: 'Server error updating enquiry' });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN: Delete enquiry
// DELETE /api/admin/enquiries/:id
// ─────────────────────────────────────────────────────────────────────────────
export const adminDeleteEnquiry = async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await Enquiry.findByIdAndDelete(id);
        if (!deleted) {
            return res.status(404).json({ success: false, message: 'Enquiry not found' });
        }
        res.status(200).json({ success: true, message: 'Enquiry deleted successfully' });
    } catch (error) {
        console.error('Admin Delete Enquiry Error:', error);
        try {
            const fs = await import('fs');
            const path = await import('path');
            fs.appendFileSync(path.join('e:/Appzeto/Get-Right-home/backend', 'error.log'), `[${new Date().toISOString()}] Admin Delete Enquiry Error\nError: ${error.message}\nStack: ${error.stack}\n\n`);
        } catch (e) {
            console.error('Failed to log to file:', e);
        }
        res.status(500).json({ success: false, message: 'Server error deleting enquiry' });
    }
};
