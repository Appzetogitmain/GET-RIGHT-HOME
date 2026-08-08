import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Mail, Phone, Ban, CheckCircle, Unlock, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { adminUserService } from '../../../../services/adminUserService';

const UserStatusBadge = ({ isBlocked }) => (
  <span className={`flex items-center w-fit px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${isBlocked
    ? 'bg-red-100 text-red-700 border-red-200'
    : 'bg-green-100 text-green-700 border-green-200'
    }`}>
    {isBlocked ? <Ban size={10} className="mr-1" /> : <CheckCircle size={10} className="mr-1" />}
    {isBlocked ? 'Blocked' : 'Active'}
  </span>
);

const AllUsers = () => {
  const location = useLocation();
  // Sidebar sub-links (All / Active / Blocked) deep-link here via ?status=
  // (the dropdown's internal value is 'inactive', the sidebar/API use 'blocked')
  const rawStatusParam = new URLSearchParams(location.search).get('status');
  const initialStatus = rawStatusParam === 'blocked' ? 'inactive' : (rawStatusParam || 'all');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(initialStatus); // all, active, inactive
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);

  // Debounce search
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 500);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = {
        page,
        limit: 10,
        search: debouncedSearch
      };

      if (statusFilter !== 'all') {
        params.status = statusFilter === 'active' ? 'active' : 'blocked';
      }

      const response = await adminUserService.getAllUsers(params);
      if (response.success) {
        setUsers(response.users || []);
        setTotalPages(Math.max(1, Math.ceil((response.total || 0) / (response.limit || 10))));
        setTotalUsers(response.total || 0);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [page, debouncedSearch, statusFilter]);

  const handleStatusToggle = async (userId, currentlyBlocked) => {
    if (!window.confirm(`Are you sure you want to ${currentlyBlocked ? 'activate' : 'block'} this user?`)) {
      return;
    }

    try {
      const response = await adminUserService.toggleUserStatus(userId, !currentlyBlocked);
      if (response.success) {
        toast.success(response.message);
        setUsers(users.map(user =>
          user._id === userId ? { ...user, isBlocked: !currentlyBlocked } : user
        ));
      }
    } catch (error) {
      toast.error(error.message || 'Failed to update user status');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await adminUserService.deleteUser(userId);
      if (response.success) {
        toast.success(response.message);
        fetchUsers();
      }
    } catch (error) {
      toast.error(error.message || 'Failed to delete user');
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 uppercase">Home Service Users ({totalUsers})</h2>
          <p className="text-gray-500 text-[10px] font-bold uppercase tracking-tight">View and manage customers using the home services platform.</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 border border-gray-200 rounded-2xl shadow-sm flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search via name, email or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-transparent rounded-xl text-xs font-bold uppercase focus:bg-white focus:border-black outline-none transition-all tracking-tight"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 bg-gray-50 border border-transparent rounded-xl text-[10px] font-bold uppercase outline-none focus:bg-white focus:border-black transition-all cursor-pointer w-full md:w-auto"
        >
          <option value="all">All Status</option>
          <option value="active">Active Only</option>
          <option value="inactive">Blocked Only</option>
        </select>
      </div>

      {/* Table Card */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden min-h-[400px]">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-[10px] uppercase tracking-wider text-gray-500 font-bold">
                <th className="p-4">User Details</th>
                <th className="p-4">Contact Info</th>
                <th className="p-4">Account Status</th>
                <th className="p-4">Joined Date</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                [1, 2, 3, 4, 5].map(i => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan="5" className="p-4"><div className="h-10 bg-gray-50 rounded-lg"></div></td>
                  </tr>
                ))
              ) : (
                <AnimatePresence>
                  {users.length > 0 ? (
                    users.map((user, index) => (
                      <motion.tr
                        key={user._id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ delay: index * 0.05 }}
                        className="hover:bg-gray-50/50 transition-colors group"
                      >
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center shrink-0 border border-white shadow-sm font-bold uppercase text-xs">
                              {user.name?.charAt(0) || 'U'}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-gray-900 uppercase tracking-tight">{user.name}</p>
                              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">ID: {user._id.slice(-6).toUpperCase()}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center text-[10px] font-bold text-gray-600 uppercase tracking-tight">
                              <Mail size={12} className="mr-1.5 text-gray-400" />
                              {user.email || 'N/A'}
                            </div>
                            <div className="flex items-center text-[10px] font-bold text-gray-600 uppercase tracking-tight">
                              <Phone size={12} className="mr-1.5 text-gray-400" />
                              {user.phone || 'N/A'}
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <UserStatusBadge isBlocked={user.isBlocked} />
                        </td>
                        <td className="p-4 text-[10px] font-bold text-gray-500 uppercase">
                          {new Date(user.createdAt).toLocaleDateString('en-IN', {
                            day: '2-digit', month: 'short', year: 'numeric'
                          })}
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex justify-end gap-1.5">
                            {user.isBlocked ? (
                              <button
                                onClick={() => handleStatusToggle(user._id, user.isBlocked)}
                                className="p-2 rounded-lg text-green-600 hover:bg-green-50 transition-colors"
                                title="Unblock User"
                              >
                                <Unlock size={14} />
                              </button>
                            ) : (
                              <button
                                onClick={() => handleStatusToggle(user._id, user.isBlocked)}
                                className="p-2 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                                title="Block User"
                              >
                                <Ban size={14} />
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteUser(user._id)}
                              className="p-2 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                              title="Delete User"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="p-8 text-center text-gray-400 text-[10px] font-bold uppercase tracking-widest">
                        No users found
                      </td>
                    </tr>
                  )}
                </AnimatePresence>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && users.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50/30">
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-tight">
              Showing {users.length} of {totalUsers} users
            </p>
            <div className="flex gap-1.5">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 border border-gray-200 rounded-lg text-[10px] font-bold uppercase text-gray-600 disabled:opacity-50 hover:bg-white transition-all"
              >
                Prev
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 border border-gray-200 rounded-lg text-[10px] font-bold uppercase text-gray-600 disabled:opacity-50 hover:bg-white transition-all"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AllUsers;
