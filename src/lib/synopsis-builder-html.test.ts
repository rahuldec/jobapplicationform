import { describe, it, expect } from "vitest";
import { configToHtml } from "./synopsis-builder-html";
import { createBlock, SynopsisBuilderConfig } from "./synopsis-builder-types";

describe("configToHtml", () => {
  it("generates valid HTML for empty config", () => {
    const config: SynopsisBuilderConfig = { blocks: [], version: "1.0" };
    const html = configToHtml(config);

    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("<title>Template</title>");
    expect(html).toContain("</html>");
  });

  it("renders text block with content", () => {
    const block = createBlock("text");
    block.properties.content = "Hello World";

    const config: SynopsisBuilderConfig = { blocks: [block], version: "1.0" };
    const html = configToHtml(config);

    expect(html).toContain("Hello World");
    expect(html).toContain("<p");
    expect(html).toContain("block-text");
  });

  it("renders text block with field variables", () => {
    const block = createBlock("text");
    block.properties.content = "Candidate: {{candidateName}}";

    const config: SynopsisBuilderConfig = { blocks: [block], version: "1.0" };
    const html = configToHtml(config);

    expect(html).toContain("{{candidateName}}");
  });

  it("renders image block with URL source", () => {
    const block = createBlock("image");
    block.properties.source = "url";
    block.properties.imageUrl = "https://example.com/logo.png";
    block.properties.maxWidth = "200px";

    const config: SynopsisBuilderConfig = { blocks: [block], version: "1.0" };
    const html = configToHtml(config);

    expect(html).toContain("https://example.com/logo.png");
    expect(html).toContain("max-width: 200px");
  });

  it("renders image block with field source", () => {
    const block = createBlock("image");
    block.properties.source = "field";
    block.properties.fieldKey = "logoUrl";

    const config: SynopsisBuilderConfig = { blocks: [block], version: "1.0" };
    const html = configToHtml(config);

    expect(html).toContain("{{logoUrl}}");
  });

  it("renders section block with title", () => {
    const block = createBlock("section");
    block.properties.title = "Personal Information";

    const config: SynopsisBuilderConfig = { blocks: [block], version: "1.0" };
    const html = configToHtml(config);

    expect(html).toContain("Personal Information");
    expect(html).toContain("<section");
    expect(html).toContain(".section-title");
  });

  it("renders horizontal line block", () => {
    const block = createBlock("horizontal-line");

    const config: SynopsisBuilderConfig = { blocks: [block], version: "1.0" };
    const html = configToHtml(config);

    expect(html).toContain("<hr");
    expect(html).toContain("block-horizontal-line");
  });

  it("renders button block with label", () => {
    const block = createBlock("button");
    block.properties.label = "Submit Application";

    const config: SynopsisBuilderConfig = { blocks: [block], version: "1.0" };
    const html = configToHtml(config);

    expect(html).toContain("<button");
    expect(html).toContain("Submit Application");
  });

  it("renders table block with form sections loop", () => {
    const block = createBlock("table");
    block.properties.dataSource = "formSections";

    const config: SynopsisBuilderConfig = { blocks: [block], version: "1.0" };
    const html = configToHtml(config);

    expect(html).toContain("<table");
    expect(html).toContain("{{#each formSections}}");
    expect(html).toContain("{{fieldLabel}}");
    expect(html).toContain("{{fieldValue}}");
  });

  it("renders 2-column layout with children", () => {
    const layoutBlock = createBlock("layout-2col");
    const childBlock1 = createBlock("text");
    childBlock1.properties.content = "Column 1";
    const childBlock2 = createBlock("text");
    childBlock2.properties.content = "Column 2";
    layoutBlock.children = [childBlock1, childBlock2];

    const config: SynopsisBuilderConfig = { blocks: [layoutBlock], version: "1.0" };
    const html = configToHtml(config);

    expect(html).toContain("layout-2col");
    expect(html).toContain("grid-template-columns: repeat(2, 1fr)");
    expect(html).toContain("Column 1");
    expect(html).toContain("Column 2");
  });

  it("renders 3-column layout", () => {
    const block = createBlock("layout-3col");
    block.properties.gap = "30px";

    const config: SynopsisBuilderConfig = { blocks: [block], version: "1.0" };
    const html = configToHtml(config);

    expect(html).toContain("layout-3col");
    expect(html).toContain("grid-template-columns: repeat(3, 1fr)");
    expect(html).toContain("gap: 30px");
  });

  it("renders empty block", () => {
    const block = createBlock("empty");

    const config: SynopsisBuilderConfig = { blocks: [block], version: "1.0" };
    const html = configToHtml(config);

    expect(html).toContain("empty-block");
  });

  it("applies block styling properties", () => {
    const block = createBlock("text");
    block.properties.content = "Styled Text";
    block.properties.padding = "20px";
    block.properties.backgroundColor = "#f0f0f0";
    block.properties.fontSize = "18px";
    block.properties.fontWeight = "bold";

    const config: SynopsisBuilderConfig = { blocks: [block], version: "1.0" };
    const html = configToHtml(config);

    expect(html).toContain("padding: 20px");
    expect(html).toContain("background-color: #f0f0f0");
    expect(html).toContain("font-size: 18px");
    expect(html).toContain("font-weight: bold");
  });

  it("renders multiple blocks in sequence", () => {
    const block1 = createBlock("text");
    block1.properties.content = "First";
    const block2 = createBlock("horizontal-line");
    const block3 = createBlock("text");
    block3.properties.content = "Second";

    const config: SynopsisBuilderConfig = {
      blocks: [block1, block2, block3],
      version: "1.0",
    };
    const html = configToHtml(config);

    expect(html).toContain("First");
    expect(html).toContain("<hr");
    expect(html).toContain("Second");
  });

  it("includes CSS in generated HTML", () => {
    const config: SynopsisBuilderConfig = { blocks: [], version: "1.0" };
    const html = configToHtml(config);

    expect(html).toContain("<style>");
    expect(html).toContain("</style>");
    expect(html).toContain("font-family");
    expect(html).toContain("page-break");
  });
});
