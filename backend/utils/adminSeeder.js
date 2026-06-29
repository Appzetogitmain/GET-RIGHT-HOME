import Admin from '../models/Admin.js';
import bcrypt from 'bcryptjs';

export const seedAdminOnStartup = async () => {
  try {
    // Use environment variables for secure credential seeding
    const targetEmail = process.env.DEFAULT_ADMIN_EMAIL;
    const targetPassword = process.env.DEFAULT_ADMIN_PASSWORD;

    // Only attempt to seed/update if environment variables are explicitly provided
    if (!targetEmail || !targetPassword) {
      console.log('ℹ️ DEFAULT_ADMIN_EMAIL or DEFAULT_ADMIN_PASSWORD not set. Skipping admin auto-seed.');
      return;
    }

    const hashedPassword = await bcrypt.hash(targetPassword, 10);
    const existingAdmin = await Admin.findOne({ email: targetEmail });

    if (!existingAdmin) {
      await Admin.create({
        name: 'Get Right Home Admin',
        email: targetEmail,
        phone: '9999999999',
        password: hashedPassword,
        role: 'superadmin',
        isActive: true
      });
      console.log('✅ Admin user created securely via environment variables.');
    }
  } catch (err) {
    console.error('❌ Auto-seeding admin failed on startup:', err.message);
  }
};
