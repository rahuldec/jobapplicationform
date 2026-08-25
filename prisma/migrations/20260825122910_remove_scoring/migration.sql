-- DropForeignKey
ALTER TABLE "application_scores" DROP CONSTRAINT "application_scores_applicationId_fkey";

-- DropForeignKey
ALTER TABLE "application_scores" DROP CONSTRAINT "application_scores_overriddenById_fkey";

-- DropForeignKey
ALTER TABLE "application_scores" DROP CONSTRAINT "application_scores_versionId_fkey";

-- DropForeignKey
ALTER TABLE "jobs" DROP CONSTRAINT "jobs_scoringPatternId_fkey";

-- DropForeignKey
ALTER TABLE "scoring_criteria" DROP CONSTRAINT "scoring_criteria_sourceFieldId_fkey";

-- DropForeignKey
ALTER TABLE "scoring_criteria" DROP CONSTRAINT "scoring_criteria_versionId_fkey";

-- DropForeignKey
ALTER TABLE "scoring_pattern_versions" DROP CONSTRAINT "scoring_pattern_versions_patternId_fkey";

-- DropForeignKey
ALTER TABLE "scoring_patterns" DROP CONSTRAINT "scoring_patterns_tenantId_fkey";

-- AlterTable
ALTER TABLE "jobs" DROP COLUMN "scoringPatternId";

-- DropTable
DROP TABLE "application_scores";

-- DropTable
DROP TABLE "scoring_criteria";

-- DropTable
DROP TABLE "scoring_pattern_versions";

-- DropTable
DROP TABLE "scoring_patterns";

