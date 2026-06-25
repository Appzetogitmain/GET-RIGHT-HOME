import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { FiSend, FiShoppingCart, FiRefreshCw, FiUser, FiX } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import api from '../../../../services/api'; // Adjust path if needed

const AbandonedCarts = () => {
  const [carts, setCarts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Selection
  const [selectedUsers, setSelectedUsers] = useState(new Set());
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [notificationTitle, setNotificationTitle] = useState('');
  const [notificationBody, setNotificationBody] = useState('');
  const [sending, setSending] = useState(false);

  const fetchCarts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/abandoned-carts', {
        params: { limit: 50 }
      });
      if (res.data.success) {
        setCarts(res.data.carts || []);
      }
    } catch (error) {
      console.error('Error fetching abandoned carts:', error);
      toast.error('Failed to load abandoned carts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCarts();
  }, [fetchCarts]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchCarts();
    setRefreshing(false);
    toast.success('Carts refreshed');
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const allUserIds = carts.map(c => c.userId?._id).filter(id => id);
      setSelectedUsers(new Set(allUserIds));
    } else {
      setSelectedUsers(new Set());
    }
  };

  const handleSelectOne = (userId) => {
    const newSet = new Set(selectedUsers);
    if (newSet.has(userId)) {
      newSet.delete(userId);
    } else {
      newSet.add(userId);
    }
    setSelectedUsers(newSet);
  };

  const openSendModal = () => {
    if (selectedUsers.size === 0) {
      toast.error('Please select at least one user');
      return;
    }
    setNotificationTitle('Complete your booking!');
    setNotificationBody('You left items in your cart. Book now to get the best services!');
    setIsModalOpen(true);
  };

  const handleSendNotification = async (e) => {
    e.preventDefault();
    if (!notificationTitle || !notificationBody) {
      toast.error('Title and body are required');
      return;
    }

    try {
      setSending(true);
      const res = await api.post('/admin/notifications/send-targeted', {
        userIds: Array.from(selectedUsers),
        title: notificationTitle,
        body: notificationBody
      });
      
      if (res.data.success) {
        toast.success(res.data.message || 'Notification sent successfully');
        setIsModalOpen(false);
        setSelectedUsers(new Set());
      }
    } catch (error) {
      console.error('Error sending notification:', error);
      toast.error(error.response?.data?.message || 'Failed to send notification');
    } finally {
      setSending(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Header */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
            <FiShoppingCart className="text-orange-600 text-lg" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Abandoned Carts</h1>
            <p className="text-xs text-gray-500">
              Users with items in their cart but no booking
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            disabled={refreshing}
          >
            <FiRefreshCw className={`text-gray-500 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          
          <button
            onClick={openSendModal}
            disabled={selectedUsers.size === 0}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 font-semibold transition-colors ${
              selectedUsers.size > 0 
                ? 'bg-blue-600 text-white hover:bg-blue-700' 
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            <FiSend />
            Send Push Notification ({selectedUsers.size})
          </button>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-xs text-gray-500 mt-2">Loading carts...</p>
          </div>
        ) : carts.length === 0 ? (
          <div className="p-8 text-center">
            <FiShoppingCart className="text-4xl text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No abandoned carts found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wider">
                  <th className="p-4 w-10">
                    <input 
                      type="checkbox" 
                      onChange={handleSelectAll}
                      checked={selectedUsers.size === carts.filter(c => c.userId?._id).length && carts.length > 0}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer w-4 h-4"
                    />
                  </th>
                  <th className="p-4 font-semibold">User</th>
                  <th className="p-4 font-semibold">Cart Items</th>
                  <th className="p-4 font-semibold">Total Value</th>
                  <th className="p-4 font-semibold">Last Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {carts.map((cart) => {
                  if (!cart.userId) return null; // Skip if user deleted
                  
                  const isSelected = selectedUsers.has(cart.userId._id);
                  const totalItems = cart.items.reduce((acc, item) => acc + (item.serviceCount || 1), 0);
                  const totalValue = cart.items.reduce((acc, item) => acc + ((item.price || 0) * (item.serviceCount || 1)), 0);
                  
                  return (
                    <tr 
                      key={cart._id} 
                      className={`hover:bg-gray-50 transition-colors ${isSelected ? 'bg-blue-50/50' : ''}`}
                    >
                      <td className="p-4">
                        <input 
                          type="checkbox" 
                          checked={isSelected}
                          onChange={() => handleSelectOne(cart.userId._id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer w-4 h-4"
                        />
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          {cart.userId.avatar ? (
                            <img src={cart.userId.avatar} alt="avatar" className="w-8 h-8 rounded-full object-cover" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">
                              {cart.userId.name ? cart.userId.name.charAt(0).toUpperCase() : <FiUser />}
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{cart.userId.name || 'Unknown'}</p>
                            <p className="text-xs text-gray-500">{cart.userId.phone || cart.userId.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <span className="bg-orange-100 text-orange-700 font-bold px-2 py-0.5 rounded text-xs">
                            {totalItems} item{totalItems !== 1 ? 's' : ''}
                          </span>
                          <span className="text-xs text-gray-500 truncate max-w-[200px]">
                            {cart.items.map(i => i.title).join(', ')}
                          </span>
                        </div>
                      </td>
                      <td className="p-4">
                        <p className="text-sm font-semibold text-gray-900">₹{totalValue}</p>
                      </td>
                      <td className="p-4">
                        <p className="text-xs text-gray-500">
                          {formatDistanceToNow(new Date(cart.updatedAt), { addSuffix: true })}
                        </p>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Send Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <FiSend className="text-blue-600" />
                Send Notification to {selectedUsers.size} User{selectedUsers.size > 1 ? 's' : ''}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1 hover:bg-gray-200 rounded-lg transition-colors text-gray-500"
              >
                <FiX />
              </button>
            </div>
            
            <form onSubmit={handleSendNotification} className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Title</label>
                <input 
                  type="text" 
                  value={notificationTitle}
                  onChange={(e) => setNotificationTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. Complete your booking!"
                  required
                />
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Message Body</label>
                <textarea 
                  value={notificationBody}
                  onChange={(e) => setNotificationBody(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px] resize-none"
                  placeholder="e.g. You left items in your cart..."
                  required
                ></textarea>
              </div>
              
              <div className="pt-2 flex gap-3 justify-end">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={sending}
                  className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-2"
                >
                  {sending ? (
                    <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> Sending...</>
                  ) : (
                    <><FiSend /> Send Now</>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
};

export default AbandonedCarts;
