// src/services/logger.ts
import pino from 'pino';

const isDev = process.env.NODE_ENV !== 'production';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: isDev
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
});

// In-memory log buffer for admin panel access
const LOG_BUFFER_SIZE = 500;
const logBuffer: { time: string; level: string; msg: string; data?: unknown }[] = [];

const originalChild = logger.child.bind(logger);
logger.child = (bindings) => {
  const child = originalChild(bindings);
  return child;
};

export function pushLogBuffer(level: string, msg: string, data?: unknown) {
  logBuffer.push({
    time: new Date().toISOString(),
    level,
    msg,
    data,
  });
  if (logBuffer.length > LOG_BUFFER_SIZE) logBuffer.shift();
}

export function getLogBuffer(filter?: 'error' | 'warn' | 'info') {
  if (!filter) return logBuffer;
  return logBuffer.filter((l) => l.level === filter);
}

export function clearLogBuffer() {
  logBuffer.length = 0;
}
