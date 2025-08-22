export class Logger {
  private context: string;

  constructor(context: string) {
    this.context = context;
  }

  info(message: string, ...args: any[]): void {
    console.log(`[${this.context}] INFO:`, message, ...args);
  }

  debug(message: string, ...args: any[]): void {
    console.log(`[${this.context}] DEBUG:`, message, ...args);
  }

  error(message: string, error?: any): void {
    if (error) {
      console.error(`[${this.context}] ERROR:`, message, error);
    } else {
      console.error(`[${this.context}] ERROR:`, message);
    }
  }

  warn(message: string, ...args: any[]): void {
    console.warn(`[${this.context}] WARN:`, message, ...args);
  }
}
