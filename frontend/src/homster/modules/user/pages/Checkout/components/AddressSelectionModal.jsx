import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FiArrowLeft, FiX, FiSearch, FiMapPin, FiHome, FiNavigation } from 'react-icons/fi';
import { Autocomplete, useJsApiLoader } from '@react-google-maps/api';
import { themeColors } from '../../../../../theme';
import LocationPicker from './LocationPicker';
import flutterBridge from '../../../../../utils/flutterBridge';
import { toast } from 'react-hot-toast';

const libraries = ['places', 'geometry'];

const AddressSelectionModal = ({ isOpen, onClose, address = '', houseNumber = '', onHouseNumberChange, onSave }) => {
  const [isClosing, setIsClosing] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [mapAddress, setMapAddress] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [autocomplete, setAutocomplete] = useState(null);
  const [fetchingLocation, setFetchingLocation] = useState(false);
  const locationPickerRef = useRef(null);

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries
  });

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
    } else {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      setIsClosing(false);
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
    };
  }, [isOpen]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 200);
  };

  const handleLocationSelect = (location) => {
    setSelectedLocation(location);
    setMapAddress(location.address);
    setSearchQuery(location.address);
  };

  // Build clean address from Nominatim structured data
  const formatNominatimAddress = (addr) => {
    const parts = [];
    if (addr.road) parts.push(addr.road);
    else if (addr.neighbourhood) parts.push(addr.neighbourhood);
    if (addr.suburb) parts.push(addr.suburb);
    else if (addr.village) parts.push(addr.village);
    const city = addr.city || addr.town || addr.city_district;
    if (city) parts.push(city);
    if (addr.state) parts.push(addr.state);
    if (addr.postcode) parts.push(addr.postcode);
    return parts.length > 0 ? parts.join(', ') : null;
  };

  // Fetch current location and reverse geocode via Nominatim fallback
  const handleUseCurrentLocation = useCallback(async () => {
    setFetchingLocation(true);
    try {
      const pos = await flutterBridge.getCurrentLocation();
      const newLocation = { lat: pos.latitude, lng: pos.longitude };

      // Try Google reverse geocode first
      let resolved = false;
      if (window.google && window.google.maps) {
        const geocoder = new window.google.maps.Geocoder();
        try {
          const result = await new Promise((resolve, reject) => {
            geocoder.geocode({ location: newLocation }, (results, status) => {
              if (status === 'OK' && results[0]) resolve(results[0]);
              else reject(new Error('Google geocode failed'));
            });
          });
          handleLocationSelect({
            lat: newLocation.lat,
            lng: newLocation.lng,
            address: result.formatted_address,
            components: result.address_components
          });
          resolved = true;
        } catch (e) {
          // Google failed, will try Nominatim
        }
      }

      // Nominatim fallback
      if (!resolved) {
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${newLocation.lat}&lon=${newLocation.lng}&format=json&addressdetails=1`,
            { headers: { 'Accept-Language': 'en' } }
          );
          const data = await res.json();
          if (data && data.display_name) {
            const addr = data.address || {};
            const cleanAddress = formatNominatimAddress(addr) || data.display_name;
            const components = [
              addr.suburb && { types: ['sublocality'], long_name: addr.suburb },
              addr.city && { types: ['locality'], long_name: addr.city },
              addr.town && !addr.city && { types: ['locality'], long_name: addr.town },
              addr.state && { types: ['administrative_area_level_1'], long_name: addr.state },
              addr.postcode && { types: ['postal_code'], long_name: addr.postcode },
              addr.country && { types: ['country'], long_name: addr.country },
            ].filter(Boolean);

            handleLocationSelect({
              lat: newLocation.lat,
              lng: newLocation.lng,
              address: cleanAddress,
              components
            });
            resolved = true;
          }
        } catch (err) {
          console.warn('Nominatim fallback failed:', err);
        }
      }

      if (!resolved) {
        toast.error('Could not resolve address. Please select on map.');
      } else {
        toast.success('Location fetched successfully!', { icon: '📍' });
      }
    } catch (error) {
      console.error('Current location error:', error);
      let msg = 'Unable to get location.';
      if (error.code === 1) msg = 'Location permission denied. Please allow GPS.';
      else if (error.code === 2) msg = 'GPS is turned off. Please enable it.';
      else if (error.code === 3) msg = 'Location request timed out.';
      toast.error(msg);
    } finally {
      setFetchingLocation(false);
    }
  }, []);

  const onPlaceChanged = () => {
    if (autocomplete !== null) {
      const place = autocomplete.getPlace();
      if (place.geometry) {
        const location = {
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng(),
          address: place.formatted_address,
          components: place.address_components
        };
        setSelectedLocation(location);
        setMapAddress(place.formatted_address);
        setSearchQuery(place.formatted_address);
      }
    }
  };

  const onAutocompleteLoad = (autocompleteInstance) => {
    setAutocomplete(autocompleteInstance);
  };

  if (!isOpen && !isClosing) return null;

  return (
    <>
      <div
        className={`fixed inset-0 bg-black/50 z-50 transition-opacity ${isClosing ? 'opacity-0' : 'opacity-100'}`}
        onClick={handleClose}
      />
      <div className="fixed bottom-0 left-0 right-0 z-50">
        <div
          className={`bg-white rounded-t-[32px] shadow-2xl ${isClosing ? 'animate-slide-down' : 'animate-slide-up'}`}
          style={{
            height: '85vh',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            borderTop: '1px solid rgba(0,0,0,0.05)'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 z-10 shrink-0 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={handleClose} className="p-1 hover:bg-gray-100 rounded-full transition-colors">
                <FiArrowLeft className="w-5 h-5 text-black" />
              </button>
              <h1 className="text-xl font-bold text-black">Confirm Location</h1>
            </div>
            <button onClick={handleClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <FiX className="w-5 h-5 text-black" />
            </button>
          </div>

          {/* Info Card - Styled with Brand Colors */}
          <div className="px-4 pt-4 shrink-0">
            <div className="rounded-xl p-3 mb-2 border" style={{ backgroundColor: `${themeColors.brand.teal}0D`, borderColor: `${themeColors.brand.teal}1A` }}>
              <div className="flex items-start gap-3">
                <FiMapPin className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: themeColors.button }} />
                <div>
                  <h3 className="font-semibold mb-1 text-sm" style={{ color: themeColors.button }}>Set Delivery Location</h3>
                  <p className="text-xs" style={{ color: `${themeColors.brand.teal}CC` }}>
                    Place the pin accurately on the map to help the professional find you easily.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Map Section */}
          <div className="px-4 pb-2 shrink-0">
            <div className="rounded-xl overflow-hidden shadow-sm border border-gray-100">
              <LocationPicker
                ref={locationPickerRef}
                onLocationSelect={handleLocationSelect}
                initialPosition={selectedLocation}
              />
            </div>
          </div>

          {/* Address Details - Scrollable */}
          <div
            className="px-4 py-2 pb-8 overflow-y-auto flex-1"
            style={{
              WebkitOverflowScrolling: 'touch',
              overscrollBehavior: 'contain'
            }}
          >
            {/* Address Search */}
            {/* Use Current Location Button */}
            <button
              onClick={handleUseCurrentLocation}
              disabled={fetchingLocation}
              className="w-full flex items-center gap-3 p-3 mb-3 rounded-xl border transition-all active:scale-[0.98]"
              style={{
                backgroundColor: fetchingLocation ? '#f3f4f6' : `${themeColors.brand.teal}0D`,
                borderColor: `${themeColors.brand.teal}30`,
              }}
            >
              {fetchingLocation ? (
                <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin flex-shrink-0" style={{ borderColor: `${themeColors.button}40`, borderTopColor: 'transparent' }} />
              ) : (
                <FiNavigation className="w-5 h-5 flex-shrink-0" style={{ color: themeColors.button }} />
              )}
              <div className="text-left">
                <p className="text-sm font-bold" style={{ color: themeColors.button }}>
                  {fetchingLocation ? 'Fetching location...' : 'Use Current Location'}
                </p>
                <p className="text-[10px] text-gray-400">Auto-detect your GPS location</p>
              </div>
            </button>

            <div className="mb-4">
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">
                Pinpoint your Address
              </label>
              {isLoaded ? (
                <Autocomplete
                  onLoad={onAutocompleteLoad}
                  onPlaceChanged={onPlaceChanged}
                  options={{
                    componentRestrictions: { country: 'in' },
                    fields: ['formatted_address', 'geometry', 'name', 'address_components']
                  }}
                >
                  <div className="relative">
                    <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 z-10" />
                    <input
                      type="text"
                      placeholder="Search for area, street name..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-10 py-3 bg-gray-50 border-none rounded-xl text-sm focus:ring-1 focus:ring-primary-500 transition-all font-medium"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-200 transition-all"
                      >
                        <FiX className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </Autocomplete>
              ) : (
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Loading Maps..."
                    disabled
                    className="w-full pl-4 py-3 bg-gray-100 rounded-xl text-sm"
                  />
                </div>
              )}
            </div>

            {/* House/Flat Number - NEW */}
            <div className="mb-6">
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">
                House / Flat / Office No. (Optional)
              </label>
              <div className="relative">
                <FiHome className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 z-10" />
                <input
                  type="text"
                  placeholder="e.g. Flat 101, Appzeto Tower"
                  value={houseNumber}
                  onChange={(e) => onHouseNumberChange(e.target.value)}
                  className="w-full pl-9 pr-4 py-3 bg-gray-50 border-none rounded-xl text-sm focus:ring-1 focus:ring-primary-500 transition-all font-medium"
                />
              </div>
            </div>

            {/* Save Button */}
            <button
              onClick={() => onSave(houseNumber, selectedLocation)}
              disabled={!mapAddress}
              className="w-full py-4 rounded-xl font-black text-white transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-xl mb-12 uppercase tracking-wider text-xs"
              style={{
                backgroundColor: themeColors.button,
                boxShadow: `0 8px 16px ${themeColors.button}30`
              }}
            >
              Verify & Save Address
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default AddressSelectionModal;

