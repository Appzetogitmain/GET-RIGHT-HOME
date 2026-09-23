import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiCheck,
  FiX,
  FiEye,
  FiEdit2,
  FiSearch,
  FiFilter,
  FiDownload,
  FiLoader,
  FiDollarSign,
  FiPower,
  FiTrash2,
  FiClock,
  FiAlertCircle,
  FiShield,
  FiFileText,
  FiChevronRight,
  FiMapPin,
  FiPlus,
  FiZap,
  FiAward,
  FiBriefcase,
  FiStar,
  FiUser
} from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import CardShell from '../UserCategories/components/CardShell';
import Modal from '../UserCategories/components/Modal';
import adminWorkerService from '../../../../services/adminWorkerService';
import { categoryService } from '../../../../services/catalogService';
import { uploadToCloudinary } from '../../../../utils/cloudinaryUpload';

const DEFAULT_CATEGORIES = [
  'Full Home Cleaning',
  'Home Cleaning Services',
  'Home Painting',
  'Packers & Movers',
  'AC Service & Repair',
  'Plumber',
  'Electrician',
  'Carpenter',
  'Appliance Repair',
  'Pest Control',
  'RO Water Purifier',
  'Sofa & Carpet Cleaning',
  'Bathroom Cleaning',
  'Kitchen Deep Cleaning'
];

const AllWorkers = () => {
  const [workers, setWorkers] = useState([]);
  const [zones, setZones] = useState([]);
  const [zonesSummary, setZonesSummary] = useState([]);
  const [availablePlans, setAvailablePlans] = useState([]);
  const [availableCategories, setAvailableCategories] = useState(DEFAULT_CATEGORIES);
  const [customCategoryInput, setCustomCategoryInput] = useState('');
  const [lightboxDoc, setLightboxDoc] = useState(null);
  const [uploadingSlot, setUploadingSlot] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedZone, setSelectedZone] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'signup_only', 'approved', 'rejected', 'pending_skills'
  const [searchQuery, setSearchQuery] = useState('');

  // Counts
  const [counts, setCounts] = useState({
    total: 0,
    pending: 0,
    signupOnly: 0,
    approved: 0,
    rejected: 0,
    pendingSkills: 0,
    offlineRequests: 0
  });

  // Modals
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payNotes, setPayNotes] = useState('');
  const [paySubmitting, setPaySubmitting] = useState(false);
  const [processingSkill, setProcessingSkill] = useState(null);

  // Edit Worker Modal
  const [editModal, setEditModal] = useState({
    isOpen: false,
    worker: null,
    formData: {
      name: '',
      phone: '',
      email: '',
      businessName: '',
      mcqLevel: 'Not Certified',
      experienceYears: 0,
      serviceCategories: [],
      zoneIds: [],
      approvalStatus: 'approved',
      isActive: true,
      isOnline: false
    },
    isSubmitting: false
  });

  // Assign / Extend Plan Modal
  const [planModal, setPlanModal] = useState({
    isOpen: false,
    worker: null,
    planId: '',
    customPlanTitle: '',
    durationDays: 30,
    isSubmitting: false
  });

  // Add Worker Modal
  const [addModal, setAddModal] = useState({
    isOpen: false,
    formData: {
      name: '',
      phone: '',
      email: '',
      businessName: '',
      password: '',
      serviceCategories: [],
      zoneIds: [],
      approvalStatus: 'approved'
    },
    isSubmitting: false
  });

  // Load initial reference data (zones, plans, categories) on mount
  useEffect(() => {
    loadReferenceData();
  }, []);

  // Load workers whenever zone filter changes
  useEffect(() => {
    loadWorkers();
  }, [selectedZone]);

  const loadReferenceData = async () => {
    try {
      const [zonesRes, plansRes, catsRes] = await Promise.all([
        adminWorkerService.getZones().catch(() => ({ data: [] })),
        adminWorkerService.getWorkerPlans().catch(() => ({ data: [] })),
        categoryService.getAll().catch(() => ({ data: [] }))
      ]);

      if (zonesRes?.data) setZones(zonesRes.data);
      if (plansRes?.data) setAvailablePlans(plansRes.data);
      const rawCats = catsRes?.categories || catsRes?.data || [];
      const fetchedTitles = Array.isArray(rawCats) ? rawCats.map((c) => c.title || c.name).filter(Boolean) : [];
      setAvailableCategories(Array.from(new Set([...DEFAULT_CATEGORIES, ...fetchedTitles])));
    } catch (err) {
      console.warn('Error loading reference data:', err);
    }
  };

  const loadWorkers = async () => {
    try {
      setLoading(true);
      const params = {};
      if (selectedZone && selectedZone !== 'all') {
        params.zoneId = selectedZone;
      }

      const response = await adminWorkerService.getAllWorkers(params);
      if (response.success) {
        const transformedWorkers = (response.data || []).map((worker) => {
          // Compute zone names
          let zoneNames = [];
          if (worker.zoneIds && worker.zoneIds.length > 0) {
            zoneNames = worker.zoneIds.map((z) => (typeof z === 'object' ? z.name : z)).filter(Boolean);
          } else if (worker.zones && worker.zones.length > 0) {
            zoneNames = worker.zones;
          }

          // Compute plan details
          let planTitle = 'NO PLAN';
          let daysLeft = 0;
          let isPlanActive = false;

          if (worker.subscription) {
            if (worker.subscription.planId && worker.subscription.planId.title) {
              planTitle = worker.subscription.planId.title;
            } else if (worker.subscription.planTitle) {
              planTitle = worker.subscription.planTitle;
            }

            if (worker.subscription.daysLeft !== undefined) {
              daysLeft = worker.subscription.daysLeft;
              isPlanActive = worker.subscription.isActive !== false && daysLeft > 0;
            } else if (worker.subscription.expiryDate) {
              const diffMs = new Date(worker.subscription.expiryDate) - new Date();
              daysLeft = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
              isPlanActive = diffMs > 0 && worker.subscription.isActive !== false;
            }
          }

          return {
            id: worker._id,
            _id: worker._id,
            name: worker.name,
            email: worker.email || '',
            phone: worker.phone || '',
            businessName: worker.businessName || worker.name,
            mcqLevel: worker.mcqLevel || 'Not Certified',
            experienceYears: worker.experienceYears || 0,
            rating: worker.rating || 0,
            totalJobs: worker.totalJobs || 0,
            completedJobs: worker.completedJobs || 0,
            serviceCategories: worker.serviceCategories || [],
            pendingServiceCategories: worker.pendingServiceCategories || [],
            rejectedServiceCategories: worker.rejectedServiceCategories || [],
            skillRequests: worker.skillRequests || [],
            verifiedSkillsDetails: worker.verifiedSkillsDetails || [],
            serviceCategory:
              worker.serviceCategories && worker.serviceCategories.length > 0
                ? worker.serviceCategories.join(', ')
                : worker.serviceCategory || 'N/A',
            approvalStatus: worker.approvalStatus || 'pending',
            profilePhoto: worker.profilePhoto || '',
            nameOnAadhar: worker.aadhar?.nameOnAadhar || '',
            vendorType: worker.vendorType || 'Unregistered',
            gstin: worker.gstin || '',
            aadhar: worker.aadhar?.number,
            pan: worker.panCard?.number,
            otherDocuments: worker.otherDocuments || [],
            documents: {
              aadhar: worker.aadhar?.document || '',
              aadharBack: worker.aadhar?.backDocument || '',
              pan: worker.panCard?.document || '',
              drivingLicense: worker.drivingLicense?.document || '',
              other1: worker.otherDocuments?.[0] || '',
              other2: worker.otherDocuments?.[1] || ''
            },
            createdAt: worker.createdAt,
            isActive: worker.isActive !== false,
            isOnline: worker.isOnline || false,
            currentOfflineSchedule: worker.currentOfflineSchedule || null,
            subscription: {
              ...(worker.subscription || {}),
              planTitle,
              daysLeft,
              isActive: isPlanActive
            },
            zoneIds: worker.zoneIds || [],
            zones: zoneNames
          };
        });

        setWorkers(transformedWorkers);

        if (response.counts) {
          setCounts((prev) => ({
            ...prev,
            ...response.counts,
            signupOnly: response.counts.pending || response.counts.signupOnly || 0
          }));
        }

        if (response.zonesSummary) {
          setZonesSummary(response.zonesSummary);
        }
        if (response.zones) {
          setZones(response.zones);
        }
      } else {
        toast.error(response.message || 'Failed to load workers');
      }
    } catch (error) {
      console.error('Error loading workers:', error);
      toast.error('Failed to load workers. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Filtered workers based on top filter pills and search query
  const filteredWorkers = useMemo(() => {
    return workers.filter((worker) => {
      const matchesStatus =
        filterStatus === 'all'
          ? true
          : filterStatus === 'signup_only'
          ? worker.approvalStatus === 'pending'
          : filterStatus === 'pending_skills'
          ? worker.pendingServiceCategories && worker.pendingServiceCategories.length > 0
          : worker.approvalStatus === filterStatus;

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        worker.name.toLowerCase().includes(q) ||
        (worker.email && worker.email.toLowerCase().includes(q)) ||
        (worker.phone && worker.phone.includes(q)) ||
        (worker.businessName && worker.businessName.toLowerCase().includes(q)) ||
        (worker.zones && worker.zones.some((z) => z.toLowerCase().includes(q))) ||
        (worker.serviceCategories && worker.serviceCategories.some((c) => c.toLowerCase().includes(q))) ||
        (worker.pendingServiceCategories && worker.pendingServiceCategories.some((c) => c.toLowerCase().includes(q)));

      return matchesStatus && matchesSearch;
    });
  }, [workers, filterStatus, searchQuery]);

  // Handle Quick Approve
  const handleApprove = async (workerId) => {
    try {
      const response = await adminWorkerService.approveWorker(workerId);
      if (response.success) {
        setWorkers((prev) =>
          prev.map((w) => (w.id === workerId ? { ...w, approvalStatus: 'approved' } : w))
        );
        toast.success('Worker approved successfully!');
        loadWorkers();
      } else {
        toast.error(response.message || 'Failed to approve worker');
      }
    } catch (error) {
      console.error('Error approving worker:', error);
      toast.error('Failed to approve worker. Please try again.');
    }
  };

  // Handle Quick Reject
  const handleReject = async (workerId) => {
    const reason = window.prompt('Enter rejection reason (optional):', 'Application rejected by Admin');
    if (reason === null) return;

    try {
      const response = await adminWorkerService.rejectWorker(workerId, reason);
      if (response.success) {
        setWorkers((prev) =>
          prev.map((w) => (w.id === workerId ? { ...w, approvalStatus: 'rejected' } : w))
        );
        toast.success('Worker rejected.');
        loadWorkers();
      } else {
        toast.error(response.message || 'Failed to reject worker');
      }
    } catch (error) {
      console.error('Error rejecting worker:', error);
      toast.error('Failed to reject worker. Please try again.');
    }
  };

  // Handle Toggle Active
  const handleToggleStatus = async (workerId, currentStatus) => {
    try {
      const newStatus = !currentStatus;
      const response = await adminWorkerService.toggleStatus(workerId, newStatus);
      if (response.success) {
        setWorkers((prev) =>
          prev.map((w) => (w.id === workerId ? { ...w, isActive: newStatus } : w))
        );
        toast.success(`Worker ${newStatus ? 'activated' : 'deactivated'} successfully`);
      } else {
        toast.error(response.message || 'Failed to update worker status');
      }
    } catch (error) {
      console.error('Error toggling worker status:', error);
      toast.error('Failed to update status');
    }
  };

  // Handle Force Online / Offline
  const handleForceOnline = async (workerId, workerName) => {
    if (!window.confirm(`Set ${workerName || 'this worker'} ONLINE immediately? This overrides any offline schedule.`)) {
      return;
    }
    try {
      const res = await adminWorkerService.forceWorkerOnline(workerId);
      if (res.success) {
        toast.success(`${workerName || 'Worker'} is now Online!`);
        setWorkers((prev) =>
          prev.map((w) => (w.id === workerId ? { ...w, isOnline: true } : w))
        );
      } else {
        toast.error(res.message || 'Failed to set worker online');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to set worker online');
    }
  };

  // Handle Delete Worker
  const handleDelete = async (workerId) => {
    if (!window.confirm('Are you sure you want to delete this worker? This action cannot be undone.')) {
      return;
    }
    try {
      const response = await adminWorkerService.deleteWorker(workerId);
      if (response.success) {
        setWorkers((prev) => prev.filter((w) => w.id !== workerId));
        toast.success('Worker deleted successfully');
        loadWorkers();
      } else {
        toast.error(response.message || 'Failed to delete worker');
      }
    } catch (error) {
      console.error('Error deleting worker:', error);
      toast.error('Failed to delete worker');
    }
  };

  // View Details Modal Trigger
  const handleViewDetails = (worker) => {
    setSelectedWorker(worker);
    setIsViewModalOpen(true);
  };

  // Open Edit Worker Modal
  const handleOpenEdit = (worker) => {
    const workerZoneIds = (worker.zoneIds || []).map((z) => (typeof z === 'object' ? z._id : z)).filter(Boolean);
    setEditModal({
      isOpen: true,
      worker,
      formData: {
        name: worker.name || '',
        phone: worker.phone || '',
        email: worker.email || '',
        businessName: worker.businessName || worker.name || '',
        vendorType: worker.vendorType || 'Unregistered',
        gstin: worker.gstin || '',
        mcqLevel: worker.mcqLevel || 'Level 1 — Premium / Expert (80%+ Rating)',
        experienceYears: worker.experienceYears || 0,
        serviceCategories: [...(worker.serviceCategories || [])],
        zoneIds: workerZoneIds,
        approvalStatus: worker.approvalStatus || 'approved',
        isActive: worker.isActive !== false,
        isOnline: Boolean(worker.isOnline),
        nameOnAadhar: worker.nameOnAadhar || '',
        aadharNumber: worker.aadhar || '',
        panNumber: worker.pan || '',
        profilePhoto: worker.profilePhoto || '',
        documents: {
          aadhar: worker.documents?.aadhar || '',
          aadharBack: worker.documents?.aadharBack || '',
          pan: worker.documents?.pan || '',
          drivingLicense: worker.documents?.drivingLicense || '',
          other1: worker.documents?.other1 || worker.otherDocuments?.[0] || '',
          other2: worker.documents?.other2 || worker.otherDocuments?.[1] || ''
        }
      },
      isSubmitting: false
    });
  };

  // Upload document directly to Cloudinary
  const handleDocumentUpload = async (slotKey, file) => {
    if (!file) return;
    try {
      setUploadingSlot(slotKey);
      const toastId = toast.loading(`Uploading document...`);
      const uploadedUrl = await uploadToCloudinary(file, 'worker_documents');
      toast.dismiss(toastId);
      toast.success('Document uploaded successfully!');

      if (slotKey === 'profilePhoto') {
        setEditModal((prev) => ({
          ...prev,
          formData: { ...prev.formData, profilePhoto: uploadedUrl }
        }));
      } else {
        setEditModal((prev) => ({
          ...prev,
          formData: {
            ...prev.formData,
            documents: {
              ...(prev.formData.documents || {}),
              [slotKey]: uploadedUrl
            }
          }
        }));
      }
    } catch (err) {
      console.error('Document upload error:', err);
      toast.error('Failed to upload document. Please try again.');
    } finally {
      setUploadingSlot(null);
    }
  };

  // Remove uploaded document
  const handleRemoveDocument = (slotKey) => {
    if (slotKey === 'profilePhoto') {
      setEditModal((prev) => ({
        ...prev,
        formData: { ...prev.formData, profilePhoto: '' }
      }));
    } else {
      setEditModal((prev) => ({
        ...prev,
        formData: {
          ...prev.formData,
          documents: {
            ...(prev.formData.documents || {}),
            [slotKey]: ''
          }
        }
      }));
    }
    toast.success('Document removed');
  };

  // Submit Edit Worker
  const handleSaveEditWorker = async (e) => {
    e.preventDefault();
    if (!editModal.formData.name || !editModal.formData.phone) {
      toast.error('Name and phone number are required');
      return;
    }

    try {
      setEditModal((prev) => ({ ...prev, isSubmitting: true }));
      const res = await adminWorkerService.updateWorker(editModal.worker.id, editModal.formData);
      if (res.success) {
        toast.success('Worker details updated successfully!');
        setEditModal({ isOpen: false, worker: null, formData: {}, isSubmitting: false });
        loadWorkers();
      } else {
        toast.error(res.message || 'Failed to update worker');
      }
    } catch (err) {
      console.error('Update worker error:', err);
      toast.error(err.response?.data?.message || 'Failed to update worker');
    } finally {
      setEditModal((prev) => ({ ...prev, isSubmitting: false }));
    }
  };

  // Open Assign/Extend Plan Modal
  const handleOpenPlanModal = (worker) => {
    setPlanModal({
      isOpen: true,
      worker,
      planId: availablePlans[0]?._id || '',
      customPlanTitle: 'Standard Plan',
      durationDays: 30,
      isSubmitting: false
    });
  };

  // Submit Plan Assignment
  const handleSavePlan = async (e) => {
    e.preventDefault();
    try {
      setPlanModal((prev) => ({ ...prev, isSubmitting: true }));
      const payload = {
        planId: planModal.planId || undefined,
        durationDays: Number(planModal.durationDays) || 30,
        customPlanTitle: planModal.customPlanTitle || 'Standard Plan'
      };

      const res = await adminWorkerService.assignPlan(planModal.worker.id, payload);
      if (res.success) {
        toast.success(res.message || 'Subscription updated successfully!');
        setPlanModal({ isOpen: false, worker: null, planId: '', durationDays: 30, isSubmitting: false });
        loadWorkers();
      } else {
        toast.error(res.message || 'Failed to assign plan');
      }
    } catch (err) {
      console.error('Assign plan error:', err);
      toast.error(err.response?.data?.message || 'Failed to assign plan');
    } finally {
      setPlanModal((prev) => ({ ...prev, isSubmitting: false }));
    }
  };

  // Submit Add Worker Form
  const handleSaveAddWorker = async (e) => {
    e.preventDefault();
    if (!addModal.formData.name || !addModal.formData.phone) {
      toast.error('Name and phone number are required');
      return;
    }

    try {
      setAddModal((prev) => ({ ...prev, isSubmitting: true }));
      const res = await adminWorkerService.createWorker(addModal.formData);
      if (res.success) {
        toast.success('Worker onboarded successfully!');
        setAddModal({
          isOpen: false,
          formData: {
            name: '',
            phone: '',
            email: '',
            businessName: '',
            password: '',
            serviceCategories: [],
            zoneIds: [],
            approvalStatus: 'approved'
          },
          isSubmitting: false
        });
        loadWorkers();
      } else {
        toast.error(res.message || 'Failed to add worker');
      }
    } catch (err) {
      console.error('Add worker error:', err);
      toast.error(err.response?.data?.message || 'Failed to add worker');
    } finally {
      setAddModal((prev) => ({ ...prev, isSubmitting: false }));
    }
  };

  // Skill approve/reject handlers (Preserved)
  const handleApproveSkill = async (workerId, category) => {
    try {
      setProcessingSkill(`approve_${category}`);
      const res = await adminWorkerService.approveWorkerSkill(workerId, category);
      if (res.success) {
        const catNames = Array.isArray(category) ? category.join(', ') : category;
        toast.success(`Skill "${catNames}" verified successfully!`);
        loadWorkers();
        if (selectedWorker && selectedWorker.id === workerId) {
          const catsToApprove = Array.isArray(category) ? category : [category];
          const updatedPending = (selectedWorker.pendingServiceCategories || []).filter((c) => !catsToApprove.includes(c));
          const updatedApproved = Array.from(new Set([...(selectedWorker.serviceCategories || []), ...catsToApprove]));
          setSelectedWorker((prev) => ({
            ...prev,
            serviceCategories: updatedApproved,
            pendingServiceCategories: updatedPending,
            serviceCategory: updatedApproved.join(', ')
          }));
        }
      }
    } catch (err) {
      toast.error('Failed to approve skill');
    } finally {
      setProcessingSkill(null);
    }
  };

  const handleRejectSkill = async (workerId, category) => {
    const reason = window.prompt(`Enter rejection reason for skill "${category}":`, 'Not meeting service criteria');
    if (reason === null) return;

    try {
      setProcessingSkill(`reject_${category}`);
      const res = await adminWorkerService.rejectWorkerSkill(workerId, category, reason);
      if (res.success) {
        toast.success(`Skill "${category}" rejected.`);
        loadWorkers();
      }
    } catch (err) {
      toast.error('Failed to reject skill');
    } finally {
      setProcessingSkill(null);
    }
  };

  const handleRemoveSkill = async (workerId, category) => {
    if (!window.confirm(`Remove skill "${category}" from this worker?`)) return;
    try {
      setProcessingSkill(`remove_${category}`);
      const res = await adminWorkerService.removeWorkerSkill(workerId, category);
      if (res.success) {
        toast.success(`Skill "${category}" removed.`);
        loadWorkers();
      }
    } catch (err) {
      toast.error('Failed to remove skill');
    } finally {
      setProcessingSkill(null);
    }
  };

  return (
    <div className="space-y-4">
      <CardShell
        icon={FiBriefcase}
        title="All Vendors / Workers"
        subtitle="Manage platform vendors, assigned zones, plans, and their activity"
      >
        {/* Top Stat Cards matching DoorMeets benchmark */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* SIGNUP ONLY / PENDING */}
          <div
            onClick={() => setFilterStatus(filterStatus === 'signup_only' ? 'all' : 'signup_only')}
            className={`p-4 rounded-xl border transition-all cursor-pointer shadow-2xs ${
              filterStatus === 'signup_only'
                ? 'bg-amber-100 border-amber-400 ring-2 ring-amber-300'
                : 'bg-amber-50/70 border-amber-200 hover:bg-amber-100/60'
            }`}
          >
            <div className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">
              Signup Only / Pending
            </div>
            <div className="text-2xl font-black text-amber-900 mt-1">
              {counts.signupOnly || counts.pending || 0}
            </div>
          </div>

          {/* APPROVED */}
          <div
            onClick={() => setFilterStatus(filterStatus === 'approved' ? 'all' : 'approved')}
            className={`p-4 rounded-xl border transition-all cursor-pointer shadow-2xs ${
              filterStatus === 'approved'
                ? 'bg-emerald-100 border-emerald-400 ring-2 ring-emerald-300'
                : 'bg-emerald-50/70 border-emerald-200 hover:bg-emerald-100/60'
            }`}
          >
            <div className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">
              Approved
            </div>
            <div className="text-2xl font-black text-emerald-900 mt-1">
              {counts.approved || 0}
            </div>
          </div>

          {/* REJECTED */}
          <div
            onClick={() => setFilterStatus(filterStatus === 'rejected' ? 'all' : 'rejected')}
            className={`p-4 rounded-xl border transition-all cursor-pointer shadow-2xs ${
              filterStatus === 'rejected'
                ? 'bg-rose-100 border-rose-400 ring-2 ring-rose-300'
                : 'bg-rose-50/70 border-rose-200 hover:bg-rose-100/60'
            }`}
          >
            <div className="text-[11px] font-bold text-rose-700 uppercase tracking-wider">
              Rejected
            </div>
            <div className="text-2xl font-black text-rose-900 mt-1">
              {counts.rejected || 0}
            </div>
          </div>

          {/* OFFLINE REQUESTS */}
          <Link
            to="/admin/home-service/workers/offline-requests"
            className="p-4 rounded-xl border bg-indigo-50/70 border-indigo-200 hover:bg-indigo-100/60 transition-all flex flex-col justify-between group cursor-pointer shadow-2xs"
          >
            <div className="flex items-center justify-between">
              <div className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider flex items-center gap-1.5">
                <FiClock className="w-3.5 h-3.5 text-indigo-600" />
                Offline Requests
              </div>
              <FiChevronRight className="w-4 h-4 text-indigo-500 group-hover:translate-x-1 transition-transform" />
            </div>
            <div className="flex items-baseline justify-between mt-1">
              <div className="text-2xl font-black text-indigo-900">
                {counts.offlineRequests || 0}
              </div>
              <span className="text-xs font-semibold text-indigo-600 group-hover:underline">
                Review Leave &rarr;
              </span>
            </div>
          </Link>
        </div>

        {/* Search, Filter Tabs and + Add Vendor Button */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-3 pt-1">
          <div className="relative flex-1 w-full">
            <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search vendors by name, phone, email, business..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-xs text-gray-800 transition-all"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 scrollbar-hide">
            {[
              { id: 'all', label: 'All' },
              { id: 'signup_only', label: 'Signup Only' },
              { id: 'approved', label: 'Approved' },
              { id: 'rejected', label: 'Rejected' },
              { id: 'pending_skills', label: `Pending Skills (${counts.pendingSkills || 0})` }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterStatus(tab.id)}
                className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  filterStatus === tab.id
                    ? 'bg-gray-900 text-white shadow-xs'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {tab.label}
              </button>
            ))}

            <button
              onClick={() =>
                setAddModal({
                  isOpen: true,
                  formData: {
                    name: '',
                    phone: '',
                    email: '',
                    businessName: '',
                    password: '',
                    serviceCategories: [],
                    zoneIds: [],
                    approvalStatus: 'approved'
                  },
                  isSubmitting: false
                })
              }
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all whitespace-nowrap shrink-0"
            >
              <FiPlus className="w-4 h-4" />
              <span>Add Vendor</span>
            </button>
          </div>
        </div>

        {/* SELECT ZONE BAR (Matching DoorMeets reference screenshot) */}
        <div className="bg-gray-50/80 border border-gray-200/80 rounded-xl p-2.5">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide text-xs">
            <div className="flex items-center gap-1 font-extrabold text-red-600 uppercase tracking-wider text-[11px] shrink-0 mr-1">
              <FiMapPin className="w-3.5 h-3.5 text-red-500 fill-red-100" />
              <span>SELECT ZONE:</span>
            </div>

            {/* All Zones Pill */}
            <button
              onClick={() => setSelectedZone('all')}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                selectedZone === 'all'
                  ? 'bg-red-600 text-white shadow-xs font-bold'
                  : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-100'
              }`}
            >
              <span>All Zones</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  selectedZone === 'all' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'
                }`}
              >
                {workers.length}
              </span>
            </button>

            {/* Dynamic Zones Pills from Database */}
            {zonesSummary
              .filter((z) => z.id !== 'all')
              .map((z) => (
                <button
                  key={z.id}
                  onClick={() => setSelectedZone(z.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                    selectedZone === z.id
                      ? 'bg-red-600 text-white shadow-xs font-bold'
                      : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  <span>{z.name}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      selectedZone === z.id ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {z.count}
                  </span>
                </button>
              ))}
          </div>
        </div>

        {/* MAIN VENDORS / WORKERS TABLE */}
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-gray-200/80 bg-gray-50/70 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  <th className="px-4 py-3 min-w-[200px]">Vendor Details</th>
                  <th className="px-4 py-3 min-w-[190px]">Business Info</th>
                  <th className="px-4 py-3 min-w-[160px]">Subscription</th>
                  <th className="px-4 py-3 min-w-[130px]">MCQ Level</th>
                  <th className="px-4 py-3 min-w-[130px]">Status</th>
                  <th className="px-4 py-3 text-right min-w-[140px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="px-4 py-12 text-center text-gray-400">
                      <div className="flex items-center justify-center gap-2">
                        <FiLoader className="w-4 h-4 animate-spin text-emerald-600" />
                        <span className="font-semibold">Loading vendors &amp; subscription data...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredWorkers.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-4 py-12 text-center text-gray-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <FiBriefcase className="w-8 h-8 text-gray-300" />
                        <span className="font-medium text-gray-500">No vendors found matching your filters.</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredWorkers.map((worker) => {
                    const idShort = worker.id ? worker.id.slice(-6).toUpperCase() : '------';
                    const isOnline = worker.isOnline;
                    const hasActivePlan = worker.subscription?.isActive;
                    const daysLeft = worker.subscription?.daysLeft || 0;
                    const planTitle = worker.subscription?.planTitle || 'NO PLAN';

                    return (
                      <tr key={worker.id} className="hover:bg-gray-50/80 transition-colors">
                        {/* COLUMN 1: VENDOR DETAILS */}
                        <td className="px-4 py-3">
                          <div className="flex items-start gap-3">
                            {/* Avatar */}
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-xs">
                              {worker.name ? worker.name.charAt(0).toUpperCase() : 'W'}
                            </div>

                            <div className="space-y-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-gray-900 text-xs truncate">{worker.name}</span>
                                <span className="text-[10px] font-mono px-1.5 py-0.2 bg-gray-100 text-gray-600 rounded border border-gray-200">
                                  ID: {idShort}
                                </span>
                                <span
                                  className={`text-[10px] font-semibold flex items-center gap-1 ${
                                    isOnline ? 'text-emerald-600' : 'text-gray-400'
                                  }`}
                                >
                                  <span
                                    className={`w-1.5 h-1.5 rounded-full ${
                                      isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-gray-300'
                                    }`}
                                  />
                                  ({isOnline ? 'online' : 'offline'})
                                </span>
                              </div>

                              <div className="text-[11px] text-gray-600 font-medium">{worker.phone}</div>

                              {/* Zone Badges (Purple/Magenta pins) */}
                              {worker.zones && worker.zones.length > 0 ? (
                                <div className="flex flex-wrap gap-1 pt-0.5">
                                  {worker.zones.map((zoneName, zIdx) => (
                                    <span
                                      key={zIdx}
                                      className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-md"
                                    >
                                      <FiMapPin className="w-2.5 h-2.5 text-purple-600 shrink-0" />
                                      {zoneName}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-[10px] text-gray-400 italic flex items-center gap-1">
                                  <FiMapPin className="w-2.5 h-2.5 text-gray-300" />
                                  No zone assigned
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* COLUMN 2: BUSINESS INFO */}
                        <td className="px-4 py-3">
                          <div className="space-y-1.5 max-w-[220px]">
                            <div className="font-bold text-gray-900 text-xs truncate">
                              {worker.businessName || worker.name}
                            </div>

                            {/* Categories / Skills */}
                            {worker.serviceCategories && worker.serviceCategories.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {worker.serviceCategories.slice(0, 3).map((cat, cIdx) => (
                                  <span
                                    key={cIdx}
                                    className="text-[10px] text-blue-700 font-semibold bg-blue-50 border border-blue-100 px-1.5 py-0.2 rounded"
                                  >
                                    {cat}
                                  </span>
                                ))}
                                {worker.serviceCategories.length > 3 && (
                                  <span className="text-[9px] text-gray-500 font-bold bg-gray-100 px-1.5 py-0.2 rounded">
                                    +{worker.serviceCategories.length - 3} more
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-[10px] text-gray-400 italic">No trade category</span>
                            )}

                            {/* Registration Badge */}
                            <div>
                              <span
                                className={`text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded border ${
                                  worker.aadhar || worker.pan
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : 'bg-gray-100 text-gray-500 border-gray-200'
                                }`}
                              >
                                {worker.aadhar || worker.pan ? 'REGISTERED' : 'UNREGISTERED'}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* COLUMN 3: SUBSCRIPTION */}
                        <td className="px-4 py-3">
                          <div className="space-y-1.5">
                            {/* Plan Badge */}
                            <div>
                              <span
                                className={`inline-flex items-center gap-1 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md border ${
                                  hasActivePlan
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                    : 'bg-gray-100 text-gray-600 border-gray-200'
                                }`}
                              >
                                <FiZap className={`w-3 h-3 ${hasActivePlan ? 'text-emerald-600 fill-emerald-500' : 'text-gray-400'}`} />
                                {planTitle}
                              </span>
                            </div>

                            {/* Validity / Days Left */}
                            <div className="text-[11px] text-gray-600 font-medium flex items-center gap-1">
                              {hasActivePlan ? (
                                <span className="text-emerald-700 font-bold flex items-center gap-1">
                                  <FiClock className="w-3 h-3 text-emerald-600" />
                                  {daysLeft} days left
                                </span>
                              ) : (
                                <span className="text-gray-400 italic">No active plan</span>
                              )}
                            </div>

                            {/* + Plan & + Extend Action Buttons */}
                            <div className="flex items-center gap-1.5 pt-0.5">
                              <button
                                onClick={() => handleOpenPlanModal(worker)}
                                className="px-2 py-0.5 text-[10px] font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded transition-colors"
                              >
                                + Plan
                              </button>
                              <button
                                onClick={() => handleOpenPlanModal(worker)}
                                className="px-2 py-0.5 text-[10px] font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded transition-colors"
                              >
                                + Extend
                              </button>
                            </div>
                          </div>
                        </td>

                        {/* COLUMN 4: MCQ LEVEL / STATS */}
                        <td className="px-4 py-3">
                          <div className="space-y-1">
                            {/* MCQ Level Badge */}
                            <div>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded border inline-block ${
                                  worker.mcqLevel && worker.mcqLevel !== 'Not Certified'
                                    ? 'bg-amber-50 text-amber-900 border-amber-300'
                                    : 'bg-gray-100 text-gray-500 border-gray-200'
                                }`}
                              >
                                {worker.mcqLevel || 'Not Certified'}
                              </span>
                            </div>

                            <div className="text-[11px] text-gray-600 font-semibold">
                              {worker.completedJobs || 0} Total Jobs
                            </div>

                            <div className="text-[11px] text-amber-600 font-bold flex items-center gap-1">
                              {worker.rating > 0 ? (
                                <>
                                  <FiStar className="w-3 h-3 fill-amber-400 text-amber-500" />
                                  <span>{worker.rating.toFixed(1)}</span>
                                </>
                              ) : (
                                <span className="text-gray-400 text-[10px] font-normal">☆ No rating</span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* COLUMN 5: STATUS */}
                        <td className="px-4 py-3">
                          <div className="space-y-1.5 items-start">
                            <div>
                              <span
                                className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider border ${
                                  worker.approvalStatus === 'approved'
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : worker.approvalStatus === 'rejected'
                                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                                    : 'bg-amber-50 text-amber-700 border-amber-200'
                                }`}
                              >
                                {worker.approvalStatus === 'pending' ? 'SIGNUP ONLY' : worker.approvalStatus}
                              </span>
                            </div>

                            <div>
                              <span
                                className={`text-[10px] font-extrabold uppercase tracking-tight block ${
                                  worker.isActive ? 'text-emerald-700' : 'text-gray-400'
                                }`}
                              >
                                {worker.isActive ? 'ACCOUNT ACTIVE' : 'INACTIVE'}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* COLUMN 6: ACTIONS */}
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {/* View KYC & Details */}
                            <button
                              onClick={() => handleViewDetails(worker)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="View Profile & Documents"
                            >
                              <FiEye className="w-4 h-4" />
                            </button>

                            {/* Edit Worker */}
                            <button
                              onClick={() => handleOpenEdit(worker)}
                              className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                              title="Edit Worker & Zones"
                            >
                              <FiEdit2 className="w-4 h-4" />
                            </button>

                            {/* Force Online Toggle */}
                            <button
                              onClick={() => handleForceOnline(worker.id, worker.name)}
                              className={`p-1.5 rounded-lg transition-colors ${
                                worker.isOnline
                                  ? 'text-emerald-600 hover:bg-emerald-50'
                                  : 'text-gray-400 hover:text-emerald-600 hover:bg-emerald-50'
                              }`}
                              title={worker.isOnline ? 'Worker is Online' : 'Force Online Now'}
                            >
                              <FiPower className="w-4 h-4" />
                            </button>

                            {/* Quick Approve (Pending only) */}
                            {worker.approvalStatus === 'pending' && (
                              <button
                                onClick={() => handleApprove(worker.id)}
                                className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                title="Approve Worker"
                              >
                                <FiCheck className="w-4 h-4" />
                              </button>
                            )}

                            {/* Delete Worker */}
                            <button
                              onClick={() => handleDelete(worker.id)}
                              className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Delete Worker"
                            >
                              <FiTrash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </CardShell>

      {/* ======================================================== */}
      {/* MODAL 1: EDIT WORKER MODAL (Full Admin Edit Capability) */}
      {/* ======================================================== */}
      <Modal
        isOpen={editModal.isOpen}
        onClose={() => setEditModal({ isOpen: false, worker: null, formData: {}, isSubmitting: false })}
        title="Edit Vendor Settings"
        size="xl"
      >
        <form onSubmit={handleSaveEditWorker} className="space-y-4 text-xs">
          {/* Row 1: Vendor Name & Phone Number */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Vendor Name</label>
              <input
                type="text"
                required
                value={editModal.formData.name || ''}
                onChange={(e) =>
                  setEditModal((prev) => ({
                    ...prev,
                    formData: { ...prev.formData, name: e.target.value }
                  }))
                }
                className="w-full px-3 py-2 bg-gray-50/50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Phone Number</label>
              <input
                type="text"
                required
                value={editModal.formData.phone || ''}
                onChange={(e) =>
                  setEditModal((prev) => ({
                    ...prev,
                    formData: { ...prev.formData, phone: e.target.value }
                  }))
                }
                className="w-full px-3 py-2 bg-gray-50/50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <p className="text-[11px] text-gray-400 mt-1">
                Changing this resets phone verification — vendor re-verifies via OTP on next login.
              </p>
            </div>
          </div>

          {/* Row 2: Business Name & Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Business Name</label>
              <input
                type="text"
                value={editModal.formData.businessName || ''}
                onChange={(e) =>
                  setEditModal((prev) => ({
                    ...prev,
                    formData: { ...prev.formData, businessName: e.target.value }
                  }))
                }
                placeholder="e.g. Ramesh Plumbing Works"
                className="w-full px-3 py-2 bg-gray-50/50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={editModal.formData.email || ''}
                onChange={(e) =>
                  setEditModal((prev) => ({
                    ...prev,
                    formData: { ...prev.formData, email: e.target.value }
                  }))
                }
                className="w-full px-3 py-2 bg-gray-50/50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Vendor Account Active Checkbox */}
          <div className="pt-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={editModal.formData.isActive === true}
                onChange={(e) =>
                  setEditModal((prev) => ({
                    ...prev,
                    formData: { ...prev.formData, isActive: e.target.checked }
                  }))
                }
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
              />
              <span className="text-xs font-semibold text-gray-800">Vendor Account Active</span>
            </label>
            <p className="text-[11px] text-gray-400 mt-0.5 ml-6">
              If disabled, the vendor will not be able to log in or receive jobs.
            </p>
          </div>

          {/* Row 3: Vendor Level & Tax Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Vendor Level</label>
              <select
                value={editModal.formData.mcqLevel || 'Level 1 — Premium / Expert (80%+ Rating)'}
                onChange={(e) =>
                  setEditModal((prev) => ({
                    ...prev,
                    formData: { ...prev.formData, mcqLevel: e.target.value }
                  }))
                }
                className="w-full px-3 py-2 bg-gray-50/50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="Level 1 — Premium / Expert (80%+ Rating)">Level 1 — Premium / Expert (80%+ Rating)</option>
                <option value="Level 2 — Standard / Professional">Level 2 — Standard / Professional</option>
                <option value="Level 3 — Basic / Starter">Level 3 — Basic / Starter</option>
                <option value="Not Certified">Not Certified</option>
              </select>
              <p className="text-[11px] text-gray-400 mt-1">Directly upgrades/downgrades vendor ranking level manually.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Vendor Type (Tax Category)</label>
              <select
                value={editModal.formData.vendorType || 'Unregistered'}
                onChange={(e) =>
                  setEditModal((prev) => ({
                    ...prev,
                    formData: { ...prev.formData, vendorType: e.target.value }
                  }))
                }
                className="w-full px-3 py-2 bg-gray-50/50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="Unregistered">Unregistered</option>
                <option value="Registered">Registered</option>
              </select>
              <p className="text-[11px] text-gray-400 mt-1">
                Overrides the vendor's own registration choice. Determines which GST % (set in Settings) applies to their payouts going forward.
              </p>
            </div>
          </div>

          {/* Row 4: GSTIN */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">GSTIN</label>
            <input
              type="text"
              value={editModal.formData.gstin || ''}
              onChange={(e) =>
                setEditModal((prev) => ({
                  ...prev,
                  formData: { ...prev.formData, gstin: e.target.value }
                }))
              }
              placeholder="15-CHARACTER GSTIN (OPTIONAL)"
              className="w-full px-3 py-2 bg-gray-50/50 border border-gray-200 rounded-lg text-xs uppercase focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <p className="text-[11px] text-gray-400 mt-1">Shown on the vendor's tax invoice. Leave blank to omit it.</p>
          </div>

          {/* Row 5: Assigned Operating Zones */}
          <div className="pt-2 border-t border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-gray-800">Assigned Operating Zones</label>
              <span className="text-[11px] text-purple-600 font-medium">Select 1 or multiple zones</span>
            </div>
            <div className="space-y-1.5 p-3 bg-gray-50/50 rounded-lg border border-gray-200 max-h-36 overflow-y-auto">
              <label className="flex items-center gap-2 cursor-pointer font-semibold text-gray-800 text-xs">
                <input
                  type="checkbox"
                  checked={zones.length > 0 && (editModal.formData.zoneIds || []).length === zones.length}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setEditModal((prev) => ({
                        ...prev,
                        formData: { ...prev.formData, zoneIds: zones.map((z) => String(z._id)) }
                      }));
                    } else {
                      setEditModal((prev) => ({
                        ...prev,
                        formData: { ...prev.formData, zoneIds: [] }
                      }));
                    }
                  }}
                  className="w-4 h-4 rounded text-blue-600"
                />
                <span>All Zones (Global Vendor)</span>
              </label>
              {zones.map((zone) => {
                const zoneId = String(zone._id);
                const isChecked = (editModal.formData.zoneIds || []).some((id) => String(id) === zoneId);
                return (
                  <label key={zoneId} className="flex items-center gap-2 cursor-pointer text-gray-700 text-xs pl-2">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => {
                        const current = editModal.formData.zoneIds || [];
                        const updated = e.target.checked
                          ? [...current, zoneId]
                          : current.filter((id) => String(id) !== zoneId);
                        setEditModal((prev) => ({
                          ...prev,
                          formData: { ...prev.formData, zoneIds: updated }
                        }));
                      }}
                      className="w-4 h-4 rounded text-blue-600"
                    />
                    <span>{zone.name}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Row 6: Allowed Categories */}
          <div className="pt-2 border-t border-gray-200">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-gray-800">Allowed Categories</label>
              <span className="text-[11px] text-gray-400">
                Select which categories this vendor is allowed to see and work in.
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 bg-gray-50/50 rounded-lg border border-gray-200 max-h-48 overflow-y-auto">
              {availableCategories.map((cat, idx) => {
                const isChecked = (editModal.formData.serviceCategories || []).includes(cat);
                return (
                  <label key={idx} className="flex items-center gap-2 cursor-pointer text-gray-700 text-xs hover:text-gray-900">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => {
                        const current = editModal.formData.serviceCategories || [];
                        const updated = e.target.checked
                          ? [...current, cat]
                          : current.filter((c) => c !== cat);
                        setEditModal((prev) => ({
                          ...prev,
                          formData: { ...prev.formData, serviceCategories: updated }
                        }));
                      }}
                      className="w-4 h-4 rounded text-blue-600"
                    />
                    <span>{cat}</span>
                  </label>
                );
              })}
            </div>

            {/* Custom Category Input */}
            <div className="flex items-center gap-2 mt-2">
              <input
                type="text"
                placeholder="Type custom category/trade name..."
                value={customCategoryInput}
                onChange={(e) => setCustomCategoryInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const trimmed = customCategoryInput.trim();
                    if (!trimmed) return;
                    if (!editModal.formData.serviceCategories.includes(trimmed)) {
                      setEditModal((prev) => ({
                        ...prev,
                        formData: {
                          ...prev.formData,
                          serviceCategories: [...(prev.formData.serviceCategories || []), trimmed]
                        }
                      }));
                    }
                    if (!availableCategories.includes(trimmed)) {
                      setAvailableCategories((prev) => [...prev, trimmed]);
                    }
                    setCustomCategoryInput('');
                  }
                }}
                className="flex-1 px-3 py-1.5 text-xs bg-white border border-gray-300 rounded-lg focus:outline-none"
              />
              <button
                type="button"
                onClick={() => {
                  const trimmed = customCategoryInput.trim();
                  if (!trimmed) return;
                  if (!editModal.formData.serviceCategories.includes(trimmed)) {
                    setEditModal((prev) => ({
                      ...prev,
                      formData: {
                        ...prev.formData,
                        serviceCategories: [...(prev.formData.serviceCategories || []), trimmed]
                      }
                    }));
                  }
                  if (!availableCategories.includes(trimmed)) {
                    setAvailableCategories((prev) => [...prev, trimmed]);
                  }
                  setCustomCategoryInput('');
                }}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shrink-0"
              >
                + Add Category
              </button>
            </div>
          </div>

          {/* Row 7: Verification Documents with 6 Upload Slots (Exact DoorMeets Replicate!) */}
          <div className="pt-2 border-t border-gray-200">
            <div className="mb-2">
              <label className="text-xs font-semibold text-gray-800">Verification Documents</label>
              <p className="text-[11px] text-gray-400">
                Locked for the vendor once approved — editable here at any time.
              </p>
            </div>

            {/* 3 Text Inputs: Name as on Aadhar, Aadhar Number, PAN Number */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1">Name as on Aadhar</label>
                <input
                  type="text"
                  value={editModal.formData.nameOnAadhar || ''}
                  onChange={(e) =>
                    setEditModal((prev) => ({
                      ...prev,
                      formData: { ...prev.formData, nameOnAadhar: e.target.value }
                    }))
                  }
                  placeholder="Name as on Aadhar"
                  className="w-full px-3 py-2 bg-gray-50/50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1">Aadhar Number</label>
                <input
                  type="text"
                  value={editModal.formData.aadharNumber || ''}
                  onChange={(e) =>
                    setEditModal((prev) => ({
                      ...prev,
                      formData: { ...prev.formData, aadharNumber: e.target.value }
                    }))
                  }
                  placeholder="Aadhar Number"
                  className="w-full px-3 py-2 bg-gray-50/50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-600 mb-1">PAN Number</label>
                <input
                  type="text"
                  value={editModal.formData.panNumber || ''}
                  onChange={(e) =>
                    setEditModal((prev) => ({
                      ...prev,
                      formData: { ...prev.formData, panNumber: e.target.value }
                    }))
                  }
                  placeholder="PAN Number"
                  className="w-full px-3 py-2 bg-gray-50/50 border border-gray-200 rounded-lg text-xs uppercase focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* 6 Document Upload Slots in a 2-Column Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { key: 'profilePhoto', label: 'Profile Photo', val: editModal.formData.profilePhoto },
                { key: 'aadhar', label: 'Aadhar Front', val: editModal.formData.documents?.aadhar },
                { key: 'aadharBack', label: 'Aadhar Back', val: editModal.formData.documents?.aadharBack },
                { key: 'pan', label: 'PAN Card', val: editModal.formData.documents?.pan },
                { key: 'drivingLicense', label: 'Other Document 1 (Driving License)', val: editModal.formData.documents?.drivingLicense },
                { key: 'other2', label: 'Other Document 2', val: editModal.formData.documents?.other2 }
              ].map((slot) => (
                <div key={slot.key} className="flex flex-col">
                  <span className="text-xs font-semibold text-gray-700 mb-1.5">{slot.label}</span>
                  <div className="relative w-full h-36 rounded-lg border border-dashed border-gray-300 bg-gray-50/50 flex flex-col items-center justify-center overflow-hidden transition-all hover:border-gray-400">
                    {uploadingSlot === slot.key ? (
                      <div className="flex flex-col items-center justify-center p-3 text-blue-600">
                        <FiLoader className="w-6 h-6 animate-spin mb-1.5" />
                        <span className="text-[11px] font-semibold">Uploading...</span>
                      </div>
                    ) : slot.val ? (
                      <div className="group relative w-full h-full flex items-center justify-center bg-white p-1">
                        <img
                          src={slot.val}
                          alt={slot.label}
                          className="max-h-full max-w-full object-contain rounded"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity">
                          <button
                            type="button"
                            onClick={() =>
                              setLightboxDoc({
                                url: slot.val,
                                title: `${editModal.formData.name || 'Vendor'} - ${slot.label}`
                              })
                            }
                            className="px-2.5 py-1 bg-white/90 hover:bg-white text-gray-900 rounded text-xs font-bold shadow flex items-center gap-1"
                          >
                            <FiEye className="w-3.5 h-3.5" /> View
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-gray-400 text-xs font-normal">
                        Not uploaded
                      </div>
                    )}
                  </div>

                  {/* Red/Accent Upload Button below box exactly like DoorMeets */}
                  <div className="flex items-center justify-between mt-1.5">
                    <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 cursor-pointer">
                      <FiEdit2 className="w-3 h-3" />
                      <span>{slot.val ? 'Change' : 'Upload'}</span>
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        className="hidden"
                        disabled={uploadingSlot !== null}
                        onChange={(e) => {
                          if (e.target.files?.[0]) {
                            handleDocumentUpload(slot.key, e.target.files[0]);
                          }
                        }}
                      />
                    </label>

                    {slot.val && (
                      <button
                        type="button"
                        onClick={() => handleRemoveDocument(slot.key)}
                        className="text-[11px] text-gray-400 hover:text-rose-500 transition-colors"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-200">
            <button
              type="button"
              onClick={() => setEditModal({ isOpen: false, worker: null, formData: {}, isSubmitting: false })}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={editModal.isSubmitting}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
            >
              {editModal.isSubmitting ? (
                <>
                  <FiLoader className="w-3.5 h-3.5 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* ======================================================== */}
      {/* MODAL 2: ASSIGN / EXTEND SUBSCRIPTION PLAN MODAL        */}
      {/* ======================================================== */}
      <Modal
        isOpen={planModal.isOpen}
        onClose={() => setPlanModal({ isOpen: false, worker: null, planId: '', durationDays: 30, isSubmitting: false })}
        title={`Subscription Plan: ${planModal.worker?.name || ''}`}
        size="md"
      >
        <form onSubmit={handleSavePlan} className="space-y-4 text-xs">
          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
            <div className="text-[11px] font-bold text-emerald-800 uppercase">Current Status</div>
            <div className="text-sm font-black text-emerald-950 mt-0.5">
              Plan: {planModal.worker?.subscription?.planTitle || 'NO PLAN'} (
              {planModal.worker?.subscription?.daysLeft || 0} days remaining)
            </div>
          </div>

          <div>
            <label className="block font-bold text-gray-700 mb-1">Select Subscription Tier / Plan</label>
            <select
              value={planModal.planId}
              onChange={(e) => {
                const selected = availablePlans.find((p) => p._id === e.target.value);
                setPlanModal((prev) => ({
                  ...prev,
                  planId: e.target.value,
                  durationDays: selected?.durationDays || prev.durationDays,
                  customPlanTitle: selected?.title || prev.customPlanTitle
                }));
              }}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="">Custom / Direct Assign</option>
              {availablePlans.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.title} (₹{p.price} / {p.durationDays} Days)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-gray-700 mb-1">Duration to Add (Days)</label>
            <div className="flex gap-2 mb-2">
              {[30, 60, 90, 180, 365].map((d) => (
                <button
                  type="button"
                  key={d}
                  onClick={() => setPlanModal((prev) => ({ ...prev, durationDays: d }))}
                  className={`px-3 py-1 rounded-lg font-bold border transition-all ${
                    planModal.durationDays === d
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                  }`}
                >
                  {d}d
                </button>
              ))}
            </div>
            <input
              type="number"
              min="1"
              required
              value={planModal.durationDays}
              onChange={(e) => setPlanModal((prev) => ({ ...prev, durationDays: e.target.value }))}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-200">
            <button
              type="button"
              onClick={() => setPlanModal({ isOpen: false, worker: null, planId: '', durationDays: 30, isSubmitting: false })}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={planModal.isSubmitting}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
            >
              {planModal.isSubmitting ? (
                <>
                  <FiLoader className="w-3.5 h-3.5 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save & Activate Plan'
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* ======================================================== */}
      {/* MODAL 3: + ADD VENDOR DIRECTLY BY ADMIN                 */}
      {/* ======================================================== */}
      <Modal
        isOpen={addModal.isOpen}
        onClose={() => setAddModal((prev) => ({ ...prev, isOpen: false }))}
        title="Add New Vendor / Worker"
        size="lg"
      >
        <form onSubmit={handleSaveAddWorker} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block font-bold text-gray-700 mb-1">Full Name *</label>
              <input
                type="text"
                required
                value={addModal.formData.name}
                onChange={(e) =>
                  setAddModal((prev) => ({
                    ...prev,
                    formData: { ...prev.formData, name: e.target.value }
                  }))
                }
                placeholder="Vendor Name"
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">Phone Number *</label>
              <input
                type="text"
                required
                value={addModal.formData.phone}
                onChange={(e) =>
                  setAddModal((prev) => ({
                    ...prev,
                    formData: { ...prev.formData, phone: e.target.value }
                  }))
                }
                placeholder="10-digit mobile number"
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={addModal.formData.email}
                onChange={(e) =>
                  setAddModal((prev) => ({
                    ...prev,
                    formData: { ...prev.formData, email: e.target.value }
                  }))
                }
                placeholder="vendor@example.com"
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">Business / Shop Name</label>
              <input
                type="text"
                value={addModal.formData.businessName}
                onChange={(e) =>
                  setAddModal((prev) => ({
                    ...prev,
                    formData: { ...prev.formData, businessName: e.target.value }
                  }))
                }
                placeholder="Shop or Agency Name"
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">Initial Password</label>
              <input
                type="text"
                value={addModal.formData.password}
                onChange={(e) =>
                  setAddModal((prev) => ({
                    ...prev,
                    formData: { ...prev.formData, password: e.target.value }
                  }))
                }
                placeholder="Default: Worker@123"
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">Approval Status</label>
              <select
                value={addModal.formData.approvalStatus}
                onChange={(e) =>
                  setAddModal((prev) => ({
                    ...prev,
                    formData: { ...prev.formData, approvalStatus: e.target.value }
                  }))
                }
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="approved">Approved</option>
                <option value="pending">Pending</option>
              </select>
            </div>
          </div>

          {/* Zones */}
          <div className="pt-2 border-t border-gray-200">
            <label className="block font-bold text-gray-700 mb-1.5">Assign Zones</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-32 overflow-y-auto p-2 bg-gray-50 rounded-lg border border-gray-200">
              {zones.map((zone) => {
                const isChecked = (addModal.formData.zoneIds || []).includes(zone._id);
                return (
                  <label
                    key={zone._id}
                    className={`flex items-center gap-2 p-1.5 rounded-md cursor-pointer border text-xs transition-colors ${
                      isChecked ? 'bg-purple-50 border-purple-300 text-purple-900 font-bold' : 'bg-white border-gray-200 text-gray-700'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => {
                        const current = addModal.formData.zoneIds || [];
                        const updated = e.target.checked
                          ? [...current, zone._id]
                          : current.filter((id) => id !== zone._id);
                        setAddModal((prev) => ({
                          ...prev,
                          formData: { ...prev.formData, zoneIds: updated }
                        }));
                      }}
                    />
                    <span className="truncate">{zone.name}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-200">
            <button
              type="button"
              onClick={() => setAddModal((prev) => ({ ...prev, isOpen: false }))}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={addModal.isSubmitting}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
            >
              {addModal.isSubmitting ? (
                <>
                  <FiLoader className="w-3.5 h-3.5 animate-spin" />
                  Adding...
                </>
              ) : (
                'Onboard Vendor'
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* ======================================================== */}
      {/* MODAL 4: VIEW FULL WORKER DETAILS & KYC DOCUMENTS       */}
      {/* ======================================================== */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setSelectedWorker(null);
        }}
        title={`Vendor Profile: ${selectedWorker?.name || ''}`}
        size="lg"
      >
        {selectedWorker && (
          <div className="space-y-5 text-xs">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase">Full Name</label>
                <div className="font-bold text-gray-900 mt-0.5">{selectedWorker.name}</div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase">Phone</label>
                <div className="font-bold text-gray-900 mt-0.5">{selectedWorker.phone}</div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase">Email</label>
                <div className="font-bold text-gray-900 mt-0.5">{selectedWorker.email || 'N/A'}</div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase">Business Name</label>
                <div className="font-bold text-gray-900 mt-0.5">{selectedWorker.businessName || 'N/A'}</div>
              </div>
            </div>

            {/* Zones & Subscription */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 bg-purple-50 rounded-xl border border-purple-200">
                <div className="text-[10px] font-bold text-purple-700 uppercase flex items-center gap-1 mb-1">
                  <FiMapPin className="w-3 h-3 text-purple-600" />
                  Assigned Service Zones
                </div>
                <div className="flex flex-wrap gap-1">
                  {selectedWorker.zones && selectedWorker.zones.length > 0 ? (
                    selectedWorker.zones.map((z, idx) => (
                      <span key={idx} className="px-2 py-0.5 bg-white text-purple-800 rounded font-bold border border-purple-200">
                        {z}
                      </span>
                    ))
                  ) : (
                    <span className="text-gray-400 italic">No zones assigned yet</span>
                  )}
                </div>
              </div>

              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                <div className="text-[10px] font-bold text-emerald-700 uppercase flex items-center gap-1 mb-1">
                  <FiZap className="w-3 h-3 text-emerald-600" />
                  Subscription Status
                </div>
                <div className="font-bold text-emerald-900">
                  {selectedWorker.subscription?.planTitle || 'NO PLAN'} —{' '}
                  {selectedWorker.subscription?.daysLeft || 0} days remaining
                </div>
              </div>
            </div>

            {/* Skills & Categories Verification Section */}
            <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                  <FiShield className="w-4 h-4 text-blue-600" />
                  Skills &amp; Service Categories
                </h4>
                {selectedWorker.pendingServiceCategories?.length > 1 && (
                  <button
                    onClick={() => handleApproveSkill(selectedWorker.id, selectedWorker.pendingServiceCategories)}
                    disabled={!!processingSkill}
                    className="px-2.5 py-1 bg-green-600 text-white rounded text-[11px] font-bold hover:bg-green-700 transition-colors flex items-center gap-1 shadow-xs"
                  >
                    <FiCheck className="w-3 h-3" />
                    Approve All ({selectedWorker.pendingServiceCategories.length})
                  </button>
                )}
              </div>

              {/* Pending Skills */}
              {selectedWorker.pendingServiceCategories && selectedWorker.pendingServiceCategories.length > 0 && (
                <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 space-y-2">
                  <div className="text-[11px] font-bold text-amber-900 uppercase">
                    Pending Verification ({selectedWorker.pendingServiceCategories.length})
                  </div>
                  <div className="space-y-1.5">
                    {selectedWorker.pendingServiceCategories.map((cat, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 bg-white rounded border border-amber-200">
                        <span className="font-bold text-gray-800">{cat}</span>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleApproveSkill(selectedWorker.id, cat)}
                            className="px-2 py-0.5 bg-emerald-600 text-white rounded font-bold hover:bg-emerald-700"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleRejectSkill(selectedWorker.id, cat)}
                            className="px-2 py-0.5 bg-rose-50 text-rose-600 border border-rose-200 rounded font-bold hover:bg-rose-100"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Verified Skills */}
              <div>
                <div className="text-[10px] font-bold text-gray-500 uppercase mb-1.5">Verified Skills</div>
                <div className="flex flex-wrap gap-1.5">
                  {selectedWorker.serviceCategories && selectedWorker.serviceCategories.length > 0 ? (
                    selectedWorker.serviceCategories.map((cat, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-md font-semibold text-xs"
                      >
                        <FiCheck className="w-3 h-3 text-emerald-600" />
                        {cat}
                        <button
                          onClick={() => handleRemoveSkill(selectedWorker.id, cat)}
                          className="ml-1 text-gray-400 hover:text-rose-600"
                        >
                          <FiX className="w-3 h-3" />
                        </button>
                      </span>
                    ))
                  ) : (
                    <span className="text-gray-400 italic">No verified skills</span>
                  )}
                </div>
              </div>
            </div>

            {/* KYC Documents */}
            <div>
              <div className="text-xs font-bold text-gray-800 uppercase mb-2">KYC Documents</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {selectedWorker.documents.aadhar && (
                  <div className="p-2 border border-gray-200 rounded-lg">
                    <div className="font-bold text-gray-700 mb-1">Aadhar Front</div>
                    <img
                      src={selectedWorker.documents.aadhar}
                      alt="Aadhar Front"
                      className="w-full h-36 object-cover rounded border"
                    />
                    <a
                      href={selectedWorker.documents.aadhar}
                      download
                      className="mt-1.5 inline-flex items-center gap-1 text-blue-600 font-semibold"
                    >
                      <FiDownload className="w-3 h-3" /> Download
                    </a>
                  </div>
                )}
                {selectedWorker.documents.aadharBack && (
                  <div className="p-2 border border-gray-200 rounded-lg">
                    <div className="font-bold text-gray-700 mb-1">Aadhar Back</div>
                    <img
                      src={selectedWorker.documents.aadharBack}
                      alt="Aadhar Back"
                      className="w-full h-36 object-cover rounded border"
                    />
                    <a
                      href={selectedWorker.documents.aadharBack}
                      download
                      className="mt-1.5 inline-flex items-center gap-1 text-blue-600 font-semibold"
                    >
                      <FiDownload className="w-3 h-3" /> Download
                    </a>
                  </div>
                )}
                {selectedWorker.documents.pan && (
                  <div className="p-2 border border-gray-200 rounded-lg">
                    <div className="font-bold text-gray-700 mb-1">PAN Card</div>
                    <img
                      src={selectedWorker.documents.pan}
                      alt="PAN"
                      className="w-full h-36 object-cover rounded border"
                    />
                    <a
                      href={selectedWorker.documents.pan}
                      download
                      className="mt-1.5 inline-flex items-center gap-1 text-blue-600 font-semibold"
                    >
                      <FiDownload className="w-3 h-3" /> Download
                    </a>
                  </div>
                )}
                {selectedWorker.documents.drivingLicense && (
                  <div className="p-2 border border-gray-200 rounded-lg">
                    <div className="font-bold text-gray-700 mb-1">Driving License</div>
                    <img
                      src={selectedWorker.documents.drivingLicense}
                      alt="DL"
                      className="w-full h-36 object-cover rounded border"
                    />
                    <a
                      href={selectedWorker.documents.drivingLicense}
                      download
                      className="mt-1.5 inline-flex items-center gap-1 text-blue-600 font-semibold"
                    >
                      <FiDownload className="w-3 h-3" /> Download
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* LIGHTBOX MODAL FOR DOCUMENTS INSPECTION */}
      {lightboxDoc && (
        <div
          className="fixed inset-0 z-[100000] flex items-center justify-center p-4 backdrop-blur-md"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.75)' }}
          onClick={() => setLightboxDoc(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[92vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
              <h3 className="font-bold text-gray-800 text-sm truncate">{lightboxDoc.title}</h3>
              <div className="flex items-center gap-2">
                <a
                  href={lightboxDoc.url}
                  download
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs"
                >
                  <FiDownload className="w-3.5 h-3.5" /> Download
                </a>
                <button
                  onClick={() => setLightboxDoc(null)}
                  className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <FiX className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-4 overflow-auto flex items-center justify-center bg-gray-900/5 min-h-[300px]">
              <img
                src={lightboxDoc.url}
                alt={lightboxDoc.title}
                className="max-h-[75vh] w-auto object-contain rounded-lg shadow-sm"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AllWorkers;
