export interface FormField {
  selector: string;
  type: "text" | "email" | "textarea" | "select" | "radio" | "checkbox";
  label?: string;
  required: boolean;
  value?: any;
}

export interface FormMapping {
  platform: string;
  url: string;
  fields: Record<string, FormField>;
  submitButton: string;
  successIndicators: string[];
}
