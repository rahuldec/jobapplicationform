// Visual template builder types and configuration

export type BlockType =
  | "text"
  | "image"
  | "table"
  | "horizontal-line"
  | "button"
  | "section"
  | "layout-2col"
  | "layout-3col"
  | "layout-1col"
  | "empty";

export type FieldKey =
  | "candidateName"
  | "candidateEmail"
  | "candidateMobile"
  | "candidateDob"
  | "candidateGender"
  | "candidateStatus"
  | "jobTitle"
  | "department"
  | "appliedDate"
  | "organizationName"
  | "logoUrl"
  | "generatedDate"
  | "signatureImageUrl"
  | "declarationText"
  | "formSections";

export interface Block {
  id: string;
  type: BlockType;
  parentId?: string; // For nested blocks in layouts
  order: number;

  // Common properties
  properties: {
    // Text block
    content?: string;
    fontSize?: string;
    fontWeight?: "normal" | "bold" | "600";

    // Image block
    source?: "field" | "url";
    fieldKey?: FieldKey;
    imageUrl?: string;
    maxWidth?: string;

    // Button
    label?: string;

    // Section
    title?: string;

    // Table
    columns?: { label: string; fieldKey?: FieldKey; type: "field" | "text" }[];
    dataSource?: "formSections" | "custom";

    // Layout
    columns?: number;
    gap?: string;

    // All blocks
    padding?: string;
    backgroundColor?: string;
    borderBottom?: string;
  };

  // Child blocks (for layouts)
  children?: Block[];
}

export interface SynopsisBuilderConfig {
  blocks: Block[];
  version: "1.0";
  createdAt?: string;
  updatedAt?: string;
}

// Get all available field variables
export const AVAILABLE_FIELDS: Record<FieldKey, { label: string; description: string }> = {
  candidateName: { label: "Candidate Name", description: "Full name of the applicant" },
  candidateEmail: { label: "Email", description: "Email address" },
  candidateMobile: { label: "Mobile", description: "Phone number" },
  candidateDob: { label: "Date of Birth", description: "DOB" },
  candidateGender: { label: "Gender", description: "Gender" },
  candidateStatus: { label: "Status", description: "Application status" },
  jobTitle: { label: "Job Title", description: "Position applied for" },
  department: { label: "Department", description: "Department" },
  appliedDate: { label: "Applied Date", description: "Application date" },
  organizationName: { label: "Organization", description: "Organization name" },
  logoUrl: { label: "Logo", description: "Organization logo" },
  generatedDate: { label: "Generated Date", description: "PDF generation date" },
  signatureImageUrl: { label: "Signature", description: "Candidate signature" },
  declarationText: { label: "Declaration", description: "Declaration/agreement text" },
  formSections: { label: "Form Sections", description: "All form responses (loop)" },
};

// Generate unique block ID
export function generateBlockId(): string {
  return `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Create default/empty block
export function createBlock(type: BlockType, order: number = 0): Block {
  return {
    id: generateBlockId(),
    type,
    order,
    properties: {},
    children: type.startsWith("layout-") ? [] : undefined,
  };
}
