// Platform-level string "enums". These describe things the *platform*
// defines (a job's lifecycle, a field's input type, a scoring method).
// They are intentionally NOT about what any specific college scores or
// asks for — an admin can create as many criteria/fields/statuses inside
// these platform types as they want.

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

export const SCORING_METHODS = [
  "fixed",
  "numeric_range",
  "percentage",
  "yes_no",
  "dropdown",
  "multiselect",
  "count",
  "formula",
  "conditional",
  "weightage",
] as const;
export type ScoringMethod = (typeof SCORING_METHODS)[number];

export const SCORING_METHOD_LABELS: Record<ScoringMethod, string> = {
  fixed: "Fixed Points",
  numeric_range: "Numeric Range",
  percentage: "Percentage of Field Value",
  yes_no: "Yes / No",
  dropdown: "Dropdown Points Map",
  multiselect: "Multi-select Points Map",
  count: "Count (points per unit)",
  formula: "Formula",
  conditional: "Conditional Rule (IF / THEN)",
  weightage: "Weightage (combine other criteria)",
};

export const SCORING_METHOD_DESCRIPTIONS: Record<ScoringMethod, string> = {
  fixed: "Award a fixed number of points whenever this criterion applies.",
  numeric_range:
    "Map ranges of a numeric field's value to points, e.g. 0-2 years = 5 pts, 3-5 years = 10 pts.",
  percentage:
    "Award points as a percentage of a numeric field's value, e.g. 0.4 points per percentage mark.",
  yes_no: "Award points based on a Yes/No field's answer.",
  dropdown: "Map each option of a dropdown field to a specific point value.",
  multiselect:
    "Map each selected option of a multi-select field to points and sum them.",
  count:
    "Award points per unit of something counted (e.g. per publication), up to a cap.",
  formula:
    "Evaluate a mathematical expression referencing one or more application fields.",
  conditional:
    "Evaluate an IF / THEN rule against a field and award points based on the outcome.",
  weightage:
    "Combine other criteria in this pattern using admin-defined weights.",
};

export const SCORING_PATTERN_VERSION_STATUSES = [
  "draft",
  "published",
  "archived",
] as const;
export type ScoringPatternVersionStatus =
  (typeof SCORING_PATTERN_VERSION_STATUSES)[number];

export const CONDITION_OPERATORS = [
  "equals",
  "not_equals",
  "greater_than",
  "less_than",
  "greater_than_or_equal",
  "less_than_or_equal",
  "between",
  "contains",
  "is_empty",
  "is_not_empty",
] as const;
export type ConditionOperator = (typeof CONDITION_OPERATORS)[number];

export const CONDITION_OPERATOR_LABELS: Record<ConditionOperator, string> = {
  equals: "Equals",
  not_equals: "Not equals",
  greater_than: "Greater than",
  less_than: "Less than",
  greater_than_or_equal: "Greater than or equal",
  less_than_or_equal: "Less than or equal",
  between: "Between",
  contains: "Contains",
  is_empty: "Is empty",
  is_not_empty: "Is not empty",
};

export const AUDIT_ACTIONS = [
  "application.submitted",
  "application.reviewed",
  "application.status_changed",
  "application.assigned",
  "document.uploaded",
  "document.verified",
  "score.calculated",
  "score.overridden",
  "scoring_pattern.created",
  "scoring_pattern.version_published",
  "job.created",
  "job.published",
  "job.closed",
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];
