import fs from 'fs';
import path from 'path';

export interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  data?: any;
}

class Logger {
  private logDir: string;
  private logFile: string;

  constructor() {
    this.logDir = path.join(process.cwd(), 'logs');
    this.logFile = path.join(this.logDir, 'app.log');
    this.ensureLogDirectory();
  }

  private ensureLogDirectory(): void {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  private formatMessage(level: string, message: string, data?: any): string {
    const timestamp = new Date().toISOString();
    const logEntry: LogEntry = { timestamp, level: level as LogEntry['level'], message };
    
    if (data) {
      logEntry.data = typeof data === 'object' ? JSON.stringify(data) : data;
    }

    return JSON.stringify(logEntry);
  }

  private writeToFile(formattedMessage: string): void {
    try {
      fs.appendFileSync(this.logFile, formattedMessage + '\n');
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  info(message: string, data?: any): void {
    const formatted = this.formatMessage('info', message, data);
    console.log(`[INFO] ${message}`, data || '');
    this.writeToFile(formatted);
  }

  warn(message: string, data?: any): void {
    const formatted = this.formatMessage('warn', message, data);
    console.warn(`[WARN] ${message}`, data || '');
    this.writeToFile(formatted);
  }

  error(message: string, data?: any): void {
    const formatted = this.formatMessage('error', message, data);
    console.error(`[ERROR] ${message}`, data || '');
    this.writeToFile(formatted);
  }

  debug(message: string, data?: any): void {
    if (process.env.NODE_ENV === 'development') {
      const formatted = this.formatMessage('debug', message, data);
      console.debug(`[DEBUG] ${message}`, data || '');
      this.writeToFile(formatted);
    }
  }
}

export const logger = new Logger();