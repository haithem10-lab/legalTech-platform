import type { Workflow, PublicWorkflow } from "@/types/workflow";

export function publicProjection(doc: Workflow): PublicWorkflow {
  const { hmacSecret: _hmacSecret, orgId: _orgId, createdBy: _createdBy, ...publicFields } = doc;
  return publicFields;
}
