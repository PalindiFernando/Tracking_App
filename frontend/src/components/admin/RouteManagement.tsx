import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, MapPin } from 'lucide-react';
import { adminAPI } from '../../services/api';

export default function RouteManagement() {
  const [routes, setRoutes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showStopsModal, setShowStopsModal] = useState(false);
  const [editingRoute, setEditingRoute] = useState<any>(null);
  const [selectedRoute, setSelectedRoute] = useState<any>(null);
  const [routeStops, setRouteStops] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    route_id: '',
    route_short_name: '',
    route_long_name: '',
    route_desc: '',
    route_type: '',
    route_color: '',
    route_text_color: '',
  });

  useEffect(() => {
    loadRoutes();
  }, []);

  const loadRoutes = async () => {
    setLoading(true);
    try {
      const data = await adminAPI.getRoutes();
      setRoutes(data);
    } catch (error) {
      console.error('Load routes error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingRoute(null);
    setFormData({
      route_id: '',
      route_short_name: '',
      route_long_name: '',
      route_desc: '',
      route_type: '',
      route_color: '',
      route_text_color: '',
    });
    setShowModal(true);
  };

  const handleEdit = (route: any) => {
    setEditingRoute(route);
    setFormData({
      route_id: route.route_id,
      route_short_name: route.route_short_name || '',
      route_long_name: route.route_long_name || '',
      route_desc: route.route_desc || '',
      route_type: route.route_type || '',
      route_color: route.route_color || '',
      route_text_color: route.route_text_color || '',
    });
    setShowModal(true);
  };

  const handleManageStops = async (route: any) => {
    setSelectedRoute(route);
    try {
      const stops = await adminAPI.getRouteStops(route.route_id);
      setRouteStops(stops);
      setShowStopsModal(true);
    } catch (error) {
      console.error('Load route stops error:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingRoute) {
        await adminAPI.updateRoute(editingRoute.route_id, formData);
      } else {
        await adminAPI.createRoute(formData);
      }
      setShowModal(false);
      loadRoutes();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Operation failed');
    }
  };

  const handleDelete = async (routeId: string) => {
    if (!confirm('Are you sure you want to delete this route?')) return;
    try {
      await adminAPI.deleteRoute(routeId);
      loadRoutes();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Delete failed');
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold">Route Management</h2>
        <button
          onClick={handleCreate}
          className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          <Plus className="w-5 h-5 mr-2" />
          Add Route
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Route ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Short Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Long Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vehicles</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {routes.map((route) => (
              <tr key={route.route_id}>
                <td className="px-6 py-4 whitespace-nowrap font-medium">{route.route_id}</td>
                <td className="px-6 py-4 whitespace-nowrap">{route.route_short_name}</td>
                <td className="px-6 py-4">{route.route_long_name}</td>
                <td className="px-6 py-4 whitespace-nowrap">{route.vehicle_count || 0}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <button
                    onClick={() => handleManageStops(route)}
                    className="text-blue-600 hover:text-blue-900 mr-4"
                    title="Manage Stops"
                  >
                    <MapPin className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleEdit(route)}
                    className="text-primary-600 hover:text-primary-900 mr-4"
                  >
                    <Edit className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(route.route_id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Route Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-semibold mb-4">
              {editingRoute ? 'Edit Route' : 'Create Route'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Route ID *
                </label>
                <input
                  type="text"
                  required
                  value={formData.route_id}
                  onChange={(e) => setFormData({ ...formData, route_id: e.target.value })}
                  disabled={!!editingRoute}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Short Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.route_short_name}
                  onChange={(e) => setFormData({ ...formData, route_short_name: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Long Name
                </label>
                <input
                  type="text"
                  value={formData.route_long_name}
                  onChange={(e) => setFormData({ ...formData, route_long_name: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.route_desc}
                  onChange={(e) => setFormData({ ...formData, route_desc: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                  rows={3}
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                  {editingRoute ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stops Management Modal */}
      {showStopsModal && selectedRoute && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-semibold mb-4">
              Manage Stops for Route {selectedRoute.route_short_name}
            </h3>
            <div className="mb-4">
              <p className="text-gray-600 text-sm">
                Current stops in sequence. Use the route_stop_sequence table to manage stop order.
              </p>
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {routeStops.map((stop, index) => (
                <div key={stop.stop_id} className="bg-gray-50 p-3 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-semibold">{index + 1}. {stop.stop_name}</span>
                      <p className="text-sm text-gray-600">Stop ID: {stop.stop_id}</p>
                    </div>
                    {stop.estimated_time_minutes && (
                      <span className="text-sm text-gray-500">
                        ~{stop.estimated_time_minutes} min
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setShowStopsModal(false)}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

