import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { propertyService } from '../../services/apiService';
import PropertyDetailsPage from './PropertyDetailsPage';
import { Loader2, Home, Compass } from 'lucide-react';

const PropertyDetailsDispatcher = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isHandpicked, setIsHandpicked] = useState(false);
  // Keep the response we already fetched so PropertyDetailsPage doesn't have to
  // request the exact same property a second time.
  const [prefetchedDetails, setPrefetchedDetails] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const checkPropertyType = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch property details to determine the correct route
        const response = await propertyService.getDetails(id);
        
        if (!isMounted) return;

        if (response && response.property) {
          const p = response.property;
          
          // Determine if it is a Project (Builder project) or a standard Property
          // A project will either have builderProjectDetails, builderName, or the creator is a builder
          const isProject = p.builderProjectDetails || p.builderName || p.userId?.role === 'builder';
          
          if (isProject) {
            setIsHandpicked(true);
            // Route all Projects to the premium Handpicked/Project Details UI
            navigate(`/project/${p._id}`, { replace: true });
          } else {
            setIsHandpicked(false);
            setPrefetchedDetails({ id, response });

            // Normalize path: if it's a hotel type but accessed via /property, or vice versa,
            // we can optionally redirect to keep URLs clean, or just render.
            // Let's just let it render the PropertyDetailsPage.
            setLoading(false);
          }
        } else {
          throw new Error('Property not found');
        }
      } catch (err) {
        if (isMounted) {
          console.error('Error in PropertyDetailsDispatcher:', err);
          setError(err.message || 'Failed to load property details');
          setLoading(false);
        }
      }
    };

    checkPropertyType();

    return () => {
      isMounted = false;
    };
  }, [id, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50/50 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md bg-white rounded-3xl p-8 shadow-xl border border-slate-100 flex flex-col items-center text-center relative overflow-hidden">
          {/* Decorative background gradient */}
          <div className="absolute -top-24 -left-24 w-48 h-48 bg-teal-400/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl" />

          {/* Logo container with micro-animations */}
          <div className="w-20 h-20 bg-gradient-to-br from-teal-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-teal-500/20 mb-6 animate-pulse">
            <Compass className="w-10 h-10 text-white animate-spin" style={{ animationDuration: '6s' }} />
          </div>

          <h3 className="text-xl font-black text-slate-900 tracking-tight mb-2">
            Securing Property Details
          </h3>
          <p className="text-sm text-slate-400 font-semibold max-w-xs mb-6">
            Please wait while we direct you to the premium Project space.
          </p>

          {/* Premium Skeleton Bars */}
          <div className="w-full space-y-3">
            <div className="h-4 bg-slate-100 rounded-full w-3/4 mx-auto animate-pulse" />
            <div className="h-3 bg-slate-100 rounded-full w-1/2 mx-auto animate-pulse" style={{ animationDelay: '0.2s' }} />
          </div>

          {/* Small modern loading indicator */}
          <div className="mt-8 flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-full border border-slate-100">
            <Loader2 className="w-4 h-4 text-teal-500 animate-spin" />
            <span className="text-xs font-bold text-slate-500">Connecting...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50/50 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md bg-white rounded-3xl p-8 shadow-xl border border-slate-100 flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mb-6">
            <Home className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-black text-slate-900 mb-2">Failed to load property</h3>
          <p className="text-sm text-slate-500 font-medium mb-6">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-bold text-sm transition-colors shadow-lg shadow-slate-900/10"
          >
            Go back Home
          </button>
        </div>
      </div>
    );
  }

  // If it is handpicked, the useEffect will handle redirection.
  // Otherwise, render the standard details page.
  if (isHandpicked) {
    return (
      <div className="min-h-screen bg-slate-50/50 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md bg-white rounded-3xl p-8 shadow-xl border border-slate-100 flex flex-col items-center text-center">
          <Loader2 className="w-8 h-8 text-teal-500 animate-spin mb-4" />
          <p className="text-sm font-bold text-slate-600">Redirecting to Project Collection...</p>
        </div>
      </div>
    );
  }

  return <PropertyDetailsPage prefetchedDetails={prefetchedDetails} />;
};

export default PropertyDetailsDispatcher;
