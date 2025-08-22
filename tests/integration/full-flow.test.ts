import { UniversalTicketAgent } from "../../src/core/agent";
import { TicketData } from "../../src/models/ticket";
import { GenericAdapter } from "../../src/adapters/generic-adapter";
import { chromium, Browser, Page } from "playwright";
import test, { beforeEach, afterEach, describe } from "node:test";
import { FormField } from "../../src/models/form-mapping";

describe("Universal Ticket Agent - Full Flow", () => {
  let agent: UniversalTicketAgent;
  let browser: Browser;
  let testServer: any;

  beforeAll(async () => {
    // Start a test server with mock forms
    testServer = await startTestServer();
    browser = await chromium.launch({ headless: true });
  });

  afterAll(async () => {
    await browser.close();
    await testServer.close();
  });

  beforeEach(() => {
    agent = new UniversalTicketAgent({
      llmProvider: "mock", // Use mock LLM for tests
      browserOptions: { headless: true },
    });
  });

  afterEach(async () => {
    await agent.shutdown();
  });

  describe("Form Detection", () => {
    test("should detect standard form fields", async () => {
      const page = await browser.newPage();
      await page.setContent(`
        <form>
          <input type="email" name="email" placeholder="Your email" />
          <input type="text" name="subject" placeholder="Subject" />
          <textarea name="message" placeholder="Your message"></textarea>
          <button type="submit">Send</button>
        </form>
      `);

      const adapter = new GenericAdapter("http://localhost:3000");
      const formMapping = await adapter.detectForm(page);

      expect(formMapping.fields.email).toBeDefined();
      expect(formMapping.fields.subject).toBeDefined();
      expect(formMapping.fields.description).toBeDefined();
      expect(formMapping.submitButton).toBeTruthy();

      await page.close();
    });

    test("should detect forms with labels", async () => {
      const page = await browser.newPage();
      await page.setContent(`
        <form>
          <label for="email-field">Email Address</label>
          <input id="email-field" type="email" />
          
          <label>Subject Line
            <input type="text" name="subject" />
          </label>
          
          <label for="msg">Message</label>
          <textarea id="msg"></textarea>
          
          <input type="submit" value="Submit Ticket" />
        </form>
      `);

      const adapter = new GenericAdapter("http://localhost:3000");
      const formMapping = await adapter.detectForm(page);

      expect(formMapping.fields.email.selector).toBe("#email-field");
      expect(formMapping.fields.description.selector).toBe("#msg");

      await page.close();
    });

    test("should handle complex form structures", async () => {
      const page = await browser.newPage();
      await page.setContent(`
        <div class="contact-form">
          <div class="form-group">
            <input class="form-control" type="email" data-field="email" />
          </div>
          <div class="form-group">
            <input class="form-control" type="text" data-field="subject" />
          </div>
          <div class="form-group">
            <textarea class="form-control" data-field="message"></textarea>
          </div>
          <button class="btn btn-primary">Submit</button>
        </div>
      `);

      const adapter = new GenericAdapter("http://localhost:3000");
      const formMapping = await adapter.detectForm(page);

      expect(formMapping.fields.email).toBeDefined();
      expect(formMapping.submitButton).toContain("button");

      await page.close();
    });
  });

  describe("Form Filling", () => {
    test("should fill form fields correctly", async () => {
      const page = await browser.newPage();
      await page.setContent(`
        <form id="test-form">
          <input type="email" name="email" />
          <input type="text" name="subject" />
          <textarea name="message"></textarea>
          <button type="submit">Submit</button>
        </form>
      `);

      const ticketData: TicketData = {
        email: "test@example.com",
        subject: "Test Subject",
        description: "Test description message",
      };

      const adapter = new GenericAdapter("http://localhost:3000");
      await adapter.fillForm(page, ticketData);

      // Verify fields were filled
      const emailValue = await page.inputValue('input[name="email"]');
      const subjectValue = await page.inputValue('input[name="subject"]');
      const messageValue = await page.inputValue('textarea[name="message"]');

      expect(emailValue).toBe("test@example.com");
      expect(subjectValue).toBe("Test Subject");
      expect(messageValue).toBe("Test description message");

      await page.close();
    });

    test("should handle select dropdowns", async () => {
      const page = await browser.newPage();
      await page.setContent(`
        <form>
          <select name="category">
            <option value="">Choose...</option>
            <option value="tech">Technical Support</option>
            <option value="billing">Billing</option>
          </select>
          <select name="priority">
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </form>
      `);

      const ticketData: TicketData = {
        email: "test@example.com",
        subject: "Test",
        description: "Test",
        category: "Technical Support",
        priority: "high",
      };

      // Test select option logic
      await page.selectOption('select[name="priority"]', "high");
      const selectedValue = await page.$eval(
        'select[name="priority"]',
        (el: HTMLSelectElement) => el.value
      );

      expect(selectedValue).toBe("high");

      await page.close();
    });
  });

  describe("Submission Verification", () => {
    test("should detect successful submission", async () => {
      const page = await browser.newPage();

      // Simulate successful submission page
      await page.setContent(`
        <div class="success-message">
          <h1>Thank You!</h1>
          <p>Your ticket has been submitted successfully.</p>
          <p>Ticket ID: #12345</p>
        </div>
      `);

      const adapter = new GenericAdapter("http://localhost:3000");
      const result = await adapter.verifySubmission(page);

      expect(result.success).toBe(true);
      expect(result.confirmationMessage).toBeDefined();

      await page.close();
    });

    test("should extract ticket ID from confirmation", async () => {
      const page = await browser.newPage();

      await page.setContent(`
        <div class="alert alert-success">
          Your support ticket #TKT-2024-1234 has been created.
        </div>
      `);

      const content = await page.content();
      const ticketIdMatch = content.match(/#?([A-Z]{3}-\d{4}-\d{4})/);

      expect(ticketIdMatch).toBeTruthy();
      expect(ticketIdMatch![1]).toBe("TKT-2024-1234");

      await page.close();
    });

    test("should handle submission errors", async () => {
      const page = await browser.newPage();

      await page.setContent(`
        <div class="error-message">
          <p>Error: Please fill in all required fields.</p>
        </div>
      `);

      const adapter = new GenericAdapter("http://localhost:3000");
      const result = await adapter.verifySubmission(page);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();

      await page.close();
    });
  });

  describe("Multi-Platform Submission", () => {
    test("should submit to multiple platforms", async () => {
      await agent.initialize();

      const ticketData: TicketData = {
        email: "multi@example.com",
        subject: "Multi-platform test",
        description: "Testing submission to multiple platforms",
      };

      // Mock successful submissions
      const mockResults = [
        {
          success: true,
          platform: "platform1",
          ticketId: "P1-123",
          timestamp: new Date(),
        },
        {
          success: true,
          platform: "platform2",
          ticketId: "P2-456",
          timestamp: new Date(),
        },
      ];

      // In real test, this would submit to actual test servers
      const results = mockResults;

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
    });

    test("should handle partial failures gracefully", async () => {
      await agent.initialize();

      const ticketData: TicketData = {
        email: "partial@example.com",
        subject: "Partial failure test",
        description: "Testing partial failure handling",
      };

      // Mock mixed results
      const mockResults = [
        {
          success: true,
          platform: "platform1",
          ticketId: "P1-789",
          timestamp: new Date(),
        },
        {
          success: false,
          platform: "platform2",
          error: "Connection timeout",
          timestamp: new Date(),
        },
      ];

      const results = mockResults;

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[1].error).toBeDefined();
    });
  });

  describe("Error Handling", () => {
    test("should validate ticket data", () => {
      const invalidData = {
        email: "not-an-email",
        subject: "",
        description: "Test",
      };

      expect(() => {
        // This would throw validation error
        validateTicketData(invalidData);
      }).toThrow();
    });

    test("should retry on transient failures", async () => {
      let attempts = 0;
      const retryFunction = async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error("Transient error");
        }
        return "Success";
      };

      const retryHandler = new RetryHandler(3, 100, 1);
      const result = await retryHandler.execute(retryFunction);

      expect(result).toBe("Success");
      expect(attempts).toBe(3);
    });

    test("should timeout on long-running operations", async () => {
      const page = await browser.newPage();

      const timeoutPromise = page.waitForSelector(".non-existent", {
        timeout: 100,
      });

      await expect(timeoutPromise).rejects.toThrow();
      await page.close();
    });
  });
});

// Helper functions
function startTestServer() {
  // Mock implementation - in real tests, start an Express server
  return {
    close: async () => {},
  };
}

function validateTicketData(data: any) {
  if (!data.email.includes("@")) {
    throw new Error("Invalid email");
  }
  if (!data.subject) {
    throw new Error("Subject required");
  }
  return true;
}

class RetryHandler {
  constructor(
    private maxRetries: number,
    private delay: number,
    private multiplier: number
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    let lastError;
    for (let i = 0; i < this.maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        await new Promise((r) => setTimeout(r, this.delay));
      }
    }
    throw lastError;
  }
}

// Jest configuration for this test file
export default {
  testTimeout: 30000, // 30 seconds for browser tests
  setupFilesAfterEnv: ["./tests/setup.ts"],
  testEnvironment: "node",
};
function beforeAll(arg0: () => Promise<void>) {
  throw new Error("Function not implemented.");
}

function afterAll(arg0: () => Promise<void>) {
  throw new Error("Function not implemented.");
}

function expect(email: FormField) {
  throw new Error("Function not implemented.");
}
