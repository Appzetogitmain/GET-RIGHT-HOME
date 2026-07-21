import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Star, MapPin, Building2, ChevronRight,
  ChevronDown, CheckCircle2, TrendingUp, Phone, Wrench, Loader2, AlertCircle
} from 'lucide-react';
import apiService from '../../services/apiService';
import { usePropertyNavigate } from '../../hooks/usePropertyNavigate';

const InitialsAvatar = ({ name, size = 'lg' }) => {
  const initials = (name || 'B').slice(0, 2).toUpperCase();
  const cls = size === 'lg' ? 'w-16 h-16 text-lg' : 'w-10 h-10 text-xs';
  return (
    <div
      className={`${cls} rounded-full flex items-center justify-center font-black text-white shadow-inner bg-gradient-to-br from-blue-500 to-indigo-600 shrink-0`}
    >
      {initials}
    </div>
  );
};

const BuilderProfilePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { navigateToProperty } = usePropertyNavigate();

  const [builder, setBuilder] = useState(null);
  const [stats, setStats] = useState(null);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedCity, setSelectedCity] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [cityOpen, setCityOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCity, selectedStatus]);

  useEffect(() => {
    const fetchBuilderData = async () => {
      try {
        setLoading(true);
        const res = await apiService.get(`/public/builders/${id}`);
        if (res.data.success) {
          setBuilder({ name: res.data.builder.name, ...res.data.builder.profile });
          setStats(res.data.builder.stats);
        } else {
          setError('Builder not found');
        }
      } catch (err) {
        setError(err?.response?.data?.message || 'Builder not found or server error');
      } finally {
        setLoading(false);
      }
    };
    fetchBuilderData();
  }, [id]);

  // Fetch builder's properties
  useEffect(() => {
    if (!id) return;
    const fetchProjects = async () => {
      setProjectsLoading(true);
      try {
        const params = new URLSearchParams({ builder: id });
        const res = await apiService.get(`/properties?${params}`);
        setProjects(res.data.data || res.data.properties || []);
      } catch (e) {
        setProjects([]);
      } finally {
        setProjectsLoading(false);
      }
    };
    fetchProjects();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex justify-center items-center">
        <Loader2 size={40} className="animate-spin text-blue-600" />
      </div>
    );
  }

  if (error || !builder) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center gap-4">
        <AlertCircle size={48} className="text-red-400" />
        <h2 className="text-xl font-bold text-gray-800">{error || 'Builder not found'}</h2>
        <button onClick={() => navigate(-1)} className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700">Go Back</button>
      </div>
    );
  }

  const establishedYear = builder.establishedYear || 1969;
  const industryExperience = new Date().getFullYear() - establishedYear;
  const cityList = stats?.cityList || [...new Set(projects.map(p => p.address?.city).filter(Boolean))];
  const allCities = ['All', ...cityList];
  const cityCount = cityList.length || 1;

  const ongoingProjectsCount = stats?.ongoingProjects ?? projects.filter(p => p.builderProjectDetails?.possessionStatus === 'Ongoing').length;
  const readyToMoveProjectsCount = stats?.readyToMoveProjects ?? projects.filter(p => p.builderProjectDetails?.possessionStatus === 'Ready To Move').length;
  const totalProjectsCount = ongoingProjectsCount + readyToMoveProjectsCount || projects.length;

  // ── DYNAMIC CONSTRUCTION QUALITY (RATINGS) ──
  const ratingCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let totalQualityRatedCount = 0;
  let sumQualityRatings = 0;
  const projectsWithReviews = [];

  projects.forEach(p => {
    const qRating = p.builderProjectDetails?.ratings?.constructionQuality || p.avgRating || 0;
    if (qRating > 0) {
      const rounded = Math.round(qRating);
      if (ratingCounts[rounded] !== undefined) {
        ratingCounts[rounded] += 1;
      }
      sumQualityRatings += qRating;
      totalQualityRatedCount += 1;
    }

    const aiSummary = p.builderProjectDetails?.ratings?.aiSummary || p.description || p.shortDescription || '';
    if (aiSummary) {
      projectsWithReviews.push({
        project: p,
        rating: qRating || 4.0,
        summary: aiSummary,
        totalReviewsCount: p.totalReviews || 1
      });
    }
  });

  const avgQualityScore = totalQualityRatedCount > 0 ? (sumQualityRatings / totalQualityRatedCount).toFixed(1) : null;

  const distributionBars = [1, 2, 3, 4, 5].map(star => {
    const count = ratingCounts[star];
    const pct = totalQualityRatedCount > 0 ? Math.round((count / totalQualityRatedCount) * 100) : 0;
    const label = count > 0 ? `${count} project${count > 1 ? 's' : ''}` : 'None';
    return { star, label, pct };
  });

  // ── DYNAMIC PRICE APPRECIATION ──
  const appreciationProjects = [];
  let sumAppreciation = 0;
  let totalAppreciationCount = 0;

  projects.forEach(p => {
    const pricePerSqft = p.builderProjectDetails?.priceHistory?.currentPricePerSqft || 
      (p.buyDetails?.expectedPrice && p.buyDetails?.area?.superBuiltUp 
        ? Math.round(p.buyDetails.expectedPrice / p.buyDetails.area.superBuiltUp) 
        : (p.buyDetails?.expectedPrice && p.buyDetails?.area?.carpet 
            ? Math.round(p.buyDetails.expectedPrice / p.buyDetails.area.carpet) 
            : null));

    const appreciation = p.builderProjectDetails?.priceHistory?.appreciationLast3Years || null;

    if (pricePerSqft || appreciation) {
      if (appreciation) {
        sumAppreciation += appreciation;
        totalAppreciationCount += 1;
      }
      appreciationProjects.push({
        project: p,
        pricePerSqft,
        appreciation
      });
    }
  });

  const avgAppreciationVal = totalAppreciationCount > 0 
    ? Math.round(sumAppreciation / totalAppreciationCount) 
    : (stats?.averageAppreciation || null);

  const filteredProjects = projects.filter(p => {
    const cityMatch = selectedCity === 'All' || p.address?.city === selectedCity;
    const statusMatch = selectedStatus === 'All' || p.builderProjectDetails?.possessionStatus === selectedStatus;
    return cityMatch && statusMatch;
  });

  const totalPages = Math.ceil(filteredProjects.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedProjects = filteredProjects.slice(startIndex, startIndex + itemsPerPage);

  const coverImg = builder.coverImage || 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80';

  return (
    <div className="min-h-screen bg-slate-50/50 pb-28 relative">
      {/* ── Banner Header ── */}
      <div className="relative h-48 md:h-64 bg-slate-100 overflow-hidden">
        <img 
          src={coverImg} 
          alt="Cover" 
          className="w-full h-full object-cover"
        />
        {/* Back Button */}
        <div className="absolute top-4 left-4 z-10">
          <button 
            onClick={() => navigate(-1)} 
            className="w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center text-slate-800 shadow-sm hover:bg-white transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
        </div>

        {/* Floating Logo */}
        <div className="absolute bottom-3 right-4">
          <div className="w-16 h-16 rounded-full border-2 border-white bg-white shadow-md flex items-center justify-center p-1.5 overflow-hidden">
            {builder.brandLogo ? (
              <img src={builder.brandLogo} alt={builder.name} className="w-full h-full rounded-full object-cover" />
            ) : (
              <InitialsAvatar name={builder.name} size="sm" />
            )}
          </div>
        </div>
      </div>

      {/* ── Title & Statistics Block ── */}
      <div className="bg-white px-4 pt-4 pb-4 border-b border-slate-100">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold text-slate-900">{builder.companyName || builder.name}</h1>
            {builder.approvalStatus === 'approved' && (
              <div title="Verified Builder" className="flex items-center justify-center w-5 h-5 bg-gradient-to-r from-amber-400 to-yellow-600 rounded-full shadow-sm">
                <CheckCircle2 size={12} className="text-white fill-amber-100" />
              </div>
            )}
          </div>
          
          <div className="flex gap-12 mt-3">
            <div>
              <p className="text-base font-black text-slate-900">{industryExperience} yrs</p>
              <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Industry Experience</p>
            </div>
            <div>
              <p className="text-base font-black text-slate-900">{totalProjectsCount} projects</p>
              <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Across {cityCount} {cityCount === 1 ? 'city' : 'cities'}</p>
            </div>
          </div>

          {builder.description && (
            <div className="mt-4 text-slate-500 text-xs leading-relaxed font-semibold">
              <p className={isExpanded ? '' : 'line-clamp-2'}>
                {builder.description}
              </p>
              {builder.description.length > 120 && (
                <button 
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="text-blue-600 font-bold text-xs mt-1 hover:underline focus:outline-none"
                >
                  {isExpanded ? 'read less' : 'read more'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Tabs (Split 50/50 Width) ── */}
      <div className="border-b border-slate-200 bg-white sticky top-0 z-20 shadow-sm">
        <div className="grid grid-cols-2 max-w-5xl mx-auto">
          {['overview', 'insights'].map(tab => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-3.5 text-center text-xs md:text-sm font-extrabold border-b-[3px] transition-all capitalize ${
                  isActive 
                    ? 'border-blue-600 text-blue-600 bg-blue-50/5' 
                    : 'border-transparent text-slate-400 hover:text-slate-700'
                }`}
              >
                {tab === 'overview' ? 'Overview' : 'Project Insights'}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Main Tab Content ── */}
      <div className="max-w-5xl mx-auto mt-2">
        {/* ── OVERVIEW TAB ── */}
        {activeTab === 'overview' && (
          <div className="space-y-2">
            {/* Track Record Info Bar */}
            <div className="flex items-center justify-between px-4 py-3.5 bg-white border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-slate-800">Track record in</span>
                <button className="flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-600 rounded-full font-bold text-[10px] border border-blue-100">
                  {cityCount} {cityCount === 1 ? 'city' : 'cities'} <ChevronDown size={10} />
                </button>
              </div>
              <div className="flex items-center gap-1 text-[10px] text-slate-400 font-bold">
                <CheckCircle2 size={12} className="text-emerald-500 fill-emerald-50" />
                <span className="underline">Source</span>
              </div>
            </div>

            {/* All Projects Section */}
            <section className="bg-white p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-sm font-black text-slate-900">All projects</h3>
                  <p className="text-[10px] text-slate-400 font-bold mt-0.5">of {builder.name}</p>
                </div>
                <button 
                  onClick={() => setActiveTab('insights')} 
                  className="text-blue-600 font-bold text-xs flex items-center gap-0.5 hover:underline"
                >
                  View All <ChevronRight size={14} />
                </button>
              </div>

              {/* Summary Card */}
              <div className="border border-slate-100 rounded-2xl bg-white p-4 shadow-sm">
                <div className="flex justify-between items-center py-1">
                  <span className="text-xs font-semibold text-slate-500">Ongoing Projects</span>
                  <span className="text-sm font-black text-slate-900">{ongoingProjectsCount}</span>
                </div>
                <div className="border-t border-slate-100 my-3"></div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-xs font-semibold text-slate-500">Ready to move projects</span>
                  <span className="text-sm font-black text-slate-900">{readyToMoveProjectsCount}</span>
                </div>
              </div>
            </section>

            {/* Horizontal Projects Carousel */}
            <div className="flex gap-4 overflow-x-auto px-4 pb-4 scrollbar-hide snap-x bg-white">
              {projects.map((p, i) => {
                const price = p.buyDetails?.expectedPrice || p.rentDetails?.monthlyRent || p.plotDetails?.expectedPrice;
                const formatPrice = (v) => {
                  if (!v) return 'Price on Request';
                  if (v >= 10000000) return `₹${(v / 10000000).toFixed(2)} Cr`;
                  if (v >= 100000) return `₹${(v / 100000).toFixed(1)} L`;
                  return `₹${v.toLocaleString()}`;
                };
                const bhkText = p.rentDetails?.type || p.buyDetails?.bhk || '2, 3 BHK';
                const possession = p.builderProjectDetails?.possessionStatus === 'Ongoing' 
                  ? `Possession in ${p.builderProjectDetails?.possessionYear || 2027}`
                  : `Ready to move since ${p.builderProjectDetails?.possessionYear || 2023}`;

                return (
                  <div 
                    key={p._id || i}
                    onClick={() => navigateToProperty(p)}
                    className="flex-shrink-0 w-[280px] bg-white border border-slate-100 rounded-2xl p-3 flex gap-3 shadow-sm snap-start cursor-pointer hover:border-blue-100 transition-colors"
                  >
                    <img 
                      src={p.propertyImages?.[0] || p.coverImage || 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=400&q=80'} 
                      alt={p.propertyName}
                      className="w-16 h-16 rounded-xl object-cover bg-slate-50 shrink-0"
                    />
                    <div className="min-w-0 flex-1 flex flex-col justify-between">
                      <div>
                        <h4 className="font-bold text-xs text-slate-900 truncate flex items-center justify-between gap-1">
                          {p.propertyName} <ChevronRight size={12} className="text-slate-400 shrink-0" />
                        </h4>
                        <p className="text-[10px] text-slate-400 truncate mt-0.5">{[p.address?.area, p.address?.city].filter(Boolean).join(', ')}</p>
                      </div>
                      <div className="mt-1">
                        <p className="text-[11px] text-slate-700 font-medium truncate">
                          <span className="font-bold text-blue-600">{formatPrice(price)}</span> | {bhkText}
                        </p>
                        <p className="text-[9px] text-slate-400 font-medium mt-0.5">{possession}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Construction Quality Section */}
            <section className="bg-white p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-black text-slate-900">Construction Quality</h3>
                  {avgQualityScore && (
                    <span className="flex items-center gap-0.5 bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded text-[10px] font-black">
                      ★ {avgQualityScore}
                    </span>
                  )}
                </div>
                <button 
                  onClick={() => { setActiveTab('insights'); setSelectedStatus('Ready To Move'); }}
                  className="text-blue-600 font-bold text-xs flex items-center gap-0.5 hover:underline"
                >
                  View All <ChevronRight size={14} />
                </button>
              </div>

              {/* Quality Distribution Card */}
              <div className="border border-slate-100 rounded-2xl bg-white p-4 shadow-sm mb-4">
                <p className="text-xs font-bold text-slate-800">
                  Residents rated {totalQualityRatedCount} project{totalQualityRatedCount === 1 ? '' : 's'}
                </p>
                <p className="text-[10px] text-slate-400 font-semibold mt-0.5">for construction quality</p>

                {totalQualityRatedCount > 0 ? (
                  <div className="space-y-1.5 mt-3">
                    {distributionBars.map(item => (
                      <div key={item.star} className="flex items-center gap-3">
                        <div className="flex items-center gap-0.5 w-6 shrink-0">
                          <span className="font-bold text-[10px] text-slate-500">{item.star}</span>
                          <Star size={9} className="fill-slate-400 text-slate-400" />
                        </div>
                        <div className="flex-1 h-1.5 bg-slate-50 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full" style={{ width: `${item.pct}%` }} />
                        </div>
                        <span className="w-16 text-left text-[10px] font-bold text-slate-400 shrink-0">{item.label}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[10px] text-slate-400 font-medium mt-3 italic">
                    No construction quality ratings submitted yet.
                  </p>
                )}
              </div>

              {/* Horizontal scroll of reviews */}
              {projectsWithReviews.length > 0 ? (
                <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x">
                  {projectsWithReviews.map((item, i) => {
                    const p = item.project;
                    const price = p.buyDetails?.expectedPrice || p.rentDetails?.monthlyRent || p.plotDetails?.expectedPrice;
                    const formatPrice = (v) => {
                      if (!v) return 'Price on Request';
                      if (v >= 10000000) return `₹${(v / 10000000).toFixed(2)} Cr`;
                      if (v >= 100000) return `₹${(v / 100000).toFixed(1)} L`;
                      return `₹${v.toLocaleString()}`;
                    };
                    const bhkText = p.rentDetails?.type || p.buyDetails?.bhk || '2, 3 BHK';

                    return (
                      <div 
                        key={p._id || i}
                        className="flex-shrink-0 w-[290px] bg-white border border-slate-100 rounded-2xl p-3 flex flex-col gap-3 shadow-sm snap-start"
                      >
                        <div className="flex gap-3">
                          <img 
                            src={p.propertyImages?.[0] || p.coverImage || 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=400&q=80'} 
                            alt={p.propertyName}
                            className="w-14 h-14 rounded-xl object-cover bg-slate-50 shrink-0"
                          />
                          <div className="min-w-0 flex-1">
                            <h4 className="font-bold text-xs text-slate-900 truncate flex items-center justify-between gap-1">
                              {p.propertyName} <ChevronRight size={12} className="text-slate-400 shrink-0" />
                            </h4>
                            <p className="text-[10px] text-slate-400 truncate">{[p.address?.area, p.address?.city].filter(Boolean).join(', ')}</p>
                            <p className="text-[10px] text-slate-600 font-medium truncate mt-1">
                              <span className="font-bold text-blue-600">{formatPrice(price)}</span> | {bhkText}
                            </p>
                          </div>
                        </div>

                        {/* AI Summary Banner */}
                        <div className="bg-slate-50 border border-slate-100/50 rounded-xl p-2.5 flex flex-col gap-1">
                          <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-700">
                            <span className="flex items-center gap-0.5 bg-blue-100/50 text-blue-700 px-1.5 py-0.5 rounded-md">
                              <Wrench size={10} className="mr-0.5" /> {item.rating.toFixed(1)} <Star size={9} className="fill-blue-700 text-blue-700 ml-0.5" />
                            </span>
                            <span className="text-blue-600">AI Summary of {item.totalReviewsCount} review{item.totalReviewsCount === 1 ? '' : 's'}</span>
                          </div>
                          <p className="text-[10px] text-slate-500 leading-relaxed line-clamp-2 mt-0.5">
                            {item.summary}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="border border-dashed border-slate-200 rounded-2xl bg-white p-4 text-center">
                  <p className="text-[10px] text-slate-400 font-medium">No projects with review summaries available.</p>
                </div>
              )}
            </section>

            {/* Price Appreciation Section */}
            <section className="bg-white p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-black text-slate-900">Price appreciation</h3>
                <button 
                  onClick={() => { setActiveTab('insights'); setSelectedStatus('All'); }}
                  className="text-blue-600 font-bold text-xs flex items-center gap-0.5 hover:underline"
                >
                  View All <ChevronRight size={14} />
                </button>
              </div>

              {appreciationProjects.length > 0 ? (
                <>
                  {/* Appreciation Summary Card */}
                  {avgAppreciationVal && (
                    <div className="border border-slate-100 rounded-2xl bg-white p-4 shadow-sm flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
                        <TrendingUp size={20} />
                      </div>
                      <div>
                        <p className="text-base font-black text-emerald-600 flex items-center gap-1">
                          ▲ {avgAppreciationVal}% 
                          <span className="text-[10px] font-bold text-slate-400">+ average appreciation</span>
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400 font-bold">
                          <span>in {totalAppreciationCount} Project{totalAppreciationCount === 1 ? '' : 's'}</span>
                          <span className="border-l border-slate-200 h-3"></span>
                          <span>in Last 3 years</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Horizontal Scroll of appreciation projects */}
                  <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x">
                    {appreciationProjects.map((item, i) => {
                      const p = item.project;
                      const price = p.buyDetails?.expectedPrice || p.rentDetails?.monthlyRent || p.plotDetails?.expectedPrice;
                      const formatPrice = (v) => {
                        if (!v) return 'Price on Request';
                        if (v >= 10000000) return `₹${(v / 10000000).toFixed(2)} Cr`;
                        if (v >= 100000) return `₹${(v / 100000).toFixed(1)} L`;
                        return `₹${v.toLocaleString()}`;
                      };
                      const bhkText = p.rentDetails?.type || p.buyDetails?.bhk || '2, 3 BHK';

                      return (
                        <div 
                          key={p._id || i}
                          className="flex-shrink-0 w-[290px] bg-white border border-slate-100 rounded-2xl p-3 flex flex-col gap-3 shadow-sm snap-start"
                        >
                          <div className="flex gap-3">
                            <img 
                              src={p.propertyImages?.[0] || p.coverImage || 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=400&q=80'} 
                              alt={p.propertyName}
                              className="w-14 h-14 rounded-xl object-cover bg-slate-50 shrink-0"
                            />
                            <div className="min-w-0 flex-1">
                              <h4 className="font-bold text-xs text-slate-900 truncate flex items-center justify-between gap-1">
                                {p.propertyName} <ChevronRight size={12} className="text-slate-400 shrink-0" />
                              </h4>
                              <p className="text-[10px] text-slate-400 truncate">{[p.address?.area, p.address?.city].filter(Boolean).join(', ')}</p>
                              <p className="text-[10px] text-slate-600 font-medium truncate mt-1">
                                <span className="font-bold text-blue-600">{formatPrice(price)}</span> | {bhkText}
                              </p>
                            </div>
                          </div>

                          {/* Pricing appreciation grid */}
                          <div className="grid grid-cols-2 border border-slate-100 rounded-xl divide-x divide-slate-100 bg-slate-50/50">
                            <div className="p-2 text-center">
                              <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">Current Price</p>
                              <p className="text-[10px] font-bold text-slate-700 mt-0.5">
                                {item.pricePerSqft ? `₹ ${item.pricePerSqft.toLocaleString()} /sq.ft` : 'N/A'}
                              </p>
                            </div>
                            <div className="p-2 text-center">
                              <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">Last 3 Years</p>
                              <p className={`text-[10px] font-bold mt-0.5 flex items-center justify-center gap-0.5 ${item.appreciation ? 'text-emerald-600' : 'text-slate-500'}`}>
                                {item.appreciation ? `▲ ${item.appreciation}%` : 'N/A'}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="border border-dashed border-slate-200 rounded-2xl bg-white p-4 text-center">
                  <p className="text-[10px] text-slate-400 font-medium">No price appreciation details available.</p>
                </div>
              )}
            </section>
          </div>
        )}

        {/* ── PROJECT INSIGHTS TAB ── */}
        {activeTab === 'insights' && (
          <div className="space-y-3 px-4">
            {/* Title: All Projects Header */}
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-black text-slate-900">All Projects</h3>
                <CheckCircle2 size={14} className="text-blue-500 fill-blue-50" />
              </div>
              <div className="flex items-center gap-1 text-[10px] text-slate-400 font-bold">
                <CheckCircle2 size={12} className="text-emerald-500 fill-emerald-50" />
                <span className="underline">Source</span>
              </div>
            </div>

            {/* Summary Card */}
            <div className="border border-slate-100 rounded-2xl bg-white p-4 shadow-sm mb-4">
              <div className="flex justify-between items-center py-1">
                <span className="text-xs font-semibold text-slate-500">Ongoing Projects</span>
                <span className="text-sm font-black text-slate-900">{ongoingProjectsCount}</span>
              </div>
              <div className="border-t border-slate-100 my-3"></div>
              <div className="flex justify-between items-center py-1">
                <span className="text-xs font-semibold text-slate-500">Ready to move projects</span>
                <span className="text-sm font-black text-slate-900">{readyToMoveProjectsCount}</span>
              </div>
            </div>

            {/* Filters Bar */}
            <div className="flex flex-wrap gap-2.5 items-center py-2.5 border-t border-b border-slate-100">
              {/* City Pill */}
              <div className="relative">
                <button
                  onClick={() => { setCityOpen(v => !v); setStatusOpen(false); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-full text-[11px] font-bold text-slate-700 hover:border-blue-300 transition-colors shadow-sm"
                >
                  City ({cityCount})
                  <ChevronDown size={10} className={`text-slate-400 transition-transform ${cityOpen ? 'rotate-180' : ''}`} />
                </button>
                {cityOpen && (
                  <div className="absolute top-full mt-1 left-0 z-30 bg-white border border-gray-100 rounded-xl shadow-xl py-1 min-w-[150px]">
                    {allCities.map(c => (
                      <button
                        key={c}
                        onClick={() => { setSelectedCity(c); setCityOpen(false); }}
                        className={`w-full text-left px-4 py-2 text-xs font-bold transition-colors ${selectedCity === c ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-gray-50'}`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Status Pill */}
              <div className="relative">
                <button
                  onClick={() => { setStatusOpen(v => !v); setCityOpen(false); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-full text-[11px] font-bold text-slate-700 hover:border-blue-300 transition-colors shadow-sm"
                >
                  Status: {selectedStatus}
                  <ChevronDown size={10} className={`text-slate-400 transition-transform ${statusOpen ? 'rotate-180' : ''}`} />
                </button>
                {statusOpen && (
                  <div className="absolute top-full mt-1 left-0 z-30 bg-white border border-gray-100 rounded-xl shadow-xl py-1 min-w-[150px]">
                    {['All', 'Ongoing', 'Ready To Move', 'New Launch'].map(s => (
                      <button
                        key={s}
                        onClick={() => { setSelectedStatus(s); setStatusOpen(false); }}
                        className={`w-full text-left px-4 py-2 text-xs font-bold transition-colors ${selectedStatus === s ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-gray-50'}`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Results count text */}
            <p className="text-[10px] text-slate-400 font-bold">
              {filteredProjects.length} results based on selected filters
            </p>

            {/* Vertical Stack list of properties */}
            {projectsLoading ? (
              <div className="flex justify-center py-16">
                <Loader2 size={32} className="animate-spin text-blue-400" />
              </div>
            ) : filteredProjects.length > 0 ? (
              <div className="space-y-3">
                {paginatedProjects.map((p, i) => {
                  const price = p.buyDetails?.expectedPrice || p.rentDetails?.monthlyRent || p.plotDetails?.expectedPrice;
                  const formatPrice = (v) => {
                    if (!v) return 'Price on Request';
                    if (v >= 10000000) return `₹${(v / 10000000).toFixed(2)} Cr`;
                    if (v >= 100000) return `₹${(v / 100000).toFixed(1)} L`;
                    return `₹${v.toLocaleString()}`;
                  };
                  const bhkText = p.rentDetails?.type || p.buyDetails?.bhk || '2, 3 BHK';
                  const possession = p.builderProjectDetails?.possessionStatus === 'Ongoing' 
                    ? `Possession in ${p.builderProjectDetails?.possessionYear || 2027}`
                    : `Ready to move since ${p.builderProjectDetails?.possessionYear || 2023}`;

                  return (
                    <div 
                      key={p._id || i}
                      onClick={() => navigateToProperty(p)}
                      className="bg-white border border-slate-100 rounded-2xl p-3 flex gap-3 shadow-sm cursor-pointer hover:border-blue-100 transition-colors"
                    >
                      <div className="relative shrink-0">
                        <img 
                          src={p.propertyImages?.[0] || p.coverImage || 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=400&q=80'} 
                          alt={p.propertyName}
                          className="w-16 h-16 rounded-xl object-cover bg-slate-50"
                        />
                        <span className="absolute bottom-1 right-1 bg-white/90 backdrop-blur-sm px-1 py-0.5 rounded text-[8px] font-bold text-slate-800 flex items-center gap-0.5 shadow-sm">
                          ★ 4.2
                        </span>
                      </div>
                      <div className="min-w-0 flex-1 flex flex-col justify-between">
                        <div>
                          <h4 className="font-bold text-xs text-slate-900 truncate flex items-center justify-between gap-1">
                            {p.propertyName} <ChevronRight size={12} className="text-slate-400 shrink-0" />
                          </h4>
                          <p className="text-[10px] text-slate-400 truncate mt-0.5">{[p.address?.area, p.address?.city].filter(Boolean).join(', ')}</p>
                        </div>
                        <div className="mt-1">
                          <p className="text-[11px] text-slate-700 font-medium truncate">
                            <span className="font-bold text-blue-600">{formatPrice(price)}</span> | {bhkText}
                          </p>
                          <p className="text-[9px] text-slate-400 font-medium mt-0.5">{possession}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex justify-center items-center gap-1.5 py-4 border-t border-slate-100 mt-6">
                    <button
                      disabled={currentPage === 1}
                      onClick={(e) => { e.stopPropagation(); setCurrentPage(prev => Math.max(prev - 1, 1)); }}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 text-[10px] font-bold text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    >
                      Previous
                    </button>
                    
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                      <button
                        key={page}
                        onClick={(e) => { e.stopPropagation(); setCurrentPage(page); }}
                        className={`w-8 h-8 rounded-xl text-[10px] font-bold flex items-center justify-center transition-all ${
                          currentPage === page
                            ? 'bg-blue-600 text-white shadow-sm shadow-blue-200'
                            : 'border border-slate-200 text-slate-600 bg-white hover:bg-slate-50'
                        }`}
                      >
                        {page}
                      </button>
                    ))}

                    <button
                      disabled={currentPage === totalPages}
                      onClick={(e) => { e.stopPropagation(); setCurrentPage(prev => Math.min(prev + 1, totalPages)); }}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 text-[10px] font-bold text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 shadow-sm">
                <Building2 size={48} className="mx-auto mb-3 text-slate-200" strokeWidth={1.5} />
                <p className="font-extrabold text-slate-700 text-sm">No projects found</p>
                <p className="text-slate-400 text-xs mt-1">Try adjusting the filters above</p>
              </div>
            )}

          </div>
        )}
      </div>

      {/* ── Fixed Footer bar: View Number ── */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-100 px-4 py-3 shadow-lg flex items-center justify-between max-w-5xl mx-auto">
        <p className="text-[10px] md:text-xs font-bold text-slate-800 truncate pr-2">
          Don't miss out on {builder.companyName || builder.name}!
        </p>
        <button 
          onClick={() => alert(`Contacting ${builder.name}...`)}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-5 py-2.5 text-xs font-bold flex items-center gap-1.5 shadow-sm whitespace-nowrap"
        >
          <Phone size={12} /> View Number
        </button>
      </div>
    </div>
  );
};

export default BuilderProfilePage;
