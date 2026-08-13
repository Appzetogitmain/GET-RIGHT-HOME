import LocalityInsight from '../models/LocalityInsight.js';
import { safeRegex } from '../utils/escapeRegex.js';

// @desc    Create or Update Locality Insight (Admin)
// @route   POST /api/admin/insights
// @access  Private/Admin
export const saveInsight = async (req, res) => {
    try {
        const { locality, city, coverImage, transactionType, pros, cons, upcomingDevelopments, landmarks, residentialZones, midSegmentLocality } = req.body;

        if (!locality || !city) {
            return res.status(400).json({ success: false, message: 'Locality and City are required' });
        }

        // Check if insight already exists
        let insight = await LocalityInsight.findOne({ locality: { $regex: safeRegex(locality, { exact: true }) }, city: { $regex: safeRegex(city, { exact: true }) } });

        if (insight) {
            // Update existing
            insight.coverImage = coverImage || insight.coverImage;
            insight.transactionType = transactionType || insight.transactionType;
            insight.pros = pros || insight.pros;
            insight.cons = cons || insight.cons;
            insight.upcomingDevelopments = upcomingDevelopments || insight.upcomingDevelopments;
            insight.landmarks = landmarks || insight.landmarks;
            insight.residentialZones = residentialZones || insight.residentialZones;
            insight.midSegmentLocality = midSegmentLocality !== undefined ? midSegmentLocality : insight.midSegmentLocality;
            
            await insight.save();
        } else {
            // Create new
            insight = await LocalityInsight.create({
                locality, city, coverImage, transactionType, pros, cons, upcomingDevelopments, landmarks, residentialZones, midSegmentLocality
            });
        }

        res.status(200).json({ success: true, insight });
    } catch (error) {
        console.error("Error saving insight:", error);
        res.status(500).json({ success: false, message: "Failed to save insight" });
    }
};

// @desc    Get all insights for admin panel
// @route   GET /api/admin/insights
// @access  Private/Admin
export const getAllInsights = async (req, res) => {
    try {
        const insights = await LocalityInsight.find().sort({ createdAt: -1 });
        res.status(200).json({ success: true, insights });
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to fetch insights" });
    }
};

// @desc    Delete an insight
// @route   DELETE /api/admin/insights/:id
// @access  Private/Admin
export const deleteInsight = async (req, res) => {
    try {
        await LocalityInsight.findByIdAndDelete(req.params.id);
        res.status(200).json({ success: true, message: 'Insight deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to delete insight" });
    }
};
