import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for auth tokens
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export interface Bus {
  vehicle_id: string;
  position: {
    latitude: number;
    longitude: number;
    timestamp: string;
    speed?: number;
    heading?: number;
  };
  route?: {
    route_id: string;
    route_short_name: string;
    route_long_name: string;
  };
}

export interface Stop {
  stop_id: string;
  stop_name: string;
  stop_lat: number;
  stop_lon: number;
  stop_code?: string;
}

export interface Route {
  route_id: string;
  route_short_name: string;
  route_long_name: string;
  route_type: number;
  route_color?: string;
}

export interface ETA {
  vehicle_id: string;
  stop_id: string;
  route_id?: string;
  eta_minutes: number;
  eta_timestamp: string;
  confidence: 'high' | 'medium' | 'low';
  cached: boolean;
}

export const busAPI = {
  getAll: async (): Promise<Bus[]> => {
    const response = await api.get('/buses');
    return response.data.data;
  },

  getById: async (vehicleId: string): Promise<Bus> => {
    const response = await api.get(`/buses/${vehicleId}`);
    return response.data.data;
  },
};

export const stopAPI = {
  search: async (query: string, limit = 20): Promise<Stop[]> => {
    const response = await api.get('/stops', { params: { q: query, limit } });
    return response.data.data;
  },

  getById: async (stopId: string): Promise<Stop> => {
    const response = await api.get(`/stops/${stopId}`);
    return response.data.data;
  },

  getETAs: async (stopId: string, routeId?: string): Promise<ETA[]> => {
    const response = await api.get(`/stops/${stopId}/eta`, { params: { routeId } });
    return response.data.data;
  },
};

export const routeAPI = {
  getAll: async (): Promise<Route[]> => {
    const response = await api.get('/routes');
    return response.data.data;
  },

  getById: async (routeId: string): Promise<Route> => {
    const response = await api.get(`/routes/${routeId}`);
    return response.data.data;
  },

  getStops: async (routeId: string, direction: 'inbound' | 'outbound' = 'outbound'): Promise<Stop[]> => {
    const response = await api.get(`/routes/${routeId}/stops`, { params: { direction } });
    return response.data.data;
  },
};

export const etaAPI = {
  get: async (vehicleId: string, stopId: string): Promise<ETA> => {
    const response = await api.get(`/eta/${vehicleId}/${stopId}`);
    return response.data.data;
  },

  getForStop: async (stopId: string, routeId?: string): Promise<ETA[]> => {
    const response = await api.get(`/eta/stop/${stopId}`, { params: { routeId } });
    return response.data.data;
  },
};

export const authAPI = {
  login: async (username: string, password: string) => {
    const response = await api.post('/auth/login', { username, password });
    return response.data.data;
  },

  register: async (username: string, password: string, email?: string, phone?: string, role: 'passenger' | 'driver' = 'passenger', full_name?: string) => {
    const response = await api.post('/auth/register', { username, password, email, phone, role, full_name });
    return response.data.data;
  },

  verify: async () => {
    const response = await api.get('/auth/verify');
    return response.data.data;
  },

  getProfile: async () => {
    const response = await api.get('/auth/me');
    return response.data.data;
  },
};

export const driverAPI = {
  startTrip: async (route_id?: string, scheduled_start_time?: string) => {
    const response = await api.post('/driver/trip/start', { route_id, scheduled_start_time });
    return response.data.data;
  },

  stopTrip: async () => {
    const response = await api.post('/driver/trip/stop');
    return response.data.data;
  },

  getCurrentTrip: async () => {
    const response = await api.get('/driver/trip/current');
    return response.data.data;
  },

  updateStatus: async (status: 'running' | 'delayed' | 'break' | 'maintenance', delay_minutes?: number, notes?: string) => {
    const response = await api.put('/driver/status', { status, delay_minutes, notes });
    return response.data.data;
  },

  updateLocation: async (latitude: number, longitude: number, speed?: number, heading?: number, accuracy?: number) => {
    const response = await api.post('/driver/location', { latitude, longitude, speed, heading, accuracy });
    return response.data.data;
  },

  getNotifications: async (limit = 20, unread_only = false) => {
    const response = await api.get('/driver/notifications', { params: { limit, unread_only } });
    return response.data.data;
  },

  markNotificationRead: async (notificationId: number) => {
    const response = await api.put(`/driver/notifications/${notificationId}/read`);
    return response.data;
  },
};

export const passengerAPI = {
  searchRoutes: async (query: string) => {
    const response = await api.get('/passenger/routes/search', { params: { q: query } });
    return response.data.data;
  },

  getBusesForRoute: async (routeId: string) => {
    const response = await api.get(`/passenger/buses/${routeId}`);
    return response.data.data;
  },

  trackBus: async (vehicleId: string) => {
    const response = await api.get(`/passenger/bus/${vehicleId}/track`);
    return response.data.data;
  },

  getETA: async (vehicleId: string, stopId: string) => {
    const response = await api.get(`/passenger/eta/${vehicleId}/${stopId}`);
    return response.data.data;
  },

  getAlternatives: async (routeId: string, stopId: string) => {
    const response = await api.get(`/passenger/alternatives/${routeId}/${stopId}`);
    return response.data.data;
  },

  addFavorite: async (favorite_type: 'route' | 'stop' | 'bus', favorite_id: string) => {
    const response = await api.post('/passenger/favorites', { favorite_type, favorite_id });
    return response.data.data;
  },

  getFavorites: async () => {
    const response = await api.get('/passenger/favorites');
    return response.data.data;
  },

  getNotifications: async (limit = 20, unread_only = false) => {
    const response = await api.get('/passenger/notifications', { params: { limit, unread_only } });
    return response.data.data;
  },

  markNotificationRead: async (notificationId: number) => {
    const response = await api.put(`/passenger/notifications/${notificationId}/read`);
    return response.data;
  },
};

export const adminAPI = {
  // Bus management
  getBuses: async (page = 1, limit = 20, status?: string, route_id?: string) => {
    const response = await api.get('/admin/buses', { params: { page, limit, status, route_id } });
    return response.data;
  },

  createBus: async (vehicle_id: string, route_id?: string, vehicle_type?: string, capacity?: number, status = 'active') => {
    const response = await api.post('/admin/buses', { vehicle_id, route_id, vehicle_type, capacity, status });
    return response.data.data;
  },

  updateBus: async (vehicleId: string, data: any) => {
    const response = await api.put(`/admin/buses/${vehicleId}`, data);
    return response.data.data;
  },

  deleteBus: async (vehicleId: string) => {
    const response = await api.delete(`/admin/buses/${vehicleId}`);
    return response.data;
  },

  // Route management
  getRoutes: async () => {
    const response = await api.get('/admin/routes');
    return response.data.data;
  },

  createRoute: async (data: any) => {
    const response = await api.post('/admin/routes', data);
    return response.data.data;
  },

  updateRoute: async (routeId: string, data: any) => {
    const response = await api.put(`/admin/routes/${routeId}`, data);
    return response.data.data;
  },

  deleteRoute: async (routeId: string) => {
    const response = await api.delete(`/admin/routes/${routeId}`);
    return response.data;
  },

  getRouteStops: async (routeId: string, direction = '0') => {
    const response = await api.get(`/admin/routes/${routeId}/stops`, { params: { direction } });
    return response.data.data;
  },

  updateRouteStops: async (routeId: string, stops: any[], direction_id = 0) => {
    const response = await api.post(`/admin/routes/${routeId}/stops`, { stops, direction_id });
    return response.data;
  },

  // User management
  getUsers: async (page = 1, limit = 20, role?: string, is_verified?: boolean, is_active?: boolean) => {
    const response = await api.get('/admin/users', { params: { page, limit, role, is_verified, is_active } });
    return response.data;
  },

  createUser: async (data: any) => {
    const response = await api.post('/admin/users', data);
    return response.data.data;
  },

  verifyUser: async (userId: number) => {
    const response = await api.put(`/admin/users/${userId}/verify`);
    return response.data.data;
  },

  assignVehicle: async (userId: number, vehicle_id: string) => {
    const response = await api.put(`/admin/users/${userId}/assign-vehicle`, { vehicle_id });
    return response.data.data;
  },

  updateUserStatus: async (userId: number, is_active: boolean) => {
    const response = await api.put(`/admin/users/${userId}/status`, { is_active });
    return response.data.data;
  },
};

