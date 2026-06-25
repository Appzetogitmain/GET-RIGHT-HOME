import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
    ArrowLeft, MapPin, Calendar, Phone, Mail, Shield, 
    Home, ChevronRight, Award, MessageSquare, Loader2, Sparkles
} from 'lucide-react';
import { propertyService } from '../../services/apiService';
import { usePropertyNavigate } from '../../hooks/usePropertyNavigate';
import toast from 'react-hot-toast';

const PartnerProfilePage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { navigateToProperty } = usePropertyNavigate();
    const [seller, setSeller] = useState(null);
    const [properties, setProperties] = useState([]);
    const [loading, setLoading] = useState(true);
    const [revealedPhone, setRevealedPhone] = useState(false);

    useEffect(() => {
        if (id) {
            fetchSellerProfile();
        }
    }, [id]);

    useEffect(() => {
        if (seller) {
            document.title = `${seller.name} - Complete Profile | Get-Right-Home`;
        }
    }, [seller]);

    const fetchSellerProfile = async () => {
        try {
            setLoading(true);
            const res = await propertyService.getPartnerPublicDetails(id);
            if (res.success) {
                setSeller(res.partner);
                setProperties(res.properties || []);
            } else {
                toast.error('Seller profile not found');
            }
        } catch (error) {
            console.error('Error fetching seller details:', error);
            toast.error('Could not load seller profile');
        } finally {
            setLoading(false);
        }
    };

    const getInitials = (name) => {
        if (!name) return 'S';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };

    const getTierBadgeStyles = (tier) => {
        const t = (tier || 'free').toLowerCase();
        switch (t) {
            case 'diamond':
                return 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white border-cyan-400';
            case 'gold':
            case 'gold_basic':
                return 'bg-gradient-to-r from-amber-500 to-yellow-600 text-white border-amber-400';
            case 'platinum':
                return 'bg-gradient-to-r from-slate-600 to-slate-800 text-white border-slate-500';
            case 'silver':
                return 'bg-gradient-to-r from-gray-400 to-gray-500 text-white border-gray-300';
            default:
                return 'bg-gray-100 text-gray-600 border-gray-200';
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
                    <p className="text-gray-500 text-sm font-semibold">Loading profile...</p>
                </div>
            </div>
        );
    }

    if (!seller) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
                <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-4 border border-red-100">
                    <Shield size={28} />
                </div>
                <h2 className="text-xl font-bold text-gray-800 mb-2">Seller Profile Not Found</h2>
                <p className="text-gray-500 text-sm max-w-xs mb-6">The profile you are looking for may have been deactivated or does not exist.</p>
                <button onClick={() => navigate(-1)} className="px-5 py-2.5 bg-blue-600 text-white font-bold rounded-xl shadow-md text-sm">
                    Go Back
                </button>
            </div>
        );
    }

    const initials = getInitials(seller.name);
    const dateFormatted = seller.partnerSince 
        ? new Date(seller.partnerSince).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) 
        : 'Recently';

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Header */}
            <div className="bg-white border-b border-gray-100 px-4 py-4 sticky top-0 z-20 flex items-center gap-4">
                <button onClick={() => navigate(-1)} className="p-1.5 hover:bg-gray-100 rounded-xl transition">
                    <ArrowLeft size={20} className="text-gray-700" />
                </button>
                <div>
                    <h1 className="font-bold text-gray-900 text-base">Complete Profile</h1>
                    <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Verified Dealer Details</p>
                </div>
            </div>

            <div className="px-4 py-5 max-w-2xl mx-auto space-y-5">
                {/* Profile overview Card */}
                <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-xl pointer-events-none" />
                    
                    <div className="flex flex-col items-center text-center">
                        {/* Avatar */}
                        <div className="relative mb-3">
                            {seller.profileImage ? (
                                <img src={seller.profileImage} alt={seller.name} className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-md" />
                            ) : (
                                <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 text-white font-black text-2xl flex items-center justify-center border-4 border-white shadow-md">
                                    {initials}
                                </div>
                            )}
                            <div className="absolute bottom-0 right-0 w-6 h-6 bg-emerald-500 text-white rounded-full flex items-center justify-center border-2 border-white shadow">
                                <Shield size={12} className="fill-white" />
                            </div>
                        </div>

                        {/* Name & Business */}
                        <h2 className="text-lg font-black text-gray-900 leading-tight">{seller.name}</h2>
                        {seller.businessName && (
                            <p className="text-xs text-gray-500 font-bold mt-0.5">{seller.businessName}</p>
                        )}

                        {/* Badges */}
                        <div className="flex items-center gap-2 mt-2 flex-wrap justify-center">
                            {seller.subscriptionTier && seller.subscriptionTier !== 'free' && (
                                <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${getTierBadgeStyles(seller.subscriptionTier)}`}>
                                    {seller.subscriptionTier} Seller
                                </span>
                            )}
                            <span className="text-[9px] bg-emerald-50 text-emerald-700 border border-emerald-100 font-black uppercase tracking-wider px-2 py-0.5 rounded-full flex items-center gap-0.5">
                                <Award size={10} /> Verified Listing Provider
                            </span>
                        </div>

                        {/* Metadata row */}
                        <div className="flex items-center justify-center gap-4 mt-4 text-xs text-gray-500 border-t border-gray-50 pt-4 w-full">
                            <div className="flex items-center gap-1 font-semibold">
                                <Calendar size={13} className="text-gray-400" />
                                <span>Member Since {dateFormatted}</span>
                            </div>
                            <div className="flex items-center gap-1 font-semibold">
                                <Home size={13} className="text-gray-400" />
                                <span>{properties.length} Listed Properties</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Contact Options Card */}
                <div className="bg-white rounded-3xl p-4 border border-gray-100 shadow-sm space-y-3">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Contact Info</h3>
                    
                    <div className="space-y-2.5">
                        <div className="flex items-center gap-3 text-sm font-semibold text-gray-700">
                            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                                <Phone size={14} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-[10px] text-gray-400 leading-none mb-0.5">Phone Number</p>
                                <p className="truncate text-xs">
                                    {revealedPhone ? seller.phone : `${seller.phone?.slice(0, 4)}XXXXXX`}
                                </p>
                            </div>
                            {!revealedPhone && (
                                <button 
                                    onClick={() => setRevealedPhone(true)} 
                                    className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition"
                                >
                                    Reveal
                                </button>
                            )}
                        </div>

                        {seller.email && (
                            <div className="flex items-center gap-3 text-sm font-semibold text-gray-700">
                                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                                    <Mail size={14} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[10px] text-gray-400 leading-none mb-0.5">Email Address</p>
                                    <p className="truncate text-xs">{seller.email}</p>
                                </div>
                            </div>
                        )}

                        {seller.businessAddress && (
                            <div className="flex items-center gap-3 text-sm font-semibold text-gray-700">
                                <div className="w-8 h-8 rounded-lg bg-slate-50 text-slate-600 flex items-center justify-center shrink-0">
                                    <MapPin size={14} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[10px] text-gray-400 leading-none mb-0.5">Business Address</p>
                                    <p className="truncate text-xs leading-snug">{seller.businessAddress}</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Properties Listed */}
                <div className="space-y-3">
                    <div className="flex justify-between items-center px-1">
                        <h3 className="text-sm font-black text-gray-900">Active Listings ({properties.length})</h3>
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Properties Feed</span>
                    </div>

                    {properties.length === 0 ? (
                        <div className="bg-white rounded-3xl p-8 text-center border border-gray-100 shadow-sm">
                            <Home size={32} className="mx-auto text-gray-200 mb-2" />
                            <p className="text-xs font-bold text-gray-400 uppercase">No active listings</p>
                            <p className="text-[11px] text-gray-400 mt-1">This provider hasn't published any live listings recently.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-3.5">
                            {properties.map(property => {
                                const cover = property.coverImage || property.images?.[0] || 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=400&q=80';
                                const price = property.buyDetails?.expectedPrice 
                                    ? `₹${(property.buyDetails.expectedPrice / 100000).toFixed(1)} Lac` 
                                    : (property.rentDetails?.monthlyRent ? `₹${property.rentDetails.monthlyRent.toLocaleString('en-IN')}/mo` 
                                    : (property.dynamicData?.expectedPrice ? `₹${(Number(property.dynamicData.expectedPrice) / 100000).toFixed(1)} Lac`
                                    : (property.dynamicData?.monthlyRent ? `₹${Number(property.dynamicData.monthlyRent).toLocaleString('en-IN')}/mo`
                                    : 'Contact for Price')));

                                const locality = property.address?.locality || property.address?.area || property.address?.city || '';

                                return (
                                    <motion.div
                                        key={property._id}
                                        whileTap={{ scale: 0.99 }}
                                        onClick={() => navigateToProperty(property)}
                                        className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer flex h-28"
                                    >
                                        {/* Image */}
                                        <div className="w-28 h-full shrink-0 relative">
                                            <img src={cover} alt={property.name} className="w-full h-full object-cover" />
                                            {property.propertyType && (
                                                <span className="absolute top-1.5 left-1.5 bg-black/60 backdrop-blur-sm text-white text-[8px] font-black uppercase px-1.5 py-0.5 rounded">
                                                    {property.propertyType}
                                                </span>
                                            )}
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 p-3 flex flex-col justify-between min-w-0">
                                            <div>
                                                <div className="flex items-start justify-between gap-1 mb-0.5">
                                                    <h4 className="font-bold text-xs text-gray-900 truncate flex-1 leading-snug">{property.name || property.propertyName}</h4>
                                                    <ChevronRight size={14} className="text-gray-300 shrink-0 mt-0.5" />
                                                </div>
                                                <div className="flex items-center gap-0.5 text-gray-400 text-[10px]">
                                                    <MapPin size={10} className="shrink-0" />
                                                    <span className="truncate">{locality}</span>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between mt-1 pt-1.5 border-t border-gray-50">
                                                <span className="text-xs font-black text-gray-900">{price}</span>
                                                {property.isActive ? (
                                                    <span className="text-[8px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                                                        ● Live
                                                    </span>
                                                ) : (
                                                    <span className="text-[8px] font-bold text-gray-500 bg-gray-50 px-1.5 py-0.5 rounded-full">
                                                        Inactive
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PartnerProfilePage;
