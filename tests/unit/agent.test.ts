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

  test("should validate ticket data", async () => {
    const invalidTicket: any = { email: "invalid" };
    await expect(agent.submitTicket(invalidTicket, [])).rejects.toThrow();
  });
});
