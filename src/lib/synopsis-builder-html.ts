import { SynopsisBuilderConfig, Block } from "./synopsis-builder-types";

/**
 * Converts a visual builder config to HTML for PDF rendering.
 * Generates complete HTML document with embedded CSS.
 */
export function configToHtml(config: SynopsisBuilderConfig): string {
  const blocksHtml = config.blocks.map((block) => renderBlock(block)).join("\n");

  const css = generateCSS();

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Template</title>
  <style>
    ${css}
  </style>
</head>
<body>
  <div class="page">
    ${blocksHtml}
  </div>
</body>
</html>`;
}

/**
 * Render a single block to HTML
 */
function renderBlock(block: Block): string {
  const baseClass = `block block-${block.type}`;
  const style = generateBlockStyle(block);

  switch (block.type) {
    case "text":
      return renderTextBlock(block, baseClass, style);
    case "image":
      return renderImageBlock(block, baseClass, style);
    case "table":
      return renderTableBlock(block, baseClass, style);
    case "section":
      return renderSectionBlock(block, baseClass, style);
    case "horizontal-line":
      return renderHorizontalLineBlock(baseClass, style);
    case "button":
      return renderButtonBlock(block, baseClass, style);
    case "layout-2col":
      return renderLayoutBlock(block, 2, baseClass, style);
    case "layout-3col":
      return renderLayoutBlock(block, 3, baseClass, style);
    case "layout-1col":
      return renderLayoutBlock(block, 1, baseClass, style);
    case "empty":
      return renderEmptyBlock(baseClass, style);
    default:
      return `<!-- Unknown block type: ${block.type} -->`;
  }
}

/**
 * Text block: <p> with content and field variables
 */
function renderTextBlock(block: Block, baseClass: string, style: string): string {
  const content = block.properties.content || "";
  return `<p class="${baseClass}" style="${style}">${content}</p>`;
}

/**
 * Image block: conditional on source type
 */
function renderImageBlock(block: Block, baseClass: string, style: string): string {
  const source = block.properties.source || "url";
  const maxWidth = block.properties.maxWidth || "100%";

  if (source === "field" && block.properties.fieldKey) {
    return `<div class="${baseClass} image-block" style="${style}">
      <img src="{{${block.properties.fieldKey}}}" style="max-width: ${maxWidth}; height: auto;" />
    </div>`;
  }

  const imageUrl = block.properties.imageUrl || "";
  return `<div class="${baseClass} image-block" style="${style}">
    <img src="${imageUrl}" style="max-width: ${maxWidth}; height: auto;" />
  </div>`;
}

/**
 * Table block: data-driven table
 * For form sections: {{#each formSections}} with fields
 */
function renderTableBlock(block: Block, baseClass: string, style: string): string {
  const dataSource = block.properties.dataSource || "formSections";

  if (dataSource === "formSections") {
    return `<div class="${baseClass} table-container" style="${style}">
      <table class="form-table">
        <thead>
          <tr>
            <th>Field</th>
            <th>Value</th>
          </tr>
        </thead>
        <tbody>
          {{#each formSections}}
            {{#each fields}}
            <tr>
              <td>{{fieldLabel}}</td>
              <td>{{fieldValue}}</td>
            </tr>
            {{/each}}
          {{/each}}
        </tbody>
      </table>
    </div>`;
  }

  // Custom table with columns
  const headers = block.properties.columns
    ?.map((col) => `<th>${col.label}</th>`)
    .join("") || "";

  return `<div class="${baseClass} table-container" style="${style}">
    <table class="data-table">
      <thead>
        <tr>${headers}</tr>
      </thead>
      <tbody>
        <!-- Add custom table rows here -->
      </tbody>
    </table>
  </div>`;
}

/**
 * Section block: semantic section with title
 */
function renderSectionBlock(block: Block, baseClass: string, style: string): string {
  const title = block.properties.title || "Section";
  const content = block.properties.content || "";
  return `<section class="${baseClass}" style="${style}">
    <h2 class="section-title">${title}</h2>
    ${content ? `<div class="section-content">${content}</div>` : ""}
  </section>`;
}

/**
 * Horizontal line/divider
 */
function renderHorizontalLineBlock(baseClass: string, style: string): string {
  return `<hr class="${baseClass}" style="${style}" />`;
}

/**
 * Button block
 */
function renderButtonBlock(block: Block, baseClass: string, style: string): string {
  const label = block.properties.label || "Button";
  return `<button class="${baseClass}" style="${style}">${label}</button>`;
}

/**
 * Layout blocks (1-col, 2-col, 3-col)
 */
function renderLayoutBlock(
  block: Block,
  columns: number,
  baseClass: string,
  style: string
): string {
  const gap = block.properties.gap || "20px";
  const childBlocks = (block.children || []).map((child) => renderBlock(child)).join("\n");

  return `<div class="${baseClass} layout-${columns}col" style="${style}; display: grid; grid-template-columns: repeat(${columns}, 1fr); gap: ${gap};">
    ${childBlocks}
  </div>`;
}

/**
 * Empty block: just a spacer
 */
function renderEmptyBlock(baseClass: string, style: string): string {
  return `<div class="${baseClass} empty-block" style="${style}"></div>`;
}

/**
 * Generate CSS for a block based on properties
 */
function generateBlockStyle(block: Block): string {
  const styles: string[] = [];

  if (block.properties.padding) {
    styles.push(`padding: ${block.properties.padding}`);
  }
  if (block.properties.backgroundColor) {
    styles.push(`background-color: ${block.properties.backgroundColor}`);
  }
  if (block.properties.borderBottom) {
    styles.push(`border-bottom: ${block.properties.borderBottom}`);
  }
  if (block.properties.fontSize) {
    styles.push(`font-size: ${block.properties.fontSize}`);
  }
  if (block.properties.fontWeight) {
    styles.push(`font-weight: ${block.properties.fontWeight}`);
  }

  return styles.join("; ");
}

/**
 * Generate global CSS for the page
 */
function generateCSS(): string {
  return `
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
      color: #333;
      line-height: 1.6;
      background: white;
    }

    .page {
      page-break-after: always;
      padding: 40px;
      background: white;
      min-height: 100vh;
    }

    .block {
      margin-bottom: 16px;
    }

    p {
      font-size: 14px;
      line-height: 1.6;
      margin-bottom: 12px;
    }

    section {
      margin-bottom: 20px;
      page-break-inside: avoid;
    }

    .section-content {
      font-size: 14px;
      line-height: 1.6;
    }

    .section-title {
      font-size: 16px;
      font-weight: 600;
      color: #0f172a;
      text-transform: uppercase;
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 1px solid #e2e8f0;
    }

    .image-block {
      text-align: center;
      margin: 16px 0;
    }

    .image-block img {
      max-width: 100%;
      height: auto;
    }

    .table-container {
      overflow-x: auto;
      margin: 16px 0;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }

    table th {
      background-color: #f1f5f9;
      padding: 12px;
      text-align: left;
      font-weight: 600;
      border-bottom: 2px solid #cbd5e1;
    }

    table td {
      padding: 10px 12px;
      border-bottom: 1px solid #e2e8f0;
    }

    table tr:hover {
      background-color: #f8fafc;
    }

    hr {
      border: none;
      border-top: 1px solid #cbd5e1;
      margin: 20px 0;
    }

    button {
      padding: 10px 20px;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      background: white;
      transition: all 0.2s;
    }

    button:hover {
      background-color: #f1f5f9;
      border-color: #94a3b8;
    }

    .layout-1col {
      display: block;
    }

    .layout-2col {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
    }

    .layout-3col {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 20px;
    }

    .empty-block {
      height: 20px;
    }

    @media print {
      body {
        background: white;
      }
      .page {
        padding: 20px;
        page-break-after: always;
      }
    }
  `;
}
