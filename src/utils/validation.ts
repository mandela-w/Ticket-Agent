import { z } from "zod";
import { TicketData } from "../models/ticket";

const TicketDataSchema = z.object({
  email: z.string().email("Invalid email address"),
  subject: z.string().min(3, "Subject must be at least 3 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  category: z.string().optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  attachments: z.array(z.string()).optional(),
  customFields: z.record(z.any()).optional(),
});

export class Validator {
  static validateTicketData(data: any): TicketData {
    try {
      return TicketDataSchema.parse(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const issues = error.errors
          .map((e) => `${e.path}: ${e.message}`)
          .join(", ");
        throw new Error(`Validation failed: ${issues}`);
      }
      throw error;
    }
  }

  static sanitizeInput(input: string): string {
    // Remove potentially harmful characters
    return input
      .replace(/<script[^>]*>.*?<\/script>/gi, "")
      .replace(/<[^>]+>/g, "")
      .trim();
  }

  static isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
}
