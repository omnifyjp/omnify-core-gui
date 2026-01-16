/**
 * WebSocket handler for real-time updates
 */

import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';
import type { ServerEvent, ClientEvent } from '../../shared/events.js';

export interface WsHandler {
  broadcast: (event: ServerEvent) => void;
  close: () => void;
}

export function createWsHandler(server: Server): WsHandler {
  const wss = new WebSocketServer({ server, path: '/ws' });
  const clients = new Set<WebSocket>();

  wss.on('connection', (ws: WebSocket) => {
    clients.add(ws);
    console.log('  WebSocket client connected');

    // Send ready event
    const readyEvent: ServerEvent = {
      type: 'connection:ready',
      payload: {
        schemasDir: process.env.SCHEMAS_DIR ?? 'schemas',
        schemaCount: 0,
      },
    };
    ws.send(JSON.stringify(readyEvent));

    ws.on('message', (data: Buffer) => {
      try {
        const event = JSON.parse(data.toString()) as ClientEvent;
        handleClientEvent(event, ws);
      } catch {
        console.error('Invalid WebSocket message');
      }
    });

    ws.on('close', () => {
      clients.delete(ws);
      console.log('  WebSocket client disconnected');
    });

    ws.on('error', (error: Error) => {
      console.error('WebSocket error:', error);
      clients.delete(ws);
    });
  });

  function handleClientEvent(_event: ClientEvent, _ws: WebSocket): void {
    // Handle client events (save, validate requests)
    // These are handled by the REST API, but could be used for
    // real-time validation feedback
  }

  function broadcast(event: ServerEvent): void {
    const message = JSON.stringify(event);
    for (const client of clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    }
  }

  function close(): void {
    for (const client of clients) {
      client.close();
    }
    wss.close();
  }

  return { broadcast, close };
}
