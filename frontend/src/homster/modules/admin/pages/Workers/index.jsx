import React from 'react';
import { Routes, Route, Navigate, useLocation, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiUsers, FiClock, FiActivity, FiDollarSign } from 'react-icons/fi';

// Import sub-components
// Import sub-components
import AllWorkers from './AllWorkers';
import WorkerJobs from './WorkerJobs';
import WorkerAnalytics from './WorkerAnalytics';
import WorkerWithdrawals from './WorkerWithdrawals';
import MonthlyTarget from './MonthlyTarget';
import WorkerAchievements from './WorkerAchievements';
import WorkerSupportSettings from './WorkerSupportSettings';
import WorkerTrainingSettings from './WorkerTrainingSettings';
import WorkerComplaints from './WorkerComplaints';
import WorkerPrivacyPolicy from './WorkerPrivacyPolicy';

const Workers = () => {
  const location = useLocation();

  const navTabs = [
    { name: 'All Workers', path: '/admin/home-service/workers/all', icon: FiUsers },
    { name: 'Worker Jobs', path: '/admin/home-service/workers/jobs', icon: FiClock },
    { name: 'Withdrawals', path: '/admin/home-service/workers/withdrawals', icon: FiDollarSign },
    { name: 'Monthly Target', path: '/admin/home-service/workers/monthly-target', icon: FiActivity },
    { name: 'Worker Achievements', path: '/admin/home-service/workers/achievements', icon: FiActivity },
    { name: 'Support Settings', path: '/admin/home-service/workers/support', icon: FiActivity },
    { name: 'Privacy Policy', path: '/admin/home-service/workers/privacy-policy', icon: FiActivity },
    { name: 'Worker Training', path: '/admin/home-service/workers/training', icon: FiActivity },
    { name: 'Complaint Management', path: '/admin/home-service/workers/complaints', icon: FiActivity },
    { name: 'Worker Analytics', path: '/admin/home-service/workers/analytics', icon: FiActivity },
  ];

  const getPageTitle = () => {
    const currentTab = navTabs.find(tab => location.pathname === tab.path);
    return currentTab ? currentTab.name : 'Worker Management';
  };

  return (
    <div className="space-y-6">
      {/* Content Area */}
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Routes>
          <Route path="/" element={<Navigate to="all" replace />} />
          <Route path="all" element={<AllWorkers />} />
          <Route path="jobs" element={<WorkerJobs />} />
          <Route path="withdrawals" element={<WorkerWithdrawals />} />
          <Route path="monthly-target" element={<MonthlyTarget />} />
          <Route path="achievements" element={<WorkerAchievements />} />
          <Route path="support" element={<WorkerSupportSettings />} />
          <Route path="privacy-policy" element={<WorkerPrivacyPolicy />} />
          <Route path="training" element={<WorkerTrainingSettings />} />
          {/* Refer and Earn moved to the unified /admin/refer-earn page (Worker App tab) */}
          <Route path="referrals" element={<Navigate to="/admin/refer-earn" replace />} />
          <Route path="complaints" element={<WorkerComplaints />} />
          <Route path="analytics" element={<WorkerAnalytics />} />
        </Routes>
      </motion.div>
    </div>
  );
};

export default Workers;

