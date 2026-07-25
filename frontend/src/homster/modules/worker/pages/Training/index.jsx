import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiPlayCircle, FiVideo, FiLink } from 'react-icons/fi';
import Header from '../../components/layout/Header';
import workerService from '../../../../services/workerService';
import LogoLoader from '../../../../components/common/LogoLoader';
import { workerTheme as themeColors } from '../../../../theme';

const Training = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [videos, setVideos] = useState([]);
  const [selectedVideo, setSelectedVideo] = useState(null);

  useEffect(() => {
    fetchTrainingVideos();
  }, []);

  const fetchTrainingVideos = async () => {
    try {
      const res = await workerService.getDashboardStats();
      if (res.success && res.data) {
        setVideos(res.data.trainingVideos || []);
      }
    } catch (error) {
      console.error('Failed to fetch training videos:', error);
    } finally {
      setLoading(false);
    }
  };

  const getYouTubeId = (url) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|shorts\/)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  if (loading) {
    return <LogoLoader />;
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24">
      <Header title="Training Center" />
      
      <div className="pt-24 px-4">
        {videos.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 text-center shadow-sm border border-gray-100 flex flex-col items-center justify-center min-h-[300px]">
            <div className="w-20 h-20 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-4">
              <FiPlayCircle className="w-10 h-10" />
            </div>
            <h3 className="text-lg font-bold text-[#1E3A8A] mb-2">No Training Videos</h3>
            <p className="text-gray-500 text-sm">Check back later for new training content.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {videos.map((video, idx) => {
              const ytId = getYouTubeId(video.youtubeUrl);
              return (
                <div key={idx} onClick={() => setSelectedVideo(video)} className="bg-white rounded-3xl overflow-hidden shadow-sm border border-gray-100 cursor-pointer active:scale-95 transition-transform duration-200">
                  <div className="aspect-video bg-gray-900 relative overflow-hidden">
                    {/* Play button overlay */}
                    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
                      <div className="w-16 h-16 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg">
                        <FiPlayCircle className="w-8 h-8 text-[#1E3A8A] ml-1" />
                      </div>
                    </div>

                    {ytId ? (
                      <iframe
                        className="absolute inset-0 w-full h-full z-10 pointer-events-none"
                        src={`https://www.youtube.com/embed/${ytId}?autoplay=1&mute=1&loop=1&playlist=${ytId}&controls=0&modestbranding=1`}
                        title={video.title}
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      ></iframe>
                    ) : video.gifUrl ? (
                      video.gifUrl.match(/\.(mp4|webm)$/i) ? (
                        <video 
                          src={video.gifUrl} 
                          className="absolute inset-0 w-full h-full object-cover bg-black z-10 pointer-events-none" 
                          autoPlay
                          loop
                          muted
                          playsInline
                        />
                      ) : (
                        <img src={video.gifUrl} className="absolute inset-0 w-full h-full object-cover z-10" alt={video.title} />
                      )
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-gray-500 flex-col gap-2 z-10">
                        <FiVideo size={32} />
                        <span className="text-sm">Video Unavailable</span>
                      </div>
                    )}
                  </div>
                  <div className="p-5">
                    <h3 className="font-bold text-[#1E3A8A] text-lg leading-tight mb-2">{video.title}</h3>
                    <div className="flex items-center gap-2">
                      <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-[11px] font-bold">
                        {ytId ? 'YouTube Video' : 'Direct Media'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Fullscreen Video Modal */}
      {selectedVideo && (
        <div className="fixed inset-0 z-[100] bg-black flex items-center justify-center animate-[fadeIn_0.3s_ease-out]">
          <button 
            onClick={() => setSelectedVideo(null)}
            className="absolute top-6 right-6 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white z-50 backdrop-blur-md transition-colors"
          >
            <FiArrowLeft className="w-6 h-6" />
          </button>
          
          <div className="w-full max-w-4xl aspect-video bg-black relative">
            {getYouTubeId(selectedVideo.youtubeUrl) ? (
              <iframe
                className="w-full h-full"
                src={`https://www.youtube.com/embed/${getYouTubeId(selectedVideo.youtubeUrl)}?autoplay=1&controls=1&rel=0&playsinline=1`}
                title={selectedVideo.title}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              ></iframe>
            ) : selectedVideo.gifUrl ? (
              selectedVideo.gifUrl.match(/\.(mp4|webm)$/i) ? (
                <video 
                  src={selectedVideo.gifUrl} 
                  className="w-full h-full object-contain" 
                  controls 
                  autoPlay
                  playsInline
                />
              ) : (
                <img src={selectedVideo.gifUrl} className="w-full h-full object-contain" alt={selectedVideo.title} />
              )
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};

export default Training;
