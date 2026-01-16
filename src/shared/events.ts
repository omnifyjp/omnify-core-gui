/**
 * WebSocket event types for @famgia/omnify-gui
 */

import type { GuiSchema, ValidationError } from './types.js';

// Server → Client events
export interface SchemaChangedEvent {
  type: 'schema:changed';
  payload: {
    name: string;
    schema: GuiSchema;
    source: 'file' | 'editor';
  };
}

export interface SchemaValidatedEvent {
  type: 'schema:validated';
  payload: {
    name: string;
    valid: boolean;
    errors: ValidationError[];
  };
}

export interface SchemasReloadedEvent {
  type: 'schemas:reloaded';
  payload: {
    schemas: Record<string, GuiSchema>;
  };
}

export interface ConnectionReadyEvent {
  type: 'connection:ready';
  payload: {
    schemasDir: string;
    schemaCount: number;
  };
}

// Client → Server events
export interface SchemaSaveRequest {
  type: 'schema:save';
  payload: {
    name: string;
    schema: GuiSchema;
  };
}

export interface SchemaValidateRequest {
  type: 'schema:validate';
  payload: {
    name: string;
    schema: GuiSchema;
  };
}

// Union types
export type ServerEvent =
  | SchemaChangedEvent
  | SchemaValidatedEvent
  | SchemasReloadedEvent
  | ConnectionReadyEvent;

export type ClientEvent = SchemaSaveRequest | SchemaValidateRequest;

export type WsEvent = ServerEvent | ClientEvent;
