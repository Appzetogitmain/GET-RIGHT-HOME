import City from '../models/City.js';

export const getAllCities = async (req, res) => {
  try {
    const cities = await City.find().sort({ name: 1 });
    res.json({ success: true, cities });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getActiveCities = async (req, res) => {
  try {
    const cities = await City.find({ isActive: true }).sort({ name: 1 });
    res.json({ success: true, cities });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createCity = async (req, res) => {
  try {
    const city = await City.create(req.body);
    res.status(201).json({ success: true, city });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const updateCity = async (req, res) => {
  try {
    const city = await City.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, city });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const deleteCity = async (req, res) => {
  try {
    await City.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'City deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const toggleCityStatus = async (req, res) => {
  try {
    const city = await City.findById(req.params.id);
    city.isActive = !city.isActive;
    await city.save();
    res.json({ success: true, city });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
