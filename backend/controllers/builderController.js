import User from '../models/User.js';
import bcrypt from 'bcryptjs';

// @desc    Get all builders
// @route   GET /api/admin/builders
// @access  Private (Admin/Manager)
export const getBuilders = async (req, res) => {
  try {
    const builders = await User.find({ role: 'builder' }).sort({ createdAt: -1 });
    res.json({ success: true, builders });
  } catch (error) {
    console.error('Get Builders Error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching builders' });
  }
};

// @desc    Add new builder (from admin)
// @route   POST /api/admin/builders
// @access  Private (Admin/Manager)
export const addBuilder = async (req, res) => {
  try {
    const { name, email, phone, builderProfile } = req.body;
    
    if (!name || !phone) {
      return res.status(400).json({ success: false, message: 'Name and phone are required' });
    }

    // check if user already exists
    const query = [{ phone }];
    if (email) query.push({ email });
    const existingUser = await User.findOne({ $or: query });
    
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'User with this phone or email already exists' });
    }

    const passwordHash = await bcrypt.hash(Math.random().toString(36), 10);
    
    const builder = new User({
      name,
      email: email || undefined,
      phone,
      role: 'builder',
      isVerified: true,
      password: passwordHash,
      builderProfile: builderProfile || {}
    });

    await builder.save();
    res.status(201).json({ success: true, builder, message: 'Builder created successfully' });
  } catch (error) {
    console.error('Add Builder Error:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error creating builder' });
  }
};

// @desc    Update builder
// @route   PUT /api/admin/builders/:id
// @access  Private (Admin/Manager)
export const updateBuilder = async (req, res) => {
  try {
    const builder = await User.findById(req.params.id);
    if (!builder || builder.role !== 'builder') {
      return res.status(404).json({ success: false, message: 'Builder not found' });
    }

    builder.name = req.body.name || builder.name;
    if (req.body.email) builder.email = req.body.email;
    if (req.body.phone) builder.phone = req.body.phone;

    if (req.body.builderProfile) {
      builder.builderProfile = {
        ...(builder.builderProfile ? builder.builderProfile.toObject() : {}),
        ...req.body.builderProfile
      };
    }

    await builder.save();
    res.json({ success: true, builder, message: 'Builder updated successfully' });
  } catch (error) {
    console.error('Update Builder Error:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error updating builder' });
  }
};

// @desc    Delete builder
// @route   DELETE /api/admin/builders/:id
// @access  Private (Admin/Manager)
export const deleteBuilder = async (req, res) => {
  try {
    const builder = await User.findById(req.params.id);
    if (!builder || builder.role !== 'builder') {
      return res.status(404).json({ success: false, message: 'Builder not found' });
    }
    
    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Builder deleted successfully' });
  } catch (error) {
    console.error('Delete Builder Error:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error deleting builder' });
  }
};
