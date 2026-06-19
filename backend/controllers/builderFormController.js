import BuilderFormTemplate from '../models/BuilderFormTemplate.js';

// Get a specific template based on transaction, category, and property type
export const getBuilderTemplate = async (req, res) => {
    try {
        let { transactionType, category, propertyType } = req.query;

        if (!transactionType || !category || !propertyType) {
            return res.status(400).json({ success: false, message: "Missing required query parameters: transactionType, category, propertyType" });
        }

        const template = await BuilderFormTemplate.findOne({ 
            transactionType, 
            category, 
            propertyType,
            isActive: true 
        });

        if (!template) {
            return res.status(404).json({ success: false, message: "No builder form template found for this configuration." });
        }

        res.status(200).json({ success: true, template });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Admin: Create or Update a builder template
export const saveBuilderTemplate = async (req, res) => {
    try {
        const { transactionType, category, propertyType, steps } = req.body;

        if (!transactionType || !category || !propertyType || !steps) {
            return res.status(400).json({ success: false, message: "Missing required fields." });
        }

        const template = await BuilderFormTemplate.findOneAndUpdate(
            { transactionType, category, propertyType },
            { steps },
            { new: true, upsert: true }
        );

        res.status(200).json({ success: true, template, message: "Builder template saved successfully." });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get all unique combinations to show in Step 1
export const getAvailableBuilderConfigurations = async (req, res) => {
    try {
        const configs = await BuilderFormTemplate.aggregate([
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

export const seedBuilderTemplatesController = async (req, res) => {
    try {
        // Need to run the seedBuilderForms.js script or we can just return a message saying run the script.
        // Or we could move the generation logic here, but the script is already written.
        res.status(200).json({ success: true, message: "Please run `node backend/scripts/seedBuilderForms.js` in terminal to seed builder forms." });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
