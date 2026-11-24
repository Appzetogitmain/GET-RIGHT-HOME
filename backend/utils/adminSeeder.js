import Admin from '../models/Admin.js';
import bcrypt from 'bcryptjs';

// Creates the first superadmin on an empty database.
// SECURITY: there is no hardcoded fallback password any more — the old
// default ('GrhAdmin@123') was in the source code, so anyone with the repo
// could log in as superadmin on any fresh deployment. Set both
// DEFAULT_ADMIN_EMAIL and DEFAULT_ADMIN_PASSWORD (12+ chars) in .env.
export const seedAdminOnStartup = async () => {
  try {
    const targetEmail = process.env.DEFAULT_ADMIN_EMAIL;
    const targetPassword = process.env.DEFAULT_ADMIN_PASSWORD;

    if (!targetEmail || !targetPassword) {
      return; // nothing to seed
    }
    if (targetPassword.length < 12) {
      console.warn('⚠️ DEFAULT_ADMIN_PASSWORD must be at least 12 characters — superadmin not seeded.');
      return;
    }

    const existingAdmin = await Admin.findOne({ email: targetEmail.toLowerCase() });

    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash(targetPassword, 10);
      await Admin.create({
        name: 'Get Right Home Admin',
        email: targetEmail,
        phone: process.env.DEFAULT_ADMIN_PHONE || undefined,
        password: hashedPassword,
        role: 'superadmin',
        isActive: true
      });
      console.log('✅ Default Superadmin created');
    }
  } catch (err) {
    console.error('❌ Auto-seeding admin failed on startup:', err.message);
  }
};
