import { chromium } from "playwright";
import { GenericAdapter } from "./src/adapters/generic-adapter";
import { TicketData } from "./src/models/ticket";

async function testRealWorldForms() {
  console.log("🌐 Testing Real World Forms\n");

  const browser = await chromium.launch({
    headless: false,
    slowMo: 1000, // Slower to see actions clearly
  });

  const testData: TicketData = {
    email: "demo@test.com",
    subject: "Demo Test - Do Not Submit",
    description:
      "This is a test of the form detection system. Please do not actually submit.",
    category: "Technical Support",
    priority: "low",
  };

  // Test sites with public contact forms
  const testSites = [
    {
      name: "HubSpot Contact Form Demo",
      url: "https://offers.hubspot.com/contact-form-templates",
      note: "May have embedded form",
    },
    {
      name: "W3Schools Contact Form",
      url: "https://www.w3schools.com/howto/tryit.asp?filename=tryhow_css_contact_form",
      note: "In iframe - good edge case test",
    },
    {
      name: "Local Test Form",
      url: "file:///path/to/your/test.html",
      note: "Create your own test HTML",
    },
  ];

  for (const site of testSites) {
    console.log(`\nTesting: ${site.name}`);
    console.log("URL:", site.url);
    console.log("Note:", site.note);
    console.log("-".repeat(50));

    const page = await browser.newPage();

    try {
      // For local testing, create a test HTML file
      if (site.url.includes("file://")) {
        await page.setContent(`
          <!DOCTYPE html>
          <html>
            <head><title>Test Form</title></head>
            <body>
              <h2>Contact Us</h2>
              <form>
                <input type="email" placeholder="Email" name="email">
                <input type="text" placeholder="Subject" name="subject">
                <textarea placeholder="Message" name="message"></textarea>
                <button type="submit">Send</button>
              </form>
            </body>
          </html>
        `);
      } else {
        await page.goto(site.url, { waitUntil: "networkidle" });
      }

      const adapter = new GenericAdapter(site.url);

      // Detect form
      console.log("🔍 Detecting form structure...");
      const formMapping = await adapter.detectForm(page);

      console.log("📋 Detection Results:");
      console.log(
        "  Email field:",
        formMapping.fields.email?.selector || "Not found"
      );
      console.log(
        "  Subject field:",
        formMapping.fields.subject?.selector || "Not found"
      );
      console.log(
        "  Description field:",
        formMapping.fields.description?.selector || "Not found"
      );
      console.log("  Submit button:", formMapping.submitButton || "Not found");

      // Try filling (but don't submit)
      if (formMapping.fields.email?.selector) {
        console.log("\n📝 Attempting to fill form...");
        await adapter.fillForm(page, testData);
        console.log("✅ Form filled successfully");

        // Take screenshot
        await page.screenshot({
          path: `test-screenshots/${site.name.replace(/\s+/g, "-")}.png`,
        });
        console.log("📸 Screenshot saved");
      } else {
        console.log("⚠️ Could not detect form fields");
      }

      await page.waitForTimeout(3000); // Pause to see result
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(`❌ Error testing ${site.name}:`, errorMessage);
    } finally {
      await page.close();
    }
  }

  await browser.close();
  console.log("\n✅ Real world testing complete!");
}

// Run the test
testRealWorldForms().catch(console.error);
