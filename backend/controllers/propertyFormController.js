import PropertyFormTemplate from '../models/PropertyFormTemplate.js';

// Get a specific template based on transaction, category, and property type
export const getTemplate = async (req, res) => {
    try {
        const { transactionType, category, propertyType } = req.query;

        // If not specific enough, return list of available combinations or error
        if (!transactionType || !category || !propertyType) {
            return res.status(400).json({ success: false, message: "Missing required query parameters: transactionType, category, propertyType" });
        }

        const template = await PropertyFormTemplate.findOne({ 
            transactionType, 
            category, 
            propertyType,
            isActive: true 
        });

        if (!template) {
            return res.status(404).json({ success: false, message: "No form template found for this configuration." });
        }

        res.status(200).json({ success: true, template });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Admin: Create or Update a template
export const saveTemplate = async (req, res) => {
    try {
        const { transactionType, category, propertyType, steps } = req.body;

        if (!transactionType || !category || !propertyType || !steps) {
            return res.status(400).json({ success: false, message: "Missing required fields." });
        }

        const template = await PropertyFormTemplate.findOneAndUpdate(
            { transactionType, category, propertyType },
            { steps },
            { new: true, upsert: true }
        );

        res.status(200).json({ success: true, template, message: "Template saved successfully." });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get all unique combinations to show in Step 1
export const getAvailableConfigurations = async (req, res) => {
    try {
        // Aggregate to get unique transactionType -> categories -> propertyTypes
        const configs = await PropertyFormTemplate.aggregate([
            { $match: { isActive: true } },
            {
                $group: {
                    _id: {
                        transactionType: "$transactionType",
                        category: "$category"
                    },
                    propertyTypes: { $addToSet: "$propertyType" }
                }
            },
            {
                $group: {
                    _id: "$_id.transactionType",
                    categories: {
                        $push: {
                            category: "$_id.category",
                            propertyTypes: "$propertyTypes"
                        }
                    }
                }
            },
            {
                $project: {
                    _id: 0,
                    transactionType: "$_id",
                    categories: 1
                }
            }
        ]);

        res.status(200).json({ success: true, configs });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
