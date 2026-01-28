import { Outlet, Link, useNavigate } from 'react-router-dom';
import { Map, Search, Home, LogOut, Route, User, Settings, Bell } from 'lucide-react';
import { useEffect, useState } from 'react';
import { authAPI, passengerAPI } from '../services/api';

export default function Layout() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (user?.role === 'passenger') {
      loadNotifications();
      const interval = setInterval(loadNotifications, 30000); // Check every 30 seconds
      return () => clearInterval(interval);
    }
  }, [user]);

  const loadUser = async () => {
    try {
      const userData = await authAPI.getProfile();
      setUser(userData);
    } catch (error) {
      console.error('Failed to load user:', error);
    }
  };

  const loadNotifications = async () => {
    try {
      const notifications = await passengerAPI.getNotifications(20, true);
      setUnreadNotifications(notifications.length);
    } catch (error) {
      // Ignore errors for notifications
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const getPassengerNav = () => (
    <>
      <Link
        to="/passenger/search"
        className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300"
      >
        <Search className="w-4 h-4 mr-1" />
        Search Routes
      </Link>
      <Link
        to="/passenger/notifications"
        className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300 relative"
      >
        <Bell className="w-4 h-4 mr-1" />
        Notifications
        {unreadNotifications > 0 && (
          <span className="ml-1 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5">
            {unreadNotifications}
          </span>
        )}
      </Link>
    </>
  );

  const getDriverNav = () => (
    <>
      <Link
        to="/driver"
        className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300"
      >
        <Map className="w-4 h-4 mr-1" />
        Dashboard
      </Link>
    </>
  );

  const getAdminNav = () => (
    <>
      <Link
        to="/admin"
        className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300"
      >
        <Settings className="w-4 h-4 mr-1" />
        Admin Dashboard
      </Link>
    </>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <Link to="/" className="flex items-center px-2 py-2 text-xl font-bold text-primary-600">
                🚌 Bus Tracker
              </Link>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                <Link
                  to="/"
                  className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-900 border-b-2 border-primary-500"
                >
                  <Home className="w-4 h-4 mr-1" />
                  Home
                </Link>
                {user?.role === 'passenger' && getPassengerNav()}
                {user?.role === 'driver' && getDriverNav()}
                {user?.role === 'admin' && getAdminNav()}
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {user && (
                <span className="text-sm text-gray-600">
                  {user.username} ({user.role})
                </span>
              )}
              <button
                onClick={handleLogout}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                <LogOut className="w-4 h-4 mr-1" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
}

