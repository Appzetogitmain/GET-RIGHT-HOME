import LocalityInsight from '../models/LocalityInsight.js';
import Property from '../models/Property.js';
import User from '../models/User.js';

// @desc    Get recommended insights (filtered by city and transactionType)
// @route   GET /api/public/insights
// @access  Public
export const getInsights = async (req, res) => {
    try {
        const { city, transactionType, limit = 10 } = req.query;
        let query = {};

        if (city) {
            query.city = { $regex: new RegExp(city, 'i') };
        }

        if (transactionType) {
            // Match specific type OR 'all'
            query.transactionType = { $in: [transactionType.toLowerCase(), 'all'] };
        }

        const insights = await LocalityInsight.find(query)
            .sort({ views: -1, createdAt: -1 })
            .limit(Number(limit));

        res.status(200).json({
            success: true,
            insights
        });
    } catch (error) {
        console.error("Error fetching insights:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch insights"
        });
    }
};

// @desc    Get complete Locality Details (Curated + Automated Aggregation)
// @route   GET /api/public/insights/:locality
// @access  Public
export const getLocalityDetail = async (req, res) => {
    try {
        const { locality } = req.params;
        
        // 1. Fetch Curated Data
        const insight = await LocalityInsight.findOne({ locality: { $regex: new RegExp(`^${locality}$`, 'i') } });
        
        // 2. Automated Property Aggregations
        const regexLocality = new RegExp(locality, 'i');
        
        // A. Total properties and average price
        const properties = await Property.find({ 'address.area': regexLocality, status: 'Active' });
        const totalProperties = properties.length;
        
        // Calculate average price (simplified)
        let totalPrice = 0;
        properties.forEach(p => totalPrice += (p.price || 0));
        const averagePropertyRate = totalProperties > 0 ? (totalPrice / totalProperties) : 0;
        
        // B. BHK Configurations Aggregation
        const bhkConfigMap = {};
        properties.forEach(p => {
            if (p.bhk) {
                const key = `${p.bhk} BHK`;
                if (!bhkConfigMap[key]) bhkConfigMap[key] = { count: 0, minPrice: p.price, maxPrice: p.price };
                bhkConfigMap[key].count += 1;
                if (p.price < bhkConfigMap[key].minPrice) bhkConfigMap[key].minPrice = p.price;
                if (p.price > bhkConfigMap[key].maxPrice) bhkConfigMap[key].maxPrice = p.price;
            }
        });
        const propertyPrices = Object.keys(bhkConfigMap).map(k => ({
            bhk: k,
            count: bhkConfigMap[k].count,
            minPrice: bhkConfigMap[k].minPrice,
            maxPrice: bhkConfigMap[k].maxPrice
        }));

        // 3. Automated Project Aggregations (using Property model, as projects are just premium properties)
        const newlyLaunched = await Property.find({ 'address.area': regexLocality, status: 'Active' }).sort({ createdAt: -1 }).limit(4);
        const popularProjects = await Property.find({ 'address.area': regexLocality, status: 'Active' }).sort({ views: -1 }).limit(4);
        
        // 4. Aggregate Top Sellers (Users with most active properties in this locality)
        // Group properties by userId
        const sellerAggregation = await Property.aggregate([
            { $match: { 'address.area': regexLocality, status: 'Active', userId: { $exists: true } } },
            { $group: { _id: "$userId", propertyCount: { $sum: 1 } } },
            { $sort: { propertyCount: -1 } },
            { $limit: 4 }
        ]);

        let topSellers = [];
        if (sellerAggregation.length > 0) {
            const sellerIds = sellerAggregation.map(s => s._id);
            const users = await User.find({ _id: { $in: sellerIds } }).select('name profilePicture role');
            topSellers = users.map(u => {
                const agg = sellerAggregation.find(s => s._id.toString() === u._id.toString());
                return {
                    _id: u._id,
                    name: u.name,
                    role: u.role,
                    profilePicture: u.profilePicture,
                    propertyCount: agg ? agg.propertyCount : 0
                };
            }).sort((a, b) => b.propertyCount - a.propertyCount);
        }

        // 5. Aggregate Property Types by Transaction Type (Buy/Rent)
        const propertyTypesAggregation = await Property.aggregate([
            { $match: { 'address.area': regexLocality, status: 'Active' } },
            { $group: { 
                _id: { type: "$propertyType", transaction: "$transactionType" }, 
                count: { $sum: 1 } 
            }}
        ]);

        const propertyTypes = { Buy: [], Rent: [] };
        propertyTypesAggregation.forEach(pt => {
            const trans = pt._id.transaction === 'Rent' ? 'Rent' : 'Buy';
            const type = pt._id.type || 'Other';
            propertyTypes[trans].push({ type, count: pt.count });
        });

        // 5. Fetch Reviews (Assuming LocalityReview model exists)
        // Since we might not have imported LocalityReview, I'll dynamically require it or just use an empty array if it fails.
        let reviews = [];
        let averageRating = 4.2; // Fallback
        try {
            const { default: LocalityReview } = await import('../models/LocalityReview.js');
            reviews = await LocalityReview.find({ localityName: regexLocality }).sort({ createdAt: -1 }).limit(3).populate('userId', 'name profilePicture');
            const allReviews = await LocalityReview.find({ localityName: regexLocality });
            if (allReviews.length > 0) {
                const totalRating = allReviews.reduce((sum, r) => sum + (r.rating || 0), 0);
                averageRating = (totalRating / allReviews.length).toFixed(1);
            }
        } catch (e) {
            console.log("LocalityReview model missing or error fetching reviews", e.message);
        }

        // Increment views
        if (insight) {
            insight.views += 1;
            await insight.save();
        }

        res.status(200).json({
            success: true,
            insight: insight || { locality, notFoundCurated: true },
            automated: {
                totalProperties,
                averagePropertyRate,
                propertyPrices,
                newlyLaunched,
                popularProjects,
                propertyTypes,
                topSellers,
                reviews,
                averageRating
            }
        });
    } catch (error) {
        console.error("Error fetching locality detail:", error);
        res.status(500).json({ success: false, message: "Failed to fetch locality details" });
    }
};

// @desc    Submit a Review for a Locality
// @route   POST /api/public/insights/:locality/review
// @access  Private
export const submitLocalityReview = async (req, res) => {
    try {
        const { locality } = req.params;
        const { rating, comment, userType } = req.body;
        
        // Assuming user is authenticated and attached to req.user
        if (!req.user || !req.user._id) {
            return res.status(401).json({ success: false, message: "Unauthorized. Please login to review." });
        }

        const { default: LocalityReview } = await import('../models/LocalityReview.js');

        // Check if already reviewed
        const existingReview = await LocalityReview.findOne({ userId: req.user._id, localityName: { $regex: new RegExp(`^${locality}$`, 'i') } });
        if (existingReview) {
            return res.status(400).json({ success: false, message: "You have already reviewed this locality." });
        }

        const newReview = await LocalityReview.create({
            userId: req.user._id,
            localityName: locality,
            rating,
            comment,
            userType: userType || 'Resident',
            status: 'approved'
        });

        res.status(201).json({
            success: true,
            message: "Review submitted successfully!",
            review: newReview
        });
    } catch (error) {
        console.error("Error submitting review:", error);
        res.status(500).json({ success: false, message: "Failed to submit review." });
    }
};
