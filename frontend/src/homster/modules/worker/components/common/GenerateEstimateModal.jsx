import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiCheckCircle, FiDollarSign, FiPlus, FiTrash2 } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import workerService from '../../../../services/workerService';

const GenerateEstimateModal = ({ isOpen, onClose, bookingId, onSuccess }) => {
  const [estimatedAmount, setEstimatedAmount] = useState('');
  const [items, setItems] = useState([{ name: '', price: '' }]);
  const [loading, setLoading] = useState(false);
  const [breakdown, setBreakdown] = useState(null);

  useEffect(() => {
    // Calculate total from items
    const amount = items.reduce((sum, item) => sum + (Number(item.price) || 0), 0);
    setEstimatedAmount(amount > 0 ? amount.toString() : '');

    if (amount > 0) {
      const tokenAmount = Math.round(amount * 0.3); // 30% Token
      const adminCommission = Math.round(amount * 0.2); // 20% of Total Amount
      const workerAdvance = tokenAmount - adminCommission;
      setBreakdown({ tokenAmount, adminCommission, workerAdvance });
    } else {
      setBreakdown(null);
    }
  }, [items]);

  const handleSubmit = async () => {
    if (!estimatedAmount || isNaN(estimatedAmount) || Number(estimatedAmount) <= 0) {
      toast.error('Please enter valid item prices to calculate the estimate');
      return;
    }
    
    // Filter valid items
    const validItems = items.filter(item => item.name.trim() && item.price);
    if (validItems.length === 0) {
      toast.error('Please add at least one item with a valid name and price');
      return;
    }

    // Convert items array to string description for backend compatibility
    const description = validItems.map(item => `${item.name}: ₹${item.price}`).join(', ');

    setLoading(true);
    try {
      const payload = {
        estimatedAmount: Number(estimatedAmount),
        estimateDescription: description
      };
      
      const response = await workerService.generateEstimate(bookingId, payload);
      
      if (response.success) {
        toast.success('Estimate sent to customer!');
        onSuccess();
      } else {
        toast.error(response.message || 'Failed to generate estimate');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center p-0 sm:p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
          onClick={loading ? undefined : onClose}
        />
        
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="relative z-10 w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        >
          {/* Header */}
          <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
            <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <FiDollarSign className="w-5 h-5" />
              </div>
              Generate Estimate
            </h3>
            <button 
              onClick={onClose}
              disabled={loading}
              className="p-2 bg-gray-50 hover:bg-gray-100 rounded-full transition-colors"
            >
              <FiX className="w-5 h-5 text-gray-600 font-bold" />
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="p-6 overflow-y-auto custom-scrollbar flex-1 pb-24 sm:pb-6">
            <div className="space-y-5">
              
              <div>
                <label className="block text-sm font-black text-gray-700 mb-2">Total Estimated Amount (₹)</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <span className="text-gray-500 font-bold text-lg">₹</span>
                  </div>
                  <input 
                    type="number" 
                    value={estimatedAmount}
                    readOnly
                    placeholder="0"
                    className="w-full pl-9 pr-4 py-3.5 bg-gray-50 border-2 border-gray-100 rounded-2xl font-black text-xl text-gray-900 focus:outline-none focus:ring-0 transition-colors placeholder:text-gray-300 cursor-not-allowed"
                  />
                </div>
                <p className="text-[10px] text-gray-400 mt-1.5 font-bold uppercase tracking-wider">Auto-calculated from breakdown</p>
              </div>

              <div>
                <div className="flex justify-between items-end mb-2">
                  <label className="block text-sm font-black text-gray-700">Breakdown (Items / Labor)</label>
                </div>
                
                <div className="space-y-3">
                  {items.map((item, index) => (
                    <div key={index} className="flex gap-2 items-start">
                      <div className="flex-1">
                        <input 
                          type="text" 
                          value={item.name}
                          onChange={(e) => {
                            const newItems = [...items];
                            newItems[index] = { ...newItems[index], name: e.target.value };
                            setItems(newItems);
                          }}
                          placeholder="E.g. Labor, Material"
                          className="w-full px-4 py-3 bg-white border-2 border-gray-100 rounded-xl text-sm font-bold text-gray-900 focus:outline-none focus:border-emerald-500 transition-colors placeholder:text-gray-300"
                        />
                      </div>
                      <div className="w-[110px] relative shrink-0">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <span className="text-gray-400 font-bold text-sm">₹</span>
                        </div>
                        <input 
                          type="number" 
                          value={item.price}
                          onChange={(e) => {
                            const newItems = [...items];
                            newItems[index] = { ...newItems[index], price: e.target.value };
                            setItems(newItems);
                          }}
                          placeholder="Price"
                          className="w-full pl-7 pr-3 py-3 bg-white border-2 border-gray-100 rounded-xl text-sm font-bold text-gray-900 focus:outline-none focus:border-emerald-500 transition-colors placeholder:text-gray-300"
                        />
                      </div>
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const newItems = items.filter((_, i) => i !== index);
                            setItems(newItems);
                          }}
                          className="p-3 mt-0.5 bg-rose-50 text-rose-500 rounded-xl hover:bg-rose-100 transition-colors shrink-0"
                        >
                          <FiTrash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                
                <button
                  type="button"
                  onClick={() => setItems([...items, { name: '', price: '' }])}
                  className="mt-3 text-xs font-bold text-emerald-600 bg-emerald-50 px-4 py-2.5 rounded-xl hover:bg-emerald-100 transition-colors flex items-center gap-1.5"
                >
                  <FiPlus className="w-4 h-4" />
                  Add Item
                </button>
              </div>

              {breakdown && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100/50 p-5 rounded-2xl space-y-3 shadow-inner"
                >
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-gray-600">Required Token (30%):</span>
                    <span className="text-sm font-black text-gray-900">₹{breakdown.tokenAmount}</span>
                  </div>
                  <div className="flex justify-between items-center text-gray-500">
                    <span className="text-xs font-medium">Platform Commission (20% of total):</span>
                    <span className="text-xs font-bold text-rose-500">-₹{breakdown.adminCommission}</span>
                  </div>
                  
                  <div className="pt-3 mt-1 border-t border-emerald-200/60 border-dashed">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-black text-emerald-900">Your Advance Share:</span>
                      <span className="text-2xl font-black text-emerald-600 tracking-tight">₹{breakdown.workerAdvance}</span>
                    </div>
                  </div>
                  
                  <p className="text-[10px] font-medium text-emerald-600/80 leading-relaxed mt-2 bg-emerald-100/30 p-2 rounded-lg border border-emerald-200/30">
                    * The customer will pay this token amount online to approve the estimate. Your share will be added to your wallet automatically.
                  </p>
                </motion.div>
              )}

              <div className="pt-2">
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="w-full py-4 rounded-2xl font-black text-white shadow-xl shadow-emerald-200/50 hover:shadow-emerald-300/50 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center gap-2 text-[15px] tracking-wide"
                  style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)' }}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      SENDING...
                    </span>
                  ) : (
                    <>
                      SEND ESTIMATE TO CUSTOMER
                      <FiCheckCircle className="w-5 h-5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default GenerateEstimateModal;
