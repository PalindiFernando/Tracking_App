import { Router, Request, Response } from 'express';
import { ETACalculationService } from '../services/etaCalculation';
import { createError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

const router = Router();

/**
 * GET /api/eta/:vehicleId/:stopId
 * Get ETA for a specific vehicle to a stop
 */
router.get('/:vehicleId/:stopId', async (req: Request, res: Response) => {
  try {
    const { vehicleId, stopId } = req.params;
    const eta = await ETACalculationService.calculateETA(vehicleId, stopId);

    res.json({
      success: true,
      data: eta
    });
  } catch (error: any) {
    logger.error('Get ETA error', error);
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      error: error.message || 'Failed to get ETA'
    });
  }
});

/**
 * GET /api/eta/stop/:stopId
 * Get ETAs for all buses approaching a stop
 */
router.get('/stop/:stopId', async (req: Request, res: Response) => {
  try {
    const { stopId } = req.params;
    const routeId = req.query.routeId as string | undefined;
    const etas = await ETACalculationService.getETAsForStop(stopId, routeId);

    res.json({
      success: true,
      data: etas
    });
  } catch (error: any) {
    logger.error('Get ETAs for stop error', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get ETAs for stop'
    });
  }
});

/**
 * POST /api/eta/batch
 * Calculate ETAs for multiple vehicle-stop pairs
 */
router.post('/batch', async (req: Request, res: Response) => {
  try {
    const { requests } = req.body; // Array of { vehicle_id, stop_id }

    if (!Array.isArray(requests)) {
      throw createError('Invalid request format', 400);
    }

    const etas = await Promise.all(
      requests.map((req: { vehicle_id: string; stop_id: string }) =>
        ETACalculationService.calculateETA(req.vehicle_id, req.stop_id)
      )
    );

    res.json({
      success: true,
      data: etas
    });
  } catch (error: any) {
    logger.error('Batch ETA calculation error', error);
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      error: error.message || 'Failed to calculate ETAs'
    });
  }
});

export default router;

