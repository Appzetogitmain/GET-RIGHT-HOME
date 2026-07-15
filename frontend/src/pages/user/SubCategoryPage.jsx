import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeft,
    Search,
    ShoppingCart,
    Plus,
    Minus,
    CheckCircle2,
    Info,
    Star,
    ChevronRight,
    Layers,
    Check,
    X,
    User,
    CalendarCheck,
    Ruler,
    Paintbrush,
    Sparkles,
    Smartphone,
    PlayCircle,
    Maximize2,
} from 'lucide-react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { publicCatalogService } from '../../homster/services/catalogService';
import { useCart } from '../../homster/context/CartContext';
import { useCity } from '../../homster/context/CityContext';
import { toast } from 'react-hot-toast';

const toAssetUrl = (url) => {
    if (!url) return '';
    const clean = url.replace('/api/upload', '/upload');
    if (clean.startsWith('http')) return clean;
    const base = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000').replace(/\/api$/, '');
    return `${base}${clean.startsWith('/') ? '' : '/'}${clean}`;
};

const CUSTOMER_REVIEWS = [
    {
        id: 1,
        name: "Aditya Sharma",
        avatar: "https://images.unsplash.com/photo-1531427186611-ecfd6d936c79?w=150&h=150&fit=crop&crop=faces",
        rating: 5,
        review: "I had tenants vacating my 2BHK, and the walls had stains and dull patches. I needed a fresh coat of paint before renting it out again. Get Right Home painting team did a fantastic job in just two days, and the house looked fresh and new. My new tenants moved in without any complaints. The pricing was under my budget, and the team was very professional. Definitely using their service again!"
    },
    {
        id: 2,
        name: "Vikram Patel",
        avatar: "https://images.unsplash.com/photo-1618077360395-f3068be8e001?w=150&h=150&fit=crop&crop=faces",
        rating: 5,
        review: "The quality of work and attention to detail were amazing! The team helped me choose the perfect colors, and the final result was beyond my expectations. My house looks fresh and vibrant, just like new. The paint finish is smooth and perfect. Highly recommended for anyone looking for reliable painters!"
    },
    {
        id: 3,
        name: "Sanjay Gupta",
        avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&h=150&fit=crop&crop=faces",
        rating: 5,
        review: "Our house in Delhi needed exterior painting as the old paint had faded and started peeling due to the weather. After checking multiple options, we got the best quote from Get Right Home without compromising on quality. The team used high-quality, weather-resistant paint, and the finish was flawless. Now, our home looks fresh and modern. We were so happy with the service that we recommended it to all our neighbors!"
    },
    {
        id: 4,
        name: "Rohan Mehta",
        avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=faces",
        rating: 5,
        review: "Booked Painting services from Get Right Home. It was a hassle-free experience. They came, they painted, and they cleaned up perfectly. Impressive to see, they even cleaned the switchboards and cleared the paint marks after the painting was done. Very good service overall."
    }
];

const FAQS = [
    {
        question: "What if I'm not satisfied with the final painting result?",
        answer: "We offer complete satisfaction assurance. If needed, our team revisits and fixes any concerns at no extra cost."
    },
    {
        question: "Do I need to move my furniture before the painting service begins?",
        answer: "Get Right Home's team will carefully cover and shift furniture to protect your belongings during the project."
    },
    {
        question: "Are the paints you use safe for my family and the environment?",
        answer: "Yes, we use eco-friendly, low-VOC paints to ensure healthy indoor air and a sustainable home."
    },
    {
        question: "Is there a warranty on your painting services?",
        answer: "Yes, we provide service warranties to cover workmanship and ensure long-term satisfaction."
    },
    {
        question: "Do you handle cleaning and post-painting cleanup?",
        answer: "Yes, our painting service includes full cleanup after painting, leaving your space spotless and ready."
    },
    {
        question: "Can I book painting services for a commercial property?",
        answer: "Yes, we handle both residential and commercial painting projects across Delhi."
    },
    {
        question: "How long does it take to paint a typical 2BHK apartment?",
        answer: "Typically, 4-6 days, depending on wall condition, the number of coats, and the chosen paint type."
    },
    {
        question: "What is the recommended paint type for painting home interiors?",
        answer: "Acrylic or latex emulsion paints are best for interiors, durable, washable, and long-lasting."
    },
    {
        question: "Can I choose eco-friendly paints for my home painting project?",
        answer: "Yes, we offer eco-safe, odour-free paints that enhance air quality without compromising on finish."
    },
    {
        question: "What other costs should I consider when painting my house?",
        answer: "Include wall repairs, primer, furniture protection, and any decorative finishes like texture painting."
    }
];

const SubCategoryPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { cartItems, cartCount, addToCart, removeItem } = useCart();
    const { currentCity } = useCity();

    // Data passed via navigation state
    const { subCategory, category } = location.state || {};

    const [services, setServices] = useState([]);
    const [exploreCategories, setExploreCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [redirecting, setRedirecting] = useState(false);
    const [highlightedServiceId, setHighlightedServiceId] = useState(null);
    const [selectedTexture, setSelectedTexture] = useState(null);
    const [selectedIdea, setSelectedIdea] = useState(null);
    const [expandedFaq, setExpandedFaq] = useState(null);
    
    const toggleFaq = (index) => {
        setExpandedFaq(expandedFaq === index ? null : index);
    };
    
    // Story Viewer State
    const [storyViewerOpen, setStoryViewerOpen] = useState(false);
    const [currentProjectIndex, setCurrentProjectIndex] = useState(0);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [storyProgress, setStoryProgress] = useState(0);

    // Typewriter effect state
    const [placeholderText, setPlaceholderText] = useState('');
    const [wordIndex, setWordIndex] = useState(0);
    const [charIndex, setCharIndex] = useState(0);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        const words = services.length > 0
            ? services.map(s => `Search "${s.title}"...`)
            : [`Search in ${subCategory?.title || 'services'}...`];

        if (!words.length) return;

        const currentWord = words[wordIndex % words.length];

        const timeout = setTimeout(() => {
            if (!isDeleting) {
                if (charIndex < currentWord.length) {
                    setPlaceholderText(prev => prev + currentWord[charIndex]);
                    setCharIndex(prev => prev + 1);
                } else {
                    setTimeout(() => setIsDeleting(true), 1500);
                }
            } else {
                if (charIndex > 0) {
                    setPlaceholderText(prev => prev.slice(0, -1));
                    setCharIndex(prev => prev - 1);
                } else {
                    setIsDeleting(false);
                    setWordIndex(prev => prev + 1);
                }
            }
        }, isDeleting ? 40 : 100);

        return () => clearTimeout(timeout);
    }, [charIndex, isDeleting, wordIndex, services, subCategory]);



    useEffect(() => {
        if (!subCategory) {
            navigate(-1);
            return;
        }
        fetchServices();
    }, [subCategory, category]);

    const fetchServices = async () => {
        try {
            setLoading(true);
            const subCatId = subCategory?.id || subCategory?._id;
            const catId = category?.id || category?._id;
            const response = await publicCatalogService.getServices({
                subCategoryId: category?.slug === 'home-painting' ? undefined : subCatId,
                categoryId: catId,
            });
            if (response.success) {
                setServices(response.services || []);
            }

            const cityId = currentCity?._id || currentCity?.id;
            const catRes = await publicCatalogService.getCategories(cityId);
            if (catRes?.success) {
                const allCats = catRes.categories || catRes.data || [];
                setExploreCategories(allCats.filter(c => (c.id || c._id) !== catId));
            }
        } catch (error) {
            console.error('Failed to load services:', error);
            toast.error('Failed to load services');
        } finally {
            setLoading(false);
        }
    };

    const regularServices = services.filter(svc => !svc.isTexture && !svc.isIdea && !svc.isRecentProject);
    const textureServices = services.filter(svc => svc.isTexture);
    const ideaServices = services.filter(svc => svc.isIdea);
    const recentProjects = services.filter(svc => svc.isRecentProject);

    // Story Auto-Advance Logic
    useEffect(() => {
        let timer;
        if (storyViewerOpen && recentProjects.length > 0) {
            timer = setInterval(() => {
                setStoryProgress(prev => {
                    if (prev >= 100) {
                        const currentProject = recentProjects[currentProjectIndex];
                        const totalImages = currentProject.projectImages?.length || (currentProject.imageUrl ? 1 : 0);
                        
                        if (currentImageIndex < totalImages - 1) {
                            setCurrentImageIndex(idx => idx + 1);
                            return 0;
                        } else {
                            if (currentProjectIndex < recentProjects.length - 1) {
                                setCurrentProjectIndex(idx => idx + 1);
                                setCurrentImageIndex(0);
                                return 0;
                            } else {
                                setStoryViewerOpen(false);
                                return 0;
                            }
                        }
                    }
                    return prev + 2.5; // Complete in ~2.4 seconds
                });
            }, 60);
        }
        return () => clearInterval(timer);
    }, [storyViewerOpen, currentProjectIndex, currentImageIndex, recentProjects]);

    const filteredServices = regularServices.filter(svc =>
        svc.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        svc.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleCartToggle = async (service) => {
        const serviceId = service.id || service._id;
        const existingItem = cartItems.find(item => item.serviceId === serviceId);

        if (existingItem) {
            try {
                const response = await removeItem(existingItem._id || existingItem.id);
                if (response.success) {
                    toast.success('Removed from cart');
                } else {
                    toast.error('Failed to remove from cart');
                }
            } catch (error) {
                console.error('Failed to remove item:', error);
                toast.error('Failed to remove from cart');
            }
        } else {
            try {
                const cartItemData = {
                    serviceId: serviceId,
                    categoryId: category?.id || category?._id,
                    subCategoryId: subCategory?.id || subCategory?._id,
                    title: service.title,
                    description: service.description || '',
                    icon: toAssetUrl(service.icon || service.imageUrl || subCategory?.iconUrl || ''),
                    category: category?.title,
                    subCategory: category?.slug === 'home-painting' ? category?.title : subCategory?.title,
                    price: service.discountPrice || service.basePrice || service.price,
                    unitPrice: service.discountPrice || service.basePrice || service.price,
                    serviceCount: 1,
                };

                const response = await addToCart(cartItemData);
                if (response.success) {
                    toast.success('Added to cart!');
                } else {
                    toast.error(response.message || 'Failed to add to cart');
                }
            } catch (error) {
                toast.error('Failed to add to cart');
            }
        }
    };

    if (!subCategory) return null;

    return (
        <div className="min-h-screen bg-[#F8FAFC] pb-24 font-sans">
            {/* Parent Wrapper with NO overflow-hidden to prevent search bar clipping */}
            <div className="relative w-full">
                {/* Full-Width Edge-to-Edge Premium Banner Container (handles overflow-hidden and rounded bottom corners) */}
                <div className="relative w-full h-[64vw] sm:h-80 bg-gray-150 overflow-hidden shadow-sm rounded-b-[2.5rem] sm:rounded-b-[3rem]">
                    {(subCategory?.bannerUrl || subCategory?.bannerImage || subCategory?.imageUrl) ? (
                        <img
                            src={toAssetUrl(subCategory.bannerUrl || subCategory.bannerImage || subCategory.imageUrl)}
                            alt={subCategory.title}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        /* Fallback Banner Gradient */
                        <div className="w-full h-full bg-gradient-to-br from-emerald-500 via-teal-600 to-emerald-700 flex flex-col items-center justify-center p-6 text-white">
                            <Layers size={48} className="animate-bounce mb-2 opacity-80" />
                        </div>
                    )}

                    {/* Subtle overlay gradient to ensure high readability */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />

                    {/* Transparent Floating Header Buttons */}
                    <div className="absolute top-4 left-4 right-4 z-40 flex items-center justify-between">
                        <button
                            onClick={() => navigate(-1)}
                            className="w-10 h-10 flex items-center justify-center bg-black/45 backdrop-blur-md rounded-full border border-white/20 text-white hover:bg-black/60 transition-all active:scale-95 shadow-md"
                        >
                            <ArrowLeft size={20} className="stroke-[3]" />
                        </button>

                        {/* Floating City/Location Badge */}
                        {currentCity?.name && (
                            <div className="bg-black/45 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/20 text-white text-xs font-black tracking-widest uppercase flex items-center gap-1 shadow-md">
                                <span>{currentCity.name}</span>
                                <ChevronRight size={10} className="rotate-90 stroke-[3] text-emerald-400 animate-pulse" />
                            </div>
                        )}

                        <button
                            onClick={() => navigate('/user/cart')}
                            className="relative w-10 h-10 flex items-center justify-center bg-black/45 backdrop-blur-md rounded-full border border-white/20 text-white hover:bg-black/60 transition-all active:scale-95 shadow-md"
                        >
                            <ShoppingCart size={18} className="stroke-[3]" />
                            {cartCount > 0 && (
                                <span className="absolute -top-1.5 -right-1.5 bg-gradient-to-br from-red-500 to-red-600 text-white text-[9px] font-black rounded-full min-w-[18px] h-[18px] flex items-center justify-center border-2 border-[#1E293B] shadow-lg animate-scaleIn">
                                    {cartCount}
                                </span>
                            )}
                        </button>
                    </div>

                    {/* Overlaid Banner Typography */}
                    <div className="absolute bottom-12 left-6 right-6 text-white z-20">
                        {category?.slug === 'home-painting' ? (
                            <h2 className="text-base sm:text-lg font-bold uppercase tracking-wide drop-shadow-md leading-snug">
                                Best House Painting Services in Your Area | Expert Painters
                            </h2>
                        ) : (
                            <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight drop-shadow-md">
                                {subCategory.title}
                            </h2>
                        )}
                        {category?.title && (
                            <span className="text-[9px] font-semibold uppercase tracking-widest bg-emerald-500/90 text-white py-1 px-3 rounded-full mt-2 inline-block shadow-sm max-w-[55%] truncate">
                                {category.title}
                            </span>
                        )}
                    </div>
                </div>

                {/* Overlapping Floating Search Bar (Placed OUTSIDE the overflow-hidden parent to prevent clipping) */}
                <div className="absolute bottom-0 left-6 right-6 translate-y-1/2 z-30 max-w-xl mx-auto">
                    <div className="flex items-center bg-white border border-gray-100 rounded-xl px-4 py-3.5 shadow-lg shadow-gray-200/80 gap-2.5">
                        <Search size={18} className="text-gray-400 flex-shrink-0 stroke-[3]" />
                        <input
                            type="text"
                            placeholder={placeholderText || `Search in ${subCategory?.title || 'services'}...`}
                            className="bg-transparent border-none outline-none w-full text-sm font-semibold text-gray-700 placeholder:text-gray-400"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Quick Services Nav */}
            {regularServices.length > 0 && (
                <div className="max-w-3xl mx-auto px-4 mt-10 mb-2 overflow-x-auto hide-scrollbar">
                    <div className="flex items-start justify-between sm:justify-start gap-3 sm:gap-6 pb-2 min-w-full md:justify-center">
                        {regularServices.map((svc) => {
                            return (
                                <button
                                    key={svc.id || svc._id}
                                    onClick={() => {
                                        const svcId = svc.id || svc._id;
                                        setHighlightedServiceId(svcId);
                                        const el = document.getElementById(`service-${svcId}`);
                                        if (el) {
                                            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                        }
                                        // Auto-remove highlight after 3 seconds
                                        setTimeout(() => {
                                            setHighlightedServiceId(prev => prev === svcId ? null : prev);
                                        }, 3000);
                                    }}
                                    className="flex flex-col items-center flex-shrink-0 w-[72px] gap-2 group outline-none"
                                >
                                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center p-2.5 bg-gray-50 border border-gray-100 group-hover:bg-emerald-50 group-hover:border-emerald-200 transition-all shadow-sm">
                                        <img
                                            src={toAssetUrl(svc.icon || svc.imageUrl || subCategory?.iconUrl)}
                                            alt={svc.title}
                                            className="w-full h-full object-contain mix-blend-multiply"
                                        />
                                    </div>
                                    <span className="text-[10px] text-center leading-tight font-bold text-gray-600 group-hover:text-emerald-700 transition-colors">
                                        {svc.title}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Services List Content Section */}
            <div className="max-w-3xl mx-auto px-4 mt-6 pt-2">
                {loading ? (
                    <div className="space-y-4">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="bg-white rounded-xl border border-gray-100 p-5 flex gap-4 animate-pulse">
                                <div className="w-20 h-20 bg-gray-100 rounded-lg flex-shrink-0" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-4 bg-gray-100 rounded w-3/4" />
                                    <div className="h-3 bg-gray-100 rounded w-1/2" />
                                    <div className="h-3 bg-gray-100 rounded w-1/3" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : filteredServices.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                            <Layers size={32} className="text-gray-200" />
                        </div>
                        <h3 className="text-lg font-black text-gray-900 mb-2">
                            {searchQuery ? 'No results found' : 'No services available'}
                        </h3>
                        <p className="text-gray-400 text-sm font-medium">
                            {searchQuery
                                ? `No services match "${searchQuery}"`
                                : 'Services will be added soon.'}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                            {filteredServices.length} service{filteredServices.length !== 1 ? 's' : ''}
                        </p>
                        <AnimatePresence>
                            {filteredServices.map((svc, idx) => {
                                const price = svc.discountPrice || svc.basePrice || svc.price;
                                const originalPrice = (svc.discountPrice && svc.basePrice && svc.discountPrice < svc.basePrice)
                                    ? svc.basePrice
                                    : null;
                                const isAdded = cartItems.some(item => item.serviceId === (svc.id || svc._id));

                                return (
                                    <motion.div
                                        id={`service-${svc.id || svc._id}`}
                                        key={svc.id || svc._id}
                                        initial={{ opacity: 0, y: 16 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.05 }}
                                        className={`rounded-xl shadow-md shadow-gray-200/30 overflow-hidden scroll-mt-24 relative transition-all duration-300
                                            ${highlightedServiceId === (svc.id || svc._id) ? 'p-[2px]' : 'border border-gray-100 p-0'}`}
                                    >
                                        {/* Animated Snake Border Background */}
                                        {highlightedServiceId === (svc.id || svc._id) && (
                                            <div className="absolute top-1/2 left-1/2 w-[200%] h-[300%] -translate-x-1/2 -translate-y-1/2">
                                                <div className="w-full h-full bg-[conic-gradient(transparent_270deg,#10b981)] animate-[spin_1.5s_linear_infinite]" />
                                            </div>
                                        )}

                                        {/* Card Content Container */}
                                        <div className={`relative z-10 bg-white h-full flex flex-col
                                            ${highlightedServiceId === (svc.id || svc._id) ? 'rounded-[calc(0.75rem-2px)]' : 'rounded-xl'}
                                            ${category?.slug === 'home-painting' ? 'p-0' : (highlightedServiceId === (svc.id || svc._id) ? 'p-[18px] justify-center' : 'p-5 justify-center')}`}>

                                            {category?.slug === 'home-painting' ? (
                                                <div className="flex flex-col h-full">
                                                    {/* Wide Image Banner */}
                                                    <div className="relative w-full h-40 sm:h-48 bg-gray-100 rounded-t-[inherit] overflow-hidden flex-shrink-0">
                                                        <img
                                                            src={toAssetUrl(svc.imageUrl || svc.icon || subCategory?.iconUrl)}
                                                            alt={svc.title}
                                                            className="w-full h-full object-cover"
                                                        />
                                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                                                        {/* Subheading badge overlay */}
                                                        {svc.subheading && (
                                                            <div className="absolute top-3 right-3 max-w-[55%] truncate text-right bg-emerald-500/90 text-white text-[9px] font-semibold uppercase py-1 px-2.5 rounded-md shadow-sm">
                                                                {svc.subheading}
                                                            </div>
                                                        )}

                                                        <div className="absolute bottom-3 left-4 right-4 flex justify-between items-end">
                                                            <h3 className="font-extrabold text-white text-lg sm:text-xl leading-snug drop-shadow-md">
                                                                {svc.title}
                                                            </h3>
                                                            {/* Hardcoded rating for now as requested */}
                                                            <div className="flex items-center gap-1 text-white text-[11px] font-medium drop-shadow-md mb-1">
                                                                <Star size={12} className="fill-amber-400 text-amber-400" /> 4.8 (18k)
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Details Section */}
                                                    <div className="p-4 sm:p-5 flex-1 flex flex-col">
                                                        <div className="flex-1 mb-4">
                                                            {svc.description ? (
                                                                <div className="text-xs text-gray-500 font-medium space-y-1">
                                                                    {svc.description.split(/(?:\n|->)/).map(s => s.trim()).filter(Boolean).map((line, i) => (
                                                                        <div key={i} className="flex items-start gap-2">
                                                                            <CheckCircle2 size={14} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                                                                            <span className="leading-relaxed">{line}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            ) : (
                                                                <div className="text-xs text-gray-500 font-medium space-y-2">
                                                                    <div className="flex items-start gap-2">
                                                                        <CheckCircle2 size={14} className="text-gray-300 mt-0.5 flex-shrink-0" />
                                                                        <span>Transparency & Affordability: No Hidden Costs</span>
                                                                    </div>
                                                                    <div className="flex items-start gap-2">
                                                                        <CheckCircle2 size={14} className="text-gray-300 mt-0.5 flex-shrink-0" />
                                                                        <span>2200+ shades and 1000+ texture ideas</span>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Footer Action Row */}
                                                        <div className="flex justify-between items-center mt-auto pt-4 border-t border-gray-100">
                                                            <button className="text-[11px] font-bold text-gray-500 hover:text-emerald-600 transition-colors flex items-center gap-0.5">
                                                                Show more <ChevronRight size={14} />
                                                            </button>
                                                            <motion.button
                                                                whileTap={{ scale: 0.95 }}
                                                                onClick={() => handleCartToggle(svc)}
                                                                className={`px-4 py-2 text-[11px] font-semibold uppercase tracking-widest rounded-lg border-2 transition-all
                                                                    ${isAdded
                                                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                                        : 'bg-emerald-50/50 text-emerald-600 border-emerald-200 hover:bg-emerald-100'
                                                                    }`}
                                                            >
                                                                {isAdded ? (
                                                                    <span className="flex items-center gap-1"><CheckCircle2 size={14} className="stroke-[3]" /> Added</span>
                                                                ) : (
                                                                    category?.isEstimateBased ? 'Get Estimate' : 'Add'
                                                                )}
                                                            </motion.button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex justify-between items-start gap-4">
                                                    {/* Service Info (Left side) */}
                                                    <div className="flex-1 min-w-0">
                                                        <h3 className="font-extrabold text-gray-900 text-base leading-snug mb-1">
                                                            {svc.title}
                                                        </h3>

                                                        {/* Price block */}
                                                        {category?.isEstimateBased ? (
                                                            <div className="flex items-center gap-1.5 mt-1 mb-2">
                                                                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Price Post Inspection</span>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center gap-1.5 mt-1 mb-2">
                                                                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Starts at</span>
                                                                <span className="text-base font-black text-gray-800">
                                                                    ₹{price}
                                                                </span>
                                                                {originalPrice && (
                                                                    <span className="text-[11px] text-gray-400 line-through font-bold">
                                                                        ₹{originalPrice}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        )}

                                                        {svc.description && (
                                                            <div className="text-xs text-gray-500 font-medium space-y-1 mb-3">
                                                                {svc.description.split(/(?:\n|->)/).map(s => s.trim()).filter(Boolean).map((line, i) => (
                                                                    <div key={i} className="flex items-start gap-1.5">
                                                                        <CheckCircle2 size={12} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                                                                        <span className="leading-relaxed">{line}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}

                                                        <button className="text-[11px] font-black text-emerald-600 uppercase tracking-wider flex items-center gap-1 hover:underline">
                                                            View details <ChevronRight size={12} className="stroke-[3]" />
                                                        </button>
                                                    </div>

                                                    {/* Service Image + Add CTA (Right side) */}
                                                    <div className="relative flex flex-col items-center flex-shrink-0 pb-2">
                                                        <div className="w-24 h-24 bg-gray-50 rounded-2xl border border-gray-100 overflow-hidden relative shadow-sm">
                                                            {(svc.imageUrl || svc.icon) ? (
                                                                <img
                                                                    src={toAssetUrl(svc.imageUrl || svc.icon)}
                                                                    alt={svc.title}
                                                                    className="w-full h-full object-cover"
                                                                />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center text-gray-300 bg-gray-50">
                                                                    <Layers size={24} />
                                                                </div>
                                                            )}

                                                            {/* Subheading badge overlay */}
                                                            {svc.subheading && (
                                                                <div className="absolute top-1 left-1 right-1 bg-emerald-500/90 text-white text-[8px] font-semibold uppercase py-0.5 px-1.5 rounded-md text-center tracking-wider truncate shadow-sm">
                                                                    {svc.subheading}
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Overlaid / Bottom aligned ADD Button */}
                                                        <div className="absolute -bottom-2 z-10 shadow-lg shadow-emerald-100/50 rounded-xl overflow-hidden border border-emerald-100">
                                                            <motion.button
                                                                whileTap={{ scale: 0.92 }}
                                                                onClick={() => handleCartToggle(svc)}
                                                                className={`flex items-center justify-center gap-1 px-5 py-1.5 min-w-[80px] text-[10px] font-semibold uppercase tracking-widest transition-all
                                                            ${isAdded
                                                                        ? 'bg-emerald-50 text-emerald-700 font-semibold'
                                                                        : 'bg-white text-emerald-600 hover:bg-emerald-50 active:bg-emerald-100'
                                                                    }`}
                                                            >
                                                                {isAdded ? (
                                                                    <>
                                                                        <CheckCircle2 size={12} className="stroke-[3]" />
                                                                        Added
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        {category?.isEstimateBased ? 'Book Visit' : 'Add'}
                                                                    </>
                                                                )}
                                                            </motion.button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>

                        {/* Footer Info */}
                        <div className="mt-6 p-5 bg-gray-50/80 rounded-xl border border-gray-100 flex items-start gap-3">
                            <Info size={16} className="text-emerald-500 flex-shrink-0 mt-0.5 stroke-[3]" />
                            <p className="text-[10px] text-gray-500 font-black uppercase tracking-wider leading-relaxed">
                                * Final price may vary after detailed inspection or specific service requirements.
                            </p>
                        </div>

                        {/* Painting Comparison Table */}
                        {category?.slug === 'home-painting' && (
                            <div className="mt-10 mb-4 px-1">
                                <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-5 flex items-center gap-2">
                                    Why <span className="bg-emerald-600 text-white px-2.5 py-0.5 rounded-lg text-sm sm:text-base tracking-wide shadow-sm font-black uppercase">GetRightHome</span> ?
                                </h2>
                                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                                    {/* Header */}
                                    <div className="grid grid-cols-[1fr_80px_80px] sm:grid-cols-[1fr_120px_120px] items-stretch text-center font-bold text-xs sm:text-sm">
                                        <div className="bg-gray-50 flex items-center justify-center p-3 text-gray-600 border-r border-b border-gray-200">
                                            Services
                                        </div>
                                        <div className="bg-[#e8f7f5] p-2 sm:p-3 border-r border-b border-gray-200 flex flex-col items-center justify-center gap-1.5">
                                            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold text-[8px] sm:text-[10px] shadow-sm">%</div>
                                            <span className="leading-tight text-[9px] sm:text-xs text-[#0F172A] font-extrabold">GetRightHome<br/>Promise</span>
                                        </div>
                                        <div className="bg-[#f1f5f9] text-gray-600 p-2 sm:p-3 border-b border-gray-200 flex flex-col items-center justify-center gap-1.5">
                                            <div className="relative">
                                                <User size={18} className="sm:w-5 sm:h-5 text-gray-500" />
                                                <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-purple-600 rounded-full flex items-center justify-center text-white text-[8px] font-bold border border-white">?</div>
                                            </div>
                                            <span className="leading-tight text-[9px] sm:text-xs font-semibold">Local Vendor</span>
                                        </div>
                                    </div>
                                    
                                    {/* Rows */}
                                    {[
                                        "Genuine Branded Paints",
                                        "End to End Managed",
                                        "Wall Health Checkup",
                                        "Material + Labor Cost Included",
                                        "Professionally Trained Painters",
                                        "Furniture and Electrical Outlets Masking",
                                        "Post Painting Cleanup",
                                        "On-time Completion"
                                    ].map((feature, idx, arr) => (
                                        <div key={idx} className={`grid grid-cols-[1fr_80px_80px] sm:grid-cols-[1fr_120px_120px] items-center text-[11px] sm:text-sm ${idx !== arr.length - 1 ? 'border-b border-gray-100' : ''}`}>
                                            <div className="p-2.5 sm:p-4 text-gray-700 font-medium flex items-center gap-2 sm:gap-2.5 border-r border-gray-100">
                                                <div className="w-1 h-1 rounded-full bg-gray-500 flex-shrink-0" />
                                                <span className="leading-snug">{feature}</span>
                                            </div>
                                            <div className="p-2.5 sm:p-4 flex justify-center border-r border-gray-100 bg-[#e8f7f5]/40">
                                                <Check size={16} className="text-[#059669] stroke-[3]" />
                                            </div>
                                            <div className="p-2.5 sm:p-4 flex justify-center bg-[#f1f5f9]/40">
                                                <X size={14} className="text-gray-300 stroke-[3]" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* How it works section */}
                        {category?.slug === 'home-painting' && (
                            <div className="mt-8 mb-6 px-1">
                                <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4">
                                    How it works
                                </h2>
                                <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-4 snap-x">
                                    {/* Card 1 */}
                                    <div className="min-w-[150px] w-[150px] sm:min-w-[160px] sm:w-[160px] flex-shrink-0 bg-[#fff5ed] rounded-xl p-4 relative overflow-hidden snap-start">
                                        <div className="absolute -top-4 -left-4 w-24 h-24 bg-[#ffe6d4] rounded-full opacity-60 z-0"></div>
                                        <div className="relative z-10">
                                            <CalendarCheck className="w-8 h-8 text-gray-700 stroke-[1.5] mb-3" />
                                            <h3 className="text-sm font-bold text-gray-800 leading-tight mb-2">Book Home<br/>Inspection</h3>
                                            <p className="text-[10px] sm:text-[11px] text-gray-600 leading-tight">Tell us preferred time to book</p>
                                        </div>
                                        <div className="absolute bottom-2 right-3 text-2xl font-black text-[#ffaa70]/70 z-10">1</div>
                                    </div>
                                    {/* Card 2 */}
                                    <div className="min-w-[150px] w-[150px] sm:min-w-[160px] sm:w-[160px] flex-shrink-0 bg-[#f4fae3] rounded-xl p-4 relative overflow-hidden snap-start">
                                        <div className="absolute top-8 -left-6 w-24 h-24 bg-[#e7f5cc] rounded-full opacity-60 z-0"></div>
                                        <div className="relative z-10">
                                            <Ruler className="w-8 h-8 text-gray-700 stroke-[1.5] mb-3" />
                                            <h3 className="text-sm font-bold text-gray-800 leading-tight mb-2">Measure &<br/>Estimation</h3>
                                            <p className="text-[10px] sm:text-[11px] text-gray-600 leading-tight">Get accurate quotes with laser measurements</p>
                                        </div>
                                        <div className="absolute bottom-2 right-3 text-2xl font-black text-[#a6d844]/70 z-10">2</div>
                                    </div>
                                    {/* Card 3 */}
                                    <div className="min-w-[150px] w-[150px] sm:min-w-[160px] sm:w-[160px] flex-shrink-0 bg-[#eef2ff] rounded-xl p-4 relative overflow-hidden snap-start">
                                        <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-[#dbeafe] rounded-full opacity-60 z-0"></div>
                                        <div className="relative z-10">
                                            <Paintbrush className="w-8 h-8 text-gray-700 stroke-[1.5] mb-3" />
                                            <h3 className="text-sm font-bold text-gray-800 leading-tight mb-2">Painting<br/>Execution</h3>
                                            <p className="text-[10px] sm:text-[11px] text-gray-600 leading-tight">Professionals begin work safely and on time</p>
                                        </div>
                                        <div className="absolute bottom-2 right-3 text-2xl font-black text-[#93c5fd]/70 z-10">3</div>
                                    </div>
                                    {/* Card 4 */}
                                    <div className="min-w-[150px] w-[150px] sm:min-w-[160px] sm:w-[160px] flex-shrink-0 bg-[#fdf4ff] rounded-xl p-4 relative overflow-hidden snap-start">
                                        <div className="absolute top-0 right-0 w-24 h-24 bg-[#fae8ff] rounded-full opacity-60 z-0"></div>
                                        <div className="relative z-10">
                                            <Sparkles className="w-8 h-8 text-gray-700 stroke-[1.5] mb-3" />
                                            <h3 className="text-sm font-bold text-gray-800 leading-tight mb-2">Post-Cleanup &<br/>Handover</h3>
                                            <p className="text-[10px] sm:text-[11px] text-gray-600 leading-tight">We clean up and hand over a fresh home</p>
                                        </div>
                                        <div className="absolute bottom-2 right-3 text-2xl font-black text-[#f0abfc]/70 z-10">4</div>
                                    </div>
                                </div>
                            </div>
                        )}



                        {/* Explore Textures */}
                        {textureServices.length > 0 && (
                            <div className="mt-8 mb-6 px-1">
                                <h2 className="text-base sm:text-lg font-bold text-[#1E293B] mb-3">
                                    Explore Textures
                                </h2>
                                <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-4 snap-x">
                                    {textureServices.map((texture) => (
                                        <div 
                                            key={texture.id || texture._id}
                                            onClick={() => setSelectedTexture(texture)}
                                            className="min-w-[190px] w-[190px] sm:min-w-[240px] sm:w-[240px] h-[130px] sm:h-[160px] rounded-xl overflow-hidden relative cursor-pointer group shadow-sm flex-shrink-0 snap-start"
                                        >
                                            <img 
                                                src={toAssetUrl(texture.imageUrl || texture.icon)} 
                                                alt={texture.title}
                                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-3">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-white font-bold text-sm sm:text-base truncate pr-2">{texture.title}</span>
                                                    <ChevronRight className="text-white w-4 h-4 flex-shrink-0" />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Ideas for your Home */}
                        {ideaServices.length > 0 && (
                            <div className="mt-8 mb-6 px-1">
                                <div className="flex items-center justify-between mb-3">
                                    <h2 className="text-base sm:text-lg font-bold text-[#1E293B]">
                                        Ideas for your Home
                                    </h2>
                                    <ChevronRight className="w-4 h-4 text-gray-400" />
                                </div>
                                <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-4 snap-x">
                                    {ideaServices.map((idea) => (
                                        <div 
                                            key={idea.id || idea._id}
                                            onClick={() => setSelectedIdea(idea)}
                                            className="min-w-[240px] w-[240px] sm:min-w-[320px] sm:w-[320px] h-[170px] sm:h-[220px] rounded-xl overflow-hidden relative cursor-pointer group shadow-sm flex-shrink-0 snap-start"
                                        >
                                            <img 
                                                src={toAssetUrl(idea.imageUrl || idea.icon)} 
                                                alt={idea.title}
                                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                            />
                                            <div className="absolute top-2 right-2 w-7 h-7 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center text-white">
                                                <Layers className="w-3.5 h-3.5" />
                                            </div>
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-3">
                                                <span className="text-white font-bold text-sm sm:text-base truncate">{idea.title}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* How painting works */}
                        {category?.slug === 'home-painting' && (
                            <div className="mt-8 mb-10 px-2 sm:px-4">
                                <h2 className="text-[#1A3B5C] text-lg sm:text-xl font-bold mb-6">How painting works</h2>
                                <div className="relative border-l-2 border-dashed border-gray-200 ml-4 sm:ml-5 space-y-7">
                                    <div className="relative pl-8 sm:pl-10">
                                        <div className="absolute -left-[17px] top-0 w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center shadow-sm">
                                            <Smartphone className="w-4 h-4 text-indigo-600" />
                                        </div>
                                        <div>
                                            <h3 className="text-[15px] font-bold text-[#1A3B5C]">Book Home Inspection</h3>
                                            <p className="text-[13px] text-gray-500 mt-0.5">Tell us preferred time to book</p>
                                        </div>
                                    </div>
                                    
                                    <div className="relative pl-8 sm:pl-10">
                                        <div className="absolute -left-[17px] top-0 w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center shadow-sm">
                                            <Ruler className="w-4 h-4 text-indigo-600" />
                                        </div>
                                        <div>
                                            <h3 className="text-[15px] font-bold text-[#1A3B5C]">Measure & Estimate</h3>
                                            <p className="text-[13px] text-gray-500 mt-0.5">Get accurate quotes with laser measurements</p>
                                        </div>
                                    </div>

                                    <div className="relative pl-8 sm:pl-10">
                                        <div className="absolute -left-[17px] top-0 w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center shadow-sm">
                                            <PlayCircle className="w-4 h-4 text-indigo-600" />
                                        </div>
                                        <div>
                                            <h3 className="text-[15px] font-bold text-[#1A3B5C]">Project Initiation</h3>
                                            <p className="text-[13px] text-gray-500 mt-0.5">Guaranteed on time project initiation and completion</p>
                                        </div>
                                    </div>

                                    <div className="relative pl-8 sm:pl-10">
                                        <div className="absolute -left-[17px] top-0 w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center shadow-sm">
                                            <Sparkles className="w-4 h-4 text-indigo-600" />
                                        </div>
                                        <div>
                                            <h3 className="text-[15px] font-bold text-[#1A3B5C]">Cleaning & Quality Check</h3>
                                            <p className="text-[13px] text-gray-500 mt-0.5">Post paint cleanup and quality check</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Tour our Recent Projects */}
                        {recentProjects.length > 0 && (
                            <div className="mt-8 mb-6 px-1">
                                <div className="flex justify-between items-center mb-3">
                                    <h2 className="text-base sm:text-lg font-bold text-[#1E293B] flex items-center gap-2">
                                        Tour our Recent Projects
                                        <span className="bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest shadow-sm">New</span>
                                    </h2>
                                    <button className="text-xs font-bold text-emerald-600 border border-emerald-200 px-3 py-1 rounded-lg hover:bg-emerald-50 transition-colors">
                                        See All
                                    </button>
                                </div>
                                <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-4 snap-x">
                                    {recentProjects.map((project, idx) => {
                                        const totalImages = project.projectImages?.length || (project.imageUrl ? 1 : 0);
                                        const displayImage = project.projectImages?.[0] || project.imageUrl || '';
                                        
                                        return (
                                            <div 
                                                key={project.id || project._id}
                                                onClick={() => {
                                                    setCurrentProjectIndex(idx);
                                                    setCurrentImageIndex(0);
                                                    setStoryProgress(0);
                                                    setStoryViewerOpen(true);
                                                }}
                                                className="w-full min-w-[calc(100%-1rem)] sm:w-[380px] sm:min-w-[380px] h-[220px] sm:h-[240px] rounded-2xl flex-shrink-0 relative overflow-hidden snap-start cursor-pointer group shadow-sm"
                                            >
                                                <img 
                                                    src={toAssetUrl(displayImage)} 
                                                    alt={project.title} 
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                />
                                                {/* Gradient overlay */}
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-black/20" />
                                                
                                                {/* Top Right Expand Icon */}
                                                <div className="absolute top-2 right-2 w-8 h-8 bg-black/40 rounded-full flex items-center justify-center backdrop-blur-md">
                                                    <Maximize2 className="text-white w-4 h-4" />
                                                </div>
                                                
                                                {/* Bottom Content */}
                                                <div className="absolute bottom-3 left-3 right-3 flex flex-col gap-2">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-6 h-6 rounded-full bg-gray-300 overflow-hidden border border-white">
                                                                <img src={`https://api.dicebear.com/7.x/notionists/svg?seed=${project.workerName || 'worker'}`} alt="avatar" className="w-full h-full object-cover" />
                                                            </div>
                                                            <div className="flex items-center gap-1.5 text-white text-[11px] font-medium">
                                                                <span className="font-bold">{project.workerName || 'Expert'}</span>
                                                                <span className="text-white/60">|</span>
                                                                <span className="text-white/90">{subCategory?.title}</span>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-1 text-white text-[11px] font-bold">
                                                            <Star size={10} className="fill-amber-400 text-amber-400" /> 5
                                                        </div>
                                                    </div>
                                                    {/* Progress Bars (Fake static representation for thumbnail) */}
                                                    {totalImages > 0 && (
                                                        <div className="flex gap-1 w-full mt-1">
                                                            {Array.from({ length: Math.min(totalImages, 5) }).map((_, i) => (
                                                                <div key={i} className={`h-1 rounded-full flex-1 ${i === 0 ? 'bg-white' : 'bg-white/40'}`} />
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Explore Categories */}
                        {exploreCategories.length > 0 && (
                            <div className="mt-10 mb-8 px-1">
                                <h2 className="text-base sm:text-lg font-bold text-[#1E293B] mb-4">
                                    Explore Other Services
                                </h2>
                                <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-4 snap-x">
                                    {exploreCategories.map((cat, idx) => (
                                        <div 
                                            key={cat.id || cat._id}
                                            onClick={() => {
                                                navigate('/home-services', {
                                                    state: { openCategory: cat }
                                                });
                                                window.scrollTo(0, 0);
                                            }}
                                            className="w-[160px] min-w-[160px] sm:w-[200px] sm:min-w-[200px] h-[200px] sm:h-[240px] rounded-xl overflow-hidden relative cursor-pointer group shadow-sm flex-shrink-0 snap-start"
                                        >
                                            <img 
                                                src={toAssetUrl(cat.imageUrl || cat.icon || cat.homeIconUrl)} 
                                                alt={cat.title}
                                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent flex flex-col justify-end p-3">
                                                <div className="flex items-center gap-1 mb-1 text-amber-400 text-xs font-bold">
                                                    <Star size={10} className="fill-amber-400" /> {(4.5 + ((cat.title.length * 7 + (cat.title.charCodeAt(0) || 0) + idx * 3) % 6) * 0.1).toFixed(1)}
                                                </div>
                                                <div className="flex items-end justify-between">
                                                    <h3 className="text-white font-bold text-sm sm:text-base leading-tight">
                                                        {cat.title.split(' ').map((word, i, arr) => (
                                                            <React.Fragment key={i}>
                                                                {word}{i !== arr.length - 1 && <br/>}
                                                            </React.Fragment>
                                                        ))}
                                                    </h3>
                                                    <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center flex-shrink-0">
                                                        <ArrowLeft className="w-3.5 h-3.5 text-gray-900 rotate-180" />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Customer Reviews */}
                        <div className="mt-6 mb-10 px-3">
                            <h2 className="text-base sm:text-lg font-bold text-[#1E293B] mb-5">
                                Customer Reviews
                            </h2>
                            <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-6 snap-x">
                                {CUSTOMER_REVIEWS.map((review) => (
                                    <div 
                                        key={review.id}
                                        className="w-[280px] min-w-[280px] sm:w-[320px] sm:min-w-[320px] bg-white rounded-2xl p-5 border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.04)] flex-shrink-0 snap-center flex flex-col gap-4"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-100 flex-shrink-0 border border-gray-200">
                                                <img src={review.avatar} alt={review.name} className="w-full h-full object-cover" />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-1.5 mb-1">
                                                    <h3 className="font-bold text-[#1E293B] text-sm">{review.name}</h3>
                                                    <div className="w-3.5 h-3.5 rounded-full bg-emerald-100 text-emerald-500 flex items-center justify-center">
                                                        <Check size={9} strokeWidth={4} />
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <Star size={10} className="fill-amber-400 text-amber-400" />
                                                    <span className="text-xs font-bold text-gray-500">{review.rating}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <p className="text-[13px] text-gray-600 leading-relaxed font-medium">
                                            {review.review}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Frequently Asked Questions */}
                        <div className="mt-2 mb-10 px-4">
                            <h2 className="text-xl sm:text-2xl font-bold text-[#1E293B] mb-6">
                                Frequently asked questions
                            </h2>
                            <div className="flex flex-col border border-gray-100 rounded-2xl overflow-hidden bg-white shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
                                {FAQS.map((faq, idx) => {
                                    const isOpen = expandedFaq === idx;
                                    return (
                                        <div key={idx} className={`border-b border-gray-100 last:border-b-0 ${isOpen ? 'bg-gray-50/50' : 'bg-white'} transition-colors duration-300`}>
                                            <button
                                                onClick={() => toggleFaq(idx)}
                                                className="w-full flex items-center justify-between p-4 sm:p-5 text-left focus:outline-none"
                                            >
                                                <span className={`text-[14px] sm:text-[15px] font-medium pr-4 ${isOpen ? 'text-teal-700' : 'text-teal-600 hover:text-teal-700'} transition-colors`}>
                                                    {faq.question}
                                                </span>
                                                <div className="flex-shrink-0 text-gray-400">
                                                    {isOpen ? <X size={18} strokeWidth={2.5} className="text-gray-700" /> : <X size={18} strokeWidth={2.5} className="text-gray-700 rotate-45 transition-transform" />}
                                                </div>
                                            </button>
                                            <AnimatePresence>
                                                {isOpen && (
                                                    <motion.div
                                                        initial={{ height: 0, opacity: 0 }}
                                                        animate={{ height: "auto", opacity: 1 }}
                                                        exit={{ height: 0, opacity: 0 }}
                                                        transition={{ duration: 0.2 }}
                                                        className="overflow-hidden"
                                                    >
                                                        <div className="px-4 sm:px-5 pb-5 text-[13px] sm:text-[14px] text-gray-700 leading-relaxed font-medium">
                                                            {faq.answer}
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Redirect overlay */}
            <AnimatePresence>
                {redirecting && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="fixed inset-0 bg-white/90 z-[100] flex flex-col items-center justify-center"
                    >
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mb-6 shadow-inner"
                        >
                            <CheckCircle2 size={40} className="text-emerald-500" />
                        </motion.div>
                        <h3 className="text-2xl font-black text-gray-900 mb-2">Added to Cart!</h3>
                        <p className="text-gray-500 font-bold">Redirecting to checkout...</p>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Texture Detail Modal */}
            <AnimatePresence>
                {selectedTexture && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black z-50 flex flex-col"
                    >
                        {/* Header */}
                        <div className="flex items-center gap-3 p-4 bg-gradient-to-b from-black/80 to-transparent absolute top-0 left-0 right-0 z-10">
                            <button onClick={() => setSelectedTexture(null)} className="p-2 bg-black/40 backdrop-blur-md rounded-full text-white">
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                            <h2 className="text-white font-bold text-lg">Explore Textures</h2>
                        </div>

                        {/* Image */}
                        <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
                            <img 
                                src={toAssetUrl(selectedTexture.imageUrl || selectedTexture.icon)} 
                                alt={selectedTexture.title}
                                className="w-full h-auto max-h-[70vh] object-contain rounded-lg shadow-2xl"
                            />
                            {/* Expand Icon */}
                            <div className="absolute top-20 right-4 p-2 bg-black/40 backdrop-blur-md rounded-full text-white">
                                <Layers className="w-4 h-4" />
                            </div>
                        </div>

                        {/* Info & Action Footer */}
                        <div className="bg-black text-white p-5 pb-8 sm:p-6 sm:pb-8 flex flex-col gap-4 relative z-10">
                            <div>
                                <h3 className="text-xl sm:text-2xl font-black mb-1">{selectedTexture.title}</h3>
                                <p className="text-sm text-gray-300">
                                    Elevate your space with captivating texture paint. Our experts create stunning home transformations, adding depth and allure to every room.
                                </p>
                            </div>
                            <button
                                onClick={() => {
                                    handleCartToggle(selectedTexture);
                                    setSelectedTexture(null);
                                }}
                                className="w-full py-3.5 bg-[#009688] hover:bg-[#00897B] text-white font-bold rounded-xl shadow-lg transition-colors flex items-center justify-center gap-2"
                            >
                                Get Estimate
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Idea Detail Modal */}
            <AnimatePresence>
                {selectedIdea && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black z-50 flex flex-col"
                    >
                        {/* Header */}
                        <div className="flex items-center gap-3 p-4 bg-gradient-to-b from-black/80 to-transparent absolute top-0 left-0 right-0 z-10">
                            <button onClick={() => setSelectedIdea(null)} className="p-2 bg-black/40 backdrop-blur-md rounded-full text-white">
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                            <h2 className="text-white font-bold text-lg">Ideas for your Home</h2>
                        </div>

                        {/* Image */}
                        <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
                            <img 
                                src={toAssetUrl(selectedIdea.imageUrl || selectedIdea.icon)} 
                                alt={selectedIdea.title}
                                className="w-full h-auto max-h-[70vh] object-contain rounded-lg shadow-2xl"
                            />
                            <div className="absolute top-20 right-4 p-2 bg-black/40 backdrop-blur-md rounded-full text-white">
                                <Layers className="w-4 h-4" />
                            </div>
                        </div>

                        {/* Info & Action Footer */}
                        <div className="bg-black text-white p-5 pb-8 sm:p-6 sm:pb-8 flex flex-col gap-4 relative z-10">
                            <div>
                                <h3 className="text-xl sm:text-2xl font-black mb-1">{selectedIdea.title}</h3>
                                <p className="text-sm text-gray-300">
                                    Discover beautiful ideas for your space. Let our experts bring this vision to life with precision and style.
                                </p>
                            </div>
                            <button
                                onClick={() => {
                                    handleCartToggle(selectedIdea);
                                    setSelectedIdea(null);
                                }}
                                className="w-full py-3.5 bg-[#009688] hover:bg-[#00897B] text-white font-bold rounded-xl shadow-lg transition-colors flex items-center justify-center gap-2"
                            >
                                Get Estimate
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Story Viewer Modal */}
            <AnimatePresence>
                {storyViewerOpen && recentProjects.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black z-50 flex flex-col"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent absolute top-0 left-0 right-0 z-20">
                            <button onClick={() => setStoryViewerOpen(false)} className="text-white hover:text-gray-300">
                                <ArrowLeft className="w-6 h-6" />
                            </button>
                            <h2 className="text-white font-bold text-lg">Painting Library</h2>
                            <div className="w-6" /> {/* Spacer */}
                        </div>

                        {/* Image & Progress */}
                        <div className="flex-1 relative bg-black flex flex-col items-center justify-center overflow-hidden w-full h-full">
                            {(() => {
                                const currentProject = recentProjects[currentProjectIndex];
                                const images = currentProject.projectImages?.length ? currentProject.projectImages : [currentProject.imageUrl];
                                const currentImage = images[currentImageIndex];
                                const totalImages = images.length;
                                
                                return (
                                    <>
                                        <img 
                                            src={toAssetUrl(currentImage)} 
                                            alt={currentProject.title}
                                            className="w-full h-full object-cover sm:object-contain rounded-lg"
                                        />
                                        
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-black/40" />

                                        {/* Progress Bars Overlay */}
                                        <div className="absolute top-16 left-4 right-4 flex gap-1 z-20">
                                            {Array.from({ length: totalImages }).map((_, idx) => (
                                                <div key={idx} className="h-1 rounded-full flex-1 bg-white/30 overflow-hidden">
                                                    <div 
                                                        className="h-full bg-white transition-all duration-75 ease-linear"
                                                        style={{ 
                                                            width: idx < currentImageIndex 
                                                                ? '100%' 
                                                                : (idx === currentImageIndex ? `${storyProgress}%` : '0%') 
                                                        }}
                                                    />
                                                </div>
                                            ))}
                                        </div>

                                        {/* Tap Areas for Navigation */}
                                        <div 
                                            className="absolute top-20 bottom-32 left-0 w-1/3 z-10" 
                                            onClick={() => {
                                                if (currentImageIndex > 0) {
                                                    setCurrentImageIndex(i => i - 1);
                                                    setStoryProgress(0);
                                                } else if (currentProjectIndex > 0) {
                                                    setCurrentProjectIndex(i => i - 1);
                                                    const prevProject = recentProjects[currentProjectIndex - 1];
                                                    const prevTotal = prevProject.projectImages?.length || (prevProject.imageUrl ? 1 : 0);
                                                    setCurrentImageIndex(prevTotal > 0 ? prevTotal - 1 : 0);
                                                    setStoryProgress(0);
                                                }
                                            }}
                                        />
                                        <div 
                                            className="absolute top-20 bottom-32 right-0 w-2/3 z-10" 
                                            onClick={() => setStoryProgress(100)} // Force skip
                                        />

                                        {/* Expand Icon */}
                                        <div className="absolute top-20 right-4 p-2 bg-black/40 backdrop-blur-md rounded-full text-white z-20">
                                            <Layers className="w-4 h-4" />
                                        </div>

                                        {/* Worker Info Footer Overlay */}
                                        <div className="absolute bottom-6 left-4 right-4 z-20">
                                            <div className="flex items-center gap-3 mb-3">
                                                <div className="w-10 h-10 rounded-full bg-gray-300 overflow-hidden border-2 border-white">
                                                    <img src={`https://api.dicebear.com/7.x/notionists/svg?seed=${currentProject.workerName || 'worker'}`} alt="avatar" className="w-full h-full object-cover" />
                                                </div>
                                                <div>
                                                    <div className="text-white text-sm font-bold">{currentProject.workerName || 'Expert Painter'}</div>
                                                    <div className="flex items-center gap-1 text-white/80 text-xs font-medium">
                                                        <Star size={12} className="fill-amber-400 text-amber-400" /> 
                                                        5 <span className="mx-1">•</span> {subCategory?.title}
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <p className="text-white/90 text-sm font-medium leading-snug drop-shadow-md line-clamp-3">
                                                {currentProject.description || "I couldn't be happier with the painting service I received. The team was professional, prompt, and their attention to detail was impeccable. My home looks absolutely stunning now, thanks to their expertise."}
                                            </p>
                                        </div>
                                    </>
                                );
                            })()}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default SubCategoryPage;
