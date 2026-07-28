import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ChevronUp,
  MapPin, Star, Share2, Heart, ArrowLeft, Loader2, ChevronLeft, ChevronRight,
  MessageSquare, Tag, X, CheckCircle, Shield, Info, Phone, Maximize2, Compass,
  LayoutTemplate, Wind, Droplets, Zap, Award, Check, ChevronDown, Layers, Home,
  Grid, FileText, Plus, Minus, Eye, EyeOff, Calendar, Send, Sparkles, Building,
  TrendingUp, ThumbsUp, ThumbsDown, CheckCircle2, AlertTriangle, AlertCircle,
  Search, Download, Map, Filter, Leaf, Activity, Dumbbell, Key, Clock
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  propertyService,
  enquiryService,
  localityReviewService,
  userService
} from '../../services/apiService';
import { useAuth } from '../../context/AuthContext';
import { downloadBrochurePDF } from '../../utils/brochurePdfGenerator';

const NO_IMAGE_PLACEHOLDER = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='800' height='600' viewBox='0 0 800 600'><rect width='100%' height='100%' fill='%23F1F5F9'/><text x='50%' y='50%' font-family='sans-serif' font-size='24' font-weight='bold' fill='%2394A3B8' dominant-baseline='middle' text-anchor='middle'>No Image Available</text></svg>";

const HandpickedDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Core State
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [revealedNumber, setRevealedNumber] = useState(null);
  const [revealLoading, setRevealLoading] = useState(false);

  // Tabs state
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'properties'
  const [activeSection, setActiveSection] = useState('overview-sec');
  const [propertyFilter, setPropertyFilter] = useState('All');

  // Hero carousel state
  const [currentImgIndex, setCurrentImgIndex] = useState(0);

  // Floor Plan modal state
  const [selectedFloorPlan, setSelectedFloorPlan] = useState(null);
  const [sqftUnit, setSqftUnit] = useState(true); // true = sqft, false = sqm

  // Payment Plan modal state
  const [selectedPaymentPlan, setSelectedPaymentPlan] = useState(null);

  // Highlights Bottom-sheet / Modal
  const [showAllHighlights, setShowAllHighlights] = useState(false);
  const [showFullAmenitiesDesc, setShowFullAmenitiesDesc] = useState(false);
  const [showUpdates, setShowUpdates] = useState(false);

  // Amenities Modal
  const [showAllAmenities, setShowAllAmenities] = useState(false);
  const [amenityRequestSuccess, setAmenityRequestSuccess] = useState(false);

  // Interiors page state
  const [showInteriorsModal, setShowInteriorsModal] = useState(false);
  const [activeInteriorTab, setActiveInteriorTab] = useState('flooring');

  // Pros & Cons Full Screen Modal
  const [showProsConsModal, setShowProsConsModal] = useState(false);

  // Resolved Builder ID
  const [resolvedBuilderId, setResolvedBuilderId] = useState(null);

  // Comparison Matrix Modal
  const [showComparisonMatrix, setShowComparisonMatrix] = useState(false);
  const [similarProperties, setSimilarProperties] = useState([]);
  const [builderProjects, setBuilderProjects] = useState([]);

  // Dynamic Locality Data
  const [localityStats, setLocalityStats] = useState(null);
  const [localityReviewsData, setLocalityReviewsData] = useState([]);

  // Enquiry / Lead Modal State
  const [showEnquiryModal, setShowEnquiryModal] = useState(false);
  const [enquiryForm, setEnquiryForm] = useState({
    name: '',
    email: '',
    phone: '',
    message: 'I am interested in this project. Please contact me with more details.'
  });
  const [enquirySubmitting, setEnquirySubmitting] = useState(false);

  // New Builder Section States
  const [showAboutBuilderModal, setShowAboutBuilderModal] = useState(false);
  const [showVerifiedSourcesModal, setShowVerifiedSourcesModal] = useState(false);
  const [activeBuilderProjectsTab, setActiveBuilderProjectsTab] = useState('ongoing');
  const [activePropertiesBhkTab, setActivePropertiesBhkTab] = useState('All');


  // References to sections for scroll spying
  const sectionRefs = {
    'overview-sec': useRef(null),
    'specs-sec': useRef(null),
    'locality-sec': useRef(null),
    'builder-sec': useRef(null)
  };

  const thumbnailContainerRef = useRef(null);

  // Auto scroll selected thumbnail into view when currentImgIndex changes
  useEffect(() => {
    if (thumbnailContainerRef.current) {
      const selectedThumb = thumbnailContainerRef.current.children[currentImgIndex];
      if (selectedThumb) {
        selectedThumb.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center'
        });
      }
    }
  }, [currentImgIndex]);

  useEffect(() => {
    loadHandpickedDetails();
    checkIfSaved();
  }, [id]);

  // Robust iOS/Mobile Background Scroll Lock
  useEffect(() => {
    const isModalOpen = showAllHighlights || showAllAmenities || showInteriorsModal || showProsConsModal || showComparisonMatrix || showEnquiryModal || showAboutBuilderModal || showVerifiedSourcesModal || selectedFloorPlan || selectedPaymentPlan;
    if (isModalOpen) {
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
    } else {
      const scrollY = document.body.style.top;
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || '0') * -1);
      }
    }
  }, [showAllHighlights, showAllAmenities, showInteriorsModal, showProsConsModal, showComparisonMatrix, showEnquiryModal, showAboutBuilderModal, showVerifiedSourcesModal, selectedFloorPlan, selectedPaymentPlan]);

  useEffect(() => {
    const handleScroll = () => {
      const scrollPos = window.scrollY + 160;
      let currentSection = 'overview-sec';

      for (const [key, ref] of Object.entries(sectionRefs)) {
        if (ref.current && scrollPos >= ref.current.offsetTop) {
          currentSection = key;
        }
      }
      setActiveSection(currentSection);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Auto-slider for hero images
  useEffect(() => {
    if (!property?.propertyImages?.length) return;
    const imgCount = property.propertyImages.length;
    const interval = setInterval(() => {
      setCurrentImgIndex((prev) => (prev + 1) % imgCount);
    }, 3000); // Changed to 3 seconds
    return () => clearInterval(interval);
  }, [property, currentImgIndex]);

  const fetchLocalityData = async (localityName) => {
    if (!localityName) return;
    try {
      const statsRes = await localityReviewService.getStats(localityName);
      if (statsRes && statsRes.success) {
        setLocalityStats(statsRes.stats);
      }
      const revRes = await localityReviewService.getReviews(localityName, 1, 3);
      if (revRes && revRes.success) {
        setLocalityReviewsData(revRes.reviews || []);
      }
    } catch (err) {
      console.warn("Failed to fetch locality stats:", err);
    }
  };

  const loadHandpickedDetails = async () => {
    try {
      setLoading(true);
      const res = await propertyService.getDetails(id);
      if (res && res.property) {
        setProperty(res.property);

        // Fetch locality details based on property address
        const localityString = res.property.address?.locality || res.property.address?.area || res.property.address?.city || '';
        if (localityString) fetchLocalityData(localityString);

        // Load similar handpicked/admin added projects strictly
        try {
          const simRes = await propertyService.getPublic({
            limit: 20
          });
          let rawList = simRes?.properties || (Array.isArray(simRes) ? simRes : []);
          let projOnly = rawList.filter(p => {
            if (!p || p._id === res.property._id) return false;
            const isProj = p.isProject === true || 
                           p.listingType === 'project' || 
                           p.propertyCategory === 'project' || 
                           p.propertyType === 'project' || 
                           Boolean(p.builderProjectDetails) || 
                           Boolean(p.dynamicData?.builderName) || 
                           (Array.isArray(p.towersList) && p.towersList.length > 0);
            return isProj;
          });
          setSimilarProperties(projOnly.slice(0, 6));
        } catch (err) {
          console.warn("Failed to load similar properties:", err);
        }
      } else {
        toast.error("Property not found");
        navigate('/');
      }
    } catch (error) {
      console.error("Error loading property:", error);
      toast.error("Failed to load property details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchBuilderByName = async () => {
      // Base check: If we have an explicit builderId
      if (property?.dynamicData?.builderId) {
        setResolvedBuilderId(property.dynamicData.builderId);
        return;
      }
      if (property?.builderId) {
        setResolvedBuilderId(property.builderId);
        return;
      }
      // Check if userId is explicitly a builder/partner
      if (property?.userId && typeof property.userId === 'object' && ['builder', 'partner'].includes(property.userId.role)) {
        setResolvedBuilderId(property.userId._id);
        return;
      }
      if (property?.partnerId && typeof property.partnerId === 'object') {
        setResolvedBuilderId(property.partnerId._id);
        return;
      }

      // If we only have string IDs (e.g. from an Admin), try to match the builder name
      const targetName = property?.userId?.builderProfile?.companyName || property?.dynamicData?.builderName || property?.partnerId?.name;
      if (targetName) {
        try {
          const { api } = await import('../../services/apiService');
          const res = await api.get('/public/builders');
          if (res.data && res.data.builders) {
            const matchedBuilder = res.data.builders.find(b =>
              b.name?.toLowerCase() === targetName.toLowerCase() ||
              b.profile?.companyName?.toLowerCase() === targetName.toLowerCase()
            );
            if (matchedBuilder) {
              setResolvedBuilderId(matchedBuilder._id);
              return;
            }
          }
        } catch (e) {
          console.warn("Failed to fetch builder by name:", e);
        }
      }

      // Final fallback to whatever ID we have, let the Builder Profile page handle if it's valid
      if (property?.userId?._id) setResolvedBuilderId(property.userId._id);
      else if (property?.partnerId?._id) setResolvedBuilderId(property.partnerId._id);
      else if (typeof property?.userId === 'string' && property.userId.length === 24) setResolvedBuilderId(property.userId);
      else if (typeof property?.partnerId === 'string' && property.partnerId.length === 24) setResolvedBuilderId(property.partnerId);
    };

    if (property) {
      fetchBuilderByName();
    }
  }, [property]);

  useEffect(() => {
    const fetchBuilderProjects = async () => {
      const bName = property?.userId?.builderProfile?.companyName || property?.dynamicData?.builderName || property?.partnerId?.name || property?.builderName;
      try {
        const res = await propertyService.getPublic({
          limit: 30
        });
        let rawList = res?.properties || (Array.isArray(res) ? res : []);
        let filtered = rawList.filter(p => {
          if (p._id === id) return false;
          if (resolvedBuilderId && (p.userId === resolvedBuilderId || p.partnerId === resolvedBuilderId || p.userId?._id === resolvedBuilderId || p.partnerId?._id === resolvedBuilderId)) return true;
          if (bName) {
            const pBName = p.userId?.builderProfile?.companyName || p.dynamicData?.builderName || p.partnerId?.name || p.builderName;
            if (pBName && pBName.toLowerCase() === bName.toLowerCase()) return true;
          }
          return false;
        });
        setBuilderProjects(filtered);
      } catch (err) {
        console.warn("Failed to fetch builder projects:", err);
      }
    };

    if (property) {
      fetchBuilderProjects();
    }
  }, [property, resolvedBuilderId, id]);

  const checkIfSaved = async () => {
    try {
      const userStr = localStorage.getItem('user');
      if (!userStr) return;
      const res = await userService.getSavedPlaces();
      if (res) {
        const list = [
          ...(res.savedProperties || []),
          ...(res.savedProjects || []),
          ...(res.savedHotels || [])
        ];
        const saved = list.some(item => (typeof item === 'object' ? (item._id || item.id) : item) === id);
        setIsSaved(saved);
      }
    } catch (e) {
      console.warn("Could not load saved status", e);
    }
  };

  const handleSaveToggle = async () => {
    try {
      const userStr = localStorage.getItem('user');
      if (!userStr) {
        toast.error("Please login to save properties");
        return;
      }
      const res = await userService.toggleSavedPlace(id, 'project');
      setIsSaved(!isSaved);
      toast.success(isSaved ? "Removed from saved" : "Saved to your profile!");
    } catch (e) {
      toast.error("Failed to update saved status");
    }
  };

  const handleRevealContact = async () => {
    try {
      setRevealLoading(true);
      const res = await propertyService.revealContact(id);
      if (res && res.contactNumber) {
        setRevealedNumber(res.contactNumber);
        toast.success("Contact revealed successfully!");
      } else {
        setRevealedNumber(property?.contactNumber || "Contact Unavailable");
      }
    } catch (e) {
      setRevealedNumber(property?.contactNumber || "Contact Unavailable");
    } finally {
      setRevealLoading(false);
    }
  };

  const handleEnquirySubmit = async (e) => {
    e.preventDefault();
    if (!enquiryForm.name || !enquiryForm.phone) {
      toast.error("Name and Phone are required");
      return;
    }
    try {
      setEnquirySubmitting(true);
      await enquiryService.create({
        propertyId: id,
        name: enquiryForm.name,
        email: enquiryForm.email,
        phone: enquiryForm.phone,
        message: enquiryForm.message
      });
      toast.success("Enquiry submitted successfully! We will call you back shortly.");
      setShowEnquiryModal(false);
    } catch (err) {
      toast.error(err?.message || "Failed to submit enquiry");
    } finally {
      setEnquirySubmitting(false);
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: property?.propertyName || "Project",
        text: property?.shortDescription || "Check out this amazing property",
        url: window.location.href
      }).catch(err => console.log(err));
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied to clipboard!");
    }
  };

  const scrollToSection = (sectionId) => {
    const element = sectionRefs[sectionId]?.current;
    if (element) {
      const yOffset = -150;
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  // Loading Skeleton State
  if (loading) {
    return (
      <div className="min-h-screen bg-white text-slate-900 flex flex-col items-center justify-center p-6 space-y-6">
        <div className="w-full max-w-6xl space-y-8 animate-pulse">
          {/* Skeleton Header */}
          <div className="h-96 bg-slate-100 rounded-3xl w-full"></div>
          {/* Skeleton Meta Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-2 space-y-4">
              <div className="h-8 bg-slate-100 rounded w-3/4"></div>
              <div className="h-4 bg-slate-100 rounded w-1/2"></div>
              <div className="h-20 bg-slate-100 rounded w-full"></div>
            </div>
            <div className="h-40 bg-slate-100 rounded-2xl w-full"></div>
          </div>
        </div>
      </div>
    );
  }

  // Extract variables with fail-safes
  const pImages = property?.propertyImages && property.propertyImages.length > 0 ? property.propertyImages : [property?.coverImage || NO_IMAGE_PLACEHOLDER];
  const dynamicData = property?.dynamicData || {};
  const builderDetails = property?.builderProjectDetails || {};
  const isApartmentOrVilla = ['apartment', 'penthouse', 'villa', 'independent house', 'builder floor'].includes(property?.propertyType?.toLowerCase());
  const isPlot = ['plot', 'land', 'residential land', 'commercial land', 'farm land'].includes(property?.propertyType?.toLowerCase());
  const isCommercial = ['commercial', 'office', 'shop', 'showroom', 'warehouse', 'factory'].includes(property?.propertyType?.toLowerCase());

  // Helper to extract clean single URL from potential comma-separated string/array
  const getCleanBrochureUrl = (raw) => {
    if (!raw) return "";
    if (Array.isArray(raw)) {
      const first = raw[0] ? String(raw[0]).trim() : "";
      return getCleanBrochureUrl(first);
    }
    if (typeof raw === 'string') {
      const splitUrls = raw.split(',').map(s => s.trim()).filter(Boolean);
      const pdfUrl = splitUrls.find(url => url.toLowerCase().includes('.pdf'));
      return pdfUrl || splitUrls[0] || "";
    }
    return String(raw);
  };

  // Extracted values matching mapping blueprint
  const projectDensity = dynamicData.projectDensity || property?.projectDensity || "";
  const densityType = dynamicData.densityType || property?.densityType || "";
  const totalArea = property?.totalArea || property?.landArea || dynamicData.totalArea || dynamicData.totalLandArea || dynamicData.landArea || property?.plotDetails?.plotArea || property?.buyDetails?.area?.total || 0;
  const totalAreaUnit = dynamicData.totalAreaUnit || dynamicData.landAreaUnit || property?.totalAreaUnit || 'Acres';
  const openAreaPercentage = dynamicData.openAreaPercentage || property?.openAreaPercentage || 0;
  const totalTowers = property?.totalTowers || dynamicData.totalTowers || dynamicData.totalBlocks || towersList?.length || 0;
  const totalUnits = property?.totalUnits || dynamicData.totalUnits || 0;

  const getPaymentPlanDocUrl = (plan) => {
    if (!plan || typeof plan !== 'object') return "";
    const candidates = [
      plan.paymentPlanUrl,
      plan.documentUrl,
      plan.docUrl,
      plan.url,
      plan.document,
      plan.image,
      plan.file,
      plan.paymentPlanDocument,
      plan.pdfUrl,
      plan.mediaUrl,
      plan.link,
      plan.planUrl,
      plan.doc,
      plan.img
    ];
    for (const val of candidates) {
      if (val && typeof val === 'string' && val.trim() !== '') {
        return val.trim();
      }
    }
    for (const key of Object.keys(plan)) {
      if (key.toLowerCase().includes('url') || key.toLowerCase().includes('doc') || key.toLowerCase().includes('file') || key.toLowerCase().includes('image')) {
        const val = plan[key];
        if (val && typeof val === 'string' && (val.startsWith('http') || val.startsWith('/'))) {
          return val.trim();
        }
      }
    }
    return "";
  };

  const rawBrochureData = property?.brochureUrl || 
    property?.dynamicData?.brochure || 
    property?.dynamicData?.brochureUrl || 
    property?.brochure || 
    builderDetails?.brochureUrl;

  const projectBrochureUrl = getCleanBrochureUrl(rawBrochureData);

  const handleBrochureDownload = () => {
    const projTitle = property?.propertyName || property?.name || "Project";
    downloadBrochurePDF(rawBrochureData, projTitle);
  };

  // Highlights & Amenities lists
  const propertyHighlights = property?.highlights?.length > 0
    ? property.highlights
    : [];

  // Normalize a localityPros/Cons entry — DB may store objects like {proText:'...'} or plain strings
  const normalizeLocalityItem = (item) => {
    if (typeof item === 'string') return item;
    if (item && typeof item === 'object') {
      return item.proText || item.conText || item.text || item.value || JSON.stringify(item);
    }
    return String(item ?? '');
  };

  const localityPros = (dynamicData.localityPros || []).map(normalizeLocalityItem);

  const localityCons = (dynamicData.localityCons || []).map(normalizeLocalityItem);

  const builderTrackRecord = {
    name: property?.userId?.builderProfile?.companyName || property?.dynamicData?.builderName || property?.userId?.name || property?.partnerId?.name || "Builder",
    logo: property?.userId?.builderProfile?.logo || property?.dynamicData?.builderLogo || property?.logo || property?.coverImage || property?.partnerId?.profilePicture || "",
    summary: property?.userId?.builderProfile?.about || property?.partnerId?.about || property?.dynamicData?.builderAbout || "",
    experience: property?.userId?.builderProfile?.experienceYears || property?.partnerId?.experience || property?.dynamicData?.builderExperience || 0,
    ongoingCount: property?.userId?.builderProfile?.ongoingProjects || property?.partnerId?.ongoingProjects || property?.dynamicData?.builderOngoing || 0,
    completedCount: property?.userId?.builderProfile?.completedProjects || property?.partnerId?.completedProjects || property?.dynamicData?.builderCompleted || 0,
    rating: property?.userId?.builderProfile?.rating || property?.partnerId?.rating || property?.dynamicData?.builderRating || 0
  };

  // Floor plans
  const floorPlansList = dynamicData.floorPlans || [];

  // Plot configurations (for Plot land)
  const plotConfigsList = dynamicData.plotConfigurations || [];

  // Infrastructure Specs (for plots)
  const plotInfrastructure = {
    waterLine: dynamicData.waterLine || "",
    electricityConnection: dynamicData.electricityConnection || "",
    drainage: dynamicData.drainage || "",
    roadWidth: dynamicData.roadWidth || 0,
    gatedStatus: dynamicData.gatedStatus !== undefined ? dynamicData.gatedStatus : false
  };

  // Payment plans
  const paymentPlansList = dynamicData.paymentPlans || [];

  // Towers list
  const towersList = dynamicData.towers || [];

  // Deep Construction specifications
  const constructionSpecs = {
    flooring: {
      masterBedroom: dynamicData.specFlooringMasterBedroom || "",
      livingDining: dynamicData.specFlooringLivingDining || "",
      kitchen: dynamicData.specFlooringKitchen || "",
      toilet: dynamicData.specFlooringToilet || "",
      balcony: dynamicData.specFlooringBalcony || ""
    },
    toilet: {
      fittings: dynamicData.specToiletFittings || ""
    },
    doors: {
      doorsWindows: dynamicData.specDoorsWindows || ""
    },
    electrical: {
      wiring: dynamicData.specElectrical || ""
    },
    structural: {
      structural: dynamicData.specStructural || ""
    },
    finishing: {
      finishing: dynamicData.specFinishing || ""
    }
  };

  // Local sentiments (no mocks)
  const localSentiments = dynamicData.localSentiments || [];

  // Category reviews (no mocks)
  const localityReviewsMock = property?.localityReviews || {
    aggregate: 0,
    tagCloud: [],
    list: []
  };

  // Available Individual units listed in this project (For properties tab)
  const availableUnitsList = (property?.roomTypes || []).filter(unit => {
    if (propertyFilter === 'All') return true;
    if (propertyFilter === 'Ready To Move') return true; // fallback assumption
    if (propertyFilter === 'Verified') return property?.isVerified || true;
    if (propertyFilter === 'Owner') return property?.userId !== null;
    if (propertyFilter === 'Budget') return (unit.price || 99999999) < 5000000;
    return true;
  });

  // Price Calculation
  const formatPriceLakhCrore = (val) => {
    if (!val) return 'On Request';
    const num = Number(val);
    if (num >= 10000000) return `₹${(num / 10000000).toFixed(2)} Cr`;
    if (num >= 100000) return `₹${(num / 100000).toFixed(2)} Lakh`;
    if (num >= 1000) return `₹${(num / 1000).toFixed(1)} K`;
    return `₹${num.toLocaleString('en-IN')}`;
  };

  const formatPlanPrice = (price) => {
    if (!price || isNaN(price)) return 'On Request';
    const num = Number(price);
    if (num >= 10000000) return `₹${(num / 10000000).toFixed(2)} Cr`;
    if (num >= 100000) return `₹${(num / 100000).toFixed(2)} Lakh`;
    if (num >= 1000) return `₹${(num / 1000).toFixed(1)} K`;
    return `₹${num.toLocaleString('en-IN')}`;
  };

  const floorPlansPrices = (dynamicData.floorPlans || []).map(p => Number(p.price || p.startingPrice || p.expectedPrice)).filter(p => !isNaN(p) && p > 0);
  const minFloorPlanPrice = floorPlansPrices.length > 0 ? Math.min(...floorPlansPrices) : 0;

  const rawPrice = property?.buyDetails?.expectedPrice || 
                   property?.rentDetails?.monthlyRent || 
                   property?.plotDetails?.expectedPrice || 
                   property?.buyDetails?.price || 
                   property?.price || 
                   property?.expectedPrice || 
                   property?.startingPrice || 
                   property?.dynamicData?.expectedPrice || 
                   property?.dynamicData?.startingPrice || 
                   property?.dynamicData?.minPrice || 
                   property?.dynamicData?.price || 
                   minFloorPlanPrice;

  let dispPriceStr = formatPriceLakhCrore(rawPrice);
  if (minFloorPlanPrice > 0 && rawPrice === minFloorPlanPrice && !property?.buyDetails?.expectedPrice) {
    dispPriceStr = `${dispPriceStr} Onwards`;
  }

  const getCarpetOrPriceString = () => {
    let price = rawPrice;
    let area = property?.buyDetails?.area?.carpet || property?.dynamicData?.carpetArea || property?.dynamicData?.superArea;
    if (price && area && !isNaN(price) && !isNaN(area) && Number(area) > 0) {
      return `₹${Math.round(price / area).toLocaleString('en-IN')}/sq.ft.`;
    }
    if (property?.buyDetails?.area?.carpet) return `${property.buyDetails.area.carpet} sq.ft. Carpet Area`;
    if (property?.dynamicData?.carpetArea) return `${property.dynamicData.carpetArea} ${property.dynamicData.carpetAreaUnit || 'sq.ft.'} Carpet Area`;
    if (property?.dynamicData?.superArea) return `${property.dynamicData.superArea} ${property.dynamicData.superAreaUnit || 'sq.ft.'} Super Area`;
    if (property?.plotDetails?.plotArea) return `${property.plotDetails.plotArea} ${property.plotDetails.unit || 'sq.yrd.'} Plot Area`;
    return 'Contact for exact area/price details';
  };
  // Derive locality review variables using real state
  const avgLocalityRating = localityStats?.aggregate || property?.avgRating || 0;
  const totalLocalityReviews = localityStats?.totalReviews || property?.totalReviews || 0;

  const getStarPercentage = (star) => {
    if (localityStats?.starBreakdown && totalLocalityReviews > 0) {
      return (localityStats.starBreakdown[star] / totalLocalityReviews) * 100;
    }
    // Fallback if no real breakdown is present
    const weights = { 5: 65, 4: 20, 3: 10, 2: 3, 1: 2 };
    return weights[star] || 0;
  };

  const featureRatings = [
    { title: 'Connectivity', val: localityStats?.connectivity ? `${localityStats.connectivity.toFixed(1)}/5` : (localityStats?.ratingsByFeature?.connectivity ? `${localityStats.ratingsByFeature.connectivity.toFixed(1)}/5` : '0/5'), percent: localityStats?.connectivity ? Math.round(localityStats.connectivity * 20) : (localityStats?.ratingsByFeature?.connectivity ? Math.round(localityStats.ratingsByFeature.connectivity * 20) : 0) },
    { title: 'Lifestyle', val: localityStats?.lifestyle ? `${localityStats.lifestyle.toFixed(1)}/5` : (localityStats?.ratingsByFeature?.lifestyle ? `${localityStats.ratingsByFeature.lifestyle.toFixed(1)}/5` : '0/5'), percent: localityStats?.lifestyle ? Math.round(localityStats.lifestyle * 20) : (localityStats?.ratingsByFeature?.lifestyle ? Math.round(localityStats.ratingsByFeature.lifestyle * 20) : 0) },
    { title: 'Safety', val: localityStats?.safety ? `${localityStats.safety.toFixed(1)}/5` : (localityStats?.ratingsByFeature?.safety ? `${localityStats.ratingsByFeature.safety.toFixed(1)}/5` : '0/5'), percent: localityStats?.safety ? Math.round(localityStats.safety * 20) : (localityStats?.ratingsByFeature?.safety ? Math.round(localityStats.ratingsByFeature.safety * 20) : 0) },
    { title: 'Environment', val: localityStats?.environment ? `${localityStats.environment.toFixed(1)}/5` : (localityStats?.ratingsByFeature?.environment ? `${localityStats.ratingsByFeature.environment.toFixed(1)}/5` : '0/5'), percent: localityStats?.environment ? Math.round(localityStats.environment * 20) : (localityStats?.ratingsByFeature?.environment ? Math.round(localityStats.ratingsByFeature.environment * 20) : 0) }
  ];

  const localityPositives = property?.dynamicData?.positives || localityStats?.positives || [];
  const localityNegatives = property?.dynamicData?.negatives || localityStats?.negatives || [];

  const localityReviewsList = (localityReviewsData && localityReviewsData.length > 0) ? localityReviewsData : [];

  const fallbackSimilarProperties = [];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-40">
      {/* 1. HERO Image Slider Section */}
      <section className="relative h-[60vh] w-full bg-slate-900 overflow-hidden">
        <img
          src={pImages[currentImgIndex]}
          alt={property?.propertyName || "Project"}
          className="w-full h-full object-cover transition-opacity duration-500"
        />

        {/* Top Header bar with Search */}
        <div className="absolute top-0 left-0 right-0 p-4 md:p-6 bg-gradient-to-b from-black/50 to-transparent flex items-center justify-between z-20 gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 md:p-3 bg-white text-slate-900 rounded-full transition-all shadow-md shrink-0"
          >
            <ArrowLeft className="w-5 h-5 md:w-6 md:h-6" />
          </button>

          <div className="flex-1 hidden sm:flex items-center bg-white rounded-full px-4 py-2 md:py-3 shadow-md gap-2">
            <Search className="w-4 h-4 text-slate-400" />
            <input type="text" disabled placeholder="Search City/Locality/Project" className="bg-transparent border-none outline-none w-full text-sm text-slate-500" />
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={handleSaveToggle}
              className={`p-2 md:p-3 bg-white rounded-full transition-all shadow-md ${isSaved ? 'text-rose-500' : 'text-slate-700'
                }`}
            >
              <Heart className={`w-5 h-5 md:w-6 md:h-6 ${isSaved ? 'fill-current' : ''}`} />
            </button>
            <button
              onClick={handleShare}
              className="p-2 md:p-3 bg-white text-slate-700 rounded-full transition-all shadow-md"
            >
              <Share2 className="w-5 h-5 md:w-6 md:h-6" />
            </button>
          </div>
        </div>

        {/* Manual Controls & Indicator */}
        <div className="absolute top-1/2 -translate-y-1/2 left-4 right-4 flex justify-between z-20 pointer-events-none">
          <button onClick={() => setCurrentImgIndex(prev => (prev === 0 ? pImages.length - 1 : prev - 1))} className="p-1.5 bg-black/20 hover:bg-black/40 backdrop-blur-md rounded-full text-white pointer-events-auto transition-all">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button onClick={() => setCurrentImgIndex(prev => (prev + 1) % pImages.length)} className="p-1.5 bg-black/20 hover:bg-black/40 backdrop-blur-md rounded-full text-white pointer-events-auto transition-all">
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>

        <div className="absolute bottom-28 md:bottom-32 left-1/2 -translate-x-1/2 flex items-center justify-center space-x-1.5 z-20 bg-black/30 backdrop-blur-sm px-3 py-1 rounded-full">
          {pImages.slice(0, 4).map((_, idx) => (
            <div key={idx} className={`h-1.5 rounded-full ${idx === (currentImgIndex % 4) ? 'w-1.5 bg-white' : 'w-1.5 bg-white/50'}`} />
          ))}
          <span className="text-white text-[10px] font-semibold ml-2">{currentImgIndex + 1}/{pImages.length}</span>
        </div>

        {/* Thumbnail Tagged Preview Row (Matches Image 3) */}
        {pImages.length > 0 && (
          <div ref={thumbnailContainerRef} className="absolute bottom-6 left-0 right-0 px-4 flex gap-2.5 overflow-x-auto hide-scrollbar z-20 scroll-smooth">
            {pImages.map((imgUrl, idx) => {
              const tagsObj = property?.propertyImages_tags || property?.dynamicData?.propertyImages_tags || property?.imageTags || {};
              let tagLabel = tagsObj[idx] || tagsObj[String(idx)];
              if (!tagLabel) {
                if (idx === 0) tagLabel = "Elevation";
                else if (idx === 1) tagLabel = "Hall";
                else if (idx === 2) tagLabel = "Kitchen";
                else if (idx === 3) tagLabel = "Bedroom";
                else if (idx === 4) tagLabel = "Balcony";
                else if (idx === 5) tagLabel = "Bathroom";
                else tagLabel = `Photo ${idx + 1}`;
              }
              const isSelected = currentImgIndex === idx;

              return (
                <div
                  key={idx}
                  onClick={() => setCurrentImgIndex(idx)}
                  className={`relative flex-shrink-0 w-24 h-16 rounded-xl overflow-hidden cursor-pointer border-2 transition-all duration-300 shadow-lg group ${
                    isSelected
                      ? 'border-blue-500 ring-4 ring-blue-500/50 scale-105 opacity-100 z-10'
                      : 'border-white/40 hover:border-white opacity-70 hover:opacity-100'
                  }`}
                >
                  <img src={imgUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" alt={tagLabel} />
                  <div className={`absolute inset-0 bg-gradient-to-t ${isSelected ? 'from-blue-900/90 via-black/30' : 'from-black/80 via-black/20'} to-transparent`} />
                  
                  <div className="absolute bottom-1 left-1 right-1 text-center">
                    <span className={`text-[10px] font-extrabold leading-none drop-shadow-md truncate block ${isSelected ? 'text-white font-black' : 'text-slate-200'}`}>
                      {tagLabel}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Blur gradient cover to anchor the white card */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent z-10 pointer-events-none"></div>
      </section>

      {/* The Rounded Overlay White Sheet */}
      <div className="bg-white rounded-t-[32px] md:rounded-t-[40px] relative -mt-6 z-30 pt-6 pb-2 w-full border-t border-slate-100 shadow-[0_-8px_30px_rgba(0,0,0,0.12)]">
        <div className="max-w-7xl mx-auto px-5 md:px-8">

          {/* Header Area (99acres style) */}
          <div className="flex items-start gap-4">
            {builderTrackRecord.logo && (
              <img src={builderTrackRecord.logo} alt="Builder Logo" className="w-14 h-14 md:w-16 md:h-16 rounded-full border border-slate-200 object-cover p-1 shadow-sm" />
            )}
            <div className="flex-1 flex flex-col items-start">
              <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 leading-tight">
                {property?.propertyName}
              </h1>
              <p className="text-slate-500 font-medium text-sm mt-0.5">
                {[property?.address?.locality, property?.address?.city].filter(Boolean).join(', ')}
              </p>
              {property?.isLive && (
                <div className="flex items-center gap-1 text-[11px] font-medium text-slate-500 mt-1">
                  <CheckCircle2 className="w-3 h-3 text-slate-400" /> <span className="underline underline-offset-2">RERA</span>
                </div>
              )}
            </div>
          </div>

          <hr className="border-slate-100 my-4" />

          {/* Possession & Updates Area */}
          <div className="flex flex-col">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-start gap-2">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-700 mt-0.5"><path d="m15 12-8.5 8.5c-.83.83-2.17.83-3 0 0 0 0 0 0 0a2.12 2.12 0 0 1 0-3L12 9"/><path d="M17.64 15 22 10.64"/><path d="m20.91 11.7-1.25-1.25c-.6-.6-.93-1.4-.93-2.25v-.86L16 4.6V3.86a3.18 3.18 0 0 0-.93-2.25L13.82.36"/><path d="m7 15-5.5 5.5"/></svg>
                <div className="flex flex-col">
                  {(() => {
                    const statusStr = String(builderDetails.possessionStatus || property?.dynamicData?.projectStatus || property?.status || 'Under Construction');
                    const isReady = statusStr.toLowerCase().includes('ready');
                    
                    if (isReady) {
                      return <span className="text-slate-900 font-bold text-xs md:text-sm">Ready to Move</span>;
                    }
                    
                    const pDate = property?.dynamicData?.possessionDate || property?.dynamicData?.possessionYear || builderDetails?.possessionDate || 'Contact for date';
                    return (
                      <>
                        <span className="text-slate-900 font-bold text-xs md:text-sm">{statusStr}</span>
                        {!isReady && <span className="text-slate-500 font-medium text-[11px] md:text-xs mt-0.5">Completion in {pDate}</span>}
                      </>
                    );
                  })()}
                </div>
              </div>
              <button
                onClick={() => setShowUpdates(!showUpdates)}
                className="flex items-center gap-1.5 text-xs text-slate-600 font-medium ml-auto p-1 hover:bg-slate-50 rounded"
              >
                <span className={`w-2 h-2 rounded-full ${String(builderDetails.possessionStatus || property?.dynamicData?.projectStatus).toLowerCase().includes('ready') ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                Updates {showUpdates ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </button>
            </div>

            {/* Updates Expandable Content */}
            {showUpdates && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-4 p-4 border border-slate-200 rounded-2xl bg-slate-50 overflow-hidden"
              >
                <h3 className="text-sm font-bold text-slate-900 mb-3">Project Phases & Status</h3>
                <div className="flex flex-col gap-3">
                  {towersList && towersList.length > 0 ? (
                    towersList.map((tower, idx) => (
                      <div key={idx} className={`flex items-start gap-3 ${idx > 0 ? 'pt-3 border-t border-slate-200/60' : ''}`}>
                        <div className="w-20 h-16 shrink-0 rounded-lg overflow-hidden bg-slate-200 relative">
                          <img src={pImages[idx % pImages.length] || pImages[0]} alt={tower.name || tower.towerName || 'Phase'} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/20"></div>
                          <div className="absolute bottom-1 left-1 text-[8px] font-bold text-white uppercase">{tower.phase || `Phase ${idx + 1}`}</div>
                        </div>
                        <div className="flex-1">
                          <h4 className="text-xs font-bold text-slate-800">{tower.name || tower.towerName || `Phase ${idx + 1}`} ({tower.configurations || 'Units'})</h4>
                          <p className="text-[11px] text-slate-500 mt-1">
                            Completion: {tower.completionDate ? (isNaN(Date.parse(tower.completionDate)) ? tower.completionDate : new Date(tower.completionDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })) : (property?.dynamicData?.possessionDate || 'Contact for date')}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="flex items-start gap-3">
                      <div className="w-20 h-16 shrink-0 rounded-lg overflow-hidden bg-slate-200 relative">
                        <img src={pImages[0]} alt="Construction Status" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/20"></div>
                        <div className="absolute bottom-1 left-1 text-[8px] font-bold text-white uppercase">Status</div>
                      </div>
                      <div className="flex-1">
                        <h4 className="text-xs font-bold text-slate-800">{String(builderDetails.possessionStatus || property?.dynamicData?.projectStatus || property?.status || 'Under Construction')}</h4>
                        <p className="text-[11px] text-slate-500 mt-1">Completion: {property?.dynamicData?.possessionDate || property?.dynamicData?.possessionYear || 'Contact for date'}</p>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </div>

          <hr className="border-slate-100 my-4" />

          {/* Price & Map Row */}
          <div className="flex items-center border border-slate-200 rounded-3xl mb-2 py-4 shadow-sm bg-white overflow-hidden">
            <div className="w-1/2 flex flex-col items-center justify-center border-r border-slate-200 hover:bg-slate-50 transition-colors">
              <span className="text-base md:text-lg font-bold text-slate-900">
                {dispPriceStr}
              </span>
              <span className="text-[11px] md:text-xs text-slate-500 mt-1">{getCarpetOrPriceString()}</span>
            </div>
            <button
              onClick={() => {
                const query = encodeURIComponent([property?.propertyName, property?.address?.locality, property?.address?.city].filter(Boolean).join(', '));
                window.open(`https://maps.google.com/?q=${query}`, '_blank');
              }}
              className="w-1/2 flex flex-col items-center justify-center hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-1.5 text-sm md:text-base font-bold text-slate-900">
                <MapPin className="w-4 h-4 text-blue-600 fill-blue-600" /> Map
              </div>
              <span className="text-[11px] md:text-xs text-slate-500 mt-1">View Location</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Tabbed Sticky Navigation (Matches second image) */}
      <div className="sticky top-0 bg-white z-40 shadow-[0_4px_12px_rgba(0,0,0,0.03)] border-b border-slate-100 mt-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex w-full">
            <button
              onClick={() => setActiveTab('overview')}
              className={`w-1/2 flex flex-col items-center justify-center py-3 relative transition-colors ${activeTab === 'overview' ? 'text-slate-900' : 'text-slate-400 hover:text-slate-600'
                }`}
            >
              <div className="flex justify-center mb-1"><Grid className="w-5 h-5" /></div>
              <span className="text-sm font-bold">Overview</span>
              {activeTab === 'overview' && (
                <motion.div layoutId="main-tab-line" className="absolute bottom-0 left-0 right-0 h-[3px] bg-blue-500 rounded-t-md" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('properties')}
              className={`w-1/2 flex flex-col items-center justify-center py-3 relative transition-colors ${activeTab === 'properties' ? 'text-slate-900' : 'text-slate-400 hover:text-slate-600'
                }`}
            >
              <div className="flex justify-center mb-1"><Home className="w-5 h-5" /></div>
              <span className="text-sm font-bold">Properties</span>
              {activeTab === 'properties' && (
                <motion.div layoutId="main-tab-line" className="absolute bottom-0 left-0 right-0 h-[3px] bg-blue-500 rounded-t-md" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="max-w-7xl mx-auto sm:px-6 lg:px-8 mt-4 sm:mt-8">
        {activeTab === 'overview' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column (Main Scroll) */}
            <div className="lg:col-span-2 space-y-6">

              {/* Section 1: Overview & Highlights */}
              <div ref={sectionRefs['overview-sec']} className="bg-white/40 border-y sm:border border-slate-200 sm:rounded-2xl p-5 sm:p-8 space-y-6">
                
                {/* Official Project Brochure Card */}
                {projectBrochureUrl && (
                  <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-2xl p-4 flex items-center justify-between shadow-md">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                        <FileText size={20} className="text-white" />
                      </div>
                      <div>
                        <h4 className="font-bold text-sm">Official Project Brochure</h4>
                        <p className="text-[11px] text-white/80">Floor plans, price sheets & specifications PDF</p>
                      </div>
                    </div>
                    <button
                      onClick={handleBrochureDownload}
                      className="px-4 py-2 bg-white text-blue-700 hover:bg-blue-50 font-bold text-xs rounded-xl shadow transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer"
                    >
                      <Download size={14} /> Download PDF
                    </button>
                  </div>
                )}

                <div>
                  <h2 className="text-lg md:text-xl font-bold text-slate-900 flex items-center gap-2">
                    <Building className="w-5 h-5 text-blue-500" /> Project Architectural Highlights
                  </h2>
                  <p className="text-slate-500 text-sm mt-1">High-end specifications curated by Get-Right-home analysts</p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="bg-slate-100/40 p-4 rounded-xl border border-slate-300/50">
                    <span className="text-xs text-slate-500 block font-medium">Density Configuration</span>
                    <span className="text-base font-bold text-slate-900 mt-1 block">{densityType}</span>
                    <span className="text-[10px] text-blue-500 mt-0.5 block">{projectDensity}</span>
                  </div>
                  <div className="bg-slate-100/40 p-4 rounded-xl border border-slate-300/50">
                    <span className="text-xs text-slate-500 block font-medium">Total Area Spread</span>
                    <span className="text-base font-bold text-slate-900 mt-1 block">
                      {totalArea ? `${totalArea} ${totalAreaUnit}` : 'N/A'}
                    </span>
                    <span className="text-[10px] text-blue-500 mt-0.5 block">{openAreaPercentage > 0 ? `${openAreaPercentage}% Land Open & Green` : 'Green Layout'}</span>
                  </div>
                  <div className="bg-slate-100/40 p-4 rounded-xl border border-slate-300/50">
                    <span className="text-xs text-slate-500 block font-medium">Towers & Height</span>
                    <span className="text-base font-bold text-slate-900 mt-1 block">{(totalTowers || towersList?.length || 0)} Structural Towers</span>
                    <span className="text-[10px] text-blue-500 mt-0.5 block">{towersList[0]?.floors ? `Avg ${towersList[0].floors} Floors / Tower` : 'Multi-story Blocks'}</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-base font-bold text-slate-800">Why you should consider {property?.propertyName || 'this project'}</h3>
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {propertyHighlights.slice(0, 4).map((hl, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm text-slate-700">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                        <span>{hl}</span>
                      </li>
                    ))}
                  </ul>
                  {propertyHighlights.length > 4 && (
                    <button
                      onClick={() => setShowAllHighlights(true)}
                      className="text-blue-500 hover:text-blue-500 text-xs font-bold flex items-center gap-1 pt-2 transition-all"
                    >
                      View all {propertyHighlights.length} highlights <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Description Text */}
                <div className="pt-4 border-t border-slate-200/80 space-y-3">
                  <h3 className="text-base font-bold text-slate-800">Detailed Project Description</h3>
                  <p className="text-slate-700 text-sm leading-relaxed">
                    {property?.description || "No detailed description provided for this project."}
                  </p>
                  {property?.dynamicCategory && (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 rounded-full text-xs text-purple-300">
                      <Tag className="w-3.5 h-3.5" />
                      <span>Categorized Premium Project</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Section 1.5: Top Facilities (Amenities) */}
              {/* Section 1.5: Top Facilities (Amenities) - Image 2 Style */}
              {(property?.amenities?.length > 0 || propertyHighlights.length > 0) && (
                <div className="bg-white rounded-3xl p-6 md:p-8 space-y-5 shadow-sm border border-slate-100">
                  <div>
                    <h2 className="text-lg md:text-xl font-bold text-slate-900">Amenities</h2>
                    <p className="text-slate-500 text-sm mt-1">
                      {showFullAmenitiesDesc ? (
                        <>
                          {property?.description || `${property?.propertyName || 'This project'} presents an exclusive opportunity to own a stunning home that offers all kinds of amenities and facilities. This includes a swimming pool, gymnasium, and a clubhouse. It has an excellent combination of comfort and convenience to suit every requirement as well as need.`}
                          <span onClick={() => setShowFullAmenitiesDesc(false)} className="font-semibold text-slate-700 underline cursor-pointer ml-1">less</span>
                        </>
                      ) : (
                        <>
                          {property?.propertyName || 'This project'} presents an exclusive opportunity to own a stunning home that offers all kinds of...
                          <span onClick={() => setShowFullAmenitiesDesc(true)} className="font-semibold text-slate-700 underline cursor-pointer ml-1">more</span>
                        </>
                      )}
                    </p>
                  </div>

                  <div className="relative h-56 w-full rounded-2xl overflow-hidden shadow-sm">
                    <img src={pImages[1] || pImages[0]} className="w-full h-full object-cover brightness-[0.8]" alt="Amenity view" />
                    <div className="absolute bottom-4 left-4 text-white">
                      <h4 className="font-bold text-xl">{property?.amenities?.[0] || 'Gymnasium'}</h4>
                      <p className="text-xs text-white/90">Premium Facility</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-y-5 gap-x-2 pt-2">
                    {(property?.amenities?.length > 0 ? property.amenities : propertyHighlights).slice(0, 4).map((amenity, idx) => {
                      let Icon = CheckCircle2;
                      const name = amenity.toLowerCase();
                      if (name.includes('pool') || name.includes('water')) Icon = Droplets;
                      else if (name.includes('garden') || name.includes('park') || name.includes('green') || name.includes('gazebo')) Icon = Leaf;
                      else if (name.includes('gym') || name.includes('fitness') || name.includes('sports')) Icon = Dumbbell;
                      else if (name.includes('security') || name.includes('cctv')) Icon = Shield;
                      else if (name.includes('club')) Icon = Home;

                      return (
                        <div key={idx} className="flex items-center gap-3">
                          <Icon className="w-5 h-5 text-slate-700 flex-shrink-0" />
                          <span className="text-sm text-slate-800 truncate">{amenity}</span>
                        </div>
                      )
                    })}
                  </div>

                  <div className="space-y-3 pt-4">
                    <button onClick={() => setShowAllAmenities(true)} className="w-full py-3 rounded-full border border-slate-200 text-sm font-bold text-blue-600 flex items-center justify-center gap-1 hover:bg-slate-50 transition-colors">
                      View all {property?.amenities?.length || 11} amenities <ChevronRight className="w-4 h-4" />
                    </button>
                    {projectBrochureUrl ? (
                      <button onClick={handleBrochureDownload} className="w-full py-3 rounded-full border border-blue-200 bg-blue-50 text-blue-700 text-sm font-bold flex items-center justify-center gap-1.5 hover:bg-blue-100 transition-colors cursor-pointer">
                        <Download className="w-4 h-4" /> Download Official Brochure
                      </button>
                    ) : (
                      <button onClick={() => toast.error("Brochure not uploaded for this project")} className="w-full py-3 rounded-full border border-slate-200 bg-slate-50 text-slate-400 text-sm font-bold flex items-center justify-center gap-1.5 cursor-not-allowed">
                        <Download className="w-4 h-4" /> Brochure Unavailable
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Section 2: Available Configs & Floor Plans */}
              <div className="bg-white/40 border-y sm:border border-slate-200 sm:rounded-2xl p-5 sm:p-8 space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg md:text-xl font-bold text-slate-900 flex items-center gap-2">
                      <LayoutTemplate className="w-6 h-6 text-blue-500" /> Floor Plans & Configurations
                    </h2>
                    <p className="text-slate-500 text-sm mt-1">Configure layout preferences and review room sizing</p>
                  </div>
                  <div className="bg-slate-100/80 p-0.5 rounded-full border border-slate-300 flex">
                    <button
                      onClick={() => setSqftUnit(true)}
                      className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${sqftUnit ? 'bg-blue-600 text-white shadow' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                      Sq. Ft.
                    </button>
                    <button
                      onClick={() => setSqftUnit(false)}
                      className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${!sqftUnit ? 'bg-blue-600 text-white shadow' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                      Sq. M.
                    </button>
                  </div>
                </div>

                {isApartmentOrVilla && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {floorPlansList.map((plan, i) => (
                      <div key={i} className="bg-slate-100/40 border border-slate-300/50 rounded-2xl overflow-hidden hover:border-blue-500/50 transition-all flex flex-col justify-between">
                        <div className="p-5 space-y-4">
                          <div className="flex justify-between items-start gap-2">
                            <div>
                              <span className="px-2 py-0.5 bg-blue-900/40 text-purple-300 border border-blue-800/40 text-[10px] font-bold uppercase rounded tracking-wider">
                                {plan.planType || plan.type || (property?.propertyType ? `${property.propertyType.toUpperCase()} PLAN` : 'FLOOR PLAN')}
                              </span>
                              <h4 className="text-lg font-bold text-slate-900 mt-1 uppercase">
                                {plan.configName || plan.configType || plan.configuration || plan.name || plan.title || 'Standard Layout'}
                              </h4>
                            </div>
                            <span className={`text-xs font-semibold px-2 py-1 rounded border shrink-0 ${
                              String(plan.possessionStatus || '').toLowerCase().includes('ready')
                                ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                                : 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                            }`}>
                              {plan.possessionStatus || (plan.possessionDate ? `Possession: ${plan.possessionDate}` : (builderDetails?.possessionYear ? `Possession: ${builderDetails.possessionYear}` : 'Contact for Date'))}
                            </span>
                          </div>

                          <div className="grid grid-cols-3 gap-2 text-xs">
                            <div>
                              <span className="text-slate-500 block font-medium">Carpet Area</span>
                              <span className="text-sm font-bold text-slate-900">
                                {plan.carpetArea ? (sqftUnit ? `${plan.carpetArea} sqft` : `${(plan.carpetArea * 0.0929).toFixed(1)} sqm`) : 'N/A'}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-500 block font-medium">Super Built-up</span>
                              <span className="text-sm font-bold text-slate-900">
                                {(plan.superArea || plan.superBuiltUpArea) ? (sqftUnit ? `${plan.superArea || plan.superBuiltUpArea} sqft` : `${((plan.superArea || plan.superBuiltUpArea) * 0.0929).toFixed(1)} sqm`) : 'N/A'}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-500 block font-medium">Starting Price</span>
                              <span className="text-sm font-bold text-blue-600">
                                {formatPlanPrice(plan.price)}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="px-5 pb-5 pt-0">
                          <button
                            onClick={() => setSelectedFloorPlan(plan)}
                            className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-xs font-bold text-slate-800 rounded-xl transition-all flex items-center justify-center gap-1.5"
                          >
                            <Maximize2 className="w-3.5 h-3.5 text-blue-500" /> View Layout & Dimensions
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {isPlot && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {plotConfigsList.map((plot, i) => (
                      <div key={i} className="bg-slate-100/40 border border-slate-300/50 rounded-2xl overflow-hidden hover:border-blue-500/50 transition-all flex flex-col justify-between">
                        <div className="p-5 space-y-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="px-2 py-0.5 bg-blue-900/40 text-purple-300 border border-blue-800/40 text-[10px] font-bold uppercase rounded tracking-wider">
                                PLOT LAYOUT
                              </span>
                              <h4 className="text-lg font-bold text-slate-900 mt-1">{plot.name}</h4>
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-2 text-xs">
                            <div>
                              <span className="text-slate-500 block font-medium">Plot Area</span>
                              <span className="text-sm font-bold text-slate-900">{plot.totalArea} sqyd</span>
                            </div>
                            <div>
                              <span className="text-slate-500 block font-medium">Dimensions</span>
                              <span className="text-sm font-bold text-slate-900">{plot.dimensions}</span>
                            </div>
                            <div>
                              <span className="text-slate-500 block font-medium">Facing</span>
                              <span className="text-sm font-bold text-slate-900">{plot.facing}</span>
                            </div>
                          </div>
                        </div>

                        <div className="px-5 pb-5">
                          <button
                            onClick={() => setSelectedFloorPlan({ configType: plot.name, carpetArea: plot.totalArea, price: plot.price, isPlot: true, facing: plot.facing, dimensions: plot.dimensions, boundaryWall: plot.boundaryWall })}
                            className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-xs font-bold text-slate-800 rounded-xl transition-all flex items-center justify-center gap-1.5"
                          >
                            <Maximize2 className="w-3.5 h-3.5 text-blue-500" /> View Layout & Details
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Milestone Payment Plan Widget */}
              {paymentPlansList && paymentPlansList.length > 0 && (
                <div className="bg-white/40 border-y sm:border border-slate-200 sm:rounded-2xl p-5 sm:p-8 space-y-6">
                  <div>
                    <h2 className="text-lg md:text-xl font-bold text-slate-900 flex items-center gap-2">
                      <FileText className="w-6 h-6 text-blue-500" /> Premium Payment Plans
                    </h2>
                    <p className="text-slate-500 text-sm mt-1">Review milestone schedules and subvention terms</p>
                  </div>

                  <div className="space-y-4">
                    {paymentPlansList.map((plan, i) => {
                      const docUrl = getPaymentPlanDocUrl(plan);
                      const hasMilestones = plan.milestones && plan.milestones.length > 0;

                      return (
                        <div key={i} className="bg-slate-100/30 border border-slate-200/80 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div>
                            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                              <Award className="w-4 h-4 text-blue-500" /> {plan.planName || plan.name || plan.title || 'Custom Payment Plan'}
                            </h4>
                            <p className="text-xs text-slate-500 mt-1">
                              {hasMilestones ? `Divided into ${plan.milestones.length} construction milestones` : (docUrl ? 'Payment schedule document uploaded' : 'Custom payment schedule available')}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            {docUrl && (
                              <a
                                href={docUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="py-2 px-4 bg-slate-200 hover:bg-slate-300 text-xs font-bold text-slate-800 rounded-xl transition-all flex items-center gap-1.5"
                              >
                                <FileText className="w-3.5 h-3.5 text-blue-600" /> View Document / Image
                              </a>
                            )}
                            <button
                              onClick={() => setSelectedPaymentPlan({ ...plan, docUrl })}
                              className="py-2 px-4 bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/20 text-xs font-bold text-blue-500 rounded-xl transition-all"
                            >
                              {hasMilestones ? 'View Milestone Percentages' : 'View Plan Details'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Section 3: Specifications, Towers, Construction */}
              <div ref={sectionRefs['specs-sec']} className="bg-white/40 border-y sm:border border-slate-200 sm:rounded-2xl p-5 sm:p-8 space-y-6">
                <div>
                  <h2 className="text-lg md:text-xl font-bold text-slate-900 flex items-center gap-2">
                    <Layers className="w-6 h-6 text-blue-500" /> Towers, Layout & Structural Details
                  </h2>
                  <p className="text-slate-500 text-sm mt-1">Detailed block phases, structural floor counts, and specifications</p>
                </div>

                {isApartmentOrVilla && (
                  <div className="space-y-6">
                    {towersList && towersList.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {towersList.map((tower, idx) => (
                          <div key={idx} className="bg-slate-100/30 border border-slate-200 rounded-xl p-4 space-y-2">
                            <h4 className="text-sm font-bold text-slate-900 flex items-center justify-between">
                              <span>{tower.towerName || tower.name || `Tower ${idx + 1}`}</span>
                              {tower.phase && (
                                <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 font-bold rounded uppercase tracking-wider">{tower.phase}</span>
                              )}
                            </h4>
                            <div className="text-[11px] text-slate-500 space-y-1">
                              {tower.configurations && <p>Configurations: <span className="font-semibold text-slate-700">{tower.configurations}</span></p>}
                              {tower.floors && <p>Total Floors: <span className="font-semibold text-slate-700">{tower.floors} Levels</span></p>}
                              {tower.completionDate && <p>Completion Date: <span className="font-semibold text-slate-700">{isNaN(Date.parse(tower.completionDate)) ? tower.completionDate : new Date(tower.completionDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span></p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs text-slate-500">
                        Tower layout & block-wise distribution details available upon project site visit.
                      </div>
                    )}

                    <div className="bg-slate-100/40 border border-slate-300/50 p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div className="space-y-2">
                        <h4 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
                          <CheckCircle2 className="w-5 h-5 text-emerald-400" /> Structural Safety & Construction Specifications
                        </h4>
                        <p className="text-xs text-slate-500 max-w-lg">
                          Built with earthquake-resistant RCC frame structure and premium materials.
                        </p>
                      </div>
                      <button
                        onClick={() => setShowInteriorsModal(true)}
                        className="py-3 px-6 bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-blue-600/20"
                      >
                        <Shield className="w-4 h-4" /> View Technical Materials Spec-Sheet
                      </button>
                    </div>
                  </div>
                )}

                {isPlot && (
                  <div className="space-y-6">
                    <h3 className="text-base font-bold text-slate-800">Layout Infrastructure Specifications</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center justify-between p-3 bg-slate-100/30 border border-slate-200 rounded-lg">
                        <span className="text-slate-500">Road Width</span>
                        <span className="font-bold text-slate-900">{plotInfrastructure.roadWidth} Ft. Wide Roads</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-slate-100/30 border border-slate-200 rounded-lg">
                        <span className="text-slate-500">Gated Boundary Wall</span>
                        <span className="font-bold text-slate-900">{plotInfrastructure.gatedStatus ? 'Constructed Gated' : 'Open Plotting'}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-slate-100/30 border border-slate-200 rounded-lg">
                        <span className="text-slate-500">Water Supply</span>
                        <span className="font-bold text-slate-900">{plotInfrastructure.waterLine}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-slate-100/30 border border-slate-200 rounded-lg">
                        <span className="text-slate-500">Electricity Lines</span>
                        <span className="font-bold text-slate-900">{plotInfrastructure.electricityConnection}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Locality Amenities Section with Lead-Gen photos card */}
              <div className="bg-white sm:rounded-2xl p-5 sm:p-8 space-y-6 shadow-sm border-y sm:border border-slate-100">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0 pr-2">
                    <h2 className="text-[17px] md:text-xl font-bold text-slate-900 truncate">
                      Premium Curated Amenities
                    </h2>
                    <p className="text-[11px] md:text-sm text-slate-500 mt-0.5 truncate">Premium facilities, rare options, and high-end services</p>
                  </div>
                  <button
                    onClick={() => setShowAllAmenities(true)}
                    className="text-blue-600 hover:text-purple-700 text-[12px] md:text-xs font-bold transition-all shrink-0 mt-1 md:mt-0"
                  >
                    View All
                  </button>
                </div>

                {/* Lead-gen card - Light Theme */}
                {!amenityRequestSuccess ? (
                  <div className="bg-gradient-to-r from-blue-50 to-blue-50 border border-blue-100 p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h4 className="text-base font-bold text-slate-900">Need actual photos of clubhouse & amenities?</h4>
                      <p className="text-sm text-slate-600 mt-1">Our on-site advisors can message you latest site images directly.</p>
                    </div>
                    <button
                      onClick={() => {
                        setAmenityRequestSuccess(true);
                        toast.success("Request submitted! We will send photos on WhatsApp shortly.");
                      }}
                      className="py-3 px-5 bg-blue-600 hover:bg-blue-700 text-sm font-bold text-white rounded-xl transition-all shadow-md shadow-blue-600/20"
                    >
                      Request Photos via WhatsApp
                    </button>
                  </div>
                ) : (
                  <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl text-center text-sm text-emerald-700 font-semibold">
                    ✓ Request submitted. An advisor will contact you with latest photos shortly.
                  </div>
                )}

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {(property?.amenities?.length > 0 ? property.amenities.slice(0, 8) : ["Clubhouse", "Swimming Pool", "Biometric Lobby", "EV Charging Station", "Jogging Track", "24/7 Security", "Central Park", "Mini Theatre"]).map((am, i) => (
                    <div key={i} className="p-3 bg-white border border-slate-200 rounded-xl flex items-center gap-2.5 text-xs text-slate-800 shadow-sm hover:border-blue-200 transition-colors">
                      <div className="p-1.5 bg-blue-100 text-blue-600 rounded-lg">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                      <span className="font-medium truncate">{am}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Section 4: Location, What Locals Said, Pros & Cons */}
              <div ref={sectionRefs['locality-sec']} className="bg-white/40 border-y sm:border border-slate-200 sm:rounded-2xl p-5 sm:p-8 space-y-6">
                <div>
                  <h2 className="text-lg md:text-xl font-bold text-slate-900 flex items-center gap-2">
                    <MapPin className="w-6 h-6 text-blue-500" /> Locality Insights & Real Reviews
                  </h2>
                  <p className="text-slate-500 text-sm mt-1">What resident locals and safety maps tell about this sector</p>
                </div>

                {/* Map Preview Mock */}
                <div className="relative h-48 w-full rounded-2xl overflow-hidden border border-slate-200 bg-white">
                  <div className="absolute inset-0 opacity-40 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:16px_16px]"></div>
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center space-y-2">
                    <div className="p-3 bg-blue-600 text-white rounded-full animate-bounce shadow-lg shadow-blue-600/30">
                      <MapPin className="w-6 h-6" />
                    </div>
                    <p className="text-xs font-bold text-slate-800 mt-2">{property?.address?.locality}, {property?.address?.city}</p>
                    <p className="text-[10px] text-slate-500">Interactive geo-map features loaded upon request</p>
                  </div>
                </div>

                {/* What Locals Said Cards Slider */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-blue-500">Locality Sentiments Insights</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {localSentiments.slice(0, 2).map((item, idx) => (
                      <div key={idx} className="bg-slate-100/30 border border-slate-200 p-4 rounded-xl space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-slate-800">{item.label}</span>
                          <span className="text-sm font-extrabold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">{item.value} positive</span>
                        </div>
                        <p className="text-xs text-slate-500">{item.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Pros and cons list widget */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-200/60">
                  <div className="space-y-3">
                    <h4 className="text-sm font-bold text-emerald-400 flex items-center gap-1.5">
                      <ThumbsUp className="w-4 h-4" /> Locality Positives (Pros)
                    </h4>
                    <ul className="space-y-2 text-xs text-slate-700">
                      {localityPros.slice(0, 3).map((pro, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <Check className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                          <span>{pro}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="space-y-3">
                    <h4 className="text-sm font-bold text-amber-500 flex items-center gap-1.5">
                      <ThumbsDown className="w-4 h-4" /> Areas of Caution (Cons)
                    </h4>
                    <ul className="space-y-2 text-xs text-slate-700">
                      {localityCons.slice(0, 2).map((con, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <Minus className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                          <span>{con}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="text-center pt-2">
                  <button
                    onClick={() => setShowProsConsModal(true)}
                    className="text-xs font-bold text-blue-500 hover:text-blue-500 transition-colors"
                  >
                    View detailed pros & cons analysis page
                  </button>
                </div>
              </div>



              {/* Section 5: Builder Profile & Details */}
              {(() => {
                const targetBuilderId = resolvedBuilderId;

                const handleBuilderNavigate = (tab) => {
                  if (targetBuilderId) {
                    navigate(`/builder/${targetBuilderId}${tab ? `?tab=${tab}` : ''}`);
                  } else {
                    toast.error('Detailed builder profile is not available for this project.');
                  }
                };

                return (
                  <div ref={sectionRefs['builder-sec']} className="bg-white/40 border border-slate-200 rounded-3xl p-6 md:p-8 space-y-6">
                    <h2 className="text-base md:text-lg md:text-lg md:text-xl font-bold text-slate-900">About Builder</h2>

                    {/* Builder Info Card */}
                    <div className="border border-slate-200 rounded-3xl p-5 pt-12 flex flex-col items-center gap-4 bg-white shadow-sm relative mt-12 max-w-sm">
                      <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-20 h-20 rounded-full border border-slate-200 bg-white flex items-center justify-center overflow-hidden shadow-sm p-1 z-10">
                        <img
                          src={builderTrackRecord.logo || "https://ui-avatars.com/api/?name=" + (builderTrackRecord.name || 'B') + "&background=random"}
                          alt={builderTrackRecord.name}
                          onError={(e) => { e.target.onerror = null; e.target.src = "https://ui-avatars.com/api/?name=" + (builderTrackRecord.name || 'B') + "&background=random"; }}
                          className="w-full h-full object-contain rounded-full"
                        />
                      </div>
                      <span className="font-bold text-slate-900 text-lg text-center mt-2">{builderTrackRecord.name}</span>

                      <div className="w-full flex flex-col space-y-4 mt-2">
                        <div className="w-full border-b border-slate-100 pb-3 pl-2">
                          <span className="text-slate-900 font-bold text-[15px]">{builderTrackRecord.experience || 0} yrs</span>
                        </div>
                        <div className="w-full border-b border-slate-100 pb-3 pl-2">
                          <span className="text-slate-900 font-bold text-[15px]">{builderTrackRecord.completedCount + builderTrackRecord.ongoingCount} projects*</span>
                        </div>
                        <div className="w-full pb-1 pl-2">
                          <span className="text-slate-900 font-bold text-[15px]">{property?.address?.city ? `Active in ${property.address.city}` : 'Established Developer'}</span>
                        </div>
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-500 max-w-sm mt-2">*Based on residential properties only</p>

                    {/* Track Record Section */}
                    <div className="pt-2">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-lg font-bold text-slate-900">Track Record</h3>
                        <button onClick={() => setShowVerifiedSourcesModal(true)} className="text-xs text-slate-500 hover:text-slate-800 underline underline-offset-2 font-medium">Source</button>
                      </div>
                      <p className="text-sm text-slate-600 leading-relaxed">
                        {builderTrackRecord.summary ? (
                          <>{builderTrackRecord.summary.length > 120 ? builderTrackRecord.summary.substring(0, 120) + '...' : builderTrackRecord.summary}</>
                        ) : (
                          <>{builderTrackRecord.name} is committed to delivering quality residential projects.</>
                        )}
                        <span onClick={() => setShowAboutBuilderModal(true)} className="text-blue-600 cursor-pointer hover:underline ml-1">...more</span>
                      </p>
                    </div>

                    {/* Top Rated Badge */}
                    <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-100 rounded-xl p-4 flex items-center gap-4">
                      <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center shrink-0 shadow-sm border border-amber-200">
                        <Award className="w-7 h-7 text-amber-500" />
                      </div>
                      <div>
                        <p className="text-xs text-slate-600 mb-0.5">Top Rated for</p>
                        <p className="text-sm font-bold text-slate-900">Construction Quality</p>
                        <p className="text-[10px] text-slate-500 mt-1">Based on resident reviews</p>
                      </div>
                    </div>

                    {/* Record List */}
                    <div className="space-y-1">
                      <div onClick={() => handleBuilderNavigate('delivered')} className="flex items-center justify-between p-3 py-4 border-b border-slate-100 cursor-pointer group">
                        <div className="flex items-start gap-4">
                          <Key className="w-5 h-5 text-slate-400 mt-0.5" />
                          <div>
                            <h4 className="text-sm font-bold text-slate-900">Delivered</h4>
                            <p className="text-xs text-slate-500 mt-0.5">{builderTrackRecord.completedCount} projects delivered successfully!</p>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-800 transition-colors" />
                      </div>
                      <div onClick={() => handleBuilderNavigate('delivered')} className="flex items-center justify-between p-3 py-4 border-b border-slate-100 cursor-pointer group">
                        <div className="flex items-start gap-4">
                          <Clock className="w-5 h-5 text-slate-400 mt-0.5" />
                          <div>
                            <h4 className="text-sm font-bold text-slate-900">Recently delivered</h4>
                            <p className="text-xs text-slate-500 mt-0.5">{builderTrackRecord.completedCount > 0 ? `${builderTrackRecord.completedCount} projects completed` : 'Completed projects listed on profile'}</p>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-800 transition-colors" />
                      </div>
                      <div onClick={() => handleBuilderNavigate('ongoing')} className="flex items-center justify-between p-3 py-4 border-b border-slate-100 cursor-pointer group">
                        <div className="flex items-start gap-4">
                          <Building className="w-5 h-5 text-slate-400 mt-0.5" />
                          <div>
                            <h4 className="text-sm font-bold text-slate-900">Ongoing construction</h4>
                            <p className="text-xs text-slate-500 mt-0.5">{builderTrackRecord.ongoingCount} projects under construction</p>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-800 transition-colors" />
                      </div>
                      <div onClick={() => handleBuilderNavigate('insights')} className="flex items-center justify-between p-3 py-4 cursor-pointer group">
                        <div className="flex items-start gap-4">
                          <TrendingUp className="w-5 h-5 text-slate-400 mt-0.5" />
                          <div>
                            <h4 className="text-sm font-bold text-slate-900">Builder Profile</h4>
                            <p className="text-xs text-slate-500 mt-0.5">Click to view complete builder portfolio & ratings</p>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-800 transition-colors" />
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-3 pt-2">
                      <button onClick={() => setShowEnquiryModal(true)} className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 transition-colors">
                        <Phone className="w-4 h-4" /> Call Builder
                      </button>
                      <button onClick={() => handleBuilderNavigate('')} className="flex-1 py-3 bg-white border border-slate-200 text-blue-600 font-bold text-sm rounded-xl flex items-center justify-center gap-1 hover:bg-slate-50 transition-colors">
                        View details <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })()}

              {/* Projects by Builder List */}
              <div className="bg-white sm:rounded-2xl p-5 sm:p-8 space-y-6 shadow-sm border-y sm:border border-slate-100">
                <h2 className="text-base md:text-lg font-bold text-slate-900">Projects by {builderTrackRecord.name}</h2>
                <div className="flex items-center gap-4 border-b border-slate-100 pb-2">
                  {['ongoing', 'upcoming', 'delivered'].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveBuilderProjectsTab(tab)}
                      className={`text-sm font-bold pb-2 border-b-2 transition-colors capitalize ${activeBuilderProjectsTab === tab ? 'text-blue-600 border-blue-600' : 'text-slate-400 border-transparent hover:text-slate-600'}`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                {(() => {
                  const list = (builderProjects || []).filter(item => {
                    if (!item) return false;
                    const status = String(item.builderProjectDetails?.possessionStatus || item.dynamicData?.projectStatus || item.status || '').toLowerCase();
                    if (activeBuilderProjectsTab === 'ongoing') return status.includes('under') || status.includes('ongoing') || (!status.includes('ready') && !status.includes('upcoming') && !status.includes('delivered'));
                    if (activeBuilderProjectsTab === 'upcoming') return status.includes('upcoming') || status.includes('launch') || status.includes('soon');
                    if (activeBuilderProjectsTab === 'delivered') return status.includes('ready') || status.includes('delivered') || status.includes('complete');
                    return true;
                  });

                  if (list.length === 0) {
                    return (
                      <div className="p-6 text-center text-xs text-slate-500 bg-slate-50 border border-slate-100 rounded-xl">
                        No {activeBuilderProjectsTab} projects listed for {builderTrackRecord.name}
                      </div>
                    );
                  }

                  return (
                    <div className="flex items-center gap-4 overflow-x-auto hide-scrollbar pb-2">
                      {list.map((simItem, i) => {
                        const info = {
                          name: simItem.propertyName || simItem.name || simItem.title || 'Project',
                          locality: simItem.address?.locality || simItem.address?.city || '',
                          cover: simItem.coverImage || simItem.images?.cover || simItem.propertyImages?.[0] || simItem.gallery?.[0] || NO_IMAGE_PLACEHOLDER,
                          rawP: simItem.buyDetails?.expectedPrice || simItem.price || simItem.expectedPrice || simItem.startingPrice || simItem.dynamicData?.expectedPrice || simItem.dynamicData?.startingPrice || simItem.dynamicData?.minPrice
                        };
                        const simPrice = info.rawP ? formatPriceLakhCrore(info.rawP) : 'Contact for Price';

                        return (
                          <div key={i} onClick={() => navigate(`/property/${simItem._id}`)} className="bg-white rounded-xl border border-slate-200 p-3 w-[200px] shrink-0 shadow-sm hover:border-blue-300 transition-colors cursor-pointer">
                            <img src={info.cover} className="w-full h-24 object-cover rounded-lg mb-3" alt={info.name} />
                            <h5 className="text-sm font-bold text-gray-800 line-clamp-1">{info.name}</h5>
                            <p className="text-[11px] text-slate-500 font-bold mb-1 line-clamp-1">{info.locality}</p>
                            <p className="text-xs font-bold text-slate-900">{simPrice}</p>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>

              {/* Compare with similar homes list carousel */}
              {similarProperties && similarProperties.length > 0 && (
                <div className="bg-white sm:rounded-2xl p-5 sm:p-8 space-y-6 shadow-sm border-y sm:border border-slate-100">
                  <h2 className="text-lg md:text-xl font-bold text-slate-900">Compare with Similar Homes</h2>
                  <div className="flex items-center gap-4 overflow-x-auto hide-scrollbar pb-2">
                    {similarProperties.map((simItem, i) => {
                      const info = {
                        name: simItem.propertyName || simItem.name || simItem.title || 'Project',
                        locality: simItem.address?.locality || simItem.address?.city || '',
                        cover: simItem.coverImage || simItem.images?.cover || simItem.propertyImages?.[0] || simItem.gallery?.[0] || NO_IMAGE_PLACEHOLDER,
                        rawP: simItem.buyDetails?.expectedPrice || simItem.price || simItem.expectedPrice || simItem.startingPrice || simItem.dynamicData?.expectedPrice || simItem.dynamicData?.startingPrice || simItem.dynamicData?.minPrice,
                        ratingVal: simItem.avgRating || 0,
                        type: simItem.propertyType ? (simItem.propertyType.charAt(0).toUpperCase() + simItem.propertyType.slice(1)) : 'Residential'
                      };
                      const simPrice = info.rawP ? formatPriceLakhCrore(info.rawP) : 'Contact for Price';

                      return (
                        <div key={i} onClick={() => navigate(`/property/${simItem._id}`)} className="bg-white rounded-xl border border-slate-200 p-3 w-[160px] shrink-0 shadow-sm hover:border-blue-300 transition-colors cursor-pointer">
                          <img src={info.cover} className="w-full h-20 object-cover rounded-lg mb-2" alt={info.name} />
                          <h5 className="text-[11px] font-bold text-gray-800 line-clamp-1">{info.name}</h5>
                          <p className="text-[10px] text-slate-500 font-bold line-clamp-1">{info.locality}</p>

                          {info.ratingVal > 0 && (
                            <div className="flex items-center gap-1 my-1.5 text-[10px] text-amber-500 font-bold">
                              <Star size={10} className="fill-amber-500" /> {info.ratingVal.toFixed(1)}
                            </div>
                          )}

                          <p className="text-xs font-extrabold text-gray-900">{simPrice}</p>
                          <p className="text-[9px] text-slate-400 font-semibold">{info.type}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Locality Reviews Section */}
              <div id="explore-locality" className="bg-white sm:rounded-2xl p-5 sm:p-8 space-y-6 shadow-sm border-y sm:border border-slate-100">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg md:text-xl font-bold text-slate-900">Locality Reviews</h3>
                    <p className="text-sm text-slate-500 mt-1">For {property?.address?.locality || property?.address?.city || 'this area'}</p>
                  </div>
                  <button onClick={() => navigate('/insights/' + (property?.address?.locality || 'Locality') + '/reviews')} className="text-sm font-bold text-blue-600 hover:underline transition-all">
                    View all
                  </button>
                </div>

                {/* Average Rating Block */}
                <div className="flex flex-col md:flex-row md:items-center gap-6 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                  <div className="text-center md:border-r border-slate-200 md:pr-6">
                    <h4 className="text-3xl font-black text-slate-900 leading-none">{avgLocalityRating.toFixed(1)}<span className="text-base text-slate-400 font-normal"> / 5</span></h4>
                    <div className="flex items-center gap-1 justify-center mt-2 text-amber-500">
                      {[1, 2, 3, 4, 5].map((starIdx) => {
                        const isFull = starIdx <= Math.floor(avgLocalityRating);
                        return (
                          <Star key={starIdx} size={14} className={isFull ? "fill-amber-500 text-amber-500" : "text-slate-300"} />
                        );
                      })}
                    </div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-2">Average Rating</p>
                    <p className="text-[9px] text-slate-400">({totalLocalityReviews} Total Reviews)</p>
                  </div>

                  {/* Bars */}
                  <div className="flex-1 space-y-2 w-full">
                    {[5, 4, 3, 2, 1].map((starVal) => {
                      const percentage = getStarPercentage(starVal);
                      return (
                        <div key={starVal} className="flex items-center gap-2 text-xs font-bold text-slate-600">
                          <span className="w-2">{starVal}</span>
                          <Star size={10} className="fill-slate-400 text-slate-400" />
                          <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${percentage}%` }} />
                          </div>
                          <span className="w-6 text-right opacity-70">{starVal === 5 ? '5★' : `${starVal}★`}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Ratings by Features - progress circle indicators style */}
                <div className="space-y-4 pt-2">
                  <h4 className="text-sm font-bold text-slate-900">Ratings by features</h4>
                  <div className="grid grid-cols-4 gap-2 text-center">
                    {featureRatings.map((feat, idx) => (
                      <div key={idx} className="flex flex-col items-center justify-center">
                        <div className="relative w-14 h-14 flex items-center justify-center mb-2">
                          <svg className="absolute w-full h-full transform -rotate-90">
                            <circle cx="28" cy="28" r="22" className="stroke-slate-100 fill-transparent" strokeWidth="4" />
                            <circle cx="28" cy="28" r="22" className="stroke-purple-600 fill-transparent" strokeWidth="4"
                              strokeDasharray={138} strokeDashoffset={138 - (138 * feat.percent) / 100} strokeLinecap="round" />
                          </svg>
                          <span className="text-xs font-black text-slate-800">{feat.val.split('/')[0]}</span>
                        </div>
                        <span className="text-[10px] font-bold text-slate-600 leading-tight">{feat.title}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Positives & Negatives List tags */}
                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <div className="space-y-2">
                    <h5 className="text-sm font-bold text-slate-900">What are the positives</h5>
                    {localityPositives && localityPositives.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {localityPositives.map((pos, i) => (
                          <span key={i} className="bg-emerald-50 text-emerald-800 text-xs font-bold px-3 py-1.5 rounded-lg border border-emerald-100 shadow-sm">
                            {pos}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500">No specific locality positives highlighted yet for {property?.address?.locality || 'this area'}.</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <h5 className="text-sm font-bold text-slate-900">What are the negatives</h5>
                    {localityNegatives && localityNegatives.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {localityNegatives.map((neg, i) => (
                          <span key={i} className="bg-red-50 text-red-800 text-xs font-bold px-3 py-1.5 rounded-lg border border-red-100 shadow-sm">
                            {neg}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500">No major locality concerns reported for {property?.address?.locality || 'this area'}.</p>
                    )}
                  </div>
                </div>

                {/* Reviews by Residents Horizontal scroll list */}
                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-slate-900">Reviews by Residents</span>
                  </div>

                  {localityReviewsList && localityReviewsList.length > 0 ? (
                    <div className="flex items-center gap-4 overflow-x-auto hide-scrollbar pb-2">
                      {localityReviewsList.map((rev, idx) => {
                        const ratingVal = rev.rating || 4.0;
                        const reviewerName = rev.reviewerName || rev.userId?.name || rev.name || 'Anonymous';
                        const role = rev.reviewerType || rev.role || 'Resident';
                        const duration = rev.stayDuration ? ` | living since ${rev.stayDuration}` : '';
                        const timeAgo = rev.createdAt ? `${new Date(rev.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}` : '';

                        return (
                          <div key={idx} className="bg-slate-50/80 rounded-2xl border border-slate-200 p-4 min-w-[260px] max-w-[280px] shrink-0 text-xs font-medium text-slate-700 relative shadow-sm">
                            <div className="flex items-center gap-2 mb-3">
                              <span className="bg-emerald-600 text-white text-[10px] font-extrabold px-2 py-1 rounded shadow-sm">{ratingVal.toFixed(1)} ★</span>
                            </div>
                            <h6 className="text-sm font-bold text-slate-900 mb-1.5 line-clamp-1">{rev.title || 'Locality Rating'}</h6>
                            <p className="line-clamp-3 leading-relaxed opacity-95">{rev.reviewText || rev.review}</p>
                            <div className="flex items-center gap-3 mt-4 pt-3 border-t border-slate-200">
                              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">
                                {reviewerName.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="text-[11px] font-bold text-slate-900 leading-none mb-0.5">{reviewerName}</p>
                                <p className="text-[9px] text-slate-500">{role}{duration} {timeAgo ? `| ${timeAgo}` : ''}</p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-6 text-center space-y-3">
                      <MessageSquare className="w-8 h-8 text-blue-500 mx-auto opacity-70" />
                      <div>
                        <h5 className="text-sm font-bold text-slate-800">No Resident Reviews Yet</h5>
                        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                          Be the first resident to review {property?.address?.locality || property?.address?.city || 'this locality'}! Share your thoughts on connectivity, safety, and amenities.
                        </p>
                      </div>
                      <button
                        onClick={() => navigate('/insights/' + (property?.address?.locality || 'Locality') + '/reviews')}
                        className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white rounded-xl transition-all inline-flex items-center gap-1.5 shadow-sm"
                      >
                        Write a Review
                      </button>
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* Right Column (Sticky Side Panel) */}
            <div className="space-y-6 lg:sticky lg:top-[120px] self-start h-auto">

              {/* Main Booking/Lead Panel */}
              <div className="bg-white border-y sm:border border-slate-200 sm:rounded-2xl p-5 sm:p-6 shadow-md space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Enquire About This Project</h3>
                  <p className="text-xs text-slate-500 mt-1">Get-Right-home verified agent callback within 15 minutes</p>
                </div>

                <div className="space-y-4">
                  <div className="p-4 bg-slate-100/40 border border-slate-300/30 rounded-2xl flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-semibold">Verified Phone Contact</span>
                      <span className="text-sm font-bold text-slate-900 block mt-0.5">
                        {revealedNumber ? revealedNumber : "••••••••••"}
                      </span>
                    </div>
                    <button
                      onClick={handleRevealContact}
                      disabled={revealLoading}
                      className="py-2 px-4 bg-blue-600/20 hover:bg-blue-600/35 border border-blue-500/30 text-xs font-bold text-purple-300 rounded-xl transition-all flex items-center gap-1"
                    >
                      {revealLoading ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Eye className="w-3.5 h-3.5" />
                      )}
                      Reveal
                    </button>
                  </div>

                  <div className="space-y-3">
                    <button
                      onClick={() => setShowEnquiryModal(true)}
                      className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-sm font-bold text-slate-900 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30"
                    >
                      <MessageSquare className="w-4 h-4" /> Schedule Visit / Callback
                    </button>
                    <a
                      href={`https://wa.me/918884976767?text=I%20am%20interested%20in%20${encodeURIComponent(property?.propertyName || 'Project')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-3.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-sm font-semibold text-slate-800 rounded-2xl transition-all flex items-center justify-center gap-2"
                    >
                      <Phone className="w-4 h-4 text-emerald-500" /> WhatsApp Direct Chat
                    </a>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200/80 text-[11px] text-slate-500 space-y-2.5">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-blue-500 flex-shrink-0" />
                    <span>Get-Right-home zero-brokerage guarantee.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Info className="w-4 h-4 text-blue-500 flex-shrink-0" />
                    <span>Real-time pricing synced with developer catalog.</span>
                  </div>
                </div>
              </div>

              {/* Similar projects shortcut panel */}
              {similarProperties && similarProperties.length > 0 && (
                <div className="bg-white/40 border-y sm:border border-slate-200 sm:rounded-2xl p-5 sm:p-6 space-y-4">
                  <h3 className="text-sm font-bold text-slate-800">Similar Projects Near Locality</h3>
                  <div className="space-y-3">
                    {similarProperties.slice(0, 3).map((sim, idx) => {
                      const simTitle = sim.propertyName || sim.name || sim.title || 'Project';
                      const simLocality = sim.address?.locality || sim.address?.city || '';
                      const simCover = sim.coverImage || sim.images?.cover || sim.propertyImages?.[0] || NO_IMAGE_PLACEHOLDER;
                      const simRawPrice = sim.buyDetails?.expectedPrice || sim.price || sim.expectedPrice || sim.startingPrice || sim.dynamicData?.expectedPrice || sim.dynamicData?.startingPrice || sim.dynamicData?.minPrice;
                      const simPriceStr = simRawPrice ? formatPriceLakhCrore(simRawPrice) : 'Contact for Price';

                      return (
                        <div
                          key={idx}
                          onClick={() => navigate(`/project/${sim._id}`)}
                          className="flex gap-3 p-2 bg-white/80 border border-slate-200 rounded-xl hover:border-blue-500/30 transition-all cursor-pointer"
                        >
                          <div className="w-16 h-16 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0">
                            <img src={simCover} className="w-full h-full object-cover" alt={simTitle} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="text-xs font-bold text-slate-900 truncate">{simTitle}</h4>
                            <p className="text-[10px] text-slate-500 mt-0.5">{simLocality}</p>
                            <span className="text-[11px] font-bold text-blue-600 mt-1 block">
                              {simPriceStr}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Properties Tab Active - Dynamic Floor Plans & Configurations */
          <div className="space-y-6 pt-2">
            {/* Filter Pills */}
            <div className="flex gap-2 items-center overflow-x-auto scrollbar-none px-1 pb-1">
              <button className="flex-shrink-0 p-2 border border-slate-200 rounded-full text-slate-500 hover:bg-slate-50">
                <Filter className="w-4 h-4" />
              </button>
              {['All', 'Ready To Move', 'Budget'].map(f => (
                <button
                  key={f}
                  onClick={() => setPropertyFilter(f === propertyFilter ? 'All' : f)}
                  className={`flex-shrink-0 px-4 py-1.5 border rounded-full text-sm font-medium transition-colors ${propertyFilter === f ? 'border-slate-800 text-slate-900 bg-slate-50 font-bold' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}`}
                >
                  {f}
                </button>
              ))}
            </div>

            {/* Inline Action Buttons */}
            <div className="flex items-center gap-3">
              {projectBrochureUrl && (
                <button
                  onClick={handleBrochureDownload}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-full border-2 border-blue-100 bg-blue-50 text-blue-600 font-bold text-xs hover:bg-blue-100 transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4" /> Brochure
                </button>
              )}
              <button
                onClick={() => setShowEnquiryModal(true)}
                className="flex-[1.5] flex items-center justify-center py-3 rounded-full bg-blue-600 text-white font-bold text-xs shadow-md hover:bg-blue-700 transition-colors"
              >
                <Phone className="w-4 h-4 mr-2" /> Request Callback / Number
              </button>
            </div>

            {/* Available Units Header */}
            <div className="pt-2">
              <h3 className="text-xl font-bold text-slate-900">Available Units & Floor Plans</h3>
              <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                <span className="text-orange-500 text-base">🔥</span> Limited inventory available. Choose layout configuration below.
              </p>
            </div>

            {/* Config Tabs dynamically extracted from floorPlansList */}
            {(() => {
              const allConfigs = ['All', ...new Set(floorPlansList.map(p => p.configName || p.configType || p.configuration || 'Layout Plan').filter(Boolean))];
              
              const filteredPlans = floorPlansList.filter(plan => {
                const cfg = plan.configName || plan.configType || plan.configuration || 'Layout Plan';
                if (activePropertiesBhkTab !== 'All' && cfg !== activePropertiesBhkTab) return false;
                if (propertyFilter === 'Ready To Move') {
                  const st = String(plan.possessionStatus || '').toLowerCase();
                  if (!st.includes('ready')) return false;
                }
                if (propertyFilter === 'Budget') {
                  if (Number(plan.price || 0) > 5000000) return false;
                }
                return true;
              });

              return (
                <div className="space-y-6">
                  {allConfigs.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto scrollbar-none pb-2">
                      {allConfigs.map((cfg, i) => (
                        <button
                          key={i}
                          onClick={() => setActivePropertiesBhkTab(cfg)}
                          className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-medium border transition-colors ${activePropertiesBhkTab === cfg ? 'border-blue-600 text-blue-600 font-bold bg-blue-50/50 shadow-sm' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                        >
                          {cfg}
                        </button>
                      ))}
                    </div>
                  )}

                  {filteredPlans.length > 0 ? (
                    <div className="grid grid-cols-1 gap-6">
                      {filteredPlans.map((plan, idx) => {
                        const cfgName = plan.configName || plan.configType || plan.configuration || 'Unit Layout';
                        const planImg = plan.floorPlanImage || plan.image || plan.layoutImage || pImages[idx % pImages.length] || NO_IMAGE_PLACEHOLDER;
                        const carpet = plan.carpetArea ? `${plan.carpetArea} sqft` : 'N/A';
                        const superArea = (plan.superArea || plan.superBuiltUpArea) ? `${plan.superArea || plan.superBuiltUpArea} sqft` : 'N/A';
                        const planPriceStr = formatPlanPrice(plan.price);

                        return (
                          <div key={idx} className="bg-white/60 border border-slate-200 rounded-3xl overflow-hidden hover:border-blue-500/30 transition-all flex flex-col md:flex-row gap-6 p-6 shadow-sm">
                            <div className="w-full md:w-72 h-48 rounded-2xl overflow-hidden bg-slate-100 flex-shrink-0 relative group">
                              <img src={planImg} className="w-full h-full object-cover" alt={cfgName} />
                              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <button onClick={() => setSelectedFloorPlan(plan)} className="px-3 py-1.5 bg-white text-slate-900 text-xs font-bold rounded-lg shadow">
                                  View Full Layout
                                </button>
                              </div>
                            </div>
                            <div className="flex-grow flex flex-col justify-between space-y-4">
                              <div className="space-y-2">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <span className="px-2.5 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold rounded uppercase tracking-wide">
                                      {plan.possessionStatus || 'Available'}
                                    </span>
                                    <h4 className="text-lg font-bold text-slate-900 mt-1">{cfgName}</h4>
                                  </div>
                                  <div className="text-right">
                                    <span className="text-lg font-extrabold text-blue-600">
                                      {planPriceStr}
                                    </span>
                                    <span className="text-[9px] text-slate-500 block mt-0.5">Starting Price</span>
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3 text-xs pt-2">
                                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                                    <span className="text-slate-500 block font-medium">Carpet Area</span>
                                    <span className="font-bold text-slate-900">{carpet}</span>
                                  </div>
                                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                                    <span className="text-slate-500 block font-medium">Super Built-up</span>
                                    <span className="font-bold text-slate-900">{superArea}</span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex flex-wrap gap-4 items-center justify-between pt-4 border-t border-slate-200/60">
                                <button
                                  onClick={() => setSelectedFloorPlan(plan)}
                                  className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
                                >
                                  <Maximize2 className="w-3.5 h-3.5" /> View Dimensions & Layout
                                </button>
                                <div className="flex items-center gap-3">
                                  <button
                                    onClick={() => setShowEnquiryModal(true)}
                                    className="py-2.5 px-5 bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white rounded-xl transition-all shadow-md shadow-blue-600/25"
                                  >
                                    Request Callback
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-8 bg-slate-50 border border-slate-200 rounded-2xl text-center space-y-2">
                      <h4 className="text-sm font-bold text-slate-800">No Floor Plans Found</h4>
                      <p className="text-xs text-slate-500">There are no units matching the selected configuration filter.</p>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Support Section at Bottom */}
            <div className="mt-8">
              <SupportSection />
            </div>
          </div>
        )}
      </div>



      {/* MODALS & BOTTOM SHEETS */}
      <AnimatePresence>

        {/* Floor Plan Modal */}
        {selectedFloorPlan && (
          <div className="fixed inset-0 z-[99999] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl flex flex-col w-full max-w-3xl max-h-[90vh] overflow-hidden"
            >
              <div className="p-5 border-b border-slate-200 flex justify-between items-center shrink-0">
                <div>
                  <h3 className="text-xl font-bold text-slate-900 uppercase">
                    {selectedFloorPlan.configName || selectedFloorPlan.configType || selectedFloorPlan.configuration || selectedFloorPlan.name || selectedFloorPlan.title || 'Floor Plan'} Layout
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">Configured dimensions, area values & specifications</p>
                </div>
                <button
                  onClick={() => setSelectedFloorPlan(null)}
                  className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 rounded-full transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 flex-1 overflow-y-auto">
                <div className="p-6 flex flex-col justify-center bg-slate-50 border-r border-slate-200">
                  <div className="relative aspect-video rounded-xl overflow-hidden border border-slate-200 bg-black/50 flex items-center justify-center">
                    <img
                      src={selectedFloorPlan.floorPlanImage || selectedFloorPlan.image || selectedFloorPlan.layoutImage || selectedFloorPlan.floorPlan || pImages[0]}
                      className="w-full h-full object-cover"
                      alt="Floor Plan Layout"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end p-4">
                      <span className="text-[10px] text-blue-300 font-semibold bg-blue-900/40 border border-blue-800/40 px-2 py-0.5 rounded uppercase">2D Architectural Layout</span>
                    </div>
                  </div>
                </div>

                <div className="p-6 space-y-6 flex flex-col justify-between">
                  <div className="space-y-4">
                    <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Layout Sizing & Dimensions</h4>
                    <div className="space-y-2.5 max-h-56 overflow-y-auto pr-2 scrollbar-none">
                      {/* Carpet Area */}
                      <div className="flex justify-between items-center text-xs p-2.5 bg-slate-100/40 border border-slate-200 rounded-lg">
                        <span className="text-slate-500 font-semibold">Carpet Area</span>
                        <span className="font-bold text-slate-900">
                          {selectedFloorPlan.carpetArea ? (sqftUnit ? `${selectedFloorPlan.carpetArea} sqft` : `${(selectedFloorPlan.carpetArea * 0.0929).toFixed(1)} sqm`) : 'N/A'}
                        </span>
                      </div>

                      {/* Super Built-up Area */}
                      {(selectedFloorPlan.superArea || selectedFloorPlan.superBuiltUpArea) && (
                        <div className="flex justify-between items-center text-xs p-2.5 bg-slate-100/40 border border-slate-200 rounded-lg">
                          <span className="text-slate-500 font-semibold">Super Built-up Area</span>
                          <span className="font-bold text-slate-900">
                            {sqftUnit ? `${selectedFloorPlan.superArea || selectedFloorPlan.superBuiltUpArea} sqft` : `${((selectedFloorPlan.superArea || selectedFloorPlan.superBuiltUpArea) * 0.0929).toFixed(1)} sqm`}
                          </span>
                        </div>
                      )}

                      {/* Room Dimensions list */}
                      {(selectedFloorPlan.roomDimensions || selectedFloorPlan.rooms || []).map((rm, i) => (
                        <div key={i} className="flex justify-between items-center text-xs p-2.5 bg-slate-100/30 border border-slate-200 rounded-lg">
                          <span className="text-slate-500 font-medium">{rm.roomName || rm.name || `Room ${i+1}`}</span>
                          <span className="font-bold text-slate-800">{rm.dimensions || rm.value}</span>
                        </div>
                      ))}

                      {selectedFloorPlan.facing && (
                        <div className="flex justify-between items-center text-xs p-2.5 bg-slate-100/30 border border-slate-200 rounded-lg">
                          <span className="text-slate-500 font-medium">Facing</span>
                          <span className="font-bold text-slate-800">{selectedFloorPlan.facing}</span>
                        </div>
                      )}
                      {selectedFloorPlan.dimensions && (
                        <div className="flex justify-between items-center text-xs p-2.5 bg-slate-100/30 border border-slate-200 rounded-lg">
                          <span className="text-slate-500 font-medium">Dimensions</span>
                          <span className="font-bold text-slate-800">{selectedFloorPlan.dimensions}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-200 flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">Starting Price</span>
                    <span className="text-lg font-bold text-blue-600">
                      {formatPlanPrice(selectedFloorPlan.price)}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Payment Plan Milestones Modal */}
        {selectedPaymentPlan && (
          <div className="fixed inset-0 z-[99999] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl flex flex-col w-full max-w-lg max-h-[90vh] overflow-hidden"
            >
              <div className="p-5 border-b border-slate-200 flex justify-between items-center shrink-0">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Payment Milestones Breakdown</h3>
                  <p className="text-xs text-slate-500 mt-0.5">{selectedPaymentPlan.planName}</p>
                </div>
                <button
                  onClick={() => setSelectedPaymentPlan(null)}
                  className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 rounded-full transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 flex-1 overflow-y-auto space-y-4">
                {(() => {
                  const modalDocUrl = selectedPaymentPlan.docUrl || getPaymentPlanDocUrl(selectedPaymentPlan);
                  return (
                    <>
                      {modalDocUrl && (
                        <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-50 p-3 text-center">
                          <img src={modalDocUrl} alt="Payment Plan Document" className="w-full max-h-72 object-contain rounded-lg shadow-sm" />
                          <a href={modalDocUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-blue-600 font-bold mt-2.5 hover:underline">
                            <Download className="w-4 h-4" /> Open Full Resolution Document / Image
                          </a>
                        </div>
                      )}
                      {selectedPaymentPlan.milestones && selectedPaymentPlan.milestones.length > 0 ? (
                        selectedPaymentPlan.milestones.map((milestone, idx) => (
                          <div key={idx} className="flex gap-4 items-start p-3 bg-slate-100/30 border border-slate-200 rounded-xl">
                            <div className="w-12 h-12 bg-blue-900/40 text-blue-600 border border-blue-800/40 rounded-xl flex items-center justify-center font-black flex-shrink-0">
                              {milestone.percentage}%
                            </div>
                            <div>
                              <p className="text-xs text-slate-500">Milestone Stage {idx + 1}</p>
                              <h4 className="text-xs font-bold text-slate-800 mt-0.5">{milestone.description}</h4>
                            </div>
                          </div>
                        ))
                      ) : (
                        !modalDocUrl && (
                          <p className="text-xs text-slate-500 text-center py-4">Custom payment terms available. Contact advisor for details.</p>
                        )
                      )}
                    </>
                  );
                })()}
              </div>
            </motion.div>
          </div>
        )}

        {/* Highlights Bottom Sheet / Modal */}
        {showAllHighlights && (
          <div className="fixed inset-0 z-[99999] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl flex flex-col w-full max-w-xl max-h-[90vh] overflow-hidden"
            >
              <div className="p-5 border-b border-slate-200 flex justify-between items-center shrink-0">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Full Highlights & USPs</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Analyst verified list of unique selling points</p>
                </div>
                <button
                  onClick={() => setShowAllHighlights(false)}
                  className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 rounded-full transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 flex-1 overflow-y-auto space-y-3.5">
                {propertyHighlights.map((hl, i) => (
                  <div key={i} className="flex gap-3 items-start p-3 bg-slate-100/35 border border-slate-200 rounded-xl">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
                    <span className="text-xs text-slate-800">{hl}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}

        {/* Full Amenities sheet */}
        {showAllAmenities && (
          <div className="fixed inset-0 z-[99999] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl flex flex-col w-full max-w-3xl max-h-[90vh] overflow-hidden"
            >
              <div className="p-5 border-b border-slate-200 flex justify-between items-center shrink-0">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Full Amenities Catalog</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Categorized list of project features & common amenities</p>
                </div>
                <button
                  onClick={() => setShowAllAmenities(false)}
                  className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 rounded-full transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 grid grid-cols-2 md:grid-cols-3 gap-4 flex-1 overflow-y-auto">
                {(property?.amenities?.length > 0 ? property.amenities : ["Clubhouse", "Swimming Pool", "Biometric Lobby", "EV Charging Station", "Jogging Track", "24/7 Security", "Central Park", "Mini Theatre", "Gymnasium", "Indoor Squash Court", "Kid's Play Area", "Visitor's Lounge"]).map((am, i) => (
                  <div key={i} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-2.5 text-xs text-slate-800 shadow-sm">
                    <div className="p-1.5 bg-blue-100 text-blue-600 rounded">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                    <span className="font-medium truncate">{am}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}

        {/* Material & Construction spec sheet modal */}
        {showInteriorsModal && (
          <div className="fixed inset-0 z-[99999] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl flex flex-col w-full max-w-3xl max-h-[90vh] overflow-hidden"
            >
              <div className="p-5 border-b border-slate-200 flex justify-between items-center shrink-0">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-1.5">
                    <Shield className="w-5.5 h-5.5 text-blue-500" /> Technical Material Spec-Sheet
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">Detailed engineering materials, doors, wiring specifications</p>
                </div>
                <button
                  onClick={() => setShowInteriorsModal(false)}
                  className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 rounded-full transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex border-b border-slate-200 overflow-x-auto scrollbar-none text-xs font-semibold shrink-0">
                {Object.keys(constructionSpecs).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveInteriorTab(tab)}
                    className={`px-5 py-3 transition-colors capitalize ${activeInteriorTab === tab ? 'text-blue-600 border-b-2 border-blue-500' : 'text-slate-500 hover:text-slate-800'
                      }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              <div className="p-5 flex-1 overflow-y-auto space-y-4">
                <div className="bg-slate-955 rounded-2xl p-5 border border-slate-200/80">
                  <h4 className="text-sm font-bold text-slate-800 capitalize">{activeInteriorTab} Specifications</h4>
                  <div className="mt-3.5 space-y-3">
                    {Object.entries(constructionSpecs[activeInteriorTab] || {}).map(([key, val]) => (
                      <div key={key} className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 text-xs p-3 bg-slate-100/35 border border-slate-200 rounded-xl">
                        <span className="text-slate-500 font-semibold uppercase tracking-wider text-[10px] w-40 flex-shrink-0">{key.replace(/([A-Z])/g, ' $1')}</span>
                        <span className="text-slate-800 font-medium sm:text-right">{val}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex items-start gap-2.5 text-xs text-blue-600 mt-4">
                  <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>Quality checked on site by Get-Right-home construction auditing team. ISO 9001 certifications verified.</span>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Detailed Pros & Cons full screen Modal */}
        {showProsConsModal && (
          <div className="fixed inset-0 z-[99999] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl flex flex-col w-full max-w-2xl max-h-[90vh] overflow-hidden"
            >
              <div className="p-5 border-b border-slate-200 flex justify-between items-center shrink-0">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-1.5">
                    <TrendingUp className="w-5.5 h-5.5 text-blue-500" /> Locality Positives & Concerns Matrix
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">Analyzed by community residents & traffic telemetry</p>
                </div>
                <button
                  onClick={() => setShowProsConsModal(false)}
                  className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 rounded-full transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-6 flex-1 overflow-y-auto">
                <div className="space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                    <ThumbsUp className="w-4 h-4" /> Locality Positives
                  </h4>
                  <div className="space-y-2.5">
                    {localityPros.map((pro, idx) => (
                      <div key={idx} className="p-3 bg-emerald-950/15 border border-emerald-900/30 rounded-xl text-xs text-slate-700 leading-relaxed">
                        {pro}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-amber-500 flex items-center gap-1">
                    <ThumbsDown className="w-4 h-4" /> Areas of Caution
                  </h4>
                  <div className="space-y-2.5">
                    {localityCons.map((con, idx) => (
                      <div key={idx} className="p-3 bg-amber-950/15 border border-amber-900/30 rounded-xl text-xs text-slate-700 leading-relaxed">
                        {con}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Comparison Matrix Modal */}
        {showComparisonMatrix && (
          <div className="fixed inset-0 z-[99999] bg-black/90 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl flex flex-col w-full max-w-4xl max-h-[90vh] overflow-hidden"
            >
              <div className="p-5 border-b border-slate-200 flex justify-between items-center shrink-0">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-1.5">
                    <Compass className="w-5 h-5 text-blue-500" /> Project Comparison Matrix
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">Compare against similar {property?.address?.city || 'local'} projects</p>
                </div>
                <button
                  onClick={() => setShowComparisonMatrix(false)}
                  className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 rounded-full transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 sm:p-5 flex-1 overflow-auto">
                <table className="min-w-[520px] w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="py-4 px-3 font-semibold text-slate-500 text-left w-48">Key Metric</th>
                      <th className="py-4 px-3 font-bold text-purple-400 border-x border-blue-500/20 bg-blue-500/5">{property?.propertyName || 'This Property'}</th>
                      {similarProperties.slice(0, 2).map((sim, i) => (
                        <th key={i} className="py-4 px-3 font-bold text-slate-800">{sim.propertyName}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-slate-200 hover:bg-slate-100/20">
                      <td className="py-3.5 px-3 text-slate-500 font-medium">Estimated Pricing</td>
                      <td className="py-3.5 px-3 font-bold text-slate-900 border-x border-blue-500/20 bg-blue-500/5">
                        ₹{property?.buyDetails?.price ? (property.buyDetails.price / 10000000).toFixed(2) : '1.25'} Cr+
                      </td>
                      {similarProperties.slice(0, 2).map((sim, i) => (
                        <td key={i} className="py-3.5 px-3 font-medium text-slate-700">
                          ₹{sim.buyDetails?.price ? (sim.buyDetails.price / 10000000).toFixed(2) : '1.10'} Cr+
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b border-slate-100 group hover:bg-slate-50/50 transition-colors">
                      <td className="py-3.5 px-3 font-semibold text-slate-700 bg-white group-hover:bg-slate-50/50 sticky left-0 z-10 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.05)] border-r border-slate-100 flex items-center gap-2">
                        <Maximize2 size={14} className="text-blue-500" /> Architectural Density
                      </td>
                      <td className="py-3.5 px-3 font-semibold text-slate-900 border-x border-blue-500/20 bg-blue-500/5">{densityType} ({projectDensity})</td>
                      {similarProperties.slice(0, 2).map((sim, i) => (
                        <td key={i} className="py-3.5 px-3 text-slate-700">{sim.dynamicData?.densityType}</td>
                      ))}
                    </tr>
                    <tr className="border-b border-slate-100 group hover:bg-slate-50/50 transition-colors">
                      <td className="py-3.5 px-3 font-semibold text-slate-700 bg-white group-hover:bg-slate-50/50 sticky left-0 z-10 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.05)] border-r border-slate-100 flex items-center gap-2">
                        <Maximize2 size={14} className="text-blue-500" /> Land Area
                      </td>
                      <td className="py-3.5 px-3 font-semibold text-slate-900 border-x border-blue-500/20 bg-blue-500/5">{property?.dynamicData?.totalArea} Acres</td>
                      {similarProperties.slice(0, 2).map((sim, i) => (
                        <td key={i} className="py-3.5 px-3 text-slate-700">{sim.dynamicData?.totalArea} Acres</td>
                      ))}
                    </tr>
                    <tr className="border-b border-slate-100 group hover:bg-slate-50/50 transition-colors">
                      <td className="py-3.5 px-3 font-semibold text-slate-700 bg-white group-hover:bg-slate-50/50 sticky left-0 z-10 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.05)] border-r border-slate-100 flex items-center gap-2">
                        <Wind size={14} className="text-emerald-500" /> Green Open Area
                      </td>
                      <td className="py-3.5 px-3 font-semibold text-slate-900 border-x border-blue-500/20 bg-blue-500/5">{openAreaPercentage}%</td>
                      {similarProperties.slice(0, 2).map((sim, i) => (
                        <td key={i} className="py-3.5 px-3 text-slate-700">{sim.dynamicData?.openAreaPercentage}%</td>
                      ))}
                    </tr>
                    <tr className="border-b border-slate-100 group hover:bg-slate-50/50 transition-colors">
                      <td className="py-3.5 px-3 font-semibold text-slate-700 bg-white group-hover:bg-slate-50/50 sticky left-0 z-10 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.05)] border-r border-slate-100 flex items-center gap-2">
                        <Landmark size={14} className="text-purple-500" /> Structure Towers
                      </td>
                      <td className="py-3.5 px-3 font-semibold text-slate-900 border-x border-purple-500/20 bg-purple-500/5">{totalTowers} Towers</td>
                      {similarProperties.slice(0, 2).map((sim, i) => (
                        <td key={i} className="py-3.5 px-3 text-slate-700">{sim.dynamicData?.totalTowers} Towers</td>
                      ))}
                    </tr>
                    <tr className="border-b border-slate-200 hover:bg-slate-100/20">
                      <td className="py-3.5 px-3 font-semibold text-slate-700">Locality Positives</td>
                      <td className="py-3.5 px-3 font-bold text-slate-900 border-x border-purple-500/20 bg-purple-500/5">{localityPros.length} Pros listed</td>
                      {similarProperties.slice(0, 2).map((sim, i) => (
                        <td key={i} className="py-3.5 px-3 text-slate-700">{sim.dynamicData?.localityPros?.length} Pros</td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </motion.div>
          </div>
        )}

        {/* Enquiry Modal */}
        {showEnquiryModal && (
          <div className="fixed inset-0 z-[99999] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl shadow-2xl flex flex-col w-full max-w-md max-h-[90vh] overflow-hidden"
            >
              <div className="p-5 border-b border-slate-200 flex justify-between items-center shrink-0">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Schedule Callback Consultation</h3>
                  <p className="text-xs text-slate-500 mt-1">Get-Right-home verified agent response within 15 minutes</p>
                </div>
                <button
                  onClick={() => setShowEnquiryModal(false)}
                  className="p-1.5 bg-slate-850 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-full transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleEnquirySubmit} className="space-y-4 p-5 flex-1 overflow-y-auto">
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Your Full Name</label>
                  <input
                    type="text"
                    required
                    value={enquiryForm.name}
                    onChange={(e) => setEnquiryForm({ ...enquiryForm, name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-800 outline-none focus:border-blue-500 transition-all"
                    placeholder="Enter your name"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Active Phone Number</label>
                  <input
                    type="tel"
                    required
                    value={enquiryForm.phone}
                    onChange={(e) => setEnquiryForm({ ...enquiryForm, phone: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-800 outline-none focus:border-blue-500 transition-all"
                    placeholder="Enter 10-digit Indian phone number"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Email Address</label>
                  <input
                    type="email"
                    value={enquiryForm.email}
                    onChange={(e) => setEnquiryForm({ ...enquiryForm, email: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-800 outline-none focus:border-blue-500 transition-all"
                    placeholder="name@example.com (Optional)"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Custom Message</label>
                  <textarea
                    rows="3"
                    value={enquiryForm.message}
                    onChange={(e) => setEnquiryForm({ ...enquiryForm, message: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-800 outline-none focus:border-blue-500 transition-all resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={enquirySubmitting}
                  className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-sm font-bold text-white rounded-xl transition-all shadow flex items-center justify-center gap-1.5"
                >
                  {enquirySubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  Submit Callback Request
                </button>
              </form>
            </motion.div>
          </div>
        )}

        {/* About Builder Modal */}
        {showAboutBuilderModal && (
          <div className="fixed inset-0 z-[99999] flex items-end justify-center sm:items-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl p-6 sm:p-8 relative shadow-2xl h-[75vh] sm:h-auto flex flex-col"
            >
              <button onClick={() => setShowAboutBuilderModal(false)} className="absolute top-4 right-4 p-2 bg-slate-100 rounded-full text-slate-500 hover:text-slate-800 transition-colors">
                <X className="w-5 h-5" />
              </button>
              <h3 className="text-xl font-bold text-slate-900 mb-4 border-b border-slate-100 pb-3">About builder</h3>
              <div className="flex-1 overflow-y-auto pr-2 text-sm text-slate-700 leading-relaxed text-justify space-y-4">
                <p>{builderTrackRecord.summary || "Detailed builder information is not available at the moment. Our team is working on curating the best insights for you."}</p>
              </div>
              <button onClick={() => setShowAboutBuilderModal(false)} className="w-full mt-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors">
                Close
              </button>
            </motion.div>
          </div>
        )}

        {/* Verified Sources Modal */}
        {showVerifiedSourcesModal && (
          <div className="fixed inset-0 z-[99999] flex items-end justify-center sm:items-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl p-6 relative shadow-2xl h-[85vh] sm:h-auto flex flex-col"
            >
              <button onClick={() => setShowVerifiedSourcesModal(false)} className="absolute top-4 right-4 p-2 bg-slate-100 rounded-full text-slate-500 hover:text-slate-800 transition-colors">
                <X className="w-5 h-5" />
              </button>
              <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2"><Shield className="w-5 h-5 text-slate-800" /> Our verified sources</h3>
              <div className="flex-1 overflow-y-auto space-y-6 text-sm">
                <div>
                  <h4 className="font-bold text-slate-900 mb-1">Delivery information: RERA</h4>
                  <p className="text-slate-600 text-xs leading-relaxed">Delivery timing has been calculated based on the completion date & subsequent changes in the data updated by the Builder on State RERA website.</p>
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 mb-1">Construction Quality: Resident Reviews</h4>
                  <p className="text-slate-600 text-xs leading-relaxed">Construction ratings & insights have been generated based on the reviews submitted by actual residents on the platform.</p>
                  <p className="text-slate-600 text-[10px] leading-relaxed mt-2 italic font-medium">Powered by AI: The insights are generated using AI & may contain errors or inaccuracies. You can refer to our detailed resident reviews for further research.</p>
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 mb-1">Price Appreciation: Price Intelligence</h4>
                  <p className="text-slate-600 text-xs leading-relaxed">Based on listings posted in the last 3 months by owners & brokers.</p>
                </div>
              </div>
              <button onClick={() => setShowVerifiedSourcesModal(false)} className="w-full mt-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors">
                Okay, got it
              </button>
            </motion.div>
          </div>
        )}

      </AnimatePresence>
      {/* Fixed Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-3 pb-safe md:p-4 z-[9999] flex items-center justify-between gap-3 shadow-[0_-10px_20px_rgba(0,0,0,0.08)]">
        <button
          onClick={handleBrochureDownload}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-full border border-blue-100 bg-blue-50 text-blue-600 font-bold text-xs hover:bg-blue-100 transition-colors"
        >
          <Download className="w-3.5 h-3.5" /> Brochure
        </button>
        <button
          onClick={() => {
            if (!user) {
              toast.error("Please login to view contact details");
              navigate('/login');
            } else {
              setShowEnquiryModal(true);
            }
          }}
          className="flex-[1.5] flex items-center justify-center gap-1.5 py-2.5 rounded-full bg-blue-600 text-white font-bold text-xs shadow-md shadow-blue-600/30 hover:bg-blue-700 transition-colors"
        >
          <Phone className="w-3.5 h-3.5" /> View Number
        </button>
      </div>

    </div>
  );
};

export default HandpickedDetailsPage;
