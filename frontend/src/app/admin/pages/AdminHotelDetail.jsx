import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Building2, MapPin, CheckCircle, XCircle, FileText,
    ChevronLeft, Star, Bed, Calendar, ShieldCheck, AlertCircle,
    MoreVertical, Download, Search, Ban, Wifi, Phone, Mail, Tv, Coffee, Wind, Loader2, Clock, Image as ImageIcon, Users, MessageSquare
} from 'lucide-react';
import { Link, useParams, useLocation } from 'react-router-dom';
import ConfirmationModal from '../components/ConfirmationModal';
import adminService from '../../../services/adminService';
import toast from 'react-hot-toast';
import { downloadBrochurePDF } from '../../../utils/brochurePdfGenerator';

// --- Tab Components ---

const OverviewTab = ({ hotel, isProject }) => {
    const creator = hotel.userId || hotel.partnerId;
    
    let creatorName = creator?.name || 'N/A';
    let creatorType = creator?.role || 'Partner';
    if (isProject) {
        if (hotel.isAddedByAdmin) {
            creatorName = 'System Admin';
            creatorType = 'Admin';
        } else {
            creatorName = creator?.name || creator?.companyName || 'Unknown Builder';
            creatorType = 'Builder';
        }
    }

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                    <h3 className="font-bold text-[10px] uppercase tracking-wider text-gray-500 mb-4 flex items-center gap-2">
                        <Building2 size={14} /> Property Information
                    </h3>
                    <div className="space-y-3 text-sm">
                        <div className="flex justify-between">
                            <span className="text-gray-500 font-bold uppercase text-[10px]">Property Name</span>
                            <span className="font-bold text-gray-900">{hotel.propertyName}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500 font-bold uppercase text-[10px]">Property Type</span>
                            <span className="font-bold text-gray-900 capitalize">{hotel.propertyType}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500 font-bold uppercase text-[10px]">Contact Number</span>
                            <span className="font-bold text-gray-900">{hotel.contactNumber || 'Not Provided'}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500 font-bold uppercase text-[10px]">Status</span>
                            <span className="font-bold text-gray-900 capitalize">{hotel.status}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500 font-bold uppercase text-[10px]">Joined Date</span>
                            <span className="font-bold text-gray-900">{hotel.createdAt ? new Date(hotel.createdAt).toLocaleDateString() : 'N/A'}</span>
                        </div>
                        {(() => {
                            const rawPrice = hotel.startingPrice || hotel.rentDetails?.monthlyRent || hotel.pgDetails?.monthlyRent || hotel.buyDetails?.expectedPrice || hotel.plotDetails?.expectedPrice || hotel.dynamicData?.expectedPrice || hotel.dynamicData?.monthlyRent || hotel.dynamicData?.expectedRent || hotel.dynamicData?.price || hotel.minPrice || hotel.price;
                            const formattedPrice = rawPrice ? `₹${Number(rawPrice.toString().replace(/,/g, '')).toLocaleString('en-IN')}` : 'N/A';
                            
                            const isRoomBased = ['hotel', 'resort', 'homestay', 'tent'].includes((hotel.propertyType || '').toLowerCase());
                            const area = hotel.carpetArea || hotel.superArea || hotel.plotDetails?.plotArea || hotel.buyDetails?.area?.superBuiltUp || hotel.dynamicData?.plotArea || hotel.dynamicData?.carpetArea;
                            const areaUnit = hotel.carpetAreaUnit || hotel.areaUnit || hotel.plotDetails?.unit || hotel.buyDetails?.area?.unit || 'sqft';

                            return (
                                <>
                                    {isRoomBased ? (
                                        <div className="flex justify-between">
                                            <span className="text-gray-500 font-bold uppercase text-[10px]">{hotel.propertyType === 'tent' ? 'Total Tent Types' : 'Total Room Types'}</span>
                                            <span className="font-bold text-gray-900">{hotel.rooms?.length || 0}</span>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="flex justify-between">
                                                <span className="text-gray-500 font-bold uppercase text-[10px]">{hotel.propertyType === 'rent' || hotel.propertyType === 'pg' ? 'Monthly Rent' : 'Expected Price'}</span>
                                                <span className="font-bold text-gray-900">{formattedPrice}</span>
                                            </div>
                                            {area && (
                                                <div className="flex justify-between">
                                                    <span className="text-gray-500 font-bold uppercase text-[10px]">Area</span>
                                                    <span className="font-bold text-gray-900">{area} {areaUnit}</span>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </>
                            );
                        })()}
                        <div className="flex justify-between">
                            <span className="text-gray-500 font-bold uppercase text-[10px]">Live On Platform</span>
                            <span className="font-bold text-gray-900 flex items-center gap-1">
                                {hotel.isLive ? <CheckCircle size={12} className="text-green-600" /> : <XCircle size={12} className="text-red-500" />}
                                {hotel.isLive ? 'Yes' : 'No'}
                            </span>
                        </div>
                    </div>
                </div>
                <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                    <h3 className="font-bold text-[10px] uppercase tracking-wider text-gray-500 mb-4 flex items-center gap-2">
                        <MapPin size={14} /> Creator & Location Details
                    </h3>
                    <div className="space-y-3 text-sm">
                        <div className="flex justify-between">
                            <span className="text-gray-500 font-bold uppercase text-[10px]">Created By</span>
                            <span className="font-bold text-gray-900 capitalize">{creator?.name || 'N/A'} ({creatorType})</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500 font-bold uppercase text-[10px]">Creator Email</span>
                            <span className="font-bold text-gray-900">{creator?.email || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500 font-bold uppercase text-[10px]">Creator Phone</span>
                            <span className="font-bold text-gray-900">{creator?.phone || 'N/A'}</span>
                        </div>
                        <div className="pt-2">
                            <span className="text-gray-500 font-bold uppercase text-[10px] block mb-1">Full Address</span>
                            <span className="font-bold block text-gray-800 leading-relaxed">
                                {hotel.address?.fullAddress || hotel.address?.area || 'N/A'}
                                <br />
                                {hotel.address?.city}, {hotel.address?.district ? `${hotel.address.district}, ` : ''}{hotel.address?.state} {hotel.address?.pincode && `- ${hotel.address.pincode}`}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

        {hotel.dynamicData && Object.keys(hotel.dynamicData).length > 0 && (
            <>
                <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 mt-6">
                    <h3 className="font-bold text-[10px] uppercase tracking-wider text-gray-500 mb-4 flex items-center gap-2">
                        <FileText size={14} /> Additional Form Details
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4 text-sm">
                        {Object.entries(hotel.dynamicData).map(([key, val]) => {
                            if (val === undefined || val === null || val === '') return null;
                            
                            // Skip system fields, media arrays, objects, and spec fields
                            if (['propertyName', 'description', 'country', 'state', 'district', 'city', 'locality', 'houseNumber', 'pincode', 'photos', 'images', 'propertyImages', 'propertyVideos', 'floorPlans', 'paymentPlans', 'faqs', 'localityPros', 'localityCons', 'amenities', 'highlights', 'nearbyPlaces'].includes(key) || key.startsWith('bpd_') || key.startsWith('spec_') || key.startsWith('spec')) {
                                return null;
                            }

                            if (typeof val === 'object') return null; // Safe fallback for any other objects

                            const formattedKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase());
                            
                            return (
                                <div key={key} className="flex justify-between border-b border-gray-100 pb-2">
                                    <span className="text-gray-500 font-bold uppercase text-[10px] pr-4 whitespace-nowrap">{formattedKey}</span>
                                    <span className="font-bold text-gray-900 text-right break-words max-w-[200px]">{typeof val === 'boolean' ? (val ? 'Yes' : 'No') : val.toString()}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {Object.keys(hotel.dynamicData).some(k => k.toLowerCase().startsWith('spec')) && (
                    <div className="bg-white p-6 rounded-xl border border-gray-200 mt-6 shadow-sm">
                        <h3 className="font-bold text-[10px] uppercase tracking-wider text-gray-500 mb-4 flex items-center gap-2">
                            <Building2 size={14} /> Specifications
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {Object.entries(hotel.dynamicData)
                                .filter(([key]) => key.toLowerCase().startsWith('spec'))
                                .map(([key, val]) => {
                                    if (!val || typeof val === 'object') return null;
                                    const formattedKey = key.replace(/^spec_?/i, '').replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase());
                                    return (
                                        <div key={key} className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                            <span className="text-gray-500 font-bold uppercase text-[10px] block mb-2">{formattedKey}</span>
                                            <span className="font-bold text-gray-900 text-xs break-words">{val.toString()}</span>
                                        </div>
                                    );
                                })}
                        </div>
                    </div>
                )}

                {['faqs', 'localityPros', 'localityCons'].map(field => {
                    const arr = hotel.dynamicData?.[field] || hotel[field];
                    if (!Array.isArray(arr) || arr.length === 0) return null;
                    const isFaq = field === 'faqs';
                    return (
                        <div key={field} className="bg-white p-6 rounded-xl border border-gray-200 mt-6 shadow-sm">
                            <h3 className="font-bold text-[10px] uppercase tracking-wider text-gray-500 mb-4 flex items-center gap-2">
                                {isFaq ? <MessageSquare size={14} /> : <MapPin size={14} />} 
                                {field.replace(/([A-Z])/g, ' $1').toUpperCase()}
                            </h3>
                            <div className="space-y-3">
                                {arr.map((item, i) => {
                                    if (!item) return null;
                                    let displayText = '';
                                    if (typeof item === 'string') {
                                        displayText = item;
                                    } else if (typeof item === 'object') {
                                        displayText = item.point || item.text || item.title || item.heading || item.description || item.detail || Object.values(item).find(v => typeof v === 'string' && v.trim()) || '';
                                    }

                                    if (!displayText || displayText === 'Point') return null;

                                    return (
                                        <div key={i} className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                                            {isFaq ? (
                                                <>
                                                    <h4 className="text-xs font-bold text-gray-900 mb-1">{item.question || displayText}</h4>
                                                    <p className="text-[10px] font-bold uppercase text-gray-500 tracking-tight">{item.answer}</p>
                                                </>
                                            ) : (
                                                <p className="text-xs font-bold text-gray-800">
                                                    {displayText}
                                                </p>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </>
        )}

        {hotel.builderProjectDetails && 
         (hotel.builderProjectDetails.possessionStatus || 
          hotel.builderProjectDetails.possessionYear || 
          (hotel.builderProjectDetails.ratings && (hotel.builderProjectDetails.ratings.constructionQuality || hotel.builderProjectDetails.ratings.aiSummary)) || 
          (hotel.builderProjectDetails.priceHistory && (hotel.builderProjectDetails.priceHistory.currentPricePerSqft || hotel.builderProjectDetails.priceHistory.appreciationLast3Years))) && (
            <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 mt-6">
                <h3 className="font-bold text-[10px] uppercase tracking-wider text-gray-500 mb-4 flex items-center gap-2">
                    <Building2 size={14} /> Builder Project Insights
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {hotel.builderProjectDetails.possessionStatus && (
                        <div className="bg-white border border-gray-200 rounded-xl p-4">
                            <h4 className="text-[10px] font-bold uppercase text-gray-500 mb-2">Possession Status</h4>
                            <p className="text-sm font-bold text-gray-900">
                                {hotel.builderProjectDetails.possessionStatus}
                                {hotel.builderProjectDetails.possessionYear ? ` (Est. ${hotel.builderProjectDetails.possessionYear})` : ''}
                            </p>
                        </div>
                    )}
                    {hotel.builderProjectDetails.ratings?.constructionQuality > 0 && (
                        <div className="bg-white border border-gray-200 rounded-xl p-4">
                            <h4 className="text-[10px] font-bold uppercase text-gray-500 mb-2">Construction Quality</h4>
                            <p className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                                {hotel.builderProjectDetails.ratings.constructionQuality} / 5
                                <Star size={14} className="fill-yellow-500 text-yellow-500 border-none" />
                            </p>
                        </div>
                    )}
                    {hotel.builderProjectDetails.priceHistory?.currentPricePerSqft > 0 && (
                        <div className="bg-white border border-gray-200 rounded-xl p-4">
                            <h4 className="text-[10px] font-bold uppercase text-gray-500 mb-2">Price Per Sqft</h4>
                            <p className="text-sm font-bold text-gray-900">
                                ₹{hotel.builderProjectDetails.priceHistory.currentPricePerSqft.toLocaleString('en-IN')}
                            </p>
                        </div>
                    )}
                    {hotel.builderProjectDetails.priceHistory?.appreciationLast3Years > 0 && (
                        <div className="bg-white border border-gray-200 rounded-xl p-4">
                            <h4 className="text-[10px] font-bold uppercase text-gray-500 mb-2">3-Year Appreciation</h4>
                            <p className="text-sm font-bold text-emerald-600">
                                +{hotel.builderProjectDetails.priceHistory.appreciationLast3Years}%
                            </p>
                        </div>
                    )}
                </div>
                {hotel.builderProjectDetails.ratings?.aiSummary && (
                    <div className="bg-white border border-gray-200 rounded-xl p-4 mt-4">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 border border-indigo-100 text-[9px] font-bold rounded-full uppercase">AI Summary</span>
                        </div>
                        <p className="text-xs font-bold text-gray-700 leading-relaxed uppercase tracking-tight">
                            {hotel.builderProjectDetails.ratings.aiSummary}
                        </p>
                    </div>
                )}
            </div>
        )}


        <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
            <h3 className="font-bold text-[10px] uppercase tracking-wider text-gray-500 mb-3">About Property</h3>
            {hotel.shortDescription && (
                <div className="mb-4">
                    <h4 className="text-[10px] font-bold uppercase text-gray-400 mb-1">Short Description</h4>
                    <p className="text-sm font-bold text-gray-700 uppercase tracking-tight italic">
                        {hotel.shortDescription}
                    </p>
                </div>
            )}
            <h4 className="text-[10px] font-bold uppercase text-gray-400 mb-1">Detailed Description</h4>
            <p className="text-sm font-bold text-gray-600 leading-relaxed uppercase tracking-tight">
                {hotel.description || 'No description provided for this property.'}
            </p>
        </div>

        {(hotel.propertyType === 'plot' || (hotel.plotDetails && (hotel.plotDetails.plotArea || hotel.plotDetails.facing))) && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {hotel.plotDetails?.plotArea && (
                    <div className="bg-white border border-gray-200 rounded-xl p-4">
                        <h4 className="text-[10px] font-bold uppercase text-gray-500 mb-2">Plot Area</h4>
                        <p className="text-sm font-bold text-gray-900">{hotel.plotDetails.plotArea} {hotel.plotDetails?.unit || 'sqft'}</p>
                    </div>
                )}
                {hotel.plotDetails?.dimensions?.length && hotel.plotDetails?.dimensions?.breadth && (
                    <div className="bg-white border border-gray-200 rounded-xl p-4">
                        <h4 className="text-[10px] font-bold uppercase text-gray-500 mb-2">Dimensions</h4>
                        <p className="text-sm font-bold text-gray-900">
                            {hotel.plotDetails.dimensions.length} x {hotel.plotDetails.dimensions.breadth} ft
                        </p>
                    </div>
                )}
                {hotel.plotDetails?.facing && (
                    <div className="bg-white border border-gray-200 rounded-xl p-4">
                        <h4 className="text-[10px] font-bold uppercase text-gray-500 mb-2">Facing</h4>
                        <p className="text-sm font-bold text-gray-900">{hotel.plotDetails.facing}</p>
                    </div>
                )}
                {hotel.plotDetails?.landType && (
                    <div className="bg-white border border-gray-200 rounded-xl p-4">
                        <h4 className="text-[10px] font-bold uppercase text-gray-500 mb-2">Land Type</h4>
                        <p className="text-sm font-bold text-gray-900">{hotel.plotDetails.landType}</p>
                    </div>
                )}
            </div>
        )}

        {(() => {
            const superBuiltUpArea = hotel.buyDetails?.area?.superBuiltUp || hotel.dynamicData?.superArea || hotel.dynamicData?.superBuiltUpArea || hotel.superArea || hotel.superBuiltUpArea;
            const areaUnit = hotel.buyDetails?.area?.unit || hotel.dynamicData?.superAreaUnit || hotel.superAreaUnit || 'sqft';
            const ownership = hotel.buyDetails?.ownership || hotel.dynamicData?.ownershipType || hotel.dynamicData?.ownership || hotel.ownership;
            const propertyAge = hotel.buyDetails?.propertyAge || hotel.dynamicData?.propertyAge || hotel.dynamicData?.ageOfProperty || hotel.propertyAge;

            if (!superBuiltUpArea && !ownership && !propertyAge) return null;

            return (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    {superBuiltUpArea && (
                        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-xs">
                            <h4 className="text-[10px] font-bold uppercase text-gray-500 mb-2">Super Built-up Area</h4>
                            <p className="text-sm font-bold text-gray-900">{superBuiltUpArea} {areaUnit}</p>
                        </div>
                    )}
                    {ownership && (
                        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-xs">
                            <h4 className="text-[10px] font-bold uppercase text-gray-500 mb-2">Ownership</h4>
                            <p className="text-sm font-bold text-gray-900">{ownership}</p>
                        </div>
                    )}
                    {propertyAge && (
                        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-xs">
                            <h4 className="text-[10px] font-bold uppercase text-gray-500 mb-2">Property Age</h4>
                            <p className="text-sm font-bold text-gray-900">{propertyAge}</p>
                        </div>
                    )}
                </div>
            );
        })()}

        {(hotel.propertyType === 'rent' || (hotel.rentDetails && Object.keys(hotel.rentDetails).length > 0)) && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                    <h4 className="text-[10px] font-bold uppercase text-gray-500 mb-2">Monthly Rent</h4>
                    <p className="text-sm font-bold text-gray-900">₹{hotel.rentDetails?.monthlyRent?.toLocaleString() || 'Not set'}</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                    <h4 className="text-[10px] font-bold uppercase text-gray-500 mb-2">Maintenance</h4>
                    <p className="text-sm font-bold text-gray-900">₹{hotel.rentDetails?.maintenanceCharges?.toLocaleString() || '0'}</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                    <h4 className="text-[10px] font-bold uppercase text-gray-500 mb-2">Type</h4>
                    <p className="text-sm font-bold text-gray-900">{hotel.rentDetails?.type || 'Not specified'}</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                    <h4 className="text-[10px] font-bold uppercase text-gray-500 mb-2">Furnishing</h4>
                    <p className="text-sm font-bold text-gray-900">{hotel.rentDetails?.furnishing || 'Not specified'}</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                    <h4 className="text-[10px] font-bold uppercase text-gray-500 mb-2">Tenant Preference</h4>
                    <p className="text-sm font-bold text-gray-900">{hotel.rentDetails?.tenantPreference || 'Any'}</p>
                </div>
                {hotel.rentDetails?.societyName && (
                    <div className="bg-white border border-gray-200 rounded-xl p-4">
                        <h4 className="text-[10px] font-bold uppercase text-gray-500 mb-2">Society Name</h4>
                        <p className="text-sm font-bold text-gray-900">{hotel.rentDetails.societyName}</p>
                    </div>
                )}
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                    <h4 className="text-[10px] font-bold uppercase text-gray-500 mb-2">Water Supply</h4>
                    <p className="text-sm font-bold text-gray-900">{hotel.rentDetails?.waterSupply || 'Not specified'}</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-4 flex justify-between items-center">
                    <h4 className="text-[10px] font-bold uppercase text-gray-500">Electricity Incl.</h4>
                    <p className="text-xs font-bold text-gray-900">{hotel.rentDetails?.electricityIncluded ? 'YES' : 'NO'}</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-4 flex justify-between items-center">
                    <h4 className="text-[10px] font-bold uppercase text-gray-500">Lift Available</h4>
                    <p className="text-xs font-bold text-gray-900">{hotel.rentDetails?.lift ? 'YES' : 'NO'}</p>
                </div>
            </div>
        )}
        {(hotel.propertyType === 'pg' || (hotel.pgDetails && Object.keys(hotel.pgDetails).length > 0)) && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                    <h4 className="text-[10px] font-bold uppercase text-gray-500 mb-2">Occupancy</h4>
                    <p className="text-sm font-bold text-gray-900">{hotel.pgDetails?.occupancy || 'Not set'}</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                    <h4 className="text-[10px] font-bold uppercase text-gray-500 mb-2">Gender</h4>
                    <p className="text-sm font-bold text-gray-900">{hotel.pgDetails?.gender || 'Not set'}</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                    <h4 className="text-[10px] font-bold uppercase text-gray-500 mb-2">Security Deposit</h4>
                    <p className="text-sm font-bold text-gray-900">₹{hotel.pgDetails?.securityDeposit?.toLocaleString() || '0'}</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                    <h4 className="text-[10px] font-bold uppercase text-gray-500 mb-2">Notice Period</h4>
                    <p className="text-sm font-bold text-gray-900">{hotel.pgDetails?.noticePeriod || 'Not set'}</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                    <h4 className="text-[10px] font-bold uppercase text-gray-500 mb-2">Min Stay</h4>
                    <p className="text-sm font-bold text-gray-900">{hotel.pgDetails?.minStay || 'Not set'}</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-4 flex justify-between items-center">
                    <h4 className="text-[10px] font-bold uppercase text-gray-500">Food Included</h4>
                    <p className="text-xs font-bold text-gray-900">{hotel.pgDetails?.foodIncluded ? 'YES' : 'NO'}</p>
                </div>
            </div>
        )}

        {['amenities', 'highlights'].map(field => {
            const schemaArr = Array.isArray(hotel[field]) ? hotel[field] : [];
            const dynArr = Array.isArray(hotel.dynamicData?.[field]) ? hotel.dynamicData[field] : [];
            const mergedArr = [...new Set([...schemaArr, ...dynArr])];
            
            if (mergedArr.length === 0) return null;
            
            return (
                <div key={field} className="mt-6">
                    <h3 className="font-bold text-[10px] uppercase tracking-wider text-gray-500 mb-3">{field.toUpperCase()}</h3>
                    <div className="flex flex-wrap gap-3">
                        {mergedArr.map((item, i) => (
                            <span key={i} className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-[10px] font-bold uppercase text-gray-700 flex items-center gap-2 shadow-sm">
                                <CheckCircle size={12} className="text-green-500" />
                                {item.replace(/_/g, ' ')}
                            </span>
                        ))}
                    </div>
                </div>
            );
        })}

        {
            hotel.propertyType === 'plot' && (
                <div>
                    <h3 className="font-bold text-[10px] uppercase tracking-wider text-gray-500 mb-3">Plot Features</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white border border-gray-200 rounded-xl p-4">
                            <h4 className="text-[10px] font-bold uppercase text-gray-500 mb-2">Boundary Marked</h4>
                            <p className="text-sm font-bold text-gray-900">{hotel.plotDetails?.boundaryMarked ? 'Yes' : 'No'}</p>
                        </div>
                        <div className="bg-white border border-gray-200 rounded-xl p-4">
                            <h4 className="text-[10px] font-bold uppercase text-gray-500 mb-2">Electricity Available</h4>
                            <p className="text-sm font-bold text-gray-900">{hotel.plotDetails?.electricityAvailable ? 'Yes' : 'No'}</p>
                        </div>
                        <div className="bg-white border border-gray-200 rounded-xl p-4">
                            <h4 className="text-[10px] font-bold uppercase text-gray-500 mb-2">Water Source</h4>
                            <p className="text-sm font-bold text-gray-900">{hotel.plotDetails?.waterSource || 'Not specified'}</p>
                        </div>
                        <div className="bg-white border border-gray-200 rounded-xl p-4">
                            <h4 className="text-[10px] font-bold uppercase text-gray-500 mb-2">Road Width</h4>
                            <p className="text-sm font-bold text-gray-900">{hotel.plotDetails?.roadWidth ? `${hotel.plotDetails.roadWidth} ft` : 'Not set'}</p>
                        </div>
                        <div className="bg-white border border-gray-200 rounded-xl p-4">
                            <h4 className="text-[10px] font-bold uppercase text-gray-500 mb-2">Approval Authority</h4>
                            <p className="text-sm font-bold text-gray-900">{hotel.plotDetails?.approvalAuthority || 'Not specified'}</p>
                        </div>
                        <div className="bg-white border border-gray-200 rounded-xl p-4">
                            <h4 className="text-[10px] font-bold uppercase text-gray-500 mb-2">Soil Type</h4>
                            <p className="text-sm font-bold text-gray-900">{hotel.plotDetails?.soilType || 'Not specified'}</p>
                        </div>
                        <div className="bg-white border border-gray-200 rounded-xl p-4">
                            <h4 className="text-[10px] font-bold uppercase text-gray-500 mb-2">Nearby Landmark</h4>
                            <p className="text-sm font-bold text-gray-900">{hotel.plotDetails?.nearbyLandmark || 'Not set'}</p>
                        </div>
                    </div>
                </div>
            )
        }


        {hotel.nearbyPlaces && hotel.nearbyPlaces.length > 0 && (
            <div>
                <h3 className="font-bold text-[10px] uppercase tracking-wider text-gray-500 mb-3">Nearby Places</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {hotel.nearbyPlaces.map((place, i) => (
                        <div key={i} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                                <MapPin size={14} />
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-gray-900">{place.name}</h4>
                                <p className="text-[10px] font-bold uppercase text-gray-500">
                                    {place.type} • <span className="text-emerald-600">{place.distanceKm} KM</span>
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}
    </div>
    );
};

const GalleryTab = ({ hotel, isProject }) => {
    const allImages = [];
    if (hotel.coverImage) allImages.push(hotel.coverImage);
    if (hotel.images?.cover) allImages.push(hotel.images.cover);
    if (Array.isArray(hotel.propertyImages)) allImages.push(...hotel.propertyImages);
    if (Array.isArray(hotel.images?.gallery)) allImages.push(...hotel.images.gallery);
    
    const dynImages = hotel.dynamicData?.photos || hotel.dynamicData?.images || hotel.dynamicData?.propertyImages || [];
    if (Array.isArray(dynImages)) allImages.push(...dynImages);

    // Remove duplicates
    const uniqueImages = [...new Set(allImages.map(img => typeof img === 'string' ? img : img?.url).filter(Boolean))];

    // Collect Videos safely handling arrays or nested objects
    const rawVideos = [];
    if (hotel.videoUrl) rawVideos.push(hotel.videoUrl);
    if (Array.isArray(hotel.propertyVideos)) rawVideos.push(...hotel.propertyVideos);
    if (Array.isArray(hotel.dynamicData?.propertyVideos)) rawVideos.push(...hotel.dynamicData.propertyVideos);
    if (hotel.dynamicData?.videoUrl) rawVideos.push(hotel.dynamicData.videoUrl);
    if (hotel.dynamicData?.youtubeUrl) rawVideos.push(hotel.dynamicData.youtubeUrl);
    if (hotel.dynamicData?.youtubeLink) rawVideos.push(hotel.dynamicData.youtubeLink);
    
    const allVideos = rawVideos.flatMap(v => {
        if (!v) return [];
        if (typeof v === 'string') return [v];
        if (typeof v === 'object') return [v.url || v.fileUrl || v.videoUrl || v.youtubeUrl || v.link || v.youtubeLink].filter(Boolean);
        return [];
    });

    // Remove empty/duplicate items
    const uniqueVideos = [...new Set(allVideos.filter(v => typeof v === 'string' && v.trim() !== ''))];

    // Collect Plans & Milestones
    const floorPlans = Array.isArray(hotel.dynamicData?.floorPlans) ? hotel.dynamicData.floorPlans : [];
    const paymentPlans = Array.isArray(hotel.dynamicData?.paymentPlans) ? hotel.dynamicData.paymentPlans : [];

    const getEmbedYoutubeUrl = (urlStr) => {
        if (!urlStr || typeof urlStr !== 'string') return '';
        try {
            // Handle standard watch URLs, mobile URLs (m.youtube.com), shorts, and shortlinks (youtu.be)
            let videoId = '';
            if (urlStr.includes('youtu.be/')) {
                videoId = urlStr.split('youtu.be/')[1]?.split('?')[0]?.split('&')[0];
            } else if (urlStr.includes('youtube.com/shorts/')) {
                videoId = urlStr.split('youtube.com/shorts/')[1]?.split('?')[0]?.split('&')[0];
            } else if (urlStr.includes('v=')) {
                videoId = urlStr.split('v=')[1]?.split('&')[0];
            } else if (urlStr.includes('embed/')) {
                videoId = urlStr.split('embed/')[1]?.split('?')[0]?.split('&')[0];
            }
            
            return videoId ? `https://www.youtube.com/embed/${videoId}` : '';
        } catch {
            return '';
        }
    };

    const MediaGrid = ({ items, title, isVideo = false }) => (
        <div className="mb-10">
            <div className="flex items-center gap-2 mb-4">
                <Building2 size={20} className="text-blue-600" />
                <h3 className="text-lg font-bold text-gray-900 uppercase">{title}</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {items.length > 0 ? (
                    items.map((item, i) => {
                        const url = typeof item === 'string' ? item : item?.url || item?.fileUrl || item?.image || item?.planImageOrUrl || item?.floorPlanImage;
                        if (!url) return null;

                        const isYoutube = url.includes('youtube.com') || url.includes('youtu.be');
                        const youtubeEmbedUrl = isYoutube ? getEmbedYoutubeUrl(url) : '';
                        
                        return (
                            <div key={i} className="aspect-video bg-gray-100 rounded-2xl overflow-hidden border border-gray-200 relative group shadow-sm transition-all hover:shadow-md">
                                {isVideo ? (
                                    isYoutube && youtubeEmbedUrl ? (
                                        <iframe
                                            src={youtubeEmbedUrl}
                                            className="w-full h-full border-none"
                                            title={`Video ${i}`}
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                            allowFullScreen
                                        />
                                    ) : (
                                        <video src={url} controls className="w-full h-full object-cover" />
                                    )
                                ) : (
                                    <img src={url} alt={`${title} ${i}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                )}
                            </div>
                        )
                    })
                ) : (
                    <div className="col-span-full py-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-300">
                        <p className="text-gray-400 font-bold uppercase text-xs">No {title} Available</p>
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <div className="space-y-4">
            <MediaGrid items={uniqueImages} title="General Property Photos" />
            
            <MediaGrid items={uniqueVideos} title="Property & Walkthrough Videos" isVideo={true} />

            {/* Floor Plans Display */}
            <div className="mb-10">
                <div className="flex items-center gap-2 mb-4">
                    <Building2 size={20} className="text-blue-600" />
                    <h3 className="text-lg font-bold text-gray-900 uppercase">Floor Plans</h3>
                </div>
                {floorPlans.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {floorPlans.map((plan, i) => (
                            <div key={i} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-3">
                                {(plan.planImageOrUrl || plan.floorPlanImage) && (
                                    <img src={plan.planImageOrUrl || plan.floorPlanImage} alt={plan.title || `Plan ${i+1}`} className="w-full h-40 object-cover rounded-lg" />
                                )}
                                <div>
                                    <h4 className="font-bold text-sm text-gray-900 uppercase">{plan.title || plan.bhkType || `Floor Plan ${i+1}`}</h4>
                                    <p className="text-xs text-gray-500 font-medium">Built-up Area: <span className="font-bold text-gray-800">{plan.area || plan.superArea || 'N/A'} {plan.areaUnit || 'sqft'}</span></p>
                                    <p className="text-xs text-gray-500 font-medium">Expected Price: <span className="font-bold text-blue-600">₹{plan.price || plan.expectedPrice || 'N/A'}</span></p>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="py-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-300">
                        <p className="text-gray-400 font-bold uppercase text-xs">No Floor Plans Added</p>
                    </div>
                )}
            </div>

            {/* Payment Plans Display */}
            <div className="mb-10">
                <div className="flex items-center gap-2 mb-4">
                    <Building2 size={20} className="text-blue-600" />
                    <h3 className="text-lg font-bold text-gray-900 uppercase">Payment Milestones & Plans</h3>
                </div>
                {paymentPlans.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {paymentPlans.map((plan, i) => (
                            <div key={i} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-3">
                                <h4 className="font-bold text-sm text-gray-900 uppercase border-b pb-2">{plan.planName || `Payment Plan ${i+1}`}</h4>
                                {Array.isArray(plan.milestones) && plan.milestones.length > 0 && (
                                    <div className="space-y-2">
                                        {plan.milestones.map((m, idx) => (
                                            <div key={idx} className="flex justify-between text-xs font-medium">
                                                <span className="text-gray-600">{m.stageName || m.milestoneName || `Stage ${idx+1}`}</span>
                                                <span className="font-bold text-gray-900">{m.percentage || m.percent}%</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="py-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-300">
                        <p className="text-gray-400 font-bold uppercase text-xs">No Payment Plans Added</p>
                    </div>
                )}
            </div>
        </div>
    );
};

const DocumentsTab = ({ hotel, documents, onVerify, verifying }) => {
    const [remark, setRemark] = useState('');

    const brochureDoc = hotel.dynamicData?.brochure || hotel.dynamicData?.brochureUrl || hotel.brochureUrl || hotel.brochure || hotel.dynamicData?.pdfBrochure;
    const reraDoc = hotel.dynamicData?.reraRegistrationNumber || hotel.reraNumber || hotel.reraRegistrationNumber;

    const extractUrl = (doc) => {
        if (!doc) return '';
        if (typeof doc === 'string') return doc;
        if (Array.isArray(doc) && doc.length > 0) return extractUrl(doc[0]);
        if (typeof doc === 'object') return doc.url || doc.fileUrl || doc.path || doc.link || doc.secure_url || '';
        return '';
    };

    const brochureLink = extractUrl(brochureDoc);

    if (!documents && !brochureDoc && !reraDoc) {
        return (
            <div className="py-20 text-center bg-white border border-gray-200 rounded-2xl">
                <ShieldCheck size={48} className="mx-auto text-gray-200 mb-4" />
                <h3 className="text-gray-900 font-bold uppercase text-sm">No Documents Submitted</h3>
                <p className="text-gray-400 text-xs mt-1">This property has not uploaded any verification documents yet.</p>
            </div>
        );
    }

    // Sync verification status with property approval status
    const rawStatus = hotel.status || documents?.verificationStatus || (hotel.isApproved ? 'approved' : 'pending');
    const isApprovedState = rawStatus === 'verified' || rawStatus === 'approved' || hotel.isApproved === true || hotel.isLive === true;
    const status = isApprovedState ? 'approved' : rawStatus;

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2 uppercase text-xs tracking-wider">
                        <FileText size={16} /> Document Summary
                    </h4>
                    <div className="space-y-4 text-sm">
                        <div className="flex justify-between">
                            <span className="text-gray-500 font-bold uppercase text-[10px]">Property</span>
                            <span className="font-bold text-gray-900">{hotel.propertyName}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500 font-bold uppercase text-[10px]">Property Type</span>
                            <span className="font-bold text-gray-900 capitalize">{hotel.propertyType}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-gray-500 font-bold uppercase text-[10px]">Verification Status</span>
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase flex items-center gap-1 ${isApprovedState
                                ? 'bg-green-100 text-green-700 border border-green-200'
                                : status === 'rejected'
                                    ? 'bg-red-100 text-red-700 border border-red-200'
                                    : 'bg-amber-100 text-amber-700 border border-amber-200'
                                }`}>
                                {isApprovedState && <ShieldCheck size={10} />}
                                {status === 'rejected' && <XCircle size={10} />}
                                {!isApprovedState && status !== 'rejected' && <Clock size={10} />}
                                {isApprovedState ? 'APPROVED' : status}
                            </span>
                        </div>
                        {documents?.verifiedAt && (
                            <div className="flex justify-between">
                                <span className="text-gray-500 font-bold uppercase text-[10px]">Last Updated</span>
                                <span className="font-bold text-gray-900">
                                    {new Date(documents.verifiedAt).toLocaleString()}
                                </span>
                            </div>
                        )}
                        {documents?.adminRemark && (
                            <div>
                                <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">Admin Remark</p>
                                <p className="text-xs font-bold text-gray-800">{documents.adminRemark}</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2 uppercase text-xs tracking-wider">
                        <ShieldCheck size={16} /> Verification Actions
                    </h4>
                    <div className="space-y-4">
                        <div>
                            <p className="text-[10px] text-gray-500 uppercase font-bold mb-2">Rejection Remark</p>
                            <textarea
                                value={remark}
                                onChange={(e) => setRemark(e.target.value)}
                                placeholder="Optional note in case of rejection"
                                className="w-full min-h-[80px] text-xs font-bold uppercase border border-gray-200 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-black"
                            />
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3">
                            <button
                                type="button"
                                disabled={verifying || isApprovedState}
                                onClick={() => onVerify && onVerify('approve', '')}
                                className={`flex-1 px-4 py-2 rounded-lg text-[10px] font-bold uppercase flex items-center justify-center gap-2 ${isApprovedState
                                    ? 'bg-green-100 text-green-500 border border-green-100 cursor-not-allowed'
                                    : 'bg-green-600 text-white border border-green-600 hover:bg-green-700'
                                    } ${verifying ? 'opacity-70 cursor-not-allowed' : ''}`}
                            >
                                <CheckCircle size={14} />
                                {isApprovedState ? 'Documents Approved' : 'Approve Documents'}
                            </button>
                            <button
                                type="button"
                                disabled={verifying || status === 'rejected'}
                                onClick={() => onVerify && onVerify('reject', remark)}
                                className={`flex-1 px-4 py-2 rounded-lg text-[10px] font-bold uppercase flex items-center justify-center gap-2 ${status === 'rejected'
                                    ? 'bg-red-100 text-red-500 border border-red-100 cursor-not-allowed'
                                    : 'bg-white text-red-600 border border-red-200 hover:bg-red-50'
                                    } ${verifying ? 'opacity-70 cursor-not-allowed' : ''}`}
                            >
                                <XCircle size={14} />
                                Reject Documents
                            </button>
                        </div>
                        <p className="text-[10px] text-gray-400 font-bold uppercase leading-relaxed">
                            Approving documents will move the property to <span className="text-green-700">approved</span> status
                            and make it live on the platform. Rejected properties will stay hidden from users until issues are fixed.
                        </p>
                    </div>
                </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2 uppercase text-xs tracking-wider">
                    <FileText size={16} /> Uploaded Documents
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {brochureDoc && (
                        <div className="border border-blue-200 rounded-xl p-4 flex flex-col justify-between bg-blue-50/50 shadow-xs">
                            <div className="space-y-2">
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-xs font-bold text-blue-900 uppercase flex items-center gap-1.5">
                                        <FileText size={14} className="text-blue-600" />
                                        Project e-Brochure (PDF)
                                    </span>
                                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-blue-100 text-blue-700 border border-blue-200">
                                        Combined PDF
                                    </span>
                                </div>
                                <p className="text-[10px] text-blue-600/80 uppercase font-medium">
                                    Official Sales Brochure ({Array.isArray(brochureDoc) ? `${brochureDoc.length} pages` : '1 Document'})
                                </p>
                            </div>
                            <div className="mt-4">
                                <button
                                    type="button"
                                    onClick={() => downloadBrochurePDF(brochureDoc, hotel.propertyName || 'Project')}
                                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-blue-600 text-white text-[10px] font-bold uppercase hover:bg-blue-700 transition-all shadow-sm cursor-pointer"
                                >
                                    <Download size={12} />
                                    Download / View Brochure (PDF)
                                </button>
                            </div>
                        </div>
                    )}

                    {reraDoc && (
                        <div className="border border-emerald-200 rounded-xl p-4 flex flex-col justify-between bg-emerald-50/50 shadow-xs">
                            <div className="space-y-2">
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-xs font-bold text-emerald-900 uppercase flex items-center gap-1.5">
                                        <ShieldCheck size={14} className="text-emerald-600" />
                                        RERA Registration
                                    </span>
                                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-emerald-100 text-emerald-700 border border-emerald-200">
                                        Government Verified
                                    </span>
                                </div>
                                <p className="text-[11px] font-bold text-emerald-800 break-all">
                                    {reraDoc}
                                </p>
                            </div>
                        </div>
                    )}

                    {documents?.documents && documents.documents.length > 0 && (
                        documents.documents.map((doc, idx) => (
                            <div key={idx} className="border border-gray-200 rounded-xl p-4 flex flex-col justify-between bg-gray-50">
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="text-xs font-bold text-gray-900 uppercase">
                                            {doc.name || doc.type || 'Document'}
                                        </span>
                                        {doc.isRequired && (
                                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-amber-100 text-amber-700 border border-amber-200">
                                                Required
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-[10px] text-gray-400 uppercase">
                                        {doc.type || 'Uploaded File'}
                                    </p>
                                </div>
                                <div className="mt-3">
                                    {doc.fileUrl ? (
                                        <a
                                            href={doc.fileUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-300 text-[10px] font-bold uppercase text-gray-700 hover:bg-gray-100"
                                        >
                                            <FileText size={12} />
                                            View File
                                        </a>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase text-gray-400">
                                            <AlertCircle size={11} /> No file
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                    {(!documents?.documents || documents.documents.length === 0) && !brochureDoc && !reraDoc && (
                        <div className="col-span-full text-center py-8 text-[10px] font-bold uppercase text-gray-400">
                            No verification documents uploaded
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const RoomsTab = ({ rooms }) => {
    const [expandedRoomId, setExpandedRoomId] = useState(null);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-gray-900 uppercase">{rooms?.[0]?.propertyType === 'tent' || rooms?.[0]?.inventoryType === 'tent' ? 'Tent Inventory' : 'Room Inventory'}</h3>
            </div>

            <div className="space-y-4">
                {rooms && rooms.length > 0 ? (
                    rooms.map((room, i) => {
                        const isExpanded = expandedRoomId === room._id;
                        return (
                            <div key={i} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                                <div
                                    className="p-5 flex flex-col md:flex-row items-center gap-6 cursor-pointer"
                                    onClick={() => setExpandedRoomId(isExpanded ? null : room._id)}
                                >
                                    <div className="w-full md:w-32 h-24 bg-gray-100 rounded-lg shrink-0 flex items-center justify-center text-gray-400 relative overflow-hidden">
                                        {room.images && room.images[0] ? (
                                            <img src={room.images[0].url || room.images[0]} alt={room.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <Bed size={32} />
                                        )}
                                    </div>
                                    <div className="flex-1 w-full text-center md:text-left">
                                        <h4 className="font-bold text-gray-900 text-lg uppercase tracking-tight">{room.name}</h4>
                                        <div className="flex flex-wrap justify-center md:justify-start gap-4 mt-2 text-[10px] font-bold uppercase text-gray-400">
                                            <span className="flex items-center gap-1"><Users size={12} /> Max {room.maxAdults} Adults, {room.maxChildren} Child</span>
                                            <span className="flex items-center gap-1"><Building2 size={12} /> {room.totalInventory} {room.inventoryType === 'tent' || room.propertyType === 'tent' ? 'Tents' : 'Rooms'} Total</span>
                                            <span className="flex items-center gap-1 text-green-600"><ShieldCheck size={12} /> {room.inventoryType}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-8 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 border-gray-100 pt-4 md:pt-0">
                                        <div className="text-center">
                                            <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Status</p>
                                            <span className={`inline-block px-3 py-1 text-[10px] font-bold rounded-full uppercase ${room.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                {room.isActive ? 'Active' : 'Inactive'}
                                            </span>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Price / Night</p>
                                            <p className="text-xl font-bold text-gray-900">₹{room.pricePerNight}</p>
                                        </div>
                                        <ChevronLeft
                                            size={20}
                                            className={`text-gray-400 transition-transform duration-300 ${isExpanded ? '-rotate-90' : 'rotate-0'}`}
                                        />
                                    </div>
                                </div>

                                <AnimatePresence>
                                    {isExpanded && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.3 }}
                                            className="border-t border-gray-100 bg-gray-50"
                                        >
                                            <div className="p-6">
                                                {/* Details Grid */}
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                                                    <div>
                                                        <h5 className="text-[10px] font-bold uppercase text-gray-500 mb-3 block">Pricing Details</h5>
                                                        <div className="bg-white p-4 rounded-xl border border-gray-200 space-y-2">
                                                            <div className="flex justify-between text-xs">
                                                                <span className="text-gray-500 font-medium">Base Price</span>
                                                                <span className="font-bold text-gray-900">₹{room.pricePerNight}</span>
                                                            </div>
                                                            <div className="flex justify-between text-xs">
                                                                <span className="text-gray-500 font-medium">Extra Adult</span>
                                                                <span className="font-bold text-gray-900">₹{room.extraAdultPrice}</span>
                                                            </div>
                                                            <div className="flex justify-between text-xs">
                                                                <span className="text-gray-500 font-medium">Extra Child</span>
                                                                <span className="font-bold text-gray-900">₹{room.extraChildPrice}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <h5 className="text-[10px] font-bold uppercase text-gray-500 mb-3 block">Configuration</h5>
                                                        <div className="bg-white p-4 rounded-xl border border-gray-200 space-y-2">
                                                            <div className="flex justify-between text-xs">
                                                                <span className="text-gray-500 font-medium">Category</span>
                                                                <span className="font-bold text-gray-900 uppercase">{room.roomCategory}</span>
                                                            </div>
                                                            <div className="flex justify-between text-xs">
                                                                <span className="text-gray-500 font-medium">Inventory Type</span>
                                                                <span className="font-bold text-gray-900 uppercase">{room.inventoryType}</span>
                                                            </div>
                                                            <div className="flex justify-between text-xs">
                                                                <span className="text-gray-500 font-medium">Total Inventory</span>
                                                                <span className="font-bold text-gray-900">{room.totalInventory} Units</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <h5 className="text-[10px] font-bold uppercase text-gray-500 mb-3 block">Amenities</h5>
                                                        <div className="bg-white p-4 rounded-xl border border-gray-200 flex flex-wrap gap-2">
                                                            {room.amenities.map((amenity, idx) => (
                                                                <span key={idx} className="px-2 py-1 bg-gray-50 rounded border border-gray-100 text-[10px] font-bold text-gray-600 uppercase">
                                                                    {amenity}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Room Images */}
                                                <div>
                                                    <h5 className="text-[10px] font-bold uppercase text-gray-500 mb-3 block">{room.inventoryType === 'tent' || room.propertyType === 'tent' ? 'Tent Photos' : 'Room Photos'}</h5>
                                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                        {room.images && room.images.map((img, idx) => (
                                                            <div key={idx} className="aspect-video bg-gray-200 rounded-lg overflow-hidden border border-gray-200 group relative">
                                                                <img
                                                                    src={img.url || img}
                                                                    alt={`${room.name} ${idx}`}
                                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                                />
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        );
                    })
                ) : (
                    <div className="py-10 text-center text-gray-400 font-bold uppercase text-xs">No room data available</div>
                )}
            </div>
        </div>
    );
};

const EnquiriesTab = ({ enquiries }) => {
    const [searchTerm, setSearchTerm] = useState('');

    const list = Array.isArray(enquiries) ? enquiries : [];

    const filtered = list.filter(e => {
        if (!e) return false;
        const term = searchTerm.toLowerCase();
        const enqId = e.enquiryId || e._id || '';
        const name = e.userId?.name || e.userName || e.name || '';
        const phone = e.userId?.phone || e.userPhone || e.phone || '';
        const email = e.userId?.email || e.userEmail || e.email || '';
        const type = e.enquiryType || e.type || '';
        const msg = e.message || e.notes || '';

        return enqId.toLowerCase().includes(term) ||
               name.toLowerCase().includes(term) ||
               phone.toLowerCase().includes(term) ||
               email.toLowerCase().includes(term) ||
               type.toLowerCase().includes(term) ||
               msg.toLowerCase().includes(term);
    });

    return (
        <div className="space-y-4">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="relative w-full md:w-80">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search Enquiries..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-[10px] font-bold uppercase outline-none focus:ring-1 focus:ring-black"
                    />
                </div>
                <div className="flex items-center gap-4">
                    <div className="text-[10px] font-bold uppercase text-gray-500">
                        Total Enquiries: <span className="font-bold text-gray-900">{filtered.length}</span>
                    </div>
                </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 border-b border-gray-100 uppercase text-[10px] font-bold tracking-wider text-gray-500">
                        <tr>
                            <th className="p-4 font-bold text-gray-600">Enquiry ID</th>
                            <th className="p-4 font-bold text-gray-600">User / Buyer</th>
                            <th className="p-4 font-bold text-gray-600">Contact Details</th>
                            <th className="p-4 font-bold text-gray-600">Type / Message</th>
                            <th className="p-4 font-bold text-gray-600">Status</th>
                            <th className="p-4 font-bold text-gray-600">Date Received</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-xs font-bold uppercase">
                        {filtered.length > 0 ? (
                            filtered.map((enq, i) => {
                                const buyerName = enq.userId?.name || enq.userName || enq.name || 'Anonymous User';
                                const buyerPhone = enq.userId?.phone || enq.userPhone || enq.phone || 'N/A';
                                const buyerEmail = enq.userId?.email || enq.userEmail || enq.email || '';
                                const messageText = enq.message || enq.notes || '';
                                const displayId = enq.enquiryId ? `#${enq.enquiryId}` : (enq._id ? `#${enq._id.slice(-6)}` : `#${i+1}`);

                                return (
                                    <tr key={i} className="hover:bg-gray-50 transition-colors">
                                        <td className="p-4 font-mono font-bold text-gray-800">{displayId}</td>
                                        <td className="p-4">
                                            <div className="font-bold text-gray-900">{buyerName}</div>
                                        </td>
                                        <td className="p-4 text-gray-600 normal-case font-medium">
                                            <div className="font-bold text-gray-900">{buyerPhone}</div>
                                            {buyerEmail && <div className="text-[10px] text-gray-400">{buyerEmail}</div>}
                                        </td>
                                        <td className="p-4 font-semibold text-gray-600">
                                            <span className="capitalize text-indigo-600 font-bold block mb-0.5">
                                                {(enq.enquiryType || enq.type || 'General Lead')?.replace('_', ' ')}
                                            </span>
                                            {messageText && (
                                                <p className="text-[11px] text-gray-500 font-normal normal-case italic line-clamp-2 max-w-xs">
                                                    "{messageText}"
                                                </p>
                                            )}
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase border ${
                                                enq.status === 'new' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                enq.status === 'contacted' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                                enq.status === 'scheduled' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                                                enq.status === 'closed' ? 'bg-green-50 text-green-700 border-green-200' :
                                                'bg-gray-50 text-gray-600 border-gray-200'
                                            }`}>
                                                {enq.status || 'NEW'}
                                            </span>
                                        </td>
                                        <td className="p-4 text-gray-500 font-medium normal-case">
                                            {enq.createdAt ? (
                                                <>
                                                    {new Date(enq.createdAt).toLocaleDateString()} {new Date(enq.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </>
                                            ) : 'Recent'}
                                        </td>
                                    </tr>
                                );
                            })
                        ) : (
                            <tr>
                                <td colSpan="6" className="p-8 text-center text-gray-400 font-bold uppercase text-xs">No enquiries found for this property</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// --- Main Page Component ---

const AdminHotelDetail = () => {
    const location = useLocation();
    const basePath = location.pathname.startsWith('/manager') ? '/manager' : '/admin';
    const { id } = useParams();
    const [hotel, setHotel] = useState(null);
    const [enquiries, setEnquiries] = useState([]);
    const [documents, setDocuments] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');
    const [modalConfig, setModalConfig] = useState({ isOpen: false, title: '', message: '', type: 'danger', onConfirm: () => { } });
    const [verifying, setVerifying] = useState(false);

    const isProject = location.pathname.includes('/projects/');

    const fetchHotelDetails = useCallback(async () => {
        try {
            setLoading(true);
            let data;
            if (isProject) {
                try {
                    data = await adminService.getProjectDetails(id);
                } catch (err) {
                    // Fallback if listed in Property collection
                    data = await adminService.getHotelDetails(id);
                }
            } else {
                data = await adminService.getHotelDetails(id);
            }

            if (data && data.success) {
                setHotel(data.project || data.hotel);
                setDocuments(data.documents || null);
                
                // Fetch enquiries for this property/project
                const enqData = await adminService.getEnquiries({ propertyId: id });
                if (enqData.success) {
                    setEnquiries(enqData.enquiries || []);
                }
            }
        } catch (error) {
            console.error('Error fetching details:', error);
            toast.error(isProject ? 'Failed to load project information' : 'Failed to load property information');
        } finally {
            setLoading(false);
        }
    }, [id, isProject]);

    useEffect(() => {
        fetchHotelDetails();
    }, [fetchHotelDetails]);

    const handleVerifyDocuments = (action, remark) => {
        if (!hotel) return;

        const isApprove = action === 'approve';

        setModalConfig({
            isOpen: true,
            title: isApprove ? 'Approve Property Documents?' : 'Reject Property Documents?',
            message: isApprove
                ? 'This will mark all submitted documents as verified and move the property to approved status.'
                : 'This will reject the submitted documents and keep the property hidden from users.',
            type: isApprove ? 'success' : 'danger',
            confirmText: isApprove ? 'Approve' : 'Reject',
            onConfirm: async () => {
                try {
                    setVerifying(true);
                    const res = await adminService.verifyPropertyDocuments(hotel._id, action, remark);
                    if (res.success) {
                        toast.success(isApprove ? 'Documents approved successfully' : 'Documents rejected successfully');
                        setHotel(res.property);
                        setDocuments(res.documents);
                    }
                } catch {
                    toast.error('Failed to update document verification');
                } finally {
                    setVerifying(false);
                }
            }
        });
    };

    const handleStatusToggle = async () => {
        const isSuspended = hotel.status === 'suspended';
        const newStatus = isSuspended ? 'approved' : 'suspended';
        setModalConfig({
            isOpen: true,
            title: isSuspended ? 'Activate Property?' : 'Suspend Property?',
            message: isSuspended
                ? `Property "${hotel.propertyName}" will be visible on the platform again.`
                : `Suspending "${hotel.propertyName}" will hide it from the platform.`,
            type: isSuspended ? 'success' : 'danger',
            confirmText: isSuspended ? 'Activate' : 'Suspend',
            onConfirm: async () => {
                try {
                    const res = await adminService.updateHotelStatus(hotel._id, newStatus);
                    if (res.success) {
                        toast.success(`Property ${isSuspended ? 'activated' : 'suspended'} successfully`);
                        fetchHotelDetails();
                    }
                } catch {
                    toast.error('Failed to update property status');
                }
            }
        });
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
            <Loader2 className="animate-spin text-gray-400" size={48} />
            <p className="text-gray-500 font-bold uppercase text-xs tracking-widest">Loading property details...</p>
        </div>
    );

    if (!hotel) return (
        <div className="text-center py-20">
            <AlertCircle size={48} className="mx-auto text-red-400 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900">Property Not Found</h2>
            <Link to={`${basePath}/properties`} className="mt-6 inline-block text-black font-bold uppercase text-xs border-b-2 border-black pb-1">Back to Properties</Link>
        </div>
    );

    const creator = hotel?.userId || hotel?.partnerId;
    const creatorType = hotel?.userId ? (hotel.userId.role || 'owner') : 'partner';

    const tabs = [
        { id: 'overview', label: 'Overview', icon: Building2 },
        { id: 'gallery', label: 'Full Gallery', icon: ImageIcon },
        { id: 'documents', label: 'KYC Documents', icon: ShieldCheck },
        { id: 'enquiries', label: 'Enquiries', icon: MessageSquare }
    ];

    return (
        <div className="space-y-6 max-w-6xl mx-auto pb-10">
            <ConfirmationModal
                isOpen={modalConfig.isOpen}
                onClose={() => setModalConfig({ ...modalConfig, isOpen: false })}
                {...modalConfig}
            />

            <div className="flex items-center gap-2 text-[10px] font-bold uppercase text-gray-500 mb-2">
                <Link to={isProject ? `${basePath}/projects` : `${basePath}/properties`} className="hover:text-black transition-colors">{isProject ? 'Projects' : 'Properties'}</Link>
                <span>/</span>
                <span className="text-black font-bold">{hotel.propertyName}</span>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="flex items-center gap-5">
                    <div className="w-20 h-20 rounded-xl bg-gray-100 shadow-inner flex items-center justify-center shrink-0 overflow-hidden border border-gray-200">
                        {hotel.coverImage || (hotel.propertyImages && hotel.propertyImages[0]) ? (
                            <img src={hotel.coverImage || (hotel.propertyImages && hotel.propertyImages[0].url) || (hotel.propertyImages && hotel.propertyImages[0])} alt="Hotel" className="w-full h-full object-cover" />
                        ) : (
                            <Building2 size={32} className="text-gray-300" />
                        )}
                    </div>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold text-gray-900 uppercase tracking-tight">{hotel.propertyName}</h1>
                            {hotel.status === 'suspended' ? (
                                <span className="px-2.5 py-0.5 bg-red-100 text-red-700 border border-red-200 text-[10px] font-bold rounded-full flex items-center uppercase">
                                    <Ban size={10} className="mr-1" /> SUSPENDED
                                </span>
                            ) : (
                                <span className={`px-2.5 py-0.5 border text-[10px] font-bold rounded-full flex items-center uppercase ${hotel.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                    {hotel.status === 'approved' ? <CheckCircle size={10} className="mr-1" /> : <Clock size={10} className="mr-1" />}
                                    {hotel.status}
                                </span>
                            )}
                        </div>
                        <p className="text-gray-500 text-[10px] font-bold uppercase mt-1 flex items-center">
                            <MapPin size={12} className="mr-1 text-gray-400" /> {hotel.address?.city}, {hotel.address?.state}
                            <span className="mx-2 text-gray-300">|</span>
                            {isProject ? (hotel.isAddedByAdmin ? 'Added By: System Admin' : `Builder: ${hotel.userId?.name || 'Unknown Builder'}`) : `Owner/Broker: ${hotel.userId?.name || hotel.partnerId?.name || 'N/A'}`}
                        </p>
                    </div>
                </div>

                <div className="flex gap-3 w-full md:w-auto">
                    <button
                        onClick={handleStatusToggle}
                        className={`flex-1 md:flex-none px-4 py-2 border rounded-lg text-[10px] font-bold uppercase transition-colors ${hotel.status === 'suspended'
                            ? 'bg-green-600 text-white border-green-600 hover:bg-green-700'
                            : 'bg-white text-red-600 border-red-200 hover:bg-red-50'
                            }`}
                    >
                        {hotel.status === 'suspended' ? 'Activate' : 'Suspend'}
                    </button>

                </div>
            </div>

            <div className="flex border-b border-gray-200 overflow-x-auto no-scrollbar">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-6 py-4 text-[10px] font-bold uppercase transition-colors relative whitespace-nowrap ${activeTab === tab.id ? 'text-black' : 'text-gray-400 hover:text-gray-600'
                            }`}
                    >
                        <tab.icon size={16} />
                        {tab.label}
                        {activeTab === tab.id && (
                            <motion.div
                                layoutId="activeTabBadge"
                                className="absolute bottom-0 left-0 right-0 h-0.5 bg-black"
                            />
                        )}
                    </button>
                ))}
            </div>

            <AnimatePresence mode="wait">
                <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                >
                    {activeTab === 'overview' && <OverviewTab hotel={hotel} isProject={isProject} />}
                    {activeTab === 'gallery' && <GalleryTab hotel={hotel} isProject={isProject} />}
                    {activeTab === 'documents' && (
                        <DocumentsTab
                            hotel={hotel}
                            documents={documents}
                            onVerify={handleVerifyDocuments}
                            verifying={verifying}
                        />
                    )}
                    {activeTab === 'enquiries' && <EnquiriesTab enquiries={enquiries} />}
                </motion.div>
            </AnimatePresence>
        </div>
    );
};

export default AdminHotelDetail;
