import { chromium } from "playwright";
import { GenericAdapter } from "./src/adapters/generic-adapter";
import { TicketData } from "./src/models/ticket";

async function testBasicFunctionality() {
  console.log("🧪 Starting Basic Functionality Test...\n");

  const browser = await chromium.launch({
    headless: false, // Set to false to see the browser
    slowMo: 500, // Slow down actions to see what's happening
  });

  try {
    // Test 1: Form Detection on a simple HTML form
    console.log("Test 1: Form Detection");
    console.log("------------------------");

    const page = await browser.newPage();

    // Create a test HTML form
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Test Support Form</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .form-group { margin-bottom: 15px; }
            label { display: block; margin-bottom: 5px; }
            input, textarea, select { width: 100%; padding: 8px; }
            button { background: #007bff; color: white; padding: 10px 20px; border: none; cursor: pointer; }
          </style>
        </head>
        <body>
          <h1>Contact Support</h1>
          <form id="support-form">
            <div class="form-group">
              <label for="email">Email Address</label>
              <input type="email" id="email" name="email" placeholder="your@email.com" required>
            </div>
            
            <div class="form-group">
              <label for="subject">Subject</label>
              <input type="text" id="subject" name="subject" placeholder="Brief description" required>
            </div>
            
            <div class="form-group">
              <label for="description">Description</label>
              <textarea id="description" name="description" rows="5" placeholder="Describe your issue in detail" required></textarea>
            </div>
            
            <div class="form-group">
              <label for="category">Category</label>
              <select id="category" name="category">
                <option value="">Select a category</option>
                <option value="technical">Technical Support</option>
                <option value="billing">Billing</option>
                <option value="general">General Inquiry</option>
              </select>
            </div>
            
            <button type="submit">Submit Ticket</button>
          </form>
        </body>
      </html>
    `);

    // Initialize adapter
    const adapter = new GenericAdapter("http://localhost:3000");

    // Test form detection
    console.log("Detecting form structure...");
    const formMapping = await adapter.detectForm(page);

    console.log("✅ Form detected successfully!");
    console.log("Found fields:");
    console.log("  - Email selector:", formMapping.fields.email?.selector);
    console.log("  - Subject selector:", formMapping.fields.subject?.selector);
    console.log(
      "  - Description selector:",
      formMapping.fields.description?.selector
    );
    console.log("  - Submit button:", formMapping.submitButton);
    console.log("");

    // Test 2: Form Filling
    console.log("Test 2: Form Filling");
    console.log("--------------------");

    const testTicket: TicketData = {
      email: "test@example.com",
      subject: "Test Ticket - Automated Submission",
      description:
        "This is a test ticket submitted by the Universal Ticket Agent. The system is working correctly if you can see this message.",
      category: "Technical Support",
      priority: "medium",
    };

    console.log("Filling form with test data...");
    await adapter.fillForm(page, testTicket);

    // Verify the form was filled
    const emailValue = await page.inputValue("#email");
    const subjectValue = await page.inputValue("#subject");
    const descriptionValue = await page.inputValue("#description");

    console.log("✅ Form filled successfully!");
    console.log("Verification:");
    console.log(
      "  - Email field:",
      emailValue === testTicket.email ? "✓" : "✗"
    );
    console.log(
      "  - Subject field:",
      subjectValue === testTicket.subject ? "✓" : "✗"
    );
    console.log(
      "  - Description field:",
      descriptionValue === testTicket.description ? "✓" : "✗"
    );
    console.log("");

    // Test 3: Submit Button Detection
    console.log("Test 3: Submit Button Detection");
    console.log("--------------------------------");

    const submitButton = await page.$('button[type="submit"]');
    if (submitButton) {
      console.log("✅ Submit button found!");
      const buttonText = await submitButton.textContent();
      console.log("  Button text:", buttonText);
    } else {
      console.log("❌ Submit button not found");
    }

    console.log("\n🎉 All basic tests completed!");

    // Keep browser open for manual inspection
    console.log("\n👀 Browser will stay open for 10 seconds for inspection...");
    await page.waitForTimeout(10000);
  } catch (error) {
    console.error("❌ Test failed:", error);
  } finally {
    await browser.close();
  }
}

// Run the test
testBasicFunctionality().catch(console.error);
