import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
dotenv.config();

// Connect to MongoDB
const MONGO_URI = process.env.MONGODB_URL || 'mongodb://localhost:27017/homezoo';

async function seedAdmin() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB');

        const Admin = mongoose.model('Admin', new mongoose.Schema({
            name: String,
            email: { type: String, unique: true, lowercase: true },
            phone: String,
            password: { type: String, select: false },
            role: { type: String, default: 'superadmin' },
            permissions: { type: [String], default: ['read', 'write', 'update', 'delete'] },
            isActive: { type: Boolean, default: true },
            lastLogin: Date,
            profileImage: String,
        }, { timestamps: true }));

        const email = process.env.DEFAULT_ADMIN_EMAIL;
        const password = process.env.DEFAULT_ADMIN_PASSWORD;

        if (!email || !password) {
            console.error('❌ Please set DEFAULT_ADMIN_EMAIL and DEFAULT_ADMIN_PASSWORD in your .env file.');
            process.exit(1);
        }

        const name = 'Get Right Home Admin';
        const hashedPassword = await bcrypt.hash(password, 10);
        
        let admin = await Admin.findOne({ email });

        if (admin) {
            admin.password = hashedPassword;
            await admin.save();
            console.log('✅ Existing admin password updated');
        } else {
            await Admin.create({
                name,
                email,
                phone: '9999999999',
                password: hashedPassword,
                role: 'superadmin',
                isActive: true
            });
            console.log('✅ New Admin Created');
        }

        console.log('\n🔐 Admin Credentials updated from ENV successfully!\n');

        await mongoose.disconnect();
        console.log('\n🔌 Disconnected from MongoDB');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

seedAdmin();
