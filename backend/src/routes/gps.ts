import { Router, Request, Response } from 'express';
import { GPSIngestService } from '../services/gpsIngest';
import { createError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { websocketBroadcast } from '../websocket/server';

const router = Router();

/**
 * POST /api/gps
 * Receive GPS update from bus tracking device
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const apiKey = req.headers['x-api-key'] as string;
    
    if (!apiKey) {
      throw createError('API key required', 401);
    }

    const position = await GPSIngestService.processGPSUpdate(req.body, apiKey);

    // Broadcast position update via WebSocket
    websocketBroadcast('position_update', {
      vehicle_id: position.vehicle_id,
      latitude: position.latitude,
      longitude: position.longitude,
      timestamp: position.timestamp
    });

    res.status(201).json({
      success: true,
      message: 'GPS update received',
      vehicle_id: position.vehicle_id
    });
  } catch (error: any) {
    logger.error('GPS ingest error', error);
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      error: error.message || 'Failed to process GPS update'
    });
  }
});

/**
 * GET /api/gps/:vehicleId
 * Get latest position for a vehicle
 */
router.get('/:vehicleId', async (req: Request, res: Response) => {
  try {
    const { vehicleId } = req.params;
    const position = await GPSIngestService.getLatestPosition(vehicleId);

    if (!position) {
      return res.status(404).json({
        success: false,
        error: 'Position not found for vehicle'
      });
    }

    res.json({
      success: true,
      data: position
    });
  } catch (error: any) {
    logger.error('Get position error', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get position'
    });
  }
});

export default router;

