import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { logger } from '../utils/logger';

interface ClientSubscription {
  ws: WebSocket;
  subscriptions: Set<string>;
}

const clients = new Map<string, ClientSubscription>();
let wss: WebSocketServer | null = null;

export function setupWebSocket(server: Server): void {
  wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws: WebSocket, req) => {
    const clientId = `${Date.now()}-${Math.random()}`;
    clients.set(clientId, { ws, subscriptions: new Set() });

    logger.info(`WebSocket client connected: ${clientId}`);

    ws.on('message', (message: string) => {
      try {
        const data = JSON.parse(message.toString());
        handleMessage(clientId, data);
      } catch (error) {
        logger.error('WebSocket message parse error', error);
        sendError(ws, 'Invalid message format');
      }
    });

    ws.on('close', () => {
      logger.info(`WebSocket client disconnected: ${clientId}`);
      clients.delete(clientId);
    });

    ws.on('error', (error) => {
      logger.error(`WebSocket error for client ${clientId}`, error);
    });

    // Send welcome message
    ws.send(JSON.stringify({
      type: 'connected',
      clientId,
      timestamp: new Date().toISOString()
    }));
  });

  logger.info('WebSocket server initialized');
}

function handleMessage(clientId: string, data: any): void {
  const client = clients.get(clientId);
  if (!client) return;

  switch (data.type) {
    case 'subscribe':
      if (data.topics && Array.isArray(data.topics)) {
        data.topics.forEach((topic: string) => {
          client.subscriptions.add(topic);
        });
        sendToClient(client.ws, {
          type: 'subscribed',
          topics: Array.from(client.subscriptions)
        });
      }
      break;

    case 'unsubscribe':
      if (data.topics && Array.isArray(data.topics)) {
        data.topics.forEach((topic: string) => {
          client.subscriptions.delete(topic);
        });
        sendToClient(client.ws, {
          type: 'unsubscribed',
          topics: Array.from(client.subscriptions)
        });
      }
      break;

    case 'ping':
      sendToClient(client.ws, { type: 'pong', timestamp: new Date().toISOString() });
      break;

    default:
      logger.warn(`Unknown message type: ${data.type}`);
  }
}

export function websocketBroadcast(type: string, data: any, topic?: string): void {
  const message = JSON.stringify({
    type,
    data,
    timestamp: new Date().toISOString()
  });

  let broadcastCount = 0;
  clients.forEach((client) => {
    // If topic specified, only send to subscribed clients
    if (topic && !client.subscriptions.has(topic)) {
      return;
    }

    if (client.ws.readyState === WebSocket.OPEN) {
      try {
        client.ws.send(message);
        broadcastCount++;
      } catch (error) {
        logger.error('WebSocket broadcast error', error);
      }
    }
  });

  if (broadcastCount > 0) {
    logger.debug(`Broadcasted ${type} to ${broadcastCount} clients`);
  }
}

function sendToClient(ws: WebSocket, data: any): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

function sendError(ws: WebSocket, message: string): void {
  sendToClient(ws, {
    type: 'error',
    message,
    timestamp: new Date().toISOString()
  });
}

export function getConnectedClientsCount(): number {
  return clients.size;
}

