import type { JobPriority, JobStatus } from "./types";

export const JOB_STATUSES: JobStatus[] = [
  "booked",
  "checked_in",
  "in_progress",
  "awaiting_parts",
  "completed",
  "vehicle_released",
  "invoiced",
];

export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  booked: "Booked",
  checked_in: "Checked In",
  in_progress: "In Progress",
  awaiting_parts: "Awaiting Parts",
  completed: "Completed",
  vehicle_released: "Vehicle Released",
  invoiced: "Invoiced",
  awaiting_authorisation: "Awaiting Authorisation",
  authorised: "Authorised",
  cancelled: "Cancelled",
};

export type JobStatusTone = "neutral" | "blue" | "green" | "amber" | "red" | "purple";

export const JOB_STATUS_TONE: Record<JobStatus, JobStatusTone> = {
  booked: "blue",
  checked_in: "purple",
  in_progress: "amber",
  awaiting_parts: "red",
  completed: "green",
  vehicle_released: "neutral",
  invoiced: "neutral",
  awaiting_authorisation: "amber",
  authorised: "blue",
  cancelled: "red",
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
