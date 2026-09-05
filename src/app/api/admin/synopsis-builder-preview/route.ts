import { NextRequest, NextResponse } from "next/server";
import { SynopsisBuilderConfig } from "@/lib/synopsis-builder-types";
import { configToHtml } from "@/lib/synopsis-builder-html";
import { renderTemplate } from "@/lib/synopsis-render";

/**
 * Preview API: Returns HTML preview of builder config with sample data
 * Useful for previewing template before saving to PDF
 */
export async function POST(req: NextRequest) {
  try {
    const { config } = await req.json();

    if (!config || !Array.isArray(config.blocks)) {
      return NextResponse.json({ error: "Invalid config structure" }, { status: 400 });
    }

    // Generate HTML from config
    const html = configToHtml(config as SynopsisBuilderConfig);

    // Apply sample data to preview
    const sampleData = {
      candidateName: "John Doe",
      candidateEmail: "john@example.com",
      candidateMobile: "555-1234",
      candidateDob: "01/15/1995",
      candidateGender: "Male",
      candidateStatus: "Interview Scheduled",
      jobTitle: "Software Engineer",
      department: "Engineering",
      appliedDate: "09/05/2026",
      organizationName: "Acme Corporation",
      logoUrl: "",
      generatedDate: new Date().toLocaleString(),
      signatureImageUrl: "",
      declarationText: "I declare that the information provided above is true and complete.",
      formSections: [
        {
          sectionName: "Personal Information",
          fields: [
            { fieldLabel: "Full Name", fieldValue: "John Doe" },
            { fieldLabel: "Email", fieldValue: "john@example.com" },
            { fieldLabel: "Phone", fieldValue: "555-1234" },
          ],
        },
        {
          sectionName: "Education",
          fields: [
            { fieldLabel: "Degree", fieldValue: "B.S. Computer Science" },
            { fieldLabel: "University", fieldValue: "University of Example" },
            { fieldLabel: "Graduation Year", fieldValue: "2020" },
          ],
        },
      ],
    };

    // Inject sample data into HTML
    const renderedHtml = renderTemplate(html, sampleData);

    return NextResponse.json({
      ok: true,
      html: renderedHtml,
      message: "Preview generated with sample data",
    });
  } catch (err) {
    console.error("Failed to generate preview:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to generate preview" },
      { status: 500 }
    );
  }
}
