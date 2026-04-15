export const logger = {
  info: (traceId: string, message: string, meta: Record<string, any> = {}) => {
    if (process.env.NODE_ENV === 'test') return;
    console.log(JSON.stringify({ level: 'INFO', traceId, message, ...meta, timestamp: new Date().toISOString() }));
  },
  error: (traceId: string, message: string, meta: Record<string, any> = {}) => {
    if (process.env.NODE_ENV === 'test') return;
    console.error(JSON.stringify({ level: 'ERROR', traceId, message, ...meta, timestamp: new Date().toISOString() }));
  },
  warn: (traceId: string, message: string, meta: Record<string, any> = {}) => {
    if (process.env.NODE_ENV === 'test') return;
    console.warn(JSON.stringify({ level: 'WARN', traceId, message, ...meta, timestamp: new Date().toISOString() }));
  }
};
