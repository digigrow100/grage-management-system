import type { JobPriority, JobStatus } from "./types";

// Selectable statuses only — "invoiced" is deliberately excluded: it's
// retired as an operational status (invoice state comes from the linked
// invoice), kept only so historic rows using it still type-check and
// display correctly.
export const JOB_STATUSES: JobStatus[] = [
  "booked",
  "checked_in",
  "in_progress",
  "awaiting_parts",
  "awaiting_authorisation",
  "authorised",
  "completed",
  "vehicle_released",
  "cancelled",
];

export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  booked: "Booked",
  checked_in: "Checked In",
  in_progress: "In Progress",
  awaiting_parts: "Awaiting Parts",
  awaiting_authorisation: "Awaiting Authorisation",
  authorised: "Authorised",
  completed: "Completed",
  vehicle_released: "Vehicle Released",
  cancelled: "Cancelled",
  invoiced: "Invoiced",
};

export type JobStatusTone = "neutral" | "blue" | "green" | "amber" | "red" | "purple";

export const JOB_STATUS_TONE: Record<JobStatus, JobStatusTone> = {
  booked: "blue",
  checked_in: "purple",
  in_progress: "amber",
  awaiting_parts: "red",
  awaiting_authorisation: "red",
  authorised: "blue",
  completed: "green",
  vehicle_released: "neutral",
  cancelled: "neutral",
  invoiced: "neutral",
};

/**
 * Allowed forward/backward transitions for changeJobStatus(). Deliberately
 * permissive within the workshop flow (staff can move a job back a step to
 * correct a mistake) but every transition is still validated — arbitrary
 * jumps like booked -> completed are rejected.
 */
export const JOB_STATUS_TRANSITIONS: Record<JobStatus, JobStatus[]> = {
  booked: ["checked_in", "cancelled"],
  checked_in: ["booked", "in_progress", "cancelled"],
  in_progress: ["checked_in", "awaiting_parts", "awaiting_authorisation", "completed", "cancelled"],
  awaiting_parts: ["in_progress", "cancelled"],
  awaiting_authorisation: ["authorised", "in_progress", "cancelled"],
  authorised: ["in_progress", "completed", "cancelled"],
  completed: ["vehicle_released", "in_progress"],
  vehicle_released: ["completed"],
  cancelled: ["booked"],
  invoiced: ["completed"],
};

export const JOB_PRIORITIES: JobPriority[] = ["low", "medium", "high"];

export const JOB_PRIORITY_LABELS: Record<JobPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

export const JOB_PRIORITY_TONE: Record<JobPriority, JobStatusTone> = {
  low: "neutral",
  medium: "amber",
  high: "red",
};
