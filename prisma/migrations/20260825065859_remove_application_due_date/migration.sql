-- Reverting the per-application due date: it duplicated the existing
-- per-job Job.applicationDeadline concept. HR should set one deadline
-- per job, not a separate one per application.
ALTER TABLE "applications" DROP COLUMN "dueDate";
