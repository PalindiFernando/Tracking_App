import { Router, Request, Response } from 'express';
import { RouteMappingService } from '../services/routeMapping';
import { logger } from '../utils/logger';

const router = Router();

/**
 * GET /api/routes
 * Get all routes
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const routes = await RouteMappingService.getAllRoutes();

    res.json({
      success: true,
      data: routes
    });
  } catch (error: any) {
    logger.error('Get routes error', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get routes'
    });
  }
});

/**
 * GET /api/routes/:routeId
 * Get route details
 */
router.get('/:routeId', async (req: Request, res: Response) => {
  try {
    const { routeId } = req.params;
    const route = await RouteMappingService.getRoute(routeId);

    if (!route) {
      return res.status(404).json({
        success: false,
        error: 'Route not found'
      });
    }

    res.json({
      success: true,
      data: route
    });
  } catch (error: any) {
    logger.error('Get route error', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get route'
    });
  }
});

/**
 * GET /api/routes/:routeId/stops
 * Get stops for a route
 */
router.get('/:routeId/stops', async (req: Request, res: Response) => {
  try {
    const { routeId } = req.params;
    const direction = (req.query.direction as 'inbound' | 'outbound') || 'outbound';

    const stops = await RouteMappingService.getRouteStops(routeId, direction);

    res.json({
      success: true,
      data: stops
    });
  } catch (error: any) {
    logger.error('Get route stops error', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get route stops'
    });
  }
});

export default router;

