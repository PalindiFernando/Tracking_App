import { Router, Request, Response } from 'express';
import { GPSIngestService } from '../services/gpsIngest';
import { RouteMappingService } from '../services/routeMapping';
import { logger } from '../utils/logger';

const router = Router();

/**
 * GET /api/buses
 * Get all active buses with their latest positions
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    // In production, this would query active vehicles from database
    // For now, return empty array or implement based on your vehicle tracking
    res.json({
      success: true,
      data: []
    });
  } catch (error: any) {
    logger.error('Get buses error', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get buses'
    });
  }
});

/**
 * GET /api/buses/:vehicleId
 * Get bus details and latest position
 */
router.get('/:vehicleId', async (req: Request, res: Response) => {
  try {
    const { vehicleId } = req.params;
    const position = await GPSIngestService.getLatestPosition(vehicleId);

    if (!position) {
      return res.status(404).json({
        success: false,
        error: 'Bus not found'
      });
    }

    // Map to route if possible
    const route = await RouteMappingService.mapToRoute(position.latitude, position.longitude);

    res.json({
      success: true,
      data: {
        vehicle_id: vehicleId,
        position,
        route: route || null
      }
    });
  } catch (error: any) {
    logger.error('Get bus error', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get bus information'
    });
  }
});

export default router;

