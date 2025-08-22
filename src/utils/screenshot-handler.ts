import { Page } from "playwright";
import { writeFile } from "fs/promises";
import { join } from "path";

export class ScreenshotHandler {
  private screenshotDir: string;

  constructor(screenshotDir: string = "./screenshots") {
    this.screenshotDir = screenshotDir;
  }

  async capture(page: Page, name: string, options?: any): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `${name}_${timestamp}.png`;
    const filepath = join(this.screenshotDir, filename);

    const screenshot = await page.screenshot({
      fullPage: true,
      ...options,
    });

    await writeFile(filepath, screenshot);
    return filepath;
  }

  async captureBase64(page: Page): Promise<string> {
    const screenshot = await page.screenshot({
      fullPage: true,
      encoding: "base64",
    });
    return screenshot as unknown as string;
  }

  async compareScreenshots(before: string, after: string): Promise<boolean> {
    // Simple comparison - in production, use image comparison library
    return before !== after;
  }
}
