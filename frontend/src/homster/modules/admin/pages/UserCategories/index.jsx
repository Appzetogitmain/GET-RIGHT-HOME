import React, { useEffect, useState } from "react";
import { Routes, Route, Navigate, NavLink } from "react-router-dom";
import { motion } from "framer-motion";
import { FiHome, FiGrid, FiLayers, FiPackage, FiAward } from "react-icons/fi";
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
const CATALOG_TABS = [
  { label: "Home", path: `${CATALOG_BASE}/home`, icon: FiHome },
  { label: "Categories", path: `${CATALOG_BASE}/categories`, icon: FiGrid },
  { label: "Sub-Categories", path: `${CATALOG_BASE}/sub-categories`, icon: FiLayers },
  { label: "Services", path: `${CATALOG_BASE}/sections`, icon: FiPackage },
  { label: "Membership", path: `${CATALOG_BASE}/membership`, icon: FiAward },
];

const UserCategories = () => {
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
        {CATALOG_TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <NavLink
              key={tab.path}
              to={tab.path}
              className={({ isActive }) =>
                `flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors ${
                  isActive
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

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
        <Routes>
          <Route index element={<Navigate to="home" replace />} />
          <Route path="home" element={<HomePage catalog={catalog} setCatalog={setCatalog} selectedCity={selectedCity} />} />
          <Route path="categories" element={<CategoriesPage catalog={catalog} setCatalog={setCatalog} selectedCity={selectedCity} />} />
          <Route path="direct-categories" element={<CategoriesPage catalog={catalog} setCatalog={setCatalog} selectedCity={selectedCity} isDirectFlow={true} />} />
          <Route path="sub-categories" element={<SubCategoriesPage catalog={catalog} setCatalog={setCatalog} selectedCity={selectedCity} />} />
          <Route path="sections" element={<ServicesPage catalog={catalog} setCatalog={setCatalog} selectedCity={selectedCity} />} />
          <Route path="membership" element={<MembershipPage selectedCity={selectedCity} />} />
          <Route path="*" element={<Navigate to="home" replace />} />
        </Routes>
      </motion.div>
    </div>
  );
};

export default UserCategories;



