import { UniversalTicketAgent } from "./src/core/agent";
import { TicketData } from "./src/models/ticket";
import * as fs from "fs/promises";

async function fullSystemTest() {
  console.log("🚀 FULL SYSTEM INTEGRATION TEST");
  console.log("================================\n");

  // Create test results directory
  await fs.mkdir("./test-results", { recursive: true });
  await fs.mkdir("./test-screenshots", { recursive: true });

  const agent = new UniversalTicketAgent({
    llmProvider: "mock", // Use mock for testing
    browserOptions: {
      headless: false,
      slowMo: 500,
    },
  });

  const testCases = [
    {
      name: "Valid Ticket Submission",
      data: {
        email: "valid@test.com",
        subject: "Integration Test - Valid",
        description:
          "This is a valid test ticket with all required fields properly filled.",
        priority: "medium",
      },
      expectedResult: "success",
    },
    {
      name: "Missing Required Field",
      data: {
        email: "invalid@test.com",
        subject: "", // Missing subject
        description: "Testing validation with missing subject.",
        priority: "low",
      },
      expectedResult: "validation_error",
    },
    {
      name: "Long Description",
      data: {
        email: "long@test.com",
        subject: "Long Description Test",
        description: "Lorem ipsum dolor sit amet, ".repeat(50), // Very long description
        priority: "high",
      },
      expectedResult: "success",
    },
  ];

  const results: any[] = [];

  try {
    console.log("Initializing agent...");
    await agent.initialize();
    console.log("✅ Agent initialized\n");

    for (const testCase of testCases) {
      console.log(`\n📋 Test Case: ${testCase.name}`);
      console.log("-".repeat(40));

      const startTime = Date.now();

      try {
        // Validate data first
        console.log("Validating ticket data...");
        const isValid = validateTicketData(testCase.data as TicketData);

        if (!isValid && testCase.expectedResult === "validation_error") {
          console.log("✅ Validation failed as expected");
          results.push({
            testCase: testCase.name,
            result: "PASS",
            reason: "Validation failed as expected",
            duration: Date.now() - startTime,
          });
          continue;
        }

        // Submit ticket
        console.log("Submitting ticket...");
        const submissionResults = await agent.submitTicket(
          testCase.data as TicketData,
          ["generic_test"] // Use a test platform
        );

        const duration = Date.now() - startTime;

        // Check results
        const success = submissionResults[0]?.success;
        const passed =
          (success && testCase.expectedResult === "success") ||
          (!success && testCase.expectedResult === "error");

        results.push({
          testCase: testCase.name,
          result: passed ? "PASS" : "FAIL",
          submissionResult: submissionResults[0],
          duration: duration,
        });

        console.log(`Result: ${passed ? "✅ PASS" : "❌ FAIL"}`);
        console.log(`Duration: ${duration}ms`);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);

        results.push({
          testCase: testCase.name,
          result: "ERROR",
          error: message,
          duration: Date.now() - startTime,
        });

        console.error("❌ Test error:", message);
      }
    }
  } finally {
    await agent.shutdown();
  }

  // Generate test report
  console.log("\n\n📊 TEST REPORT");
  console.log("================\n");

  const report = {
    timestamp: new Date().toISOString(),
    totalTests: results.length,
    passed: results.filter((r) => r.result === "PASS").length,
    failed: results.filter((r) => r.result === "FAIL").length,
    errors: results.filter((r) => r.result === "ERROR").length,
    avgDuration:
      results.reduce((acc, r) => acc + (r.duration || 0), 0) / results.length,
    results: results,
  };

  console.log(`Total Tests: ${report.totalTests}`);
  console.log(`Passed: ${report.passed} ✅`);
  console.log(`Failed: ${report.failed} ❌`);
  console.log(`Errors: ${report.errors} ⚠️`);
  console.log(`Average Duration: ${report.avgDuration.toFixed(2)}ms`);

  // Save report
  await fs.writeFile(
    "./test-results/integration-test-report.json",
    JSON.stringify(report, null, 2)
  );

  console.log(
    "\n📁 Report saved to: ./test-results/integration-test-report.json"
  );

  // Print detailed results
  console.log("\nDetailed Results:");
  console.log("-".repeat(50));
  results.forEach((r) => {
    const icon = r.result === "PASS" ? "✅" : r.result === "FAIL" ? "❌" : "⚠️";
    console.log(`${icon} ${r.testCase}: ${r.result} (${r.duration}ms)`);
    if (r.error) console.log(`   Error: ${r.error}`);
  });

  return report;
}

function validateTicketData(data: TicketData): boolean {
  if (!data.email || !data.email.includes("@")) return false;
  if (!data.subject || data.subject.length < 3) return false;
  if (!data.description || data.description.length < 10) return false;
  return true;
}

// Run the test
fullSystemTest()
  .then((report) => {
    const exitCode = report.failed + report.errors > 0 ? 1 : 0;
    process.exit(exitCode);
  })
  .catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Fatal test error:", message);
    process.exit(1);
  });
