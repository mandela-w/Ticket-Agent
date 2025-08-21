export interface TicketData {
  email: string;
  subject: string;
  description: string;
  category?: string;
  priority?: "low" | "medium" | "high" | "urgent";
  attachments?: string[];
  customFields?: Record<string, any>;
}

export interface SubmissionResult {
  success: boolean;
  ticketId?: string;
  confirmationMessage?: string;
  screenshot?: string;
  error?: string;
  platform: string;
  timestamp: Date;
}
