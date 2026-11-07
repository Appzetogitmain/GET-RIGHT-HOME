import Admin from '../models/Admin.js';
import bcrypt from 'bcryptjs';

export const seedAdminOnStartup = async () => {
  try {
    const targetEmail = process.env.DEFAULT_ADMIN_EMAIL || 'getrighthome7@gmail.com';
    const targetPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'GrhAdmin@123';

    const existingAdmin = await Admin.findOne({ email: targetEmail });

    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash(targetPassword, 10);
      await Admin.create({
        name: 'Get Right Home Admin',
        email: targetEmail,
        phone: '6304471791',
        password: hashedPassword,
        role: 'superadmin',
        isActive: true
      });
      console.log(`✅ Default Superadmin created: ${targetEmail}`);
    }
  } catch (err) {
    console.error('❌ Auto-seeding admin failed on startup:', err.message);
  }
};
