import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import cors from 'cors';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env') });
import { initializeFirebase } from './config/firebase.js';
import { createServer } from 'http';
import { Server } from 'socket.io';
import morgan from 'morgan';

// Initialize Firebase
initializeFirebase();



const app = express();
const server = createServer(app); // Create HTTP server
const PORT = process.env.PORT || 5000;

// Initialize Socket.io
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || [
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'https://homezoo.vercel.app',
      'homezoo.vercel.app',


    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
  }
});

// Socket.io Logic
io.on('connection', (socket) => {
  console.log('🔌 New Client Connected:', socket.id);

  // User joins a tracking room (e.g., their booking ID or just a hotel room)
  socket.on('join_tracking', (room) => {
    socket.join(room);
    console.log(`User ${socket.id} joined room: ${room}`);
  });

  // User emits location updates
  socket.on('update_location', (data) => {
    const { room, location } = data;
    // Broadcast to others in the room (e.g., Hotel Dashboard)
    socket.to(room).emit('live_location_update', location);
    // console.log(`Location update from ${socket.id} in ${room}:`, location);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Middleware
app.use(morgan('dev'));
// Middleware to log request start
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] Incoming Request: ${req.method} ${req.url}`);
  next();
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use('/uploads', express.static(join(__dirname, 'uploads')));

// Dynamic CORS to allow local network IPs (192.168.x.x) and localhost
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    // Check if origin is localhost or local network IP
    const allowedOrigins = [
      'http://localhost:5173',
      'http://126.0.0.1:5173',
      'https://rukkoo.in',
      'https://www.rukkoo.in',
      'https://rukkoo-project.vercel.app',
      'https://homezoo.vercel.app',
      'https://homezoo.onrender.com'
    ];
    // Add 172.16-31 range (often used by hotspots) and 10.x
    const isLocalNetwork =
      origin.startsWith('http://192.168.') ||
      origin.startsWith('http://10.') ||
      origin.startsWith('http://172.');

    if (allowedOrigins.indexOf(origin) !== -1 || isLocalNetwork) {
      callback(null, true);
    } else {
      console.log('Blocked by CORS:', origin); // Log blocked origin for debugging
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'], // Added OPTIONS
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
}));

// Routes
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import offerRoutes from './routes/offerRoutes.js';
import walletRoutes from './routes/walletRoutes.js';
import infoRoutes from './routes/infoRoutes.js';
import contactRoutes from './routes/contactRoutes.js';
import propertyRoutes from './routes/propertyRoutes.js';
import bookingRoutes from './routes/bookingRoutes.js';
import reviewRoutes from './routes/reviewRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import availabilityRoutes from './routes/availabilityRoutes.js';
import hotelRoutes from './routes/hotelRoutes.js';
import referralRoutes from './routes/referralRoutes.js';
import faqRoutes from './routes/faqRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import subscriptionRoutes from './routes/subscriptionRoutes.js';
import reelRoutes from './routes/reelRoutes.js';
import bannerRoutes from './routes/bannerRoutes.js';
import homeContentRoutes from './routes/homeContentRoutes.js';
import cityRoutes from './routes/cityRoutes.js';
import hsCategoryRoutes from './routes/hsCategoryRoutes.js';
import hsSubCategoryRoutes from './routes/hsSubCategoryRoutes.js';
import hsServiceRoutes from './routes/hsServiceRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import propertyFormRoutes from './routes/propertyFormRoutes.js';
import { seedOnStartup } from './controllers/propertyFormController.js';
import locationRoutes from './routes/locationRoutes.js';
import enquiryRoutes from './routes/enquiryRoutes.js';
import { getPublicHomeContent } from './controllers/homeContentController.js';
import { getPublicCategories, getPublicSubCategories, getPublicServices } from './controllers/homeServiceController.js';
import { getActiveCities } from './controllers/cityController.js';




app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/offers', offerRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/info', infoRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/availability', availabilityRoutes);
app.use('/api/hotels', hotelRoutes);
app.use('/api/partners', hotelRoutes); // Partner-specific routes (e.g. /api/partners/fcm-token)
app.use('/api/referrals', referralRoutes);
app.use('/api/faqs', faqRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/reels', reelRoutes);
app.use('/api/banners', bannerRoutes);
app.use('/api/admin/home-content', homeContentRoutes);
app.use('/api/admin/cities', cityRoutes);
app.use('/api/admin/categories', hsCategoryRoutes);
app.use('/api/admin/sub-categories', hsSubCategoryRoutes);
app.use('/api/admin/services', hsServiceRoutes);
app.get('/api/public/home-content', getPublicHomeContent);
app.get('/api/public/categories', getPublicCategories);
app.get('/api/public/sub-categories', getPublicSubCategories);
app.get('/api/public/services', getPublicServices);
app.get('/api/public/cities', getActiveCities);
app.use('/api/upload', uploadRoutes);
app.use('/api/property-forms', propertyFormRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/enquiries', enquiryRoutes);




// Global Error Handler
app.use((err, req, res, next) => {
  console.error('❌ Global Error Handler:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});


// Basic Route
app.get('/', (req, res) => {
  res.send({ message: 'Rukkoin API is running successfully' });
});

// MongoDB Connection Options with retry logic
const mongoOptions = {
  serverSelectionTimeoutMS: 10000, // Timeout after 10s instead of 30s
  socketTimeoutMS: 45000,
  family: 4, // Use IPv4, skip trying IPv6
  maxPoolSize: 10,
  minPoolSize: 2,
  retryWrites: true,
  retryReads: true,
};

// Database Connection with Retry Logic
const connectWithRetry = async (retries = 5, delay = 5000) => {
  for (let i = 0; i < retries; i++) {
    try {
      console.log(`🔄 Attempting MongoDB connection... (Attempt ${i + 1}/${retries})`);

      await mongoose.connect(
        process.env.MONGODB_URL || "mongodb+srv://rukkooin:rukkooin@cluster0.6mzfrnp.mongodb.net/?appName=Cluster0",
        mongoOptions
      );

      console.log('✅ MongoDB connected successfully');

      // Seed the templates dynamically on startup
      try {
        await seedOnStartup();
      } catch (seedErr) {
        console.error('❌ Auto-seeding failed on startup:', seedErr.message);
      }

      // Debug: Check Admin counts
      const adminCount = await mongoose.connection.db.collection('admins').countDocuments();
      const userCount = await mongoose.connection.db.collection('users').countDocuments();
      console.log(`📊 DB Status - Admins: ${adminCount}, Users: ${userCount}`);

      // Start server only after successful DB connection
      server.listen(PORT, () => {
        console.log(`🚀 Server is running on port ${PORT}`);
        const mapsKey = process.env.GOOGLE_MAP_API_KEY || process.env.GOOGLE_MAPS_API_KEY;
        if (mapsKey && String(mapsKey).trim()) {
          console.log('✅ Google Maps API key loaded');
        } else {
          console.warn('⚠️ GOOGLE_MAP_API_KEY not set – location search will return 500. Add it in backend/.env');
        }
      });

      return; // Exit function on success
    } catch (err) {
      console.error(`❌ MongoDB connection attempt ${i + 1} failed:`, err.message);

      if (i < retries - 1) {
        console.log(`⏳ Retrying in ${delay / 1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        console.error('❌ All MongoDB connection attempts failed. Please check:');
        console.error('   1. Your internet connection');
        console.error('   2. MongoDB Atlas IP whitelist (add 0.0.0.0/0 for testing)');
        console.error('   3. Your firewall/antivirus settings');
        console.error('   4. DNS settings (try flushing DNS: ipconfig /flushdns)');
        process.exit(1);
      }
    }
  }
};

// Handle MongoDB connection events
mongoose.connection.on('disconnected', () => {
  console.warn('⚠️ MongoDB disconnected. Attempting to reconnect...');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB connection error:', err.message);
});

mongoose.connection.on('reconnected', () => {
  console.log('✅ MongoDB reconnected successfully');
});

// Start connection
connectWithRetry();
