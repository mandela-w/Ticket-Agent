import { UniversalTicketAgent } from "../../src/core/agent";

describe("UniversalTicketAgent", () => {
  let agent: UniversalTicketAgent;

  beforeEach(() => {
    agent = new UniversalTicketAgent();
  });

  test("should initialize browser", async () => {
    await agent.initialize();
    expect(agent).toBeDefined();
    await agent.shutdown();
  });

  test("should validate ticket data", () => {
    const invalidTicket = { email: "invalid" };
    expect(() => agent.submitTicket(invalidTicket, [])).toThrow();
  });
});
