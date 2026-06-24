"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

interface WorkflowNameContextValue {
  workflowName: string;
  setWorkflowName: (name: string) => void;
}

const WorkflowNameContext = createContext<WorkflowNameContextValue>({
  workflowName: "",
  setWorkflowName: () => {},
});

export function WorkflowNameProvider({ children }: { children: ReactNode }) {
  const [workflowName, setWorkflowName] = useState("");
  return (
    <WorkflowNameContext.Provider value={{ workflowName, setWorkflowName }}>
      {children}
    </WorkflowNameContext.Provider>
  );
}

export function useWorkflowName() {
  return useContext(WorkflowNameContext);
}
