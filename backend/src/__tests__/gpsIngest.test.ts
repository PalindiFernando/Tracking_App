import { GPSIngestService } from '../services/gpsIngest';

describe('GPSIngestService', () => {
  describe('validateGPSPayload', () => {
    it('should validate correct GPS payload', () => {
      const payload = {
        vehicle_id: 'BUS001',
        timestamp: 1704067200,
        latitude: 6.9271,
        longitude: 79.8612,
        speed: 45.5,
      };

      const result = GPSIngestService.validateGPSPayload(payload);
      expect(result).toBeDefined();
      expect(result.vehicle_id).toBe('BUS001');
    });

    it('should reject invalid coordinates', () => {
      const payload = {
        vehicle_id: 'BUS001',
        timestamp: 1704067200,
        latitude: 100, // Invalid
        longitude: 79.8612,
      };

      expect(() => {
        GPSIngestService.validateGPSPayload(payload);
      }).toThrow();
    });

    it('should reject missing required fields', () => {
      const payload = {
        vehicle_id: 'BUS001',
        // Missing timestamp, latitude, longitude
      };

      expect(() => {
        GPSIngestService.validateGPSPayload(payload);
      }).toThrow();
    });
  });
});

