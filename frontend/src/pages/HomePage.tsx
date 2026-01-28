import { Link, useNavigate } from 'react-router-dom';
import { Map, Search, Clock, Navigation, Route, Bell, TrendingUp } from 'lucide-react';
import { useEffect, useState } from 'react';
import { authAPI } from '../services/api';

export default function HomePage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const userData = await authAPI.getProfile();
      setUser(userData);
      
      // Redirect based on role
      if (userData.role === 'passenger') {
        navigate('/passenger/search');
      } else if (userData.role === 'driver') {
        navigate('/driver');
      } else if (userData.role === 'admin') {
        navigate('/admin');
      }
    } catch (error) {
      console.error('Failed to load user:', error);
    }
  };

  // Show loading or default content while user loads
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Passenger-specific home page
  if (user.role === 'passenger') {
    return (
      <div className="px-4 py-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Welcome, {user.full_name || user.username}!
          </h1>
          <p className="text-xl text-gray-600">
            Track your bus in real-time and get accurate arrival estimates
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          <Link
            to="/passenger/search"
            className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
          >
            <Search className="w-12 h-12 text-primary-600 mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Search Routes</h2>
            <p className="text-gray-600">
              Find and select specific bus numbers and routes
            </p>
          </Link>

          <Link
            to="/passenger/notifications"
            className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
          >
            <Bell className="w-12 h-12 text-primary-600 mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Notifications</h2>
            <p className="text-gray-600">
              View approaching buses, delays, and route suggestions
            </p>
          </Link>

          <div className="bg-white rounded-lg shadow-md p-6">
            <TrendingUp className="w-12 h-12 text-primary-600 mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">ML-Based ETA</h2>
            <p className="text-gray-600">
              Get accurate arrival predictions using machine learning
            </p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="flex items-center mb-4">
            <Clock className="w-6 h-6 text-primary-600 mr-2" />
            <h2 className="text-2xl font-semibold text-gray-900">How It Works</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <div className="text-3xl font-bold text-primary-600 mb-2">1</div>
              <h3 className="font-semibold text-gray-900 mb-2">Search & Select</h3>
              <p className="text-gray-600">
                Search for your bus route by number or name
              </p>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary-600 mb-2">2</div>
              <h3 className="font-semibold text-gray-900 mb-2">Real-Time Tracking</h3>
              <p className="text-gray-600">
                View live bus location on an interactive map
              </p>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary-600 mb-2">3</div>
              <h3 className="font-semibold text-gray-900 mb-2">Smart ETA</h3>
              <p className="text-gray-600">
                Get ML-based arrival predictions with alternative routes
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Default home page for other roles
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
          to={user.role === 'admin' ? '/admin' : '/driver'}
          className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
        >
          <Navigation className="w-12 h-12 text-primary-600 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Dashboard</h2>
          <p className="text-gray-600">
            Monitor fleet status and manage operations
          </p>
        </Link>
      </div>
    </div>
  );
}

