import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate, Outlet } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import toast from 'react-hot-toast';
import { Clock, Loader2 } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';

// Eager Imports (Critical UI)
import BottomNavbar from './components/ui/BottomNavbar';
import TopNavbar from './components/ui/TopNavbar';
import PartnerBottomNavbar from './app/partner/components/PartnerBottomNavbar';
import ScrollToTop from './components/ui/ScrollToTop';

// Hooks & Services
import { useLenis } from './app/shared/hooks/useLenis';
import { legalService, userService } from './services/apiService';
import adminService from './services/adminService';
import { requestNotificationPermission, onMessageListener } from './utils/firebase';
import logo from './assets/grh-logo.png';
import { CityProvider } from './homster/context/CityContext';
import { CartProvider } from './homster/context/CartContext';
import { SocketProvider } from './homster/context/SocketContext';

// Lazy Imports - User Pages
const Home = React.lazy(() => import('./pages/user/Home'));
const UserPropertyDetailsPage = React.lazy(() => import('./pages/user/PropertyDetailsDispatcher'));
const HandpickedDetailsPage = React.lazy(() => import('./pages/user/HandpickedDetailsPage'));
const PropertyComparePage = React.lazy(() => import('./pages/user/PropertyComparePage'));
const UserLogin = React.lazy(() => import('./pages/auth/UserLogin'));
const UserSignup = React.lazy(() => import('./pages/auth/UserSignup'));
const SearchPage = React.lazy(() => import('./pages/user/SearchPage'));
const BuyPage = React.lazy(() => import('./pages/user/BuyPage'));
const RentPage = React.lazy(() => import('./pages/user/RentPage'));
const PlotPage = React.lazy(() => import('./pages/user/PlotPage'));
const LocalityDetail = React.lazy(() => import('./pages/user/LocalityDetail'));
const LocalityReviewsPage = React.lazy(() => import('./pages/user/LocalityReviewsPage'));
const BookingsPage = React.lazy(() => import('./pages/user/BookingsPage'));
const ListingPage = React.lazy(() => import('./pages/user/ListingPage'));
const BookingConfirmationPage = React.lazy(() => import('./pages/user/BookingConfirmationPage'));
const WalletPage = React.lazy(() => import('./pages/user/WalletPage'));
const PaymentPage = React.lazy(() => import('./pages/user/PaymentPage'));
const SupportPage = React.lazy(() => import('./pages/user/SupportPage'));
const ReferAndEarnPage = React.lazy(() => import('./pages/user/ReferAndEarnPage'));
const SavedPlacesPage = React.lazy(() => import('./pages/user/SavedPlacesPage'));
const NotificationsPage = React.lazy(() => import('./pages/user/NotificationsPage'));
const SettingsPage = React.lazy(() => import('./pages/user/SettingsPage'));
const PartnerLandingPage = React.lazy(() => import('./pages/user/PartnerLandingPage'));
const LegalPage = React.lazy(() => import('./pages/user/LegalPage'));
const TermsPage = React.lazy(() => import('./pages/user/TermsPage'));
const PrivacyPage = React.lazy(() => import('./pages/user/PrivacyPage'));
const AboutPage = React.lazy(() => import('./pages/user/AboutPage'));
const ContactPage = React.lazy(() => import('./pages/user/ContactPage'));
const AmenitiesPage = React.lazy(() => import('./pages/user/AmenitiesPage'));
const ReviewsPage = React.lazy(() => import('./pages/user/ReviewsPage'));
const OffersPage = React.lazy(() => import('./pages/user/OffersPage'));
const ProfileEdit = React.lazy(() => import('./pages/user/ProfileEdit'));
const BookingCheckoutPage = React.lazy(() => import('./pages/user/BookingCheckoutPage'));
const ReelsPage = React.lazy(() => import('./pages/user/ReelsPage'));
const MyReelsPage = React.lazy(() => import('./pages/user/MyReelsPage'));
const MyProperties = React.lazy(() => import('./pages/user/MyProperties'));
const HomeServicesPage = React.lazy(() => import('./pages/user/HomeServicesPage'));
const SubCategoryPage = React.lazy(() => import('./pages/user/SubCategoryPage'));
const HomsterAdminRoutes = React.lazy(() => import('./homster/modules/admin/routes/index.jsx'));
const UserReceivedBookingsPage = React.lazy(() => import('./pages/user/UserReceivedBookingsPage'));
const UserReceivedEnquiriesPage = React.lazy(() => import('./pages/user/UserReceivedEnquiriesPage'));
const UserSubscriptionsPage = React.lazy(() => import('./pages/user/UserSubscriptionsPage'));
const UserPropertyDashboard = React.lazy(() => import('./pages/user/UserPropertyDashboard'));
const UserMyReviewsPage = React.lazy(() => import('./pages/user/UserMyReviewsPage'));
const ListPropertyWizard = React.lazy(() => import('./pages/user/ListPropertyWizard'));
const DynamicFormEngine = React.lazy(() => import('./pages/user/DynamicFormEngine'));
const BuilderProfilePage = React.lazy(() => import('./pages/user/BuilderProfilePage'));
const EmiCalculatorPage = React.lazy(() => import('./pages/user/EmiCalculatorPage'));
const HomeLoanEligibilityPage = React.lazy(() => import('./pages/user/HomeLoanEligibilityPage'));
const AreaConverterPage = React.lazy(() => import('./pages/user/AreaConverterPage'));
const ToolsAndInsightsPage = React.lazy(() => import('./pages/user/ToolsAndInsightsPage'));
const CartPage = React.lazy(() => import('./homster/modules/user/pages/Cart'));
const HomeServiceCheckoutPage = React.lazy(() => import('./homster/modules/user/pages/Checkout'));
const HomeServiceBookingsPage = React.lazy(() => import('./homster/modules/user/pages/MyBookings'));
const HSBookingDetailsPage = React.lazy(() => import('./homster/modules/user/pages/BookingDetails'));
const HSBookingConfirmationPage = React.lazy(() => import('./homster/modules/user/pages/BookingConfirmation'));

// Lazy Imports - Worker Pages
const WorkerRoutes = React.lazy(() => import('./homster/modules/worker/routes/index.jsx'));

// Lazy Imports - Admin Pages
const AdminLogin = React.lazy(() => import('./app/admin/pages/AdminLogin'));
const AdminSignup = React.lazy(() => import('./app/admin/pages/AdminSignup'));
const AdminDashboard = React.lazy(() => import('./app/admin/pages/AdminDashboard'));
const AdminHotelDetail = React.lazy(() => import('./app/admin/pages/AdminHotelDetail'));
const AdminUsers = React.lazy(() => import('./app/admin/pages/AdminUsers'));
const AdminUserDetail = React.lazy(() => import('./app/admin/pages/AdminUserDetail'));
const AdminBookings = React.lazy(() => import('./app/admin/pages/AdminBookings'));
const AdminBookingDetail = React.lazy(() => import('./app/admin/pages/AdminBookingDetail'));
const AdminEnquiries = React.lazy(() => import('./app/admin/pages/AdminEnquiries'));
const AdminPartners = React.lazy(() => import('./app/admin/pages/AdminPartners'));
const AdminPartnerDetail = React.lazy(() => import('./app/admin/pages/AdminPartnerDetail'));
const AdminReviews = React.lazy(() => import('./app/admin/pages/AdminReviews'));
const AdminFinance = React.lazy(() => import('./pages/admin/FinanceAndPayoutsPage'));
const AdminSettings = React.lazy(() => import('./app/admin/pages/AdminSettings'));
const AdminOffers = React.lazy(() => import('./app/admin/pages/AdminOffers'));
const AdminProtectedRoute = React.lazy(() => import('./app/admin/AdminProtectedRoute'));
const AdminProperties = React.lazy(() => import('./app/admin/pages/AdminProperties'));
const AdminProjects = React.lazy(() => import('./app/admin/pages/AdminProjects'));
const AdminAddProperty = React.lazy(() => import('./app/admin/pages/AdminAddProperty'));

const AdminLegalPages = React.lazy(() => import('./app/admin/pages/AdminLegalPages'));
const AdminContactMessages = React.lazy(() => import('./app/admin/pages/AdminContactMessages'));
const AdminNotifications = React.lazy(() => import('./app/admin/pages/AdminNotifications'));
const AdminFaqs = React.lazy(() => import('./app/admin/pages/AdminFaqs'));
const AdminCategories = React.lazy(() => import('./app/admin/pages/AdminCategories'));
const AdminFeaturedProperties = React.lazy(() => import('./app/admin/pages/AdminFeaturedProperties'));
const AdminSubscriptions = React.lazy(() => import('./app/admin/pages/AdminSubscriptions'));
const AdminReelAnalysis = React.lazy(() => import('./app/admin/pages/AdminReelAnalysis'));
const AdminBanners = React.lazy(() => import('./app/admin/pages/AdminBanners'));
const AdminPropertyFormManager = React.lazy(() => import('./pages/admin/PropertyFormManager'));
const AdminPropertyVideos = React.lazy(() => import('./app/admin/pages/AdminPropertyVideos'));
const AdminLocationsPage = React.lazy(() => import('./app/admin/pages/AdminLocationsPage'));
const AdminManagers = React.lazy(() => import('./app/admin/pages/AdminManagers'));
const AdminBuilders = React.lazy(() => import('./app/admin/pages/AdminBuilders'));
const AdminBuilderVerification = React.lazy(() => import('./app/admin/pages/AdminBuilderVerification'));
const AdminManageLocalityInsights = React.lazy(() => import('./app/admin/pages/AdminManageLocalityInsights'));

// Lazy Imports - Manager Panel
const ManagerLogin = React.lazy(() => import('./app/manager/pages/ManagerLogin'));
const ManagerDashboard = React.lazy(() => import('./app/manager/pages/ManagerDashboard'));
const ManagerLayout = React.lazy(() => import('./app/manager/layouts/ManagerLayout'));
const ManagerProtectedRoute = React.lazy(() => import('./app/manager/ManagerProtectedRoute'));


// Lazy Imports - Partner Pages
const HotelLogin = React.lazy(() => import('./pages/auth/HotelLoginPage'));
const HotelSignup = React.lazy(() => import('./pages/auth/HotelSignupPage'));
const PartnerHome = React.lazy(() => import('./app/partner/pages/PartnerHome'));
const AddVillaWizard = React.lazy(() => import('./app/partner/pages/AddVillaWizard'));
const AddHotelWizard = React.lazy(() => import('./app/partner/pages/AddHotelWizard'));
const AddHostelWizard = React.lazy(() => import('./app/partner/pages/AddHostelWizard'));
const AddPGWizard = React.lazy(() => import('./app/partner/pages/AddPGWizard'));
const AddResortWizard = React.lazy(() => import('./app/partner/pages/AddResortWizard'));
const AddHomestayWizard = React.lazy(() => import('./app/partner/pages/AddHomestayWizard'));
const AddDynamicWizard = React.lazy(() => import('./app/partner/pages/AddDynamicWizard'));
const PartnerDashboard = React.lazy(() => import('./app/partner/pages/PartnerDashboard'));
const PartnerBookings = React.lazy(() => import('./app/partner/pages/PartnerBookings'));
const PartnerWallet = React.lazy(() => import('./app/partner/pages/PartnerWallet'));
const PartnerReviews = React.lazy(() => import('./app/partner/pages/PartnerReviews'));
const PartnerPage = React.lazy(() => import('./app/partner/pages/PartnerPage'));
const PartnerProfilePage = React.lazy(() => import('./pages/user/PartnerProfilePage'));
const PartnerJoinPropertyType = React.lazy(() => import('./app/partner/pages/PartnerJoinPropertyType'));
const PartnerProperties = React.lazy(() => import('./app/partner/pages/PartnerProperties'));
const PartnerPropertyDetails = React.lazy(() => import('./app/partner/pages/PartnerPropertyDetails'));
const PartnerBookingDetail = React.lazy(() => import('./app/partner/pages/PartnerBookingDetail'));

const PartnerInventory = React.lazy(() => import('./app/partner/pages/PartnerInventory'));
const PartnerInventoryProperties = React.lazy(() => import('./app/partner/pages/PartnerInventoryProperties'));
const PartnerNotifications = React.lazy(() => import('./app/partner/pages/PartnerNotificationsPage'));
const PartnerKYC = React.lazy(() => import('./app/partner/pages/PartnerKYC'));
const PartnerSupport = React.lazy(() => import('./app/partner/pages/PartnerSupport'));
const PartnerProfile = React.lazy(() => import('./app/partner/pages/PartnerProfile'));
const PartnerTransactions = React.lazy(() => import('./app/partner/pages/PartnerTransactions'));
const PartnerTerms = React.lazy(() => import('./app/partner/pages/PartnerTerms'));
const PartnerSettings = React.lazy(() => import('./app/partner/pages/PartnerSettings'));
const PartnerAbout = React.lazy(() => import('./app/partner/pages/PartnerAbout'));
const PartnerPrivacy = React.lazy(() => import('./app/partner/pages/PartnerPrivacy'));
const PartnerContact = React.lazy(() => import('./app/partner/pages/PartnerContact'));
const PartnerBankDetails = React.lazy(() => import('./app/partner/pages/PartnerBankDetails'));
const PartnerSubscriptions = React.lazy(() => import('./app/partner/pages/PartnerSubscriptions'));

// Lazy Imports - Layouts
const HotelLayout = React.lazy(() => import('./layouts/HotelLayout'));
const AdminLayout = React.lazy(() => import('./app/admin/layouts/AdminLayout'));

// Loading Fallback Component
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <div className="flex flex-col items-center gap-4">
      <Loader2 className="w-10 h-10 animate-spin text-teal-500" />
      <p className="text-gray-500 text-sm font-medium animate-pulse">Loading...</p>
    </div>
  </div>
);

// Wrapper to conditionally render Navbars & Handle Lenis
const Layout = ({ children }) => {
  const location = useLocation();
  const [platformStatus, setPlatformStatus] = React.useState({
    loading: true,
    maintenanceMode: false,
    maintenanceTitle: '',
    maintenanceMessage: ''
  });

  // Disable Lenis on Admin and Manager routes (as requested)
  const isCmsRoute = location.pathname.startsWith('/admin') || location.pathname.startsWith('/manager');
  useLenis(isCmsRoute);

  React.useEffect(() => {
    let isMounted = true;
    const fetchStatus = async () => {
      try {
        const data = await legalService.getPlatformStatus();
        if (isMounted) {
          setPlatformStatus({
            loading: false,
            maintenanceMode: !!data.maintenanceMode,
            maintenanceTitle: data.maintenanceTitle || 'We will be back soon.',
            maintenanceMessage: data.maintenanceMessage || 'The platform is under scheduled maintenance. Please check back in some time.'
          });
        }
      } catch (error) {
        if (isMounted) {
          setPlatformStatus(prev => ({ ...prev, loading: false }));
        }
      }
    };
    fetchStatus();
    return () => {
      isMounted = false;
    };
  }, []);

  // 1. GLOBAL HIDE: Auth pages, Admin, and Property Wizard
  const globalHideRoutes = ['/login', '/signup', '/register', '/admin', '/manager', '/hotel/join', '/hotel/wizard', '/hotel/join-dynamic', '/list-property', '/worker'];
  const shouldGlobalHide = globalHideRoutes.some(route => location.pathname.includes(route));

  if (shouldGlobalHide) {
    return <>{children}</>;
  }

  const isUserHotelDetail = /^\/(hotel|property)\/[0-9a-fA-F]{24}(\/(amenities|reviews|offers))?$/.test(location.pathname);
  const isPartnerApp = location.pathname.startsWith('/hotel') && !isUserHotelDetail;

  // 3. NAVBAR VISIBILITY
  const showUserNavs = !isPartnerApp;

  // Specific user pages where BottomNav is hidden (reels = full-screen experience)
  const hideUserBottomNavOn = ['/booking-confirmation', '/payment', '/support', '/refer', '/hotel/', '/property/', '/handpicked/', '/legal', '/terms', '/privacy', '/reels', '/home-services', '/user/cart', '/user/home-services/checkout', '/user/booking/'];
  const showUserBottomNav = showUserNavs && !hideUserBottomNavOn.some(r => location.pathname.includes(r));
  const isReelsPage = location.pathname.startsWith('/reels');

  // Partner Bottom Nav should show in Partner App (authenticated pages)
  const showPartnerBottomNav = isPartnerApp && location.pathname !== '/hotel';

  const isAuthRoute = ['/login', '/signup', '/hotel/login', '/hotel/register'].some(route =>
    location.pathname.startsWith(route)
  );

  const showMaintenanceOverlay =
    platformStatus.maintenanceMode &&
    !isCmsRoute &&
    !isAuthRoute;

  const isHomeServicesPage = location.pathname.includes('/home-services');

  return (
    <>
      {showUserNavs && !isReelsPage && !isHomeServicesPage && <TopNavbar />}

      <div className={`min-h-screen ${showUserNavs && !isReelsPage ? 'lg:pt-20' : ''} ${showUserBottomNav || showPartnerBottomNav ? 'pb-20 md:pb-0' : ''}`}>
        {showMaintenanceOverlay ? (
          <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center px-6 py-10 text-center bg-gradient-to-b from-[#111827] via-[#0f172a] to-black">
            <div className="flex flex-col items-center justify-center max-w-md w-full">
              <div className="mb-6 flex flex-col items-center justify-center gap-3">
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                  <Clock className="w-8 h-8 md:w-9 md:h-9 text-amber-400" />
                </div>
                <div className="flex flex-col items-center leading-none">
                  <span className="text-3xl font-black tracking-tighter text-white flex items-center gap-1 uppercase">
                    GET-RIGHT<span className="text-orange-600">-HOME</span>
                  </span>
                  <div className="h-1 w-8 bg-orange-600 rounded-full mt-1"></div>
                </div>
              </div>
              <h1 className="text-2xl md:text-3xl font-black text-white mb-3 leading-snug">
                {platformStatus.maintenanceTitle}
              </h1>
              <p className="text-sm md:text-base text-gray-300 mb-8 leading-relaxed">
                {platformStatus.maintenanceMessage}
              </p>
            </div>
          </div>
        ) : (
          children
        )}
      </div>

      {showUserBottomNav && <BottomNavbar />}
      {showPartnerBottomNav && <PartnerBottomNavbar />}
    </>
  );
};

// Simple Protected Route for Users
const UserProtectedRoute = ({ children }) => {
  const { isLoggedIn } = useAuth();
  const location = useLocation();

  if (!isLoggedIn) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children ? children : <Outlet />;
};

// Partner & User Property Listing Protected Route
const PartnerProtectedRoute = ({ children }) => {
  const { user } = useAuth();
  const location = useLocation();

  // Allow access to login/register/join
  const publicPartnerPaths = ['/hotel/login', '/hotel/register'];
  if (publicPartnerPaths.some(p => location.pathname.startsWith(p))) {
    return children ? children : <Outlet />;
  }

  // Allow both Partners and Users
  if (!user || (user.role !== 'partner' && user.role !== 'user')) {
    return <Navigate to="/hotel/login" state={{ from: location }} replace />;
  }

  // Partner-specific approval logic
  if (user.role === 'partner') {
    const isPending = user.partnerApprovalStatus !== 'approved';
    if (isPending) {
      const allowedPending = [
        '/hotel/dashboard',
        '/hotel/partner-dashboard',
        '/hotel/join',
        '/hotel/profile',
        '/hotel/subscriptions',
        '/hotel/join-hotel',
        '/hotel/join-resort',
        '/hotel/join-hostel',
        '/hotel/join-villa',
        '/hotel/join-pg',
        '/hotel/join-homestay',
        '/hotel/join-dynamic'
      ];
      if (!allowedPending.some(p => location.pathname.startsWith(p))) {
        return <Navigate to="/hotel/dashboard" replace />;
      }
    }
  }

  // Users can access wizards and their own property lists
  if (user.role === 'user') {
    const allowedUserPaths = [
      '/hotel/join',
      '/hotel/join-',
      '/hotel/properties',
      '/hotel/inventory',
      '/hotel/notifications',
      '/properties'
    ];
    if (!allowedUserPaths.some(p => location.pathname.includes(p))) {
      // If a user tries to access partner-only pages like wallet/subscription
      const partnerOnlyPaths = ['/hotel/wallet', '/hotel/subscriptions', '/hotel/bank-details', '/hotel/kyc'];
      if (partnerOnlyPaths.some(p => location.pathname.includes(p))) {
        return <Navigate to="/" replace />;
      }
    }
  }

  return children ? children : <Outlet />;
};

// Public Route (redirects to home if already logged in)
const PublicRoute = ({ children }) => {
  const { isLoggedIn } = useAuth();
  if (isLoggedIn) {
    return <Navigate to="/" replace />;
  }
  return children;
};

function App() {
  // Fix for Back Button in WebView/App Wrappers (Flutter/Android)
  // Ensures history stack has depth so "canGoBack" is true, preventing immediate app exit.
  React.useEffect(() => {
    if (window.history && window.history.length === 1) {
      window.history.pushState(null, document.title, window.location.href);
    }
  }, []);

  React.useEffect(() => {
    const initFcm = async () => {
      // 1. Check if running in a WebView with a native bridge (e.g. Flutter)
      if (window.NativeApp && window.NativeApp.getFcmToken) {
        try {
          const appToken = await window.NativeApp.getFcmToken();
          if (appToken) {
            console.log('Received App Token from Native Bridge:', appToken);
            const adminToken = localStorage.getItem('adminToken');
            if (adminToken) {
              await adminService.updateFcmToken(appToken, 'app');
            } else if (localStorage.getItem('user')) {
              await userService.updateFcmToken(appToken, 'app');
            }
            return;
          }
        } catch (err) {
          console.error('Error getting token from native bridge:', err);
        }
      }

      // 2. Also listen for window message events from the native app
      window.addEventListener('message', async (event) => {
        if (event.data && event.data.type === 'FCM_TOKEN_UPDATE') {
          const appToken = event.data.token;
          console.log('Received App Token via postMessage:', appToken);
          const adminToken = localStorage.getItem('adminToken');
          if (adminToken) {
            await adminService.updateFcmToken(appToken, 'app');
          } else if (localStorage.getItem('user')) {
            await userService.updateFcmToken(appToken, 'app');
          }
        }
      });

      // 3. Web FCM: Only request if user is already logged in
      // (Login/Signup pages handle FCM for fresh sessions themselves)
      const isLoggedIn = localStorage.getItem('user') || localStorage.getItem('adminToken');
      if (!isLoggedIn) return;

      try {
        const token = await requestNotificationPermission();
        if (token) {
          const adminToken = localStorage.getItem('adminToken');
          if (adminToken) {
            console.log('FCM Token received, updating for Admin');
            await adminService.updateFcmToken(token, 'web');
            return;
          }
          const userStr = localStorage.getItem('user');
          if (userStr) {
            const user = JSON.parse(userStr);
            console.log('FCM Token received, updating backend for role:', user.role);
            await userService.updateFcmToken(token, 'web');
          }
        }
      } catch (error) {
        console.error("Error initializing FCM:", error);
      }
    };

    initFcm();

    // Listen for foreground messages
    onMessageListener((payload) => {
      console.log('Foreground Message:', payload);
      
      const title = payload.notification?.title || payload.data?.title || 'Notification';
      const body = payload.notification?.body || payload.data?.body || '';

      // Force a system push notification even when the app is in the foreground
      if (Notification.permission === 'granted') {
        new Notification(title, {
          body: body,
          icon: '/icon-192x192.png'
        });
      }

      toast((t) => (
        <div className="flex flex-col">
          <span className="font-bold">{title}</span>
          <span className="text-sm">{body}</span>
        </div>
      ), {
        duration: 5000,
        position: 'top-right',
        style: {
          background: '#333',
          color: '#fff',
        },
      });
    });
  }, []);

  return (
    <CityProvider>
      <CartProvider>
        <AuthProvider>
          <Router>
            <ScrollToTop />
            <Toaster position="top-center" reverseOrder={false} />
            <SocketProvider>
              <Layout>
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                    {/* User Auth Routes (Public Only) */}
                    <Route path="/login" element={<PublicRoute><UserLogin /></PublicRoute>} />
                    <Route path="/signup" element={<PublicRoute><UserSignup /></PublicRoute>} />
                    <Route path="/user/login" element={<Navigate to="/login" replace />} />
                    <Route path="/legal" element={<LegalPage />} />
                    <Route path="/terms" element={<TermsPage />} />
                    <Route path="/privacy" element={<PrivacyPage />} />

                    {/* Home Services Public Routes */}
                    <Route path="/home-services" element={<HomeServicesPage />} />
                    <Route path="/home-services/sub-category" element={<SubCategoryPage />} />
                    <Route path="/home-service" element={<Navigate to="/home-services" replace />} />

                    {/* Public User Routes */}
                    <Route path="/" element={<Home />} />
                    <Route path="/reels" element={<ReelsPage />} />
                    <Route path="/search" element={<SearchPage />} />
                    <Route path="/rent" element={<Navigate to="/rent-pg" replace />} />
                    <Route path="/rent-pg" element={<RentPage />} />
                    <Route path="/pg-coliving" element={<Navigate to="/rent-pg" replace />} />
                    <Route path="/buy" element={<BuyPage />} />
                    <Route path="/plot" element={<PlotPage />} />
                    <Route path="/insights/:locality" element={<LocalityDetail />} />
                    <Route path="/insights/:locality/reviews" element={<LocalityReviewsPage />} />
                    <Route path="/locality-insights/:city/:locality" element={<LocalityDetail />} />
                    <Route path="/locality-insights/:city/:locality/reviews" element={<LocalityReviewsPage />} />
                    <Route path="/compare" element={<PropertyComparePage />} />
                    <Route path="/home-loan-emi-calculator" element={<EmiCalculatorPage />} />
                    <Route path="/home-loan-eligibility-calculator" element={<HomeLoanEligibilityPage />} />
                    <Route path="/area-converter" element={<AreaConverterPage />} />
                    <Route path="/tools-and-insights" element={<ToolsAndInsightsPage />} />
                    <Route path="/listings" element={<Navigate to="/search" replace />} />
                    <Route path="/partner-landing" element={<PartnerLandingPage />} />
                    <Route path="/about" element={<AboutPage />} />
                    <Route path="/contact" element={<ContactPage />} />
                    <Route path="/builder/:id" element={<BuilderProfilePage />} />

                    {/* Unified Property Details (C2C & Hotel) - Public */}
                    <Route path="/hotel/:id" element={<UserPropertyDetailsPage />} />
                    <Route path="/hotel/:id/amenities" element={<AmenitiesPage />} />
                    <Route path="/hotel/:id/reviews" element={<ReviewsPage />} />
                    <Route path="/hotel/:id/offers" element={<OffersPage />} />

                    <Route path="/property/:id" element={<UserPropertyDetailsPage />} />
                    <Route path="/property/:id/amenities" element={<AmenitiesPage />} />
                    <Route path="/property/:id/reviews" element={<ReviewsPage />} />
                    <Route path="/property/:id/offers" element={<OffersPage />} />
                    <Route path="/handpicked/:id" element={<HandpickedDetailsPage />} />
                    <Route path="/partner/:id" element={<PartnerProfilePage />} />

                    {/* User Property Listing (C2C) Routes (Public/Self-Authenticating) */}
                    <Route path="/list-property" element={<ListPropertyWizard />} />
                    <Route path="/list-property/dynamic-form" element={<DynamicFormEngine />} />
                    <Route path="/list-property/wizard/:categoryId/:id?" element={<AddDynamicWizard />} />
                    <Route path="/list-property/join-hotel/:id?" element={<AddHotelWizard />} />
                    <Route path="/list-property/join-resort/:id?" element={<AddResortWizard />} />
                    <Route path="/list-property/join-hostel/:id?" element={<AddHostelWizard />} />
                    <Route path="/list-property/join-villa/:id?" element={<AddVillaWizard />} />
                    <Route path="/list-property/join-pg/:id?" element={<AddPGWizard />} />
                    <Route path="/list-property/join-homestay/:id?" element={<AddHomestayWizard />} />

                    {/* Hotel/Partner Module Routes */}
                    <Route path="/hotel/login" element={<HotelLogin />} />
                    <Route path="/hotel/register" element={<HotelSignup />} />
                    <Route path="/hotel" element={<HotelLayout />}>
                      <Route index element={<Navigate to="/hotel/login" replace />} />
                      <Route path="partner" element={<Navigate to="/hotel" replace />} />
                      {/* Wizard Route */}
                      <Route element={<PartnerProtectedRoute />}>
                        <Route path="join" element={<PartnerJoinPropertyType />} />
                        <Route path="join-hotel" element={<AddHotelWizard />} />
                        <Route path="join-resort" element={<AddResortWizard />} />
                        <Route path="join-hostel" element={<AddHostelWizard />} />
                        <Route path="join-villa" element={<AddVillaWizard />} />
                        <Route path="join-pg" element={<AddPGWizard />} />
                        <Route path="join-homestay" element={<AddHomestayWizard />} />
                        <Route path="wizard/:categoryId" element={<AddDynamicWizard />} />
                        <Route path="join-dynamic/:categoryId" element={<AddDynamicWizard />} />
                        <Route path="partner-dashboard" element={<PartnerDashboard />} />
                        <Route path="dashboard" element={<PartnerDashboard />} />

                        {/* Partner Sub-pages */}
                        <Route path="properties" element={<PartnerProperties />} />
                        <Route path="properties/:id" element={<PartnerPropertyDetails />} />
                        <Route path="inventory-properties" element={<PartnerInventoryProperties />} />
                        <Route path="inventory/:id" element={<PartnerInventory />} />
                        <Route path="bookings" element={<PartnerBookings />} />
                        <Route path="bookings" element={<PartnerBookings />} />
                        <Route path="bookings/:id" element={<PartnerBookingDetail />} />
                        <Route path="wallet" element={<PartnerWallet />} />
                        <Route path="reviews" element={<PartnerReviews />} />
                        <Route path="transactions" element={<PartnerTransactions />} />
                        <Route path="notifications" element={<PartnerNotifications />} />
                        <Route path="kyc" element={<PartnerKYC />} />
                        <Route path="support" element={<PartnerSupport />} />
                        <Route path="terms" element={<PartnerTerms />} />
                        <Route path="about" element={<PartnerAbout />} />
                        <Route path="privacy" element={<PartnerPrivacy />} />
                        <Route path="contact" element={<PartnerContact />} />
                        <Route path="settings" element={<PartnerSettings />} />
                        <Route path="bank-details" element={<PartnerBankDetails />} />
                        <Route path="profile" element={<PartnerProfile />} />
                        <Route path="subscriptions" element={<PartnerSubscriptions />} />
                      </Route>
                    </Route>

                    {/* Admin Auth Routes */}
                    <Route path="/admin/login" element={<AdminLogin />} />
                    <Route path="/admin/signup" element={<AdminSignup />} />

                    {/* Admin App Routes */}
                    <Route element={<AdminProtectedRoute />}>
                      {/* Home Service Admin Routes */}
                      <Route path="/admin/home-service/*" element={<HomsterAdminRoutes />} />

                      <Route path="/admin" element={<AdminLayout />}>
                        <Route index element={<AdminDashboard />} />
                        <Route path="dashboard" element={<AdminDashboard />} />
                        <Route path="users" element={<AdminUsers />} />
                        <Route path="users/:id" element={<AdminUserDetail />} />
                        <Route path="bookings" element={<AdminBookings />} />
                        <Route path="bookings/:id" element={<AdminBookingDetail />} />
                        <Route path="enquiries" element={<AdminEnquiries />} />
                        <Route path="partners" element={<AdminPartners />} />
                        <Route path="partners/:id" element={<AdminPartnerDetail />} />
                        <Route path="builders" element={<AdminBuilders />} />
                        <Route path="builder-verification" element={<AdminBuilderVerification />} />
                        <Route path="reviews" element={<AdminReviews />} />
                        <Route path="finance" element={<AdminFinance />} />
                        <Route path="legal" element={<AdminLegalPages />} />
                        <Route path="contact-messages" element={<AdminContactMessages />} />
                        <Route path="settings" element={<AdminSettings />} />
                        <Route path="properties" element={<AdminProperties />} />
                        <Route path="properties/add" element={<AdminAddProperty />} />
                        <Route path="properties/:id" element={<AdminHotelDetail />} />
                        <Route path="projects" element={<AdminProjects />} />
                        <Route path="projects/add" element={<AdminAddProperty />} />
                        <Route path="projects/:id" element={<AdminHotelDetail />} />

                        <Route path="offers" element={<AdminOffers />} />
                        <Route path="notifications" element={<AdminNotifications />} />
                        <Route path="faqs" element={<AdminFaqs />} />
                        <Route path="categories" element={<AdminCategories />} />
                        <Route path="featured-projects" element={<AdminFeaturedProperties />} />
                        <Route path="subscriptions" element={<AdminSubscriptions />} />
                        <Route path="reel-analysis" element={<AdminReelAnalysis />} />
                        <Route path="banners" element={<AdminBanners />} />
                        <Route path="property-forms" element={<AdminPropertyFormManager />} />
                        <Route path="property-videos" element={<AdminPropertyVideos />} />
                        <Route path="locations" element={<AdminLocationsPage />} />
                        <Route path="managers" element={<AdminManagers />} />
                        <Route path="locality-insights" element={<AdminManageLocalityInsights />} />
                      </Route>
                    </Route>

                    {/* Manager Auth Routes */}
                    <Route path="/manager/login" element={<ManagerLogin />} />

                    {/* Manager App Routes */}
                    <Route element={<ManagerProtectedRoute />}>
                      <Route path="/manager" element={<ManagerLayout />}>
                        <Route index element={<ManagerDashboard />} />
                        <Route path="dashboard" element={<ManagerDashboard />} />

                        {/* User Management */}
                        <Route path="users" element={<AdminUsers />} />
                        <Route path="users/:id" element={<AdminUserDetail />} />

                        {/* Partner Management */}
                        <Route path="partners" element={<AdminPartners />} />
                        <Route path="partners/:id" element={<AdminPartnerDetail />} />
                        <Route path="builders" element={<AdminBuilders />} />

                        {/* Property & Project Management */}
                        <Route path="properties" element={<AdminProperties />} />
                        <Route path="properties/add" element={<AdminAddProperty />} />
                        <Route path="properties/:id" element={<AdminHotelDetail />} />
                        <Route path="projects" element={<AdminProjects />} />
                        <Route path="projects/:id" element={<AdminHotelDetail />} />

                        {/* Bookings & Enquiries */}
                        <Route path="bookings" element={<AdminBookings />} />
                        <Route path="bookings/:id" element={<AdminBookingDetail />} />
                        <Route path="enquiries" element={<AdminEnquiries />} />

                        {/* Content & Catalog */}
                        <Route path="categories" element={<AdminCategories />} />
                        <Route path="featured-projects" element={<AdminFeaturedProperties />} />
                        <Route path="banners" element={<AdminBanners />} />
                        <Route path="property-forms" element={<AdminPropertyFormManager />} />
                        <Route path="property-videos" element={<AdminPropertyVideos />} />
                        <Route path="locations" element={<AdminLocationsPage />} />
                        <Route path="reel-analysis" element={<AdminReelAnalysis />} />
                        <Route path="reviews" element={<AdminReviews />} />
                        <Route path="subscriptions" element={<AdminSubscriptions />} />

                        {/* System */}
                        <Route path="finance" element={<AdminFinance />} />
                        <Route path="offers" element={<AdminOffers />} />
                        <Route path="notifications" element={<AdminNotifications />} />
                        <Route path="legal" element={<AdminLegalPages />} />
                        <Route path="contact-messages" element={<AdminContactMessages />} />
                        <Route path="faqs" element={<AdminFaqs />} />
                        <Route path="settings" element={<AdminSettings />} />
                      </Route>
                    </Route>

                    {/* Protected User Pages */}
                    <Route element={<UserProtectedRoute />}>
                      <Route path="/reels/my" element={<MyReelsPage />} />
                      <Route path="/profile" element={<ProfileEdit />} />
                      <Route path="/bookings" element={<BookingsPage />} />
                      <Route path="/my-reviews" element={<UserMyReviewsPage />} />
                      <Route path="/wallet" element={<WalletPage />} />
                      <Route path="/payment" element={<PaymentPage />} />
                      <Route path="/support" element={<SupportPage />} />
                      <Route path="/checkout" element={<BookingCheckoutPage />} />
                      <Route path="/booking-confirmation" element={<BookingConfirmationPage />} />
                      <Route path="/booking/:id" element={<BookingConfirmationPage />} />
                      <Route path="/refer" element={<ReferAndEarnPage />} />
                      <Route path="/saved-places" element={<SavedPlacesPage />} />
                      <Route path="/notifications" element={<NotificationsPage />} />
                      <Route path="/settings" element={<SettingsPage />} />
                      <Route path="/user/cart" element={<CartPage />} />
                      <Route path="/user/home-services/checkout" element={<HomeServiceCheckoutPage />} />
                      <Route path="/user/home-services/bookings" element={<HomeServiceBookingsPage />} />
                      <Route path="/user/booking/:id" element={<HSBookingDetailsPage />} />
                      <Route path="/user/booking-confirmation/:id" element={<HSBookingConfirmationPage />} />
                      <Route path="/serviced" element={<div className="pt-20 text-center text-surface font-bold">Serviced Page</div>} />

                      {/* User Property Listing Dashboard & Bookings Routes (Protected) */}
                      <Route path="/my-properties" element={<MyProperties />} />
                      <Route path="/my-received-bookings" element={<UserReceivedBookingsPage />} />
                      <Route path="/my-enquiries" element={<UserReceivedEnquiriesPage />} />
                      <Route path="/my-subscriptions" element={<UserSubscriptionsPage />} />
                      <Route path="/my-property-dashboard/:id" element={<UserPropertyDashboard />} />
                      <Route path="/properties/:id" element={<PartnerPropertyDetails />} />
                    </Route>

                    {/* Worker Module Routes */}
                    <Route path="/worker/*" element={<WorkerRoutes />} />
                  </Routes>
                </Suspense>
              </Layout>
            </SocketProvider>
          </Router>
        </AuthProvider>
      </CartProvider>
    </CityProvider>
  );
}

export default App;
