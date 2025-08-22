import { FreshdeskAdapter } from "../../src/adapters/freshdesk-adapter";
import { chromium } from "playwright";

describe("Freshdesk Integration", () => {
  test("should submit ticket to Freshdesk demo", async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();

    const adapter = new FreshdeskAdapter();
    const result = await adapter.execute(page, {
      email: "test@example.com",
      subject: "Test Ticket",
      description: "This is a test ticket",
    });

    expect(result.success).toBe(true);
    await browser.close();
  });
});
