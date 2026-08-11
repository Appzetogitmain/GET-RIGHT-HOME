import React, { useState, useEffect, useLayoutEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiCheck, FiTool, FiPackage, FiFileText, FiPlus, FiTrash2, FiArrowLeft, FiDollarSign, FiClock, FiCreditCard, FiArrowRight, FiKey, FiCheckCircle } from 'react-icons/fi';
import { MdQrCode } from 'react-icons/md';
import { toast } from 'react-hot-toast';
import { workerTheme as themeColors } from '../../../../theme';
import { useAppNotifications } from '../../../../hooks/useAppNotifications';
import { OtpVerificationModal, ScanAndPayModal } from '../../components/common';
import workerBillService from '../../../../services/workerBillService';
import workerService from '../../../../services/workerService';
import { publicCatalogService } from '../../../../services/catalogService';

const BillingPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  // Always replace history so back button doesn't return to billing after job completion
  const goToDashboard = () => navigate('/worker/dashboard', { replace: true });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [job, setJob] = useState(null);

  // --- VIEW MODE: 'timeline' | 'select-services' | 'select-parts' ---
  const [viewMode, setViewMode] = useState('timeline');
  const [currentStep, setCurrentStep] = useState(() => {
    const saved = localStorage.getItem(`worker_billing_step_${id}`);
    return saved ? Math.max(parseInt(saved), 3) : 3;
  });
  const [maxStep, setMaxStep] = useState(() => {
    const saved = localStorage.getItem(`worker_billing_max_step_${id}`);
    return saved ? Math.max(parseInt(saved), 3) : 3;
  });

  // Track max step reached for timeline highlighting
  useEffect(() => {
    if (id) {
      localStorage.setItem(`worker_billing_step_${id}`, currentStep);
      if (currentStep > maxStep) {
        setMaxStep(currentStep);
        localStorage.setItem(`worker_billing_max_step_${id}`, currentStep);
      }
    }
  }, [currentStep, id]);

  // Catalogs
  const [servicesCatalog, setServicesCatalog] = useState([]);
  const [partsCatalog, setPartsCatalog] = useState([]);
  const [serviceCategories, setServiceCategories] = useState(['All']);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [partCategories, setPartCategories] = useState(['All']);
  const [selectedPartCategory, setSelectedPartCategory] = useState('All');

  // New Data Structure
  const [selectedServices, setSelectedServices] = useState([]);
  const [selectedParts, setSelectedParts] = useState([]);
  const [customItems, setCustomItems] = useState([]);
  const [transportCharges, setTransportCharges] = useState(0);
  const [applyPartsGST, setApplyPartsGST] = useState(false);

  // Search
  const [serviceSearch, setServiceSearch] = useState('');
  const [partSearch, setPartSearch] = useState('');

  // OTP State
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);

  // Payment Options
  const [onlinePaymentData, setOnlinePaymentData] = useState(null);
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrLoading, setQrLoading] = useState(false);
  const [paymentMode, setPaymentMode] = useState(null); // 'cash' | 'online'

  const socket = useAppNotifications('worker');

  // --- Settings ---
  const [payoutSettings, setPayoutSettings] = useState({
    serviceGstPct: 18,
    partsGstPct: 18,
    servicePayoutPct: 90,
    partsPayoutPct: 100
  });

  const [platformFees, setPlatformFees] = useState({
    platformFlatFee: 0,
    cashCollectionFee: 0
  });

  // Fetch Data
  useEffect(() => {
    fetchData();
  }, [id]);

  // Scroll to top on mount or view change or loading complete
  useLayoutEffect(() => {
    const scrollToTop = () => {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      document.documentElement.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    };

    scrollToTop();
    const timer = setTimeout(scrollToTop, 50);
    return () => clearTimeout(timer);
  }, [id, viewMode, currentStep, loading]);

  // Save draft data
  useEffect(() => {
    if (id && !loading) {
      const data = { selectedServices, selectedParts, customItems, transportCharges, applyPartsGST };
      localStorage.setItem(`worker_billing_data_${id}`, JSON.stringify(data));
    }
  }, [id, selectedServices, selectedParts, customItems, transportCharges, applyPartsGST, loading]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const jobRes = await workerService.getJobById(id);
      const jobData = jobRes.data || jobRes;
      setJob(jobData);

      // Check for existing OTP
      if (jobData?.customerConfirmationOTP || jobData?.paymentOtp) {
        setIsOtpSent(true);
      }

      const [servicesRes, partsRes, catRes] = await Promise.all([
        workerBillService.getServiceCatalog(),
        workerBillService.getPartsCatalog(),
        publicCatalogService.getCategories().catch(() => ({ success: false }))
      ]);
      const services = servicesRes.services || [];
      const parts = partsRes.parts || [];

      setServicesCatalog(services);
      setPartsCatalog(parts);

      // Extract categories from categories API or catalog items
      if (catRes && catRes.success) {
        const apiCats = (catRes.categories || catRes.data || []).map(c => c.title);
        const allCats = ['All', ...apiCats];

        // Add Uncategorized if any catalog item is missing a category
        const hasUncategorizedServices = services.some(s => !s.categoryId?.title);
        const hasUncategorizedParts = parts.some(p => !p.categoryId?.title);
        if (hasUncategorizedServices || hasUncategorizedParts) {
          allCats.push('Uncategorized');
        }

        const uniqueCats = [...new Set(allCats)].filter(Boolean);
        setServiceCategories(uniqueCats);
        setPartCategories(uniqueCats);
      } else {
        const cats = ['All', ...new Set(services.map(s => s.categoryId?.title || 'Uncategorized'))];
        setServiceCategories(cats.filter(Boolean));
        const pCats = ['All', ...new Set(parts.map(p => p.categoryId?.title || 'Uncategorized'))];
        setPartCategories(pCats.filter(Boolean));
      }

      // 1. Try to load from Local Storage (Draft)
      const savedDraft = localStorage.getItem(`worker_billing_data_${id}`);
      let hasDraft = false;
      if (savedDraft) {
        try {
          const parsed = JSON.parse(savedDraft);
          setSelectedServices(parsed.selectedServices || []);
          setSelectedParts(parsed.selectedParts || []);
          setCustomItems(parsed.customItems || []);
          setTransportCharges(parsed.transportCharges || 0);
          setApplyPartsGST(false);
          hasDraft = true;
        } catch (e) {
          console.error('Error parsing draft:', e);
        }
      }

      // 2. Load from Backend
      const billRes = await workerBillService.getBill(id);
      if (billRes.success) {
        if (billRes.platformSettings) {
          setPlatformFees({
            platformFlatFee: billRes.platformSettings.platformFlatFee || 0,
            cashCollectionFee: billRes.platformSettings.cashCollectionFee || 0,
            applyGst: billRes.platformSettings.applyGst || false
          });
        }
        
        if (billRes.bill) {
          if (!hasDraft) {
            setSelectedServices((billRes.bill.services || []).filter(s => !s.isOriginal));
            setSelectedParts(billRes.bill.parts || []);
            setCustomItems(billRes.bill.customItems || []);
            setTransportCharges(billRes.bill.transportCharges || 0);
            setApplyPartsGST(false);
          }

          if (billRes.bill.payoutConfig) {
          const pc = billRes.bill.payoutConfig;
          setPayoutSettings({
            serviceGstPct: pc.serviceGstPercentage ?? 18,
            partsGstPct: pc.partsGstPercentage ?? 18,
            servicePayoutPct: pc.serviceSplitPercentage ?? 90,
            partsPayoutPct: pc.partsSplitPercentage ?? 100
          });
        }

        // Update max step based on data
        const currentData = hasDraft ? JSON.parse(savedDraft) : {
          selectedServices: (billRes.bill.services || []).filter(s => !s.isOriginal),
          selectedParts: billRes.bill.parts || [],
          customItems: billRes.bill.customItems || []
        };

        let reachedStep = 3;
        if (currentData.transportCharges > 0) reachedStep = 4;
        else if (currentData.customItems?.length > 0) reachedStep = 3;
        // else if (currentData.selectedParts?.length > 0) reachedStep = 2;
        // else if (currentData.selectedServices?.length > 0) reachedStep = 1;

        setMaxStep(prev => Math.max(prev, reachedStep));
        } // closes if (billRes.bill)
      } // closes if (billRes.success)
    } catch (error) {
      console.error('Error loading billing data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // --- FILTERING ---
  const filteredServices = useMemo(() => {
    return servicesCatalog.filter(item => {
      const itemName = item.name || item.title || '';
      const matchesSearch = itemName.toLowerCase().includes(serviceSearch.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || (item.categoryId?.title || 'Uncategorized') === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [servicesCatalog, serviceSearch, selectedCategory]);

  const filteredParts = useMemo(() => {
    return partsCatalog.filter(item => {
      const itemName = item.name || item.title || '';
      const matchesSearch = itemName.toLowerCase().includes(partSearch.toLowerCase());
      const matchesCategory = selectedPartCategory === 'All' || (item.categoryId?.title || 'Uncategorized') === selectedPartCategory;
      return matchesSearch && matchesCategory;
    });
  }, [partsCatalog, partSearch, selectedPartCategory]);

  // --- HANDLERS ---
  const toggleService = (item) => {
    setSelectedServices(prev => {
      const exists = prev.find(s => s.catalogId === item._id);
      if (exists) {
        return prev.filter(s => s.catalogId !== item._id);
      }
      const itemName = item.name || item.title || 'Unknown Service';
      const itemPrice = item.price !== undefined ? item.price : (item.basePrice || 0);
      return [...prev, {
        catalogId: item._id,
        name: itemName,
        price: itemPrice,
        quantity: 1,
        total: itemPrice
      }];
    });
  };

  const isServiceSelected = (id) => selectedServices.some(s => s.catalogId === id);

  const togglePart = (item) => {
    setSelectedParts(prev => {
      const exists = prev.find(p => p.catalogId === item._id);
      if (exists) {
        return prev.filter(p => p.catalogId !== item._id);
      }
      const itemName = item.name || item.title || 'Unknown Part';
      const itemPrice = item.price !== undefined ? item.price : (item.basePrice || 0);
      return [...prev, {
        catalogId: item._id,
        name: itemName,
        price: itemPrice,
        quantity: 1,
        total: itemPrice
      }];
    });
  };

  const isPartSelected = (id) => selectedParts.some(p => p.catalogId === id);

  const updateServiceQty = (idx, delta) => {
    const newArr = [...selectedServices];
    const q = Math.max(1, newArr[idx].quantity + delta);
    newArr[idx] = { ...newArr[idx], quantity: q, total: newArr[idx].price * q };
    setSelectedServices(newArr);
  };

  const updatePartQty = (idx, delta) => {
    const newArr = [...selectedParts];
    const q = Math.max(1, newArr[idx].quantity + delta);
    const base = newArr[idx].price * q;
    const gstAmt = base * (newArr[idx].gstPercentage / 100);
    newArr[idx] = { ...newArr[idx], quantity: q, gstAmount: gstAmt, total: base + gstAmt };
    setSelectedParts(newArr);
  };

  const addCustomItem = () => {
    setCustomItems([...customItems, {
      name: '',
      hsnCode: '',
      price: 0,
      gstApplicable: true,
      gstPercentage: 18,
      quantity: 1,
      gstAmount: 0,
      total: 0
    }]);
  };

  const updateCustomItem = (index, field, value) => {
    setCustomItems(prev => {
      const newItems = [...prev];
      const newItem = { ...newItems[index], [field]: value };
      const baseTotal = newItem.price * newItem.quantity;
      newItem.gstAmount = newItem.gstApplicable ? baseTotal * (newItem.gstPercentage / 100) : 0;
      newItem.total = baseTotal + newItem.gstAmount;
      newItems[index] = newItem;
      return newItems;
    });
  };

  const removeCustomItem = (index) => {
    const newItems = [...customItems];
    newItems.splice(index, 1);
    setCustomItems(newItems);
  };

  // --- CALCULATIONS ---
  const calculations = useMemo(() => {
    if (!job) return null;
    const { serviceGstPct, partsGstPct, servicePayoutPct, partsPayoutPct } = payoutSettings;

    const isPlanBooking = job.paymentMethod === 'plan_benefit';

    // IMPORTANT: job.basePrice in DB = FULL original service price (e.g. 100)
    // job.discount / job.promoDiscount = the discount amount (e.g. 10)
    // The discount is applied ONLY to the platform fee — NOT to the worker's cut.
    const baseDiscount = Number(job.discount) || 0;
    const promoDiscount = Number(job.promoDiscount) || 0;
    const totalDiscount = baseDiscount + promoDiscount;

    const isEstimate = job.isEstimateBased;
    // Platform fee from admin settings (e.g. 20)
    const originalPlatformFee = isEstimate ? 0 : (platformFees?.platformFlatFee || 0);
    const cashCollectionFee = isEstimate ? 0 : (platformFees?.cashCollectionFee || 0);

    // Worker sees: basePrice - platformFee = 100 - 20 = 80
    const originalBase = isPlanBooking ? 0 : Math.max(0, (Number(job.basePrice) || 0) - originalPlatformFee);
    const originalServiceGST = isPlanBooking ? 0 : parseFloat(((originalBase * serviceGstPct) / 100).toFixed(2));

    let extraServiceBase = 0;
    let extraServiceGST = 0;
    selectedServices.forEach(s => {
      const base = s.price * s.quantity;
      const gst = parseFloat(((base * serviceGstPct) / 100).toFixed(2));
      extraServiceBase += base;
      extraServiceGST += gst;
    });

    let partsBase = 0;
    let partsGST = 0;
    selectedParts.forEach(p => {
      partsBase += (p.price * p.quantity);
      if (applyPartsGST) {
        partsGST += p.gstAmount;
      }
    });

    let customBase = 0;
    let customGST = 0;
    customItems.forEach(c => {
      customBase += (c.price * c.quantity);
      if (applyPartsGST) {
        customGST += c.gstAmount;
      }
    });

    const visitingCharges = 0;
    const finalTransportCharges = Number(transportCharges) || 0;

    // totalServiceBase = worker's cut (80) + any extra services added by worker
    const totalServiceBase = originalBase + extraServiceBase;
    const totalServiceGST = platformFees?.applyGst ? originalServiceGST + extraServiceGST : 0;
    const totalPartsBase = partsBase + customBase;
    const totalPartsGST = platformFees?.applyGst ? partsGST + customGST : 0;

    // totalValue = worker's pure earnings (80 + extras + parts + transport)
    const totalValue = parseFloat(((totalServiceBase + totalServiceGST) + (totalPartsBase + totalPartsGST) + visitingCharges + finalTransportCharges).toFixed(2));

    // Discount reduces platform fee only: 20 - 10 = 10
    const adjustedPlatformFee = isPlanBooking ? originalPlatformFee : Math.max(0, originalPlatformFee - totalDiscount);

    // Final online = worker's earnings + adjusted platform fee = 80 + 10 = 90
    const finalOnlineAmount = parseFloat((totalValue + adjustedPlatformFee).toFixed(2));
    const finalCashAmount = parseFloat((finalOnlineAmount + cashCollectionFee).toFixed(2));

    // Worker earnings = totalValue (their service cut)
    const totalWorkerEarnings = totalValue;
    let workerServiceEarnings = parseFloat(((totalServiceBase * servicePayoutPct) / 100).toFixed(2));
    let workerPartsEarnings = parseFloat(((totalPartsBase * partsPayoutPct) / 100).toFixed(2));

    // Calculate Prepaid Amount (if user already paid during booking)
    const isAlreadyPaid = job.paymentStatus === 'paid' || job.paymentStatus === 'SUCCESS';
    const tokenPaid = isEstimate ? (Number(job.estimate?.tokenAmount) || 0) : 0;
    const hasPrepaid = isAlreadyPaid || tokenPaid > 0;
    
    // If already fully paid, the prepaid amount equals the full online amount
    const prepaidAmount = isAlreadyPaid ? finalOnlineAmount : tokenPaid;
    
    const finalBillAmount = Math.max(0, parseFloat((finalOnlineAmount - prepaidAmount).toFixed(2)));
    const finalCashCollectAmount = Math.max(0, parseFloat((finalCashAmount - prepaidAmount).toFixed(2)));

    return {
      originalBase,
      extraServiceBase,
      partsBase: totalPartsBase,
      serviceGstPct,
      partsGstPct,
      totalServiceGST,
      totalPartsGST,
      totalGST: parseFloat((totalServiceGST + totalPartsGST).toFixed(2)),
      visitingCharges,
      transportCharges: finalTransportCharges,
      totalValue,
      totalDiscount,
      finalOnlineAmount,
      finalCashAmount,
      prepaidAmount,
      isAlreadyPaid: hasPrepaid,
      isEstimate,
      tokenPaid,
      finalBillAmount,
      finalCashCollectAmount,
      totalWorkerEarnings,
      workerServiceEarnings,
      workerPartsEarnings,
      servicePayoutPct,
      partsPayoutPct,
      platformFlatFee: adjustedPlatformFee,
      cashCollectionFee
    };
  }, [job, selectedServices, selectedParts, customItems, transportCharges, payoutSettings, applyPartsGST, platformFees]);

  const handleRequestPayment = async () => {
    try {
      setQrLoading(true);
      const validCustomItems = customItems.filter(item => item.name.trim() !== '');
      await workerBillService.createOrUpdateBill(id, {
        services: selectedServices,
        parts: selectedParts,
        customItems: validCustomItems,
        transportCharges,
        applyPartsGST
      });

      const res = await workerService.initiateOnlineCollection(id, calculations.finalBillAmount, [...selectedParts, ...validCustomItems]);
      if (res.success) {
        setOnlinePaymentData(res.data);
        setIsOtpSent(true);
        toast.success('Payment Request Sent to User!');
      } else {
        toast.error(res.message || 'Failed to request payment');
      }
    } catch (error) {
      console.error('Request payment error:', error);
      toast.error('Failed to request payment');
    } finally {
      setQrLoading(false);
    }
  };

  const handleVerifyOTP = async (code) => {
    if (otpLoading) return;
    try {
      setOtpLoading(true);
      const validCustomItems = customItems.filter(item => item.name.trim() !== '');
      const res = await workerService.collectCash(id, code, calculations.finalBillAmount, [...selectedParts, ...validCustomItems]);
      if (res.success) {
        setShowOtpModal(false);
        toast.success('Job completed! Payment collected successfully 🎉');
        localStorage.removeItem(`worker_billing_step_${id}`);
        localStorage.removeItem(`worker_billing_max_step_${id}`);
        localStorage.removeItem(`worker_billing_data_${id}`);
        goToDashboard();
      } else {
        toast.error(res.message || 'Invalid OTP');
      }
    } catch (error) {
      console.error('Verify OTP error:', error);
      const msg = error?.response?.data?.message || 'Verification failed';
      toast.error(msg);
    } finally {
      setOtpLoading(false);
    }
  };

  const checkPaymentStatus = async () => {
    try {
      setQrLoading(true);
      const res = await workerService.verifyOnlineCollection(id);
      if (res.success) {
        setShowQrModal(false);
        toast.success('Job completed! Payment received successfully 🎉');
        localStorage.removeItem(`worker_billing_step_${id}`);
        localStorage.removeItem(`worker_billing_max_step_${id}`);
        localStorage.removeItem(`worker_billing_data_${id}`);
        goToDashboard();
      } else {
        toast.error(res.message || 'Payment not yet confirmed');
      }
    } finally {
      setQrLoading(false);
    }
  };

  useEffect(() => {
    if (socket && id) {
      const handleJobUpdate = (data) => {
        const incomingId = String(data.bookingId || data.relatedId || data._id || '');
        if (incomingId !== String(id)) return;
        const isPaymentSuccess = data.paymentStatus === 'SUCCESS' || data.paymentStatus === 'paid' || data.type === 'payment_success';
        if (isPaymentSuccess) {
          toast.success('Online Payment Received! Job Completed 🎉');
          localStorage.removeItem(`worker_billing_step_${id}`);
          localStorage.removeItem(`worker_billing_max_step_${id}`);
          localStorage.removeItem(`worker_billing_data_${id}`);
          setTimeout(() => goToDashboard(), 1000);
        }
      };
      socket.on('booking_updated', handleJobUpdate);
      socket.on('payment_success', handleJobUpdate);
      return () => {
        socket.off('booking_updated', handleJobUpdate);
        socket.off('payment_success', handleJobUpdate);
      };
    }
  }, [socket, id, navigate]);

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (!job) return null;

  if (viewMode === 'select-services') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <div className="bg-white sticky top-0 z-50 shadow-sm border-b border-gray-100">
          <div className="px-4 py-3 flex items-center gap-3">
            <button onClick={() => setViewMode('timeline')}><FiArrowLeft className="w-6 h-6 text-gray-600" /></button>
            <div className="flex-1 relative">
              <input autoFocus placeholder="Search for a service..." value={serviceSearch} onChange={e => setServiceSearch(e.target.value)}
                className="w-full bg-gray-100 pl-10 pr-4 py-2.5 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-gray-800 placeholder:text-gray-400" />
            </div>
          </div>
        </div>
        <div className="p-4 space-y-3 pb-48">
          {filteredServices.map(item => {
            const selected = isServiceSelected(item._id);
            return (
              <div key={item._id} onClick={() => !selected && toggleService(item)} className={`p-4 rounded-xl border shadow-sm flex justify-between items-center cursor-pointer transition-all active:scale-[0.98] ${selected ? 'bg-blue-50/50 border-blue-200' : 'bg-white border-gray-100'}`}>
                <div className="flex-1">
                  <h4 className="font-bold text-gray-900">{item.name}</h4>
                  <p className="text-sm font-black text-blue-600">₹{item.price}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  {selected ? (
                    <div className="flex items-center gap-2 bg-blue-50 rounded-lg p-1 border border-blue-100">
                      <button onClick={(e) => { e.stopPropagation(); const q = selectedServices.find(s => s.catalogId === item._id).quantity; if (q > 1) updateServiceQty(selectedServices.findIndex(s => s.catalogId === item._id), -1); else toggleService(item); }} className="w-8 h-8 flex items-center justify-center bg-white rounded-md text-blue-600 shadow-sm">-</button>
                      <span className="font-bold text-sm w-5 text-center text-blue-900">{selectedServices.find(s => s.catalogId === item._id).quantity}</span>
                      <button onClick={(e) => { e.stopPropagation(); updateServiceQty(selectedServices.findIndex(s => s.catalogId === item._id), 1); }} className="w-8 h-8 flex items-center justify-center bg-blue-600 rounded-md text-white shadow-sm active:scale-95 transition-all">
                        <span className="font-bold text-lg leading-none mb-0.5">+</span>
                      </button>
                    </div>
                  ) : (
                    <button className="flex items-center gap-1.5 px-4 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg text-sm font-bold text-gray-700 transition-colors">
                      <FiPlus className="w-4 h-4" /> Add
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (viewMode === 'select-parts') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <div className="bg-white sticky top-0 z-50 shadow-sm border-b border-gray-100">
          <div className="px-4 py-3 flex items-center gap-3">
            <button onClick={() => setViewMode('timeline')}><FiArrowLeft className="w-6 h-6 text-gray-600" /></button>
            <div className="flex-1 relative">
              <input autoFocus placeholder="Search for a part..." value={partSearch} onChange={e => setPartSearch(e.target.value)}
                className="w-full bg-gray-100 pl-10 pr-4 py-2.5 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-orange-500/20 transition-all text-gray-800 placeholder:text-gray-400" />
            </div>
          </div>
        </div>
        <div className="p-4 space-y-3 pb-48">
          {filteredParts.map(item => {
            const selected = isPartSelected(item._id);
            return (
              <div key={item._id} onClick={() => !selected && togglePart(item)} className={`p-4 rounded-xl border shadow-sm flex justify-between items-center cursor-pointer transition-all active:scale-[0.98] ${selected ? 'bg-orange-50/50 border-orange-200' : 'bg-white border-gray-100'}`}>
                <div className="flex-1">
                  <h4 className="font-bold text-gray-900">{item.name}</h4>
                  <p className="text-sm font-black text-orange-600">₹{item.price}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  {selected ? (
                    <div className="flex items-center gap-2 bg-orange-50 rounded-lg p-1 border border-orange-100">
                      <button onClick={(e) => { e.stopPropagation(); const q = selectedParts.find(p => p.catalogId === item._id).quantity; if (q > 1) updatePartQty(selectedParts.findIndex(p => p.catalogId === item._id), -1); else togglePart(item); }} className="w-8 h-8 flex items-center justify-center bg-white rounded-md text-orange-600 shadow-sm">-</button>
                      <span className="font-bold text-sm w-5 text-center text-orange-900">{selectedParts.find(p => p.catalogId === item._id).quantity}</span>
                      <button onClick={(e) => { e.stopPropagation(); updatePartQty(selectedParts.findIndex(p => p.catalogId === item._id), 1); }} className="w-8 h-8 flex items-center justify-center bg-orange-600 rounded-md text-white shadow-sm active:scale-95 transition-all">
                        <span className="font-bold text-lg leading-none mb-0.5">+</span>
                      </button>
                    </div>
                  ) : (
                    <button className="flex items-center gap-1.5 px-4 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg text-sm font-bold text-gray-700 transition-colors">
                      <FiPlus className="w-4 h-4" /> Add
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  let completedSteps = 0;
  if (selectedServices.length > 0) completedSteps++;
  if (selectedParts.length > 0) completedSteps++;
  if (customItems.length > 0) completedSteps++;
  if (transportCharges > 0) completedSteps++;

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      <div className="bg-white px-5 py-4 sticky top-0 z-40 border-b border-gray-100 flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-50 text-gray-600 active:scale-95 transition-transform"><FiArrowLeft className="w-5 h-5" /></button>
        <div>
          <h1 className="text-base font-bold text-gray-900 leading-tight">Create Bill</h1>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">{job?.bookingNumber}</p>
        </div>
      </div>

      <div className="px-5 pt-6 pb-2">
        <div className="flex justify-between relative max-w-sm mx-auto z-10">
          <div className="absolute top-1/2 left-0 right-0 h-1 bg-gray-200 -translate-y-1/2 -z-10 rounded-full overflow-hidden">
            <div className="h-full bg-gray-900 transition-all duration-500 ease-out" style={{ width: `${(currentStep - 3) * 50}%` }} />
          </div>
          {[
            // { step: 1, icon: <FiTool />, label: 'Services' },
            // { step: 2, icon: <FiPackage />, label: 'Parts' },
            { step: 3, icon: <FiPlus />, label: 'Any Extra Item' },
            { step: 4, icon: <FiClock />, label: 'Any transport Charges' },
            { step: 5, icon: <FiFileText />, label: 'Review' }
          ].map(({ step, icon, label }) => {
            const isActive = currentStep === step;
            const isPast = currentStep > step;
            const isClickable = step <= maxStep || step < currentStep;
            return (
              <div key={step} className="flex flex-col items-center gap-2 relative">
                <button
                  disabled={!isClickable}
                  onClick={() => isClickable && setCurrentStep(step)}
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm transition-all duration-300 shadow-sm
                    ${isActive ? 'bg-gray-900 text-white ring-4 ring-gray-100 scale-110' :
                      isPast ? 'bg-gray-900 text-white cursor-pointer hover:scale-105' :
                        isClickable ? 'bg-white text-gray-600 border-2 border-gray-200 cursor-pointer hover:bg-gray-50' :
                          'bg-white text-gray-300 border-2 border-gray-100 cursor-not-allowed'}`}>
                  {isPast ? <FiCheck className="w-5 h-5" /> : React.cloneElement(icon, { className: 'w-4 h-4' })}
                </button>
                <span className={`text-[10px] font-bold absolute -bottom-6 whitespace-nowrap transition-colors
                  ${isActive ? 'text-gray-900' : isPast ? 'text-gray-600' : 'text-gray-400'}`}>
                  {label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="p-5 mt-4">
        {/*
        {currentStep === 1 && (
          <div className="animate-in fade-in slide-in-from-right-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-black text-gray-900">Added Services</h3>
                <p className="text-xs text-gray-500 font-medium">Select extra services performed</p>
              </div>
              <button onClick={() => setViewMode('select-services')} className="flex items-center gap-1.5 px-4 py-2 bg-blue-50 text-blue-700 font-bold rounded-xl text-sm active:scale-95 transition-transform">
                <FiPlus className="w-4 h-4" /> Add Extra
              </button>
            </div>
            <div className="space-y-3">
              {selectedServices.length > 0 ? selectedServices.map((s, idx) => (
                <div key={s.catalogId} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-gray-800">{s.name}</h4>
                    <p className="text-sm font-black text-blue-600">₹{s.price} <span className="text-xs font-medium text-gray-400">each</span></p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-1 border border-gray-100">
                      <button onClick={() => updateServiceQty(idx, -1)} className="w-8 h-8 flex items-center justify-center bg-white rounded-md text-gray-600 shadow-sm">-</button>
                      <span className="font-bold text-sm w-4 text-center">{s.quantity}</span>
                      <button onClick={() => updateServiceQty(idx, 1)} className="w-8 h-8 flex items-center justify-center bg-white rounded-md text-gray-600 shadow-sm">+</button>
                    </div>
                    <button onClick={() => toggleService({ _id: s.catalogId })} className="w-10 h-10 flex items-center justify-center rounded-xl bg-red-50 text-red-500 active:scale-95">
                      <FiTrash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )) : (
                <div className="text-center py-10 bg-white rounded-xl border border-dashed border-gray-200">
                  <FiTool className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-400 font-bold text-sm">No extra services added</p>
                </div>
              )}
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="animate-in fade-in slide-in-from-right-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-black text-gray-900">Spare Parts</h3>
                <p className="text-xs text-gray-500 font-medium">Add parts from catalog</p>
              </div>
              <button onClick={() => setViewMode('select-parts')} className="flex items-center gap-1.5 px-4 py-2 bg-orange-50 text-orange-700 font-bold rounded-xl text-sm active:scale-95 transition-transform">
                <FiPlus className="w-4 h-4" /> Add Part
              </button>
            </div>
            <div className="space-y-3">
              {selectedParts.length > 0 ? selectedParts.map((p, idx) => (
                <div key={p.catalogId} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-gray-800">{p.name}</h4>
                    <p className="text-sm font-black text-orange-600">₹{p.price} <span className="text-xs font-medium text-gray-400">each</span></p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-1 border border-gray-100">
                      <button onClick={() => updatePartQty(idx, -1)} className="w-8 h-8 flex items-center justify-center bg-white rounded-md text-gray-600 shadow-sm">-</button>
                      <span className="font-bold text-sm w-4 text-center">{p.quantity}</span>
                      <button onClick={() => updatePartQty(idx, 1)} className="w-8 h-8 flex items-center justify-center bg-white rounded-md text-gray-600 shadow-sm">+</button>
                    </div>
                    <button onClick={() => togglePart({ _id: p.catalogId })} className="w-10 h-10 flex items-center justify-center rounded-xl bg-red-50 text-red-500 active:scale-95">
                      <FiTrash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )) : (
                <div className="text-center py-10 bg-white rounded-xl border border-dashed border-gray-200">
                  <FiPackage className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-400 font-bold text-sm">No spare parts added</p>
                </div>
              )}
            </div>
          </div>
        )}
        */}

        {currentStep === 3 && (
          <div className="animate-in fade-in slide-in-from-right-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-black text-gray-900">Any Extra Item</h3>
                <p className="text-xs text-gray-500 font-medium">Add items not in catalog</p>
              </div>
              <button onClick={addCustomItem} className="flex items-center gap-1.5 px-4 py-2 bg-gray-900 text-white font-bold rounded-xl text-sm active:scale-95 transition-transform shadow-sm">
                <FiPlus className="w-4 h-4" /> Add Item
              </button>
            </div>
            <div className="space-y-4">
              {customItems.map((item, idx) => (
                <div key={idx} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden relative">
                  <div className="bg-gray-50 px-4 py-2 border-b border-gray-100 flex justify-between items-center">
                    <span className="text-xs font-black text-gray-500 tracking-wider">ITEM {idx + 1}</span>
                    <button onClick={() => removeCustomItem(idx)} className="text-red-500 p-1 hover:bg-red-50 rounded-md transition-colors"><FiTrash2 className="w-4 h-4" /></button>
                  </div>
                  <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1 md:col-span-2">
                      <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Item Name</label>
                      <input placeholder="e.g. Copper Pipe" value={item.name} onChange={e => updateCustomItem(idx, 'name', e.target.value)}
                        className="w-full bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 text-sm font-bold outline-none focus:ring-1 focus:ring-blue-500 text-gray-800" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Price (₹)</label>
                      <input type="number" placeholder="0" value={item.price || ''} onChange={e => updateCustomItem(idx, 'price', Number(e.target.value))}
                        className="w-full bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 text-sm font-bold outline-none focus:ring-1 focus:ring-blue-500 text-gray-800" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Quantity</label>
                      <input type="number" value={item.quantity} onChange={e => updateCustomItem(idx, 'quantity', Number(e.target.value))}
                        className="w-full bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 text-sm font-bold outline-none focus:ring-1 focus:ring-blue-500 text-gray-800" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {currentStep === 4 && (
          <div className="animate-in fade-in slide-in-from-right-4">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-4">
                <FiPackage className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Any transport Charges</h3>
              <div className="w-full max-w-xs relative text-left">
                <label className="text-[10px] font-bold text-gray-400 uppercase ml-1 mb-1 block">Amount (₹)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-gray-400">₹</span>
                  <input type="number" placeholder="0" value={transportCharges || ''} onChange={e => setTransportCharges(Number(e.target.value))}
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl pl-8 pr-4 py-4 text-xl font-black outline-none focus:ring-2 focus:ring-blue-500/20 text-gray-900" />
                </div>
              </div>
            </div>
          </div>
        )}

        {currentStep === 5 && calculations && (
          <div className="animate-in fade-in slide-in-from-right-4 pb-10">
            <div className="bg-white rounded-3xl overflow-hidden shadow-xl border border-gray-100 mb-6">
              <div className="bg-gray-900 px-6 py-8 text-white">
                <p className="text-gray-400 text-xs font-medium uppercase tracking-widest mb-4 text-center">
                  {calculations.isAlreadyPaid ? 'BALANCE TO COLLECT' : 'FINAL USER BILL'}
                </p>
                <div className="grid grid-cols-2 gap-4 divide-x divide-gray-800">
                  <div className="flex flex-col items-center justify-center">
                    <span className="text-gray-400 text-[10px] mb-1">ONLINE PAY</span>
                    <span className="text-3xl font-black text-blue-400">₹{calculations.finalBillAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex flex-col items-center justify-center pl-4">
                    <span className="text-gray-400 text-[10px] mb-1">CASH PAY</span>
                    <span className="text-3xl font-black text-emerald-400">₹{calculations.finalCashCollectAmount.toFixed(2)}</span>
                  </div>
                </div>
              </div>
              <div className="p-6 space-y-6">
                <div>
                  <h4 className="font-bold text-gray-900 flex items-center gap-2 mb-3 pb-2 border-b border-gray-100">
                    <span className="w-6 h-6 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-xs"><FiTool /></span>
                    Summary
                  </h4>
                  <div className="space-y-2 text-sm pl-2">
                    {(() => {
                      const mainServiceTitle = (typeof job?.serviceId === 'object' ? job?.serviceId?.title : null) || job?.serviceName || 'Service';
                      const basePriceToDisplay = Math.max(0, calculations.originalBase);
                      
                      return (
                        <>
                          <div className="flex justify-between font-bold text-gray-800 pt-1">
                            <span>{mainServiceTitle}</span>
                            <span>₹{basePriceToDisplay.toFixed(2)}</span>
                          </div>
                          
                          {selectedServices.map((s, i) => (
                            <div key={`s-${i}`} className="flex justify-between text-gray-600 text-xs">
                              <span>{s.name}</span>
                              <span>₹{(s.price !== undefined ? s.price : (s.basePrice || 0)).toFixed(2)}</span>
                            </div>
                          ))}

                          {[...selectedParts, ...customItems].map((p, i) => (
                            <div key={`p-${i}`} className="flex justify-between text-gray-600 text-xs">
                              <span>{p.name} {p.quantity > 1 ? `(x${p.quantity})` : ''}</span>
                              <span>₹{(p.price * (p.quantity || 1)).toFixed(2)}</span>
                            </div>
                          ))}

                          {calculations.transportCharges > 0 && (
                            <div className="flex justify-between text-gray-600 text-xs">
                              <span>Any transport Charges</span>
                              <span>₹{calculations.transportCharges.toFixed(2)}</span>
                            </div>
                          )}

                          {calculations.visitingCharges > 0 && (
                            <div className="flex justify-between text-gray-600 text-xs">
                              <span>Visiting Charges</span>
                              <span>₹{calculations.visitingCharges.toFixed(2)}</span>
                            </div>
                          )}
                          
                          <div className="flex justify-between font-black text-gray-900 border-t border-gray-100 pt-2 mt-2">
                            <span>Your Earnings</span>
                            <span>₹{calculations.totalWorkerEarnings.toFixed(2)}</span>
                          </div>
                          
                          {calculations.platformFlatFee !== 0 && (
                            <div className="flex justify-between text-blue-600 text-sm font-medium mt-2">
                              <span>Base Platform Fee</span>
                              <span>+₹{calculations.platformFlatFee.toFixed(2)}</span>
                            </div>
                          )}

                          {calculations.totalDiscount > 0 && (
                            <div className="flex justify-between text-rose-500 text-sm font-medium">
                              <span>Subscription Discount (on fee)</span>
                              <span>-₹{calculations.totalDiscount.toFixed(2)}</span>
                            </div>
                          )}
                          
                          {calculations.cashCollectionFee > 0 && (
                            <div className="flex justify-between text-emerald-600 text-sm font-medium">
                              <span>Cash Collection Fee (If cash paid)</span>
                              <span>+₹{calculations.cashCollectionFee}</span>
                            </div>
                          )}

                          {calculations.prepaidAmount > 0 && (
                            <div className="flex justify-between text-emerald-600 text-sm font-bold border-t border-gray-100 pt-2 mt-2">
                              <span>{calculations.isAlreadyPaid ? 'Already Paid Online' : 'Advance Token Paid'}</span>
                              <span>-₹{calculations.prepaidAmount.toFixed(2)}</span>
                            </div>
                          )}

                          <div className="border-t border-gray-200 pt-3 mt-3 space-y-2">
                            <div className="flex justify-between font-black text-gray-900">
                              <span>Total Online Bill</span>
                              <span>₹{calculations.finalBillAmount.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between font-black text-emerald-600">
                              <span>Total Cash Bill</span>
                              <span>₹{calculations.finalCashCollectAmount.toFixed(2)}</span>
                            </div>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
                {calculations.totalGST > 0 && (
                  <div>
                    <h4 className="font-bold text-gray-900 flex items-center gap-2 mb-2 pb-2 border-b border-gray-100">
                      <span className="w-6 h-6 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs font-black">%</span>
                      Taxes & Fees
                    </h4>
                    <div className="flex justify-between text-sm pl-2 text-gray-600">
                      <span>GST (18%)</span>
                      <span>₹{calculations.totalGST.toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t border-gray-100 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-50 flex gap-3">
        {currentStep > 3 && (
          <button onClick={() => setCurrentStep(currentStep - 1)} disabled={submitting || otpLoading} className="flex-1 py-3 text-gray-600 font-bold bg-white border border-gray-200 rounded-xl disabled:opacity-50">Back</button>
        )}
        {currentStep < 5 ? (
          <button onClick={() => setCurrentStep(currentStep + 1)} className="flex-[2] py-3.5 bg-gray-900 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg">Next <FiArrowRight /></button>
        ) : (
          <div className="flex-[2] grid grid-cols-1 gap-2">
            {isOtpSent ? (
              <div className="flex gap-2">
                <button onClick={() => setShowOtpModal(true)} disabled={otpLoading || qrLoading} className="flex-1 py-3 bg-gray-900 text-white font-bold rounded-xl shadow-lg flex flex-col items-center justify-center gap-1 active:scale-95 transition-all text-[10px]">
                  <FiKey className="w-4 h-4" /><span>Enter OTP</span>
                </button>
                {/* <button onClick={() => setShowQrModal(true)} disabled={otpLoading || qrLoading} className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg flex flex-col items-center justify-center gap-1 active:scale-95 transition-all text-[10px]">
                  <MdQrCode className="w-4 h-4" /><span>Show QR</span>
                </button> */}
              </div>
            ) : (
              <button onClick={handleRequestPayment} disabled={otpLoading || qrLoading} className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50 text-sm">
                <FiDollarSign className="w-4 h-4" /><span>Request Payment from User</span>
              </button>
            )}
          </div>
        )}
      </div>

      <OtpVerificationModal isOpen={showOtpModal} onClose={() => setShowOtpModal(false)} onVerify={handleVerifyOTP} loading={otpLoading} />

      <ScanAndPayModal
        isOpen={showQrModal}
        onClose={() => setShowQrModal(false)}
        qrImageUrl={onlinePaymentData?.qrImageUrl}
        amount={calculations.finalBillAmount}
        onCheckStatus={checkPaymentStatus}
      />
    </div>
  );
};

export default BillingPage;

