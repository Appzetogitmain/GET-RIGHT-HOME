import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Users, ShoppingBag, DollarSign, Activity } from 'lucide-react';
import RevenueLineChart from '../../components/dashboard/RevenueLineChart';
import BookingsBarChart from '../../components/dashboard/BookingsBarChart';
import BookingStatusPieChart from '../../components/dashboard/BookingStatusPieChart';
import PaymentBreakdownPieChart from '../../components/dashboard/PaymentBreakdownPieChart';
import RevenueVsBookingsChart from '../../components/dashboard/RevenueVsBookingsChart';
import TimePeriodFilter from '../../components/dashboard/TimePeriodFilter';
import { formatCurrency } from '../../utils/adminHelpers';
import CustomerGrowthAreaChart from '../../components/dashboard/CustomerGrowthAreaChart';
import TopServices from '../../components/dashboard/TopServices';
import RecentBookings from '../../components/dashboard/RecentBookings';
import { getDashboardStats, getRevenueAnalytics } from '../../../../services/adminDashboardService';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [period, setPeriod] = useState('month');
  const [customDates, setCustomDates] = useState({
    start: new Date(new Date().setDate(new Date().getDate() - 7)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [revenueData, setRevenueData] = useState([]);
  const [recentBookingsList, setRecentBookingsList] = useState([]);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalWorkers: 0,
    activeBookings: 0,
    completedBookings: 0,
    totalRevenue: 0,
    todayRevenue: 0,
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 1. Calculate Period Dates
        let apiPeriod = 'monthly';
        let startDate = new Date();
        let endDate = new Date().toISOString();

        if (period === 'year') {
          apiPeriod = 'monthly';
          startDate.setFullYear(startDate.getFullYear() - 1);
        } else if (period === 'week') {
          apiPeriod = 'daily';
          startDate.setDate(startDate.getDate() - 7);
        } else if (period === 'month') {
          apiPeriod = 'daily';
          startDate.setDate(startDate.getDate() - 30);
        } else if (period === 'custom') {
          apiPeriod = 'daily';
          startDate = new Date(customDates.start);
          const customEndDate = new Date(customDates.end);
          customEndDate.setHours(23, 59, 59, 999);
          endDate = customEndDate.toISOString();
        } else {
          apiPeriod = 'daily';
          startDate.setDate(startDate.getDate() - 1);
        }

        const startIso = startDate.toISOString();

        // 2. Fetch Stats & Recent Bookings (Filtered)
        const statsRes = await getDashboardStats({
          startDate: startIso,
          endDate
        });

        if (statsRes && statsRes.success) {
          const s = statsRes.stats || {};
          setStats({
            totalUsers: s.totalUsers,
            totalWorkers: s.totalWorkers,
            activeBookings: s.pendingBookings || s.totalBookings, // using totalBookings or activeBookings from backend
            completedBookings: s.completedBookings || 0,
            totalRevenue: s.totalRevenue,
            bookingRevenue: s.bookingRevenue || 0,
            workerSubscriptionRevenue: s.workerSubscriptionRevenue || 0,
            todayRevenue: 0,
          });
          setRecentBookingsList(statsRes.recentBookings || []);
        }


        // 3. Fetch Revenue Analytics based on Period
        const revRes = await getRevenueAnalytics({
          period: apiPeriod,
          startDate: startIso,
          endDate
        });

        if (revRes.success) {
          const sourceData = revRes.data.revenueData || (Array.isArray(revRes.data) ? revRes.data : []);
          const mapped = sourceData.map(item => ({
            date: item._id,
            revenue: item.revenue || 0,
            orders: item.bookings || 0
          }));
          mapped.sort((a, b) => new Date(a.date) - new Date(b.date));
          setRevenueData(mapped);
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      }
    };

    fetchData();
  }, [period, customDates.start, customDates.end]);

  const handleExportCsv = () => {
    try {
      const rows = revenueData.map((r) => ({
        date: r.date,
        bookings: r.orders,
        revenue: r.revenue,
      }));

      const headers = ['date', 'bookings', 'revenue'];
      const csv = [
        headers.join(','),
        ...rows.map((row) => headers.map((h) => JSON.stringify(row[h] ?? '')).join(',')),
      ].join('\n');

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `admin_dashboard_${period}_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('CSV export failed', e);
      alert('Export failed.');
    }
  };

  const onViewBooking = (booking) => {
    if (booking?._id || booking?.id) navigate(`/admin/bookings/${booking._id || booking.id}`);
  };

  const statsCards = [
    {
      title: period === 'month' ? 'Monthly Revenue' : period === 'year' ? 'Yearly Revenue' : period === 'today' ? 'Today\'s Revenue' : period === 'week' ? 'Weekly Revenue' : 'Revenue',
      value: formatCurrency(stats.totalRevenue || 0),
      icon: DollarSign,
      color: 'text-amber-500',
      link: '/admin/home-service/reports/revenue'
    },
    {
      title: 'Pending Bookings',
      value: (stats.activeBookings || 0).toLocaleString(),
      icon: ShoppingBag,
      color: 'text-blue-500',
      link: '/admin/home-service/reports/bookings'
    },
    {
      title: 'Completed Bookings',
      value: (stats.completedBookings || 0).toLocaleString(),
      icon: Activity,
      color: 'text-purple-500',
      link: '/admin/home-service/reports/bookings'
    },
    {
      title: 'Total Workers',
      value: (stats.totalWorkers || 0).toLocaleString(),
      icon: Users,
      color: 'text-orange-500',
      link: '/admin/home-service/workers/all'
    }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      {/* Header — matches the Property dashboard's header treatment */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Home Services Dashboard</h1>
            <p className="text-gray-500 mt-1">Real-time insights into your home services business.</p>
        </div>
      </div>

      <TimePeriodFilter
        selectedPeriod={period}
        onPeriodChange={setPeriod}
        onExport={handleExportCsv}
        customDates={customDates}
        onCustomDateChange={setCustomDates}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsCards.map((card, index) => {
          const Icon = card.icon;

          return (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08 }}
              onClick={() => card.link && navigate(card.link)}
              className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden h-full flex flex-col justify-between cursor-pointer hover:shadow-md transition-shadow"
            >
              <div className={`absolute top-0 right-0 p-4 opacity-5 ${card.color}`}>
                <Icon size={80} />
              </div>

              <div className="relative z-10">
                <div className={`inline-flex p-3 rounded-2xl mb-4 ${card.color.replace('text-', 'bg-').replace('500', '100')} ${card.color}`}>
                  <Icon size={24} />
                </div>
                <p className="text-sm font-medium text-gray-500 mb-1">{card.title}</p>
                <h3 className="text-3xl font-bold text-gray-900 tracking-tight">{card.value}</h3>
              </div>
            </motion.div>
          );
        })}
      </div>


      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <BookingStatusPieChart bookings={recentBookingsList} />
        <PaymentBreakdownPieChart bookings={recentBookingsList} />
      </div>


      <div className="grid grid-cols-1 gap-4">
        <CustomerGrowthAreaChart timelineData={revenueData} bookings={recentBookingsList} period={period} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TopServices
          bookings={recentBookingsList}
          periodLabel="Top Booked Services (Recent)"
        />
        <RecentBookings bookings={recentBookingsList} onViewBooking={onViewBooking} />
      </div>
    </motion.div>
  );
};

export default AdminDashboard;


