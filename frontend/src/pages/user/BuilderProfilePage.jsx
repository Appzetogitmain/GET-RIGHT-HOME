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

  const [builderData, setBuilderData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'insights'
  const [selectedSort, setSelectedSort] = useState('Relevance'); // 'Relevance' | 'Rating: High to Low'
  const [selectedCity, setSelectedCity] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All'); // 'All' | 'Ongoing' | 'Ready to move'
  const [sortOpen, setSortOpen] = useState(false);
  const [cityOpen, setCityOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [trackRecordCity, setTrackRecordCity] = useState('All');
  const [trackCityOpen, setTrackCityOpen] = useState(false);
  const [aboutModalOpen, setAboutModalOpen] = useState(false);
  const [showVerifiedSourcesModal, setShowVerifiedSourcesModal] = useState(false);
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // Background Scroll Locking when any modal is open
  useEffect(() => {
    const globalNav = document.getElementById('global-bottom-navbar');
    if (aboutModalOpen || showVerifiedSourcesModal || showPhoneModal) {
      if (window.lenis) window.lenis.stop();
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      if (globalNav) globalNav.style.display = 'none';
    } else {
      if (window.lenis) window.lenis.start();
      document.body.style.overflow = 'unset';
      document.body.style.position = '';
      document.body.style.width = '';
      if (globalNav) globalNav.style.display = '';
    }
    return () => {
      if (window.lenis) window.lenis.start();
      document.body.style.overflow = 'unset';
      document.body.style.position = '';
      document.body.style.width = '';
      if (globalNav) globalNav.style.display = '';
    };
  }, [aboutModalOpen, showVerifiedSourcesModal, showPhoneModal]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedSort, selectedCity, selectedStatus]);

  useEffect(() => {
    const fetchBuilderData = async () => {
      try {
        setLoading(true);
        const res = await apiService.get(`/public/builders/${id}`);
        if (res.data.success) {
          setBuilderData(res.data.builder);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex justify-center items-center">
        <Loader2 size={40} className="animate-spin text-blue-600" />
      </div>
    );
  }

  if (error || !builderData) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center gap-4">
        <AlertCircle size={48} className="text-red-400" />
        <h2 className="text-xl font-bold text-gray-800">{error || 'Builder not found'}</h2>
        <button onClick={() => navigate(-1)} className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700">Go Back</button>
      </div>
    );
  }

  const projects = builderData.projects || [];
  const stats = builderData.stats || {};
  const cityList = stats.cityList || [];
  const allCities = ['All', ...cityList];
  const cityCount = stats.totalCities || cityList.length || 1;

  const ongoingProjectsCount = stats.ongoingProjects || 0;
  const readyToMoveProjectsCount = stats.readyToMoveProjects || 0;
  const totalProjectsCount = stats.totalProjects || projects.length;

  const industryExperience = builderData.experienceYears || 8;

  // Overview Tab: Filter projects by track record city
  const overviewProjects = projects.filter(p => {
    if (trackRecordCity === 'All') return true;
    return (p.city || '').toLowerCase() === trackRecordCity.toLowerCase();
  });

  // Project Insights Tab: Filter & Sort projects
  const insightsFilteredProjects = projects.filter(p => {
    const cityMatch = selectedCity === 'All' || (p.city || '').toLowerCase() === selectedCity.toLowerCase();
    const statusMatch = selectedStatus === 'All' || (p.status || '').toLowerCase() === selectedStatus.toLowerCase();
    return cityMatch && statusMatch;
  }).sort((a, b) => {
    if (selectedSort === 'Rating: High to Low') {
      return (b.constructionQualityRating || 0) - (a.constructionQualityRating || 0);
    }
    return 0;
  });

  const totalPages = Math.ceil(insightsFilteredProjects.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedProjects = insightsFilteredProjects.slice(startIndex, startIndex + itemsPerPage);

  const coverImg = builderData.coverImage || 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80';

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
            {builderData.logo ? (
              <img src={builderData.logo} alt={builderData.name} className="w-full h-full object-contain" />
            ) : (
              <InitialsAvatar name={builderData.name} size="sm" />
            )}
          </div>
        </div>
      </div>

      {/* ── Title & Statistics Block ── */}
      <div className="bg-white px-4 pt-4 pb-4 border-b border-slate-100">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold text-slate-900">{builderData.companyName || builderData.name}</h1>
            {builderData.kycStatus === 'verified' && (
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

          {builderData.description && (
            <div className="mt-4 text-slate-500 text-xs leading-relaxed font-semibold">
              <p className="line-clamp-2">
                {builderData.description}
              </p>
              <button 
                onClick={() => setAboutModalOpen(true)}
                className="text-blue-600 font-bold text-xs mt-1 hover:underline focus:outline-none"
              >
                read more
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── ABOUT BUILDER MODAL ── */}
      {aboutModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="bg-white w-full max-w-lg rounded-t-3xl md:rounded-3xl p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-black text-slate-900">About Builder</h3>
              <button onClick={() => setAboutModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              {builderData.description}
            </p>
            <div className="bg-slate-50 rounded-2xl p-4 space-y-2 border border-slate-100">
              <p className="text-xs font-black text-slate-800">Developer Summary</p>
              <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 font-medium">
                <div>Total Projects: <span className="font-bold text-slate-900">{totalProjectsCount}</span></div>
                <div>Ready To Move: <span className="font-bold text-slate-900">{readyToMoveProjectsCount}</span></div>
                <div>Ongoing Projects: <span className="font-bold text-slate-900">{ongoingProjectsCount}</span></div>
                <div>Cities: <span className="font-bold text-slate-900">{cityCount}</span></div>
              </div>
            </div>
            <button 
              onClick={() => setAboutModalOpen(false)}
              className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold text-xs hover:bg-blue-700 transition-colors shadow-sm"
            >
              Close
            </button>
          </div>
        </div>
      )}

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
            <div className="flex items-center justify-between px-4 py-3.5 bg-white border-b border-slate-100 relative">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-slate-800">Track record in</span>
                <div className="relative">
                  <button 
                    onClick={() => setTrackCityOpen(!trackCityOpen)}
                    className="flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-600 rounded-full font-bold text-xs border border-blue-100"
                  >
                    {trackRecordCity === 'All' ? `${cityCount} ${cityCount === 1 ? 'city' : 'cities'}` : trackRecordCity} <ChevronDown size={12} />
                  </button>
                  {trackCityOpen && (
                    <div className="absolute top-full mt-1 left-0 z-30 bg-white border border-gray-100 rounded-xl shadow-xl py-1 min-w-[140px]">
                      {allCities.map(c => (
                        <button
                          key={c}
                          onClick={() => { setTrackRecordCity(c); setTrackCityOpen(false); }}
                          className={`w-full text-left px-4 py-2 text-xs font-bold transition-colors ${trackRecordCity === c ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-gray-50'}`}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <button 
                onClick={() => setShowVerifiedSourcesModal(true)}
                className="flex items-center gap-1 text-[10px] text-slate-400 font-bold hover:text-slate-600 transition-colors"
              >
                <CheckCircle2 size={12} className="text-emerald-500 fill-emerald-50" />
                <span className="underline">Source</span>
              </button>
            </div>

            {/* All Projects Section */}
            <section className="bg-white p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-sm font-black text-slate-900">All projects</h3>
                  <p className="text-[10px] text-slate-400 font-bold mt-0.5">of {builderData.companyName || builderData.name}</p>
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
                <div 
                  onClick={() => { setActiveTab('insights'); setSelectedStatus('Ongoing'); }}
                  className="flex justify-between items-center py-1 cursor-pointer hover:opacity-80"
                >
                  <span className="text-xs font-semibold text-slate-600">Ongoing Projects</span>
                  <span className="text-sm font-black text-slate-900">{ongoingProjectsCount}</span>
                </div>
                <div className="border-t border-slate-100 my-3"></div>
                <div 
                  onClick={() => { setActiveTab('insights'); setSelectedStatus('Ready to move'); }}
                  className="flex justify-between items-center py-1 cursor-pointer hover:opacity-80"
                >
                  <span className="text-xs font-semibold text-slate-600">Ready to move projects</span>
                  <span className="text-sm font-black text-slate-900">{readyToMoveProjectsCount}</span>
                </div>
              </div>
            </section>

            {/* Horizontal Projects Carousel */}
            <div className="flex gap-4 overflow-x-auto px-4 pb-4 scrollbar-hide snap-x bg-white">
              {overviewProjects.map((p, i) => (
                <div 
                  key={p._id || i}
                  onClick={() => navigateToProperty(p)}
                  className="flex-shrink-0 w-[280px] bg-white border border-slate-100 rounded-2xl p-3 flex gap-3 shadow-sm snap-start cursor-pointer hover:border-blue-100 transition-colors"
                >
                  <img 
                    src={p.coverImage} 
                    alt={p.propertyName}
                    className="w-16 h-16 rounded-xl object-cover bg-slate-50 shrink-0"
                  />
                  <div className="min-w-0 flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="font-bold text-xs text-slate-900 truncate flex items-center justify-between gap-1">
                        {p.propertyName} <ChevronRight size={12} className="text-slate-400 shrink-0" />
                      </h4>
                      <p className="text-[10px] text-slate-400 truncate mt-0.5">{[p.area, p.city].filter(Boolean).join(', ')}</p>
                    </div>
                    <div className="mt-1">
                      <p className="text-[11px] text-slate-700 font-medium truncate">
                        <span className="font-bold text-blue-600">{p.priceRangeText}</span> | {p.bhkText}
                      </p>
                      <p className="text-[9px] text-slate-400 font-medium mt-0.5">{p.possessionText}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── PROJECT INSIGHTS TAB ── */}
        {activeTab === 'insights' && (
          <div className="space-y-3 px-4">
            {/* Summary Card */}
            <div className="border border-slate-100 rounded-2xl bg-white p-4 shadow-sm mb-4">
              <div 
                onClick={() => setSelectedStatus('Ongoing')}
                className="flex justify-between items-center py-1 cursor-pointer hover:opacity-80"
              >
                <span className="text-xs font-semibold text-slate-600">Ongoing Projects</span>
                <span className="text-sm font-black text-slate-900">{ongoingProjectsCount}</span>
              </div>
              <div className="border-t border-slate-100 my-3"></div>
              <div 
                onClick={() => setSelectedStatus('Ready to move')}
                className="flex justify-between items-center py-1 cursor-pointer hover:opacity-80"
              >
                <span className="text-xs font-semibold text-slate-600">Ready to move projects</span>
                <span className="text-sm font-black text-slate-900">{readyToMoveProjectsCount}</span>
              </div>
            </div>

            {/* 3 Live Filters Bar */}
            <div className="flex flex-wrap gap-2 items-center py-2 border-t border-b border-slate-100">
              {/* 1. Sort By Filter */}
              <div className="relative">
                <button
                  onClick={() => { setSortOpen(!sortOpen); setCityOpen(false); setStatusOpen(false); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-full text-xs font-bold text-slate-700 hover:border-blue-300 transition-colors shadow-sm"
                >
                  Sort: {selectedSort}
                  <ChevronDown size={12} className={`text-slate-400 transition-transform ${sortOpen ? 'rotate-180' : ''}`} />
                </button>
                {sortOpen && (
                  <div className="absolute top-full mt-1 left-0 z-30 bg-white border border-gray-100 rounded-xl shadow-xl py-1 min-w-[190px]">
                    {['Relevance', 'Rating: High to Low'].map(s => (
                      <button
                        key={s}
                        onClick={() => { setSelectedSort(s); setSortOpen(false); }}
                        className={`w-full text-left px-4 py-2 text-xs font-bold transition-colors ${selectedSort === s ? 'bg-blue-50 text-blue-700' : 'text-slate-700 hover:bg-gray-50'}`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 2. Cities Filter */}
              <div className="relative">
                <button
                  onClick={() => { setCityOpen(!cityOpen); setSortOpen(false); setStatusOpen(false); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-full text-xs font-bold text-slate-700 hover:border-blue-300 transition-colors shadow-sm"
                >
                  City: {selectedCity}
                  <ChevronDown size={12} className={`text-slate-400 transition-transform ${cityOpen ? 'rotate-180' : ''}`} />
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

              {/* 3. Construction Status Filter */}
              <div className="relative">
                <button
                  onClick={() => { setStatusOpen(!statusOpen); setSortOpen(false); setCityOpen(false); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-full text-xs font-bold text-slate-700 hover:border-blue-300 transition-colors shadow-sm"
                >
                  Status: {selectedStatus}
                  <ChevronDown size={12} className={`text-slate-400 transition-transform ${statusOpen ? 'rotate-180' : ''}`} />
                </button>
                {statusOpen && (
                  <div className="absolute top-full mt-1 left-0 z-30 bg-white border border-gray-100 rounded-xl shadow-xl py-1 min-w-[160px]">
                    {['All', 'Ongoing', 'Ready to move'].map(s => (
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
            <p className="text-[11px] text-slate-500 font-bold pt-1">
              {insightsFilteredProjects.length} results based on selected filters
            </p>

            {/* Vertical Stack list of properties */}
            {insightsFilteredProjects.length > 0 ? (
              <div className="space-y-3">
                {paginatedProjects.map((p, i) => (
                  <div 
                    key={p._id || i}
                    onClick={() => navigateToProperty(p)}
                    className="bg-white border border-slate-100 rounded-2xl p-3 flex gap-3 shadow-sm cursor-pointer hover:border-blue-100 transition-colors"
                  >
                    <div className="relative shrink-0">
                      <img 
                        src={p.coverImage} 
                        alt={p.propertyName}
                        className="w-16 h-16 rounded-xl object-cover bg-slate-50"
                      />
                      <span className="absolute bottom-1 right-1 bg-white/90 backdrop-blur-sm px-1 py-0.5 rounded text-[8px] font-bold text-slate-800 flex items-center gap-0.5 shadow-sm">
                        ★ {p.constructionQualityRating}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1 flex flex-col justify-between">
                      <div>
                        <h4 className="font-bold text-xs text-slate-900 truncate flex items-center justify-between gap-1">
                          {p.propertyName} <ChevronRight size={12} className="text-slate-400 shrink-0" />
                        </h4>
                        <p className="text-[10px] text-slate-400 truncate mt-0.5">{[p.area, p.city].filter(Boolean).join(', ')}</p>
                      </div>
                      <div className="mt-1">
                        <p className="text-[11px] text-slate-700 font-medium truncate">
                          <span className="font-bold text-blue-600">{p.priceRangeText}</span> | {p.bhkText}
                        </p>
                        <p className="text-[9px] text-slate-400 font-medium mt-0.5">{p.possessionText}</p>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex justify-center items-center gap-1.5 py-4 border-t border-slate-100 mt-4">
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

      {/* ── VERIFIED SOURCES MODAL (Matching 99acres popup) ── */}
      {showVerifiedSourcesModal && (
        <div className="fixed inset-0 z-[99999] bg-slate-900/60 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="bg-white w-full max-w-lg rounded-t-3xl md:rounded-3xl p-6 shadow-2xl space-y-5 max-h-[85vh] overflow-y-auto relative">
            <button 
              onClick={() => setShowVerifiedSourcesModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1"
            >
              ✕
            </button>

            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <CheckCircle2 size={22} className="text-emerald-500 fill-emerald-100" />
              <h3 className="text-lg font-black text-slate-900">Our Verified Sources</h3>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <h4 className="font-extrabold text-slate-900 text-sm">Delivery information: <span className="text-blue-600">RERA</span></h4>
                <p className="text-slate-500 leading-relaxed mt-1">
                  Delivery timing has been calculated based on the completion date & subsequent changes in the data updated by the Builder on State RERA website.
                </p>
              </div>

              <div className="border-t border-slate-100 pt-3">
                <h4 className="font-extrabold text-slate-900 text-sm">Construction Quality: <span className="text-blue-600">Resident Reviews</span></h4>
                <p className="text-slate-500 leading-relaxed mt-1">
                  Construction ratings & insights have been generated based on the reviews submitted by actual residents on the platform.
                </p>
                <p className="text-[10px] text-slate-400 font-semibold mt-2">
                  <span className="font-bold text-slate-700">Powered by AI:</span> The insights have been generated using AI & may contain errors or inaccuracies. You can refer to our detailed resident reviews for further research.
                </p>
              </div>

              <div className="border-t border-slate-100 pt-3">
                <h4 className="font-extrabold text-slate-900 text-sm">Price Appreciation: <span className="text-blue-600">Get-Right-home Price Intelligence</span></h4>
                <p className="text-slate-500 leading-relaxed mt-1">
                  Price is calculated based on property posted on the Get-Right-home platform during the last 3 months by owners & brokers.
                </p>
              </div>
            </div>

            <button 
              onClick={() => setShowVerifiedSourcesModal(false)}
              className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold text-xs hover:bg-blue-700 transition-colors shadow-sm mt-2"
            >
              Okay, got it
            </button>
          </div>
        </div>
      )}

      {/* ── VIEW NUMBER / PHONE MODAL ── */}
      {showPhoneModal && (
        <div className="fixed inset-0 z-[99999] bg-slate-900/60 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="bg-white w-full max-w-sm rounded-t-3xl md:rounded-3xl p-6 shadow-2xl text-center space-y-4 relative">
            <button 
              onClick={() => setShowPhoneModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1"
            >
              ✕
            </button>
            <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <Phone size={24} />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">{builderData.companyName || builderData.name}</h3>
              <p className="text-xs text-slate-400 font-semibold mt-1">Contact Builder Directly</p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
              <p className="text-lg font-black text-blue-600 tracking-wider">
                {builderData.phone || '+91 8884976767'}
              </p>
            </div>
            <a 
              href={`tel:${builderData.phone || '+918884976767'}`}
              className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold text-xs hover:bg-blue-700 transition-colors shadow-md block text-center"
            >
              Call Now
            </a>
          </div>
        </div>
      )}

      {/* ── Fixed Footer bar: View Number (Hidden when modal is active) ── */}
      {!aboutModalOpen && !showVerifiedSourcesModal && !showPhoneModal && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-100 px-4 py-3 shadow-lg flex items-center justify-between max-w-5xl mx-auto">
          <p className="text-[10px] md:text-xs font-bold text-slate-800 truncate pr-2">
            Don't miss out on {builderData.companyName || builderData.name}!
          </p>
          <button 
            onClick={() => setShowPhoneModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-5 py-2.5 text-xs font-bold flex items-center gap-1.5 shadow-sm whitespace-nowrap"
          >
            <Phone size={12} /> View Number
          </button>
        </div>
      )}
    </div>
  );
};

export default BuilderProfilePage;
