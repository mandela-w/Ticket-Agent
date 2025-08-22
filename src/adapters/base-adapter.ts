// src/adapters/base-adapter.ts
import { Page } from "playwright";
import { TicketData, SubmissionResult } from "../models/ticket";
import { FormMapping } from "../models/form-mapping";

export abstract class BaseAdapter {
  protected platform: string;
  protected url: string;

  constructor(platform: string, url: string) {
    this.platform = platform;
    this.url = url;
  }

  // Abstract methods cannot be async - return Promise instead
  abstract detectForm(page: Page): Promise<FormMapping>;
  abstract fillForm(page: Page, ticketData: TicketData): Promise<void>;
  abstract submitForm(page: Page): Promise<void>;
  abstract verifySubmission(page: Page): Promise<SubmissionResult>;

  async execute(page: Page, ticketData: TicketData): Promise<SubmissionResult> {
    try {
      // Navigate to form
      await page.goto(this.url, { waitUntil: "networkidle" });

      // Detect form structure
      const formMapping = await this.detectForm(page);

      // Fill the form
      await this.fillForm(page, ticketData);

      // Submit
      await this.submitForm(page);

      // Verify
      return await this.verifySubmission(page);
    } catch (error) {
      // Type error properly
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: errorMessage,
        platform: this.platform,
        timestamp: new Date(),
      };
    }
  }

  protected async waitAndFill(
    page: Page,
    selector: string,
    value: string,
    options = { timeout: 5000 }
  ): Promise<void> {
    await page.waitForSelector(selector, options);
    await page.fill(selector, value);
  }

  protected async waitAndClick(
    page: Page,
    selector: string,
    options = { timeout: 5000 }
  ): Promise<void> {
    await page.waitForSelector(selector, options);
    await page.click(selector);
  }

  protected async tryMultipleSelectors(
    page: Page,
    selectors: string[],
    action: "fill" | "click",
    value?: string
  ): Promise<boolean> {
    for (const selector of selectors) {
      try {
        const element = await page.$(selector);
        if (element) {
          if (action === "fill" && value) {
            await page.fill(selector, value);
          } else if (action === "click") {
            await page.click(selector);
          }
          return true;
        }
      } catch {
        continue;
      }
    }
    return false;
  }
}
