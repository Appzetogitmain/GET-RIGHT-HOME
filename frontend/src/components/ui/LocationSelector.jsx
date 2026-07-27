import React, { useState, useEffect, useCallback } from 'react';
import { ChevronDown } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://get-right-home.onrender.com/api';

const fetchJSON = async (url) => {
  const res = await fetch(url);
  const data = await res.json();
  return data.success ? data.data : [];
};

const SelectField = ({ label, value, onChange, options, placeholder, disabled, required, error, isManual, manualValue, onManualChange, onSetManual, hideManual }) => (
  <div>
    <label className="text-xs font-semibold text-gray-500 mb-1 block">
      {label}{required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
    <div className="relative">
      <select
        className={`w-full px-3 py-2.5 bg-gray-50 border rounded-xl text-sm font-medium text-gray-800
          focus:bg-white focus:border-emerald-400 outline-none transition-all appearance-none
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          ${error ? 'border-red-400 bg-red-50' : (value || isManual ? 'border-emerald-200' : 'border-gray-200')}`}
        value={isManual ? 'manual' : value}
        onChange={(e) => {
          if (e.target.value === 'manual') {
            onSetManual(true);
            onChange('');
          } else {
            onSetManual(false);
            onChange(e.target.value);
          }
        }}
        disabled={disabled}
      >
        <option value="">{placeholder}</option>
        {options.map((opt) => (
          <option key={opt._id} value={opt._id}>
            {opt.name}
          </option>
        ))}
        {!hideManual && <option value="manual">+ Add Manual (Other)</option>}
      </select>
      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
    </div>
    {isManual && (
      <input
        type="text"
        placeholder={`Enter ${label} manually...`}
        className={`mt-2 w-full px-3 py-2 border rounded-lg text-sm outline-none focus:border-blue-400 ${error && !manualValue ? 'border-red-400' : 'border-blue-200'}`}
        value={manualValue}
        onChange={(e) => onManualChange(e.target.value)}
      />
    )}
    {error && <p className="text-red-500 text-[10px] mt-1 font-semibold">{error}</p>}
  </div>
);

const LocationSelector = ({ value = {}, onChange, required = false, className = '', errors = {} }) => {
  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [cities, setCities] = useState([]);

  // IDs for API cascading
  const [selectedCountryId, setSelectedCountryId] = useState('');
  const [selectedStateId, setSelectedStateId] = useState('');
  const [selectedDistrictId, setSelectedDistrictId] = useState('');
  const [selectedCityId, setSelectedCityId] = useState('');

  // Manual States
  const [isManualCountry, setIsManualCountry] = useState(false);
  const [isManualState, setIsManualState] = useState(false);
  const [isManualDistrict, setIsManualDistrict] = useState(false);
  const [isManualCity, setIsManualCity] = useState(false);

  const [manualCountry, setManualCountry] = useState('');
  const [manualState, setManualState] = useState('');
  const [manualDistrict, setManualDistrict] = useState('');
  const [manualCity, setManualCity] = useState('');

  // Load countries on mount
  useEffect(() => {
    fetchJSON(`${API_BASE}/locations/countries`).then(setCountries);
  }, []);

  // Cascading fetches
  useEffect(() => {
    if (!selectedCountryId || isManualCountry) { setStates([]); return; }
    fetchJSON(`${API_BASE}/locations/states?countryId=${selectedCountryId}`).then(setStates);
  }, [selectedCountryId, isManualCountry]);

  useEffect(() => {
    if (!selectedStateId || isManualState) { setDistricts([]); return; }
    fetchJSON(`${API_BASE}/locations/districts?stateId=${selectedStateId}`).then(setDistricts);
  }, [selectedStateId, isManualState]);

  useEffect(() => {
    if (!selectedDistrictId || isManualDistrict) { setCities([]); return; }
    fetchJSON(`${API_BASE}/locations/cities?districtId=${selectedDistrictId}`).then(setCities);
  }, [selectedDistrictId, isManualDistrict]);

  // Sync incoming value to state ONCE on mount or when they completely differ
  // To avoid infinite loops and losing manual input, we only set IDs if they match existing API data
  useEffect(() => {
    if (countries.length > 0 && value?.country && !selectedCountryId) {
      const match = countries.find(c => c.name.toLowerCase() === value.country.toLowerCase());
      if (match) {
        setSelectedCountryId(String(match._id));
        setIsManualCountry(false);
      } else {
        setIsManualCountry(true);
        setManualCountry(value.country);
      }
    }
  }, [countries, value?.country]);

  useEffect(() => {
    if (states.length > 0 && value?.state && !selectedStateId) {
      const match = states.find(s => s.name.toLowerCase() === value.state.toLowerCase());
      if (match) {
        setSelectedStateId(String(match._id));
        setIsManualState(false);
      } else {
        setIsManualState(true);
        setManualState(value.state);
      }
    }
  }, [states, value?.state]);

  useEffect(() => {
    if (districts.length > 0 && value?.district && !selectedDistrictId) {
      const match = districts.find(d => d.name.toLowerCase() === value.district.toLowerCase());
      if (match) {
        setSelectedDistrictId(String(match._id));
        setIsManualDistrict(false);
      } else {
        setIsManualDistrict(true);
        setManualDistrict(value.district);
      }
    }
  }, [districts, value?.district]);

  useEffect(() => {
    if (cities.length > 0 && value?.city && !selectedCityId) {
      const match = cities.find(c => c.name.toLowerCase() === value.city.toLowerCase());
      if (match) {
        setSelectedCityId(String(match._id));
        setIsManualCity(false);
      } else {
        setIsManualCity(true);
        setManualCity(value.city);
      }
    }
  }, [cities, value?.city]);

  // Notify parent on any change
  useEffect(() => {
    if (countries.length === 0) return; // Prevent overwriting default props before fetch completes

    const notifyCountry = isManualCountry ? manualCountry : (selectedCountryId ? (countries.find(c => String(c._id) === selectedCountryId)?.name || '') : (value?.country || ''));
    const notifyState = isManualState ? manualState : (selectedStateId ? (states.find(s => String(s._id) === selectedStateId)?.name || '') : (value?.state || ''));
    const notifyDistrict = isManualDistrict ? manualDistrict : (selectedDistrictId ? (districts.find(d => String(d._id) === selectedDistrictId)?.name || '') : (value?.district || ''));
    const notifyCity = isManualCity ? manualCity : (selectedCityId ? (cities.find(c => String(c._id) === selectedCityId)?.name || '') : (value?.city || ''));
    
    // Check if what we have differs from the prop value, if so, trigger onChange
    if (
      value.country !== notifyCountry ||
      value.state !== notifyState ||
      value.district !== notifyDistrict ||
      value.city !== notifyCity
    ) {
      onChange({
        country: notifyCountry,
        state: notifyState,
        district: notifyDistrict,
        city: notifyCity
      });
    }
  }, [
    selectedCountryId, selectedStateId, selectedDistrictId, selectedCityId,
    isManualCountry, isManualState, isManualDistrict, isManualCity,
    manualCountry, manualState, manualDistrict, manualCity,
    countries, states, districts, cities
  ]);

  const handleCountryChange = (id) => {
    setSelectedCountryId(id);
    setSelectedStateId(''); setIsManualState(false); setManualState('');
    setSelectedDistrictId(''); setIsManualDistrict(false); setManualDistrict('');
    setSelectedCityId(''); setIsManualCity(false); setManualCity('');
  };

  const handleStateChange = (id) => {
    setSelectedStateId(id);
    setSelectedDistrictId(''); setIsManualDistrict(false); setManualDistrict('');
    setSelectedCityId(''); setIsManualCity(false); setManualCity('');
  };

  const handleDistrictChange = (id) => {
    setSelectedDistrictId(id);
    setSelectedCityId(''); setIsManualCity(false); setManualCity('');
  };

  const handleCityChange = (id) => {
    setSelectedCityId(id);
  };

  // If a parent level is manual, all subsequent levels MUST be manual because we can't fetch children from backend.
  useEffect(() => {
    if (isManualCountry) {
      setIsManualState(true); setIsManualDistrict(true); setIsManualCity(true);
    }
  }, [isManualCountry]);

  useEffect(() => {
    if (isManualState) {
      setIsManualDistrict(true); setIsManualCity(true);
    }
  }, [isManualState]);

  useEffect(() => {
    if (isManualDistrict) {
      setIsManualCity(true);
    }
  }, [isManualDistrict]);

  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      <SelectField
        label="Country"
        value={selectedCountryId}
        onChange={handleCountryChange}
        options={countries}
        placeholder="Select Country"
        required={required}
        error={errors.country}
        isManual={isManualCountry}
        onSetManual={setIsManualCountry}
        manualValue={manualCountry}
        onManualChange={setManualCountry}
        hideManual={true}
      />

      <SelectField
        label="State"
        value={selectedStateId}
        onChange={handleStateChange}
        options={states}
        placeholder={selectedCountryId || isManualCountry ? 'Select State' : 'Select country first'}
        disabled={!selectedCountryId && !isManualCountry}
        required={required}
        error={errors.state}
        isManual={isManualState}
        onSetManual={setIsManualState}
        manualValue={manualState}
        onManualChange={setManualState}
        hideManual={true}
      />

      <SelectField
        label="District"
        value={selectedDistrictId}
        onChange={handleDistrictChange}
        options={districts}
        placeholder={selectedStateId || isManualState ? 'Select District' : 'Select state first'}
        disabled={!selectedStateId && !isManualState}
        required={required}
        error={errors.district}
        isManual={isManualDistrict}
        onSetManual={setIsManualDistrict}
        manualValue={manualDistrict}
        onManualChange={setManualDistrict}
        hideManual={true}
      />

      <SelectField
        label="City / Area"
        value={selectedCityId}
        onChange={handleCityChange}
        options={cities}
        placeholder={selectedDistrictId || isManualDistrict ? 'Select Area' : 'Select district first'}
        disabled={!selectedDistrictId && !isManualDistrict}
        required={required}
        error={errors.city}
        isManual={isManualCity}
        onSetManual={setIsManualCity}
        manualValue={manualCity}
        onManualChange={setManualCity}
      />
    </div>
  );
};

export default LocationSelector;
