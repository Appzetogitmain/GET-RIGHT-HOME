import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PropertyCard from '../../components/user/PropertyCard';
import GRHPropertyCard from '../../components/user/GRHPropertyCard';
import { userService } from '../../services/apiService';
import { Loader2, ArrowLeft, Heart } from 'lucide-react';
import toast from 'react-hot-toast';

const SavedPlacesPage = () => {
    const navigate = useNavigate();
    const [savedProperties, setSavedProperties] = useState([]);
    const [savedProjects, setSavedProjects] = useState([]);
    const [loading, setLoading] = useState(true);

    // Fetch saved places from backend
    useEffect(() => {
        const fetchSavedPlaces = async () => {
            try {
                setLoading(true);
                const response = await userService.getSavedPlaces();
                
                // Keep backward compatibility if it still returns savedHotels
                const properties = response.savedProperties || response.savedHotels || [];
                const projects = response.savedProjects || [];
                
                setSavedProperties(properties);
                setSavedProjects(projects);
            } catch (error) {
                console.error('Error fetching saved places:', error);
                toast.error('Failed to load saved places');
            } finally {
                setLoading(false);
            }
        };

        fetchSavedPlaces();
    }, []);

    const handleRemoveProperty = (id) => {
        if (!id) return;
        setSavedProperties(prev => prev.filter(p => {
            const pId = p._id || p.id;
            return pId && String(pId) !== String(id);
        }));
    };

    const handleRemoveProject = (id) => {
        if (!id) return;
        setSavedProjects(prev => prev.filter(p => {
            const pId = p._id || p.id;
            return pId && String(pId) !== String(id);
        }));
    };

    const totalSaved = savedProperties.length + savedProjects.length;

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-surface text-white p-6 pb-8 rounded-b-[30px] shadow-lg sticky top-0 z-30">
                <div className="flex items-center gap-4 mb-4">
                    <button onClick={() => navigate(-1)} className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition">
                        <ArrowLeft size={20} />
                    </button>
                    <h1 className="text-xl font-bold">Saved Places</h1>
                </div>
                <h2 className="text-2xl font-black">Your Favorites</h2>
                <p className="text-sm text-white/70">Properties and projects you have loved and saved.</p>
            </div>

            <div className="max-w-7xl mx-auto px-5 pt-8 pb-24">
                {loading ? (
                    <div className="flex justify-center items-center py-20">
                        <Loader2 size={32} className="animate-spin text-surface" />
                    </div>
                ) : totalSaved > 0 ? (
                    <div className="space-y-12">
                        {/* Saved Properties */}
                        {savedProperties.length > 0 && (
                            <div>
                                <h3 className="text-xl font-bold mb-4">Properties</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                    {savedProperties.map((property) => (
                                        <PropertyCard 
                                            key={`prop-${property._id || property.id}`} 
                                            data={property} 
                                            isSaved={true}
                                            initialIsSaved={true} 
                                            onToggleSave={(isSaved) => !isSaved && handleRemoveProperty(property._id || property.id)}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Saved Projects */}
                        {savedProjects.length > 0 && (
                            <div>
                                <h3 className="text-xl font-bold mb-4">Builder Projects</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                    {savedProjects.map((project) => (
                                        <GRHPropertyCard 
                                            key={`proj-${project._id || project.id}`} 
                                            data={project} 
                                            theme="modern"
                                            initialIsSaved={true} 
                                            onToggleSave={(isSaved) => !isSaved && handleRemoveProject(project._id || project.id)}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center pt-20 opacity-50">
                        <Heart size={48} className="text-gray-300 mb-2" />
                        <p className="text-gray-500 font-bold">No saved places yet.</p>
                        <p className="text-xs text-gray-400 mt-1">Start exploring and save your favorites!</p>
                        <button
                            onClick={() => navigate('/')}
                            className="mt-6 bg-surface text-white font-bold py-3 px-8 rounded-xl shadow-lg hover:shadow-xl transition-all"
                        >
                            Explore Properties
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SavedPlacesPage;
