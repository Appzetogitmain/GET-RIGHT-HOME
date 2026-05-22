// controllers/locationController.js
import Location from '../models/Location.js';

/* ─────────────────────────────────────────────
   PUBLIC ENDPOINTS (no auth required)
───────────────────────────────────────────── */

/**
 * GET /api/locations/countries
 * Returns all active countries
 */
export const getCountries = async (req, res) => {
  try {
    const countries = await Location.find({ type: 'country', isActive: true })
      .sort({ sortOrder: 1, name: 1 })
      .select('_id name');
    res.json({ success: true, data: countries });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

/**
 * GET /api/locations/states?countryId=xxx
 * Returns active states for a country
 */
export const getStates = async (req, res) => {
  try {
    const { countryId } = req.query;
    if (!countryId) return res.status(400).json({ success: false, message: 'countryId required' });

    const states = await Location.find({ type: 'state', parentId: countryId, isActive: true })
      .sort({ sortOrder: 1, name: 1 })
      .select('_id name parentId');
    res.json({ success: true, data: states });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

/**
 * GET /api/locations/districts?stateId=xxx
 * Returns active districts for a state
 */
export const getDistricts = async (req, res) => {
  try {
    const { stateId } = req.query;
    if (!stateId) return res.status(400).json({ success: false, message: 'stateId required' });

    const districts = await Location.find({ type: 'district', parentId: stateId, isActive: true })
      .sort({ sortOrder: 1, name: 1 })
      .select('_id name parentId breadcrumb');
    res.json({ success: true, data: districts });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

/**
 * GET /api/locations/cities?districtId=xxx
 * Returns active cities/areas for a district
 */
export const getCities = async (req, res) => {
  try {
    const { districtId } = req.query;
    if (!districtId) return res.status(400).json({ success: false, message: 'districtId required' });

    let cities = await Location.find({ type: 'city', parentId: districtId, isActive: true })
      .sort({ sortOrder: 1, name: 1 })
      .select('_id name parentId breadcrumb');

    if (cities.length === 0) {
      const district = await Location.findById(districtId);
      if (district) {
        cities = [{
          _id: district._id,
          name: district.name,
          parentId: districtId,
          breadcrumb: district.breadcrumb
        }];
      }
    }

    res.json({ success: true, data: cities });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

/**
 * GET /api/locations/tree
 * Returns full active tree (for dropdowns that need everything at once)
 * Structure: [{ country, states: [{ state, districts: [{ district, cities: [] }] }] }]
 */
export const getFullTree = async (req, res) => {
  try {
    const all = await Location.find({ isActive: true })
      .sort({ sortOrder: 1, name: 1 })
      .select('_id name type parentId breadcrumb');

    const countries = all.filter(l => l.type === 'country');
    const states    = all.filter(l => l.type === 'state');
    const districts = all.filter(l => l.type === 'district');
    const cities    = all.filter(l => l.type === 'city');

    const tree = countries.map(country => ({
      _id: country._id,
      name: country.name,
      states: states
        .filter(s => String(s.parentId) === String(country._id))
        .map(state => ({
          _id: state._id,
          name: state.name,
          districts: districts
            .filter(d => String(d.parentId) === String(state._id))
            .map(district => ({
              _id: district._id,
              name: district.name,
              cities: cities
                .filter(c => String(c.parentId) === String(district._id))
                .map(city => ({ _id: city._id, name: city.name }))
            }))
        }))
    }));

    res.json({ success: true, data: tree });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

/* ─────────────────────────────────────────────
   ADMIN ENDPOINTS (auth required)
───────────────────────────────────────────── */

/**
 * GET /api/locations (admin) — all locations with pagination
 */
export const getAllLocations = async (req, res) => {
  try {
    const { type, parentId, page = 1, limit = 100 } = req.query;
    const filter = {};
    if (type) filter.type = type;
    if (parentId) filter.parentId = parentId;

    const [data, total] = await Promise.all([
      Location.find(filter)
        .sort({ type: 1, sortOrder: 1, name: 1 })
        .skip((page - 1) * limit)
        .limit(Number(limit))
        .populate('parentId', 'name type'),
      Location.countDocuments(filter)
    ]);

    res.json({ success: true, data, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

/**
 * POST /api/locations (admin) — create a location
 */
export const createLocation = async (req, res) => {
  try {
    const { name, type, parentId, sortOrder } = req.body;
    if (!name || !type) return res.status(400).json({ success: false, message: 'name and type required' });

    // Build breadcrumb
    let breadcrumb = { country: '', state: '', district: '' };
    if (parentId) {
      const parent = await Location.findById(parentId);
      if (parent) {
        if (parent.type === 'country') breadcrumb.country = parent.name;
        if (parent.type === 'state') {
          breadcrumb.state = parent.name;
          breadcrumb.country = parent.breadcrumb?.country || '';
        }
        if (parent.type === 'district') {
          breadcrumb.district = parent.name;
          breadcrumb.state = parent.breadcrumb?.state || '';
          breadcrumb.country = parent.breadcrumb?.country || '';
        }
      }
    }

    const location = await Location.create({ name, type, parentId: parentId || null, breadcrumb, sortOrder: sortOrder || 0 });
    res.status(201).json({ success: true, data: location });
  } catch (e) {
    if (e.code === 11000) return res.status(400).json({ success: false, message: 'Duplicate entry' });
    res.status(500).json({ success: false, message: e.message });
  }
};

/**
 * PUT /api/locations/:id (admin) — update a location
 */
export const updateLocation = async (req, res) => {
  try {
    const { name, isActive, sortOrder } = req.body;
    const location = await Location.findByIdAndUpdate(
      req.params.id,
      { ...(name && { name }), ...(isActive !== undefined && { isActive }), ...(sortOrder !== undefined && { sortOrder }) },
      { new: true }
    );
    if (!location) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: location });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

/**
 * DELETE /api/locations/:id (admin) — soft delete (deactivate) a location
 */
export const deleteLocation = async (req, res) => {
  try {
    const location = await Location.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!location) return res.status(404).json({ success: false, message: 'Not found' });

    // Also deactivate all children
    const deactivateChildren = async (parentId) => {
      const children = await Location.find({ parentId });
      for (const child of children) {
        await Location.findByIdAndUpdate(child._id, { isActive: false });
        await deactivateChildren(child._id);
      }
    };
    await deactivateChildren(location._id);

    res.json({ success: true, message: 'Location and its children deactivated' });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

/**
 * PATCH /api/locations/:id/toggle (admin) — toggle active status
 */
export const toggleLocation = async (req, res) => {
  try {
    const location = await Location.findById(req.params.id);
    if (!location) return res.status(404).json({ success: false, message: 'Not found' });
    location.isActive = !location.isActive;
    await location.save();
    res.json({ success: true, data: location });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};
