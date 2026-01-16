/**
 * WebSocket connection state management
 */

import { create } from 'zustand';
import type { ServerEvent } from '../../shared/events.js';
import { useSchemaStore } from './schemaStore.js';

interface WsStore {
  // State
  connected: boolean;
  socket: WebSocket | null;

  // Actions
  connect: () => void;
  disconnect: () => void;
}

export const useWsStore = create<WsStore>((set, get) => ({
  // Initial state
  connected: false,
  socket: null,

  // Actions
  connect: () => {
    const { socket } = get();
    if (socket) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('WebSocket connected');
      set({ connected: true, socket: ws });
    };

    ws.onmessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data as string) as ServerEvent;
        handleServerEvent(data);
      } catch {
        console.error('Invalid WebSocket message');
      }
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      set({ connected: false, socket: null });

      // Reconnect after 3 seconds
      setTimeout(() => {
        get().connect();
      }, 3000);
    };

    ws.onerror = (error: Event) => {
      console.error('WebSocket error:', error);
    };
  },

  disconnect: () => {
    const { socket } = get();
    if (socket) {
      socket.close();
      set({ connected: false, socket: null });
    }
  },
}));

function handleServerEvent(event: ServerEvent): void {
  const schemaStore = useSchemaStore.getState();

  switch (event.type) {
    case 'schema:changed':
      schemaStore.updateSchemaInStore(event.payload.name, event.payload.schema);
      break;

    case 'schemas:reloaded':
      schemaStore.setSchemas(event.payload.schemas);
      break;

    case 'connection:ready':
      console.log(`Connected to schemas at: ${event.payload.schemasDir}`);
      break;

    default:
      break;
  }
}
