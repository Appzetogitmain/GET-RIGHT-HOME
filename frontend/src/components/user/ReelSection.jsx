import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Loader2 } from 'lucide-react';
import { reelService } from '../../services/reelService';

const ReelItem = ({ reel, navigate }) => {
    const containerRef = useRef(null);
    const videoRef = useRef(null);
    const [isIntersecting, setIsIntersecting] = useState(false);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                setIsIntersecting(entry.isIntersecting);
            },
            { threshold: 0.7 } // Play when 70% of the card is visible
        );

        if (containerRef.current) {
            observer.observe(containerRef.current);
        }

        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        if (videoRef.current) {
            if (isIntersecting) {
                videoRef.current.play().catch(err => console.log("Autoplay blocked", err));
            } else {
                videoRef.current.pause();
                videoRef.current.currentTime = 0;
            }
        }
    }, [isIntersecting]);

    // Detect and parse video links (Instagram / YouTube)
    const getVideoDetails = (url) => {
        if (!url) return { type: 'unknown' };

        // YouTube Shorts / Videos
        const ytMatch = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=|shorts\/)|youtu\.be\/)([^"&?\/\s]{11})/i);
        if (ytMatch) {
            return { type: 'youtube', id: ytMatch[1] };
        }

        // Instagram Reel / Post
        const instaMatch = url.match(/(?:instagram\.com\/(?:p|reel|tv)\/)([^/?#&\s]+)/i);
        if (instaMatch) {
            return { type: 'instagram', id: instaMatch[1] };
        }

        return { type: 'generic', url };
    };

    const videoDetails = getVideoDetails(reel.videoUrl);

    // Get thumbnail URL
    let thumbUrl = reel.thumbnailUrl;
    if (!thumbUrl) {
        if (videoDetails.type === 'youtube') {
            thumbUrl = `https://img.youtube.com/vi/${videoDetails.id}/hqdefault.jpg`;
        } else {
            // Instagram fallback or other fallback: use a nice default property image
            thumbUrl = 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=300&q=80';
        }
    }

    return (
        <div
            onClick={() => navigate(`/reels?reel=${reel._id}`)}
            className="group flex-shrink-0 w-[125px] md:w-[150px] cursor-pointer snap-start"
        >
            {/* Thumbnail/Video Card */}
            <div 
                ref={containerRef}
                className="relative aspect-[9/16] rounded-lg overflow-hidden shadow-sm group-hover:shadow-md transition-shadow bg-neutral-900"
            >
                {/* Auto-playing Video / Iframe */}
                {reel.videoType === 'url' ? (
                    videoDetails.type === 'youtube' ? (
                        isIntersecting ? (
                            <iframe
                                src={`https://www.youtube.com/embed/${videoDetails.id}?autoplay=1&mute=1&loop=1&playlist=${videoDetails.id}&controls=0&modestbranding=1&rel=0&playsinline=1`}
                                className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                                style={{ border: 0, height: '100%', width: '100%' }}
                                title={reel.title || 'YouTube Video'}
                            />
                        ) : null
                    ) : videoDetails.type === 'instagram' ? (
                        isIntersecting ? (
                            <iframe
                                src={`https://www.instagram.com/reel/${videoDetails.id}/embed/`}
                                className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                                style={{ border: 0, height: '100%', width: '100%' }}
                                title={reel.title || 'Instagram Video'}
                            />
                        ) : null
                    ) : (
                        <video
                            ref={videoRef}
                            src={reel.videoUrl}
                            poster={thumbUrl}
                            muted
                            loop
                            playsInline
                            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${isIntersecting ? 'opacity-100' : 'opacity-0'}`}
                        />
                    )
                ) : (
                    <video
                        ref={videoRef}
                        src={reel.videoUrl}
                        poster={thumbUrl}
                        muted
                        loop
                        playsInline
                        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${isIntersecting ? 'opacity-100' : 'opacity-0'}`}
                    />
                )}

                {/* Fallback Static Thumbnail */}
                <img
                    src={thumbUrl}
                    alt={reel.caption || reel.title}
                    className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
                        isIntersecting ? 'opacity-0' : 'opacity-100'
                    }`}
                />

                {/* subtle bottom overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                {/* Play Icon - Only shows when not playing */}
                {!isIntersecting && (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="bg-black/30 backdrop-blur-sm p-2 rounded-full">
                            <Play size={18} className="text-white fill-white" />
                        </div>
                    </div>
                )}
            </div>

            {/* Info Below Card */}
            <div className="mt-2.5 px-0.5">
                <h3 className="text-gray-900 text-[11px] md:text-xs font-bold line-clamp-2 leading-[1.3] group-hover:text-emerald-700 transition-colors">
                    {reel.title || reel.caption || 'Property Tour'}
                </h3>
                <div className="flex items-center justify-between mt-1">
                    <span className="text-[9px] md:text-[10px] text-gray-400 font-medium">
                        {reel.viewsCount || 0} views • #{reel.category?.toLowerCase() || 'general'}
                    </span>
                </div>
            </div>
        </div>
    );
};

const ReelSection = ({ category }) => {
    const navigate = useNavigate();
    const [reels, setReels] = useState([]);
    const [loading, setLoading] = useState(true);
    const scrollRef = useRef(null);

    React.useLayoutEffect(() => {
        if (!loading && reels.length > 0 && scrollRef.current) {
            const savedScroll = sessionStorage.getItem(`scroll-left-reels-${category}`);
            if (savedScroll) {
                scrollRef.current.scrollLeft = parseInt(savedScroll, 10);
            }
        }
    }, [loading, reels, category]);

    const handleScroll = () => {
        if (scrollRef.current) {
            sessionStorage.setItem(`scroll-left-reels-${category}`, scrollRef.current.scrollLeft.toString());
        }
    };

    useEffect(() => {
        const fetchReels = async () => {
            setLoading(true);
            try {
                // Show all reels on the home page regardless of category tab 
                // to ensure maximum visibility of new content as requested.
                const res = await reelService.getFeed({ category: 'All', limit: 20 });
                console.log('REEL_DEBUG: Fetched reels count:', res.reels?.length, res.reels);
                setReels(res.reels || []);
            } catch (err) {
                console.error("Failed to fetch reels for section:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchReels();
    }, []); // Only fetch on mount

    if (loading) {
        return (
            <div className="py-8 flex justify-center items-center">
                <Loader2 className="animate-spin text-surface" size={24} />
            </div>
        );
    }

    if (reels.length === 0) return null;

    return (
        <div className="py-6 border-b border-gray-100 bg-gray-50/30">
            <div className="px-3 md:px-2 mb-4 flex items-start md:items-center justify-between">
                <div className="flex-1 min-w-0 pr-2">
                    <h2 className="text-[17px] md:text-[22px] font-bold text-gray-900 flex items-center gap-2 leading-tight">
                        <span className="bg-red-600 p-1 rounded-lg shrink-0">
                            <Play size={16} className="text-white fill-white" />
                        </span>
                        Reels
                    </h2>
                    <p className="text-[11px] md:text-[13px] text-gray-500 mt-1 truncate">Short video tours and updates</p>
                </div>
                <button
                    onClick={() => navigate('/reels')}
                    className="text-[12px] md:text-[14px] font-bold text-emerald-600 hover:text-emerald-700 shrink-0 whitespace-nowrap mt-1 md:mt-0"
                >
                    View All
                </button>
            </div>

            <div 
                ref={scrollRef}
                onScroll={handleScroll}
                className="flex overflow-x-auto gap-2 pb-2 px-5 no-scrollbar snap-x snap-mandatory"
            >
                {reels.map((reel) => (
                    <ReelItem key={reel._id} reel={reel} navigate={navigate} />
                ))}
                <div className="w-1 shrink-0" />
            </div>
        </div>
    );
};

export default ReelSection;
