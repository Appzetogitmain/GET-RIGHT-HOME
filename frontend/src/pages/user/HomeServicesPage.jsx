import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Search, 
    MapPin, 
    ChevronRight, 
    Star, 
    Clock, 
    ShieldCheck, 
    ArrowLeft,
    Sparkles,
    Hammer,
    Wrench,
    Paintbrush,
    Wind,
    Droplets,
    Zap,
    Bug,
    Briefcase,
    Bell,
    CheckCircle2,
    Home,
    Calendar,
    ShoppingCart,
    User
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { publicCatalogService } from '../../homster/services/catalogService';
import { useCity } from '../../homster/context/CityContext';
import CategoryModal from '../../homster/modules/user/pages/Home/components/CategoryModal';

const toAssetUrl = (url) => {
  if (!url) return '';
  const clean = url.replace('/api/upload', '/upload');
  if (clean.startsWith('http')) return clean;
  const base = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000').replace(/\/api$/, '');
  return `${base}${clean.startsWith('/') ? '' : '/'}${clean}`;
};

const HomeServicesPage = () => {
    const navigate = useNavigate();
    const { currentCity } = useCity();
    const [searchQuery, setSearchQuery] = useState('');
    const [isScrolled, setIsScrolled] = useState(false);
    const [activeBanner, setActiveBanner] = useState(0);
    const [activeFaqIndex, setActiveFaqIndex] = useState(null);
    const scrollContainerRef = useRef(null);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll, { passive: true });

        // Auto-play for Banner
        const timer = setInterval(() => {
            if (scrollContainerRef.current) {
                const { scrollLeft, offsetWidth, scrollWidth } = scrollContainerRef.current;
                const nextScroll = scrollLeft + offsetWidth;
                
                if (nextScroll >= scrollWidth) {
                    scrollContainerRef.current.scrollTo({ left: 0, behavior: 'smooth' });
                } else {
                    scrollContainerRef.current.scrollTo({ left: nextScroll, behavior: 'smooth' });
                }
            }
        }, 3000); // Change slide every 3 seconds

        return () => {
            window.removeEventListener('scroll', handleScroll);
            clearInterval(timer);
        };
    }, []);

    const getYoutubeId = (url) => {
        if (!url) return null;
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    };

    const handleBannerScroll = (e) => {
        const scrollLeft = e.target.scrollLeft;
        const width = e.target.offsetWidth;
        const index = Math.round(scrollLeft / width);
        setActiveBanner(index);
    };

    const [isLoading, setIsLoading] = useState(true);
    const [homeData, setHomeData] = useState(null);
    const [categories, setCategories] = useState([]);
    const [directCategories, setDirectCategories] = useState([]);
    const [directServicesMap, setDirectServicesMap] = useState({});
    const [directSubCategoriesMap, setDirectSubCategoriesMap] = useState({});
    
    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState(null);

    const openCategoryModal = (cat) => {
        setSelectedCategory(cat);
        setIsModalOpen(true);
    };

    const [promos, setPromos] = useState([]);
    const [curations, setCurations] = useState([]);
    const [noteworthy, setNoteworthy] = useState([]);
    const [mostBooked, setMostBooked] = useState([]);
    const [playingVideoIdx, setPlayingVideoIdx] = useState(null);

    useEffect(() => {
        const fetchHomeData = async () => {
            try {
                setIsLoading(true);
                // 1. Fetch Home Content (Banners, Promos, Sections)
                const cityId = currentCity?._id || currentCity?.id;
                const contentRes = await publicCatalogService.getHomeContent(cityId);
                if (contentRes?.success && contentRes.homeContent) {
                    const hc = contentRes.homeContent;
                    setHomeData(hc);
                    setPromos(hc.promos || []);
                    setNoteworthy(hc.noteworthy || []);
                    setMostBooked(hc.booked || []);
                    setCurations(hc.curated || []);
                }

                // 2. Fetch Categories
                try {
                    const cityId = currentCity?._id || currentCity?.id;
                    const catRes = await publicCatalogService.getCategories(cityId);
                    if (catRes?.success) {
                        const allCats = catRes.categories || [];
                        const stdCats = allCats.filter(c => !c.isDirectService);
                        const dirCats = allCats.filter(c => c.isDirectService);
                        
                        setCategories(stdCats);
                        setDirectCategories(dirCats);

                        // Fetch sub-categories for each direct category
                        const subCategoriesMap = {};
                        await Promise.all(dirCats.map(async (cat) => {
                            try {
                                const res = await publicCatalogService.getSubCategories({ 
                                    categoryId: cat._id || cat.id,
                                    cityId 
                                });
                                if (res.success) {
                                    subCategoriesMap[cat._id || cat.id] = res.subCategories || [];
                                }
                            } catch (err) {
                                console.error("Error fetching sub-categories for direct category:", cat.title, err);
                            }
                        }));
                        setDirectSubCategoriesMap(subCategoriesMap);
                    }
                } catch (err) {
                    console.error("Error fetching categories:", err);
                }

                // 3. Fetch Curations (Thoughtful Curations)
                if (contentRes?.homeContent?.curated) {
                    setCurations(contentRes.homeContent.curated);
                }

            } catch (error) {
                console.error("Error fetching home service data:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchHomeData();
    }, [currentCity]);

    // Removed hardcoded arrays (categories, promos, featuredServices)

    if (isLoading) {
        return (
            <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
                <div className="w-16 h-16 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin mb-4"></div>
                <h3 className="text-xl font-black text-gray-900 mb-2">Loading Home Services</h3>
                <p className="text-gray-500 text-sm font-bold uppercase tracking-widest">Quality you can trust</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F8FAFC] pb-24 font-sans">
            {/* Full-Width Edge-to-Edge Banner Section */}
            <div className="relative w-full">
                {/* Full-Width Carousel Container (overflow-hidden with rounded bottom corners) */}
                <div className="relative w-full h-[64vw] sm:h-80 bg-gray-150 overflow-hidden shadow-sm rounded-b-[2.5rem] sm:rounded-b-[3rem]">
                    <div 
                        ref={scrollContainerRef}
                        onScroll={handleBannerScroll}
                        className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar w-full h-full"
                    >
                        {promos.map((promo) => (
                            <motion.div 
                                key={promo.id}
                                onClick={() => {
                                    if (promo.targetCategoryId) {
                                        const cat = categories.find(c => (c.id || c._id) === promo.targetCategoryId);
                                        openCategoryModal(cat || { id: promo.targetCategoryId, title: promo.title });
                                    } else if (promo.slug) {
                                        navigate(`/service/${promo.slug}`);
                                    }
                                }}
                                className="min-w-full snap-center h-full relative cursor-pointer flex-shrink-0"
                            >
                                <img 
                                    src={promo.imageUrl || promo.image} 
                                    alt={promo.title} 
                                    className="absolute inset-0 w-full h-full object-cover"
                                />
                                {/* Bottom Overlay */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-6 pb-12 md:p-8">
                                    <div className="space-y-1.5 md:space-y-2">
                                        {(promo.features || [promo.title, promo.subtitle].filter(Boolean)).map((feature, i) => (
                                            <div key={i} className="flex items-center gap-2">
                                                <div className="bg-orange-500 rounded-md p-0.5">
                                                    <CheckCircle2 size={12} className="text-white fill-orange-500" />
                                                </div>
                                                <span className="text-xs md:text-sm font-black text-white uppercase tracking-wide">{feature}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    {/* Floating Carousel Indicators */}
                    <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex justify-center gap-2 z-20">
                        {promos.map((_, i) => (
                            <div 
                                key={i} 
                                className={`h-1.5 rounded-full transition-all duration-300 ${activeBanner === i ? 'w-6 bg-orange-500' : 'w-1.5 bg-white/50'}`}
                            />
                        ))}
                    </div>

                    {/* Transparent Floating Header Action Buttons */}
                    <div className="absolute top-4 left-4 right-4 z-40 flex items-center justify-between">
                        <button 
                            onClick={() => navigate('/')}
                            className="w-10 h-10 flex items-center justify-center bg-black/45 backdrop-blur-md rounded-full border border-white/20 text-white hover:bg-black/60 transition-all active:scale-95 shadow-md"
                        >
                            <ArrowLeft size={20} className="stroke-[3]" />
                        </button>

                        {/* Floating City Location Badge */}
                        {currentCity?.name && (
                            <div className="bg-black/45 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/20 text-white text-xs font-black tracking-widest uppercase flex items-center gap-1 shadow-md">
                                <span>{currentCity.name}</span>
                                <ChevronRight size={10} className="rotate-90 stroke-[3] text-emerald-400 animate-pulse" />
                            </div>
                        )}

                        {/* Empty spacer to keep the city badge perfectly centered */}
                        <div className="w-10 h-10" />
                    </div>
                </div>

                {/* Overlapping Floating Search Bar (Placed OUTSIDE overflow parent to prevent clipping) */}
                <div className="absolute bottom-0 left-6 right-6 translate-y-1/2 z-30 max-w-xl mx-auto">
                    <div className="flex items-center bg-white border border-gray-100 rounded-2xl px-4 py-3.5 shadow-lg shadow-gray-200/80 gap-2.5">
                        <Search size={18} className="text-gray-400 flex-shrink-0 stroke-[3]" />
                        <input 
                            type="text" 
                            placeholder="Search for services or R.O..." 
                            className="bg-transparent border-none outline-none w-full text-sm font-semibold text-gray-700 placeholder:text-gray-400"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Service Categories */}
            <section className="mt-14 px-5 max-w-7xl mx-auto">
                <div className="flex flex-col mb-8 group">
                    <div className="flex items-center gap-2 mb-1.5">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_12px_rgba(16,185,129,0.8)] animate-pulse" />
                        <span className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.25em]">Explore</span>
                    </div>
                    <h2 className="text-2xl font-black text-gray-900 tracking-tight leading-none">
                        Service <span className="text-emerald-600">Categories</span>
                    </h2>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-2">Premium Home Solutions for Every Need</p>
                </div>

                <div className="grid grid-cols-4 gap-y-4 gap-x-3.5">
                    {categories.map((cat) => (
                        <motion.button 
                            key={cat.id || cat._id}
                            whileHover={{ y: -6 }}
                            whileTap={{ scale: 0.96 }}
                            onClick={() => openCategoryModal(cat)}
                            className="w-full h-36 sm:h-48 bg-white border border-gray-100 rounded-[1.5rem] shadow-md shadow-gray-100/50 overflow-hidden flex flex-col justify-between relative group cursor-pointer"
                        >
                            {/* Centered Title on Top */}
                            <div className="p-2 sm:p-3 pt-3 sm:pt-4 text-center z-10 flex flex-col items-center justify-center flex-1 w-full">
                                <span className="text-[9px] sm:text-xs font-black text-gray-800 uppercase tracking-tight leading-tight line-clamp-2">
                                    {cat.title || cat.name}
                                </span>
                            </div>

                            {/* High Quality Category Image at the bottom */}
                            <div className="w-full h-[58%] relative overflow-hidden flex-shrink-0 bg-gray-50/50">
                                <img 
                                    src={cat.imageUrl || cat.image || cat.homeIconUrl} 
                                    alt={cat.title || cat.name} 
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                                />
                                {/* Overlay Gradient blending image into the top white background */}
                                <div className="absolute inset-x-0 top-0 h-6 bg-gradient-to-b from-white via-white/40 to-transparent" />

                                {/* Premium Overlay Badge logic placed cleanly on the image itself to prevent title clipping */}
                                {(cat.hasSaleBadge && cat.homeBadge) ? (
                                    <div className="absolute top-2 right-2 z-20">
                                        <span className="bg-emerald-500 text-white text-[7px] font-black px-1.5 py-0.5 rounded shadow-sm uppercase tracking-tighter">
                                            {cat.homeBadge}
                                        </span>
                                    </div>
                                ) : cat.isPopular ? (
                                    <div className="absolute top-2 right-2 z-20">
                                        <span className="bg-[#D68F35] text-white text-[7px] font-black px-1.5 py-0.5 rounded shadow-sm uppercase tracking-tighter">
                                            POPULAR
                                        </span>
                                    </div>
                                ) : null}
                            </div>
                        </motion.button>
                    ))}
                </div>
            </section>

            {/* Thoughtful Curations */}
            {homeData?.isCuratedVisible !== false && curations.length > 0 && (
                <section className="mt-12 px-5 max-w-7xl mx-auto">
                    <div className="flex flex-col mb-8">
                        <div className="flex items-center gap-2 mb-1.5">
                            <div className="w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_12px_rgba(16,185,129,0.8)]" />
                            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.25em]">Handpicked</span>
                        </div>
                        <h2 className="text-2xl font-black text-gray-900 tracking-tight leading-none">
                            Thoughtful <span className="text-emerald-600">Curations</span>
                        </h2>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-2">Expertly selected for your lifestyle</p>
                    </div>

                    <div className="flex overflow-x-auto gap-5 no-scrollbar pb-6 -mx-1 px-1 snap-x snap-mandatory">
                        {curations.map((item, idx) => {
                            const youtubeId = getYoutubeId(item.youtubeUrl);
                            const isPlaying = playingVideoIdx === idx;
                            
                            if (youtubeId) {
                                return (
                                    <div 
                                        key={idx}
                                        className="min-w-full md:min-w-[450px] snap-center h-52 md:h-64 rounded-[2.5rem] relative overflow-hidden shadow-xl shadow-gray-200/40 bg-black group"
                                    >
                                        {isPlaying ? (
                                            <iframe
                                                src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&mute=0&controls=1&rel=0&modestbranding=1`}
                                                title={item.title}
                                                className="absolute inset-0 w-full h-full border-0"
                                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                allowFullScreen
                                            ></iframe>
                                        ) : (
                                            <div 
                                                className="absolute inset-0 w-full h-full cursor-pointer"
                                                onClick={() => setPlayingVideoIdx(idx)}
                                            >
                                                <img 
                                                    src={`https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`}
                                                    alt={item.title}
                                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                                    onError={(e) => {
                                                        e.target.src = `https://img.youtube.com/vi/${youtubeId}/0.jpg`;
                                                    }}
                                                />
                                                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                                                    <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center shadow-2xl transition-transform group-hover:scale-110 active:scale-95">
                                                        <div className="w-0 h-0 border-t-[10px] border-t-transparent border-l-[18px] border-l-white border-b-[10px] border-b-transparent ml-1" />
                                                    </div>
                                                </div>
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex flex-col justify-end p-6">
                                                    <h4 className="font-black text-white text-lg leading-tight">{item.title}</h4>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            }

                            return (
                                <motion.div 
                                    key={idx}
                                    whileHover={{ y: -8 }}
                                    onClick={() => {
                                        if (item.targetCategoryId) {
                                            const cat = categories.find(c => (c.id || c._id) === item.targetCategoryId);
                                            openCategoryModal(cat || { id: item.targetCategoryId, title: item.title });
                                        } else if (item.slug) {
                                            navigate(`/service/${item.slug}`);
                                        }
                                    }}
                                    className="min-w-full md:min-w-[450px] snap-center h-52 md:h-64 rounded-[2.5rem] relative overflow-hidden shadow-xl shadow-gray-200/40 group bg-gray-900 cursor-pointer"
                                >
                                    <div className="relative h-full overflow-hidden">
                                        {item.gifUrl ? (
                                            (() => {
                                                const isImage = item.gifUrl.match(/\.(gif|webp|jpg|jpeg|png)$/i);
                                                
                                                if (isImage) {
                                                    return (
                                                        <img 
                                                            src={item.gifUrl} 
                                                            alt={item.title} 
                                                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                                                        />
                                                    );
                                                } else {
                                                    return (
                                                        <video 
                                                            key={item.gifUrl}
                                                            src={item.gifUrl} 
                                                            className="w-full h-full object-cover" 
                                                            autoPlay 
                                                            loop 
                                                            muted 
                                                            playsInline
                                                            preload="auto"
                                                        />
                                                    );
                                                }
                                            })()
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-gray-100">
                                                <Sparkles className="text-gray-300 w-12 h-12" />
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex flex-col justify-end p-5 pointer-events-none">
                                            <h4 className="font-black text-white text-lg leading-tight">{item.title}</h4>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                </section>
            )}

            {/* Direct Home Services Categories (Dynamically created Categories showing their sub-categories in circular layout) */}
            {directCategories.length > 0 && directCategories.map((cat) => {
                const subCats = directSubCategoriesMap[cat._id || cat.id] || [];
                if (subCats.length === 0) return null;

                return (
                    <section key={cat._id || cat.id} className="mt-12 px-5 max-w-7xl mx-auto">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex flex-col">
                                <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight leading-none uppercase">
                                    {cat.title}
                                </h2>
                                <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest mt-1.5">Select a service to proceed</p>
                            </div>
                        </div>

                        {/* Circular Scrolling List */}
                        <div className="flex overflow-x-auto gap-6 no-scrollbar pb-4 -mx-5 px-5 snap-x snap-mandatory">
                            {subCats.map((subCat) => (
                                <motion.button
                                    key={subCat._id || subCat.id}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => {
                                        navigate('/home-services/sub-category', { 
                                            state: { 
                                                subCategory: {
                                                    id: subCat._id || subCat.id,
                                                    title: subCat.title,
                                                    iconUrl: subCat.icon || subCat.imageUrl,
                                                    bannerUrl: subCat.bannerUrl || subCat.imageUrl || subCat.icon
                                                }, 
                                                category: {
                                                    id: cat._id || cat.id,
                                                    title: cat.title
                                                }
                                            } 
                                        });
                                    }}
                                    className="flex flex-col items-center flex-shrink-0 snap-start group cursor-pointer"
                                    style={{ width: '84px' }}
                                >
                                    {/* Circular image container matching screenshot exactly */}
                                    <div className="w-[84px] h-[84px] rounded-full border-2 border-emerald-500/20 group-hover:border-emerald-500 overflow-hidden relative shadow-md transition-all duration-300 bg-white flex items-center justify-center p-[3px]">
                                        <img 
                                            src={toAssetUrl(subCat.icon || subCat.imageUrl)} 
                                            alt={subCat.title}
                                            className="w-full h-full object-cover rounded-full transition-transform duration-500 group-hover:scale-110"
                                        />
                                    </div>
                                    {/* Label text below */}
                                    <span className="text-[10px] font-black text-gray-800 text-center leading-tight line-clamp-2 mt-2 px-1 uppercase tracking-tighter w-full">
                                        {subCat.title}
                                    </span>
                                </motion.button>
                            ))}
                        </div>
                    </section>
                );
            })}

            {/* Why Hoomzo Services */}
            <section className="mt-10 px-5 max-w-7xl mx-auto">
                <div className="bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 rounded-[2.5rem] p-8 relative overflow-hidden shadow-2xl shadow-emerald-200/50">
                    {/* Decorative Elements */}
                    <div className="absolute top-[-20%] right-[-10%] w-80 h-80 bg-white/10 blur-[100px] rounded-full animate-pulse" />
                    <div className="absolute bottom-[-10%] left-[-5%] w-40 h-40 bg-emerald-400/20 blur-[60px] rounded-full" />
                    
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="h-[2px] w-8 bg-emerald-300/50 rounded-full" />
                            <span className="text-[10px] font-bold text-emerald-200/80 uppercase tracking-[0.2em]">Why Choose Us</span>
                        </div>
                        
                        <h3 className="text-3xl font-bold text-white mb-10 leading-tight tracking-tight">
                            Standardizing Home <br /> 
                            <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-200 to-teal-100">
                                Services for You.
                            </span>
                        </h3>

                        <div className="grid grid-cols-1 gap-4">
                            {[
                                {
                                    icon: ShieldCheck,
                                    title: "Verified Professionals",
                                    desc: "Background checked & trained experts for every job.",
                                    color: "from-blue-400 to-indigo-500"
                                },
                                {
                                    icon: Sparkles,
                                    title: "Satisfaction Guaranteed",
                                    desc: "We ensure 100% quality or we'll make it right.",
                                    color: "from-amber-400 to-orange-500"
                                }
                            ].map((feature, idx) => (
                                <motion.div 
                                    key={idx}
                                    whileHover={{ x: 5 }}
                                    className="flex items-center gap-4 bg-white/10 backdrop-blur-xl border border-white/10 p-4 rounded-3xl group transition-all"
                                >
                                    <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-white shadow-inner group-hover:scale-110 transition-transform">
                                        <feature.icon size={22} className="text-emerald-300" />
                                    </div>
                                    <div>
                                        <h5 className="font-bold text-white text-sm mb-0.5 uppercase tracking-tight">{feature.title}</h5>
                                        <p className="text-emerald-50/70 text-[11px] font-semibold leading-tight">{feature.desc}</p>
                                    </div>
                                </motion.div>
                            ))}
                        </div>

                        <div className="mt-8 flex items-center gap-2 text-emerald-200/40">
                            <CheckCircle2 size={14} />
                            <span className="text-[10px] font-bold uppercase tracking-widest">Trusted by 50,000+ Households</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* New and Noteworthy */}
            <section className="mt-12 px-5 max-w-7xl mx-auto">
                <div className="flex flex-col mb-8">
                    <div className="flex items-center gap-2 mb-1.5">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_12px_rgba(16,185,129,0.8)]" />
                        <span className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.25em]">Fresh</span>
                    </div>
                    <h2 className="text-2xl font-black text-gray-900 tracking-tight leading-none">
                        New & <span className="text-emerald-600">Noteworthy</span>
                    </h2>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-2">Discover the latest arrivals</p>
                </div>
                <div className="flex overflow-x-auto gap-4 no-scrollbar pb-4">
                    {noteworthy.map((item) => (
                        <motion.div 
                            key={item.id || item._id}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => {
                                if (item.targetCategoryId) {
                                    const cat = categories.find(c => (c.id || c._id) === item.targetCategoryId);
                                    openCategoryModal(cat || { id: item.targetCategoryId, title: item.title });
                                } else if (item.slug) {
                                    navigate(`/service/${item.slug}`);
                                }
                            }}
                            className="min-w-[170px] bg-white rounded-[1.5rem] border border-gray-100 shadow-lg shadow-gray-200/30 p-3 cursor-pointer"
                        >
                            <div className="aspect-square bg-gray-50 rounded-xl overflow-hidden mb-3">
                                <img src={item.imageUrl || item.image} alt={item.title} className="w-full h-full object-contain" />
                            </div>
                            <h4 className="font-bold text-gray-800 text-[11px] line-clamp-2 text-center px-1 h-8 leading-tight">
                                {item.title}
                            </h4>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* Most Booked Services */}
            <section className="mt-12 px-5 pb-4 max-w-7xl mx-auto">
                <div className="flex flex-col mb-8">
                    <div className="flex items-center gap-2 mb-1.5">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_12px_rgba(16,185,129,0.8)]" />
                        <span className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.25em]">Trending</span>
                    </div>
                    <h2 className="text-2xl font-black text-gray-900 tracking-tight leading-none">
                        Most <span className="text-emerald-600">Booked</span> Services
                    </h2>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-2">Most loved by our community</p>
                </div>
                <div className="flex overflow-x-auto gap-4 no-scrollbar pb-6">
                    {mostBooked.map((service) => (
                        <motion.div 
                            key={service.id || service._id}
                            whileHover={{ y: -5 }}
                            onClick={() => {
                                if (service.targetCategoryId) {
                                    const cat = categories.find(c => (c.id || c._id) === service.targetCategoryId);
                                    openCategoryModal(cat || { id: service.targetCategoryId, title: service.title });
                                } else if (service.slug) {
                                    navigate(`/service/${service.slug}`);
                                }
                            }}
                            className="min-w-[165px] bg-white rounded-[1.5rem] border border-gray-100 shadow-lg shadow-gray-200/30 overflow-hidden cursor-pointer"
                        >
                            <div className="h-40 bg-gray-50 p-2 overflow-hidden">
                                <img src={service.imageUrl || service.image} alt={service.title} className="w-full h-full object-contain" />
                            </div>
                            <div className="p-3 flex flex-col items-center">
                                <h4 className="font-bold text-gray-800 text-[11px] line-clamp-2 mb-2 h-8 leading-tight text-center">
                                    {service.title}
                                </h4>
                                <div className="flex items-center gap-1.5 text-[10px] font-black text-gray-700 mb-3 justify-center">
                                    <Star size={12} className="text-yellow-400 fill-yellow-400" />
                                    {service.rating || '4.0'}
                                </div>
                                <div className="flex items-center justify-between w-full">
                                    <span className="text-xs font-black text-gray-900">₹{service.price}</span>
                                    <button className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase shadow-lg shadow-emerald-200/50 hover:shadow-emerald-300/50 transition-all active:scale-95">
                                        Book
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* Customer Reviews Section */}
            {homeData?.isReviewsVisible !== false && (homeData?.reviews || []).length > 0 && (
                <section className="mt-12 px-5 pb-4 max-w-7xl mx-auto">
                    <div className="flex flex-col mb-8">
                        <div className="flex items-center gap-2 mb-1.5">
                            <div className="w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_12px_rgba(16,185,129,0.8)]" />
                            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.25em]">Testimonials</span>
                        </div>
                        <h2 className="text-2xl font-black text-gray-900 tracking-tight leading-none">
                            Customer <span className="text-emerald-600">Reviews</span>
                        </h2>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-2">What our clients say about us</p>
                    </div>
                    
                    <div className="flex overflow-x-auto gap-5 no-scrollbar pb-6 -mx-5 px-5">
                        {homeData.reviews.map((review, idx) => (
                            <div 
                                key={review.id || idx}
                                className="min-w-[280px] max-w-[280px] bg-white rounded-3xl border border-gray-100 shadow-md shadow-gray-200/20 p-5 flex flex-col justify-between"
                            >
                                <div>
                                    <div className="flex items-center">
                                        <div className="relative w-12 h-12 flex-shrink-0">
                                            {review.imageUrl ? (
                                                <img 
                                                    src={toAssetUrl(review.imageUrl)} 
                                                    alt={review.name} 
                                                    className="w-full h-full object-cover rounded-full"
                                                />
                                            ) : (
                                                <div className="w-full h-full rounded-full bg-gradient-to-tr from-emerald-500 to-teal-600 text-white flex items-center justify-center font-bold text-sm">
                                                    {review.name ? review.name.charAt(0).toUpperCase() : '?'}
                                                </div>
                                            )}
                                            <div className="absolute bottom-[-4px] right-[-4px] bg-gray-900 text-white text-[8px] font-black px-1.5 py-0.5 rounded-md flex items-center gap-0.5 shadow-md">
                                                <span>{review.rating || '5.0'}</span>
                                                <Star size={7} className="text-yellow-400 fill-yellow-400" />
                                            </div>
                                        </div>
                                        <div className="flex-1 min-w-0 ml-3 flex flex-col justify-center">
                                            <h4 className="text-xs font-black text-gray-900 truncate leading-snug">{review.name}</h4>
                                            <span className="text-[9px] text-gray-400 font-bold uppercase tracking-tight mt-0.5 truncate">{review.subText || 'Customer'}</span>
                                        </div>
                                    </div>
                                    
                                    <p className="text-[11px] text-gray-500 font-medium leading-relaxed mt-4 line-clamp-4">
                                        {review.description}
                                    </p>
                                </div>
                                
                                <div className="mt-3">
                                    <span className="text-teal-600 hover:text-teal-700 text-[10px] font-black cursor-pointer">see more</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Frequently Asked Questions Section */}
            {homeData?.isFaqsVisible !== false && (homeData?.faqs || []).length > 0 && (
                <section className="mt-12 px-5 pb-32 max-w-3xl mx-auto">
                    <div className="flex flex-col mb-8">
                        <div className="flex items-center gap-2 mb-1.5">
                            <div className="w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_12px_rgba(16,185,129,0.8)]" />
                            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.25em]">Support</span>
                        </div>
                        <h2 className="text-2xl font-black text-gray-900 tracking-tight leading-none">
                            Frequently Asked <span className="text-emerald-600">Questions</span>
                        </h2>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-2">Find answers to common queries</p>
                    </div>

                    <div className="space-y-4">
                        {homeData.faqs.map((faq, idx) => {
                            const isOpen = activeFaqIndex === idx;
                            return (
                                <div key={faq.id || idx} className="border-b border-gray-100 pb-4">
                                    <button
                                        onClick={() => setActiveFaqIndex(isOpen ? null : idx)}
                                        className="w-full flex items-center justify-between py-3 text-left focus:outline-none transition-colors"
                                    >
                                        <span className={`text-[13px] font-black tracking-tight transition-colors duration-200 ${isOpen ? 'text-emerald-600' : 'text-gray-800'}`}>
                                            {faq.question}
                                        </span>
                                        <div className="flex-shrink-0 ml-4 transition-transform duration-300">
                                            {isOpen ? (
                                                <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
                                            ) : (
                                                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"/></svg>
                                            )}
                                        </div>
                                    </button>
                                    
                                    <AnimatePresence initial={false}>
                                        {isOpen && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: "auto", opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                transition={{ duration: 0.2 }}
                                                className="overflow-hidden"
                                            >
                                                <p className="text-[12px] text-gray-500 font-medium leading-relaxed pt-1 pb-3 pr-6">
                                                    {faq.answer}
                                                </p>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            );
                        })}
                    </div>
                </section>
            )}

            {/* Custom Bottom Nav for Home Services */}
            <div className="fixed bottom-0 left-0 right-0 z-[100] bg-white border-t border-gray-100 py-2.5 px-6 shadow-[0_-5px_20px_rgba(0,0,0,0.05)]">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <button onClick={() => navigate('/')} className="flex flex-col items-center gap-1 group">
                        <div className="w-10 h-10 flex items-center justify-center text-gray-400 group-hover:text-emerald-600 transition-colors">
                            <Home size={22} />
                        </div>
                        <span className="text-[10px] font-bold text-gray-400 group-hover:text-emerald-600 uppercase tracking-tighter">Home</span>
                    </button>

                    <button className="flex flex-col items-center gap-1 group">
                        <div className="w-10 h-10 flex items-center justify-center text-gray-400 group-hover:text-emerald-600 transition-colors">
                            <Calendar size={22} />
                        </div>
                        <span className="text-[10px] font-bold text-gray-400 group-hover:text-emerald-600 uppercase tracking-tighter">Bookings</span>
                    </button>

                    <button className="flex flex-col items-center gap-1 group relative">
                        <div className="w-10 h-10 flex items-center justify-center text-gray-400 group-hover:text-emerald-600 transition-colors">
                            <ShoppingCart size={22} />
                        </div>
                        <div className="absolute top-1 right-1 w-4.5 h-4.5 bg-rose-600 rounded-full border-2 border-white flex items-center justify-center">
                            <span className="text-[9px] font-black text-white">2</span>
                        </div>
                        <span className="text-[10px] font-bold text-gray-400 group-hover:text-emerald-600 uppercase tracking-tighter">Cart</span>
                    </button>

                    <button onClick={() => navigate('/profile')} className="flex flex-col items-center gap-1 group">
                        <div className="w-10 h-10 flex items-center justify-center text-gray-400 group-hover:text-emerald-600 transition-colors">
                            <User size={22} />
                        </div>
                        <span className="text-[10px] font-bold text-gray-400 group-hover:text-emerald-600 uppercase tracking-tighter">Profile</span>
                    </button>
                </div>
            </div>
            <CategoryModal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                category={selectedCategory}
                currentCity={currentCity}
            />
        </div>
    );
};

export default HomeServicesPage;

