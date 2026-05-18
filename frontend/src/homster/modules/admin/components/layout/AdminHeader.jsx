import { useState, useEffect } from 'react';
import { FiMenu, FiBell, FiLogOut } from 'react-icons/fi';
import { useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import Button from '../Button';
import NotificationWindow from './NotificationWindow';
import { adminAuthService } from '../../../../services/authService';

const AdminHeader = ({ onMenuClick }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);

  const handleLogout = async () => {
    try {
      await adminAuthService.logout();
      toast.success('Logged out successfully');
      navigate('/admin/login');
    } catch (error) {
      console.error('Logout error:', error);
      // Even if API call fails, clear local storage and redirect
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('adminData');
      toast.success('Logged out successfully');
      navigate('/admin/login');
    }
  };

  const toggleNotifications = () => {
    setShowNotifications(!showNotifications);
  };

  // Get page info from pathname
  const getPageInfo = (pathname) => {
    const mappings = [
      { path: '/admin/home-service/dashboard', title: 'Dashboard', description: "Welcome back! Here's your business overview." },
      { path: '/admin/home-service/users/all', title: 'All Users', description: 'Manage platform customers and their activity' },
      { path: '/admin/home-service/users/bookings', title: 'User Bookings', description: 'Track customer booking history' },
      { path: '/admin/home-service/users/analytics', title: 'User Analytics', description: 'Analyze customer behavior and growth' },
      { path: '/admin/home-service/users/transactions', title: 'User Transactions', description: 'Monitor customer financial transactions' },
      { path: '/admin/home-service/users', title: 'Users', description: 'Manage platform customers and their activity' },
      { path: '/admin/home-service/vendors/all', title: 'All Vendors', description: 'Manage platform vendors and their activity' },
      { path: '/admin/home-service/vendors/analytics', title: 'Vendor Analytics', description: 'Analyze vendor performance' },
      { path: '/admin/home-service/vendors', title: 'Vendors', description: 'Manage vendor registrations and performance' },
      { path: '/admin/home-service/workers/all', title: 'All Workers', description: 'Manage platform workers and their activity' },
      { path: '/admin/home-service/workers/analytics', title: 'Worker Analytics', description: 'Analyze worker performance' },
      { path: '/admin/home-service/workers', title: 'Workers', description: 'Monitor and manage platform workers' },
      { path: '/admin/home-service/bookings', title: 'Bookings', description: 'Track and manage service bookings' },
      { path: '/admin/home-service/bookings/notifications', title: 'Order Notifications', description: 'Track booking alerts and updates' },
      { path: '/admin/home-service/user-categories/categories', title: 'Manage Categories', description: 'Add, edit and reorder home service categories' },
      { path: '/admin/home-service/user-categories/sub-categories', title: 'Manage Sub Categories', description: 'Add and manage sub-categories under each service category' },
      { path: '/admin/home-service/user-categories', title: 'User Catalog', description: 'Manage platform services and categories' },
      { path: '/admin/home-service/payments/users', title: 'User Transactions', description: 'Monitor customer financial transactions' },
      { path: '/admin/home-service/payments/vendors', title: 'Vendor Transactions', description: 'Monitor vendor earnings and payouts' },
      { path: '/admin/home-service/payments/workers', title: 'Worker Payments', description: 'Monitor and manage worker earnings and payouts' },
      { path: '/admin/home-service/payments/revenue', title: 'Admin Revenue', description: 'Track platform commissions and income' },
      { path: '/admin/home-service/payments/reports', title: 'Payment Report', description: 'Analyze payment data and financial insights' },
      { path: '/admin/home-service/payments', title: 'Payments & Settlements', description: 'Monitor transactions and revenue' },
      { path: '/admin/home-service/reports', title: 'Reports', description: 'Analyze platform performance with data insights' },
      { path: '/admin/home-service/notifications', title: 'Notifications', description: 'Stay updated with platform activities' },
      { path: '/admin/home-service/settings', title: 'Settings', description: 'Configure platform preferences' },
      { path: '/admin/home-service/plans', title: 'Subscription Plans', description: 'Manage service subscription plans' },
      { path: '/admin/home-service/services', title: 'Services', description: 'Manage platform service categories' },
      { path: '/admin/home-service/services', title: 'Services', description: 'Manage platform service categories' },
      { path: '/admin/home-service/settlements/pending', title: 'Pending Settlements', description: 'Review and approve vendor cash settlements' },
      { path: '/admin/home-service/settlements/withdrawals', title: 'Withdrawal Requests', description: 'Manage vendor payout requests' },
      { path: '/admin/home-service/settlements/vendors', title: 'Vendor Balances', description: 'Monitor vendor dues and credit limits' },
      { path: '/admin/home-service/settlements/history', title: 'Settlement History', description: 'View past transaction records' },
      { path: '/admin/home-service/settlements', title: 'Settlements', description: 'Manage financial settlements' },
      { path: '/admin/home-service/reviews', title: 'Reviews', description: 'Manage platform reviews and ratings' },
      { path: '/admin/home-service/scrap', title: 'Scrap Orders', description: 'Manage platform scrap collection orders' },
    ];

    const match = mappings.find(m => pathname === m.path || pathname.startsWith(m.path + '/'));

    if (match) return match;

    const path = pathname.split('/').pop() || 'dashboard';
    return {
      title: path.charAt(0).toUpperCase() + path.slice(1),
      description: `Manage your ${path} here.`
    };
  };

  const { title, description } = getPageInfo(location.pathname);

  // Notification Logic
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = async () => {
    try {
      // Import api dynamically if needed or just use fetch with auth headers
      // Since we don't have api imported, let's use adminAuthService's axios instance if available, or just fetch
      // Assuming api.js handles interceptors. Let's import api at top.
      const { default: api } = await import('../../../../services/api');
      const res = await api.get('/notifications/admin');
      if (res.data.success) {
        setNotifications(res.data.data);
        setUnreadCount(res.data.unreadCount);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  };

  useEffect(() => {
    // fetchNotifications();
    // Optional: Poll every 60 seconds
    // const interval = setInterval(fetchNotifications, 60000);
    // return () => clearInterval(interval);
  }, []);

  const handleMarkAsRead = async (id) => {
    try {
      const { default: api } = await import('../../../../services/api');
      await api.put(`/notifications/${id}/read`);
      // Optimistic update
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const { default: api } = await import('../../../../services/api');
      await api.put(`/notifications/read-all`);
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleDelete = async (id) => {
    try {
      const { default: api } = await import('../../../../services/api');
      await api.delete(`/notifications/${id}`);
      setNotifications(prev => prev.filter(n => n._id !== id));
      // If deleted was unread, decrease count? We don't know easily without checking.
      // Ideally re-fetch or check current state
      fetchNotifications();
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  return (
    <header
      className="bg-white fixed top-0 left-0 right-0 z-30 transition-all duration-300 lg:left-[278px] border-b border-gray-100 shadow-sm"
      style={{
        paddingTop: 'env(safe-area-inset-top, 0px)',
      }}
    >
      <div className="flex items-center justify-between px-4 lg:px-6 py-6">
        {/* Left: Menu Button & Page Title */}
        <div className="flex items-center gap-4">
          <Button
            onClick={onMenuClick}
            variant="icon"
            className="lg:hidden text-gray-700"
            icon={FiMenu}
          />
          <div>
            <h1 className="text-2xl font-bold text-gray-800 mb-1">{title}</h1>
            <p className="text-[10px] sm:text-xs text-gray-500 font-medium">{description}</p>
          </div>
        </div>

        {/* Right: Notifications & Logout */}
        <div className="flex items-center gap-4">
          {/* Admin Mode Toggle */}
          <div className="hidden lg:flex items-center bg-gray-100 rounded-full p-1 border border-gray-200 mr-2">
            <button
              onClick={() => navigate('/admin/dashboard')}
              className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${!location.pathname.includes('/home-service') ? 'bg-white text-black shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
            >
              Property
            </button>
            <button
              onClick={() => navigate('/admin/home-service/dashboard')}
              className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${location.pathname.includes('/home-service') ? 'bg-white text-black shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
            >
              Home Service
            </button>
          </div>

        </div>
      </div>
    </header>
  );
};

export default AdminHeader;


