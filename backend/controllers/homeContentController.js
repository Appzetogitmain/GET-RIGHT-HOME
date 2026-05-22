import HomeContent from '../models/HomeContent.js';

export const getHomeContent = async (req, res) => {
  try {
    const { cityId = 'default' } = req.query;
    let homeContent = await HomeContent.findOne({ cityId });
    
    if (!homeContent) {
      // Create default if not found
      homeContent = await HomeContent.create({ cityId });
    }
    
    res.json({ success: true, homeContent });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateHomeContent = async (req, res) => {
  try {
    const { cityId = 'default' } = req.query;
    const updateData = req.body;
    
    const homeContent = await HomeContent.findOneAndUpdate(
      { cityId },
      { $set: updateData },
      { new: true, upsert: true }
    );
    
    res.json({ success: true, homeContent });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getPublicHomeContent = async (req, res) => {
  try {
    const { cityId = 'default' } = req.query;
    let homeContent = await HomeContent.findOne({ cityId });
    
    if (!homeContent && cityId !== 'default') {
      // Fallback to default city content if not found for specific city
      homeContent = await HomeContent.findOne({ cityId: 'default' });
    }
    
    if (!homeContent) {
      // Create default if none exists at all
      homeContent = await HomeContent.create({ cityId: 'default' });
    }
    
    res.json({ success: true, homeContent });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
