// src/adapters/generic-adapter.ts
import { Page } from "playwright";
import { BaseAdapter } from "./base-adapter";
import { TicketData, SubmissionResult } from "../models/ticket";
import { FormMapping, FormField } from "../models/form-mapping";

// Define the structure for form elements
interface FormElement {
  tag: string;
  type: string | null;
  name: string | null;
  id: string;
  className: string;
  placeholder: string | null;
  ariaLabel: string | null;
  required: boolean;
  visible: boolean;
  selector: string;
  score?: number;
}

// Define the structure for selector patterns
interface SelectorPatterns {
  attributes?: string[];
  labels?: string[];
  placeholders?: string[];
  tags?: string[];
  text?: string[];
}

interface SelectorsConfig {
  commonPatterns: {
    [key: string]: SelectorPatterns;
  };
}

const selectorsConfig: SelectorsConfig = require("../../config/selectors.json");

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

  private async analyzeFormStructure(page: Page): Promise<FormElement[]> {
    // Execute in browser context
    const formElements = await page.evaluate(() => {
      const generateSelector = (element: any): string => {
        if (element.id) return `#${element.id}`;
        if (element.className) {
          const classes = element.className.split(" ").filter((c: any) => c);
          if (classes.length) return `.${classes.join(".")}`;
        }
        const name = element.getAttribute("name");
        if (name) {
          return `${element.tagName.toLowerCase()}[name="${name}"]`;
        }
        return element.tagName.toLowerCase();
      };

      // Get all form inputs
      const inputs = Array.from(
        document.querySelectorAll("input, textarea, select")
      );

      // Map to our structure
      return inputs.map((el: any) => {
        const rect = el.getBoundingClientRect();

        return {
          tag: el.tagName.toLowerCase(),
          type: el.getAttribute("type"),
          name: el.getAttribute("name"),
          id: el.id || "",
          className: el.className || "",
          placeholder: el.getAttribute("placeholder"),
          ariaLabel: el.getAttribute("aria-label"),
          required: el.hasAttribute("required"),
          visible: rect.width > 0 && rect.height > 0,
          selector: generateSelector(el),
        };
      });
    });

    // Type assertion to ensure TypeScript knows the return type
    return formElements as FormElement[];
  }

  private async findField(
    _page: Page,
    fieldType: string,
    structure: FormElement[]
  ): Promise<FormField> {
    const patterns = selectorsConfig.commonPatterns[fieldType];

    if (!patterns) {
      return {
        selector: "",
        type: "text",
        required: false,
      };
    }

    // Score each element based on how well it matches our patterns
    const candidates = structure.map((el: FormElement) => {
      let score = 0;

      // Check attributes
      patterns.attributes?.forEach((attr: string) => {
        if (this.matchesPattern(el, attr)) score += 3;
      });

      // Check labels
      patterns.labels?.forEach((label: string) => {
        const text = `${el.name || ""} ${el.id || ""} ${
          el.ariaLabel || ""
        }`.toLowerCase();
        if (text.includes(label.toLowerCase())) score += 2;
      });

      // Check placeholders
      patterns.placeholders?.forEach((placeholder: string) => {
        if (el.placeholder?.toLowerCase().includes(placeholder.toLowerCase())) {
          score += 2;
        }
      });

      // Bonus for correct tag type
      if (patterns.tags?.includes(el.tag)) score += 1;

      return { ...el, score };
    });

    // Sort by score and take the best match
    candidates.sort((a, b) => (b.score || 0) - (a.score || 0));
    const bestMatch = candidates[0];

    return {
      selector: bestMatch?.selector || "",
      type: this.mapFieldType(fieldType, bestMatch?.type),
      required: bestMatch?.required || false,
    };
  }

  private matchesPattern(element: FormElement, pattern: string): boolean {
    if (pattern.includes("*=")) {
      const parts = pattern.split("*=");
      if (parts.length !== 2) return false;

      const cleanAttr = parts[0].replace("[", "");
      const cleanValue = parts[1].replace("]", "");

      // Map attribute names to element properties
      const attrValue = this.getElementAttribute(element, cleanAttr);
      return attrValue ? attrValue.includes(cleanValue) : false;
    } else if (pattern.includes("=")) {
      const parts = pattern.split("=");
      if (parts.length !== 2) return false;

      const attrValue = this.getElementAttribute(element, parts[0]);
      return attrValue === parts[1];
    }
    return false;
  }

  private getElementAttribute(
    element: FormElement,
    attr: string
  ): string | null {
    switch (attr) {
      case "type":
        return element.type;
      case "name":
        return element.name;
      case "id":
        return element.id;
      case "class":
        return element.className;
      case "placeholder":
        return element.placeholder;
      default:
        return null;
    }
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

    if (!patterns || !patterns.text) {
      return 'button[type="submit"], input[type="submit"]';
    }

    // Try each pattern
    for (const text of patterns.text) {
      // Use a more compatible selector format
      const selectors = [
        `button:text("${text}")`,
        `input[value*="${text}"]`,
        `button:has-text("${text}")`,
      ];

      for (const selector of selectors) {
        try {
          const element = await page.$(selector).catch(() => null);
          if (element) {
            await element.dispose();
            return selector;
          }
        } catch (error) {
          // Selector might not be valid, continue to next
          continue;
        }
      }
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
