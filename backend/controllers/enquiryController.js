import Enquiry from '../models/Enquiry.js';
import Property from '../models/Property.js';
import Partner from '../models/Partner.js';
import User from '../models/User.js';
import RoomType from '../models/RoomType.js';
import { safeRegex } from '../utils/escapeRegex.js';

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
// USER: Submit a new enquiry / lead for a property, broker, or builder
// POST /api/enquiries
// ─────────────────────────────────────────────────────────────────────────────
export const createEnquiry = async (req, res) => {
    try {
        const {
            propertyId,
            brokerId,
            builderId,
            targetId,
            targetType = 'property',
            actionType = 'callback',
            enquiryType,
            sourceContext = 'detail_page',
            sourceUrl = '',
            requirement = {},
            message,
            preferredDate,
            timeSlot,
            budget
        } = req.body;

        // Resolve effective target IDs
        let resolvedPropertyId = propertyId || (targetType === 'property' || targetType === 'owner' ? targetId : null);
        let resolvedBrokerId = brokerId || (targetType === 'broker' ? targetId : null);
        let resolvedBuilderId = builderId || (targetType === 'builder' ? targetId : null);

        // At least one target must be provided or it's a general enquiry
        if (!resolvedPropertyId && !resolvedBrokerId && !resolvedBuilderId && !targetId) {
            return res.status(400).json({ success: false, message: 'At least one target (propertyId, brokerId, or builderId) is required' });
        }

        let property = null;
        if (resolvedPropertyId) {
            property = await Property.findById(resolvedPropertyId);
        }

        let userId = null;
        let customerName = '';
        let customerPhone = '';
        let customerEmail = '';

        if (req.user) {
            userId = req.user._id;
            customerName = req.user.name || 'User';
            customerPhone = req.user.phone || '';
            customerEmail = req.user.email || '';
        } else {
            // Guest User Submission
            const { name, email, phone } = req.body;
            if (!phone) {
                return res.status(400).json({ success: false, message: 'Phone number is required' });
            }

            customerPhone = String(phone).trim();
            customerName = (name || 'Customer').trim();
            customerEmail = (email || '').trim().toLowerCase();

            // Look up if user exists by phone or email
            const orConditions = [{ phone: customerPhone }];
            if (customerEmail) orConditions.push({ email: customerEmail });

            let existingUser = await User.findOne({ $or: orConditions });

            if (existingUser) {
                userId = existingUser._id;
                customerName = existingUser.name || customerName;
                customerPhone = existingUser.phone || customerPhone;
                customerEmail = existingUser.email || customerEmail;
            } else {
                // Auto-register guest as user
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

        const effectiveActionType = actionType || enquiryType || 'callback';

        // ── DE-DUPLICATION: one lead per user + target ───────────────────────
        // A repeat enquiry (any action, any time) updates the existing lead
        // instead of creating a second one. Without a resolvable target we keep
        // the old 15-minute same-action guard.
        const dedupeQuery = { $or: [{ userId }, { phone: customerPhone }] };

        if (resolvedPropertyId) dedupeQuery.propertyId = resolvedPropertyId;
        else if (resolvedBrokerId) dedupeQuery.brokerId = resolvedBrokerId;
        else if (resolvedBuilderId) dedupeQuery.builderId = resolvedBuilderId;
        else {
            dedupeQuery.actionType = effectiveActionType;
            dedupeQuery.createdAt = { $gte: new Date(Date.now() - 15 * 60 * 1000) };
        }

        const existingLead = await Enquiry.findOne(dedupeQuery).sort({ createdAt: -1 });

        const enquiryId = `ENQ-${Date.now()}-${Math.floor(Math.random() * 9000 + 1000)}`;

        // Resolve financial budget fallback
        let effectiveBudget = budget || 0;
        if (!effectiveBudget && property) {
            effectiveBudget = property.buyDetails?.expectedPrice || 
                              property.plotDetails?.expectedPrice || 
                              property.rentDetails?.monthlyRent || 
                              property.price || 0;
        }

        // Format structured requirement snapshot
        const structuredRequirement = {
            text: requirement.text || requirement.requirement || (property ? `${property.propertyType || 'Property'} in ${property.address?.city || 'India'}` : ''),
            bhk: requirement.bhk || (property?.buyDetails?.bhk || property?.rentDetails?.bhk || ''),
            propertyType: requirement.propertyType || requirement.property_type || (property?.propertyType || ''),
            budgetMax: Number(requirement.budgetMax || requirement.budget_max || effectiveBudget || 0),
            budgetMin: Number(requirement.budgetMin || requirement.budget_min || 0),
            location: requirement.location || (property?.address?.locality || property?.address?.area || ''),
            city: requirement.city || (property?.address?.city || ''),
            purpose: requirement.purpose || (property?.transactionType || '')
        };

        if (existingLead) {
            // Refresh the previous lead: new date/time, new action, latest details.
            // No counter increments — it's the same lead, not a new one.
            const now = new Date();
            const update = {
                createdAt: now,
                updatedAt: now,
                actionType: effectiveActionType,
                enquiryType: effectiveActionType,
                sourceContext: sourceContext || existingLead.sourceContext,
                sourceUrl: sourceUrl || existingLead.sourceUrl,
                requirement: structuredRequirement,
                name: customerName || existingLead.name,
                phone: customerPhone || existingLead.phone,
                email: customerEmail || existingLead.email
            };
            if (message) update.message = message;
            if (effectiveBudget) update.budget = effectiveBudget;
            if (preferredDate) update.preferredDate = new Date(preferredDate);
            if (timeSlot) update.timeSlot = timeSlot;
            if (effectiveActionType === 'visit' && preferredDate) update.status = 'scheduled';
            else if (existingLead.status === 'dropped') update.status = 'new';

            const refreshed = await Enquiry.findByIdAndUpdate(
                existingLead._id,
                { $set: update },
                { new: true, timestamps: false, overwriteImmutable: true }
            );
            return res.status(200).json({
                success: true,
                message: 'Existing enquiry updated',
                enquiry: refreshed,
                deduplicated: true,
                updated: true
            });
        }

        const enquiry = new Enquiry({
            enquiryId,
            userId,
            propertyId: resolvedPropertyId || undefined,
            brokerId: resolvedBrokerId || undefined,
            builderId: resolvedBuilderId || undefined,
            targetType: targetType || 'property',
            name: customerName,
            phone: customerPhone,
            email: customerEmail,
            actionType: effectiveActionType,
            enquiryType: effectiveActionType,
            sourceContext: sourceContext || 'detail_page',
            sourceUrl: sourceUrl || '',
            requirement: structuredRequirement,
            message: message || '',
            preferredDate: preferredDate ? new Date(preferredDate) : null,
            timeSlot: timeSlot || '',
            budget: effectiveBudget,
            status: (effectiveActionType === 'visit' && preferredDate) ? 'scheduled' : 'new'
        });

        await enquiry.save();

        // ── ACTION-BASED LEAD COUNTER UPDATES ────────────────────────────────
        if (resolvedPropertyId && property) {
            await Property.findByIdAndUpdate(resolvedPropertyId, { $inc: { enquiryCount: 1 } });
            if (property.userId) {
                await User.findByIdAndUpdate(property.userId, {
                    $inc: { 'subscription.leadsUsedThisMonth': 1 }
                });
            }
        } else if (resolvedBrokerId) {
            await User.findByIdAndUpdate(resolvedBrokerId, {
                $inc: { 'subscription.leadsUsedThisMonth': 1 }
            });
        } else if (resolvedBuilderId) {
            await User.findByIdAndUpdate(resolvedBuilderId, {
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

// ─────────────────────────────────────────────────────────────────────────────
// OWNER: Clicked "Boost" on one of their listings.
// Without an active subscription this records a sales lead for the admin
// (Admin → Enquiries). It deliberately has no propertyId, so it never shows up
// in the owner's own "received enquiries" and never bumps lead counters.
// POST /api/enquiries/boost
// ─────────────────────────────────────────────────────────────────────────────
export const createBoostLead = async (req, res) => {
    try {
        const { propertyId } = req.body;
        const sub = req.user.subscription;
        const hasSubscription = !!(sub && sub.status === 'active' && sub.expiryDate && new Date(sub.expiryDate) >= new Date());

        if (hasSubscription) {
            return res.status(200).json({ success: true, leadCreated: false, hasSubscription: true });
        }

        const property = propertyId ? await Property.findOne({ _id: propertyId, userId: req.user._id }) : null;
        if (!property) {
            return res.status(404).json({ success: false, message: 'Property not found' });
        }

        // One boost lead per user + property per day
        const sourceUrl = `/property/${property._id}`;
        const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const existing = await Enquiry.findOne({ userId: req.user._id, actionType: 'boost', sourceUrl, createdAt: { $gte: dayAgo } });
        if (existing) {
            return res.status(200).json({ success: true, leadCreated: false, deduplicated: true, hasSubscription: false });
        }

        const city = property.address?.city || '';
        await Enquiry.create({
            enquiryId: `ENQ-${Date.now()}-${Math.floor(Math.random() * 9000 + 1000)}`,
            userId: req.user._id,
            targetType: 'general',
            name: req.user.name || 'User',
            phone: req.user.phone || '',
            email: req.user.email || '',
            actionType: 'boost',
            enquiryType: 'boost',
            sourceContext: 'my_properties',
            sourceUrl,
            message: `Wants to boost listing "${property.propertyName}"${city ? ` (${city})` : ''} [${property.status}] - no active subscription.`,
            requirement: {
                text: `Boost request: ${property.propertyName}`,
                propertyType: property.propertyType || '',
                city
            },
            status: 'new'
        });

        return res.status(201).json({ success: true, leadCreated: true, hasSubscription: false });
    } catch (error) {
        console.error('Create Boost Lead Error:', error);
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
                select: 'propertyName coverImage address propertyType transactionType buyDetails rentDetails plotDetails pgDetails dynamicData price startingPrice userId',
                populate: [
                    { path: 'userId', select: 'name phone email' },
                    
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
// ─────────────────────────────────────────────────────────────────────────────
// OWNER / BROKER / BUILDER: Get enquiries received on properties or profiles
// GET /api/enquiries/received
// ─────────────────────────────────────────────────────────────────────────────
export const getReceivedEnquiries = async (req, res) => {
    try {
        const { propertyId, status, filter } = req.query;

        // Find all properties owned by this user
        const ownerQuery = { userId: req.user._id };
        const userProperties = await Property.find(ownerQuery).select('_id propertyName propertyType transactionType address buyDetails rentDetails plotDetails pgDetails coverImage price dynamicData');
        const userPropertyIds = userProperties.map(p => p._id);

        let scopedPropertyIds = userPropertyIds;
        if (propertyId && propertyId !== 'All' && propertyId !== 'all') {
            // Check if property belongs to user or user is authorized
            const selectedProp = userProperties.find(p => p._id.toString() === propertyId.toString());
            if (selectedProp || ['admin', 'superadmin'].includes(req.user.role)) {
                scopedPropertyIds = [propertyId];
            } else {
                scopedPropertyIds = [propertyId];
            }
        }

        const orConditions = [];
        if (scopedPropertyIds.length > 0) {
            orConditions.push({ propertyId: { $in: scopedPropertyIds } });
        }
        
        // If viewing all properties, also include broker/builder direct enquiries
        if (!propertyId || propertyId === 'All' || propertyId === 'all') {
            orConditions.push({ brokerId: req.user._id });
            orConditions.push({ builderId: req.user._id });
        }

        const query = orConditions.length > 0 ? { $or: orConditions } : { _id: null };

        // Check if the current user has premium access (admin/superadmin or active subscription)
        const sub = req.user.subscription;
        const isPremium = (sub && sub.status === 'active' && sub.expiryDate && new Date(sub.expiryDate) >= new Date()) || ['admin', 'superadmin'].includes(req.user.role);
        const hasAccess = !!isPremium;

        const rawEnquiries = await Enquiry.find(query)
            .populate('userId', 'name phone email avatar role')
            .populate('brokerId', 'name phone email avatar address')
            .populate('builderId', 'name phone email avatar address')
            .populate('propertyId', 'propertyName coverImage address propertyType transactionType buyDetails rentDetails plotDetails pgDetails dynamicData price startingPrice userId')
            .sort({ createdAt: -1 });

        const enrichedEnquiries = await attachStartingPricesToEnquiries(rawEnquiries);

        // Process enquiries with masking according to access tier
        const processedEnquiries = enrichedEnquiries.map(e => {
            const doc = e.toObject ? e.toObject() : JSON.parse(JSON.stringify(e));
            doc.isContactAuthorized = hasAccess;
            doc.rawPhone = doc.phone;
            doc.rawEmail = doc.email;
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

        // ── 1. GROUP RESPONDENTS (All Respondents View) ─────────────────────
        const respondentsMap = new Map();
        for (const enq of processedEnquiries) {
            const respondentKey = enq.userId?._id?.toString() || enq.rawPhone || enq.phone || enq.email || enq._id.toString();
            
            if (!respondentsMap.has(respondentKey)) {
                respondentsMap.set(respondentKey, {
                    respondentId: respondentKey,
                    userId: enq.userId?._id || null,
                    name: enq.userId?.name || enq.name || 'Enquirer',
                    phone: enq.phone,
                    rawPhone: enq.rawPhone,
                    email: enq.email,
                    rawEmail: enq.rawEmail,
                    avatar: enq.userId?.avatar || '',
                    userType: enq.userId?.role || 'Buyer',
                    isContactAuthorized: hasAccess,
                    totalEnquiries: 0,
                    lastEnquiryDate: enq.createdAt,
                    propertiesMap: new Map(),
                    statuses: new Set(),
                    enquiries: []
                });
            }

            const group = respondentsMap.get(respondentKey);
            group.totalEnquiries += 1;
            group.enquiries.push(enq);
            if (new Date(enq.createdAt) > new Date(group.lastEnquiryDate)) {
                group.lastEnquiryDate = enq.createdAt;
            }
            if (enq.status) group.statuses.add(enq.status);

            if (enq.propertyId && enq.propertyId._id) {
                const propIdStr = enq.propertyId._id.toString();
                if (!group.propertiesMap.has(propIdStr)) {
                    group.propertiesMap.set(propIdStr, {
                        _id: enq.propertyId._id,
                        propertyName: enq.propertyId.propertyName || 'Property',
                        coverImage: enq.propertyId.coverImage || '',
                        propertyType: enq.propertyId.propertyType || '',
                        startingPrice: enq.propertyId.startingPrice,
                        price: enq.propertyId.price,
                        address: enq.propertyId.address
                    });
                }
            }
        }

        const respondentsList = Array.from(respondentsMap.values()).map(r => ({
            ...r,
            properties: Array.from(r.propertiesMap.values()),
            statuses: Array.from(r.statuses),
            propertiesMap: undefined
        })).sort((a, b) => new Date(b.lastEnquiryDate) - new Date(a.lastEnquiryDate));

        // ── 2. MATCHING BUYERS CALCULATION ──────────────────────────────────
        // Determine properties to match against
        let targetPropsForMatching = [];
        if (propertyId && propertyId !== 'All' && propertyId !== 'all') {
            const single = userProperties.find(p => p._id.toString() === propertyId.toString());
            if (single) targetPropsForMatching = [single];
        } else {
            targetPropsForMatching = userProperties;
        }

        let matchingBuyersList = [];
        if (targetPropsForMatching.length > 0) {
            // Find genuine enquiries across the database with requirements that match
            const allRequirements = await Enquiry.find({
                userId: { $ne: req.user._id },
                $or: [
                    { 'requirement.text': { $ne: '' } },
                    { 'requirement.city': { $ne: '' } },
                    { 'requirement.propertyType': { $ne: '' } },
                    { 'requirement.budgetMax': { $gt: 0 } }
                ]
            })
            .populate('userId', 'name phone email avatar role')
            .populate('propertyId', 'propertyName coverImage address propertyType startingPrice price')
            .sort({ createdAt: -1 })
            .limit(100);

            const matchedBuyersMap = new Map();

            for (const reqEnq of allRequirements) {
                const buyerReq = reqEnq.requirement || {};
                const buyerCity = (buyerReq.city || '').toLowerCase().trim();
                const buyerType = (buyerReq.propertyType || '').toLowerCase().trim();
                const buyerBhk = (buyerReq.bhk || '').toLowerCase().trim();
                const buyerMaxBudget = Number(buyerReq.budgetMax) || 0;
                const buyerMinBudget = Number(buyerReq.budgetMin) || 0;
                const buyerPurpose = (buyerReq.purpose || '').toLowerCase().trim();

                for (const prop of targetPropsForMatching) {
                    const propCity = (prop.address?.city || prop.address?.locality || '').toLowerCase().trim();
                    const propType = (prop.propertyType || '').toLowerCase().trim();
                    const propBhk = (prop.buyDetails?.type || prop.buyDetails?.bhk || prop.rentDetails?.type || prop.rentDetails?.bhk || '').toLowerCase().trim();
                    const propPrice = Number(prop.buyDetails?.expectedPrice || prop.rentDetails?.monthlyRent || prop.plotDetails?.expectedPrice || prop.price || prop.startingPrice || 0);
                    const propPurpose = (prop.transactionType || '').toLowerCase().trim();

                    const matchReasons = [];
                    let score = 0;

                    // Match City
                    if (buyerCity && propCity && (propCity.includes(buyerCity) || buyerCity.includes(propCity))) {
                        matchReasons.push(`Preferred City: ${prop.address?.city || buyerReq.city}`);
                        score += 1;
                    }

                    // Match Property Type
                    if (buyerType && propType && (propType.includes(buyerType) || buyerType.includes(propType))) {
                        matchReasons.push(`Property Type: ${prop.propertyType}`);
                        score += 1;
                    }

                    // Match BHK
                    if (buyerBhk && propBhk && (propBhk.includes(buyerBhk) || buyerBhk.includes(propBhk))) {
                        matchReasons.push(`Configuration: ${buyerBhk.toUpperCase()}`);
                        score += 1;
                    }

                    // Match Purpose (Buy / Rent)
                    if (buyerPurpose && propPurpose && (propPurpose.includes(buyerPurpose) || buyerPurpose.includes(propPurpose))) {
                        matchReasons.push(`Purpose: ${propPurpose.toUpperCase()}`);
                        score += 1;
                    }

                    // Match Budget
                    if (buyerMaxBudget > 0 && propPrice > 0) {
                        const min = buyerMinBudget > 0 ? buyerMinBudget * 0.7 : 0;
                        const max = buyerMaxBudget * 1.3;
                        if (propPrice >= min && propPrice <= max) {
                            matchReasons.push('Budget matches listing price');
                            score += 1;
                        }
                    }

                    // A genuine match requires at least 2 matching criteria (or city + type)
                    if (score >= 2) {
                        const buyerKey = reqEnq.userId?._id?.toString() || reqEnq.phone || reqEnq._id.toString();
                        if (!matchedBuyersMap.has(buyerKey)) {
                            const buyerPhone = hasAccess ? reqEnq.phone : maskPhone(reqEnq.phone);
                            const buyerEmail = hasAccess ? reqEnq.email : maskEmail(reqEnq.email);

                            matchedBuyersMap.set(buyerKey, {
                                buyerId: buyerKey,
                                enquiryId: reqEnq._id,
                                name: reqEnq.userId?.name || reqEnq.name || 'Matching Buyer',
                                phone: buyerPhone,
                                email: buyerEmail,
                                avatar: reqEnq.userId?.avatar || '',
                                userType: reqEnq.userId?.role || 'Buyer',
                                isContactAuthorized: hasAccess,
                                requirement: buyerReq,
                                matchReasons,
                                score,
                                matchedProperty: {
                                    _id: prop._id,
                                    propertyName: prop.propertyName,
                                    coverImage: prop.coverImage,
                                    propertyType: prop.propertyType
                                },
                                createdAt: reqEnq.createdAt
                            });
                        }
                        break; // matched this requirement to a property
                    }
                }
            }

            matchingBuyersList = Array.from(matchedBuyersMap.values()).sort((a, b) => b.score - a.score || new Date(b.createdAt) - new Date(a.createdAt));
        }

        // ── 3. DYNAMIC COUNTS CALCULATION ───────────────────────────────────
        const counts = {
            all: processedEnquiries.length,
            contacted: processedEnquiries.filter(e => (e.status || '').toLowerCase() === 'contacted').length,
            matchingBuyers: matchingBuyersList.length,
            new: processedEnquiries.filter(e => (e.status || 'new').toLowerCase() === 'new').length,
            scheduled: processedEnquiries.filter(e => (e.status || '').toLowerCase() === 'scheduled').length,
            closed: processedEnquiries.filter(e => ['closed', 'sold', 'rented'].includes((e.status || '').toLowerCase())).length,
            dropped: processedEnquiries.filter(e => (e.status || '').toLowerCase() === 'dropped').length,
            respondentsCount: respondentsList.length
        };

        // ── 4. FILTERING RESULT FOR ALL RESPONSES ───────────────────────────
        let activeFilterName = (filter || status || 'ALL').toUpperCase();
        let filteredEnquiries = processedEnquiries;

        if (activeFilterName === 'CONTACTED') {
            filteredEnquiries = processedEnquiries.filter(e => (e.status || '').toLowerCase() === 'contacted');
        } else if (activeFilterName === 'NEW') {
            filteredEnquiries = processedEnquiries.filter(e => (e.status || 'new').toLowerCase() === 'new');
        } else if (activeFilterName === 'SCHEDULED') {
            filteredEnquiries = processedEnquiries.filter(e => (e.status || '').toLowerCase() === 'scheduled');
        } else if (activeFilterName === 'CLOSED') {
            filteredEnquiries = processedEnquiries.filter(e => ['closed', 'sold', 'rented'].includes((e.status || '').toLowerCase()));
        } else if (activeFilterName === 'DROPPED') {
            filteredEnquiries = processedEnquiries.filter(e => (e.status || '').toLowerCase() === 'dropped');
        }

        res.json({
            success: true,
            isPremium: hasAccess,
            enquiries: filteredEnquiries,
            allEnquiries: processedEnquiries,
            respondents: respondentsList,
            matchingBuyers: matchingBuyersList,
            counts
        });
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
        const { preferredDate, timeSlot, adminNotes, message } = req.body;
        const rawStatus = req.body.status;

        const ALLOWED = ['new', 'contacted', 'scheduled', 'follow-up', 'negotiation', 'closed', 'sold', 'rented', 'dropped'];
        let status = rawStatus ? (rawStatus || '').toLowerCase().trim() : undefined;

        if (status && !ALLOWED.includes(status)) {
            return res.status(400).json({ success: false, message: `Invalid status "${rawStatus}". Allowed: ${ALLOWED.join(', ')}` });
        }

        const enquiry = await Enquiry.findById(id).populate('propertyId', 'userId propertyName coverImage startingPrice price');
        if (!enquiry) {
            return res.status(404).json({ success: false, message: 'Enquiry not found' });
        }

        const prop = enquiry.propertyId;
        const isOwner =
            String(prop?.userId) === String(req.user._id) ||
            String(enquiry.brokerId) === String(req.user._id) ||
            String(enquiry.builderId) === String(req.user._id);

        const isAdmin = ['admin', 'superadmin'].includes(req.user.role);

        if (!isOwner && !isAdmin) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        if (status) enquiry.status = status;
        if (preferredDate) {
            enquiry.preferredDate = new Date(preferredDate);
            if (!status) enquiry.status = 'scheduled';
        }
        if (timeSlot !== undefined) enquiry.timeSlot = timeSlot;
        if (adminNotes !== undefined) enquiry.adminNotes = adminNotes;
        if (message !== undefined) enquiry.message = message;

        await enquiry.save();

        const updated = await Enquiry.findById(id)
            .populate('userId', 'name phone email avatar role')
            .populate('propertyId', 'propertyName coverImage address propertyType transactionType buyDetails rentDetails plotDetails pgDetails dynamicData price startingPrice userId');

        let enriched = updated.toObject();
        if (enriched.propertyId) {
            enriched.propertyId = await attachPropertyStartingPrice(enriched.propertyId);
        }

        res.json({ success: true, message: 'Enquiry updated successfully', enquiry: enriched });
    } catch (error) {
        console.error('Update Enquiry Status Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN: Get all enquiries with pagination + search + status/actionType filters
// GET /api/admin/enquiries
// ─────────────────────────────────────────────────────────────────────────────
export const adminGetAllEnquiries = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const {
            status,
            actionType,
            targetType,
            sourceContext,
            search,
            propertyId,
            brokerId,
            builderId,
            startDate,
            endDate,
            category,
            ownerBroker
        } = req.query;

        const query = {};
        if (propertyId) query.propertyId = propertyId;
        if (brokerId) query.brokerId = brokerId;
        if (builderId) query.builderId = builderId;

        if (status && status !== 'all') {
            query.status = status;
        }

        if (actionType && actionType !== 'all') {
            query.actionType = actionType;
        }

        if (targetType && targetType !== 'all') {
            query.targetType = targetType;
        }

        if (sourceContext && sourceContext !== 'all') {
            query.sourceContext = sourceContext;
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
                propertyQuery.propertyType = safeRegex(category);
            }
            if (ownerBroker) {
                if (ownerBroker === 'owner') {
                    propertyQuery.userId = { $ne: null };
                } else if (ownerBroker === 'broker') {
                    propertyQuery.userId = { $ne: null };
                }
            }

            const matchingProperties = await Property.find(propertyQuery).select('_id');
            const matchingPropertyIds = matchingProperties.map(p => p._id);

            if (matchingPropertyIds.length === 0 && !query.brokerId && !query.builderId) {
                return res.status(200).json({ success: true, enquiries: [], total: 0, page, limit });
            }

            if (query.propertyId) {
                if (!matchingPropertyIds.map(id => id.toString()).includes(query.propertyId.toString())) {
                    return res.status(200).json({ success: true, enquiries: [], total: 0, page, limit });
                }
            } else if (matchingPropertyIds.length > 0) {
                query.propertyId = { $in: matchingPropertyIds };
            }
        }

        if (search) {
            const searchRegex = safeRegex(search);
            const User = (await import('../models/User.js')).default;
            const users = await User.find({
                $or: [{ name: searchRegex }, { email: searchRegex }, { phone: searchRegex }]
            }).select('_id');

            const properties = await Property.find({ propertyName: searchRegex }).select('_id');

            query.$or = [
                { enquiryId: searchRegex },
                { name: searchRegex },
                { phone: searchRegex },
                { email: searchRegex },
                { 'requirement.text': searchRegex },
                { userId: { $in: users.map(u => u._id) } },
                { brokerId: { $in: users.map(u => u._id) } },
                { builderId: { $in: users.map(u => u._id) } },
                { propertyId: { $in: properties.map(p => p._id) } }
            ];
        }

        const total = await Enquiry.countDocuments(query);
        const enquiries = await Enquiry.find(query)
            .populate('userId', 'name email phone avatar')
            .populate('brokerId', 'name email phone avatar address role')
            .populate('builderId', 'name email phone avatar address role builderProfile')
            .populate({
                path: 'propertyId',
                select: 'propertyName coverImage address buyDetails rentDetails plotDetails pgDetails propertyType transactionType userId dynamicData price startingPrice',
                populate: [
                    { path: 'userId', select: 'name phone email role' }
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


// ─────────────────────────────────────────────────────────────────────────────
// ADMIN: Subscription leads — listers who hit the paywall (free access ended /
// limit reached / subscription required). Reuses the Enquiry collection; status
// changes go through the existing PUT /api/admin/enquiries/:id.
// GET /api/admin/subscription-leads
//   ?status=open|all|<status>  &reason=trial_expired|limit_reached|subscription_required
//   &search=  &page=  &limit=
// ─────────────────────────────────────────────────────────────────────────────
export const adminGetSubscriptionLeads = async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
        const { status = 'open', reason, search } = req.query;

        const RESOLVED = ['closed', 'sold', 'rented', 'dropped'];
        const base = { actionType: 'subscription_required' };
        const query = { ...base };

        if (status === 'open') query.status = { $nin: RESOLVED };
        else if (status && status !== 'all') query.status = status;

        if (reason && reason !== 'all') query['subscriptionLead.reason'] = reason;

        if (search) {
            const rx = safeRegex(search);
            query.$or = [{ name: rx }, { phone: rx }, { email: rx }, { enquiryId: rx }, { message: rx }];
        }

        const [total, leads, openCount, byReason] = await Promise.all([
            Enquiry.countDocuments(query),
            Enquiry.find(query)
                .populate('userId', 'name email phone avatar role builderProfile')
                .sort({ updatedAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit),
            Enquiry.countDocuments({ ...base, status: { $nin: RESOLVED } }),
            Enquiry.aggregate([
                { $match: { ...base, status: { $nin: RESOLVED } } },
                { $group: { _id: '$subscriptionLead.reason', count: { $sum: 1 } } }
            ])
        ]);

        res.status(200).json({
            success: true,
            leads,
            total,
            page,
            limit,
            counts: {
                open: openCount,
                byReason: Object.fromEntries(byReason.map((r) => [r._id || 'unknown', r.count]))
            }
        });
    } catch (error) {
        console.error('Admin Get Subscription Leads Error:', error);
        res.status(500).json({ success: false, message: 'Server error fetching subscription leads' });
    }
};
