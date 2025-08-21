import { chromium, Browser, Page, BrowserContext } from "playwright";

export class BrowserController {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;

  async launch(options?: any): Promise<void> {
    this.browser = await chromium.launch({
      headless: false, // Set to true for production
      slowMo: 100, // Slow down for demo visibility
      ...options,
    });

    this.context = await this.browser.newContext({
      viewport: { width: 1280, height: 720 },
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    });
  }

  async newPage(): Promise<Page> {
    if (!this.context) {
      throw new Error("Browser not initialized");
    }
    return await this.context.newPage();
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
    }
  }
}
