import { create } from 'zustand';
import { Bus, Stop, ETA } from '../services/api';

interface BusState {
  buses: Map<string, Bus>;
  selectedBus: string | null;
  stops: Map<string, Stop>;
  etas: Map<string, ETA[]>;
  setBuses: (buses: Bus[]) => void;
  updateBus: (bus: Bus) => void;
  setSelectedBus: (vehicleId: string | null) => void;
  setStops: (stops: Stop[]) => void;
  setETAs: (stopId: string, etas: ETA[]) => void;
  clear: () => void;
}

export const useBusStore = create<BusState>((set) => ({
  buses: new Map(),
  selectedBus: null,
  stops: new Map(),
  etas: new Map(),

  setBuses: (buses) => {
    const busMap = new Map(buses.map(bus => [bus.vehicle_id, bus]));
    set({ buses: busMap });
  },

  updateBus: (bus) => {
    set((state) => {
      const newBuses = new Map(state.buses);
      newBuses.set(bus.vehicle_id, bus);
      return { buses: newBuses };
    });
  },

  setSelectedBus: (vehicleId) => set({ selectedBus: vehicleId }),

  setStops: (stops) => {
    const stopMap = new Map(stops.map(stop => [stop.stop_id, stop]));
    set({ stops: stopMap });
  },

  setETAs: (stopId, etas) => {
    set((state) => {
      const newETAs = new Map(state.etas);
      newETAs.set(stopId, etas);
      return { etas: newETAs };
    });
  },

  clear: () => set({
    buses: new Map(),
    selectedBus: null,
    stops: new Map(),
    etas: new Map(),
  }),
}));

