import type { Workflow, PublicWorkflow } from "@/types/workflow";

export function publicProjection(doc: Workflow): PublicWorkflow {
  const { hmacSecret: _hmacSecret, accountId: _accountId, ...publicFields } = doc;
  return publicFields;
}
