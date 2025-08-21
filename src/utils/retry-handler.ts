export class RetryHandler {
  private maxRetries: number;
  private delayMs: number;
  private backoffMultiplier: number;

  constructor(
    maxRetries: number = 3,
    delayMs: number = 1000,
    backoffMultiplier: number = 2
  ) {
    this.maxRetries = maxRetries;
    this.delayMs = delayMs;
    this.backoffMultiplier = backoffMultiplier;
  }

  async execute<T>(fn: () => Promise<T>, context?: string): Promise<T> {
    let lastError: Error | undefined;
    let delay = this.delayMs;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;

        if (attempt === this.maxRetries) {
          throw new Error(
            `Failed after ${this.maxRetries} attempts${
              context ? ` (${context})` : ""
            }: ${lastError.message}`
          );
        }

        console.log(
          `Attempt ${attempt} failed${
            context ? ` (${context})` : ""
          }, retrying in ${delay}ms...`
        );

        await this.sleep(delay);
        delay *= this.backoffMultiplier;
      }
    }

    throw lastError;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
