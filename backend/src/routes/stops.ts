import { Router, Request, Response } from 'express';
import { RouteMappingService } from '../services/routeMapping';
import { ETACalculationService } from '../services/etaCalculation';
import { logger } from '../utils/logger';

const router = Router();

/**
 * GET /api/stops
 * Search stops by name or code
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const query = req.query.q as string;
    const limit = parseInt(req.query.limit as string) || 20;

    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Search query required'
      });
    }

    const stops = await RouteMappingService.searchStops(query, limit);

    res.json({
      success: true,
      data: stops
    });
  } catch (error: any) {
    logger.error('Search stops error', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search stops'
    });
  }
});

/**
 * GET /api/stops/:stopId
 * Get stop details
 */
router.get('/:stopId', async (req: Request, res: Response) => {
  try {
    const { stopId } = req.params;
    const stop = await RouteMappingService.getStop(stopId);

    if (!stop) {
      return res.status(404).json({
        success: false,
        error: 'Stop not found'
      });
    }

    res.json({
      success: true,
      data: stop
    });
  } catch (error: any) {
    logger.error('Get stop error', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get stop'
    });
  }
});

/**
 * GET /api/stops/:stopId/eta
 * Get ETAs for all buses approaching this stop
 */
router.get('/:stopId/eta', async (req: Request, res: Response) => {
  try {
    const { stopId } = req.params;
    const routeId = req.query.routeId as string | undefined;

    const etas = await ETACalculationService.getETAsForStop(stopId, routeId);

    res.json({
      success: true,
      data: etas
    });
  } catch (error: any) {
    logger.error('Get stop ETAs error', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get ETAs for stop'
    });
  }
});

export default router;

