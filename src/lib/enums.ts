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
export const ROLE_LABELS: Record<Role, string> = {
  super_admin: "Super Admin",
  college_admin: "College Admin",
  recruiter: "Recruiter",
  panel_member: "Panel Member",
};
// The two roles the admin-side "Add staff" form actually offers — the
// other two describe platform-level access this app has no login system
// to grant yet, so surfacing them here would be a control with no effect.
export const STAFF_CREATABLE_ROLES: readonly Role[] = ["recruiter", "panel_member"];

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

// For the "change this application's status" action (the quick dropdown
// on an application's own page, and the Applications list's bulk status
// changer) — deliberately excludes "draft" (nothing in this app creates
// a draft application) and "interview_scheduled". That status has to
// come from actually scheduling an interview (src/lib/actions/
// interviews.ts's scheduleInterview), which also emails the candidate —
// letting this generic dropdown set the same label directly produced
// applications marked "Interview Scheduled" with no real interview and
// no email ever sent, which is exactly the bug that was reported.
//
// Also reused as-is for the Applications page's own Status *filter*
// dropdown, so the two controls always show the identical list — kept
// as one constant on purpose after the filter and the status-changer
// briefly drifted apart (the filter used to also offer "Interview
// Scheduled", which it no longer does, by request).
export const SETTABLE_APPLICATION_STATUSES = APPLICATION_STATUSES.filter((s) => s !== "draft" && s !== "interview_scheduled");

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
  "email.sent",
  "interview.scheduled",
  "interview.rescheduled",
  "interview.completed",
  "interview.cancelled",
  "job.created",
  "job.published",
  "job.closed",
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];
