import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';

const logDir = path.join(process.cwd(), 'logs');

// Custom format for better readability
const customFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.colorize({ all: true }),
  winston.format.printf(({ level, message, timestamp, stack, ...meta }) => {
    let logMessage = `${timestamp} [${level}] ${message}`;
    
    // Add stack trace for errors
    if (stack) {
      logMessage += `\n${stack}`;
    }
    
    // Add metadata if present
    if (Object.keys(meta).length > 0) {
      logMessage += `\n${JSON.stringify(meta, null, 2)}`;
    }
    
    return logMessage;
  })
);

// Create Winston logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: customFormat,
  transports: [
    // Console transport for development
    new winston.transports.Console({
      level: process.env.NODE_ENV === 'production' ? 'warn' : 'debug'
    }),
    
    // File transport for all logs
    new DailyRotateFile({
      filename: path.join(logDir, 'app-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d',
      zippedArchive: true,
      level: 'info'
    }),
    
    // Error file transport
    new DailyRotateFile({
      filename: path.join(logDir, 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '10m',
      maxFiles: '30d',
      zippedArchive: true,
      level: 'error'
    })
  ],
  // Handle uncaught exceptions and unhandled rejections
  exceptionHandlers: [
    new DailyRotateFile({
      filename: path.join(logDir, 'exceptions-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '10m',
      maxFiles: '14d',
      zippedArchive: true
    })
  ],
  rejectionHandlers: [
    new DailyRotateFile({
      filename: path.join(logDir, 'rejections-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxSize: '10m', 
      maxFiles: '14d',
      zippedArchive: true
    })
  ]
});

export { logger };