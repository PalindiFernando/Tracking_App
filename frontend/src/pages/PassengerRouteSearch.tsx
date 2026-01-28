import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin, Clock, AlertCircle } from 'lucide-react';
import { passengerAPI } from '../services/api';

export default function PassengerRouteSearch() {
  const [searchQuery, setSearchQuery] = useState('');
  const [routes, setRoutes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (searchQuery.length > 2) {
      searchRoutes();
    } else {
      setRoutes([]);
    }
  }, [searchQuery]);

  const searchRoutes = async () => {
    setLoading(true);
    try {
      const results = await passengerAPI.searchRoutes(searchQuery);
      setRoutes(results);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRouteSelect = (routeId: string) => {
    navigate(`/passenger/route/${routeId}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Search Routes</h1>
        
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by route number or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>

        {loading && (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        )}

        {!loading && routes.length > 0 && (
          <div className="space-y-3">
            {routes.map((route) => (
              <div
                key={route.route_id}
                onClick={() => handleRouteSelect(route.route_id)}
                className="bg-white rounded-lg shadow-md p-4 cursor-pointer hover:shadow-lg transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">
                      Route {route.route_short_name}
                    </h3>
                    <p className="text-gray-600 mt-1">{route.route_long_name}</p>
                  </div>
                  <MapPin className="w-6 h-6 text-primary-600" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && searchQuery.length > 2 && routes.length === 0 && (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No routes found</p>
          </div>
        )}
      </div>
    </div>
  );
}

