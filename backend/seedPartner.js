import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import Partner from './models/Partner.js';

dotenv.config();

const SEED_PHONE = '7777777777';
const SEED_PASSWORD = '123456';

const MONGO_URI = process.env.MONGODB_URL || process.env.MONGO_URI || 'mongodb://localhost:27017/homezoo';

async function seedPartner() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB');

        const existingPartner = await Partner.findOne({ phone: SEED_PHONE });
        const hashedPassword = await bcrypt.hash(SEED_PASSWORD, 10);

        if (existingPartner) {
            console.log('⚠️  Partner already exists with phone:', SEED_PHONE);
            console.log('   Updating password...');
            existingPartner.password = hashedPassword;
            existingPartner.partnerApprovalStatus = 'approved';
            existingPartner.isVerified = true;
            await existingPartner.save();
            console.log('✅ Partner password and status updated successfully!');
        } else {
            await Partner.create({
                name: 'Seed Partner',
                phone: SEED_PHONE,
                password: hashedPassword,
                role: 'partner',
                isPartner: true,
                partnerApprovalStatus: 'approved',
                isVerified: true,
                isBlocked: false,
            });
            console.log('✅ Partner account created successfully!');
        }

        console.log('\n📋 Partner login (OTP flow):');
        console.log('   Phone:    ' + SEED_PHONE);
        console.log('   Password: ' + SEED_PASSWORD + ' (stored for reference; partner app uses OTP login)');

        await mongoose.disconnect();
        console.log('\n🔌 Disconnected from MongoDB');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

seedPartner();
