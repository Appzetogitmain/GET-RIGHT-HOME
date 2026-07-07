import React, { useState, useEffect, useCallback } from 'react';
import { ChevronDown } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://get-right-home.onrender.com/api';

const fetchJSON = async (url) => {
  const res = await fetch(url);
  const data = await res.json();
  return data.success ? data.data : [];
};

const SelectField = ({ label, value, onChange, options, placeholder, disabled, required }) => (
  <div>
    <label className="text-xs font-semibold text-gray-500 mb-1 block">
      {label}{required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
    <div className="relative">
      <select
        className={`w-full px-3 py-2.5 bg-gray-50 border rounded-xl text-sm font-medium text-gray-800
          focus:bg-white focus:border-emerald-400 outline-none transition-all appearance-none
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          ${value ? 'border-emerald-200' : 'border-gray-200'}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      >
        <option value="">{placeholder}</option>
        {options.map((opt) => (
          <option key={opt._id} value={opt._id}>
            {opt.name}
          </option>
        ))}
      </select>
      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
    </div>
  </div>
);

/**
 * LocationSelector — Dynamic cascading Country → State → District → City dropdowns.
 * Fetches all data live from the backend API.
 *
 * Props:
 *  - value: { country, state, district, city } — TEXT NAMES (not IDs)
 *  - onChange: ({ country, state, district, city }) => void
 *  - required: boolean
 *  - className: string
 */
const LocationSelector = ({ value = {}, onChange, required = false, className = '' }) => {
  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [cities, setCities] = useState([]);

  // Selected IDs (internal — for API cascade)
  const [selectedCountryId, setSelectedCountryId] = useState('');
  const [selectedStateId, setSelectedStateId] = useState('');
  const [selectedDistrictId, setSelectedDistrictId] = useState('');
  const [selectedCityId, setSelectedCityId] = useState('');

  // Load countries on mount
  useEffect(() => {
    fetchJSON(`${API_BASE}/locations/countries`).then(setCountries);
  }, []);

  // Load states when country changes
  useEffect(() => {
    if (!selectedCountryId) { setStates([]); setDistricts([]); setCities([]); return; }
    fetchJSON(`${API_BASE}/locations/states?countryId=${selectedCountryId}`).then(setStates);
  }, [selectedCountryId]);

  // Load districts when state changes
  useEffect(() => {
    if (!selectedStateId) { setDistricts([]); setCities([]); return; }
    fetchJSON(`${API_BASE}/locations/districts?stateId=${selectedStateId}`).then(setDistricts);
  }, [selectedStateId]);

  // Load cities when district changes
  useEffect(() => {
    if (!selectedDistrictId) { setCities([]); return; }
    fetchJSON(`${API_BASE}/locations/cities?districtId=${selectedDistrictId}`).then(setCities);
  }, [selectedDistrictId]);

  // Sync selectedCountryId when countries load or value.country changes
  useEffect(() => {
    if (countries.length > 0) {
      if (value?.country) {
        const match = countries.find(c => c.name.toLowerCase() === value.country.toLowerCase());
        if (match) {
          if (String(match._id) !== String(selectedCountryId)) {
            setSelectedCountryId(String(match._id));
          }
        } else {
          setSelectedCountryId('');
        }
      } else {
        setSelectedCountryId('');
      }
    }
  }, [countries, value?.country, selectedCountryId]);

  // Sync selectedStateId when states load or value.state changes
  useEffect(() => {
    if (states.length > 0) {
      if (value?.state) {
        const match = states.find(s => s.name.toLowerCase() === value.state.toLowerCase());
        if (match) {
          if (String(match._id) !== String(selectedStateId)) {
            setSelectedStateId(String(match._id));
          }
        } else {
          setSelectedStateId('');
        }
      } else {
        setSelectedStateId('');
      }
    }
  }, [states, value?.state, selectedStateId]);

  // Sync selectedDistrictId when districts load or value.district changes
  useEffect(() => {
    if (districts.length > 0) {
      if (value?.district) {
        const match = districts.find(d => d.name.toLowerCase() === value.district.toLowerCase());
        if (match) {
          if (String(match._id) !== String(selectedDistrictId)) {
            setSelectedDistrictId(String(match._id));
          }
        } else {
          setSelectedDistrictId('');
        }
      } else {
        setSelectedDistrictId('');
      }
    }
  }, [districts, value?.district, selectedDistrictId]);

  // Sync selectedCityId when cities load or value.city changes
  useEffect(() => {
    if (cities.length > 0) {
      if (value?.city) {
        const match = cities.find(c => c.name.toLowerCase() === value.city.toLowerCase());
        if (match) {
          if (String(match._id) !== String(selectedCityId)) {
            setSelectedCityId(String(match._id));
          }
        } else {
          setSelectedCityId('');
        }
      } else {
        setSelectedCityId('');
      }
    }
  }, [cities, value?.city, selectedCityId]);

  // Helper: get name from id in a list
  const nameOf = (list, id) => list.find(x => String(x._id) === String(id))?.name || '';

  // Notify parent with text names whenever selection changes
  const notify = useCallback((cId, stId, dId, ctId, _countries, _states, _districts, _cities) => {
    const country = nameOf(_countries, cId);
    const state = nameOf(_states, stId);
    const district = nameOf(_districts, dId);
    const city = nameOf(_cities, ctId);
    onChange({ country, state, district, city });
  }, [onChange]);

  const handleCountryChange = (id) => {
    setSelectedCountryId(id);
    setSelectedStateId('');
    setSelectedDistrictId('');
    setSelectedCityId('');
    setStates([]); setDistricts([]); setCities([]);
    notify(id, '', '', '', countries, [], [], []);
  };

  const handleStateChange = (id) => {
    setSelectedStateId(id);
    setSelectedDistrictId('');
    setSelectedCityId('');
    setDistricts([]); setCities([]);
    notify(selectedCountryId, id, '', '', countries, states, [], []);
  };

  const handleDistrictChange = (id) => {
    setSelectedDistrictId(id);
    setSelectedCityId('');
    setCities([]);
    notify(selectedCountryId, selectedStateId, id, '', countries, states, districts, []);
  };

  const handleCityChange = (id) => {
    setSelectedCityId(id);
    // Need to wait for cities to be available — use the state cities list
    notify(selectedCountryId, selectedStateId, selectedDistrictId, id, countries, states, districts, cities);
  };

  // When cities loads, update notify with correct list
  useEffect(() => {
    if (selectedCityId && cities.length > 0) {
      notify(selectedCountryId, selectedStateId, selectedDistrictId, selectedCityId, countries, states, districts, cities);
    }
  }, [cities]);

  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      {/* Country */}
      <SelectField
        label="Country"
        value={selectedCountryId}
        onChange={handleCountryChange}
        options={countries}
        placeholder="Select Country"
        required={required}
      />

      {/* State */}
      <SelectField
        label="State"
        value={selectedStateId}
        onChange={handleStateChange}
        options={states}
        placeholder={selectedCountryId ? 'Select State' : 'Select country first'}
        disabled={!selectedCountryId || states.length === 0}
        required={required}
      />

      {/* District */}
      <SelectField
        label="District"
        value={selectedDistrictId}
        onChange={handleDistrictChange}
        options={districts}
        placeholder={selectedStateId ? 'Select District' : 'Select state first'}
        disabled={!selectedStateId || districts.length === 0}
      />

      {/* City / Area / Taluk */}
      <SelectField
        label="City / Area"
        value={selectedCityId}
        onChange={handleCityChange}
        options={cities}
        placeholder={selectedDistrictId ? (cities.length ? 'Select Area' : 'No areas yet') : 'Select district first'}
        disabled={!selectedDistrictId || cities.length === 0}
      />
    </div>
  );
};

export default LocationSelector;
