// One-off: writes NBGSM's exact current column mapping (previously
// hardcoded in prisma/import-nbgsm-sheet.ts) into Tenant.sheetSourceUrl /
// sheetMappingJson, so the generic sync engine (prisma/sheet-import)
// reproduces identical behavior for NBGSM as a config, not special-cased
// code. Safe to re-run — it's a plain update, not a create.
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import type { SheetImportConfig } from "./sheet-import/types";

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 2 });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const SHEET_EXPORT_URL =
  "https://docs.google.com/spreadsheets/d/1oLoJA1M6WqgcgkmZ8eg63neRvyhJQpZsMp2unuZfmKk/export?format=xlsx";

const config: SheetImportConfig = {
  formName: "NBGSM — Original Recruitment Application (2026 Intake)",
  applicationNumberPrefix: "NBGSM-2026-IMP-",
  jobTitleTemplate: "Assistant Professor — {value} (2026 Intake)",
  jobCodeTemplate: "NBGSM-{value3}-2026",
  jobEmploymentType: "Assistant Professor — Regular",
  coreFields: {
    addedTimeCol: 0,
    emailCol: 16,
    fullNameCol: 6,
    mobileCol: 11,
    dobCol: 13,
    genderCol: 14,
    jobSelectorCol: 3,
    applicationNumberCol: null,
  },
  sections: [
    {
      name: "Personal Details",
      fields: [
        { col: 2, fieldKey: "terms_accepted", label: "Terms and Conditions", fieldType: "text" },
        { col: 3, fieldKey: "subject", label: "Subject Applied For", fieldType: "text" },
        { col: 6, fieldKey: "full_name", label: "Full Name", fieldType: "text" },
        { col: 7, fieldKey: "mothers_name", label: "Mother's Name", fieldType: "text" },
        { col: 8, fieldKey: "age", label: "Age", fieldType: "number" },
        { col: 9, fieldKey: "nationality", label: "Nationality", fieldType: "text" },
        { col: 10, fieldKey: "marital_status", label: "Marital Status", fieldType: "text" },
        { col: 11, fieldKey: "mobile", label: "Contact No.", fieldType: "phone" },
        { col: 12, fieldKey: "fathers_husbands_name", label: "Father's / Husband's Name", fieldType: "text" },
        { col: 13, fieldKey: "dob", label: "Date of Birth", fieldType: "date" },
        { col: 14, fieldKey: "gender", label: "Gender", fieldType: "text" },
        { col: 15, fieldKey: "category", label: "Category", fieldType: "text" },
        { col: 16, fieldKey: "email", label: "Email", fieldType: "email" },
        { col: 17, fieldKey: "present_address", label: "Present Postal Address", fieldType: "textarea" },
        { col: 18, fieldKey: "permanent_same_as_present", label: "Permanent Address same as Present?", fieldType: "text" },
        { col: 19, fieldKey: "permanent_address", label: "Permanent Address", fieldType: "textarea" },
        { col: 20, fieldKey: "physically_handicapped", label: "Physically Handicapped?", fieldType: "text" },
      ],
    },
    {
      name: "Employment & References",
      fields: [
        { col: 22, fieldKey: "current_designation", label: "Current Designation", fieldType: "text" },
        { col: 23, fieldKey: "present_employer", label: "Present Employer", fieldType: "text" },
        { col: 24, fieldKey: "current_pay_scale", label: "Current Pay Scale", fieldType: "text" },
        { col: 25, fieldKey: "current_pay_grade", label: "Current Pay Grade", fieldType: "text" },
        { col: 26, fieldKey: "current_pay_scale_grade_pay", label: "Current Pay Scale & Grade Pay", fieldType: "text" },
        { col: 27, fieldKey: "approved_by_university", label: "Approved by which University?", fieldType: "text" },
        { col: 29, fieldKey: "reference_1", label: "Reference 1", fieldType: "textarea" },
        { col: 30, fieldKey: "reference_2", label: "Reference 2", fieldType: "textarea" },
      ],
    },
    {
      name: "Educational Qualifications",
      fields: [
        { col: 31, fieldKey: "matric_qualification", label: "Matriculation", fieldType: "textarea" },
        { col: 32, fieldKey: "plus_two_qualification", label: "10+2", fieldType: "textarea" },
        { col: 33, fieldKey: "graduation_qualification", label: "Graduation", fieldType: "textarea" },
        { col: 34, fieldKey: "post_graduation_qualification", label: "Post-Graduation", fieldType: "textarea" },
        { col: 35, fieldKey: "mphil_qualification", label: "M.Phil", fieldType: "textarea" },
        { col: 36, fieldKey: "phd_qualification", label: "Ph.D.", fieldType: "textarea" },
        { col: 37, fieldKey: "net_qualification", label: "NET", fieldType: "textarea" },
        { col: 38, fieldKey: "net_jrf_qualification", label: "NET (JRF)", fieldType: "textarea" },
        { col: 39, fieldKey: "slet_set_qualification", label: "SLET/SET", fieldType: "textarea" },
        { col: 40, fieldKey: "other_qualification", label: "Any Other Qualification", fieldType: "textarea" },
      ],
    },
    {
      name: "Teaching Experience",
      fields: [
        { col: 51, fieldKey: "has_teaching_experience", label: "Has Teaching Experience?", fieldType: "text" },
        { col: 52, fieldKey: "teaching_experience_entry_1", label: "Teaching Experience — Entry 1", fieldType: "textarea" },
        { col: 53, fieldKey: "teaching_experience_entry_2", label: "Teaching Experience — Entry 2", fieldType: "textarea" },
        { col: 54, fieldKey: "teaching_experience_entry_3", label: "Teaching Experience — Entry 3", fieldType: "textarea" },
        { col: 55, fieldKey: "teaching_experience_entry_4", label: "Teaching Experience — Entry 4", fieldType: "textarea" },
      ],
    },
    {
      name: "Research & Co-Curricular",
      fields: [
        { col: 57, fieldKey: "has_research_experience", label: "Has Research Experience?", fieldType: "text" },
        { col: 58, fieldKey: "research_books", label: "Books", fieldType: "textarea" },
        { col: 59, fieldKey: "research_papers", label: "Research Papers", fieldType: "textarea" },
        { col: 60, fieldKey: "paper_presentations", label: "Paper Presentation in Conferences", fieldType: "textarea" },
        { col: 62, fieldKey: "ncc_certificate_mention", label: "NCC 'C'/'B' Certificate", fieldType: "text" },
        { col: 63, fieldKey: "nss_award_mention", label: "NSS National/State Award", fieldType: "text" },
        { col: 64, fieldKey: "competition_position_mention", label: "Position in Competitions", fieldType: "text" },
        { col: 65, fieldKey: "republic_day_parade_mention", label: "Republic Day Parade Participation", fieldType: "text" },
        { col: 67, fieldKey: "sports_international_position", label: "Sports — International Level Position", fieldType: "text" },
        { col: 68, fieldKey: "sports_national_position", label: "Sports — National Level Position", fieldType: "text" },
        { col: 69, fieldKey: "sports_interuniversity_position", label: "Sports — Inter-University Level Position", fieldType: "text" },
      ],
    },
    {
      name: "Declarations & Other",
      fields: [
        { col: 71, fieldKey: "joining_period_required", label: "Period Required for Joining", fieldType: "text" },
        { col: 73, fieldKey: "convicted_or_debarred", label: "Convicted / Detained / Debarred?", fieldType: "textarea" },
        { col: 75, fieldKey: "removed_or_disciplinary_action", label: "Removed / Disciplinary Action?", fieldType: "textarea" },
        { col: 77, fieldKey: "additional_information", label: "Additional Information", fieldType: "textarea" },
      ],
    },
  ],
  documents: [
    { col: 4, label: "Photograph" },
    { col: 5, label: "Signature" },
    { col: 21, label: "Physically Handicapped — Supporting Document" },
    { col: 28, label: "University Approval — Supporting Document" },
    { col: 41, label: "Matriculation — Certificate" },
    { col: 42, label: "10+2 — Certificate" },
    { col: 43, label: "Graduation — Certificate" },
    { col: 44, label: "Post-Graduation — Certificate" },
    { col: 45, label: "M.Phil / Ph.D. / NET / JRF / SLET — Combined Certificate" },
    { col: 46, label: "Ph.D. — Certificate" },
    { col: 47, label: "NET — Certificate" },
    { col: 48, label: "NET (JRF) — Certificate" },
    { col: 49, label: "SLET/SET — Certificate" },
    { col: 50, label: "Other Qualification — Certificate" },
    { col: 56, label: "Teaching Experience — Supporting Document" },
    { col: 61, label: "Research Publications — Supporting Document" },
    { col: 66, label: "NSS Award — Supporting Document" },
    { col: 70, label: "Sports — Supporting Document" },
    { col: 72, label: "Fee Payment — Supporting Document" },
    { col: 74, label: "Convictions/Debarment — Supporting Document" },
    { col: 76, label: "Disciplinary Action — Supporting Document" },
    { col: 78, label: "Additional Information — Supporting Document" },
    { col: 103, label: "Score Sheet" },
  ],
};

async function main() {
  await prisma.tenant.update({
    where: { slug: "nbgsm" },
    data: {
      sheetSourceUrl: SHEET_EXPORT_URL,
      sheetMappingJson: JSON.stringify(config),
    },
  });
  console.log("NBGSM sheet import config written.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
