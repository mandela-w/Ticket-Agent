import { Page } from "playwright";
import { BaseAdapter } from "./base-adapter";
import { TicketData, SubmissionResult } from "../models/ticket";
import { FormMapping, FormField } from "../models/form-mapping";
import * as selectorsConfig from "../../config/selectors.json";

export class GenericAdapter extends BaseAdapter {
  constructor(url: string) {
    super("generic", url);
  }

  async detectForm(page: Page): Promise<FormMapping> {
    const formStructure = await this.analyzeFormStructure(page);

    return {
      platform: "generic",
      url: this.url,
      fields: {
        email: await this.findField(page, "email", formStructure),
        subject: await this.findField(page, "subject", formStructure),
        description: await this.findField(page, "description", formStructure),
      },
      submitButton: await this.findSubmitButton(page),
      successIndicators: ["thank you", "submitted", "received", "success"],
    };
  }

  private async analyzeFormStructure(page: Page): Promise<any> {
    return await page.evaluate(() => {
      const inputs = Array.from(
        document.querySelectorAll("input, textarea, select")
      );

      return inputs.map((el) => {
        const rect = el.getBoundingClientRect();
        return {
          tag: el.tagName.toLowerCase(),
          type: el.getAttribute("type"),
          name: el.getAttribute("name"),
          id: el.id,
          className: el.className,
          placeholder: el.getAttribute("placeholder"),
          ariaLabel: el.getAttribute("aria-label"),
          required: el.hasAttribute("required"),
          visible: rect.width > 0 && rect.height > 0,
          selector: this.generateSelector(el),
        };
      });
    });
  }

  private generateSelector(element: Element): string {
    if (element.id) return `#${element.id}`;
    if (element.className) {
      const classes = element.className.split(" ").filter((c) => c);
      if (classes.length) return `.${classes.join(".")}`;
    }
    if (element.getAttribute("name")) {
      return `${element.tagName.toLowerCase()}[name="${element.getAttribute(
        "name"
      )}"]`;
    }
    return element.tagName.toLowerCase();
  }

  private async findField(
    page: Page,
    fieldType: string,
    structure: any[]
  ): Promise<FormField> {
    const patterns = selectorsConfig.commonPatterns[fieldType];

    // Score each element based on how well it matches our patterns
    const candidates = structure.map((el) => {
      let score = 0;

      // Check attributes
      patterns.attributes?.forEach((attr) => {
        if (this.matchesPattern(el, attr)) score += 3;
      });

      // Check labels
      patterns.labels?.forEach((label) => {
        const text = `${el.name} ${el.id} ${el.ariaLabel}`.toLowerCase();
        if (text.includes(label.toLowerCase())) score += 2;
      });

      // Check placeholders
      patterns.placeholders?.forEach((placeholder) => {
        if (el.placeholder?.toLowerCase().includes(placeholder.toLowerCase())) {
          score += 2;
        }
      });

      // Bonus for correct tag type
      if (patterns.tags?.includes(el.tag)) score += 1;

      return { ...el, score };
    });

    // Sort by score and take the best match
    candidates.sort((a, b) => b.score - a.score);
    const bestMatch = candidates[0];

    return {
      selector: bestMatch?.selector || "",
      type: this.mapFieldType(fieldType, bestMatch?.type),
      required: bestMatch?.required || false,
    };
  }

  private matchesPattern(element: any, pattern: string): boolean {
    if (pattern.includes("*=")) {
      const [attr, value] = pattern.split("*=");
      const attrValue = element[attr.replace("[", "")];
      return attrValue?.includes(value.replace("]", ""));
    } else if (pattern.includes("=")) {
      const [attr, value] = pattern.split("=");
      return element[attr] === value;
    }
    return false;
  }

  private mapFieldType(
    fieldName: string,
    htmlType: string | null
  ): "text" | "email" | "textarea" | "select" {
    if (fieldName === "description") return "textarea";
    if (fieldName === "email") return "email";
    if (htmlType === "select-one") return "select";
    return "text";
  }

  private async findSubmitButton(page: Page): Promise<string> {
    const patterns = selectorsConfig.commonPatterns.submit;

    // Try each pattern
    for (const text of patterns.text) {
      const selector = `button:has-text("${text}"), input[value*="${text}"]`;
      const element = await page.$(selector);
      if (element) return selector;
    }

    // Fallback to type=submit
    return 'button[type="submit"], input[type="submit"]';
  }

  async fillForm(page: Page, ticketData: TicketData): Promise<void> {
    const mapping = await this.detectForm(page);

    // Fill each field
    if (mapping.fields.email?.selector) {
      await this.tryMultipleSelectors(
        page,
        [mapping.fields.email.selector],
        "fill",
        ticketData.email
      );
    }

    if (mapping.fields.subject?.selector) {
      await this.tryMultipleSelectors(
        page,
        [mapping.fields.subject.selector],
        "fill",
        ticketData.subject
      );
    }

    if (mapping.fields.description?.selector) {
      await this.tryMultipleSelectors(
        page,
        [mapping.fields.description.selector],
        "fill",
        ticketData.description
      );
    }
  }

  async submitForm(page: Page): Promise<void> {
    const submitButton = await this.findSubmitButton(page);
    await this.waitAndClick(page, submitButton);
    await page.waitForTimeout(3000);
  }

  async verifySubmission(page: Page): Promise<SubmissionResult> {
    const pageContent = await page.content();
    const url = page.url();

    // Check if URL changed (often indicates success)
    const urlChanged = url !== this.url;

    // Check for success keywords
    const successKeywords = [
      "thank",
      "success",
      "submitted",
      "received",
      "confirmation",
    ];
    const hasSuccessKeyword = successKeywords.some((keyword) =>
      pageContent.toLowerCase().includes(keyword)
    );

    const success = urlChanged || hasSuccessKeyword;

    return {
      success,
      confirmationMessage: success ? "Form submitted successfully" : undefined,
      error: success ? undefined : "Could not confirm submission",
      platform: this.platform,
      timestamp: new Date(),
    };
  }
}
