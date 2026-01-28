import { useState, useEffect } from 'react';
import { Search, MapPin, Clock } from 'lucide-react';
import { stopAPI, etaAPI } from '../services/api';
import { Stop, ETA } from '../services/api';

export default function StopSearchPage() {
  const [query, setQuery] = useState('');
  const [stops, setStops] = useState<Stop[]>([]);
  const [selectedStop, setSelectedStop] = useState<Stop | null>(null);
  const [etas, setETAs] = useState<ETA[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingETAs, setLoadingETAs] = useState(false);

  useEffect(() => {
    if (query.length >= 2) {
      const searchStops = async () => {
        setLoading(true);
        try {
          const results = await stopAPI.search(query);
          setStops(results);
        } catch (error) {
          console.error('Error searching stops', error);
        } finally {
          setLoading(false);
        }
      };

      const timeoutId = setTimeout(searchStops, 300);
      return () => clearTimeout(timeoutId);
    } else {
      setStops([]);
    }
  }, [query]);

  const handleStopSelect = async (stop: Stop) => {
    setSelectedStop(stop);
    setLoadingETAs(true);
    try {
      const stopETAs = await etaAPI.getForStop(stop.stop_id);
      setETAs(stopETAs);
    } catch (error) {
      console.error('Error loading ETAs', error);
    } finally {
      setLoadingETAs(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">Search Bus Stops</h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by stop name or code..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
      </div>

      {stops.length > 0 && (
        <div className="bg-white rounded-lg shadow-md">
          <div className="p-4 border-b">
            <h3 className="font-semibold text-gray-900">Search Results</h3>
          </div>
          <div className="divide-y">
            {stops.map((stop) => (
              <button
                key={stop.stop_id}
                onClick={() => handleStopSelect(stop)}
                className="w-full p-4 text-left hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start">
                  <MapPin className="w-5 h-5 text-primary-600 mr-3 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900">{stop.stop_name}</h4>
                    {stop.stop_code && (
                      <p className="text-sm text-gray-500">Code: {stop.stop_code}</p>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {selectedStop && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-start mb-4">
            <MapPin className="w-6 h-6 text-primary-600 mr-3 mt-1" />
            <div>
              <h3 className="text-xl font-semibold text-gray-900">{selectedStop.stop_name}</h3>
              {selectedStop.stop_code && (
                <p className="text-sm text-gray-500">Stop Code: {selectedStop.stop_code}</p>
              )}
            </div>
          </div>

          <div className="border-t pt-4">
            <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
              <Clock className="w-5 h-5 mr-2" />
              Estimated Arrivals
            </h4>

            {loadingETAs ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-2"></div>
                <p className="text-gray-600">Loading ETAs...</p>
              </div>
            ) : etas.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No buses approaching this stop</p>
            ) : (
              <div className="space-y-3">
                {etas.map((eta) => (
                  <div
                    key={`${eta.vehicle_id}-${eta.stop_id}`}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <p className="font-semibold text-gray-900">Bus {eta.vehicle_id}</p>
                      {eta.route_id && (
                        <p className="text-sm text-gray-500">Route: {eta.route_id}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-primary-600">
                        {eta.eta_minutes} min
                      </p>
                      <p className="text-xs text-gray-500">
                        {eta.confidence} confidence
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

