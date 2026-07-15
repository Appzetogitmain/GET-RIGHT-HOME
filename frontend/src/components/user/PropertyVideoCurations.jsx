import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { propertyVideoService } from '../../services/apiService';
import { motion } from 'framer-motion';

const PropertyVideoCurations = ({ pageType }) => {
    const navigate = useNavigate();
    const [videos, setVideos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [playingVideoIdx, setPlayingVideoIdx] = useState(null);
    const [currentIdx, setCurrentIdx] = useState(0);
    const scrollRef = useRef(null);

    useEffect(() => {
        const fetchVideos = async () => {
            try {
                setLoading(true);
                const res = await propertyVideoService.getVideos(pageType);
                if (res.success) {
                    setVideos(res.videos);
                }
            } catch (error) {
                console.error("Failed to fetch property videos", error);
            } finally {
                setLoading(false);
            }
        };
        fetchVideos();
    }, [pageType]);

    // Restore Horizontal Scroll
    React.useLayoutEffect(() => {
        if (!loading && videos.length > 0 && scrollRef.current) {
            const savedScroll = sessionStorage.getItem(`scroll-left-videos-${pageType}`);
            if (savedScroll) {
                scrollRef.current.scrollLeft = parseInt(savedScroll, 10);
            }
        }
    }, [loading, videos, pageType]);

    const getYoutubeId = (url) => {
        if (!url) return null;
        const regExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/)([^#&?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    };

    if (loading || videos.length === 0) {
        return null; // Don't render anything if no videos are assigned to this page
    }

    return (
        <section className="mt-12 px-5 max-w-7xl mx-auto">
            <div className="flex flex-col mb-8">
                <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-2 h-2 bg-blue-500 rounded-full shadow-[0_0_12px_rgba(59,130,246,0.8)]" />
                    <span className="text-[10px] font-black text-blue-600 uppercase tracking-[0.25em]">Featured Showcases</span>
                </div>
                <h2 className="text-2xl font-black text-gray-900 tracking-tight leading-none">
                    Exclusive Property <span className="text-blue-600">Tours</span>
                </h2>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-2">Discover your next dream home</p>
            </div>

            <div
                ref={scrollRef}
                onScroll={(e) => {
                    const scrollLeft = e.target.scrollLeft;
                    const width = e.target.offsetWidth;
                    const index = Math.round(scrollLeft / width);
                    setCurrentIdx(index);
                    sessionStorage.setItem(`scroll-left-videos-${pageType}`, scrollLeft.toString());
                }}
                className="flex overflow-x-auto gap-5 no-scrollbar pb-6 -mx-1 px-1 snap-x snap-mandatory"
            >
                {videos.map((item, idx) => {
                    const youtubeId = getYoutubeId(item.youtubeUrl);
                    const isPlaying = playingVideoIdx === idx;
                    const isShort = item.youtubeUrl && (item.youtubeUrl.includes('shorts/') || item.youtubeUrl.includes('/reel/'));

                    return (
                        <div
                            key={item._id || idx}
                            className="w-[85vw] md:w-[450px] h-[220px] md:h-[280px] flex-shrink-0 snap-center rounded-[2rem] relative overflow-hidden shadow-xl shadow-gray-200/40 bg-black group"
                        >
                            {isPlaying && youtubeId ? (
                                <div className="absolute inset-0 w-full h-full">
                                    <iframe
                                        src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&mute=0&controls=1&rel=0&modestbranding=1`}
                                        title={item.title}
                                        className="w-full h-full border-0"
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                        allowFullScreen
                                    ></iframe>
                                    {/* Pause Overlay Button */}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setPlayingVideoIdx(null);
                                        }}
                                        className="absolute top-4 right-4 z-30 bg-black/60 hover:bg-black/80 text-white rounded-full p-2 backdrop-blur-sm transition-all shadow-md active:scale-95 flex items-center justify-center"
                                        title="Pause/Stop Video"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            ) : (
                                <div
                                    className="absolute inset-0 w-full h-full cursor-pointer"
                                    onClick={() => {
                                        if (youtubeId) {
                                            setPlayingVideoIdx(idx);
                                        } else if (item.propertyId) {
                                            navigate(`/property/${item.propertyId._id || item.propertyId}`);
                                        }
                                    }}
                                >
                                    {youtubeId ? (
                                        <img
                                            src={`https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`}
                                            alt={item.title}
                                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                            onError={(e) => {
                                                e.target.src = `https://img.youtube.com/vi/${youtubeId}/0.jpg`;
                                            }}
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-gray-900 flex items-center justify-center">
                                            <span className="text-white font-bold">{item.title}</span>
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                                        {youtubeId && (
                                            <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center shadow-2xl transition-transform group-hover:scale-110 active:scale-95">
                                                <div className="w-0 h-0 border-t-[10px] border-t-transparent border-l-[18px] border-l-white border-b-[10px] border-b-transparent ml-1" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex flex-col justify-end p-6">
                                        <h4 className="font-black text-white text-lg leading-tight">{item.title}</h4>
                                        {item.propertyId && item.propertyId.title && (
                                            <p className="text-xs text-gray-300 font-medium mt-1">
                                                {item.propertyId.title} • {item.propertyId.location?.address || item.propertyId.city}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {videos.length > 1 && (
                <div className="flex justify-center items-center gap-2 mt-4">
                    {videos.map((_, idx) => (
                        <div
                            key={idx}
                            className={`h-1.5 rounded-full transition-all duration-300 ${
                                currentIdx === idx ? 'w-6 bg-blue-500' : 'w-1.5 bg-gray-200'
                            }`}
                        />
                    ))}
                </div>
            )}
        </section>
    );
};

export default PropertyVideoCurations;
