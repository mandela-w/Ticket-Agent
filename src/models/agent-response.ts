export interface AgentPlan {
  steps: ActionStep[];
  confidence: number;
  reasoning: string;
}

export interface ActionStep {
  action: "navigate" | "fill" | "select" | "click" | "wait" | "verify";
  target?: string;
  value?: any;
  description: string;
}
