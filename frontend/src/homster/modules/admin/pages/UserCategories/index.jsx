import React, { useEffect, useState } from "react";
import { Routes, Route, Navigate, NavLink, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { FiHome, FiGrid, FiLayers, FiPackage, FiAward, FiZap, FiCalendar } from "react-icons/fi";
import { ensureIds, loadCatalog } from "./utils";
import HomePage from "./pages/HomePage";
import CategoriesPage from "./pages/CategoriesPage";
import ServicesPage from "./pages/ServicesPage";
import SubCategoriesPage from "./pages/SubCategoriesPage";
import MembershipPage from "./pages/MembershipPage";

import { cityService } from "../../services/cityService";

// There was previously no way to reach Categories / Sub-Categories / Services /
// Membership except by typing the URL directly — this tab bar is the only nav
// into those routes, so every destination that page can reach must be listed here.
// Paths are absolute (leading "/"): a relative `to` here resolves against the
// CURRENT url, which is already nested under this same base — on this page
// that turns every click into "append another segment" instead of "go to
// this tab", stacking .../home/home/home/... the way NavLink normally
// replaces the path outright.
const CATALOG_BASE = "/admin/home-service/user-categories";
// Instant and Normal are separate sections. Whatever is added in one only shows to
// customers in that section; changing a category's type moves it to the other one.
const CATALOG_TABS = [
  { label: "Home", path: `${CATALOG_BASE}/home`, icon: FiHome },
  { label: "Instant Services", path: `${CATALOG_BASE}/instant/categories`, match: `${CATALOG_BASE}/instant`, icon: FiZap },
  { label: "Normal Services", path: `${CATALOG_BASE}/normal/categories`, match: `${CATALOG_BASE}/normal`, icon: FiCalendar },
  { label: "Membership", path: `${CATALOG_BASE}/membership`, icon: FiAward },
];

const SECTION_TABS = (section) => [
  { label: "Categories", path: `${CATALOG_BASE}/${section}/categories`, icon: FiGrid },
  { label: "Sub-Categories", path: `${CATALOG_BASE}/${section}/sub-categories`, icon: FiLayers },
  { label: "Services", path: `${CATALOG_BASE}/${section}/services`, icon: FiPackage },
];

const UserCategories = () => {
  const location = useLocation();
  const section = location.pathname.includes(`${CATALOG_BASE}/instant`) ? 'instant' : (location.pathname.includes(`${CATALOG_BASE}/normal`) ? 'normal' : null);
  const [catalog, setCatalog] = useState(() => ensureIds(loadCatalog()));
  const [cities, setCities] = useState([]);
  const [selectedCity, setSelectedCity] = useState('');

  useEffect(() => {
    const handler = () => setCatalog(ensureIds(loadCatalog()));
    window.addEventListener("adminUserAppCatalogUpdated", handler);
    return () => window.removeEventListener("adminUserAppCatalogUpdated", handler);
  }, []);

  // Fetch cities once for the parent container
  useEffect(() => {
    const fetchCities = async () => {
      try {
        const response = await cityService.getAll();
        if (response.success) {
          const loadedCities = (response.cities || []).filter(city => city.isActive);
          setCities(loadedCities);

          // Auto-select default or first city if none selected
          if (!selectedCity && loadedCities.length > 0) {
            const defaultCity = loadedCities.find(c => c.isDefault);
            // Handle potentially different ID formats
            const cityId = defaultCity
              ? (defaultCity._id || defaultCity.id)
              : (loadedCities[0]._id || loadedCities[0].id);

            if (cityId) {
              setSelectedCity(cityId);
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch cities:', error);
      }
    };
    fetchCities();
  }, []);

  // Get admin role to control UI visibility
  const isAdminSuper = (() => {
    try {
      const storedData = sessionStorage.getItem('adminData') || localStorage.getItem('adminData');
      const stored = JSON.parse(storedData || '{}');
      return (stored.role || 'admin') === 'superadmin' || (stored.role || 'admin') === 'super_admin';
    } catch (e) {
      return false;
    }
  })();

  return (
    <div className="space-y-4">
      {/* Global City Filter Header - Visible only to Super Admin */}
      {isAdminSuper && (
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-4 rounded-xl shadow-lg flex items-center justify-between text-white border border-slate-700">
          <div>
            <h2 className="text-lg font-bold text-white">Parameters</h2>
            <p className="text-sm text-slate-300">Filter all catalog content by city</p>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-slate-200">Selected City:</label>
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="px-4 py-2 bg-slate-700 text-white border border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 min-w-[200px]"
            >
              {cities.map(city => {
                const cityId = city._id || city.id;
                return <option key={cityId} value={cityId}>{city.name}</option>
              })}
            </select>
          </div>
        </div>
      )}

      {/* Tab Navigation — the only way into Categories/Sub-Categories/Services/Membership */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-1.5 flex items-center gap-1 overflow-x-auto">
        {/* Inside Instant, the Normal tab is hidden (and the other way round). */}
        {CATALOG_TABS.filter((tab) => !(section === 'instant' && tab.match?.endsWith('/normal')) && !(section === 'normal' && tab.match?.endsWith('/instant'))).map((tab) => {
          const Icon = tab.icon;
          return (
            <NavLink
              key={tab.path}
              to={tab.path}
              className={({ isActive }) =>
                `flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors ${
                  (tab.match ? location.pathname.startsWith(tab.match) : isActive)
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`
              }
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </NavLink>
          );
        })}
      </div>

      {section && (
        <div className="flex items-center gap-2 px-1">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${section === 'instant' ? 'bg-orange-100 text-orange-700' : 'bg-indigo-100 text-indigo-700'}`}>
            {section === 'instant' ? <FiZap className="w-3.5 h-3.5" /> : <FiCalendar className="w-3.5 h-3.5" />}
            {section === 'instant' ? 'Instant catalog' : 'Normal catalog'}
          </span>
          <p className="text-xs text-gray-500">
            {section === 'instant'
              ? 'Everything here is shown to customers under Instant services.'
              : 'Everything here is shown to customers under normal (scheduled) services.'}
          </p>
        </div>
      )}
      {section && (
        <div className="flex items-center gap-1 border-b border-gray-200">
          {SECTION_TABS(section).map((tab) => {
            const Icon = tab.icon;
            return (
              <NavLink
                key={tab.path}
                to={tab.path}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${isActive ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-gray-500 hover:text-gray-800'}`
                }
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </NavLink>
            );
          })}
        </div>
      )}

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
        <Routes>
          <Route index element={<Navigate to="home" replace />} />
          <Route path="home" element={<HomePage catalog={catalog} setCatalog={setCatalog} selectedCity={selectedCity} />} />
          <Route path="categories" element={<CategoriesPage catalog={catalog} setCatalog={setCatalog} selectedCity={selectedCity} />} />
          <Route path="direct-categories" element={<CategoriesPage catalog={catalog} setCatalog={setCatalog} selectedCity={selectedCity} isDirectFlow={true} />} />
          <Route path="sub-categories" element={<SubCategoriesPage catalog={catalog} setCatalog={setCatalog} selectedCity={selectedCity} />} />
          <Route path="sections" element={<ServicesPage catalog={catalog} setCatalog={setCatalog} selectedCity={selectedCity} />} />
          <Route path="instant" element={<Navigate to="categories" replace />} />
          <Route path="instant/categories" element={<CategoriesPage catalog={catalog} setCatalog={setCatalog} selectedCity={selectedCity} catalogMode="instant" />} />
          <Route path="instant/sub-categories" element={<SubCategoriesPage catalog={catalog} setCatalog={setCatalog} selectedCity={selectedCity} catalogMode="instant" />} />
          <Route path="instant/services" element={<ServicesPage catalog={catalog} setCatalog={setCatalog} selectedCity={selectedCity} catalogMode="instant" />} />
          <Route path="normal" element={<Navigate to="categories" replace />} />
          <Route path="normal/categories" element={<CategoriesPage catalog={catalog} setCatalog={setCatalog} selectedCity={selectedCity} catalogMode="slot" />} />
          <Route path="normal/sub-categories" element={<SubCategoriesPage catalog={catalog} setCatalog={setCatalog} selectedCity={selectedCity} catalogMode="slot" />} />
          <Route path="normal/services" element={<ServicesPage catalog={catalog} setCatalog={setCatalog} selectedCity={selectedCity} catalogMode="slot" />} />
          <Route path="membership" element={<MembershipPage selectedCity={selectedCity} />} />
          <Route path="*" element={<Navigate to="home" replace />} />
        </Routes>
      </motion.div>
    </div>
  );
};

export default UserCategories;



