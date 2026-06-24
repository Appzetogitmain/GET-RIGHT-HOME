import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleMap, useJsApiLoader, DrawingManager, Polygon } from '@react-google-maps/api';
import { api } from '../../../../../services/apiService';
import toast from 'react-hot-toast';
import { FiTrash2, FiMapPin, FiSave, FiX, FiLayers } from 'react-icons/fi';

const libraries = ['drawing', 'places'];

const mapContainerStyle = {
  width: '100%',
  height: '100%',
  borderRadius: '16px'
};

const center = {
  lat: 22.7196, // Default Indore center
  lng: 75.8577
};

const ZoneSetup = () => {
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script-admin',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''
  });

  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newZoneName, setNewZoneName] = useState('');
  const [currentPolygonCoords, setCurrentPolygonCoords] = useState(null);
  
  // Custom drawing states
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawnPaths, setDrawnPaths] = useState([]);

  useEffect(() => {
    fetchZones();
  }, []);

  const fetchZones = async () => {
    try {
      setLoading(true);
      const res = await api.get('/zones');
      if (res.data.success) {
        setZones(res.data.data);
      }
    } catch (error) {
      toast.error('Failed to load zones');
    } finally {
      setLoading(false);
    }
  };

  const startDrawing = () => {
    setIsDrawing(true);
    setDrawnPaths([]);
    setCurrentPolygonCoords(null);
    setNewZoneName('');
  };

  const onMapClick = useCallback((e) => {
    if (!isDrawing) return;
    setDrawnPaths((prev) => [...prev, { lat: e.latLng.lat(), lng: e.latLng.lng() }]);
  }, [isDrawing]);

  const finishDrawing = () => {
    if (drawnPaths.length < 3) {
      toast.error('A polygon needs at least 3 points');
      return;
    }
    const coordinates = drawnPaths.map(p => [p.lng, p.lat]);
    coordinates.push([...coordinates[0]]); // close polygon
    setCurrentPolygonCoords(coordinates);
    setIsDrawing(false);
    toast.success('Area drawn! Enter name and save.');
  };

  const clearCurrentDrawing = () => {
    setDrawnPaths([]);
    setCurrentPolygonCoords(null);
    setNewZoneName('');
    setIsDrawing(false);
  };

  const saveZone = async () => {
    if (!newZoneName.trim()) {
      toast.error('Please enter a zone name');
      return;
    }
    if (!currentPolygonCoords || currentPolygonCoords.length < 4) {
      toast.error('Please draw a valid polygon area first');
      return;
    }

    try {
      const res = await api.post('/zones', {
        name: newZoneName,
        status: 'active',
        coordinates: currentPolygonCoords
      });

      if (res.data.success) {
        toast.success('Zone created successfully');
        clearCurrentDrawing();
        fetchZones();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create zone');
    }
  };

  const deleteZone = async (id) => {
    if (!window.confirm('Are you sure you want to delete this zone?')) return;
    try {
      const res = await api.delete(`/zones/${id}`);
      if (res.data.success) {
        toast.success('Zone deleted');
        fetchZones();
      }
    } catch (error) {
      toast.error('Failed to delete zone');
    }
  };

  const toggleZoneStatus = async (zone) => {
    try {
      const newStatus = zone.status === 'active' ? 'inactive' : 'active';
      const res = await api.put(`/zones/${zone._id}`, {
        name: zone.name,
        status: newStatus
      });
      if (res.data.success) {
        toast.success(`Zone marked as ${newStatus}`);
        fetchZones();
      }
    } catch (error) {
      toast.error('Failed to update zone status');
    }
  };

  if (loadError) return <div className="p-8 text-red-500">Error loading Google Maps. Check API Key.</div>;
  if (!isLoaded) return <div className="p-8">Loading Maps...</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto flex flex-col lg:flex-row gap-6 h-[calc(100vh-100px)]">
      
      {/* Left Panel: List & Controls */}
      <div className="w-full lg:w-1/3 flex flex-col gap-6 h-full">
        {/* Draw New Zone Form */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex-shrink-0">
          <div className="flex items-center gap-2 mb-4">
            <FiLayers className="w-5 h-5 text-teal-600" />
            <h2 className="text-lg font-bold text-gray-800">Create New Zone</h2>
          </div>
          
          {!currentPolygonCoords && !isDrawing ? (
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-center space-y-3">
              <p className="text-sm text-blue-700 font-medium">
                Click below to start drawing a new service zone on the map.
              </p>
              <button 
                onClick={startDrawing}
                className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors"
              >
                Start Drawing
              </button>
            </div>
          ) : isDrawing ? (
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 space-y-4">
              <p className="text-sm text-amber-700 font-medium">
                Click on the map to place points. You have placed {drawnPaths.length} points.
              </p>
              <div className="flex gap-2">
                <button 
                  onClick={clearCurrentDrawing}
                  className="flex-1 py-2 px-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={finishDrawing}
                  className="flex-1 py-2 px-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl transition-colors"
                >
                  Finish Drawing
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-100 rounded-xl p-3">
                <p className="text-xs text-green-700 font-semibold flex items-center gap-1">
                  <FiMapPin /> Area drawn successfully ({currentPolygonCoords.length - 1} points)
                </p>
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Zone Name</label>
                <input 
                  type="text" 
                  value={newZoneName}
                  onChange={(e) => setNewZoneName(e.target.value)}
                  placeholder="e.g. South Indore, Vijay Nagar" 
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none"
                />
              </div>

              <div className="flex gap-2">
                <button 
                  onClick={clearCurrentDrawing}
                  className="flex-1 py-2 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <FiX /> Clear
                </button>
                <button 
                  onClick={saveZone}
                  className="flex-1 py-2 px-4 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-md shadow-teal-500/20"
                >
                  <FiSave /> Save Zone
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Existing Zones List */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex-1 overflow-hidden flex flex-col">
          <div className="p-6 border-b border-gray-100 bg-gray-50/50">
            <h2 className="text-lg font-bold text-gray-800">Active Service Zones</h2>
            <p className="text-xs text-gray-500 mt-1">Bookings will only be accepted in these areas.</p>
          </div>
          
          <div className="overflow-y-auto flex-1 p-4">
            {loading ? (
              <p className="text-center text-gray-400 py-4">Loading zones...</p>
            ) : zones.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-400 text-sm">No zones configured yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {zones.map(zone => (
                  <div key={zone._id} className="flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:border-teal-100 hover:shadow-sm transition-all group bg-white">
                    <div>
                      <h3 className="font-bold text-gray-800">{zone.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`w-2 h-2 rounded-full ${zone.status === 'active' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                        <span className="text-xs text-gray-500 capitalize">{zone.status}</span>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <button 
                        onClick={() => toggleZoneStatus(zone)}
                        className={`px-3 py-1 text-xs font-semibold rounded-lg border transition-colors ${zone.status === 'active' ? 'text-orange-600 border-orange-200 hover:bg-orange-50' : 'text-green-600 border-green-200 hover:bg-green-50'}`}
                      >
                        {zone.status === 'active' ? 'Disable' : 'Enable'}
                      </button>
                      <button 
                        onClick={() => deleteZone(zone._id)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <FiTrash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right Panel: Map */}
      <div className="w-full lg:w-2/3 h-full rounded-2xl shadow-sm border border-gray-100 overflow-hidden relative">
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={center}
          zoom={12}
          onClick={onMapClick}
          options={{
            disableDefaultUI: false,
            zoomControl: true,
            mapTypeControl: true,
            streetViewControl: false,
            draggableCursor: isDrawing ? 'crosshair' : 'grab'
          }}
        >
          {/* Live Drawing Polygon */}
          {isDrawing && drawnPaths.length > 0 && (
            <Polygon
              paths={drawnPaths}
              options={{
                fillColor: '#f59e0b',
                fillOpacity: 0.3,
                strokeWeight: 2,
                strokeColor: '#d97706',
                clickable: false,
                editable: false,
                zIndex: 1
              }}
            />
          )}

          {/* Finished Drawing Polygon */}
          {!isDrawing && currentPolygonCoords && (
            <Polygon
              paths={currentPolygonCoords.map(coord => ({ lng: coord[0], lat: coord[1] }))}
              options={{
                fillColor: '#0d9488',
                fillOpacity: 0.3,
                strokeWeight: 2,
                strokeColor: '#0f766e',
                clickable: false,
                editable: false,
                zIndex: 1
              }}
            />
          )}

          {/* Render existing zones as polygons */}
          {zones && zones.length > 0 && zones.map((zone) => {
            if (!zone.area || !zone.area.coordinates || !zone.area.coordinates[0]) return null;
            // Convert GeoJSON [lng, lat] back to Map format {lat, lng}
            const paths = zone.area.coordinates[0].map(coord => ({
              lat: coord[1],
              lng: coord[0]
            }));

            return (
              <Polygon
                key={zone._id}
                paths={paths}
                options={{
                  fillColor: zone.status === 'active' ? '#3b82f6' : '#ef4444',
                  fillOpacity: 0.2,
                  strokeColor: zone.status === 'active' ? '#2563eb' : '#dc2626',
                  strokeOpacity: 0.8,
                  strokeWeight: 2,
                  clickable: false
                }}
              />
            );
          })}
        </GoogleMap>
      </div>

    </div>
  );
};

export default ZoneSetup;
