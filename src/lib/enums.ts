// Platform-level string "enums". These describe things the *platform*
// defines (a job's lifecycle, a field's input type). They are intentionally
// NOT about what any specific college asks for — an admin can create as
// many fields/statuses inside these platform types as they want.

export const ROLES = [
  "super_admin",
  "college_admin",
  "recruiter",
  "panel_member",
] as const;
export type Role = (typeof ROLES)[number];

export const JOB_STATUSES = ["draft", "published", "closed"] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

export const APPLICATION_STATUSES = [
  "draft",
  "submitted",
  "under_review",
  "shortlisted",
  "interview_scheduled",
  "interviewed",
  "selected",
  "rejected",
  "withdrawn",
] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

// "draft", "submitted", "shortlisted", and "withdrawn" stay valid
// statuses, but are hidden from the status filter and dashboard tiles:
// draft only ever reads as a permanent zero for tenants without a
// save-as-draft flow, submitted is covered by the Total tile, and
// shortlisted/withdrawn were dropped from these two surfaces on request.
const HIDDEN_APPLICATION_STATUSES: readonly ApplicationStatus[] = ["draft", "submitted", "shortlisted", "withdrawn"];
export const VISIBLE_APPLICATION_STATUSES = APPLICATION_STATUSES.filter((s) => !HIDDEN_APPLICATION_STATUSES.includes(s));

// For the "change this application's status" action (not display/filter):
// still lets HR move an application back to "submitted" if needed, just
// never to "draft" — nothing in this app creates a draft application.
export const SETTABLE_APPLICATION_STATUSES = APPLICATION_STATUSES.filter((s) => s !== "draft");

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  under_review: "Under Review",
  shortlisted: "Shortlisted",
  interview_scheduled: "Interview Scheduled",
  interviewed: "Interviewed",
  selected: "Selected",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

export const INTERVIEW_MODES = ["in_person", "video", "phone"] as const;
export type InterviewMode = (typeof INTERVIEW_MODES)[number];
export const INTERVIEW_MODE_LABELS: Record<InterviewMode, string> = {
  in_person: "In Person",
  video: "Video Call",
  phone: "Phone Call",
};

export const INTERVIEW_STATUSES = ["scheduled", "completed", "cancelled", "no_show"] as const;
export type InterviewStatus = (typeof INTERVIEW_STATUSES)[number];
export const INTERVIEW_STATUS_LABELS: Record<InterviewStatus, string> = {
  scheduled: "Scheduled",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No-show",
};

export const FIELD_TYPES = [
  "text",
  "textarea",
  "number",
  "date",
  "email",
  "phone",
  "select",
  "multiselect",
  "radio",
  "checkbox",
  "yes_no",
  "file",
] as const;
export type FieldType = (typeof FIELD_TYPES)[number];

export const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  text: "Short Text",
  textarea: "Long Text",
  number: "Number",
  date: "Date",
  email: "Email",
  phone: "Phone",
  select: "Dropdown",
  multiselect: "Multi-select",
  radio: "Radio (single choice)",
  checkbox: "Checkbox",
  yes_no: "Yes / No",
  file: "File / Document Reference",
};

export const AUDIT_ACTIONS = [
  "application.submitted",
  "application.reviewed",
  "application.status_changed",
  "application.assigned",
  "document.uploaded",
  "document.verified",
  "interview.scheduled",
  "interview.rescheduled",
  "interview.completed",
  "interview.cancelled",
  "job.created",
  "job.published",
  "job.closed",
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];
