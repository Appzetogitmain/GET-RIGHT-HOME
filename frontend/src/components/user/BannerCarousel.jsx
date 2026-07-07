import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const BannerCarousel = () => {
    const [banners, setBanners] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchBanners = async () => {
            try {
                const response = await axios.get(`${API_URL}/banners`);
                setBanners(response.data);
            } catch (error) {
                console.error('Failed to fetch banners', error);
            } finally {
                setLoading(false);
            }
        };
        fetchBanners();
    }, []);

    useEffect(() => {
        if (banners.length <= 1) return;
        const interval = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % banners.length);
        }, 5000);
        return () => clearInterval(interval);
    }, [banners.length]);

    const nextBanner = () => {
        setCurrentIndex((prev) => (prev + 1) % banners.length);
    };

    const prevBanner = () => {
        setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length);
    };

    if (loading || banners.length === 0) return null;

    return (
        <div className="relative w-full h-[220px] md:h-[300px] overflow-hidden rounded-none group">
            <AnimatePresence mode="wait">
                <motion.div
                    key={currentIndex}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.6, ease: "easeInOut" }}
                    className="absolute inset-0 w-full h-full"
                >
                    <img
                        src={banners[currentIndex].imageUrl}
                        alt={banners[currentIndex].title}
                        className="w-full h-full object-cover"
                    />
                    {/* Optional Overlay Gradient */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent md:bg-gradient-to-r md:from-black/10 md:to-transparent" />
                </motion.div>
            </AnimatePresence>

            {/* Navigation Dots */}
            {banners.length > 1 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
                    {banners.map((_, idx) => (
                        <button
                            key={idx}
                            onClick={() => setCurrentIndex(idx)}
                            className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentIndex ? 'w-6 bg-white' : 'w-1.5 bg-white/40'
                                }`}
                        />
                    ))}
                </div>
            )}

            {/* Arrow Buttons (Desktop Only) */}
            {banners.length > 1 && (
                <div className="hidden group-hover:flex items-center justify-between absolute inset-x-4 top-1/2 -translate-y-1/2 pointer-events-none">
                    <button
                        onClick={prevBanner}
                        className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-white hover:text-black transition-all pointer-events-auto shadow-lg"
                    >
                        <ChevronLeft size={24} />
                    </button>
                    <button
                        onClick={nextBanner}
                        className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-white hover:text-black transition-all pointer-events-auto shadow-lg"
                    >
                        <ChevronRight size={24} />
                    </button>
                </div>
            )}
        </div>
    );
};

export default BannerCarousel;
