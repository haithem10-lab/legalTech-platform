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
  radius: number;
  buttonColor: string;
  buttonTextColor: string;
  buttonSize?: "sm" | "md" | "lg";
  density: "compact" | "spacious";
}

export type WorkflowStatus = "draft" | "published" | "archived";

export interface Workflow {
  id: string;
  orgId: string;
  createdBy: string;
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

export type PublicWorkflow = Omit<Workflow, "hmacSecret" | "orgId" | "createdBy">;

export interface Submission {
  id: string;
  orgId: string;
  data: Record<string, unknown>;
  submittedAt: string;
  originHost: string;
  webhookStatus?: "delivered" | "failed";
}

export interface Organization {
  id: string;
  name: string;
  domain: string;
  plan: "trial" | "professional" | "enterprise";
  ownerId: string;
  firmSize?: string;
  createdAt: string;
}

export interface OrgMember {
  userId: string;
  orgId: string;
  email: string;
  name: string;
  role: "admin" | "lawyer";
  status: "active" | "pending_approval" | "blocked";
  joinedAt: string;
}
