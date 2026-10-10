import { CallOutcome } from "@prisma/client";

export type PriorRemark = {
  id: string;
  remarks: string;
  outcome: CallOutcome;
  closedAt: string;
};

const LABELS: Record<CallOutcome, string> = {
  CONNECTED: "Connected",
  NO_ANSWER: "No answer",
  SWITCHED_OFF: "Switched off",
  WRONG_NUMBER: "Wrong number",
  CALL_BACK_LATER: "Reconnect",
};

export function outcomeLabel(outcome: CallOutcome | null | undefined): string {
  if (!outcome) return "—";
  return LABELS[outcome];
}
