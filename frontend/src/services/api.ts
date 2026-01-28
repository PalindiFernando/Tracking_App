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

  verify: async () => {
    const response = await api.get('/auth/verify');
    return response.data.data;
  },
};

