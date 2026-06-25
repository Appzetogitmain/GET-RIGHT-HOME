import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import {
  MapPin, Star, Share2, Heart, ArrowLeft, Loader2, ChevronLeft, ChevronRight,
  MessageSquare, Tag, X, CheckCircle, Shield, Info, Phone, Maximize2, Compass,
  LayoutTemplate, Wind, Droplets, Zap, Award, Check, ChevronDown, Layers, Home,
  Grid, FileText, Plus, Minus, Eye, EyeOff, Calendar, Send, Sparkles, Building,
  TrendingUp, ThumbsUp, ThumbsDown, CheckCircle2, AlertTriangle, AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  propertyService,
  enquiryService,
  localityReviewService,
  userService
} from '../../services/apiService';

const NO_IMAGE_PLACEHOLDER = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='800' height='600' viewBox='0 0 800 600'><rect width='100%' height='100%' fill='%23F1F5F9'/><text x='50%' y='50%' font-family='sans-serif' font-size='24' font-weight='bold' fill='%2394A3B8' dominant-baseline='middle' text-anchor='middle'>No Image Available</text></svg>";

const HandpickedDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  // Core State
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [revealedNumber, setRevealedNumber] = useState(null);
  const [revealLoading, setRevealLoading] = useState(false);

  // Tabs state
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'properties'
  const [activeSection, setActiveSection] = useState('overview-sec');

  // Hero carousel state
  const [currentImgIndex, setCurrentImgIndex] = useState(0);

  // Floor Plan modal state
  const [selectedFloorPlan, setSelectedFloorPlan] = useState(null);
  const [sqftUnit, setSqftUnit] = useState(true); // true = sqft, false = sqm

  // Payment Plan modal state
  const [selectedPaymentPlan, setSelectedPaymentPlan] = useState(null);

  // Highlights Bottom-sheet / Modal
  const [showAllHighlights, setShowAllHighlights] = useState(false);

  // Amenities Modal
  const [showAllAmenities, setShowAllAmenities] = useState(false);
  const [amenityRequestSuccess, setAmenityRequestSuccess] = useState(false);

  // Interiors page state
  const [showInteriorsModal, setShowInteriorsModal] = useState(false);
  const [activeInteriorTab, setActiveInteriorTab] = useState('flooring');

  // Pros & Cons Full Screen Modal
  const [showProsConsModal, setShowProsConsModal] = useState(false);

  // Comparison Matrix Modal
  const [showComparisonMatrix, setShowComparisonMatrix] = useState(false);
  const [similarProperties, setSimilarProperties] = useState([]);

  // Enquiry / Lead Modal State
  const [showEnquiryModal, setShowEnquiryModal] = useState(false);
  const [enquiryForm, setEnquiryForm] = useState({
    name: '',
    email: '',
    phone: '',
    message: 'I am interested in this handpicked project. Please contact me with more details.'
  });
  const [enquirySubmitting, setEnquirySubmitting] = useState(false);

  // References to sections for scroll spying
  const sectionRefs = {
    'overview-sec': useRef(null),
    'specs-sec': useRef(null),
    'locality-sec': useRef(null),
    'builder-sec': useRef(null)
  };

  useEffect(() => {
    loadHandpickedDetails();
    checkIfSaved();
  }, [id]);

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

  const loadHandpickedDetails = async () => {
    try {
      setLoading(true);
      const res = await propertyService.getDetails(id);
      if (res && res.property) {
        setProperty(res.property);
        
        // Load similar handpicked/admin added properties in the same category
        try {
          const simRes = await propertyService.getPublic({
            propertyCategory: res.property.propertyCategory,
            limit: 6
          });
          if (simRes && simRes.properties) {
            setSimilarProperties(simRes.properties.filter(p => p._id !== res.property._id));
          }
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

  const checkIfSaved = async () => {
    try {
      const userStr = localStorage.getItem('user');
      if (!userStr) return;
      const res = await userService.getSavedHotels();
      if (res && Array.isArray(res)) {
        const saved = res.some(item => item._id === id);
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
      const res = await userService.toggleSavedHotel(id);
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
        title: property?.propertyName || "Handpicked Property",
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
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center p-6 space-y-6">
        <div className="w-full max-w-6xl space-y-8 animate-pulse">
          {/* Skeleton Header */}
          <div className="h-96 bg-slate-800 rounded-3xl w-full"></div>
          {/* Skeleton Meta Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-2 space-y-4">
              <div className="h-8 bg-slate-800 rounded w-3/4"></div>
              <div className="h-4 bg-slate-800 rounded w-1/2"></div>
              <div className="h-20 bg-slate-800 rounded w-full"></div>
            </div>
            <div className="h-40 bg-slate-800 rounded-2xl w-full"></div>
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

  // Extracted values matching mapping blueprint
  const projectDensity = dynamicData.projectDensity || "60 units/acre";
  const densityType = dynamicData.densityType || "Premium Low-density & High-rise";
  const totalArea = dynamicData.totalArea || 7.36;
  const openAreaPercentage = dynamicData.openAreaPercentage || 65;
  const totalTowers = dynamicData.totalTowers || 5;
  const totalUnits = dynamicData.totalUnits || 480;

  // Highlights & Amenities lists
  const propertyHighlights = property?.highlights?.length > 0 
    ? property.highlights 
    : [
        "Vastu compliant East-facing primary layouts",
        "Just 8 minutes walking distance to Metro Station",
        "Fully equipped double-height club-house of 45,000 sq ft",
        "Triple tier security architecture with biometric checkpoints",
        "Extensive landscaped central park and multi-sport court",
        "No common walls between neighbouring apartment blocks"
      ];

  // Normalize a localityPros/Cons entry — DB may store objects like {proText:'...'} or plain strings
  const normalizeLocalityItem = (item) => {
    if (typeof item === 'string') return item;
    if (item && typeof item === 'object') {
      return item.proText || item.conText || item.text || item.value || JSON.stringify(item);
    }
    return String(item ?? '');
  };

  const localityPros = (dynamicData.localityPros || [
    "Wide 4-lane access road connecting to main highway within 500m",
    "Top tier schools (Oakridge International & DPS) within 3km radius",
    "Low noise pollution level due to surrounding green zone buffer",
    "Excellent groundwater availability with active rainwater recharge systems",
    "Upcoming IT hub extension planned within 10 minutes drive"
  ]).map(normalizeLocalityItem);

  const localityCons = (dynamicData.localityCons || [
    "Peak hours can experience traffic build-up near the highway junction",
    "Public transport availability other than Metro is limited late at night",
    "Municipal water connection schedule is currently twice a week"
  ]).map(normalizeLocalityItem);

  const builderTrackRecord = {
    name: property?.userId?.name || "GRH Premium Builders",
    logo: property?.userId?.builderProfile?.logo || "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=120&auto=format&fit=crop&q=60",
    summary: property?.userId?.builderProfile?.about || "A highly reputed real-estate group with 20+ years of building experiences and an unblemished delivery timeline. Dedicated to luxury design principles and customer satisfaction.",
    experience: property?.userId?.builderProfile?.experienceYears || 22,
    ongoingCount: property?.userId?.builderProfile?.ongoingProjects || 8,
    completedCount: property?.userId?.builderProfile?.completedProjects || 34,
    rating: property?.userId?.builderProfile?.rating || 4.9
  };

  // Mocked Floor plans (if none loaded)
  const floorPlansList = dynamicData.floorPlans || [
    {
      configType: "3 BHK Premium",
      carpetArea: 1420,
      price: 18500000,
      image: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&auto=format&fit=crop&q=80",
      rooms: [
        { name: "Living Room", dimensions: "19'0'' x 13'3''" },
        { name: "Master Bedroom", dimensions: "14'0'' x 12'0''" },
        { name: "Kitchen", dimensions: "12'0'' x 9'6''" },
        { name: "Balcony", dimensions: "8'0'' x 5'0''" }
      ]
    },
    {
      configType: "4 BHK Duplex",
      carpetArea: 2150,
      price: 27500000,
      image: "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=800&auto=format&fit=crop&q=80",
      rooms: [
        { name: "Living Room", dimensions: "24'0'' x 16'0''" },
        { name: "Master Bedroom", dimensions: "16'0'' x 14'0''" },
        { name: "Bedroom 2", dimensions: "12'0'' x 12'0''" },
        { name: "Family Lounge", dimensions: "14'0'' x 10'0''" },
        { name: "Kitchen", dimensions: "14'0'' x 11'0''" }
      ]
    }
  ];

  // Mocked plot configurations (for Plot land)
  const plotConfigsList = dynamicData.plotConfigurations || [
    { name: "Type A Premium Plot", totalArea: 1800, dimensions: "30' x 60'", price: 7200000, facing: "East", boundaryWall: true, image: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&auto=format&fit=crop&q=80" },
    { name: "Type B Corner Plot", totalArea: 2400, dimensions: "40' x 60'", price: 9800000, facing: "Northeast", boundaryWall: true, image: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=800&auto=format&fit=crop&q=80" }
  ];

  // Infrastructure Specs (for plots)
  const plotInfrastructure = {
    waterLine: dynamicData.waterLine || "Municipal supply pipeline already laid",
    electricityConnection: dynamicData.electricityConnection || "Underground power cables installed",
    drainage: dynamicData.drainage || "Stormwater closed masonry drains ready",
    roadWidth: dynamicData.roadWidth || 40,
    gatedStatus: dynamicData.gatedStatus !== undefined ? dynamicData.gatedStatus : true
  };

  // Payment plans
  const paymentPlansList = dynamicData.paymentPlans || [
    {
      planName: "Under Construction Linked Milestone Plan",
      milestones: [
        { percentage: 10, description: "At the time of Booking Confirmation" },
        { percentage: 15, description: "Upon Excavation of Foundation" },
        { percentage: 15, description: "On completion of Basement Slabs" },
        { percentage: 20, description: "On casting of respective apartment floor slabs" },
        { percentage: 20, description: "Upon Brickwork, plastering and internal piping" },
        { percentage: 10, description: "At execution of final Sale Deed registration" },
        { percentage: 10, description: "On official Handover of key possession" }
      ]
    },
    {
      planName: "Special 10:90 Subvention Scheme",
      milestones: [
        { percentage: 10, description: "Upfront Booking Payment" },
        { percentage: 90, description: "On offer of structural possession of unit" }
      ]
    }
  ];

  // Towers list
  const towersList = dynamicData.towers || [
    { name: "Tower A (Royal Block)", configurations: "3 & 4 BHK", completionDate: "Dec 2027", phase: "Phase 1", floors: 24 },
    { name: "Tower B (Serenity Block)", configurations: "3 BHK", completionDate: "Dec 2027", phase: "Phase 1", floors: 24 },
    { name: "Tower C (Classic Block)", configurations: "2 & 3 BHK", completionDate: "Jun 2028", phase: "Phase 2", floors: 20 }
  ];

  // Deep Construction specifications
  const constructionSpecs = {
    flooring: {
      masterBedroom: dynamicData.specFlooringMasterBedroom || "Imported engineered wooden flooring of premium brand",
      livingDining: dynamicData.specFlooringLivingDining || "Premium double-charged glazed vitrified tile flooring",
      kitchen: dynamicData.specFlooringKitchen || "Anti-skid designer vitrified tiles",
      toilet: dynamicData.specFlooringToilet || "Premium quality anti-skid ceramic tiles",
      balcony: dynamicData.specFlooringBalcony || "Matte finish premium exterior grade ceramic tiles"
    },
    toilet: {
      fittings: dynamicData.specToiletFittings || "Premium CP fixtures (Kohler/Grohe), wall hung EWC, shower enclosures with diverters"
    },
    doors: {
      doorsWindows: dynamicData.specDoorsWindows || "Teakwood main door frame with melamine polish, UPVC double-glazed sliding windows with fly mesh"
    },
    electrical: {
      wiring: dynamicData.specElectrical || "Concealed copper wiring (Finolex/Havells), modular switches (Legrand), split AC conduit points in all rooms"
    },
    structural: {
      structural: dynamicData.specStructural || "Earthquake-resistant RCC framed monolithic shear-wall structure matching IS-code standards"
    },
    finishing: {
      finishing: dynamicData.specFinishing || "Acrylic emulsion internal wall finishes, weather-proof silicone based exterior textures"
    }
  };

  // Local sentiments mock
  const localSentiments = [
    { label: "Safety & Security", value: "96%", desc: "Extremely secure, regular police patrolling and gate vigilance." },
    { label: "Connectivity", value: "90%", desc: "Metro connectivity and major flyovers facilitate easy office transit." },
    { label: "Water & Power Supply", value: "92%", desc: "Highly reliable municipal lines backed by society dual generators." },
    { label: "Cleanliness & Parks", value: "88%", desc: "Well-maintained wide pavements and clean, garbage-free streets." }
  ];

  // Category reviews mock
  const localityReviewsMock = {
    aggregate: 4.8,
    tagCloud: ["Superb connectivity", "Very safe area", "Great schools nearby", "Active neighborhood watch", "Slight peak hour traffic"],
    list: [
      { author: "Devendra Jais", role: "Resident (3 years)", stars: 5, text: "The locality has transformed beautifully. Having the metro station within walking distance makes commuting to the financial district extremely fast and effortless." },
      { author: "Ananya Sen", role: "Property Owner", stars: 5, text: "Excellent security standard. The maintenance and water supply systems have been outstanding. Safe streets for kids and walking paths are very pleasant." }
    ]
  };

  // Available Individual units listed in this project (For properties tab)
  const availableUnitsList = property?.roomTypes || [
    {
      _id: "u1",
      name: "3 BHK East facing corner apartment",
      pricePerNight: 19500000,
      description: "Semi-furnished apartment on 18th floor featuring beautiful overlooking view of the central landscape park, premium marble fittings, false ceiling done.",
      roomCategory: "Apartment",
      maxAdults: 3,
      bedsPerRoom: 3,
      images: ["https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&auto=format&fit=crop&q=80"]
    },
    {
      _id: "u2",
      name: "4 BHK Ultra Luxury Penthouse Block B",
      pricePerNight: 31000000,
      description: "Exclusive penthouse spanning top two levels. Features private plunge pool, massive terrace balcony, fully automated lighting, VRV central air cooling systems.",
      roomCategory: "Penthouse",
      maxAdults: 4,
      bedsPerRoom: 4,
      images: ["https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&auto=format&fit=crop&q=80"]
    }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-28">
      {/* 1. HERO Carousel Section */}
      <section className="relative h-[65vh] w-full bg-slate-900 overflow-hidden">
        <img
          src={pImages[currentImgIndex]}
          alt={property?.propertyName || "Handpicked"}
          className="w-full h-full object-cover transition-all duration-700 brightness-[0.75]"
        />

        {/* Floating Top Header bar */}
        <div className="absolute top-0 left-0 right-0 p-6 bg-gradient-to-b from-black/80 to-transparent flex items-center justify-between z-20">
          <button
            onClick={() => navigate(-1)}
            className="p-3 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full transition-all border border-white/10"
          >
            <ArrowLeft className="w-6 h-6 text-white" />
          </button>
          <div className="flex items-center space-x-3">
            <button
              onClick={handleShare}
              className="p-3 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full transition-all border border-white/10"
            >
              <Share2 className="w-6 h-6 text-white" />
            </button>
            <button
              onClick={handleSaveToggle}
              className={`p-3 backdrop-blur-md rounded-full transition-all border ${
                isSaved
                  ? 'bg-rose-600/90 border-rose-500 text-white'
                  : 'bg-white/10 hover:bg-white/20 border-white/10 text-white'
              }`}
            >
              <Heart className={`w-6 h-6 ${isSaved ? 'fill-current' : ''}`} />
            </button>
          </div>
        </div>

        {/* Overlay Badges */}
        <div className="absolute bottom-6 left-6 right-6 flex flex-col md:flex-row md:items-end justify-between gap-4 z-20">
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              <span className="px-3 py-1 bg-purple-600 text-white text-xs font-semibold tracking-wider uppercase rounded-full shadow-lg shadow-purple-600/30 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" /> Handpicked Premium
              </span>
              {property?.isLive && (
                <span className="px-3 py-1 bg-emerald-600 text-white text-xs font-semibold tracking-wider uppercase rounded-full shadow-lg shadow-emerald-600/30 flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5" /> RERA Approved
                </span>
              )}
              {builderDetails.possessionStatus && (
                <span className="px-3 py-1 bg-amber-500/90 text-slate-950 text-xs font-bold tracking-wider uppercase rounded-full shadow-lg shadow-amber-500/20">
                  {builderDetails.possessionStatus}
                </span>
              )}
            </div>
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white drop-shadow-md">
              {property?.propertyName}
            </h1>
            <p className="text-slate-300 flex items-center gap-2 drop-shadow-md">
              <MapPin className="w-4 h-4 text-purple-400" />
              {property?.address?.locality}, {property?.address?.city}
            </p>
          </div>

          <div className="bg-slate-900/80 backdrop-blur-xl border border-white/10 p-5 rounded-2xl md:w-80 shadow-2xl flex flex-col justify-between">
            <p className="text-xs text-slate-400 font-semibold tracking-wide uppercase">Starting price</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-extrabold text-purple-400">
                ₹{property?.buyDetails?.price ? (property.buyDetails.price / 10000000).toFixed(2) : '1.25'} Cr
              </span>
              <span className="text-xs text-slate-400">onwards</span>
            </div>
            <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between text-xs text-slate-300">
              <span className="flex items-center gap-1 font-semibold text-amber-400">
                <Star className="w-4.5 h-4.5 fill-current" /> {builderDetails.ratings?.constructionQuality || '4.8'} / 5.0 Quality Rating
              </span>
              <span>•</span>
              <span className="text-slate-400 font-medium">By {builderTrackRecord.name}</span>
            </div>
          </div>
        </div>

        {/* Carousel indicators & controller */}
        <div className="absolute bottom-6 right-6 md:right-auto md:left-1/2 md:-translate-x-1/2 flex items-center space-x-2 z-20">
          {pImages.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentImgIndex(idx)}
              className={`h-2.5 rounded-full transition-all duration-300 ${
                idx === currentImgIndex ? 'w-8 bg-purple-500' : 'w-2.5 bg-white/40 hover:bg-white/60'
              }`}
            />
          ))}
        </div>

        {/* Blur gradient cover */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-black/40 z-10"></div>
      </section>

      {/* Thumbnails list overlay panel */}
      {pImages.length > 1 && (
        <div className="max-w-7xl mx-auto px-6 mt-4">
          <div className="flex items-center gap-3 overflow-x-auto py-2 scrollbar-none">
            {pImages.map((img, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentImgIndex(idx)}
                className={`relative flex-shrink-0 h-16 w-24 rounded-lg overflow-hidden border-2 transition-all ${
                  idx === currentImgIndex ? 'border-purple-500 scale-105' : 'border-slate-800 opacity-60 hover:opacity-100'
                }`}
              >
                <img src={img} className="w-full h-full object-cover" alt="" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 2. Main Tabbed Sticky Navigation */}
      <div className="sticky top-0 bg-slate-950/90 backdrop-blur-md border-y border-slate-800 z-30 shadow-xl">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row md:items-center justify-between">
          <div className="flex space-x-8 py-4">
            <button
              onClick={() => setActiveTab('overview')}
              className={`text-lg font-bold pb-1 transition-all relative ${
                activeTab === 'overview' ? 'text-purple-400' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Overview Details
              {activeTab === 'overview' && (
                <motion.div layoutId="main-tab-line" className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('properties')}
              className={`text-lg font-bold pb-1 transition-all relative ${
                activeTab === 'properties' ? 'text-purple-400' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Available Units ({availableUnitsList.length})
              {activeTab === 'properties' && (
                <motion.div layoutId="main-tab-line" className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500" />
              )}
            </button>
          </div>

          {activeTab === 'overview' && (
            <div className="hidden md:flex space-x-6 py-4 text-xs font-semibold tracking-wider text-slate-400 uppercase">
              <button
                onClick={() => scrollToSection('overview-sec')}
                className={`transition-colors ${activeSection === 'overview-sec' ? 'text-purple-400 font-bold' : 'hover:text-slate-200'}`}
              >
                About Project
              </button>
              <button
                onClick={() => scrollToSection('specs-sec')}
                className={`transition-colors ${activeSection === 'specs-sec' ? 'text-purple-400 font-bold' : 'hover:text-slate-200'}`}
              >
                Specifications & Towers
              </button>
              <button
                onClick={() => scrollToSection('locality-sec')}
                className={`transition-colors ${activeSection === 'locality-sec' ? 'text-purple-400 font-bold' : 'hover:text-slate-200'}`}
              >
                Locality Pros/Cons
              </button>
              <button
                onClick={() => scrollToSection('builder-sec')}
                className={`transition-colors ${activeSection === 'builder-sec' ? 'text-purple-400 font-bold' : 'hover:text-slate-200'}`}
              >
                Builder Insight
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="max-w-7xl mx-auto px-6 mt-8">
        {activeTab === 'overview' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column (Main Scroll) */}
            <div className="lg:col-span-2 space-y-10">
              
              {/* Section 1: Overview & Highlights */}
              <div ref={sectionRefs['overview-sec']} className="bg-slate-900/40 border border-slate-800 rounded-3xl p-8 space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <Building className="w-6 h-6 text-purple-400" /> Project Architectural Highlights
                  </h2>
                  <p className="text-slate-400 text-sm mt-1">High-end specifications curated by Get-Right-home analysts</p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/50">
                    <span className="text-xs text-slate-400 block font-medium">Density Configuration</span>
                    <span className="text-base font-bold text-white mt-1 block">{densityType}</span>
                    <span className="text-[10px] text-purple-400 mt-0.5 block">{projectDensity}</span>
                  </div>
                  <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/50">
                    <span className="text-xs text-slate-400 block font-medium">Total Area Spread</span>
                    <span className="text-base font-bold text-white mt-1 block">{totalArea} Acres</span>
                    <span className="text-[10px] text-purple-400 mt-0.5 block">{openAreaPercentage}% Land Open & Green</span>
                  </div>
                  <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/50">
                    <span className="text-xs text-slate-400 block font-medium">Towers & Height</span>
                    <span className="text-base font-bold text-white mt-1 block">{totalTowers} Structural Towers</span>
                    <span className="text-[10px] text-purple-400 mt-0.5 block">Avg {towersList[0]?.floors || 24} Floors / Tower</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-slate-200">Premium USPs & Considerations</h3>
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {propertyHighlights.slice(0, 4).map((hl, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm text-slate-300">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                        <span>{hl}</span>
                      </li>
                    ))}
                  </ul>
                  {propertyHighlights.length > 4 && (
                    <button
                      onClick={() => setShowAllHighlights(true)}
                      className="text-purple-400 hover:text-purple-300 text-xs font-bold flex items-center gap-1 pt-2 transition-all"
                    >
                      View all {propertyHighlights.length} highlights <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Description Text */}
                <div className="pt-4 border-t border-slate-800/80 space-y-3">
                  <h3 className="text-base font-bold text-slate-200">Detailed Project Description</h3>
                  <p className="text-slate-300 text-sm leading-relaxed">
                    {property?.description || "This super luxury enclave brings to you the peak of urban residential planning. Set inside beautiful greens, this gated community combines high-technology home building with high density architectural details. Built with structural safety, smart features, energy integrations and double height lobby elements."}
                  </p>
                  {property?.dynamicCategory && (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-800 rounded-full text-xs text-purple-300">
                      <Tag className="w-3.5 h-3.5" />
                      <span>Categorized Premium Project</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Section 2: Available Configs & Floor Plans */}
              <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-8 space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                      <LayoutTemplate className="w-6 h-6 text-purple-400" /> Floor Plans & Configurations
                    </h2>
                    <p className="text-slate-400 text-sm mt-1">Configure layout preferences and review room sizing</p>
                  </div>
                  <div className="bg-slate-800/80 p-0.5 rounded-full border border-slate-700 flex">
                    <button
                      onClick={() => setSqftUnit(true)}
                      className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${sqftUnit ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                      Sq. Ft.
                    </button>
                    <button
                      onClick={() => setSqftUnit(false)}
                      className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${!sqftUnit ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                      Sq. M.
                    </button>
                  </div>
                </div>

                {isApartmentOrVilla && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {floorPlansList.map((plan, i) => (
                      <div key={i} className="bg-slate-800/40 border border-slate-700/50 rounded-2xl overflow-hidden hover:border-purple-500/50 transition-all flex flex-col justify-between">
                        <div className="p-5 space-y-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="px-2 py-0.5 bg-purple-900/40 text-purple-300 border border-purple-800/40 text-[10px] font-bold uppercase rounded tracking-wider">
                                APARTMENT PLAN
                              </span>
                              <h4 className="text-lg font-bold text-white mt-1">{plan.configType}</h4>
                            </div>
                            <span className="text-xs text-amber-400 font-semibold bg-amber-500/10 px-2 py-1 rounded border border-amber-500/10">
                              Possession: {builderDetails.possessionYear || '2027'}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-4 text-xs">
                            <div>
                              <span className="text-slate-400 block font-medium">Carpet Area</span>
                              <span className="text-sm font-bold text-white">
                                {sqftUnit ? `${plan.carpetArea} sqft` : `${(plan.carpetArea * 0.0929).toFixed(1)} sqm`}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-400 block font-medium">Starting Price</span>
                              <span className="text-sm font-bold text-purple-400">
                                ₹{(plan.price / 10000000).toFixed(2)} Cr
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="px-5 pb-5 pt-0">
                          <button
                            onClick={() => setSelectedFloorPlan(plan)}
                            className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 rounded-xl transition-all flex items-center justify-center gap-1.5"
                          >
                            <Maximize2 className="w-3.5 h-3.5 text-purple-400" /> View Layout & Dimensions
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {isPlot && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {plotConfigsList.map((plot, i) => (
                      <div key={i} className="bg-slate-800/40 border border-slate-700/50 rounded-2xl overflow-hidden hover:border-purple-500/50 transition-all flex flex-col justify-between">
                        <div className="p-5 space-y-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="px-2 py-0.5 bg-purple-900/40 text-purple-300 border border-purple-800/40 text-[10px] font-bold uppercase rounded tracking-wider">
                                PLOT LAYOUT
                              </span>
                              <h4 className="text-lg font-bold text-white mt-1">{plot.name}</h4>
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-2 text-xs">
                            <div>
                              <span className="text-slate-400 block font-medium">Plot Area</span>
                              <span className="text-sm font-bold text-white">{plot.totalArea} sqyd</span>
                            </div>
                            <div>
                              <span className="text-slate-400 block font-medium">Dimensions</span>
                              <span className="text-sm font-bold text-white">{plot.dimensions}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 block font-medium">Facing</span>
                              <span className="text-sm font-bold text-white">{plot.facing}</span>
                            </div>
                          </div>
                        </div>

                        <div className="px-5 pb-5">
                          <button
                            onClick={() => setSelectedFloorPlan({ configType: plot.name, carpetArea: plot.totalArea, price: plot.price, isPlot: true, facing: plot.facing, dimensions: plot.dimensions, boundaryWall: plot.boundaryWall })}
                            className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 rounded-xl transition-all flex items-center justify-center gap-1.5"
                          >
                            <Maximize2 className="w-3.5 h-3.5 text-purple-400" /> View Layout & Details
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Milestone Payment Plan Widget */}
              <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-8 space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <FileText className="w-6 h-6 text-purple-400" /> Premium Payment Plans
                  </h2>
                  <p className="text-slate-400 text-sm mt-1">Review milestone schedules and subvention terms</p>
                </div>

                <div className="space-y-4">
                  {paymentPlansList.map((plan, i) => (
                    <div key={i} className="bg-slate-800/30 border border-slate-800/80 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <h4 className="text-sm font-bold text-white flex items-center gap-2">
                          <Award className="w-4 h-4 text-purple-400" /> {plan.planName}
                        </h4>
                        <p className="text-xs text-slate-400 mt-1">Divided into {plan.milestones?.length || 0} stages of construction progress</p>
                      </div>
                      <button
                        onClick={() => setSelectedPaymentPlan(plan)}
                        className="py-2 px-4 bg-purple-600/10 hover:bg-purple-600/20 border border-purple-500/20 text-xs font-bold text-purple-400 rounded-xl transition-all"
                      >
                        View Milestone Percentages
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Section 3: Specifications, Towers, Construction */}
              <div ref={sectionRefs['specs-sec']} className="bg-slate-900/40 border border-slate-800 rounded-3xl p-8 space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <Layers className="w-6 h-6 text-purple-400" /> Towers, Layout & Structural Details
                  </h2>
                  <p className="text-slate-400 text-sm mt-1">Detailed block phases, structural floor counts, and specifications</p>
                </div>

                {isApartmentOrVilla && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {towersList.map((tower, idx) => (
                        <div key={idx} className="bg-slate-800/30 border border-slate-800 rounded-xl p-4 space-y-2">
                          <h4 className="text-sm font-bold text-white flex items-center justify-between">
                            <span>{tower.name}</span>
                            <span className="text-[10px] px-1.5 py-0.5 bg-slate-700 text-purple-300 rounded uppercase tracking-wider">{tower.phase}</span>
                          </h4>
                          <div className="text-[11px] text-slate-400 space-y-1">
                            <p>Configurations: <span className="font-semibold text-slate-300">{tower.configurations}</span></p>
                            <p>Total Floors: <span className="font-semibold text-slate-300">{tower.floors} Levels</span></p>
                            <p>Completion Date: <span className="font-semibold text-slate-300">{tower.completionDate}</span></p>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="bg-slate-800/40 border border-slate-700/50 p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div className="space-y-2">
                        <h4 className="text-base font-bold text-white flex items-center gap-1.5">
                          <CheckCircle2 className="w-5 h-5 text-emerald-400" /> Double Verified Construction Quality
                        </h4>
                        <p className="text-xs text-slate-400 max-w-lg">
                          Built using shear-wall Mivan shuttering framework. Reviews confirm 4.8/5.0 structural resilience and durability rating.
                        </p>
                      </div>
                      <button
                        onClick={() => setShowInteriorsModal(true)}
                        className="py-3 px-6 bg-purple-600 hover:bg-purple-700 text-xs font-bold text-white rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-purple-600/20"
                      >
                        <Shield className="w-4 h-4" /> View Technical Materials Spec-Sheet
                      </button>
                    </div>
                  </div>
                )}

                {isPlot && (
                  <div className="space-y-6">
                    <h3 className="text-base font-bold text-slate-200">Layout Infrastructure Specifications</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center justify-between p-3 bg-slate-800/30 border border-slate-800 rounded-lg">
                        <span className="text-slate-400">Road Width</span>
                        <span className="font-bold text-white">{plotInfrastructure.roadWidth} Ft. Wide Roads</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-slate-800/30 border border-slate-800 rounded-lg">
                        <span className="text-slate-400">Gated Boundary Wall</span>
                        <span className="font-bold text-white">{plotInfrastructure.gatedStatus ? 'Constructed Gated' : 'Open Plotting'}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-slate-800/30 border border-slate-800 rounded-lg">
                        <span className="text-slate-400">Water Supply</span>
                        <span className="font-bold text-white">{plotInfrastructure.waterLine}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-slate-800/30 border border-slate-800 rounded-lg">
                        <span className="text-slate-400">Electricity Lines</span>
                        <span className="font-bold text-white">{plotInfrastructure.electricityConnection}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Locality Amenities Section with Lead-Gen photos card */}
              <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-8 space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                      <Sparkles className="w-6 h-6 text-purple-400" /> Premium Curated Amenities
                    </h2>
                    <p className="text-slate-400 text-sm mt-1">Premium facilities, rare options, and high-end services</p>
                  </div>
                  <button
                    onClick={() => setShowAllAmenities(true)}
                    className="text-purple-400 hover:text-purple-300 text-xs font-bold transition-all"
                  >
                    View All
                  </button>
                </div>

                {/* Lead-gen card */}
                {!amenityRequestSuccess ? (
                  <div className="bg-gradient-to-r from-purple-900/40 to-slate-900 border border-purple-800/40 p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h4 className="text-sm font-bold text-white">Need actual photos of clubhouse & amenities?</h4>
                      <p className="text-xs text-slate-300 mt-1">Our on-site advisors can message you latest site images directly.</p>
                    </div>
                    <button
                      onClick={() => {
                        setAmenityRequestSuccess(true);
                        toast.success("Request submitted! We will send photos on WhatsApp shortly.");
                      }}
                      className="py-2.5 px-4 bg-purple-600 hover:bg-purple-700 text-xs font-bold text-white rounded-xl transition-all shadow"
                    >
                      Request Photos via WhatsApp
                    </button>
                  </div>
                ) : (
                  <div className="bg-emerald-950/30 border border-emerald-800/30 p-4 rounded-xl text-center text-xs text-emerald-400 font-semibold">
                    ✓ Request submitted. An advisor will contact you with latest photos shortly.
                  </div>
                )}

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {(property?.amenities?.length > 0 ? property.amenities.slice(0, 8) : ["Clubhouse", "Swimming Pool", "Biometric Lobby", "EV Charging Station", "Jogging Track", "24/7 Security", "Central Park", "Mini Theatre"]).map((am, i) => (
                    <div key={i} className="p-3 bg-slate-800/30 border border-slate-800 rounded-xl flex items-center gap-2.5 text-xs text-slate-200">
                      <div className="p-1.5 bg-purple-900/40 text-purple-400 rounded-lg">
                        <Check className="w-3.5 h-3.5" />
                      </div>
                      <span className="font-medium truncate">{am}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Section 4: Location, What Locals Said, Pros & Cons */}
              <div ref={sectionRefs['locality-sec']} className="bg-slate-900/40 border border-slate-800 rounded-3xl p-8 space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <MapPin className="w-6 h-6 text-purple-400" /> Locality Insights & Real Reviews
                  </h2>
                  <p className="text-slate-400 text-sm mt-1">What resident locals and safety maps tell about this sector</p>
                </div>

                {/* Map Preview Mock */}
                <div className="relative h-48 w-full rounded-2xl overflow-hidden border border-slate-800 bg-slate-900">
                  <div className="absolute inset-0 opacity-40 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:16px_16px]"></div>
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center space-y-2">
                    <div className="p-3 bg-purple-600 text-white rounded-full animate-bounce shadow-lg shadow-purple-600/30">
                      <MapPin className="w-6 h-6" />
                    </div>
                    <p className="text-xs font-bold text-slate-200 mt-2">{property?.address?.locality}, {property?.address?.city}</p>
                    <p className="text-[10px] text-slate-400">Interactive geo-map features loaded upon request</p>
                  </div>
                </div>

                {/* What Locals Said Cards Slider */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-purple-400">Locality Sentiments Insights</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {localSentiments.slice(0, 2).map((item, idx) => (
                      <div key={idx} className="bg-slate-800/30 border border-slate-800 p-4 rounded-xl space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-slate-200">{item.label}</span>
                          <span className="text-sm font-extrabold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">{item.value} positive</span>
                        </div>
                        <p className="text-xs text-slate-400">{item.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Pros and cons list widget */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-800/60">
                  <div className="space-y-3">
                    <h4 className="text-sm font-bold text-emerald-400 flex items-center gap-1.5">
                      <ThumbsUp className="w-4 h-4" /> Locality Positives (Pros)
                    </h4>
                    <ul className="space-y-2 text-xs text-slate-300">
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
                    <ul className="space-y-2 text-xs text-slate-300">
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
                    className="text-xs font-bold text-purple-400 hover:text-purple-300 transition-colors"
                  >
                    View detailed pros & cons analysis page
                  </button>
                </div>
              </div>

              {/* Locality reviews list widget */}
              <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-8 space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <MessageSquare className="w-6 h-6 text-purple-400" /> Locality Reviews
                  </h2>
                  <p className="text-slate-400 text-sm mt-1">Verified testimonials from people living in this zone</p>
                </div>

                <div className="flex flex-wrap gap-2 py-2">
                  {localityReviewsMock.tagCloud.map((tag, idx) => (
                    <span key={idx} className="px-3 py-1 bg-slate-800/80 border border-slate-700/60 rounded-full text-xs text-slate-300 font-medium">
                      #{tag}
                    </span>
                  ))}
                </div>

                <div className="space-y-4">
                  {localityReviewsMock.list.map((rev, idx) => (
                    <div key={idx} className="bg-slate-800/20 border border-slate-800/60 p-5 rounded-2xl space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-bold text-white">{rev.author}</h4>
                          <span className="text-[10px] text-slate-400">{rev.role}</span>
                        </div>
                        <div className="flex items-center gap-0.5 text-amber-400">
                          {Array.from({ length: rev.stars }).map((_, i) => (
                            <Star key={i} className="w-3.5 h-3.5 fill-current" />
                          ))}
                        </div>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed italic">
                        "{rev.text}"
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Section 5: Builder Profile & Details */}
              <div ref={sectionRefs['builder-sec']} className="bg-slate-900/40 border border-slate-800 rounded-3xl p-8 space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700/80 p-2 flex items-center justify-center overflow-hidden">
                      <img src={builderTrackRecord.logo} alt={builderTrackRecord.name} className="w-full h-full object-contain" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-white flex items-center gap-1.5">
                        {builderTrackRecord.name} <Award className="w-5 h-5 text-purple-400" />
                      </h2>
                      <p className="text-slate-400 text-xs mt-0.5">Premium developer partner with Get-Right-home</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowEnquiryModal(true)}
                    className="py-2.5 px-5 bg-slate-850 hover:bg-slate-800 border border-slate-750 text-xs font-bold text-slate-200 rounded-xl transition-all"
                  >
                    Direct Callback
                  </button>
                </div>

                <p className="text-slate-300 text-sm leading-relaxed">{builderTrackRecord.summary}</p>

                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="bg-slate-800/30 p-3 rounded-xl border border-slate-800/80">
                    <span className="text-xs text-slate-400 block font-medium">Experience</span>
                    <span className="text-lg font-bold text-purple-400 mt-1 block">{builderTrackRecord.experience} Years</span>
                  </div>
                  <div className="bg-slate-800/30 p-3 rounded-xl border border-slate-800/80">
                    <span className="text-xs text-slate-400 block font-medium">Ongoing Projects</span>
                    <span className="text-lg font-bold text-purple-400 mt-1 block">{builderTrackRecord.ongoingCount} Sites</span>
                  </div>
                  <div className="bg-slate-800/30 p-3 rounded-xl border border-slate-800/80">
                    <span className="text-xs text-slate-400 block font-medium">Completed</span>
                    <span className="text-lg font-bold text-purple-400 mt-1 block">{builderTrackRecord.completedCount} Deliveries</span>
                  </div>
                </div>
              </div>

              {/* Comparison Engine Callout widget */}
              <div className="bg-gradient-to-r from-purple-950/20 via-slate-900 to-slate-900 border border-purple-900/40 p-6 rounded-3xl space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-purple-600/10 text-purple-400 rounded-2xl border border-purple-500/20">
                    <Compass className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Compare against similar Hyderabad projects</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Evaluate structural density, green percentages, and pricing side-by-side.</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-4 pt-2">
                  <button
                    onClick={() => setShowComparisonMatrix(true)}
                    className="py-2.5 px-5 bg-purple-600 hover:bg-purple-700 text-xs font-bold text-white rounded-xl transition-all shadow-md shadow-purple-600/20"
                  >
                    Open Detailed Matrix Page
                  </button>
                </div>
              </div>

            </div>

            {/* Right Column (Sticky Side Panel) */}
            <div className="space-y-6 lg:sticky lg:top-[120px] self-start h-auto">
              
              {/* Main Booking/Lead Panel */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-white">Enquire About This Project</h3>
                  <p className="text-xs text-slate-400 mt-1">Get-Right-home verified agent callback within 15 minutes</p>
                </div>

                <div className="space-y-4">
                  <div className="p-4 bg-slate-800/40 border border-slate-700/30 rounded-2xl flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">Verified Phone Contact</span>
                      <span className="text-sm font-bold text-white block mt-0.5">
                        {revealedNumber ? revealedNumber : "••••••••••"}
                      </span>
                    </div>
                    <button
                      onClick={handleRevealContact}
                      disabled={revealLoading}
                      className="py-2 px-4 bg-purple-600/20 hover:bg-purple-600/35 border border-purple-500/30 text-xs font-bold text-purple-300 rounded-xl transition-all flex items-center gap-1"
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
                      className="w-full py-4 bg-purple-600 hover:bg-purple-700 text-sm font-bold text-white rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-600/30"
                    >
                      <MessageSquare className="w-4 h-4" /> Schedule Visit / Callback
                    </button>
                    <a
                      href={`https://wa.me/91${revealedNumber || property?.contactNumber || ''}?text=I%20am%20interested%20in%20${encodeURIComponent(property?.propertyName || 'Handpicked Project')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-3.5 bg-slate-800 hover:bg-slate-750 border border-slate-700 text-sm font-semibold text-slate-200 rounded-2xl transition-all flex items-center justify-center gap-2"
                    >
                      <Phone className="w-4 h-4 text-emerald-400" /> WhatsApp Direct Chat
                    </a>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-800/80 text-[11px] text-slate-400 space-y-2.5">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-purple-400 flex-shrink-0" />
                    <span>Get-Right-home zero-brokerage guarantee.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Info className="w-4 h-4 text-purple-400 flex-shrink-0" />
                    <span>Real-time pricing synced with developer catalog.</span>
                  </div>
                </div>
              </div>

              {/* Similar properties shortcut panel */}
              {similarProperties.length > 0 && (
                <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 space-y-4">
                  <h3 className="text-sm font-bold text-slate-200">Other Handpicked Near Locality</h3>
                  <div className="space-y-3">
                    {similarProperties.slice(0, 3).map((sim, idx) => (
                      <div
                        key={idx}
                        onClick={() => navigate(`/handpicked/${sim._id}`)}
                        className="flex gap-3 p-2 bg-slate-900/80 border border-slate-800 rounded-xl hover:border-purple-500/30 transition-all cursor-pointer"
                      >
                        <div className="w-16 h-16 rounded-lg overflow-hidden bg-slate-800 flex-shrink-0">
                          <img src={sim.coverImage || NO_IMAGE_PLACEHOLDER} className="w-full h-full object-cover" alt="" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-white truncate">{sim.propertyName}</h4>
                          <p className="text-[10px] text-slate-400 mt-0.5">{sim.address?.locality}</p>
                          <span className="text-[11px] font-bold text-purple-400 mt-1 block">
                            ₹{sim.buyDetails?.price ? (sim.buyDetails.price / 10000000).toFixed(2) : '1.10'} Cr+
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Properties Tab Active - Vertical List of Individual Units */
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/40 border border-slate-800 p-6 rounded-3xl">
              <div>
                <h3 className="text-xl font-bold text-white">Specific Available Units</h3>
                <p className="text-slate-400 text-sm mt-1">Review specific unit floors, facing, configurations currently available</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Sort:</span>
                <select className="bg-slate-800 border border-slate-755 text-xs text-slate-200 p-2.5 rounded-xl outline-none">
                  <option>Price: Low to High</option>
                  <option>Price: High to Low</option>
                  <option>Area: Largest First</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
              {availableUnitsList.map((unit, idx) => (
                <div key={idx} className="bg-slate-900/60 border border-slate-850 rounded-3xl overflow-hidden hover:border-purple-500/30 transition-all flex flex-col md:flex-row gap-6 p-6">
                  <div className="w-full md:w-80 h-48 rounded-2xl overflow-hidden bg-slate-800 flex-shrink-0">
                    <img src={unit.images?.[0] || NO_IMAGE_PLACEHOLDER} className="w-full h-full object-cover" alt="" />
                  </div>
                  <div className="flex-grow flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="px-2.5 py-0.5 bg-purple-900/40 border border-purple-800/40 text-purple-300 text-[10px] font-bold rounded uppercase tracking-wide">
                            {unit.roomCategory || 'Unit'}
                          </span>
                          <h4 className="text-lg font-bold text-white mt-1">{unit.name}</h4>
                        </div>
                        <div className="text-right">
                          <span className="text-xl font-extrabold text-purple-400">
                            ₹{(unit.pricePerNight / 10000000).toFixed(2)} Cr
                          </span>
                          <span className="text-[10px] text-slate-400 block mt-0.5">All-inclusive Estimate</span>
                        </div>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        {unit.description}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-4 items-center justify-between pt-4 border-t border-slate-800/60">
                      <div className="flex gap-4 text-xs text-slate-400">
                        <span>Config: <strong className="text-slate-200">{unit.bedsPerRoom} BHK</strong></span>
                        <span>•</span>
                        <span>Capacity: <strong className="text-slate-200">{unit.maxAdults} Adults</strong></span>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => {
                            toast.success("Brochure download started!");
                          }}
                          className="py-2 px-4 bg-slate-800 hover:bg-slate-750 text-xs font-bold text-slate-200 rounded-xl transition-all"
                        >
                          Download Brochure
                        </button>
                        <button
                          onClick={() => setShowEnquiryModal(true)}
                          className="py-2.5 px-5 bg-purple-600 hover:bg-purple-700 text-xs font-bold text-white rounded-xl transition-all shadow-md shadow-purple-600/25"
                        >
                          Request Callback
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Sticky Bottom Action Bar for Desktop/Mobile Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-slate-900/90 backdrop-blur-xl border-t border-slate-800 py-4 px-6 z-40 shadow-2xl"><div className="flex items-center justify-between max-w-7xl mx-auto">
        <div className="hidden sm:block">
          <p className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase">Project starting at</p>
          <p className="text-2xl font-extrabold text-purple-400">
            ₹{property?.buyDetails?.price ? (property.buyDetails.price / 10000000).toFixed(2) : '1.25'} Cr
          </p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <button
            onClick={() => {
              toast.success("Download started! Project brochure saved successfully.");
            }}
            className="flex-1 sm:flex-initial py-3.5 px-6 bg-slate-800 hover:bg-slate-750 border border-slate-700 text-xs font-bold text-slate-200 rounded-xl transition-all flex items-center justify-center gap-2"
          >
            <FileText className="w-4 h-4 text-purple-400" /> Brochure
          </button>
          <button
            onClick={() => setShowEnquiryModal(true)}
            className="flex-1 sm:flex-initial py-3.5 px-8 bg-purple-600 hover:bg-purple-700 text-xs font-bold text-white rounded-xl transition-all shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2"
          >
            <MessageSquare className="w-4 h-4" /> Book Consultation Call
          </button>
        </div>
      </div></div>

      {/* MODALS & BOTTOM SHEETS */}
      <AnimatePresence>
        
        {/* Floor Plan Modal */}
        {selectedFloorPlan && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/60 backdrop-blur-md">
                <div>
                  <h3 className="text-xl font-bold text-white">{selectedFloorPlan.configType} Layout</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Configured dimensions and carpet values</p>
                </div>
                <button
                  onClick={() => setSelectedFloorPlan(null)}
                  className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 rounded-full transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2">
                <div className="p-6 flex flex-col justify-center bg-slate-950 border-r border-slate-800">
                  <div className="relative aspect-video rounded-xl overflow-hidden border border-slate-800 bg-slate-900/50 flex items-center justify-center">
                    <img
                      src={selectedFloorPlan.image || "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&auto=format&fit=crop&q=80"}
                      className="w-full h-full object-cover opacity-80"
                      alt=""
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-4">
                      <span className="text-[10px] text-purple-300 font-semibold bg-purple-900/40 border border-purple-800/40 px-2 py-0.5 rounded uppercase">2D Architectural Plan</span>
                    </div>
                  </div>
                </div>

                <div className="p-6 space-y-6 flex flex-col justify-between">
                  <div className="space-y-4">
                    <h4 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Layout Dimensions Sizing</h4>
                    <div className="space-y-2.5 max-h-56 overflow-y-auto pr-2 scrollbar-none">
                      {selectedFloorPlan.rooms ? (
                        selectedFloorPlan.rooms.map((rm, i) => (
                          <div key={i} className="flex justify-between items-center text-xs p-2.5 bg-slate-800/30 border border-slate-800 rounded-lg">
                            <span className="text-slate-400 font-medium">{rm.name}</span>
                            <span className="font-bold text-slate-200">{rm.dimensions}</span>
                          </div>
                        ))
                      ) : (
                        <>
                          <div className="flex justify-between items-center text-xs p-2.5 bg-slate-800/30 border border-slate-800 rounded-lg">
                            <span className="text-slate-400 font-medium">Carpet Sizing</span>
                            <span className="font-bold text-slate-200">
                              {sqftUnit ? `${selectedFloorPlan.carpetArea} sqft` : `${(selectedFloorPlan.carpetArea * 0.0929).toFixed(1)} sqm`}
                            </span>
                          </div>
                          {selectedFloorPlan.facing && (
                            <div className="flex justify-between items-center text-xs p-2.5 bg-slate-800/30 border border-slate-800 rounded-lg">
                              <span className="text-slate-400 font-medium">Facing</span>
                              <span className="font-bold text-slate-200">{selectedFloorPlan.facing}</span>
                            </div>
                          )}
                          {selectedFloorPlan.dimensions && (
                            <div className="flex justify-between items-center text-xs p-2.5 bg-slate-800/30 border border-slate-800 rounded-lg">
                              <span className="text-slate-400 font-medium">Dimensions</span>
                              <span className="font-bold text-slate-200">{selectedFloorPlan.dimensions}</span>
                            </div>
                          )}
                          {selectedFloorPlan.boundaryWall !== undefined && (
                            <div className="flex justify-between items-center text-xs p-2.5 bg-slate-800/30 border border-slate-800 rounded-lg">
                              <span className="text-slate-400 font-medium">Boundary Wall</span>
                              <span className="font-bold text-slate-200">{selectedFloorPlan.boundaryWall ? 'Made' : 'Not Made'}</span>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-xs">
                    <span className="text-slate-400">Estimated Sizing Price</span>
                    <span className="text-lg font-bold text-purple-400">
                      ₹{(selectedFloorPlan.price / 10000000).toFixed(2)} Cr+
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Payment Plan Milestones Modal */}
        {selectedPaymentPlan && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-bold text-white">Payment Milestones Breakdown</h3>
                  <p className="text-xs text-slate-400 mt-0.5">{selectedPaymentPlan.planName}</p>
                </div>
                <button
                  onClick={() => setSelectedPaymentPlan(null)}
                  className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 rounded-full transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto pr-2 scrollbar-none">
                {selectedPaymentPlan.milestones?.map((milestone, idx) => (
                  <div key={idx} className="flex gap-4 items-start p-3 bg-slate-800/30 border border-slate-800 rounded-xl">
                    <div className="w-12 h-12 bg-purple-900/40 text-purple-400 border border-purple-800/40 rounded-xl flex items-center justify-center font-black flex-shrink-0">
                      {milestone.percentage}%
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Milestone Stage {idx + 1}</p>
                      <h4 className="text-xs font-bold text-slate-200 mt-0.5">{milestone.description}</h4>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}

        {/* Highlights Bottom Sheet / Modal */}
        {showAllHighlights && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-bold text-white">Full Highlights & USPs</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Analyst verified list of unique selling points</p>
                </div>
                <button
                  onClick={() => setShowAllHighlights(false)}
                  className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 rounded-full transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-3.5 max-h-[60vh] overflow-y-auto pr-2 scrollbar-none">
                {propertyHighlights.map((hl, i) => (
                  <div key={i} className="flex gap-3 items-start p-3 bg-slate-800/35 border border-slate-800 rounded-xl">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
                    <span className="text-xs text-slate-200">{hl}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}

        {/* Full Amenities sheet */}
        {showAllAmenities && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-bold text-white">Full Amenities Catalog</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Categorized list of project features & common amenities</p>
                </div>
                <button
                  onClick={() => setShowAllAmenities(false)}
                  className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 rounded-full transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 grid grid-cols-2 md:grid-cols-3 gap-4 max-h-[60vh] overflow-y-auto pr-2 scrollbar-none">
                {(property?.amenities?.length > 0 ? property.amenities : ["Clubhouse", "Swimming Pool", "Biometric Lobby", "EV Charging Station", "Jogging Track", "24/7 Security", "Central Park", "Mini Theatre", "Gymnasium", "Indoor Squash Court", "Kid's Play Area", "Visitor's Lounge"]).map((am, i) => (
                  <div key={i} className="p-3 bg-slate-800/40 border border-slate-800 rounded-xl flex items-center gap-2.5 text-xs text-slate-200">
                    <div className="p-1 bg-purple-900/40 text-purple-400 rounded">
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
          <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/60 backdrop-blur-md">
                <div>
                  <h3 className="text-xl font-bold text-white flex items-center gap-1.5">
                    <Shield className="w-5.5 h-5.5 text-purple-400" /> Technical Material Spec-Sheet
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">Detailed engineering materials, doors, wiring specifications</p>
                </div>
                <button
                  onClick={() => setShowInteriorsModal(false)}
                  className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 rounded-full transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex border-b border-slate-800 overflow-x-auto scrollbar-none text-xs font-semibold">
                {Object.keys(constructionSpecs).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveInteriorTab(tab)}
                    className={`px-5 py-3 transition-colors capitalize ${
                      activeInteriorTab === tab ? 'text-purple-400 border-b-2 border-purple-500' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              <div className="p-6 space-y-4 max-h-[50vh] overflow-y-auto scrollbar-none">
                <div className="bg-slate-955 rounded-2xl p-5 border border-slate-800/80">
                  <h4 className="text-sm font-bold text-slate-200 capitalize">{activeInteriorTab} Specifications</h4>
                  <div className="mt-3.5 space-y-3">
                    {Object.entries(constructionSpecs[activeInteriorTab] || {}).map(([key, val]) => (
                      <div key={key} className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 text-xs p-3 bg-slate-800/35 border border-slate-800 rounded-xl">
                        <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px] w-40 flex-shrink-0">{key.replace(/([A-Z])/g, ' $1')}</span>
                        <span className="text-slate-200 font-medium sm:text-right">{val}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-purple-900/10 border border-purple-800/30 p-4 rounded-xl flex items-start gap-2.5 text-xs text-purple-300">
                  <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>Quality checked on site by Get-Right-home construction auditing team. ISO 9001 certifications verified.</span>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {/* Detailed Pros & Cons full screen Modal */}
        {showProsConsModal && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-slate-800 flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold text-white flex items-center gap-1.5">
                    <TrendingUp className="w-5.5 h-5.5 text-purple-400" /> Locality Positives & Concerns Matrix
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">Analyzed by community residents & traffic telemetry</p>
                </div>
                <button
                  onClick={() => setShowProsConsModal(false)}
                  className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 rounded-full transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[60vh] overflow-y-auto scrollbar-none">
                <div className="space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                    <ThumbsUp className="w-4 h-4" /> Locality Positives
                  </h4>
                  <div className="space-y-2.5">
                    {localityPros.map((pro, idx) => (
                      <div key={idx} className="p-3 bg-emerald-950/15 border border-emerald-900/30 rounded-xl text-xs text-slate-300 leading-relaxed">
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
                      <div key={idx} className="p-3 bg-amber-950/15 border border-amber-900/30 rounded-xl text-xs text-slate-300 leading-relaxed">
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
          <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl"
            >
              <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-900/60 backdrop-blur-md">
                <div>
                  <h3 className="text-base sm:text-xl font-bold text-white flex items-center gap-1.5">
                    <Compass className="w-5 h-5 text-purple-400" /> Project Comparison Matrix
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">Evaluate density, green area, and pricing side-by-side</p>
                </div>
                <button
                  onClick={() => setShowComparisonMatrix(false)}
                  className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 rounded-full transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 sm:p-6 overflow-auto max-h-[70vh] scrollbar-none">
                <table className="min-w-[520px] w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-800">
                      <th className="py-4 px-3 font-semibold text-slate-400 text-left w-48">Key Metric</th>
                      <th className="py-4 px-3 font-bold text-purple-400 border-x border-purple-500/20 bg-purple-500/5">{property?.propertyName || 'This Property'}</th>
                      {similarProperties.slice(0, 2).map((sim, i) => (
                        <th key={i} className="py-4 px-3 font-bold text-slate-200">{sim.propertyName}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-slate-800 hover:bg-slate-800/20">
                      <td className="py-3.5 px-3 text-slate-400 font-medium">Estimated Pricing</td>
                      <td className="py-3.5 px-3 font-bold text-white border-x border-purple-500/20 bg-purple-500/5">
                        ₹{property?.buyDetails?.price ? (property.buyDetails.price / 10000000).toFixed(2) : '1.25'} Cr+
                      </td>
                      {similarProperties.slice(0, 2).map((sim, i) => (
                        <td key={i} className="py-3.5 px-3 font-medium text-slate-300">
                          ₹{sim.buyDetails?.price ? (sim.buyDetails.price / 10000000).toFixed(2) : '1.10'} Cr+
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b border-slate-800 hover:bg-slate-800/20">
                      <td className="py-3.5 px-3 text-slate-400 font-medium">Architectural Density</td>
                      <td className="py-3.5 px-3 font-bold text-white border-x border-purple-500/20 bg-purple-500/5">{densityType} ({projectDensity})</td>
                      {similarProperties.slice(0, 2).map((sim, i) => (
                        <td key={i} className="py-3.5 px-3 text-slate-300">{sim.dynamicData?.densityType || '65 units/acre'}</td>
                      ))}
                    </tr>
                    <tr className="border-b border-slate-800 hover:bg-slate-800/20">
                      <td className="py-3.5 px-3 text-slate-400 font-medium">Total Area Spread</td>
                      <td className="py-3.5 px-3 font-bold text-white border-x border-purple-500/20 bg-purple-500/5">{totalArea} Acres</td>
                      {similarProperties.slice(0, 2).map((sim, i) => (
                        <td key={i} className="py-3.5 px-3 text-slate-300">{sim.dynamicData?.totalArea || '8.20'} Acres</td>
                      ))}
                    </tr>
                    <tr className="border-b border-slate-800 hover:bg-slate-800/20">
                      <td className="py-3.5 px-3 text-slate-400 font-medium">Green Open Area</td>
                      <td className="py-3.5 px-3 font-bold text-white border-x border-purple-500/20 bg-purple-500/5">{openAreaPercentage}%</td>
                      {similarProperties.slice(0, 2).map((sim, i) => (
                        <td key={i} className="py-3.5 px-3 text-slate-300">{sim.dynamicData?.openAreaPercentage || '60'}%</td>
                      ))}
                    </tr>
                    <tr className="border-b border-slate-800 hover:bg-slate-800/20">
                      <td className="py-3.5 px-3 text-slate-400 font-medium">Structure Towers count</td>
                      <td className="py-3.5 px-3 font-bold text-white border-x border-purple-500/20 bg-purple-500/5">{totalTowers} Towers</td>
                      {similarProperties.slice(0, 2).map((sim, i) => (
                        <td key={i} className="py-3.5 px-3 text-slate-300">{sim.dynamicData?.totalTowers || '6'} Towers</td>
                      ))}
                    </tr>
                    <tr className="border-b border-slate-800 hover:bg-slate-800/20">
                      <td className="py-3.5 px-3 text-slate-400 font-medium">Locality Positives</td>
                      <td className="py-3.5 px-3 font-bold text-white border-x border-purple-500/20 bg-purple-500/5">{localityPros.length} Pros listed</td>
                      {similarProperties.slice(0, 2).map((sim, i) => (
                        <td key={i} className="py-3.5 px-3 text-slate-300">{sim.dynamicData?.localityPros?.length || '4'} Pros</td>
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
          <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl p-6 space-y-6"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-bold text-white">Schedule Callback Consultation</h3>
                  <p className="text-xs text-slate-400 mt-1">Get-Right-home verified agent response within 15 minutes</p>
                </div>
                <button
                  onClick={() => setShowEnquiryModal(false)}
                  className="p-1.5 bg-slate-850 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-full transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleEnquirySubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Your Full Name</label>
                  <input
                    type="text"
                    required
                    value={enquiryForm.name}
                    onChange={(e) => setEnquiryForm({ ...enquiryForm, name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-xs text-slate-200 outline-none focus:border-purple-500 transition-all"
                    placeholder="Enter your name"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Active Phone Number</label>
                  <input
                    type="tel"
                    required
                    value={enquiryForm.phone}
                    onChange={(e) => setEnquiryForm({ ...enquiryForm, phone: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-xs text-slate-200 outline-none focus:border-purple-500 transition-all"
                    placeholder="Enter 10-digit Indian phone number"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Email Address</label>
                  <input
                    type="email"
                    value={enquiryForm.email}
                    onChange={(e) => setEnquiryForm({ ...enquiryForm, email: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-xs text-slate-200 outline-none focus:border-purple-500 transition-all"
                    placeholder="name@example.com (Optional)"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Custom Message</label>
                  <textarea
                    rows="3"
                    value={enquiryForm.message}
                    onChange={(e) => setEnquiryForm({ ...enquiryForm, message: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-xs text-slate-200 outline-none focus:border-purple-500 transition-all resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={enquirySubmitting}
                  className="w-full py-4 bg-purple-600 hover:bg-purple-750 text-xs font-bold text-white rounded-xl transition-all shadow flex items-center justify-center gap-1.5"
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

      </AnimatePresence>
    </div>
  );
};

export default HandpickedDetailsPage;
