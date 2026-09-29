import 'dotenv/config';
import mongoose from 'mongoose';
import HomeServiceBooking from '../models/HomeServiceBooking.js';
import { adminCancelBooking } from '../controllers/adminWorkerController.js';
await mongoose.connect(process.env.MONGODB_URL);
const id = process.argv[2];
const b = await HomeServiceBooking.findById(id).select('bookingNumber status paymentMethod paymentStatus finalAmount workerId').lean();
console.log('BEFORE', JSON.stringify(b));
if (b && process.argv[3] === 'go') {
  const res = { status(c){this.c=c;return this}, json(o){console.log('RESULT', this.c||200, o.message)} };
  await adminCancelBooking({ params:{id}, body:{reason:'Cancelled by admin'} }, res);
  console.log('AFTER', JSON.stringify(await HomeServiceBooking.findById(id).select('status paymentStatus cancelledBy').lean()));
}
process.exit(0);
