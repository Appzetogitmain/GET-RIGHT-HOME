import React, { useState, useEffect, useRef } from 'react';
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
    ChevronLeft,
    Layers,
    Check,
    X,
    User,
    CalendarCheck,
    MapPin,
    Ruler,
    Paintbrush,
    Sparkles,
    Smartphone,
    PlayCircle,
    Maximize2,
    XCircle,
    ChevronDown,
    Truck,
    Package,
    Coins,
    ShieldCheck,
    Clock,
    HeartHandshake,
    Trophy,
    Laptop,
    FileText,
    UserCheck,
    PackageCheck,
    Wallet,
    Award,
    CalendarClock,
    Headset,
    Users
} from 'lucide-react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Autocomplete, useJsApiLoader } from '@react-google-maps/api';
import { toast } from 'react-hot-toast';
import CustomDatePicker from '../../components/user/CustomDatePicker';
import { publicCatalogService } from '../../homster/services/catalogService';
import { useCart } from '../../homster/context/CartContext';
import { useCity } from '../../homster/context/CityContext';
import { goBackOrHome } from '../../utils/navigation';

const toAssetUrl = (url) => {
    if (!url) return '';
    const clean = url.replace('/api/upload', '/upload');
    if (clean.startsWith('http')) return clean;
    const base = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000').replace(/\/api$/, '');
    return `${base}${clean.startsWith('/') ? '' : '/'}${clean}`;
};

const generateRating = (id) => {
    let hash = 0;
    const str = String(id || 'default');
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const ratingValues = [4.6, 4.7, 4.8, 4.9];
    const rating = ratingValues[Math.abs(hash) % ratingValues.length];
    const reviews = 12 + (Math.abs(hash) % 24);
    return { rating, reviews: `${reviews}k` };
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

const POPULAR_CITIES = [
    { name: 'Bangalore', image: '/cities/bangalore.png' },
    { name: 'Mumbai', image: '/cities/mumbai.png' },
    { name: 'Pune', image: '/cities/pune.png' },
    { name: 'Chennai', image: '/cities/chennai.png' },
    { name: 'Hyderabad', image: '/cities/hyderabad.png' },
    { name: 'Delhi NCR', image: '/cities/delhi_ncr.png' },
    { name: 'Kolkata', image: '/cities/kolkata.png' },
    { name: 'Surat', image: '/cities/surat.png' },
    { name: 'Indore', image: '/cities/indore.png' },
    { name: 'Jaipur', image: '/cities/jaipur.png' },
    { name: 'Coimbatore', image: '/cities/coimbatore.png' },
    { name: 'Ahmedabad', image: '/cities/ahmedabad.png' },
];

const GOOGLE_MAPS_LIBRARIES = ['places', 'geometry'];

const RECENT_TRIPS = [
    { name: 'Banupriya', date: '16 Jul 2026', from: 'BANGALORE', to: 'SRINIVASPUR', type: 'BETWEEN CITY', rating: 5.0 },
    { name: 'Dinesh kumar', date: '16 Jul 2026', from: 'BANGALORE', to: 'HOSUR', type: 'BETWEEN CITY', rating: 5.0 },
    { name: 'Ayesha', date: '15 Jul 2026', from: 'MUMBAI', to: 'PUNE', type: 'BETWEEN CITY', rating: 4.8 },
    { name: 'Rajesh', date: '14 Jul 2026', from: 'DELHI', to: 'NOIDA', type: 'WITHIN CITY', rating: 4.9 },
];

const PM_CUSTOMER_REVIEWS = [
    {
        name: "Sid Patil",
        rating: 5.0,
        text: "Best experience throughout the process and very good 😊👍",
        avatar: "https://images.unsplash.com/photo-1531427186611-ecfd6d936c79?w=150&h=150&fit=crop&crop=faces"
    },
    {
        name: "Smriti Singh",
        rating: 5.0,
        text: "The experience was seamless! From the booked the service, the team was very professional and took care of everything. Highly recommended!",
        avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&h=150&fit=crop&crop=faces"
    },
    {
        name: "Rahul Verma",
        rating: 4.8,
        text: "Very good service. The packing was excellent and nothing was damaged during the transit. Would definitely use again.",
        avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&h=150&fit=crop&crop=faces"
    }
];

const COMPARISON_DATA = [
    { label: "Vehicle Assurance", grh: true, local: true },
    { label: "Verified Professional Partners", grh: true, local: false },
    { label: "Safe & Cautious Handling", grh: true, local: false },
    { label: "Bubble / foam wrap", grh: true, local: false },
    { label: "Furniture Disassembly and Reassembly", grh: true, local: true },
    { label: "On Demand Warehouse Storage", grh: true, local: false },
    { label: "Dedicated Customer Support", grh: true, local: false }
];

const PM_FAQS = [
    { category: "Price", q: "Why should I pay a token in advance before the move?", a: "The token is used to confirm slot bookings and avoid any last-minute delays or inconvenience. The token amount will be adjusted in the final payment of your quotation." },
    { category: "Price", q: "Why are weekend and month-end prices higher?", a: "Weekend and month-end prices for Packers and Movers are typically higher due to increased demand during these periods, which leads to limited availability and increased pricing." },
    { category: "Price", q: "Can I get a price breakup for my move?", a: "Our summary page provides a detailed price breakup covering base charges, packaging, unpacking, dismantling, and service charges." },
    { category: "Price", q: "Will I be charged extra for higher floors?", a: "Our service includes door-to-door shifting. However, there might be additional charges if you live in a high-rise with no service lift. You can specify your floor details while booking to get an accurate quote." },
    { category: "Packaging", q: "How do I estimate the number of carton boxes required?", a: "Our system suggests an estimated number of cartons for packing loose and minor inventory items. You can adjust the number at the inventory stage based on your needs. If needed, you can also request a call back." },
    { category: "Process", q: "Is a preliminary inspection required before booking the movement?", a: "If you’re unsure about the items to be moved, we recommend a video inspection for a clear understanding." },
    { category: "Packaging", q: "How are my items packed, and what packing materials are used?", a: "We provide different levels of packaging based on the selected service. Our “Know How We Pack Your Items” section includes videos demonstrating the packing process for local shifting along with a payment link. For intercity packers and movers, it includes detailed videos showcasing the packing procedures." },
    { category: "Price", q: "Are the packing materials included in the package? Are there any hidden charges?", a: "Yes, all packing materials and labour costs are included in the package with no hidden charges." },
    { category: "Service", q: "I have large furniture that may need rope pulling. Is this included?", a: "Rope pulling is not included by default, but you can add it as an extra service based on the floor and item size." },
    { category: "Service", q: "Can I get a call from GetRightHome to clarify my doubts?", a: "Yes! If you have questions about our services, inventory, or pricing, simply click the “Get a Call” button while booking, and our team will contact you." },
    { category: "Service", q: "Who can I contact if I have questions or concerns regarding my house shifting?", a: "You can contact us via live chat support for any questions or concerns or simply on click on “Get a Call” button." },
    { category: "Rescheduling", q: "Can I reschedule my movement after I have paid the token amount?", a: "Yes, you can change your date up to 48 hours before the scheduled booking date. Changes are applicable for weekday-to-weekday or month-end-to-month-end shifts." },
    { category: "Rescheduling", q: "Can you handle last-minute moves?", a: "Yes, we can handle last-minute moves with a notice of at least 3 hours in advance." },
    { category: "Service", q: "Do you conduct background checks on your moving staff?", a: "Yes, we conduct strict background checks on all our moving staff. Every team member is verified and registered on our platform, and only those who clear these checks are assigned to any move." },
    { category: "Process", q: "Do I need to be physically present during the packing and loading?", a: "While our team, along with a supervisor, will handle the packing and loading of your goods, it is recommended that you be present on the day of the move. This ensures the proper handling of your valuable and delicate items." },
    { category: "Process", q: "Will my items be shared with other customers in the same truck (shared load)?", a: "For local moves, your items will be transported in a dedicated truck and not shared with other customers’ items. For intercity shifting, it depends on your chosen load type. If you select a separate load, your items will not be shared with others in the same truck. However, if you opt for shared load, your items may be transported alongside other customers’ goods." },
    { category: "Process", q: "Will the truck be sealed before leaving and opened only at the destination?", a: "For local moves, the truck is sealed after packing and loading and is only opened upon arrival at the destination. For intercity moves, this depends on the load type you choose. With a separate load, the truck is sealed before departure and opened only at the destination. With a shared load, items may be unloaded at a warehouse near the pickup city and reloaded at a warehouse near the delivery city." },
    { category: "Service", q: "What should I do if something is damaged or lost during the move?", a: "We offer 90% compensation in case of damage or loss of the items during the move." },
    { category: "Process", q: "What is the exact claim process in case of damage or loss?", a: "Please submit your claim within 48 hours of delivery. Before submitting, ensure you have the cost of each inventory item in the packing list. Your move manager will arrange the packaging list after you register the claim." },
    { category: "Service", q: "What is your process for handling complaints?", a: "You can reach out to our live chat support or email grievances to grievanceofficer@getrighthome.in." },
    { category: "Service", q: "What steps do you take to improve your relocation services continuously?", a: "Our partner selection rate is just 3%, and we continuously increase the job assignment cut-off rating to ensure top-quality services. So you can rest assured that we have picked the best experts for your packing and moving needs." },
    { category: "Process", q: "How do you handle moves during extreme weather conditions?", a: "We use closed containers and robust packaging to protect your belongings." },
    { category: "Process", q: "What should I do with my pets on moving day?", a: "It’s best to take your pets with you during the move." },
    { category: "Service", q: "Can you move my plants?", a: "Yes, we can move your plants to your new place." }
];

const FAQ_TABS = ["All", "Price", "Rescheduling", "Packaging", "Process", "Service"];

const PackersAndMoversForm = ({ category, subCategory, services, relatedSubCategories = [] }) => {
    const navigate = useNavigate();
    const { addToCart } = useCart();
    const { currentCity } = useCity();
    const reviewsScrollRef = useRef(null);

    const scrollReviews = (direction) => {
        if (reviewsScrollRef.current) {
            const scrollAmount = 260; // Card width + gap
            reviewsScrollRef.current.scrollBy({
                left: direction === 'left' ? -scrollAmount : scrollAmount,
                behavior: 'smooth'
            });
        }
    };

    // Determine current tab based on subCategory title
    const isWithinCity = subCategory?.title?.toLowerCase().includes('within') || !subCategory?.title?.toLowerCase().includes('between');

    // Find the actual subcategories for navigation
    const withinCitySubCat = relatedSubCategories.find(s => s.title?.toLowerCase().includes('within'));
    const betweenCitySubCat = relatedSubCategories.find(s => s.title?.toLowerCase().includes('between'));

    const [shiftingFrom, setShiftingFrom] = useState('');
    const [shiftingTo, setShiftingTo] = useState('');
    const [shiftingDate, setShiftingDate] = useState('');

    // Autocomplete & City Selection State
    const [selectedCity, setSelectedCity] = useState(currentCity?.name || 'Select City');
    const [showCityDropdown, setShowCityDropdown] = useState(false);
    const [autocompleteFrom, setAutocompleteFrom] = useState(null);
    const [autocompleteTo, setAutocompleteTo] = useState(null);
    
    // Protection Modal State
    const [showProtectionModal, setShowProtectionModal] = useState(false);

    // FAQ State
    const [activeFaqTab, setActiveFaqTab] = useState("All");
    const [openFaq, setOpenFaq] = useState(0);
    const [searchFaqQuery, setSearchFaqQuery] = useState("");
    const [isFaqSearchActive, setIsFaqSearchActive] = useState(false);

    let filteredFaqs = PM_FAQS;
    if (isFaqSearchActive && searchFaqQuery.trim()) {
        filteredFaqs = PM_FAQS.filter(faq => 
            faq.q.toLowerCase().includes(searchFaqQuery.toLowerCase()) || 
            faq.a.toLowerCase().includes(searchFaqQuery.toLowerCase())
        );
    } else {
        filteredFaqs = activeFaqTab === "All" ? PM_FAQS : PM_FAQS.filter(faq => faq.category === activeFaqTab);
    }

    const { isLoaded } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAP_API_KEY || import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
        libraries: GOOGLE_MAPS_LIBRARIES
    });

    const onLoadFrom = (autocomplete) => setAutocompleteFrom(autocomplete);
    const onLoadTo = (autocomplete) => setAutocompleteTo(autocomplete);

    const onPlaceChangedFrom = () => {
        if (autocompleteFrom !== null) {
            const place = autocompleteFrom.getPlace();
            if (place) {
                setShiftingFrom(place.formatted_address || place.name || '');
            }
        }
    };

    const onPlaceChangedTo = () => {
        if (autocompleteTo !== null) {
            const place = autocompleteTo.getPlace();
            if (place) {
                setShiftingTo(place.formatted_address || place.name || '');
            }
        }
    };

    const handleCheckPrices = () => {
        if (isWithinCity && (!selectedCity || selectedCity === 'Select City')) {
            toast.error('Please select your City first');
            return;
        }
        if (!shiftingFrom || !shiftingTo) {
            toast.error('Please enter both pickup and drop locations');
            return;
        }
        if (!shiftingDate) {
            toast.error('Please select your shifting date');
            return;
        }

        const customService = {
            _id: `estimate-${Date.now()}`,
            title: isWithinCity ? 'Within City Relocation' : 'Between Cities Relocation',
            description: `City: ${selectedCity}\nFrom: ${shiftingFrom} \nTo: ${shiftingTo}\nDate: ${shiftingDate}`,
            price: 0,
            basePrice: 0,
            discountPrice: 0,
            isEstimateBased: true
        };

        const cartItemData = {
            serviceId: customService._id,
            categoryId: category?.id || category?._id,
            subCategoryId: subCategory?.id || subCategory?._id,
            title: customService.title,
            description: customService.description,
            icon: subCategory?.iconUrl || '',
            category: category?.title,
            subCategory: subCategory?.title,
            price: 0,
            unitPrice: 0,
            serviceCount: 1,
            isEstimateBased: true
        };

        addToCart(cartItemData).then(response => {
            if (response.success) {
                toast.success('Estimate request added to cart!');
            } else {
                toast.error(response.message || 'Failed to add estimate request');
            }
        });
    };

    const handleProceed = handleCheckPrices;

    return (
        <>
            <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 mb-6">
            {!subCategory?.title?.toLowerCase().includes('vehicle') && (
                <div className="bg-gray-100 p-1 flex items-center justify-between mx-4 mt-4 rounded-xl">
                    <div 
                        onClick={() => {
                            if (withinCitySubCat && subCategory?._id !== withinCitySubCat._id) {
                                navigate('/home-services/sub-category', {
                                    state: { category, subCategory: withinCitySubCat }
                                });
                                window.scrollTo(0, 0);
                            }
                        }}
                        className={`flex-1 text-center py-2.5 rounded-lg text-sm font-bold cursor-pointer transition-all duration-300 ${isWithinCity ? 'bg-[#008b74] text-white shadow-md' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Within City
                    </div>
                    <div 
                        onClick={() => {
                            if (betweenCitySubCat && subCategory?._id !== betweenCitySubCat._id) {
                                navigate('/home-services/sub-category', {
                                    state: { category, subCategory: betweenCitySubCat }
                                });
                                window.scrollTo(0, 0);
                            }
                        }}
                        className={`flex-1 text-center py-2.5 rounded-lg text-sm font-bold cursor-pointer transition-all duration-300 ${!isWithinCity ? 'bg-[#008b74] text-white shadow-md' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Between Cities
                    </div>
                </div>
            )}

            <div className="p-5 space-y-6">
                {isWithinCity ? (
                    <>
                        {/* Dynamic City Selector */}
                        <div className="space-y-1 relative">
                            <label className="text-sm font-bold text-gray-900">Select City</label>
                            <div
                                onClick={() => setShowCityDropdown(!showCityDropdown)}
                                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 flex justify-between items-center text-gray-800 text-[14px] font-normal cursor-pointer shadow-sm hover:border-emerald-500 transition-colors"
                            >
                                {selectedCity}
                                <ChevronDown className={`text-gray-400 transition-transform ${showCityDropdown ? 'rotate-180' : ''}`} size={18} />
                            </div>

                            {/* City Dropdown Menu */}
                            <AnimatePresence>
                                {showCityDropdown && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                        className="absolute z-50 top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 p-4"
                                    >
                                        <div className="text-xs font-semibold text-gray-400 mb-3 ml-2 uppercase tracking-wider">Select your city</div>
                                        <div className="grid grid-cols-3 gap-4 max-h-60 overflow-y-auto px-2 pb-2">
                                            {POPULAR_CITIES.map((city, idx) => (
                                                <div
                                                    key={idx}
                                                    onClick={() => {
                                                        setSelectedCity(city.name);
                                                        setShowCityDropdown(false);
                                                    }}
                                                    className="flex flex-col items-center justify-center cursor-pointer group"
                                                >
                                                    <div className={`w-14 h-14 rounded-full overflow-hidden mb-2 border-2 transition-all ${selectedCity === city.name ? 'border-emerald-500 shadow-md scale-105' : 'border-transparent group-hover:border-emerald-200'}`}>
                                                        <img src={city.image} alt={city.name} className="w-full h-full object-cover" />
                                                    </div>
                                                    <span className={`text-xs font-semibold text-center ${selectedCity === city.name ? 'text-emerald-600' : 'text-gray-600 group-hover:text-emerald-500'}`}>{city.name}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        <div className="space-y-1">
                            <label className="text-sm font-bold text-gray-900">Select pickup and drop location</label>
                            <div className="relative border border-gray-200 rounded-xl bg-white overflow-hidden shadow-sm">
                                {/* Shifting From (Google Autocomplete) */}
                                <div className="flex items-center border-b border-gray-200 px-3 py-2.5 relative">
                                    <div className="w-2 h-2 rounded-full bg-red-500 ring-2 ring-red-100 mr-3 shrink-0" />
                                    {isLoaded ? (
                                        <Autocomplete onLoad={onLoadFrom} onPlaceChanged={onPlaceChangedFrom} className="flex-1 w-full mr-6">
                                            <input
                                                type="text"
                                                placeholder="Shifting From"
                                                className="w-full outline-none text-xs font-normal text-gray-600 placeholder:text-gray-400 placeholder:font-normal bg-transparent text-ellipsis"
                                                value={shiftingFrom}
                                                onChange={(e) => setShiftingFrom(e.target.value)}
                                            />
                                        </Autocomplete>
                                    ) : (
                                        <input
                                            type="text"
                                            placeholder="Loading Maps..."
                                            className="flex-1 outline-none text-[10px] font-normal text-gray-600 placeholder:text-gray-400 placeholder:font-normal bg-transparent mr-6"
                                            disabled
                                        />
                                    )}
                                    {shiftingFrom && (
                                        <X size={16} className="text-gray-400 cursor-pointer hover:text-gray-600 absolute right-4" onClick={() => setShiftingFrom('')} />
                                    )}
                                </div>
                                <div className="absolute left-5 top-8 bottom-8 w-px bg-gray-200" />

                                {/* Shifting To (Google Autocomplete) */}
                                <div className="flex items-center px-3 py-2.5 relative">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-emerald-100 mr-3 shrink-0" />
                                    {isLoaded ? (
                                        <Autocomplete onLoad={onLoadTo} onPlaceChanged={onPlaceChangedTo} className="flex-1 w-full mr-6">
                                            <input
                                                type="text"
                                                placeholder="Shifting To"
                                                className="w-full outline-none text-xs font-normal text-gray-600 placeholder:text-gray-400 placeholder:font-normal bg-transparent text-ellipsis"
                                                value={shiftingTo}
                                                onChange={(e) => setShiftingTo(e.target.value)}
                                            />
                                        </Autocomplete>
                                    ) : (
                                        <input
                                            type="text"
                                            placeholder="Loading Maps..."
                                            className="flex-1 outline-none text-[10px] font-normal text-gray-600 placeholder:text-gray-400 placeholder:font-normal bg-transparent mr-6"
                                            disabled
                                        />
                                    )}
                                    {shiftingTo && (
                                        <X size={16} className="text-gray-400 cursor-pointer hover:text-gray-600 absolute right-4" onClick={() => setShiftingTo('')} />
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-sm font-bold text-gray-900">Select Shifting Date</label>
                            <div className="flex items-center border border-gray-200 rounded-xl px-4 py-3 bg-white relative shadow-sm hover:border-emerald-500 transition-colors">
                                <CalendarCheck className="text-gray-500 mr-3 shrink-0" size={18} />
                                <CustomDatePicker 
                                    selectedDate={shiftingDate} 
                                    onChange={(date) => setShiftingDate(date)} 
                                />
                            </div>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="space-y-1">
                            <label className="text-sm font-bold text-gray-900">{subCategory?.title?.toLowerCase().includes('vehicle') ? 'Where are you going to relocate?' : 'Search your City'}</label>
                            <div className="relative border border-gray-200 rounded-xl bg-white overflow-hidden shadow-sm">
                                {/* Source City */}
                                <div className="flex items-center border-b border-gray-200 px-3 py-2.5 relative">
                                    <MapPin className="text-gray-400 mr-3 shrink-0" size={18} />
                                    {isLoaded ? (
                                        <Autocomplete onLoad={onLoadFrom} onPlaceChanged={onPlaceChangedFrom} className="flex-1 w-full mr-6">
                                            <input
                                                type="text"
                                                placeholder="Search Source City"
                                                className="w-full outline-none text-xs font-normal text-gray-600 placeholder:text-gray-400 placeholder:font-normal bg-transparent text-ellipsis"
                                                value={shiftingFrom}
                                                onChange={(e) => setShiftingFrom(e.target.value)}
                                            />
                                        </Autocomplete>
                                    ) : (
                                        <input
                                            type="text"
                                            placeholder="Loading Maps..."
                                            className="flex-1 outline-none text-[10px] font-normal text-gray-600 placeholder:text-gray-400 placeholder:font-normal bg-transparent mr-6"
                                            disabled
                                        />
                                    )}
                                    {shiftingFrom && (
                                        <X size={16} className="text-gray-400 cursor-pointer hover:text-gray-600 absolute right-4" onClick={() => setShiftingFrom('')} />
                                    )}
                                </div>
                                <div className="absolute left-6 top-8 bottom-8 w-px border-l border-dashed border-gray-300" />

                                {/* Destination City */}
                                <div className="flex items-center px-3 py-2.5 relative">
                                    <MapPin className="text-gray-400 mr-3 shrink-0" size={18} />
                                    {isLoaded ? (
                                        <Autocomplete onLoad={onLoadTo} onPlaceChanged={onPlaceChangedTo} className="flex-1 w-full mr-6">
                                            <input
                                                type="text"
                                                placeholder="Search Destination City"
                                                className="w-full outline-none text-xs font-normal text-gray-600 placeholder:text-gray-400 placeholder:font-normal bg-transparent text-ellipsis"
                                                value={shiftingTo}
                                                onChange={(e) => setShiftingTo(e.target.value)}
                                            />
                                        </Autocomplete>
                                    ) : (
                                        <input
                                            type="text"
                                            placeholder="Loading Maps..."
                                            className="flex-1 outline-none text-[10px] font-normal text-gray-600 placeholder:text-gray-400 placeholder:font-normal bg-transparent mr-6"
                                            disabled
                                        />
                                    )}
                                    {shiftingTo && (
                                        <X size={16} className="text-gray-400 cursor-pointer hover:text-gray-600 absolute right-4" onClick={() => setShiftingTo('')} />
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-bold text-gray-900">Select Shifting Date</label>
                            <div className="flex items-center border border-gray-200 rounded-xl px-4 py-3 bg-white relative">
                                <CalendarCheck className="text-gray-500 mr-3" size={18} />
                                <CustomDatePicker 
                                    selectedDate={shiftingDate} 
                                    onChange={(date) => setShiftingDate(date)} 
                                />
                            </div>
                        </div>
                    </>
                )}

                <div className="flex items-center justify-center gap-4 py-2 text-xs font-semibold text-gray-500">
                    <span className="flex items-center gap-1.5"><Check className="text-emerald-500" size={14} /> Professional Handling</span>
                    <span className="text-gray-300">|</span>
                    <span className="flex items-center gap-1.5"><Check className="text-emerald-500" size={14} /> Transparent Pricing</span>
                </div>

                <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={handleProceed}
                    className="w-full py-4 bg-[#00695C] hover:bg-[#004D40] text-white font-black uppercase tracking-widest text-sm rounded-xl shadow-lg shadow-[#00695C]/40 transition-all"
                >
                    Get Estimate
                </motion.button>
            </div>
        </div>

        {/* Damage & Delay Protection Banner */}
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 rounded-xl p-4 flex items-center justify-between shadow-sm mt-2">
            <div className="pr-4 max-w-[65%]">
                <p className="text-[11px] text-gray-700 leading-snug mb-3 font-medium">
                    Let GetRightHome Packers & Movers do the heavy lifting like other <span className="text-emerald-700 font-bold">15,35,426</span> homes across India!
                </p>
                <button 
                    onClick={() => setShowProtectionModal(true)}
                    className="border border-emerald-600 text-emerald-700 bg-white px-3 py-1.5 rounded-md text-[10px] font-bold flex items-center gap-1 hover:bg-emerald-100 transition-colors"
                >
                    Know More <ChevronRight size={14} strokeWidth={3} />
                </button>
            </div>
            <div className="shrink-0 relative w-[90px] h-[90px] flex items-center justify-center -mr-2">
                {/* Stylized Badge Background (Emerald Theme) */}
                <div className="absolute inset-2 bg-gradient-to-b from-emerald-400 to-emerald-600 shadow-lg transform rotate-3" style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }} />
                <div className="absolute inset-2 bg-gradient-to-b from-teal-700 to-emerald-900 shadow-inner transform -rotate-6" style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }} />
                
                {/* Inner Content */}
                <div className="relative z-10 flex flex-col items-center justify-center transform -rotate-6 pt-1">
                    <span className="text-[9px] font-black text-white leading-none text-center shadow-sm" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>DAMAGE<br/>AND DELAY</span>
                    <div className="bg-yellow-400 text-emerald-900 text-[7px] font-black px-1.5 py-0.5 mt-0.5 rounded shadow-sm uppercase tracking-wider">
                        Protection
                    </div>
                    <Package className="text-white/90 w-5 h-5 mt-1 drop-shadow-md" />
                </div>
            </div>
        </div>

        {/* What sets GetRightHome apart */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mt-4">
            <h2 className="text-[14px] font-bold text-gray-800 mb-5">
                What sets GetRightHome apart in {selectedCity ? selectedCity.split(',')[0] : ''} ?
            </h2>
            
            <div className="space-y-6">
                {/* 1 */}
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-[#f8f9fa] rounded-xl flex items-center justify-center shrink-0">
                        <HeartHandshake className="text-[#644db8] w-6 h-6" strokeWidth={1.5} />
                    </div>
                    <div>
                        <h3 className="text-[13px] font-semibold text-gray-800 leading-snug">
                            15 Lakh+ Satisfied Customers In 100+ Cities
                        </h3>
                    </div>
                </div>
                
                {/* 2 */}
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-[#f8f9fa] rounded-xl flex items-center justify-center shrink-0">
                        <Package className="text-[#644db8] w-6 h-6" strokeWidth={1.5} />
                    </div>
                    <div>
                        <h3 className="text-[13px] font-semibold text-gray-800 leading-snug">
                            100% Damage & Delay Protection
                        </h3>
                    </div>
                </div>
                
                {/* 3 */}
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-[#f8f9fa] rounded-xl flex items-center justify-center shrink-0">
                        <Trophy className="text-[#644db8] w-6 h-6" strokeWidth={1.5} />
                    </div>
                    <div>
                        <h3 className="text-[13px] font-semibold text-gray-800 leading-snug">
                            Awards & Recognitions
                        </h3>
                    </div>
                </div>
            </div>
        </div>

        {/* House Relocation Services We Offer Near You */}
        {relatedSubCategories && relatedSubCategories.filter(sc => (sc.id || sc._id) !== (subCategory?.id || subCategory?._id)).length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mt-4">
                <h2 className="text-[14px] font-bold text-gray-800 mb-4">
                    House Relocation Services We Offer Near You
                </h2>
                <div className="flex flex-col gap-4">
                    {relatedSubCategories.filter(sc => (sc.id || sc._id) !== (subCategory?.id || subCategory?._id)).map(subcat => (
                        <div 
                            key={subcat._id || subcat.id}
                            onClick={() => {
                                navigate('/home-services/sub-category', {
                                    state: { category, subCategory: subcat }
                                });
                                window.scrollTo(0, 0);
                            }}
                            className="border border-gray-100 rounded-xl p-3 flex gap-4 cursor-pointer hover:shadow-md hover:border-emerald-200 transition-all group"
                        >
                            <div className="flex-1 flex flex-col justify-center">
                                <h3 className="font-bold text-gray-800 text-[13px] mb-1 group-hover:text-emerald-700 transition-colors">{subcat.title}</h3>
                                <p className="text-gray-500 text-[10px] leading-snug mb-2 line-clamp-2">
                                    {subcat.description || `Have to move your ${subcat.title.split(' ')[0].toLowerCase()}? We've got you covered!`}
                                </p>
                                <span className="text-emerald-600 text-[11px] font-bold flex items-center gap-0.5 mt-auto">
                                    Explore <ChevronRight size={12} strokeWidth={2.5} />
                                </span>
                            </div>
                            <div className="w-[85px] h-[75px] shrink-0 rounded-lg overflow-hidden bg-gray-50">
                                <img src={toAssetUrl(subcat.imageUrl)} alt={subcat.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* How it Works Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mt-4">
            <h2 className="text-[14px] font-bold text-gray-800 mb-6 leading-snug">
                How GetRightHome Packers and Movers Near You Works?
            </h2>
            
            <div className="relative">
                {/* Vertical Dashed Line */}
                <div className="absolute left-6 top-8 bottom-8 w-px border-l border-dashed border-gray-300 z-0"></div>
                
                <div className="space-y-6">
                    {/* Step 1 */}
                    <div className="flex gap-4 relative z-10">
                        <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center shrink-0 border border-gray-100 shadow-sm">
                             <Laptop className="text-orange-500 w-6 h-6" strokeWidth={1.5} />
                        </div>
                        <div className="pt-0.5">
                             <h3 className="text-[13px] font-semibold text-gray-800 mb-1">Share your Shifting Requirement</h3>
                             <p className="text-[11px] text-gray-500 leading-snug">Help us by providing when and where do you want to move</p>
                        </div>
                    </div>

                    {/* Step 2 */}
                    <div className="flex gap-4 relative z-10">
                        <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center shrink-0 border border-gray-100 shadow-sm">
                             <FileText className="text-amber-500 w-6 h-6" strokeWidth={1.5} />
                        </div>
                        <div className="pt-0.5">
                             <h3 className="text-[13px] font-semibold text-gray-800 mb-1">Receive Free Instant Quote</h3>
                             <p className="text-[11px] text-gray-500 leading-snug">Get guaranteed lowest priced quote for your shifting instantly</p>
                        </div>
                    </div>

                    {/* Step 3 */}
                    <div className="flex gap-4 relative z-10">
                        <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center shrink-0 border border-gray-100 shadow-sm">
                             <UserCheck className="text-red-500 w-6 h-6" strokeWidth={1.5} />
                        </div>
                        <div className="pt-0.5">
                             <h3 className="text-[13px] font-semibold text-gray-800 mb-1">Assign Quality Service Expert</h3>
                             <p className="text-[11px] text-gray-500 leading-snug">To ensure safe relocation quality service expert will be allotted for your movement</p>
                        </div>
                    </div>

                    {/* Step 4 */}
                    <div className="flex gap-4 relative z-10">
                        <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center shrink-0 border border-gray-100 shadow-sm">
                             <PackageCheck className="text-emerald-500 w-6 h-6" strokeWidth={1.5} />
                        </div>
                        <div className="pt-0.5">
                             <h3 className="text-[13px] font-semibold text-gray-800 mb-1">Leave the Heavy Lifting to Us</h3>
                             <p className="text-[11px] text-gray-500 leading-snug">Enjoy hassle-free on time movement of your household goods</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        {/* Recent Trips Section */}
        <div className="bg-transparent mt-8 mb-4 px-2">
            <div className="flex items-center gap-4 mb-5">
                <div className="h-px bg-gray-200 flex-1"></div>
                <h2 className="text-[13px] font-bold text-[#1a3b99] tracking-tight">15 lakh+ trips completed all over India</h2>
                <div className="h-px bg-gray-200 flex-1"></div>
            </div>
            
            <div className="flex gap-4 overflow-x-auto pb-4 snap-x" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                <style>{`
                    .overflow-x-auto::-webkit-scrollbar { display: none; }
                `}</style>
                {RECENT_TRIPS.map((trip, idx) => (
                    <div key={idx} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 min-w-[210px] max-w-[210px] snap-start shrink-0">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border border-emerald-100">
                                <Star size={10} className="fill-emerald-700" /> {trip.rating.toFixed(1)}
                            </div>
                            <div className="border border-gray-200 text-gray-500 text-[9px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider">
                                {trip.type}
                            </div>
                        </div>
                        
                        <h3 className="text-[14px] font-bold text-gray-800 leading-tight mb-1 truncate">{trip.name}</h3>
                        <p className="text-[10px] text-gray-500 mb-4">Completed On {trip.date}</p>
                        
                        <div className="relative pl-1.5">
                            <div className="absolute left-[4px] top-[10px] bottom-[12px] w-[1.5px] bg-gray-200 z-0"></div>
                            <div className="flex items-center gap-3 mb-3 relative z-10">
                                <div className="w-2 h-2 rounded-full border-[1.5px] border-red-500 bg-white shadow-sm shrink-0"></div>
                                <span className="text-[10px] font-bold text-gray-700 uppercase truncate tracking-wide">{trip.from}</span>
                            </div>
                            <div className="flex items-center gap-3 relative z-10">
                                <div className="w-2 h-2 rounded-full border-[1.5px] border-emerald-500 bg-white shadow-sm shrink-0"></div>
                                <span className="text-[10px] font-bold text-gray-700 uppercase truncate tracking-wide">{trip.to}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
        
        {/* Why Choose Us Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mt-4 mb-6">
            <h2 className="text-[14px] font-bold text-gray-800 mb-6 leading-snug">
                Why Choose GetRightHome Packers and Movers for House Shifting?
            </h2>
            
            <div className="space-y-6">
                {/* 1 */}
                <div className="flex gap-4 items-start">
                    <div className="w-11 h-11 bg-gray-50 rounded-xl flex items-center justify-center shrink-0 border border-gray-100 shadow-sm">
                         <Wallet className="text-amber-600 w-5 h-5" strokeWidth={1.5} />
                    </div>
                    <div className="pt-0.5">
                         <h3 className="text-[13px] font-semibold text-gray-800 mb-1">Lowest Price Guarantee</h3>
                         <p className="text-[11px] text-gray-500 leading-snug">Moving at a price you can afford - we'll match any competitor's quote</p>
                    </div>
                </div>

                {/* 2 */}
                <div className="flex gap-4 items-start">
                    <div className="w-11 h-11 bg-gray-50 rounded-xl flex items-center justify-center shrink-0 border border-gray-100 shadow-sm">
                         <Award className="text-blue-500 w-5 h-5" strokeWidth={1.5} />
                    </div>
                    <div className="pt-0.5">
                         <h3 className="text-[13px] font-semibold text-gray-800 mb-1">Best Quality Service</h3>
                         <p className="text-[11px] text-gray-500 leading-snug">Safe and Reliable Packaging and Moving Services</p>
                    </div>
                </div>

                {/* 3 */}
                <div className="flex gap-4 items-start">
                    <div className="w-11 h-11 bg-gray-50 rounded-xl flex items-center justify-center shrink-0 border border-gray-100 shadow-sm">
                         <CalendarClock className="text-emerald-600 w-5 h-5" strokeWidth={1.5} />
                    </div>
                    <div className="pt-0.5">
                         <h3 className="text-[13px] font-semibold text-gray-800 mb-1">Reschedule your shifting anytime</h3>
                         <p className="text-[11px] text-gray-500 leading-snug">Change your shifting date as per your convenience.</p>
                    </div>
                </div>

                {/* 4 */}
                <div className="flex gap-4 items-start">
                    <div className="w-11 h-11 bg-gray-50 rounded-xl flex items-center justify-center shrink-0 border border-gray-100 shadow-sm">
                         <Headset className="text-red-500 w-5 h-5" strokeWidth={1.5} />
                    </div>
                    <div className="pt-0.5">
                         <h3 className="text-[13px] font-semibold text-gray-800 mb-1">Support Assistance</h3>
                         <p className="text-[11px] text-gray-500 leading-snug">Dedicated support assistance for quick query resolution</p>
                    </div>
                </div>

                {/* 5 */}
                <div className="flex gap-4 items-start">
                    <div className="w-11 h-11 bg-gray-50 rounded-xl flex items-center justify-center shrink-0 border border-gray-100 shadow-sm">
                         <Users className="text-purple-500 w-5 h-5" strokeWidth={1.5} />
                    </div>
                    <div className="pt-0.5">
                         <h3 className="text-[13px] font-semibold text-gray-800 mb-1">Professional Labour</h3>
                         <p className="text-[11px] text-gray-500 leading-snug">Expertly packing and moving your belongings</p>
                    </div>
                </div>
            </div>
        </div>
        
        {/* Customer Reviews Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-6">
            <h2 className="text-[14px] font-bold text-gray-800 mb-4">Customer Reviews</h2>
            
            <div className="flex items-end justify-between mb-5 px-1">
                <div>
                    <div className="flex items-center gap-2 mb-0.5">
                        <img src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Travel%20and%20places/Star.png" alt="Star" className="w-9 h-9 drop-shadow-sm" />
                        <span className="text-3xl font-extrabold text-[#b8860b] tracking-tight">4.8</span>
                    </div>
                    <p className="text-[12px] text-[#4f709c] font-medium pl-1">Average rating based on 90,445 reviews</p>
                </div>
                
                <div className="flex items-center gap-2 pb-1 pr-1">
                    <button onClick={() => scrollReviews('left')} className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors shadow-sm bg-white">
                        <ChevronLeft size={18} strokeWidth={2} />
                    </button>
                    <button onClick={() => scrollReviews('right')} className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-50 hover:text-gray-800 transition-colors shadow-sm bg-white">
                        <ChevronRight size={18} strokeWidth={2} />
                    </button>
                </div>
            </div>
            
            <div ref={reviewsScrollRef} className="flex gap-4 overflow-x-auto pb-2 snap-x scroll-smooth" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                <style>{`
                    .overflow-x-auto::-webkit-scrollbar { display: none; }
                `}</style>
                {PM_CUSTOMER_REVIEWS.map((review, idx) => (
                    <div key={idx} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 min-w-[240px] max-w-[240px] snap-start shrink-0">
                        <div className="flex items-center gap-3 mb-3">
                            <img src={review.avatar} alt={review.name} className="w-10 h-10 rounded-full object-cover bg-gray-100" />
                            <div className="flex-1">
                                <h3 className="text-[12px] font-bold text-gray-800 leading-tight">{review.name}</h3>
                                <div className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 w-max mt-1 border border-emerald-100">
                                    <Star size={8} className="fill-emerald-700" /> {review.rating.toFixed(1)}
                                </div>
                            </div>
                            <div className="w-5 h-5 flex items-center justify-center shrink-0">
                                {/* Simple colored G icon for Google */}
                                <svg viewBox="0 0 24 24" width="16" height="16" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                                </svg>
                            </div>
                        </div>
                        <p className="text-[11px] text-gray-600 leading-relaxed line-clamp-3">
                            {review.text}
                        </p>
                    </div>
                ))}
            </div>
        </div>
        
        {/* Comparison Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-6">
            <h2 className="text-[14px] font-bold text-gray-800 mb-5">GetRightHome compared to local vendors</h2>
            
            <div className="overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-gray-100">
                            <th className="py-3 px-2 text-[11px] font-medium text-gray-500 w-[50%] align-bottom">Services</th>
                            <th className="py-3 px-1 text-[11px] font-medium text-[#1a3b99] text-center w-[25%] border-l border-gray-100 align-bottom">GetRightHome</th>
                            <th className="py-3 px-1 text-[11px] font-medium text-gray-500 text-center w-[25%] border-l border-gray-100 align-bottom leading-tight">Local<br/>Vendors</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {COMPARISON_DATA.map((row, idx) => (
                            <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                                <td className="py-4 px-2 text-[11px] text-gray-700 font-medium pr-4">{row.label}</td>
                                <td className="py-4 px-1 border-l border-gray-100 text-center align-middle">
                                    {row.grh ? <Check size={16} strokeWidth={2.5} className="text-emerald-500 mx-auto" /> : <X size={16} strokeWidth={2.5} className="text-red-500 mx-auto" />}
                                </td>
                                <td className="py-4 px-1 border-l border-gray-100 text-center align-middle">
                                    {row.local ? <Check size={16} strokeWidth={2.5} className="text-emerald-500 mx-auto" /> : <X size={16} strokeWidth={2.5} className="text-red-500 mx-auto" />}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
        
        {/* FAQs Section */}
        <div className="bg-white rounded-[16px] shadow-[0px_3px_10px_-1px_#1A1A1A1F] p-5 mb-6">
            <h2 className="font-bold text-[15px] text-gray-800 mb-5">FaQs- House Shifting Services in {selectedCity !== 'Select City' ? selectedCity : 'India'}</h2>
            
            <div className="flex items-center gap-3 overflow-x-auto pb-3 snap-x mb-2" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                <style>{`
                    .overflow-x-auto::-webkit-scrollbar { display: none; }
                `}</style>
                <div 
                    onClick={() => setIsFaqSearchActive(true)}
                    className={`flex items-center justify-center shrink-0 w-[38px] h-[32px] rounded-[20px] cursor-pointer bg-white border ${isFaqSearchActive ? 'border-[#6045A4] text-[#6045A4]' : 'border-gray-200 text-gray-700'} transition-colors`}
                >
                    <Search size={15} strokeWidth={2} />
                </div>
                <div className="h-[22px] border-r border-gray-200 shrink-0"></div>
                
                {isFaqSearchActive ? (
                    <div className="flex-1 flex items-center h-[32px] rounded-[20px] border border-[#6045A4] px-3 bg-white relative min-w-[200px]">
                        <input
                            autoFocus
                            type="text"
                            placeholder="Search FAQs..."
                            value={searchFaqQuery}
                            onChange={(e) => setSearchFaqQuery(e.target.value)}
                            className="w-full h-full outline-none text-[13px] bg-transparent text-gray-800 pr-6"
                        />
                        <button 
                            onClick={() => {
                                setIsFaqSearchActive(false);
                                setSearchFaqQuery("");
                            }}
                            className="absolute right-3 text-gray-400 hover:text-gray-600"
                        >
                            <X size={14} />
                        </button>
                    </div>
                ) : (
                    FAQ_TABS.map(tab => (
                        <button 
                            key={tab}
                            onClick={() => {
                                setActiveFaqTab(tab);
                                setOpenFaq(-1);
                            }}
                            className={`shrink-0 h-[32px] px-4 rounded-[20px] whitespace-nowrap text-[13px] transition-colors border ${
                                activeFaqTab === tab 
                                    ? 'border-[#6045A4] text-[#6045A4] font-semibold' 
                                    : 'border-gray-200 text-gray-700 font-medium hover:border-gray-300 hover:bg-gray-50'
                            }`}
                        >
                            {tab}
                        </button>
                    ))
                )}
            </div>

            <div className="flex flex-col">
                {filteredFaqs.length > 0 ? filteredFaqs.map((faq, idx) => (
                    <div key={idx} className="border-b border-gray-100 last:border-0">
                        <div 
                            className="flex items-center justify-between cursor-pointer py-4 gap-4 group"
                            onClick={() => setOpenFaq(openFaq === idx ? -1 : idx)}
                        >
                            <h3 className="font-medium text-[13px] text-gray-800 flex-1 leading-snug group-hover:text-[#6045A4] transition-colors">{faq.q}</h3>
                            <ChevronDown 
                                size={18} 
                                strokeWidth={2}
                                className={`text-gray-500 shrink-0 transition-transform duration-300 ${openFaq === idx ? 'rotate-180' : ''}`} 
                            />
                        </div>
                        <AnimatePresence>
                            {openFaq === idx && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="overflow-hidden"
                                >
                                    <div className="text-[12.5px] leading-[1.6] text-gray-600 pb-4 pr-4">
                                        {faq.a}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                )) : (
                    <div className="py-8 text-center text-gray-400 text-sm">No FAQs found for this category.</div>
                )}
            </div>
        </div>
        
        {/* Protection Modal Overlay */}
            <AnimatePresence>
                {showProtectionModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowProtectionModal(false)}
                            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                        />
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            className="bg-[#f2f6fc] relative z-10 w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden border border-gray-100"
                        >
                            <button 
                                onClick={() => setShowProtectionModal(false)}
                                className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 transition-colors p-1 z-20"
                            >
                                <X size={20} />
                            </button>
                            
                            <div className="p-7">
                                {/* Stylized Shield Badge for Modal (Emerald Theme) */}
                                <div className="mb-6 relative w-20 h-20">
                                    <div className="absolute inset-0 bg-gradient-to-b from-emerald-400 to-emerald-600 shadow-lg transform rotate-3" style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }} />
                                    <div className="absolute inset-0 bg-gradient-to-b from-teal-700 to-emerald-900 shadow-inner transform -rotate-6" style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }} />
                                    <div className="relative z-10 flex flex-col items-center justify-center h-full transform -rotate-6">
                                        <span className="text-[9px] font-black text-white leading-none text-center drop-shadow-md">DAMAGE<br/>AND DELAY</span>
                                        <div className="bg-yellow-400 text-emerald-900 text-[7px] font-black px-1.5 py-0.5 mt-1 rounded shadow-sm uppercase tracking-wider">
                                            Protection
                                        </div>
                                    </div>
                                </div>
                                
                                <h3 className="text-gray-800 font-bold text-lg leading-tight mb-7 pr-4">
                                    With GetRightHome's Damage & Delay Protection, you get:
                                </h3>
                                
                                <div className="space-y-6">
                                    <div className="flex items-start gap-4">
                                        <Truck className="text-emerald-600 shrink-0 w-6 h-6 mt-0.5" strokeWidth={1.5} />
                                        <p className="text-[13px] text-gray-700 font-medium leading-snug">100% coverage against damages during packing, transit, or unloading</p>
                                    </div>
                                    <div className="flex items-start gap-4">
                                        <Clock className="text-emerald-600 shrink-0 w-6 h-6 mt-0.5" strokeWidth={1.5} />
                                        <p className="text-[13px] text-gray-700 font-medium leading-snug">Professional packing & handling by trained service partners</p>
                                    </div>
                                    <div className="flex items-start gap-4">
                                        <Package className="text-emerald-600 shrink-0 w-6 h-6 mt-0.5" strokeWidth={1.5} />
                                        <p className="text-[13px] text-gray-700 font-medium leading-snug">Transparent pricing with no hidden conditions</p>
                                    </div>
                                    <div className="flex items-start gap-4">
                                        <Coins className="text-emerald-600 shrink-0 w-6 h-6 mt-0.5" strokeWidth={1.5} />
                                        <p className="text-[13px] text-gray-700 font-medium leading-snug">On-time pickup and delivery commitment</p>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
};

const SubCategoryPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { cartItems, cartCount, addToCart, removeItem } = useCart();
    const { currentCity } = useCity();

    // Data passed via navigation state
    const { subCategory, category } = location.state || {};

    const [services, setServices] = useState([]);
    const [exploreCategories, setExploreCategories] = useState([]);
    const [relatedSubCategories, setRelatedSubCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [redirecting, setRedirecting] = useState(false);
    const [highlightedServiceId, setHighlightedServiceId] = useState(null);
    const [selectedTexture, setSelectedTexture] = useState(null);
    const [selectedIdea, setSelectedIdea] = useState(null);
    const [expandedFaq, setExpandedFaq] = useState(null);
    const [selectedServiceForModal, setSelectedServiceForModal] = useState(null);

    // Floating "View Cart" bar — reappears whenever a new item is added to the cart
    const [cartBarDismissed, setCartBarDismissed] = useState(false);
    const prevCartCountRef = useRef(cartCount);
    useEffect(() => {
        if (cartCount > prevCartCountRef.current) {
            setCartBarDismissed(false);
        }
        prevCartCountRef.current = cartCount;
    }, [cartCount]);
    const showCartBar = cartCount > 0 && !cartBarDismissed;

    const isPaintingCategory = category?.title?.toLowerCase().includes('painting') || subCategory?.title?.toLowerCase().includes('painting');
    const isPackersAndMovers = category?.title?.toLowerCase().includes('packer') || category?.slug?.includes('packer');

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
            // This page is driven entirely by location.state, so a direct deep link
            // (shared URL, refresh, notification tap) has nothing to render. Fall back
            // to the catalog rather than navigate(-1), which can escape the app.
            goBackOrHome(navigate, '/home-services');
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
            
            const relatedRes = await publicCatalogService.getSubCategories({ categoryId: catId, cityId });
            if (relatedRes?.success) {
                const allRelated = relatedRes.subCategories || relatedRes.data || [];
                setRelatedSubCategories(allRelated); // Keep all subcategories for tab navigation
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
                    <div className="absolute bottom-12 left-6 right-6 text-white z-20 flex justify-between items-start">
                        <div className="flex-1 pr-4">
                            {category?.slug === 'home-painting' ? (
                                <h2 className="text-base sm:text-lg font-bold uppercase tracking-wide drop-shadow-md leading-snug">
                                    Best House Painting Services in Your Area | Expert Painters
                                </h2>
                            ) : (
                                <h2 className="text-xl sm:text-2xl font-bold uppercase tracking-tight drop-shadow-md">
                                    {subCategory.title}
                                </h2>
                            )}
                            {category?.title && (
                                <span className="text-[9px] font-semibold uppercase tracking-widest bg-emerald-500/90 text-white py-1 px-3 rounded-full mt-2 inline-block shadow-sm max-w-[55%] truncate">
                                    {category.title}
                                </span>
                            )}
                        </div>

                        <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-md border border-white/20 px-2.5 py-1.5 rounded-xl shadow-sm">
                            <Star size={12} className="fill-emerald-400 text-emerald-400" />
                            <span className="text-xs font-black text-white">4.7</span>
                        </div>
                    </div>
                </div>

                {/* Overlapping Floating Search Bar (Placed OUTSIDE the overflow-hidden parent to prevent clipping) */}
                {!isPackersAndMovers && (
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
                )}
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
            <div className={`max-w-3xl mx-auto px-4 ${isPackersAndMovers ? '-mt-12 relative z-30' : 'mt-6 pt-2'}`}>
                {isPackersAndMovers ? (
                    <PackersAndMoversForm 
                        category={category}
                        subCategory={subCategory}
                        services={regularServices}
                        relatedSubCategories={relatedSubCategories}
                    />
                ) : loading ? (
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
                                                                <Star size={12} className="fill-amber-400 text-amber-400" /> {generateRating(svc.id || svc._id).rating} ({generateRating(svc.id || svc._id).reviews})
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
                                                            <button 
                                                                onClick={() => setSelectedServiceForModal(svc)}
                                                                className="text-[11px] font-bold text-gray-500 hover:text-emerald-600 transition-colors flex items-center gap-0.5"
                                                            >
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

                                                        <button 
                                                            onClick={() => setSelectedServiceForModal(svc)}
                                                            className="text-[11px] font-black text-emerald-600 uppercase tracking-wider flex items-center gap-1 hover:underline"
                                                        >
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
                                            <span className="leading-tight text-[9px] sm:text-xs text-[#0F172A] font-extrabold">GetRightHome<br />Promise</span>
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
                                            <h3 className="text-sm font-bold text-gray-800 leading-tight mb-2">Book Home<br />Inspection</h3>
                                            <p className="text-[10px] sm:text-[11px] text-gray-600 leading-tight">Tell us preferred time to book</p>
                                        </div>
                                        <div className="absolute bottom-2 right-3 text-2xl font-black text-[#ffaa70]/70 z-10">1</div>
                                    </div>
                                    {/* Card 2 */}
                                    <div className="min-w-[150px] w-[150px] sm:min-w-[160px] sm:w-[160px] flex-shrink-0 bg-[#f4fae3] rounded-xl p-4 relative overflow-hidden snap-start">
                                        <div className="absolute top-8 -left-6 w-24 h-24 bg-[#e7f5cc] rounded-full opacity-60 z-0"></div>
                                        <div className="relative z-10">
                                            <Ruler className="w-8 h-8 text-gray-700 stroke-[1.5] mb-3" />
                                            <h3 className="text-sm font-bold text-gray-800 leading-tight mb-2">Measure &<br />Estimation</h3>
                                            <p className="text-[10px] sm:text-[11px] text-gray-600 leading-tight">Get accurate quotes with laser measurements</p>
                                        </div>
                                        <div className="absolute bottom-2 right-3 text-2xl font-black text-[#a6d844]/70 z-10">2</div>
                                    </div>
                                    {/* Card 3 */}
                                    <div className="min-w-[150px] w-[150px] sm:min-w-[160px] sm:w-[160px] flex-shrink-0 bg-[#eef2ff] rounded-xl p-4 relative overflow-hidden snap-start">
                                        <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-[#dbeafe] rounded-full opacity-60 z-0"></div>
                                        <div className="relative z-10">
                                            <Paintbrush className="w-8 h-8 text-gray-700 stroke-[1.5] mb-3" />
                                            <h3 className="text-sm font-bold text-gray-800 leading-tight mb-2">Painting<br />Execution</h3>
                                            <p className="text-[10px] sm:text-[11px] text-gray-600 leading-tight">Professionals begin work safely and on time</p>
                                        </div>
                                        <div className="absolute bottom-2 right-3 text-2xl font-black text-[#93c5fd]/70 z-10">3</div>
                                    </div>
                                    {/* Card 4 */}
                                    <div className="min-w-[150px] w-[150px] sm:min-w-[160px] sm:w-[160px] flex-shrink-0 bg-[#fdf4ff] rounded-xl p-4 relative overflow-hidden snap-start">
                                        <div className="absolute top-0 right-0 w-24 h-24 bg-[#fae8ff] rounded-full opacity-60 z-0"></div>
                                        <div className="relative z-10">
                                            <Sparkles className="w-8 h-8 text-gray-700 stroke-[1.5] mb-3" />
                                            <h3 className="text-sm font-bold text-gray-800 leading-tight mb-2">Post-Cleanup &<br />Handover</h3>
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
                                <div className="flex items-center mb-3">
                                    <h2 className="text-base sm:text-lg font-bold text-[#1E293B] flex items-center gap-2">
                                        Tour our Recent Projects
                                        <span className="bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest shadow-sm">New</span>
                                    </h2>
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
                                                                {word}{i !== arr.length - 1 && <br />}
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

                        {/* Customer Reviews & FAQs (Only for Painting) */}
                        {isPaintingCategory && (
                            <>
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
                            </>
                        )}
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

            {/* Service Details Modal */}
            <AnimatePresence>
                {selectedServiceForModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedServiceForModal(null)}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        />
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            className="bg-white relative z-10 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-gray-100 flex flex-col max-h-[85vh]"
                        >
                            {/* Modal Header */}
                            <div className="relative h-48 bg-gray-100 shrink-0">
                                <img
                                    src={toAssetUrl(selectedServiceForModal.imageUrl || selectedServiceForModal.icon || subCategory?.iconUrl)}
                                    alt={selectedServiceForModal.title}
                                    className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                                
                                <button 
                                    onClick={() => setSelectedServiceForModal(null)}
                                    className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/40 backdrop-blur text-white flex items-center justify-center hover:bg-black/60 transition-colors z-20"
                                >
                                    <X size={18} />
                                </button>
                                
                                <div className="absolute bottom-4 left-5 right-5 text-white">
                                    <h3 className="text-xl font-extrabold leading-tight mb-1">{selectedServiceForModal.title}</h3>
                                    {selectedServiceForModal.subheading && (
                                        <div className="bg-emerald-500/90 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded inline-block shadow-sm">
                                            {selectedServiceForModal.subheading}
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            {/* Modal Body */}
                            <div className="p-5 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
                                <div className="flex items-center gap-1.5 mb-5 bg-emerald-50 text-emerald-800 px-3 py-2 rounded-xl inline-flex shadow-sm border border-emerald-100">
                                    <Star size={14} className="fill-emerald-500 text-emerald-500" /> 
                                    <span className="text-xs font-bold">{generateRating(selectedServiceForModal.id || selectedServiceForModal._id).rating} ({generateRating(selectedServiceForModal.id || selectedServiceForModal._id).reviews}+ reviews)</span>
                                </div>

                                <div className="mb-6">
                                    <h4 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                                        <Info size={16} className="text-emerald-500" /> About this service
                                    </h4>
                                    
                                    {selectedServiceForModal.description ? (
                                        <div className="space-y-2.5">
                                            {selectedServiceForModal.description.split(/(?:\n|->)/).map(s => s.trim()).filter(Boolean).map((line, i) => (
                                                <div key={i} className="flex items-start gap-2.5">
                                                    <CheckCircle2 size={16} className="text-emerald-500 mt-0.5 shrink-0" />
                                                    <span className="text-[13px] text-gray-600 leading-relaxed font-medium">{line}</span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="space-y-2.5">
                                            <div className="flex items-start gap-2.5">
                                                <CheckCircle2 size={16} className="text-emerald-500 mt-0.5 shrink-0" />
                                                <span className="text-[13px] text-gray-600 leading-relaxed font-medium">Professional and highly trained staff.</span>
                                            </div>
                                            <div className="flex items-start gap-2.5">
                                                <CheckCircle2 size={16} className="text-emerald-500 mt-0.5 shrink-0" />
                                                <span className="text-[13px] text-gray-600 leading-relaxed font-medium">Guaranteed high-quality service execution.</span>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 mb-2">
                                    <div className="flex items-center gap-3">
                                        <ShieldCheck className="text-emerald-600 w-8 h-8 shrink-0" />
                                        <div>
                                            <h5 className="text-[13px] font-bold text-gray-800 mb-0.5">GetRightHome Promise</h5>
                                            <p className="text-[11px] text-gray-500">Verified professionals & 100% satisfaction guarantee</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Modal Footer */}
                            <div className="p-4 border-t border-gray-100 bg-white shrink-0 flex items-center justify-between gap-4 shadow-[0_-4px_10px_-4px_rgba(0,0,0,0.05)]">
                                <div>
                                    <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">
                                        {category?.isEstimateBased ? 'Price' : 'Starts At'}
                                    </div>
                                    <div className="text-lg font-black text-gray-900 leading-none">
                                        {category?.isEstimateBased ? 'Post Inspection' : `₹${selectedServiceForModal.discountPrice || selectedServiceForModal.basePrice || selectedServiceForModal.price}`}
                                    </div>
                                </div>
                                
                                <motion.button
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => {
                                        handleCartToggle(selectedServiceForModal);
                                        setSelectedServiceForModal(null);
                                    }}
                                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-3.5 rounded-xl font-bold text-[13px] uppercase tracking-wider transition-colors shadow-lg shadow-emerald-200 text-center"
                                >
                                    {cartItems.some(item => item.serviceId === (selectedServiceForModal.id || selectedServiceForModal._id))
                                        ? 'Remove from Cart'
                                        : category?.isEstimateBased ? 'Get Estimate' : 'Add to Cart'
                                    }
                                </motion.button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Floating "View Cart" Bar */}
            <AnimatePresence>
                {showCartBar && cartCount > 0 && (
                    <motion.div
                        initial={{ y: 100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 100, opacity: 0 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="fixed bottom-4 left-4 right-4 z-40 max-w-md mx-auto"
                    >
                        <div className="bg-white rounded-2xl shadow-2xl shadow-black/20 border border-gray-100 flex items-center gap-3 p-2.5 pr-3">
                            <div className="w-11 h-11 rounded-full overflow-hidden bg-gray-50 border border-gray-100 shrink-0 flex items-center justify-center">
                                {(subCategory?.iconUrl || category?.iconUrl) ? (
                                    <img
                                        src={toAssetUrl(subCategory?.iconUrl || category?.iconUrl)}
                                        alt={subCategory?.title || category?.title}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <ShoppingCart className="text-[#00695C] w-5 h-5" />
                                )}
                            </div>

                            <div
                                className="flex-1 min-w-0 cursor-pointer"
                                onClick={() => navigate('/user/cart')}
                            >
                                <h4 className="text-[13px] font-bold text-gray-900 truncate">
                                    {subCategory?.title || category?.title}
                                </h4>
                                <span className="text-[11px] font-semibold text-[#00695C] flex items-center gap-0.5">
                                    View Details <ChevronRight size={12} strokeWidth={3} />
                                </span>
                            </div>

                            <motion.button
                                whileTap={{ scale: 0.95 }}
                                onClick={() => navigate('/user/cart')}
                                className="bg-[#00695C] hover:bg-[#004D40] text-white rounded-xl px-4 py-2 text-center shrink-0 transition-colors"
                            >
                                <span className="block text-[13px] font-bold leading-tight">View Cart</span>
                                <span className="block text-[10px] opacity-90 leading-tight">{cartCount} item{cartCount > 1 ? 's' : ''}</span>
                            </motion.button>

                            <button
                                onClick={() => setCartBarDismissed(true)}
                                className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center shrink-0 transition-colors"
                            >
                                <X size={14} className="text-gray-500" />
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default SubCategoryPage;
