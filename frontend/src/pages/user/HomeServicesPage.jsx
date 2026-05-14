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

const HomeServicesPage = () => {
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [isScrolled, setIsScrolled] = useState(false);
    const [activeBanner, setActiveBanner] = useState(0);
    const scrollContainerRef = useRef(null);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);

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

    const handleBannerScroll = (e) => {
        const scrollLeft = e.target.scrollLeft;
        const width = e.target.offsetWidth;
        const index = Math.round(scrollLeft / width);
        setActiveBanner(index);
    };

    const categories = [
        { id: 'cooler', name: 'Cooler', image: 'https://images.unsplash.com/photo-1591016844941-6e3e5c944f2d?auto=format&fit=crop&q=80&w=200', hasSale: true },
        { id: 'truliq', name: 'Truliq Home Service', image: '/truliq-logo.png', isBrand: true },
        { id: 'ac', name: 'AC', image: 'https://images.unsplash.com/photo-1590424744257-fdb03ed78ae0?auto=format&fit=crop&q=80&w=200' },
        { id: 'led', name: 'LED', image: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?auto=format&fit=crop&q=80&w=200' },
        { id: 'chimney', name: 'Kitchen Chimney', image: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&q=80&w=200' },
        { id: 'washing', name: 'Washing Machine', image: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&q=80&w=200' },
        { id: 'fridge', name: 'Fridge', image: 'https://images.unsplash.com/photo-1571175432291-384337ada243?auto=format&fit=crop&q=80&w=200' },
        { id: 'ro', name: 'R.O. Purifier', image: 'https://images.unsplash.com/photo-1585704032915-c3400ca1f963?auto=format&fit=crop&q=80&w=200' },
        { id: 'microwave', name: 'Microwave', image: 'https://images.unsplash.com/photo-1574269909862-7e1d70bb8078?auto=format&fit=crop&q=80&w=200' },
    ];

    const promos = [
        {
            id: 1,
            title: "AC Repair & Service",
            subtitle: "Gas Charging & AMC",
            image: "https://images.unsplash.com/photo-1590424744257-fdb03ed78ae0?auto=format&fit=crop&q=80&w=800",
            features: ["AC Repair & Service", "Gas Charging & AMC"]
        },
        {
            id: 2,
            title: "Home Deep Cleaning",
            subtitle: "Expert Professionals",
            image: "https://images.unsplash.com/photo-1581578731548-c64695cc6958?auto=format&fit=crop&q=80&w=800",
            features: ["Full Home Cleaning", "Sofa & Carpet Spa"]
        },
        {
            id: 3,
            title: "Washing Machine Repair",
            subtitle: "Genuine Spare Parts",
            image: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&q=80&w=800",
            features: ["Front & Top Load", "AMC Available"]
        }
    ];

    const featuredServices = [
        {
            id: 101,
            title: "Full Home Deep Cleaning",
            rating: 4.8,
            reviews: "2.4k",
            price: 2499,
            originalPrice: 3999,
            image: "https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?auto=format&fit=crop&q=80&w=400",
            duration: "4-6 hrs"
        },
        {
            id: 102,
            title: "Sofa Spa & Shampoo",
            rating: 4.9,
            reviews: "1.8k",
            price: 799,
            originalPrice: 1299,
            image: "https://images.unsplash.com/photo-1550581190-9c1c48d21d6c?auto=format&fit=crop&q=80&w=400",
            duration: "1.5 hrs"
        },
        {
            id: 103,
            title: "Kitchen Deep Cleaning",
            rating: 4.7,
            reviews: "950",
            price: 1299,
            originalPrice: 1899,
            image: "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&q=80&w=400",
            duration: "2-3 hrs"
        }
    ];

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
                                className="min-w-full md:min-w-[450px] snap-center h-52 md:h-64 rounded-[2.5rem] relative overflow-hidden shadow-xl shadow-gray-200"
                            >
                                <img 
                                    src={promo.image} 
                                    alt={promo.title} 
                                    className="absolute inset-0 w-full h-full object-cover"
                                />
                                {/* Bottom Overlay */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-6 md:p-8">
                                    <div className="space-y-1.5 md:space-y-2">
                                        {promo.features.map((feature, i) => (
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
                            key={cat.id}
                            whileHover={{ y: -5 }}
                            whileTap={{ scale: 0.95 }}
                            className="flex flex-col items-center group relative"
                        >
                            <div className="w-16 h-16 md:w-20 md:h-20 bg-white border border-gray-100 rounded-[1.5rem] flex items-center justify-center shadow-lg shadow-gray-200/50 overflow-hidden relative p-2">
                                {cat.hasSale && (
                                    <div className="absolute top-1.5 -right-1 z-10">
                                        <div className="bg-[#D68F35] text-white text-[8px] font-black px-2 py-0.5 rounded-l-full shadow-sm">
                                            SALE
                                        </div>
                                    </div>
                                )}
                                <img 
                                    src={cat.image} 
                                    alt={cat.name} 
                                    className={`w-full h-full object-contain transition-transform duration-500 group-hover:scale-110 ${cat.isBrand ? 'opacity-70' : ''}`} 
                                />
                            </div>
                            <span className="text-[10px] md:text-[11px] font-bold text-gray-900 mt-3 text-center leading-tight max-w-[80px]">
                                {cat.name}
                            </span>
                        </motion.button>
                    ))}
                </div>
            </section>

            {/* Trending Services */}
            <section className="mt-12 px-5 max-w-7xl mx-auto">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex flex-col">
                        <h2 className="text-xl font-black text-gray-900 tracking-tight">Trending Services</h2>
                        <p className="text-[11px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">Most booked by neighbors</p>
                    </div>
                    <button className="text-emerald-600 font-bold text-sm flex items-center gap-1">
                        See All <ChevronRight size={16} />
                    </button>
                </div>

                <div className="flex overflow-x-auto gap-5 no-scrollbar pb-6 -mx-1 px-1">
                    {featuredServices.map((service) => (
                        <motion.div 
                            key={service.id}
                            whileHover={{ y: -8 }}
                            className="min-w-[280px] bg-white rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-200/40 overflow-hidden group"
                        >
                            <div className="relative h-40 overflow-hidden">
                                <img 
                                    src={service.image} 
                                    alt={service.title} 
                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                                />
                                <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full flex items-center gap-1 text-[10px] font-black shadow-sm">
                                    <Star size={10} className="text-orange-400 fill-orange-400" />
                                    {service.rating}
                                </div>
                            </div>
                            <div className="p-5">
                                <h4 className="font-black text-gray-900 mb-1 line-clamp-1">{service.title}</h4>
                                <div className="flex items-center gap-3 text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-4">
                                    <div className="flex items-center gap-1">
                                        <Clock size={12} /> {service.duration}
                                    </div>
                                    <div className="w-1 h-1 bg-gray-300 rounded-full" />
                                    <span>{service.reviews} reviews</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <span className="text-lg font-black text-emerald-600">₹{service.price}</span>
                                        <span className="text-xs text-gray-400 line-through ml-2 font-bold">₹{service.originalPrice}</span>
                                    </div>
                                    <button className="px-6 py-2 bg-emerald-600 text-white text-xs font-black rounded-xl hover:bg-emerald-700 transition-all active:scale-95 shadow-lg shadow-emerald-600/20">
                                        ADD
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </section>

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
                    {[
                        { id: 1, title: 'AC Service and Repair', image: 'https://images.unsplash.com/photo-1590424744257-fdb03ed78ae0?auto=format&fit=crop&q=80&w=400' },
                        { id: 2, title: 'Washing Machine Service', image: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&q=80&w=400' }
                    ].map((item) => (
                        <motion.div 
                            key={item.id}
                            whileTap={{ scale: 0.98 }}
                            className="min-w-[240px] bg-white rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-200/40 p-4"
                        >
                            <div className="aspect-square bg-gray-50 rounded-2xl overflow-hidden mb-4">
                                <img src={item.image} alt={item.title} className="w-full h-full object-contain" />
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
                    {[
                        { id: 1, title: 'Fridge At Home', rating: 4.2, price: 499, image: 'https://images.unsplash.com/photo-1571175432291-384337ada243?auto=format&fit=crop&q=80&w=400' },
                        { id: 2, title: 'washing Machine Repair and Service', rating: 4.4, price: 599, image: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&q=80&w=400' }
                    ].map((service) => (
                        <motion.div 
                            key={service.id}
                            whileHover={{ y: -5 }}
                            className="min-w-[200px] bg-white rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-200/40 overflow-hidden"
                        >
                            <div className="h-48 bg-gray-50 p-2 overflow-hidden">
                                <img src={service.image} alt={service.title} className="w-full h-full object-contain" />
                            </div>
                            <div className="p-4">
                                <h4 className="font-bold text-gray-800 text-[13px] line-clamp-2 mb-3 h-10 leading-tight">
                                    {service.title}
                                </h4>
                                <div className="flex items-center gap-1.5 text-xs font-black text-gray-700 mb-4">
                                    <Star size={14} className="text-yellow-400 fill-yellow-400" />
                                    {service.rating}
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

