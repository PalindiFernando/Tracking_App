import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Square, MapPin, AlertCircle, Clock, Navigation } from 'lucide-react';
import { driverAPI } from '../services/api';

export default function DriverDashboard() {
  const navigate = useNavigate();
  const [currentTrip, setCurrentTrip] = useState<any>(null);
  const [status, setStatus] = useState<'running' | 'delayed' | 'break' | 'maintenance'>('running');
  const [delayMinutes, setDelayMinutes] = useState(0);
  const [notes, setNotes] = useState('');
  const [notifications, setNotifications] = useState<any[]>([]);
  const [locationTracking, setLocationTracking] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCurrentTrip();
    loadNotifications();
    const interval = setInterval(() => {
      loadCurrentTrip();
      loadNotifications();
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (locationTracking && currentTrip) {
      startLocationTracking();
    }
  }, [locationTracking, currentTrip]);

  const loadCurrentTrip = async () => {
    try {
      const trip = await driverAPI.getCurrentTrip();
      setCurrentTrip(trip);
      if (trip) {
        setStatus(trip.current_status || 'running');
        setDelayMinutes(trip.delay_minutes || 0);
        setNotes(trip.notes || '');
      }
    } catch (error) {
      console.error('Load trip error:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadNotifications = async () => {
    try {
      const data = await driverAPI.getNotifications(10, true);
      setNotifications(data);
    } catch (error) {
      console.error('Load notifications error:', error);
    }
  };

  const handleStartTrip = async () => {
    try {
      await driverAPI.startTrip();
      await loadCurrentTrip();
      setLocationTracking(true);
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to start trip');
    }
  };

  const handleStopTrip = async () => {
    try {
      await driverAPI.stopTrip();
      setCurrentTrip(null);
      setLocationTracking(false);
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to stop trip');
    }
  };

  const handleUpdateStatus = async () => {
    try {
      await driverAPI.updateStatus(status, delayMinutes, notes);
      alert('Status updated successfully');
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to update status');
    }
  };

  const startLocationTracking = async () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      async (position) => {
        try {
          await driverAPI.updateLocation(
            position.coords.latitude,
            position.coords.longitude,
            undefined,
            undefined,
            position.coords.accuracy
          );
        } catch (error) {
          console.error('Location update error:', error);
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto space-y-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Driver Dashboard</h1>

        {/* Trip Management */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Trip Management</h2>
          {!currentTrip ? (
            <div>
              <p className="text-gray-600 mb-4">No active trip</p>
              <button
                onClick={handleStartTrip}
                className="flex items-center justify-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <Play className="w-5 h-5 mr-2" />
                Start Trip
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-green-900">Trip Active</h3>
                    <p className="text-sm text-green-700">
                      Started: {new Date(currentTrip.actual_start_time).toLocaleString()}
                    </p>
                    {currentTrip.route_short_name && (
                      <p className="text-sm text-green-700">
                        Route: {currentTrip.route_short_name}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={handleStopTrip}
                    className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  >
                    <Square className="w-4 h-4 mr-2" />
                    Stop Trip
                  </button>
                </div>
              </div>

              {/* Location Tracking Status */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="locationTracking"
                  checked={locationTracking}
                  onChange={(e) => setLocationTracking(e.target.checked)}
                  className="mr-2"
                />
                <label htmlFor="locationTracking" className="flex items-center">
                  <MapPin className="w-4 h-4 mr-2" />
                  Enable GPS Location Broadcasting
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Status Update */}
        {currentTrip && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">Status Update</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Current Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                >
                  <option value="running">Running</option>
                  <option value="delayed">Delayed</option>
                  <option value="break">Break</option>
                  <option value="maintenance">Maintenance</option>
                </select>
              </div>

              {status === 'delayed' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Delay (minutes)
                  </label>
                  <input
                    type="number"
                    value={delayMinutes}
                    onChange={(e) => setDelayMinutes(parseInt(e.target.value) || 0)}
                    className="w-full p-2 border border-gray-300 rounded-lg"
                    min="0"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                  rows={3}
                  placeholder="Additional notes..."
                />
              </div>

              <button
                onClick={handleUpdateStatus}
                className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                Update Status
              </button>
            </div>
          </div>
        )}

        {/* Notifications */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center">
              <AlertCircle className="w-5 h-5 mr-2" />
              Alerts & Notifications
            </h2>
            {notifications.length > 0 && (
              <span className="bg-red-500 text-white rounded-full px-3 py-1 text-sm">
                {notifications.length}
              </span>
            )}
          </div>
          {notifications.length > 0 ? (
            <div className="space-y-2">
              {notifications.map((notif) => (
                <div
                  key={notif.id}
                  className="bg-yellow-50 border border-yellow-200 rounded-lg p-4"
                >
                  <h3 className="font-semibold text-yellow-900">{notif.title}</h3>
                  <p className="text-yellow-800 text-sm mt-1">{notif.message}</p>
                  <p className="text-yellow-600 text-xs mt-2">
                    {new Date(notif.sent_at).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No new notifications</p>
          )}
        </div>
      </div>
    </div>
  );
}

