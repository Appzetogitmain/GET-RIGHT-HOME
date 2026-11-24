import HomePageConfig from '../models/HomePageConfig.js';

const DEFAULT_SECTIONS = [
  { id: 'video_curations', name: 'Exclusive Property Tours', isVisible: true },
  { id: 'featured_properties', name: 'Featured Properties', isVisible: true },
  { id: 'admin_curated', name: 'Handpicked Projects', isVisible: true },
  { id: 'pg_stays', name: 'Scholar & Professional Stays', isVisible: true },
  { id: 'recommended_brokers', name: 'Recommended Brokers', isVisible: true },
  { id: 'popular_builders', name: 'Popular Builders', isVisible: true },
  { id: 'reels', name: 'Reels Section', isVisible: true },
  { id: 'rent_properties', name: 'Properties for Rent', isVisible: true },
  { id: 'buy_properties', name: 'Dream Homes for Sale', isVisible: true },
  { id: 'plot_properties', name: 'Premium Plots & Land', isVisible: true },
  { id: 'under_construction', name: 'Under Construction Properties', isVisible: true },
  { id: 'pre_launch', name: 'Pre Launch Properties', isVisible: true },
  { id: 'ready_to_move', name: 'Ready to move in properties', isVisible: true }
];

export const getHomePageConfig = async (req, res) => {
  try {
    let config = await HomePageConfig.findOne();
    if (!config) {
      // Create default config if it doesn't exist
      config = await HomePageConfig.create({ sections: DEFAULT_SECTIONS });
    } else {
      // Layouts saved before a section existed don't list it, so it would
      // never render. Insert any missing defaults at their default position.
      const existingIds = new Set(config.sections.map(s => s.id));
      const missing = DEFAULT_SECTIONS.filter(s => !existingIds.has(s.id));
      if (missing.length) {
        missing.forEach(sec => {
          const defIdx = DEFAULT_SECTIONS.findIndex(d => d.id === sec.id);
          const nextDefault = DEFAULT_SECTIONS.slice(defIdx + 1).find(d => existingIds.has(d.id));
          const at = nextDefault ? config.sections.findIndex(s => s.id === nextDefault.id) : -1;
          if (at >= 0) config.sections.splice(at, 0, sec);
          else config.sections.push(sec);
          existingIds.add(sec.id);
        });
        await config.save();
      }
    }
    res.status(200).json({ success: true, sections: config.sections });
  } catch (error) {
    console.error('Error fetching home page config:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const updateHomePageConfig = async (req, res) => {
  try {
    const { sections } = req.body;
    
    if (!sections || !Array.isArray(sections)) {
      return res.status(400).json({ success: false, message: 'Invalid sections data' });
    }

    let config = await HomePageConfig.findOne();
    if (!config) {
      config = new HomePageConfig({ sections, updatedBy: req.admin?.id });
    } else {
      config.sections = sections;
      config.updatedBy = req.admin?.id;
    }
    
    await config.save();
    res.status(200).json({ success: true, message: 'Home page layout updated successfully', sections: config.sections });
  } catch (error) {
    console.error('Error updating home page config:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
