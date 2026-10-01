import mongoose from 'mongoose';
import Profession from '../models/Profession.js';
import HomeServiceCategory from '../models/HomeServiceCategory.js';
import Worker from '../models/Worker.js';
import { safeRegex } from '../utils/escapeRegex.js';

const cleanIds = (ids) => [...new Set((Array.isArray(ids) ? ids : []).map(String))]
  .filter((id) => mongoose.Types.ObjectId.isValid(id));

// A worker holds a profession when its name is among their approved
// serviceCategories (the skills list they pick in their profile).
const withWorkerCounts = (professions) => Promise.all(professions.map(async (p) => ({
  ...p,
  workerCount: await Worker.countDocuments({ serviceCategories: safeRegex(p.name, { exact: true }) })
})));

/** Admin: all professions with their categories and worker counts. */
export const getProfessions = async (req, res) => {
  try {
    const professions = await Profession.find()
      .populate('categoryIds', 'title slug imageUrl')
      .sort({ name: 1 })
      .lean();
    res.json({ success: true, data: await withWorkerCounts(professions) });
  } catch (error) {
    console.error('Get professions error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch professions' });
  }
};

/** Worker: active professions a worker can choose from. */
export const getActiveProfessions = async (req, res) => {
  try {
    const professions = await Profession.find({ isActive: true })
      .populate('categoryIds', 'title slug')
      .sort({ name: 1 })
      .lean();
    res.json({ success: true, data: professions });
  } catch (error) {
    console.error('Get active professions error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch professions' });
  }
};

const saveProfession = async (profession, body) => {
  const { name, description, categoryIds, isActive } = body;
  if (name !== undefined) profession.name = String(name).trim();
  if (description !== undefined) profession.description = String(description).trim();
  if (isActive !== undefined) profession.isActive = !!isActive;
  if (categoryIds !== undefined) {
    const ids = cleanIds(categoryIds);
    const found = await HomeServiceCategory.countDocuments({ _id: { $in: ids } });
    if (found !== ids.length) {
      const err = new Error('One or more selected categories do not exist');
      err.status = 400;
      throw err;
    }
    profession.categoryIds = ids;
  }
  if (!profession.name) {
    const err = new Error('Profession name is required');
    err.status = 400;
    throw err;
  }
  await profession.save();
  return Profession.findById(profession._id).populate('categoryIds', 'title slug imageUrl').lean();
};

const fail = (res, error, label) => {
  if (error.status) return res.status(error.status).json({ success: false, message: error.message });
  if (error.code === 11000) return res.status(409).json({ success: false, message: 'A profession with this name already exists' });
  console.error(`${label} error:`, error);
  return res.status(500).json({ success: false, message: `Failed to ${label}` });
};

export const createProfession = async (req, res) => {
  try {
    const data = await saveProfession(new Profession(), req.body || {});
    res.status(201).json({ success: true, message: 'Profession created', data });
  } catch (error) {
    fail(res, error, 'create profession');
  }
};

export const updateProfession = async (req, res) => {
  try {
    const profession = await Profession.findById(req.params.id);
    if (!profession) return res.status(404).json({ success: false, message: 'Profession not found' });
    const data = await saveProfession(profession, req.body || {});
    res.json({ success: true, message: 'Profession updated', data });
  } catch (error) {
    fail(res, error, 'update profession');
  }
};

export const deleteProfession = async (req, res) => {
  try {
    const profession = await Profession.findByIdAndDelete(req.params.id);
    if (!profession) return res.status(404).json({ success: false, message: 'Profession not found' });
    res.json({ success: true, message: 'Profession deleted' });
  } catch (error) {
    fail(res, error, 'delete profession');
  }
};
