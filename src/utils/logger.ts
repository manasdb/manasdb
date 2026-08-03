import { LoggerProvider } from '../contracts/index.ts';

export class Logger implements LoggerProvider {
  constructor(private readonly prefix: string = 'ManasDB') {}

  public info(message: string, context?: any): void {
    console.log(`[${this.prefix}] [INFO] ${message}`, context || '');
  }

  public warn(message: string, context?: any): void {
    console.warn(`[${this.prefix}] [WARN] ${message}`, context || '');
  }

  public error(message: string, error?: any, context?: any): void {
    console.error(`[${this.prefix}] [ERROR] ${message}`, error || '', context || '');
  }

  public debug(message: string, context?: any): void {
    // Check if debug is enabled globally (future config)
    if (process.env.MANAS_DEBUG) {
      console.debug(`[${this.prefix}] [DEBUG] ${message}`, context || '');
    }
  }
}
