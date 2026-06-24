import './config/env.js'; // ⚠️ MUST be first — loads dotenv before any other module
import express from 'express';
import mongoose from 'mongoose';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import cors from 'cors';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
import { initializeFirebase } from './config/firebase.js';
import { createServer } from 'http';
import { Server } from 'socket.io';
import morgan from 'morgan';
import workerRoutes from './routes/workerRoutes.js';
import hsBookingRoutes from './routes/hsBookingRoutes.js';
import adminWorkerRoutes from './routes/adminWorkerRoutes.js';
import zoneRoutes from './routes/zoneRoutes.js';

// Initialize Firebase
initializeFirebase();



const app = express();
const server = createServer(app); // Create HTTP server
const PORT = process.env.PORT || 5000;

import { initIO } from './sockets.js';

// Initialize Socket.io
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || [
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'https://homezoo.vercel.app',
      'homezoo.vercel.app',
      'https://get-right-home.vercel.app',
      'get-right-home.vercel.app'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
  }
});

initIO(io);
app.set('io', io);
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
      'http://127.0.0.1:5173',
      'http://localhost:5174',
      'http://localhost:5175',
      'http://126.0.0.1:5173',
      'https://rukkoo.in',
      'https://www.rukkoo.in',
      'https://rukkoo-project.vercel.app',
      'https://homezoo.vercel.app',
      'https://homezoo.onrender.com',
      'https://get-right-home.vercel.app',
      'https://get-right-home.onrender.com'
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
import builderFormRoutes from './routes/builderFormRoutes.js';
import { seedOnStartup } from './controllers/propertyFormController.js';
import locationRoutes from './routes/locationRoutes.js';
import enquiryRoutes from './routes/enquiryRoutes.js';
import localityReviewRoutes from './routes/localityReviewRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import feedbackRoutes from './routes/feedbackRoutes.js';
import managerRoutes from './routes/managerRoutes.js';
import { getPublicHomeContent } from './controllers/homeContentController.js';
import { getPublicCategories, getPublicSubCategories, getPublicServices } from './controllers/homeServiceController.js';
import { getActiveCities } from './controllers/cityController.js';
import { getPublicBuilderDetails, getPublicBuilders } from './controllers/builderController.js';




app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/zones', zoneRoutes);
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
app.get('/api/public/builders', getPublicBuilders);
app.get('/api/public/builders/:id', getPublicBuilderDetails);
// Plans public endpoint (returns empty list if no plans configured)
app.get('/api/public/plans', (req, res) => {
  res.json({ success: true, data: [] });
});
app.get('/api/public/config', async (req, res) => {
  try {
    const Settings = (await import('./models/Settings.js')).default;
    let settings = await Settings.findOne({ type: 'global' });
    if (!settings) {
      settings = {
        supportEmail: 'help@Truliq.in',
        supportPhone: '+919999999999',
        visitedCharges: 29,
        serviceGstPercentage: 18,
        partsGstPercentage: 18
      };
    }
    res.json({ success: true, settings });
  } catch (err) {
    res.json({
      success: true,
      settings: {
        supportEmail: 'help@Truliq.in',
        supportPhone: '+919999999999',
        visitedCharges: 29,
        serviceGstPercentage: 18,
        partsGstPercentage: 18
      }
    });
  }
});
app.get('/api/public/home-data', async (req, res) => {
  try {
    const { cityId } = req.query;
    const HomeContent = (await import('./models/HomeContent.js')).default;
    let homeContent = await HomeContent.findOne(cityId ? { cityId } : {});

    if (!homeContent && cityId && cityId !== 'default') {
      homeContent = await HomeContent.findOne({ cityId: 'default' });
    }

    res.json({ success: true, homeContent: homeContent || {} });
  } catch (e) {
    res.json({ success: true, homeContent: {} });
  }
});
app.use('/api/upload', uploadRoutes);
app.use('/api/property-forms', propertyFormRoutes);
app.use('/api/builder-forms', builderFormRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/enquiries', enquiryRoutes);
app.use('/api/locality-reviews', localityReviewRoutes);
app.use('/api/workers', workerRoutes);
app.use('/api/hs-bookings', hsBookingRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/admin/workers', adminWorkerRoutes);

// Manager routes: CRUD under admin namespace + module registry
app.use('/api/admin/managers', managerRoutes);
app.use('/api/managers', managerRoutes);




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
  serverSelectionTimeoutMS: 15000, // How long to try selecting a server
  socketTimeoutMS: 20000,          // How long a send/receive can take
  connectTimeoutMS: 15000,         // How long to wait for initial connection
  family: 4,                       // Use IPv4, skip trying IPv6
  maxPoolSize: 10,                 // Max simultaneous connections
  minPoolSize: 2,                  // Keep minimum connections alive
  retryWrites: true,
  retryReads: true,
  heartbeatFrequencyMS: 10000,     // Check connection health every 10s
  maxIdleTimeMS: 30000,            // Close idle connections after 30s
};

// Seed admin user helper
const seedAdminOnStartup = async () => {
  try {
    const Admin = (await import('./models/Admin.js')).default;
    const bcrypt = (await import('bcryptjs')).default;
    const email = 'hoomzoteam@gmail.com';
    const existingAdmin = await Admin.findOne({ email });
    const hashedPassword
    
    = await bcrypt.hash('SumeeT@2020', 10);

    if (existingAdmin) {
      existingAdmin.password = hashedPassword;
      existingAdmin.isActive = true;
      existingAdmin.role = 'superadmin';
      await existingAdmin.save();
      console.log('✅ Admin credentials updated successfully on startup');
    } else {
      await Admin.create({
        name: 'HoomZo Admin',
        email,
        phone: '9999999999',
        password: hashedPassword,
        role: 'superadmin',
        isActive: true
      });
      console.log('✅ Admin user created successfully on startup');
    }
  } catch (err) {
    console.error('❌ Auto-seeding admin failed on startup:', err.message);
  }
};

// Database Connection with Retry Logic
const connectWithRetry = async (retries = 5, delay = 5000) => {
  for (let i = 0; i < retries; i++) {
    try {
      console.log(`🔄 Attempting MongoDB connection... (Attempt ${i + 1}/${retries})`);

      if (!process.env.MONGODB_URL) {
        throw new Error('MONGODB_URL is not set in .env! Check backend/.env file.');
      }
      await mongoose.connect(process.env.MONGODB_URL, mongoOptions);

      console.log('✅ MongoDB connected successfully');

      // Seed the templates dynamically on startup
      try {
        await seedOnStartup();
      } catch (seedErr) {
        console.error('❌ Auto-seeding failed on startup:', seedErr.message);
      }

      // Seed subscription tiers dynamically on startup
      try {
        const SubscriptionTier = (await import('./models/SubscriptionTier.js')).default;
        const defaultTiers = [
          { name: "Silver", key: "silver" },
          { name: "Gold Basic", key: "gold_basic" },
          { name: "Gold", key: "gold" },
          { name: "Platinum", key: "platinum" },
          { name: "Diamond", key: "diamond" }
        ];
        for (const tier of defaultTiers) {
          await SubscriptionTier.findOneAndUpdate(
            { key: tier.key },
            tier,
            { upsert: true }
          );
        }
        console.log('✅ Subscription Tiers verified on startup');
      } catch (tierErr) {
        console.error('❌ Auto-seeding tiers failed on startup:', tierErr.message);
      }

      // Seed admin user on startup
      try {
        await seedAdminOnStartup();
      } catch (adminErr) {
        console.error('❌ Auto-seeding admin failed on startup:', adminErr.message);
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
  // Auto-reconnect after 5 seconds
  setTimeout(() => {
    mongoose.connect(process.env.MONGODB_URL, mongoOptions)
      .then(() => console.log('✅ MongoDB reconnected after disconnect'))
      .catch(err => console.error('❌ MongoDB reconnect failed:', err.message));
  }, 5000);
});

mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB connection error:', err.message);
});

mongoose.connection.on('reconnected', () => {
  console.log('✅ MongoDB reconnected successfully');
});

// Start connection
connectWithRetry();
