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

const HomeServicesPage = () => {
    const navigate = useNavigate();
    const { currentCity } = useCity();
    const [searchQuery, setSearchQuery] = useState('');
    const [isScrolled, setIsScrolled] = useState(false);
    const [activeBanner, setActiveBanner] = useState(0);
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

    const [homeData, setHomeData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [categories, setCategories] = useState([]);
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
                        setCategories(catRes.categories || []);
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
            {/* Header Section */}
            <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? 'bg-white/95 backdrop-blur-xl shadow-md py-3' : 'bg-transparent py-6'}`}>
                <div className="max-w-7xl mx-auto px-5 flex items-center justify-between gap-4">
                    <button 
                        onClick={() => navigate('/')}
                        className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <ArrowLeft size={24} className="text-gray-900" />
                    </button>

                    <div className="flex-1 flex items-center bg-white border border-gray-100 rounded-2xl px-5 py-3.5 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07)] hover:shadow-md transition-all">
                        <Search size={20} className="text-orange-400 mr-3" />
                        <input 
                            type="text" 
                            placeholder="Search for R.O." 
                            className="bg-transparent border-none outline-none w-full text-base font-medium text-gray-700 placeholder:text-gray-400"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <div className="relative">
                        <button className="w-11 h-11 flex items-center justify-center bg-[#FDF2F2] rounded-full border border-rose-100/50 shadow-sm transition-all active:scale-90">
                            <Bell size={22} className="text-rose-500 fill-rose-50" />
                            <div className="absolute top-0 -right-1 w-5 h-5 bg-rose-600 rounded-full border-2 border-white flex items-center justify-center shadow-sm">
                                <span className="text-[10px] font-black text-white leading-none">9+</span>
                            </div>
                        </button>
                    </div>
                </div>
            </header>

            {/* Banner Carousel */}
            <section className="pt-32 px-5 max-w-7xl mx-auto">
                <div className="relative">
                    <div 
                        ref={scrollContainerRef}
                        onScroll={handleBannerScroll}
                        className="flex overflow-x-auto snap-x snap-mandatory gap-4 no-scrollbar pb-2"
                    >
                        {promos.map((promo) => (
                            <motion.div 
                                key={promo.id}
                                onClick={() => {
                                    if (promo.slug) navigate(`/service/${promo.slug}`);
                                    else if (promo.targetCategoryId) navigate(`/category/${promo.targetCategoryId}`);
                                }}
                                className="min-w-full md:min-w-[450px] snap-center h-52 md:h-64 rounded-[2.5rem] relative overflow-hidden shadow-xl shadow-gray-200 cursor-pointer"
                            >
                                <img 
                                    src={promo.imageUrl || promo.image} 
                                    alt={promo.title} 
                                    className="absolute inset-0 w-full h-full object-cover"
                                />
                                {/* Bottom Overlay */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-6 md:p-8">
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

                    {/* Carousel Indicators */}
                    <div className="flex justify-center gap-2 mt-4">
                        {promos.map((_, i) => (
                            <div 
                                key={i} 
                                className={`h-2 rounded-full transition-all duration-300 ${activeBanner === i ? 'w-8 bg-orange-500' : 'w-2 bg-gray-300'}`}
                            />
                        ))}
                    </div>
                </div>
            </section>

            {/* Service Categories */}
            <section className="mt-8 px-5 max-w-7xl mx-auto">
                <div className="flex flex-col mb-8">
                    <h2 className="text-[22px] font-black text-gray-900 tracking-tight flex items-center gap-2">
                        Service Categories
                        <div className="w-2.5 h-2.5 bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]"></div>
                    </h2>
                    <p className="text-[10px] text-gray-400 font-black tracking-[0.15em] uppercase mt-0.5">Premium Home Services</p>
                </div>

                <div className="grid grid-cols-4 gap-y-8 gap-x-4">
                    {categories.map((cat) => (
                        <motion.button 
                            key={cat.id || cat._id}
                            whileHover={{ y: -5 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => navigate(`/category/${cat._id || cat.id}`)}
                            className="flex flex-col items-center group relative"
                        >
                            <div className="w-16 h-16 md:w-20 md:h-20 bg-white border border-gray-100 rounded-[1.5rem] flex items-center justify-center shadow-lg shadow-gray-200/50 overflow-hidden relative p-2">
                                {cat.isPopular && (
                                    <div className="absolute top-1.5 -right-1 z-10">
                                        <div className="bg-[#D68F35] text-white text-[8px] font-black px-2 py-0.5 rounded-l-full shadow-sm">
                                            POPULAR
                                        </div>
                                    </div>
                                )}
                                <img 
                                    src={cat.homeIconUrl || cat.imageUrl || cat.image} 
                                    alt={cat.title || cat.name} 
                                    className={`w-full h-full object-contain transition-transform duration-500 group-hover:scale-110 ${cat.isBrand ? 'opacity-70' : ''}`} 
                                />
                            </div>
                            <span className="text-[10px] md:text-[11px] font-bold text-gray-900 mt-3 text-center leading-tight max-w-[80px]">
                                {cat.title || cat.name}
                            </span>
                        </motion.button>
                    ))}
                </div>
            </section>

            {/* Thoughtful Curations */}
            {homeData?.isCuratedVisible !== false && curations.length > 0 && (
                <section className="mt-12 px-5 max-w-7xl mx-auto">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex flex-col">
                            <h2 className="text-xl font-black text-gray-900 tracking-tight">Thoughtful Curations</h2>
                            <p className="text-[11px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">Handpicked for your home</p>
                        </div>
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
                                        if (item.slug) navigate(`/service/${item.slug}`);
                                        else if (item.targetCategoryId) navigate(`/category/${item.targetCategoryId}`);
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

            {/* Why Hoomzo Services */}
            <section className="mt-8 px-5 max-w-7xl mx-auto">
                <div className="bg-emerald-600 rounded-[3rem] p-8 relative overflow-hidden">
                    <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-white/10 blur-[80px] rounded-full" />
                    
                    <h3 className="text-2xl font-black text-white mb-8 relative z-10 leading-tight">
                        Standardizing Home <br /> <span className="text-emerald-200">Services for You.</span>
                    </h3>

                    <div className="grid grid-cols-1 gap-6 relative z-10">
                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center text-white border border-white/20">
                                <ShieldCheck size={24} />
                            </div>
                            <div>
                                <h5 className="font-black text-white text-sm mb-1 uppercase tracking-tight">Verified Professionals</h5>
                                <p className="text-emerald-100 text-xs font-medium leading-relaxed">Background checked & trained experts for every job.</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center text-white border border-white/20">
                                <Sparkles size={24} />
                            </div>
                            <div>
                                <h5 className="font-black text-white text-sm mb-1 uppercase tracking-tight">Satisfaction Guaranteed</h5>
                                <p className="text-emerald-100 text-xs font-medium leading-relaxed">We ensure 100% quality or we'll make it right.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* New and Noteworthy */}
            <section className="mt-12 px-5 max-w-7xl mx-auto">
                <h2 className="text-xl font-black text-gray-900 mb-6 tracking-tight">New and noteworthy</h2>
                <div className="flex overflow-x-auto gap-4 no-scrollbar pb-4">
                    {noteworthy.map((item) => (
                        <motion.div 
                            key={item.id || item._id}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => {
                                if (item.slug) navigate(`/service/${item.slug}`);
                                else if (item.targetCategoryId) navigate(`/category/${item.targetCategoryId}`);
                            }}
                            className="min-w-[240px] bg-white rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-200/40 p-4 cursor-pointer"
                        >
                            <div className="aspect-square bg-gray-50 rounded-2xl overflow-hidden mb-4">
                                <img src={item.imageUrl || item.image} alt={item.title} className="w-full h-full object-contain" />
                            </div>
                            <h4 className="font-bold text-gray-800 text-sm">{item.title}</h4>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* Most Booked Services */}
            <section className="mt-12 px-5 max-w-7xl mx-auto">
                <h2 className="text-xl font-black text-gray-900 mb-6 tracking-tight">Most booked services</h2>
                <div className="flex overflow-x-auto gap-4 no-scrollbar pb-6">
                    {mostBooked.map((service) => (
                        <motion.div 
                            key={service.id || service._id}
                            whileHover={{ y: -5 }}
                            onClick={() => {
                                if (service.slug) navigate(`/service/${service.slug}`);
                                else if (service.targetCategoryId) navigate(`/category/${service.targetCategoryId}`);
                            }}
                            className="min-w-[200px] bg-white rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-200/40 overflow-hidden cursor-pointer"
                        >
                            <div className="h-48 bg-gray-50 p-2 overflow-hidden">
                                <img src={service.imageUrl || service.image} alt={service.title} className="w-full h-full object-contain" />
                            </div>
                            <div className="p-4">
                                <h4 className="font-bold text-gray-800 text-[13px] line-clamp-2 mb-3 h-10 leading-tight">
                                    {service.title}
                                </h4>
                                <div className="flex items-center gap-1.5 text-xs font-black text-gray-700 mb-4">
                                    <Star size={14} className="text-yellow-400 fill-yellow-400" />
                                    {service.rating || '4.0'}
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-black text-gray-900">₹{service.price}</span>
                                    <button className="bg-gradient-to-r from-[#D68F35] to-[#B07020] text-white px-4 py-1.5 rounded-full text-[10px] font-black shadow-lg shadow-orange-900/10 active:scale-95 transition-all uppercase">
                                        Book
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </section>

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

                    <button onClick={() => navigate('/profile/edit')} className="flex flex-col items-center gap-1">
                        <div className="w-12 h-12 flex flex-col items-center justify-center bg-[#F3E8FF] rounded-2xl text-purple-600 shadow-sm border border-purple-100">
                            <User size={22} />
                            <span className="text-[9px] font-black uppercase tracking-tighter mt-0.5">Profile</span>
                        </div>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default HomeServicesPage;

