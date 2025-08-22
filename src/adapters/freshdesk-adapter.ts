import { Page } from "playwright";
import { BaseAdapter } from "./base-adapter";
import { TicketData, SubmissionResult } from "../models/ticket";
import { FormMapping } from "../models/form-mapping";

export class FreshdeskAdapter extends BaseAdapter {
  constructor() {
    super("freshdesk", "https://demo.freshdesk.com/support/tickets/new");
  }

  async detectForm(_page: Page): Promise<FormMapping> {
    // Freshdesk has predictable selectors
    return {
      platform: "freshdesk",
      url: this.url,
      fields: {
        email: {
          selector: "#helpdesk_ticket_email",
          type: "email",
          required: true,
        },
        subject: {
          selector: "#helpdesk_ticket_subject",
          type: "text",
          required: true,
        },
        description: {
          selector: "#helpdesk_ticket_description",
          type: "textarea",
          required: true,
        },
        priority: {
          selector: "#helpdesk_ticket_priority",
          type: "select",
          required: false,
        },
      },
      submitButton: 'input[type="submit"], button[type="submit"]',
      successIndicators: [
        "ticket has been created",
        "thank you",
        "reference number",
      ],
    };
  }

  async fillForm(page: Page, ticketData: TicketData): Promise<void> {
    // Fill email
    await this.waitAndFill(page, "#helpdesk_ticket_email", ticketData.email);

    // Fill subject
    await this.waitAndFill(
      page,
      "#helpdesk_ticket_subject",
      ticketData.subject
    );

    // Fill description
    await this.waitAndFill(
      page,
      "#helpdesk_ticket_description",
      ticketData.description
    );

    // Set priority if available
    if (ticketData.priority) {
      const priorityMap: Record<string, string> = {
        low: "1",
        medium: "2",
        high: "3",
        urgent: "4",
      };

      const priorityValue = priorityMap[ticketData.priority] || "2";
      await page.selectOption("#helpdesk_ticket_priority", priorityValue);
    }
  }

  async submitForm(page: Page): Promise<void> {
    await this.waitAndClick(page, 'input[type="submit"]');
    await page.waitForTimeout(3000); // Wait for submission
  }

  async verifySubmission(page: Page): Promise<SubmissionResult> {
    try {
      // Look for success message
      await page.waitForSelector(".notice", { timeout: 5000 });

      const successText = await page.textContent(".notice");
      const ticketId = this.extractTicketId(successText || "");

      return {
        success: true,
        ticketId,
        confirmationMessage: successText || "Ticket submitted successfully",
        platform: this.platform,
        timestamp: new Date(),
      };
    } catch {
      return {
        success: false,
        error: "Could not verify submission",
        platform: this.platform,
        timestamp: new Date(),
      };
    }
  }

  private extractTicketId(text: string): string | undefined {
    const match = text.match(/#(\d+)/);
    return match ? match[1] : undefined;
  }
}
