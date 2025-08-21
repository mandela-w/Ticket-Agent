import { Page } from "playwright";
import { TicketData, SubmissionResult } from "../models/ticket";
import { BrowserController } from "../browser/browser-controller";
import { LLMAnalyzer } from "./llm-analyzer";
import { ActionPlanner } from "./action-planner";
import { DOMAnalyzer } from "../browser/dom-analyzer";
import { Logger } from "../utils/logger";

export class UniversalTicketAgent {
  private browserController: BrowserController;
  private llmAnalyzer: LLMAnalyzer;
  private actionPlanner: ActionPlanner;
  private domAnalyzer: DOMAnalyzer;
  private logger: Logger;

  constructor(config?: AgentConfig) {
    this.browserController = new BrowserController();
    this.llmAnalyzer = new LLMAnalyzer(config?.llmProvider || "openai");
    this.actionPlanner = new ActionPlanner();
    this.domAnalyzer = new DOMAnalyzer();
    this.logger = new Logger("UniversalTicketAgent");
  }

  async initialize(): Promise<void> {
    this.logger.info("Initializing Universal Ticket Agent...");
    await this.browserController.launch();
  }

  async submitTicket(
    ticketData: TicketData,
    platforms: string[]
  ): Promise<SubmissionResult[]> {
    const results: SubmissionResult[] = [];

    for (const platform of platforms) {
      try {
        this.logger.info(`Processing ticket submission for ${platform}`);
        const result = await this.submitToPlatform(ticketData, platform);
        results.push(result);
      } catch (error) {
        this.logger.error(`Failed to submit to ${platform}:`, error);
        results.push({
          success: false,
          error: error.message,
          platform,
          timestamp: new Date(),
        });
      }
    }

    return results;
  }

  private async submitToPlatform(
    ticketData: TicketData,
    platform: string
  ): Promise<SubmissionResult> {
    const page = await this.browserController.newPage();

    try {
      // Step 1: Navigate to platform
      const platformUrl = this.getPlatformUrl(platform);
      await page.goto(platformUrl);

      // Step 2: Analyze page structure
      const pageStructure = await this.domAnalyzer.analyzePage(page);

      // Step 3: Use LLM to understand form fields
      const formMapping = await this.llmAnalyzer.analyzeForm(
        pageStructure,
        ticketData
      );

      // Step 4: Create action plan
      const actionPlan = await this.actionPlanner.createPlan(
        formMapping,
        ticketData
      );

      // Step 5: Execute plan
      const result = await this.executePlan(page, actionPlan, platform);

      return result;
    } finally {
      await page.close();
    }
  }

  private async executePlan(
    page: Page,
    plan: AgentPlan,
    platform: string
  ): Promise<SubmissionResult> {
    this.logger.info(`Executing plan with ${plan.steps.length} steps`);

    for (const step of plan.steps) {
      await this.executeStep(page, step);
    }

    // Verify submission
    const success = await this.verifySubmission(page);
    const screenshot = await page.screenshot({ encoding: "base64" });

    return {
      success,
      screenshot,
      platform,
      timestamp: new Date(),
      confirmationMessage: success
        ? "Ticket submitted successfully"
        : undefined,
    };
  }

  private async executeStep(page: Page, step: ActionStep): Promise<void> {
    this.logger.debug(`Executing: ${step.description}`);

    switch (step.action) {
      case "fill":
        await page.fill(step.target!, step.value);
        break;
      case "select":
        await page.selectOption(step.target!, step.value);
        break;
      case "click":
        await page.click(step.target!);
        break;
      case "wait":
        await page.waitForTimeout(step.value || 1000);
        break;
      case "verify":
        await page.waitForSelector(step.target!, { timeout: 5000 });
        break;
    }
  }

  private async verifySubmission(page: Page): Promise<boolean> {
    // Check for common success indicators
    const successPatterns = [
      "thank you",
      "submitted",
      "received",
      "ticket.*created",
      "reference.*number",
    ];

    const pageContent = await page.content();
    return successPatterns.some((pattern) =>
      new RegExp(pattern, "i").test(pageContent)
    );
  }

  private getPlatformUrl(platform: string): string {
    const urls: Record<string, string> = {
      freshdesk_demo: "https://demo.freshdesk.com/support/tickets/new",
      typeform_demo: "https://form.typeform.com/to/demo123",
      generic_contact: "https://example.com/contact",
    };
    return urls[platform] || urls.generic_contact;
  }

  async shutdown(): Promise<void> {
    await this.browserController.close();
  }
}
