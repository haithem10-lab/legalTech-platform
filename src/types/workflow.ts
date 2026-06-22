export interface BaseField {
  id: string;
  label: string;
  placeholder?: string;
  helperText?: string;
  required: boolean;
}

export interface TextField extends BaseField {
  type: "text";
  validation?: {
    pattern?: string;
    maxLength?: number;
  };
}

export interface EmailField extends BaseField {
  type: "email";
}

export interface DropdownField extends BaseField {
  type: "dropdown";
  options: string[];
}

export interface RadioField extends BaseField {
  type: "radio";
  options: string[];
}

export interface FileField extends BaseField {
  type: "file";
  acceptedTypes: string[];
  maxSizeBytes: number;
}

export interface DynamicListSubField {
  id: string;
  label: string;
  type: "text" | "email" | "number";
  required: boolean;
}

export interface DynamicListField extends BaseField {
  type: "dynamic-list";
  subFields: DynamicListSubField[];
  minRows?: number;
  maxRows?: number;
}

export type Field =
  | TextField
  | EmailField
  | DropdownField
  | RadioField
  | FileField
  | DynamicListField;

export interface Theme {
  bgColor: string;
  font: string;
  radius: "none" | "sm" | "md" | "lg" | "full";
  buttonStyle: {
    bgColor: string;
    textColor: string;
    radius: "none" | "sm" | "md" | "lg" | "full";
  };
  density: "compact" | "spacious";
}

export type WorkflowStatus = "draft" | "published";

export interface Workflow {
  id: string;
  accountId: string;
  name: string;
  status: WorkflowStatus;
  schema: Field[];
  theme: Theme;
  webhookUrl: string;
  hmacSecret: string;
  allowedOrigins: string[];
  createdAt: string;
  updatedAt: string;
}

export type PublicWorkflow = Omit<Workflow, "hmacSecret" | "accountId">;
