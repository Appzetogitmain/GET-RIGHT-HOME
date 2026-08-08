import { useState, useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiHome,
  FiUsers,
  FiBriefcase,
  FiUser,
  FiShoppingBag,
  FiGrid,
  FiDollarSign,
  FiFileText,
  FiBell,
  FiSettings,
  FiChevronDown,
  FiX,
  FiPackage,
  FiTrash2,
  FiStar,
  FiMap,
} from "react-icons/fi";
import adminMenu from "../../config/adminMenu.json";
import dashboardService from "../../services/dashboardService";
import Logo from "../../../../components/common/Logo";
import useAdminStore from "../../../../../app/admin/store/adminStore";

// Icon mapping for menu items
const iconMap = {
  Dashboard: FiHome,
  Users: FiUsers,
  Workers: FiUser,
  Bookings: FiShoppingBag,
  "User Catalog": FiGrid,
  Payments: FiDollarSign,
  Reports: FiFileText,
  Notifications: FiBell,
  "Scrap Items": FiTrash2,
  Reviews: FiStar,
  Settings: FiSettings,
  "Zone Setup": FiMap,
  Plans: FiPackage,
  "Worker Plans": FiBriefcase,
};

// Helper function to convert child name to route path
const getChildRoute = (parentRoute, childName) => {
  const routeMap = {
    "/admin/home-service/users": {
      "All Users": "/admin/home-service/users/all",
      "User Bookings": "/admin/home-service/users/bookings",
      "Transactions": "/admin/home-service/users/transactions",
      "User Analytics": "/admin/home-service/users/analytics",
    },
    "/admin/home-service/workers": {
      "All Workers": "/admin/home-service/workers/all",
      "Worker Jobs": "/admin/home-service/workers/jobs",
      "Worker Analytics": "/admin/home-service/workers/analytics",
      "Worker Payments": "/admin/home-service/workers/payments",
      "Withdrawals": "/admin/home-service/workers/withdrawals",
      "Monthly Target": "/admin/home-service/workers/monthly-target",
      "Worker Achievements": "/admin/home-service/workers/achievements",
      "Support Settings": "/admin/home-service/workers/support",
      "Privacy Policy": "/admin/home-service/workers/privacy-policy",
      "Worker Training": "/admin/home-service/workers/training",
      "Complaint Management": "/admin/home-service/workers/complaints",
    },
    "/admin/home-service/bookings": {
      "All Bookings": "/admin/home-service/bookings",
      "Booking Tracking": "/admin/home-service/bookings/tracking",
      "Booking Notifications": "/admin/home-service/bookings/notifications",
    },
    "/admin/home-service/user-categories": {
      "Home": "/admin/home-service/user-categories/home",
      "Manage Categories": "/admin/home-service/user-categories/categories",
      "Manage Sub Categories": "/admin/home-service/user-categories/sub-categories",
      "Manage Services": "/admin/home-service/user-categories/sections",
      "Manage Membership": "/admin/home-service/user-categories/membership",
    },
    "/admin/home-service/payments": {
      "Payment Overview": "/admin/home-service/payments/overview",
      "User Payments": "/admin/home-service/payments/users",
      "Worker Payments": "/admin/home-service/payments/workers",
      "Admin Revenue": "/admin/home-service/payments/revenue",
      "Payment Reports": "/admin/home-service/payments/reports",
    },
    "/admin/home-service/reports": {
      "Revenue Report": "/admin/home-service/reports/revenue",
      "Booking Report": "/admin/home-service/reports/bookings",
      "Payment Report": "/admin/home-service/payments/reports",
    },
    "/admin/home-service/notifications": {
      "Push Notifications": "/admin/home-service/notifications/push",
      "Custom Messages": "/admin/home-service/notifications/messages",
      "Notification Settings": "/admin/home-service/notifications/settings",
      "Abandoned Carts": "/admin/home-service/notifications/abandoned-carts",
    },
    "/admin/home-service/settings": {
      "General Settings": "/admin/home-service/settings/general",
      "Worker Assignment": "/admin/home-service/settings/worker-assignment",
      "Service Configuration": "/admin/home-service/settings/service-config",
      "System Settings": "/admin/home-service/settings/system",
    },
  };

  return routeMap[parentRoute]?.[childName] || parentRoute;
};

const AdminSidebar = ({ isOpen, onClose }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [expandedItems, setExpandedItems] = useState({});
  const [isMobile, setIsMobile] = useState(false);
  const [adminUser, setAdminUser] = useState({ name: 'Admin', email: '', role: 'admin' });
  const { admin: storeAdmin } = useAdminStore();
  const [counts, setCounts] = useState({
    bookings: 0,
    scraps: 0
  });

  // Load admin user from storage/store
  useEffect(() => {
    if (storeAdmin) {
      setAdminUser({
        name: storeAdmin.name || 'Admin',
        email: storeAdmin.email || '',
        role: storeAdmin.role || 'admin'
      });
      return;
    }
    try {
      const storedData = sessionStorage.getItem('adminData') || localStorage.getItem('adminData');
      const stored = JSON.parse(storedData || '{}');
      if (stored.name || stored.email) {
        setAdminUser({
          name: stored.name || 'Admin',
          email: stored.email || '',
          role: stored.role || 'admin'
        });
      }
    } catch (e) {
      console.error('Failed to parse admin data:', e);
    }
  }, [storeAdmin]);

  // Filter menu items by role
  const filteredMenu = useMemo(() => {
    console.log('AdminSidebar - adminUser.role:', adminUser.role);
    const menu = adminMenu.filter(item => {
      if (!item.allowedRoles) return true;
      const normalizedRole = adminUser.role === 'superadmin' ? 'super_admin' : adminUser.role;
      return item.allowedRoles.includes(normalizedRole);
    });
    console.log('AdminSidebar - filteredMenu:', menu);
    return menu;
  }, [adminUser.role]);

  // Fetch pending counts for badges
  useEffect(() => {
    // const fetchCounts = async () => {
    //   try {
    //     const response = await dashboardService.getStats();
    //     if (response.success && response.data?.stats) {
    //       const stats = response.data.stats;
    //       setCounts({
    //         bookings: stats.pendingBookings || 0,
    //         scraps: stats.pendingScraps || 0
    //       });
    //     }
    //   } catch (error) {
    //     console.error("Error fetching sidebar counts:", error);
    //   }
    // };

    // fetchCounts();
    // Refresh every 30 seconds
    // const interval = setInterval(fetchCounts, 30000);
    // return () => clearInterval(interval);
  }, []);

  // Check if mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Auto-close sidebar on mobile when route changes
  // Auto-close sidebar on mobile when route changes
  useEffect(() => {
    // Only close if screen is small (mobile)
    if (window.innerWidth < 1024) {
      onClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]); // Remove onClose to prevent re-triggering when parent re-renders

  // Auto-expand menu items when their route is active
  useEffect(() => {
    const activeItem = filteredMenu.find((item) => {
      if (item.route === "/admin/home-service/dashboard") {
        return location.pathname === "/admin/home-service/dashboard";
      }
      const isChildRoute =
        location.pathname.startsWith(item.route) &&
        location.pathname !== item.route;
      return isChildRoute;
    });
    if (activeItem && activeItem.children && activeItem.children.length > 0) {
      setExpandedItems((prev) => {
        if (prev[activeItem.title]) {
          return prev;
        }
        return {
          [activeItem.title]: true,
        };
      });
    }
  }, [location.pathname, filteredMenu]);

  // Check if a menu item is active
  const isActive = (route) => {
    if (route === "/admin/home-service/dashboard") {
      return location.pathname === "/admin/home-service/dashboard";
    }

    // Strict prefix check: either exact match OR followed by a slash
    return location.pathname === route || location.pathname.startsWith(route + '/');
  };

  // Toggle expanded state for menu items with children
  const toggleExpand = (title, closeOthers = true) => {
    setExpandedItems((prev) => {
      if (closeOthers) {
        return {
          [title]: !prev[title],
        };
      } else {
        return {
          ...prev,
          [title]: !prev[title],
        };
      }
    });
  };

  // Handle menu item click
  const handleMenuItemClick = (route, parentTitle = null) => {
    if (parentTitle) {
      setExpandedItems((prev) => {
        return {
          [parentTitle]: true,
        };
      });
    }
    navigate(route);
    if (window.innerWidth < 1024) {
      onClose();
    }
  };

  // Render menu item
  const renderMenuItem = (item) => {
    const Icon = iconMap[item.title] || FiHome;
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems[item.title];
    const active = isActive(item.route);

    return (
      <div key={item.route} className="mb-1">
        {/* Main Menu Item */}
        <div
          className={`
            flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 cursor-pointer
            ${active
              ? "bg-primary-600 text-white shadow-sm"
              : "text-gray-300 hover:bg-slate-700"
            }
          `}
          onClick={() => {
            if (hasChildren) {
              toggleExpand(item.title, true);
            } else {
              handleMenuItemClick(item.route);
            }
          }}>
          <Icon
            className={`text-xl flex-shrink-0 ${active ? "text-white" : "text-gray-400"
              }`}
          />
          <span className="font-semibold flex-1 text-base">{item.title}</span>

          {/* Badge Display */}
          {item.title === "Bookings" && counts.bookings > 0 && (
            <span className="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm animate-pulse mr-2">
              {counts.bookings > 99 ? '99+' : counts.bookings}
            </span>
          )}
          {item.title === "Scrap Items" && counts.scraps > 0 && (
            <span className="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm animate-pulse mr-2">
              {counts.scraps > 99 ? '99+' : counts.scraps}
            </span>
          )}

          {hasChildren && (
            <motion.div
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}>
              <FiChevronDown className="text-gray-400 text-sm" />
            </motion.div>
          )}
        </div>

        {/* Children Items */}
        <AnimatePresence>
          {hasChildren && isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden">
              <div className="ml-4 mt-1 pl-4 border-l-2 border-slate-600 space-y-1">
                {item.children.map((child, index) => {
                  const childRoute = getChildRoute(item.route, child);
                  const isChildActive =
                    location.pathname === childRoute ||
                    (childRoute !== item.route &&
                      location.pathname.startsWith(childRoute + '/'));

                  return (
                    <div
                      key={index}
                      onClick={() =>
                        handleMenuItemClick(childRoute, item.title)
                      }
                      className={`
                        px-3 py-2 text-sm rounded-lg transition-colors cursor-pointer flex justify-between items-center
                        ${isChildActive
                          ? "bg-primary-50 text-white font-medium"
                          : "text-gray-400 hover:bg-slate-700"
                        }
                      `}>
                      <span>{child}</span>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  // Sidebar content
  const sidebarContent = (
    <div className="h-full w-full flex flex-col bg-slate-800">
      {/* Header Section */}
      <div className="px-4 py-6 border-b border-slate-700 bg-slate-900">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="flex items-center justify-center p-1 bg-white/10 rounded-xl">
              <Logo className="h-10 w-auto" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-semibold text-white text-base truncate">
                {adminUser.name}
              </h2>
              <p className="text-xs text-gray-400 truncate">
                {(adminUser.role === 'superadmin' || adminUser.role === 'super_admin') ? '⭐ Super Admin' : 'Admin'}
              </p>
            </div>
          </div>

          {/* Close Button - Mobile Only */}
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors flex-shrink-0 lg:hidden"
            aria-label="Close sidebar">
            <FiX className="text-xl text-gray-300" />
          </button>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 overflow-y-auto p-3 scrollbar-admin lg:pb-3">
        {filteredMenu.map((item) => renderMenuItem(item))}
      </nav>
    </div>
  );

  return (
    <>
      {/* Mobile: Overlay Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 z-[99998] lg:hidden backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      {/* Sidebar - Mobile Drawer */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed left-0 top-0 bottom-0 w-[280px] z-[99999] lg:hidden shadow-2xl"
          >
            {sidebarContent}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sidebar - Desktop Fixed */}
      <div
        className="hidden lg:flex fixed left-0 top-0 bottom-0 z-30"
        style={{ width: '278px' }}
      >
        {sidebarContent}
      </div>
    </>
  );
};

export default AdminSidebar;


