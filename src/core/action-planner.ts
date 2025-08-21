import { FormMapping } from "../models/form-mapping";
import { TicketData } from "../models/ticket";
import { AgentPlan, ActionStep } from "../models/agent-response";

export class ActionPlanner {
  async createPlan(
    formMapping: FormMapping,
    ticketData: TicketData
  ): Promise<AgentPlan> {
    const steps: ActionStep[] = [];

    // Wait for page to stabilize
    steps.push({
      action: "wait",
      value: 2000,
      description: "Wait for page to load completely",
    });

    // Fill email field
    if (formMapping.fields.email) {
      steps.push({
        action: "fill",
        target: formMapping.fields.email.selector,
        value: ticketData.email,
        description: "Fill email address",
      });
    }

    // Fill subject field
    if (formMapping.fields.subject) {
      steps.push({
        action: "fill",
        target: formMapping.fields.subject.selector,
        value: ticketData.subject,
        description: "Fill ticket subject",
      });
    }

    // Fill description field
    if (formMapping.fields.description) {
      steps.push({
        action: "fill",
        target: formMapping.fields.description.selector,
        value: ticketData.description,
        description: "Fill ticket description",
      });
    }

    // Handle category if present
    if (ticketData.category && formMapping.fields.category) {
      steps.push({
        action:
          formMapping.fields.category.type === "select" ? "select" : "fill",
        target: formMapping.fields.category.selector,
        value: ticketData.category,
        description: "Select or fill category",
      });
    }

    // Submit form
    steps.push({
      action: "click",
      target: formMapping.submitButton,
      description: "Submit the form",
    });

    // Wait for submission
    steps.push({
      action: "wait",
      value: 3000,
      description: "Wait for form submission",
    });

    return {
      steps,
      confidence: 0.85,
      reasoning: `Created ${steps.length}-step plan to submit ticket to ${formMapping.platform}`,
    };
  }
}
