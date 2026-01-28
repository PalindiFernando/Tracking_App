import { Link } from 'react-router-dom';
import { Map, Search, Clock, Navigation } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="px-4 py-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Real-Time Bus Tracking
        </h1>
        <p className="text-xl text-gray-600">
          Track buses in real-time and get accurate arrival estimates
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        <Link
          to="/map"
          className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
        >
          <Map className="w-12 h-12 text-primary-600 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Live Map</h2>
          <p className="text-gray-600">
            View all buses on an interactive map with real-time positions
          </p>
        </Link>

        <Link
          to="/stops"
          className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
        >
          <Search className="w-12 h-12 text-primary-600 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Find Stops</h2>
          <p className="text-gray-600">
            Search for bus stops and view estimated arrival times
          </p>
        </Link>

        <Link
          to="/operator"
          className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
        >
          <Navigation className="w-12 h-12 text-primary-600 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Operator Dashboard</h2>
          <p className="text-gray-600">
            Monitor fleet status and manage operations
          </p>
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow-md p-8">
        <div className="flex items-center mb-4">
          <Clock className="w-6 h-6 text-primary-600 mr-2" />
          <h2 className="text-2xl font-semibold text-gray-900">How It Works</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <div className="text-3xl font-bold text-primary-600 mb-2">1</div>
            <h3 className="font-semibold text-gray-900 mb-2">GPS Tracking</h3>
            <p className="text-gray-600">
              Buses send real-time GPS coordinates to our system
            </p>
          </div>
          <div>
            <div className="text-3xl font-bold text-primary-600 mb-2">2</div>
            <h3 className="font-semibold text-gray-900 mb-2">Traffic Analysis</h3>
            <p className="text-gray-600">
              Google Maps APIs analyze traffic conditions for accurate ETAs
            </p>
          </div>
          <div>
            <div className="text-3xl font-bold text-primary-600 mb-2">3</div>
            <h3 className="font-semibold text-gray-900 mb-2">Live Updates</h3>
            <p className="text-gray-600">
              Get instant updates on bus positions and arrival times
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

