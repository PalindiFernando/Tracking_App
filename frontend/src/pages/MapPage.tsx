import { useEffect, useRef, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import { useBusStore } from '../store/useBusStore';
import { busAPI } from '../services/api';
import { wsService } from '../services/websocket';
import { MapPin } from 'lucide-react';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

export default function MapPage() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<Map<string, google.maps.Marker>>(new Map());
  const { buses, updateBus } = useBusStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!GOOGLE_MAPS_API_KEY) {
      setError('Google Maps API key not configured');
      setLoading(false);
      return;
    }

    const initMap = async () => {
      try {
        const loader = new Loader({
          apiKey: GOOGLE_MAPS_API_KEY,
          version: 'weekly',
        });

        const { Map } = await loader.importLibrary('maps');

        if (mapRef.current) {
          mapInstanceRef.current = new Map(mapRef.current, {
            center: { lat: 6.9271, lng: 79.8612 }, // Default to Colombo, Sri Lanka
            zoom: 13,
            mapTypeControl: true,
            streetViewControl: false,
          });

          setLoading(false);
        }
      } catch (err) {
        console.error('Error loading Google Maps', err);
        setError('Failed to load map');
        setLoading(false);
      }
    };

    initMap();
  }, []);

  useEffect(() => {
    const loadBuses = async () => {
      try {
        const busList = await busAPI.getAll();
        useBusStore.getState().setBuses(busList);
      } catch (err) {
        console.error('Error loading buses', err);
      }
    };

    loadBuses();
  }, []);

  useEffect(() => {
    if (!mapInstanceRef.current) return;

    // Update markers when buses change
    buses.forEach((bus) => {
      const position = { lat: bus.position.latitude, lng: bus.position.longitude };
      
      let marker = markersRef.current.get(bus.vehicle_id);
      
      if (!marker) {
        marker = new google.maps.Marker({
          position,
          map: mapInstanceRef.current!,
          title: `Bus ${bus.vehicle_id}`,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: '#3b82f6',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 2,
          },
        });

        const infoWindow = new google.maps.InfoWindow({
          content: `
            <div class="p-2">
              <h3 class="font-semibold">Bus ${bus.vehicle_id}</h3>
              <p class="text-sm">Route: ${bus.route?.route_short_name || 'N/A'}</p>
              <p class="text-sm">Speed: ${bus.position.speed?.toFixed(1) || 'N/A'} km/h</p>
            </div>
          `,
        });

        marker.addListener('click', () => {
          infoWindow.open(mapInstanceRef.current, marker);
        });

        markersRef.current.set(bus.vehicle_id, marker);
      } else {
        marker.setPosition(position);
      }
    });

    // Remove markers for buses that no longer exist
    markersRef.current.forEach((marker, vehicleId) => {
      if (!buses.has(vehicleId)) {
        marker.setMap(null);
        markersRef.current.delete(vehicleId);
      }
    });
  }, [buses]);

  useEffect(() => {
    // Connect WebSocket and listen for position updates
    wsService.connect();

    const unsubscribe = wsService.on('position_update', (message) => {
      if (message.data) {
        // Update bus position in store
        const bus = useBusStore.getState().buses.get(message.data.vehicle_id);
        if (bus) {
          updateBus({
            ...bus,
            position: {
              ...bus.position,
              latitude: message.data.latitude,
              longitude: message.data.longitude,
              timestamp: message.data.timestamp,
            },
          });
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [updateBus]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading map...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow-md p-4">
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">Live Bus Map</h2>
        <p className="text-gray-600">
          {buses.size} bus{buses.size !== 1 ? 'es' : ''} currently tracked
        </p>
      </div>
      <div ref={mapRef} className="w-full h-[600px] rounded-lg shadow-md" />
    </div>
  );
}

