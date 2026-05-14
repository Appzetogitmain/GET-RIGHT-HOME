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

        // Check if admin already exists
        const existingAdmin = await Admin.findOne({ email: 'hoomzoteam@gmail.com' });
        if (existingAdmin) {
            console.log('⚠️  Admin already exists with email: hoomzoteam@gmail.com');
            console.log('   Updating password...');
            const hashedPassword = await bcrypt.hash('SumeeT@2020', 10);
            await Admin.updateOne({ email: 'hoomzoteam@gmail.com' }, { password: hashedPassword });
            console.log('✅ Password updated successfully!');
        } else {
            const hashedPassword = await bcrypt.hash('SumeeT@2020', 10);
            await Admin.create({
                name: 'HoomZo Admin',
                email: 'hoomzoteam@gmail.com',
                phone: '9999999999',
                password: hashedPassword,
                role: 'superadmin',
                isActive: true,
            });
            console.log('✅ Admin account created successfully!');
        }

        console.log('\n📋 Admin Credentials:');
        console.log('   Email:    hoomzoteam@gmail.com');
        console.log('   Password: SumeeT@2020');

        await mongoose.disconnect();
        console.log('\n🔌 Disconnected from MongoDB');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

seedAdmin();
