import dns from 'dns';
dns.setServers(['8.8.8.8', '1.1.1.1']);
import mongoose from 'mongoose';
import './config/env.js';
import HomeServiceBooking from './models/HomeServiceBooking.js';
import Worker from './models/Worker.js';

async function check() {
  await mongoose.connect(process.env.MONGODB_URL);
  console.log('Connected to MongoDB');

  // 1. Find the latest booking or specific booking
  const booking = await HomeServiceBooking.findOne({
    $or: [
      { bookingNumber: 'BK17901612590687ZCD7' },
      { bookingNumber: { $regex: 'BK1790161259', $options: 'i' } }
    ]
  }).lean();

  if (!booking) {
    console.log('Booking BK17901612590687ZCD7 not found. Fetching latest 3 bookings:');
    const latest = await HomeServiceBooking.find().sort({ createdAt: -1 }).limit(3).lean();
    console.log(latest.map(b => ({
      id: b._id,
      bookingNumber: b.bookingNumber,
      serviceName: b.serviceName,
      serviceCategory: b.serviceCategory,
      categoryId: b.categoryId,
      status: b.status,
      address: b.address,
      potentialWorkers: b.potentialWorkers,
      notifiedWorkers: b.notifiedWorkers,
      currentWave: b.currentWave,
      createdAt: b.createdAt
    })));
  } else {
    console.log('FOUND BOOKING:', {
      _id: booking._id,
      bookingNumber: booking.bookingNumber,
      serviceName: booking.serviceName,
      serviceCategory: booking.serviceCategory,
      categoryId: booking.categoryId,
      bookingModel: booking.bookingModel,
      bookingType: booking.bookingType,
      status: booking.status,
      address: booking.address,
      potentialWorkers: booking.potentialWorkers,
      notifiedWorkers: booking.notifiedWorkers,
      currentWave: booking.currentWave,
      waveStartedAt: booking.waveStartedAt,
      expiresAt: booking.expiresAt,
      assignmentStatus: booking.assignmentStatus,
      assignmentAttempts: booking.assignmentAttempts,
      createdAt: booking.createdAt
    });
  }

  // 2. Find Devendra Jaiswal
  const worker = await Worker.findOne({
    name: { $regex: 'Devendra', $options: 'i' }
  }).lean();

  if (worker) {
    console.log('\nFOUND WORKER (Devendra):', {
      _id: worker._id,
      name: worker.name,
      phone: worker.phone,
      isOnline: worker.isOnline,
      approvalStatus: worker.approvalStatus,
      status: worker.status,
      location: worker.location,
      city: worker.city,
      zone: worker.zone,
      serviceCategories: worker.serviceCategories,
      skills: worker.skills,
      activePlan: worker.activePlan,
      offlineSchedule: worker.offlineSchedule
    });
  } else {
    console.log('Worker Devendra not found');
  }

  await mongoose.disconnect();
}

check().catch(err => {
  console.error(err);
  process.exit(1);
});
