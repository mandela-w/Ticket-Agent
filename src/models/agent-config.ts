export interface AgentConfig {
  llmProvider?: string;
  llmConfig?: {
    apiKey?: string;
    model?: string;
    temperature?: number;
    maxTokens?: number;
  };
  browserOptions?: {
    headless?: boolean;
    slowMo?: number;
    timeout?: number;
  };
  authentication?: {
    strategy?: "cookies" | "oauth" | "none";
    cookies?: any[];
    clientId?: string;
    clientSecret?: string;
    redirectUri?: string;
  };
}
