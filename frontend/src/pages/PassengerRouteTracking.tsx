import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Map, Clock, AlertTriangle, Navigation, ArrowLeft, MapPin, Search, TrendingUp, Bell, CheckCircle } from 'lucide-react';
import { Loader } from '@googlemaps/js-api-loader';
import { passengerAPI, stopAPI, routeAPI } from '../services/api';
import { wsService } from '../services/websocket';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

export default function PassengerRouteTracking() {
  const { routeId } = useParams<{ routeId: string }>();
  const navigate = useNavigate();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const busMarkerRef = useRef<google.maps.Marker | null>(null);
  const stopMarkerRef = useRef<google.maps.Marker | null>(null);
  const routePolylineRef = useRef<google.maps.Polyline | null>(null);

  const [buses, setBuses] = useState<any[]>([]);
  const [selectedBus, setSelectedBus] = useState<string | null>(null);
  const [trackingData, setTrackingData] = useState<any>(null);
  const [eta, setEta] = useState<any>(null);
  const [alternatives, setAlternatives] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedStop, setSelectedStop] = useState<any>(null);
  const [stopSearchQuery, setStopSearchQuery] = useState('');
  const [stopSearchResults, setStopSearchResults] = useState<any[]>([]);
  const [showStopSearch, setShowStopSearch] = useState(false);
  const [routeInfo, setRouteInfo] = useState<any>(null);
  const [notifications, setNotifications] = useState<any[]>([]);

  // Initialize Google Maps
  useEffect(() => {
    if (!GOOGLE_MAPS_API_KEY || !mapRef.current) return;

    const initMap = async () => {
      try {
        const loader = new Loader({
          apiKey: GOOGLE_MAPS_API_KEY,
          version: 'weekly',
        });

        const { Map } = await loader.importLibrary('maps');

        if (mapRef.current) {
          mapInstanceRef.current = new Map(mapRef.current, {
            center: { lat: 6.9271, lng: 79.8612 }, // Default to Colombo
            zoom: 13,
            mapTypeControl: true,
            streetViewControl: false,
          });
        }
      } catch (err) {
        console.error('Error loading Google Maps', err);
      }
    };

    initMap();
  }, []);

  // Load route info
  useEffect(() => {
    if (routeId) {
      loadRouteInfo();
    }
  }, [routeId]);

  // Load buses for route
  useEffect(() => {
    if (routeId) {
      loadBuses();
      const interval = setInterval(loadBuses, 10000);
      return () => clearInterval(interval);
    }
  }, [routeId]);

  // Load tracking data when bus is selected
  useEffect(() => {
    if (selectedBus) {
      loadTrackingData();
      const interval = setInterval(loadTrackingData, 5000);
      return () => clearInterval(interval);
    }
  }, [selectedBus]);

  // Load ETA when stop is selected
  useEffect(() => {
    if (selectedBus && selectedStop) {
      loadETA();
      const interval = setInterval(loadETA, 30000);
      return () => clearInterval(interval);
    }
  }, [selectedBus, selectedStop]);

  // Check for alternatives when route is delayed
  useEffect(() => {
    if (routeId && selectedStop && trackingData?.delay_minutes > 5) {
      checkAlternatives();
    }
  }, [routeId, selectedStop, trackingData]);

  // Load notifications
  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  // WebSocket subscription for real-time updates
  useEffect(() => {
    wsService.connect();

    const unsubscribe = wsService.on('position_update', (message) => {
      if (message.data && message.data.vehicle_id === selectedBus) {
        setTrackingData((prev: any) => ({
          ...prev,
          position: {
            latitude: message.data.latitude,
            longitude: message.data.longitude,
            timestamp: message.data.timestamp,
            speed: message.data.speed,
            heading: message.data.heading,
          },
        }));
      }
    });

    if (selectedBus) {
      wsService.subscribe([`vehicle:${selectedBus}`]);
    }

    return () => {
      unsubscribe();
      if (selectedBus) {
        wsService.unsubscribe([`vehicle:${selectedBus}`]);
      }
    };
  }, [selectedBus]);

  // Update map when tracking data changes
  useEffect(() => {
    if (!mapInstanceRef.current || !trackingData) return;

    const position = {
      lat: trackingData.position.latitude,
      lng: trackingData.position.longitude,
    };

    // Update or create bus marker
    if (!busMarkerRef.current) {
      busMarkerRef.current = new google.maps.Marker({
        position,
        map: mapInstanceRef.current,
        title: `Bus ${trackingData.vehicle_id}`,
        icon: {
          path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
          scale: 6,
          rotation: trackingData.position.heading || 0,
          fillColor: '#3b82f6',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
      });
    } else {
      busMarkerRef.current.setPosition(position);
      if (trackingData.position.heading) {
        busMarkerRef.current.setIcon({
          path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
          scale: 6,
          rotation: trackingData.position.heading,
          fillColor: '#3b82f6',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        });
      }
    }

    // Center map on bus
    mapInstanceRef.current.setCenter(position);
  }, [trackingData]);

  // Update stop marker
  useEffect(() => {
    if (!mapInstanceRef.current || !selectedStop) return;

    const stopPosition = {
      lat: selectedStop.stop_lat,
      lng: selectedStop.stop_lon,
    };

    if (!stopMarkerRef.current) {
      stopMarkerRef.current = new google.maps.Marker({
        position: stopPosition,
        map: mapInstanceRef.current,
        title: selectedStop.stop_name,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: '#ef4444',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
        },
      });
    } else {
      stopMarkerRef.current.setPosition(stopPosition);
    }
  }, [selectedStop]);

  const loadRouteInfo = async () => {
    if (!routeId) return;
    try {
      const route = await routeAPI.getById(routeId);
      setRouteInfo(route);
    } catch (error) {
      console.error('Load route info error:', error);
    }
  };

  const loadBuses = async () => {
    if (!routeId) return;
    try {
      const data = await passengerAPI.getBusesForRoute(routeId);
      setBuses(data);
      if (data.length > 0 && !selectedBus) {
        setSelectedBus(data[0].vehicle_id);
      }
    } catch (error) {
      console.error('Load buses error:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTrackingData = async () => {
    if (!selectedBus) return;
    try {
      const data = await passengerAPI.trackBus(selectedBus);
      setTrackingData(data);
    } catch (error) {
      console.error('Load tracking error:', error);
    }
  };

  const loadETA = async () => {
    if (!selectedBus || !selectedStop) return;
    try {
      const data = await passengerAPI.getETA(selectedBus, selectedStop.stop_id);
      setEta(data);
    } catch (error) {
      console.error('Load ETA error:', error);
    }
  };

  const checkAlternatives = async () => {
    if (!routeId || !selectedStop) return;
    try {
      const data = await passengerAPI.getAlternatives(routeId, selectedStop.stop_id);
      setAlternatives(data);
    } catch (error) {
      console.error('Check alternatives error:', error);
    }
  };

  const searchStops = async (query: string) => {
    if (query.length < 2) {
      setStopSearchResults([]);
      return;
    }
    try {
      const results = await stopAPI.search(query, 10);
      setStopSearchResults(results);
    } catch (error) {
      console.error('Search stops error:', error);
    }
  };

  const loadNotifications = async () => {
    try {
      const data = await passengerAPI.getNotifications(10, true);
      setNotifications(data);
    } catch (error) {
      // Ignore errors
    }
  };

  const handleStopSelect = (stop: any) => {
    setSelectedStop(stop);
    setShowStopSearch(false);
    setStopSearchQuery('');
    setStopSearchResults([]);
  };

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'high':
        return 'text-green-600 bg-green-50';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50';
      case 'low':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          <p className="mt-4 text-gray-600">Loading route data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-md p-4 sticky top-0 z-10">
        <div className="flex items-center mb-4">
          <button
            onClick={() => navigate('/passenger/search')}
            className="mr-4 p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">
              {routeInfo ? `Route ${routeInfo.route_short_name}` : 'Route Tracking'}
            </h1>
            {routeInfo && (
              <p className="text-sm text-gray-600">{routeInfo.route_long_name}</p>
            )}
          </div>
        </div>

        {/* Bus Selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Bus
          </label>
          <select
            value={selectedBus || ''}
            onChange={(e) => setSelectedBus(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          >
            {buses.map((bus) => (
              <option key={bus.vehicle_id} value={bus.vehicle_id}>
                Bus {bus.vehicle_id} - {bus.status}
                {bus.delay_minutes > 0 && ` (${bus.delay_minutes} min delay)`}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Notifications Banner */}
      {notifications.length > 0 && (
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mx-4 mt-4">
          <div className="flex items-center">
            <Bell className="w-5 h-5 text-blue-600 mr-2" />
            <div className="flex-1">
              <h3 className="font-semibold text-blue-900">New Notifications</h3>
              {notifications.slice(0, 3).map((notif: any) => (
                <p key={notif.id} className="text-sm text-blue-800 mt-1">
                  {notif.title}: {notif.message}
                </p>
              ))}
            </div>
            <button
              onClick={() => navigate('/passenger/notifications')}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              View All
            </button>
          </div>
        </div>
      )}

      {/* Map Section */}
      {trackingData && (
        <div className="p-4">
          <div className="bg-white rounded-lg shadow-md p-4 mb-4">
            <div className="flex items-center mb-4">
              <Map className="w-6 h-6 text-primary-600 mr-2" />
              <h3 className="text-lg font-semibold">Live Map</h3>
            </div>
            <div ref={mapRef} className="w-full h-96 rounded-lg overflow-hidden" />
            {!GOOGLE_MAPS_API_KEY && (
              <p className="text-sm text-gray-500 mt-2 text-center">
                Google Maps API key not configured. Map will not display.
              </p>
            )}
          </div>

          {/* Bus Status Card */}
          <div className="bg-white rounded-lg shadow-md p-4 mb-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Bus {trackingData.vehicle_id}</h3>
                <p className="text-gray-600">Status: {trackingData.status}</p>
                {trackingData.delay_minutes > 0 && (
                  <div className="flex items-center mt-2 text-orange-600">
                    <AlertTriangle className="w-4 h-4 mr-1" />
                    <span>Delayed by {trackingData.delay_minutes} minutes</span>
                  </div>
                )}
                {trackingData.position?.speed && (
                  <p className="text-sm text-gray-500 mt-1">
                    Speed: {trackingData.position.speed.toFixed(1)} km/h
                  </p>
                )}
              </div>
              <Navigation className="w-8 h-8 text-primary-600" />
            </div>
          </div>

          {/* Stop Selection */}
          <div className="bg-white rounded-lg shadow-md p-4 mb-4">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <MapPin className="w-5 h-5 mr-2" />
              Select Your Stop
            </h3>
            <div className="relative">
              <div className="flex items-center">
                <Search className="absolute left-3 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search for a stop..."
                  value={stopSearchQuery}
                  onChange={(e) => {
                    setStopSearchQuery(e.target.value);
                    searchStops(e.target.value);
                    setShowStopSearch(true);
                  }}
                  onFocus={() => setShowStopSearch(true)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
              {showStopSearch && stopSearchResults.length > 0 && (
                <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {stopSearchResults.map((stop) => (
                    <button
                      key={stop.stop_id}
                      onClick={() => handleStopSelect(stop)}
                      className="w-full text-left px-4 py-2 hover:bg-gray-100 border-b border-gray-200 last:border-b-0"
                    >
                      <div className="font-medium">{stop.stop_name}</div>
                      {stop.stop_code && (
                        <div className="text-sm text-gray-500">Code: {stop.stop_code}</div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {selectedStop && (
              <div className="mt-4 p-3 bg-primary-50 rounded-lg flex items-center justify-between">
                <div>
                  <div className="font-medium text-primary-900">{selectedStop.stop_name}</div>
                  {selectedStop.stop_code && (
                    <div className="text-sm text-primary-700">Code: {selectedStop.stop_code}</div>
                  )}
                </div>
                <button
                  onClick={() => {
                    setSelectedStop(null);
                    setEta(null);
                  }}
                  className="text-primary-600 hover:text-primary-800"
                >
                  Change
                </button>
              </div>
            )}
          </div>

          {/* ML-Based ETA Section */}
          {selectedStop && (
            <div className="bg-white rounded-lg shadow-md p-4 mb-4">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <TrendingUp className="w-5 h-5 mr-2" />
                ML-Based ETA Prediction
              </h3>
              {eta ? (
                <div className="space-y-3">
                  <div className={`rounded-lg p-4 ${getConfidenceColor(eta.confidence)}`}>
                    <div className="text-4xl font-bold mb-2">
                      {eta.eta_minutes} min
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Confidence: {eta.confidence}</p>
                        <p className="text-xs mt-1">
                          Arrival: {new Date(eta.eta_timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                      {eta.confidence === 'high' && (
                        <CheckCircle className="w-6 h-6" />
                      )}
                    </div>
                  </div>
                  {eta.cached && (
                    <p className="text-xs text-gray-500">
                      * Using cached prediction for faster results
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                  <p className="mt-2 text-gray-600">Calculating ETA...</p>
                </div>
              )}
            </div>
          )}

          {/* Smart Recommendations */}
          {alternatives && alternatives.is_delayed && alternatives.alternatives.length > 0 && (
            <div className="bg-orange-50 border-l-4 border-orange-500 rounded-lg p-4 mb-4">
              <div className="flex items-center mb-3">
                <AlertTriangle className="w-5 h-5 text-orange-600 mr-2" />
                <h3 className="text-lg font-semibold text-orange-900">
                  Route Delayed - Alternative Options
                </h3>
              </div>
              <p className="text-orange-800 mb-3">
                Current route is delayed by {alternatives.delay_minutes} minutes.
                Consider these alternatives:
              </p>
              <div className="space-y-2">
                {alternatives.alternatives.map((alt: any, index: number) => (
                  <div
                    key={index}
                    className="bg-white rounded p-3 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => {
                      navigate(`/passenger/route/${alt.route_id}`);
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-gray-900">
                          Route {alt.route_short_name}
                        </div>
                        <div className="text-sm text-gray-600">{alt.route_long_name}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-primary-600 font-semibold">
                          {alt.eta_minutes} min
                        </div>
                        {alt.delay_minutes > 0 && (
                          <div className="text-xs text-orange-600">
                            {alt.delay_minutes} min delay
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {!trackingData && (
        <div className="p-4 text-center">
          <p className="text-gray-600">Select a bus to start tracking</p>
        </div>
      )}
    </div>
  );
}
