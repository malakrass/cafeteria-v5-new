import { nanoid } from "nanoid";

/**
 * Lightweight Server-Side Logger
 * Stores critical operational events for monitoring and debugging.
 */

export type LogLevel = "info" | "warn" | "error";

export interface LogEntry {
  id: string;
  level: LogLevel;
  event: string;
  message: string;
  metadata?: any;
  timestamp: Date;
}

// In-memory log buffer for performance
const logBuffer: LogEntry[] = [];
const MAX_BUFFER_SIZE = 1000;

export const logger = {
  info(event: string, message: string, metadata?: any) {
    this.log("info", event, message, metadata);
  },

  warn(event: string, message: string, metadata?: any) {
    this.log("warn", event, message, metadata);
  },

  error(event: string, message: string, metadata?: any) {
    this.log("error", event, message, metadata);
  },

  log(level: LogLevel, event: string, message: string, metadata?: any) {
    const entry: LogEntry = {
      id: nanoid(),
      level,
      event,
      message,
      metadata,
      timestamp: new Date(),
    };

    // Log to console for immediate visibility in server logs
    const timestampStr = entry.timestamp.toISOString();
    console.log(`[${timestampStr}] [${level.toUpperCase()}] [${event}] ${message}`, metadata ? JSON.stringify(metadata) : "");

    // Add to buffer
    logBuffer.unshift(entry);
    if (logBuffer.length > MAX_BUFFER_SIZE) {
      logBuffer.pop();
    }
  },

  getLogs(limit = 100) {
    return logBuffer.slice(0, limit);
  },

  clearLogs() {
    logBuffer.length = 0;
  }
};
