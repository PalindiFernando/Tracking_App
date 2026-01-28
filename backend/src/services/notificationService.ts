import { db } from '../database/connection';
import { logger } from '../utils/logger';

export interface NotificationData {
  vehicle_id?: string;
  route_id?: string;
  stop_id?: string;
  eta_minutes?: number;
  delay_minutes?: number;
  alternative_route_id?: string;
  [key: string]: any;
}

export class NotificationService {
  /**
   * Send notification to a user
   */
  static async sendNotification(
    userId: number,
    type: 'bus_approaching' | 'delay_alert' | 'route_suggestion' | 'system_alert' | 'trip_update',
    title: string,
    message: string,
    data?: NotificationData
  ): Promise<void> {
    try {
      await db.query(
        `INSERT INTO notifications (user_id, notification_type, title, message, data)
         VALUES ($1, $2, $3, $4, $5)`,
        [userId, type, title, message, data ? JSON.stringify(data) : null]
      );

      logger.info(`Notification sent to user ${userId}: ${type}`);
    } catch (error) {
      logger.error('Send notification error', error);
      throw error;
    }
  }

  /**
   * Send notification to multiple users
   */
  static async sendBulkNotification(
    userIds: number[],
    type: 'bus_approaching' | 'delay_alert' | 'route_suggestion' | 'system_alert' | 'trip_update',
    title: string,
    message: string,
    data?: NotificationData
  ): Promise<void> {
    try {
      const values = userIds.map((userId, index) => {
        const baseIndex = index * 5;
        return `($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3}, $${baseIndex + 4}, $${baseIndex + 5})`;
      }).join(', ');

      const params: any[] = [];
      userIds.forEach(userId => {
        params.push(userId, type, title, message, data ? JSON.stringify(data) : null);
      });

      await db.query(
        `INSERT INTO notifications (user_id, notification_type, title, message, data)
         VALUES ${values}`,
        params
      );

      logger.info(`Bulk notification sent to ${userIds.length} users: ${type}`);
    } catch (error) {
      logger.error('Send bulk notification error', error);
      throw error;
    }
  }

  /**
   * Notify passengers when bus is approaching their stop
   */
  static async notifyBusApproaching(
    stopId: string,
    vehicleId: string,
    routeId: string,
    etaMinutes: number
  ): Promise<void> {
    try {
      // Find passengers who have favorited this stop or are tracking this route
      const users = await db.query(
        `SELECT DISTINCT u.id
         FROM users u
         JOIN passenger_favorites pf ON u.id = pf.user_id
         WHERE u.role = 'passenger'
         AND u.is_active = TRUE
         AND (
           (pf.favorite_type = 'stop' AND pf.favorite_id = $1) OR
           (pf.favorite_type = 'route' AND pf.favorite_id = $2) OR
           (pf.favorite_type = 'bus' AND pf.favorite_id = $3)
         )`,
        [stopId, routeId, vehicleId]
      );

      if (users.rows.length > 0) {
        const userIds = users.rows.map(u => u.id);
        await this.sendBulkNotification(
          userIds,
          'bus_approaching',
          'Bus Approaching',
          `Your bus ${vehicleId} is arriving in ${etaMinutes} minute${etaMinutes !== 1 ? 's' : ''}`,
          { vehicle_id: vehicleId, route_id: routeId, stop_id: stopId, eta_minutes: etaMinutes }
        );
      }
    } catch (error) {
      logger.error('Notify bus approaching error', error);
    }
  }

  /**
   * Notify passengers about delays and suggest alternatives
   */
  static async notifyDelay(
    routeId: string,
    delayMinutes: number,
    alternativeRouteIds?: string[]
  ): Promise<void> {
    try {
      // Find passengers tracking this route
      const users = await db.query(
        `SELECT DISTINCT u.id
         FROM users u
         JOIN passenger_favorites pf ON u.id = pf.user_id
         WHERE u.role = 'passenger'
         AND u.is_active = TRUE
         AND pf.favorite_type = 'route'
         AND pf.favorite_id = $1`,
        [routeId]
      );

      if (users.rows.length > 0) {
        const userIds = users.rows.map(u => u.id);
        const message = alternativeRouteIds && alternativeRouteIds.length > 0
          ? `Route ${routeId} is delayed by ${delayMinutes} minutes. Consider alternative routes: ${alternativeRouteIds.join(', ')}`
          : `Route ${routeId} is delayed by ${delayMinutes} minutes`;

        await this.sendBulkNotification(
          userIds,
          'delay_alert',
          'Route Delay',
          message,
          { route_id: routeId, delay_minutes: delayMinutes, alternative_route_id: alternativeRouteIds?.[0] }
        );
      }
    } catch (error) {
      logger.error('Notify delay error', error);
    }
  }

  /**
   * Notify driver about schedule changes or alerts
   */
  static async notifyDriver(
    driverId: number,
    type: 'trip_update' | 'system_alert',
    title: string,
    message: string,
    data?: NotificationData
  ): Promise<void> {
    await this.sendNotification(driverId, type, title, message, data);
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(notificationId: number, userId: number): Promise<void> {
    try {
      await db.query(
        `UPDATE notifications
         SET is_read = TRUE, read_at = CURRENT_TIMESTAMP
         WHERE id = $1 AND user_id = $2`,
        [notificationId, userId]
      );
    } catch (error) {
      logger.error('Mark notification as read error', error);
      throw error;
    }
  }

  /**
   * Get unread notification count for user
   */
  static async getUnreadCount(userId: number): Promise<number> {
    try {
      const result = await db.query(
        `SELECT COUNT(*) as count
         FROM notifications
         WHERE user_id = $1 AND is_read = FALSE`,
        [userId]
      );

      return parseInt(result.rows[0].count);
    } catch (error) {
      logger.error('Get unread count error', error);
      return 0;
    }
  }
}

