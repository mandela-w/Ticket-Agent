// src/index.ts - Main entry point and exports
export { UniversalTicketAgent } from "./core/agent";
export { TicketData, SubmissionResult } from "./models/ticket";
export { AgentConfig } from "./models/agent-config";
export { AgentPlan, ActionStep } from "./models/agent-response";
export { FormMapping, FormField } from "./models/form-mapping";
export { BaseAdapter } from "./adapters/base-adapter";
export { GenericAdapter } from "./adapters/generic-adapter";
export { FreshdeskAdapter } from "./adapters/freshdesk-adapter";
export { Logger } from "./utils/logger";

// Main execution function for CLI usage
import { UniversalTicketAgent } from "./core/agent";
import { TicketData } from "./models/ticket";

async function main() {
  const agent = new UniversalTicketAgent({
    llmProvider: "openai",
    browserOptions: { headless: false },
  });

  try {
    await agent.initialize();

    const ticketData: TicketData = {
      email: "user@example.com",
      subject: "Login Issue - Error Code 403",
      description:
        "I am unable to login to my account. When I try to sign in, I receive an error code 403. This started happening yesterday afternoon. I have already tried clearing my browser cache and cookies.",
      category: "Technical Support",
      priority: "high",
    };

    const platforms = ["freshdesk_demo", "typeform_demo"];

    console.log("🚀 Starting Universal Ticket Agent...");
    console.log("📝 Ticket Data:", ticketData);
    console.log("🎯 Target Platforms:", platforms);

    const results = await agent.submitTicket(ticketData, platforms);

    console.log("\n📊 Submission Results:");
    results.forEach((result) => {
      console.log(`Platform: ${result.platform}`);
      console.log(`Success: ${result.success ? "✅" : "❌"}`);
      if (result.error) console.log(`Error: ${result.error}`);
      if (result.ticketId) console.log(`Ticket ID: ${result.ticketId}`);
      console.log("---");
    });
  } catch (error) {
    console.error("Fatal error:", error);
  } finally {
    await agent.shutdown();
  }
}

// Run if this is the main module
if (require.main === module) {
  main();
}
