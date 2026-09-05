import { Browser, launch } from "puppeteer";

let browser: Browser | null = null;

async function getBrowser() {
  if (!browser) {
    browser = await launch({ headless: true, args: ["--no-sandbox"] });
  }
  return browser;
}

export async function renderHtmlToPdf(html: string): Promise<Buffer> {
  const browserInstance = await getBrowser();
  const page = await browserInstance.newPage();
  await page.setContent(html, { waitUntil: "load" });
  const pdfData = await page.pdf({
    format: "A4",
    margin: { top: "0.5in", right: "0.5in", bottom: "0.5in", left: "0.5in" },
  });
  await page.close();
  return Buffer.from(pdfData);
}

/**
 * Renders a template with Handlebars-like {{variable}}, {{#if}}, and {{#each}}
 * syntax. Handles nested {{#each}}/{{#if}} blocks by tracking tag depth instead
 * of relying on a single non-greedy regex (which breaks as soon as a loop is
 * nested inside another loop, since it stops at the first {{/each}} it finds).
 */
export function renderTemplate(template: string, data: Record<string, any>): string {
  return renderScope(template, data);
}

function resolveKey(scope: Record<string, any>, key: string): any {
  let value: any = scope;
  for (const k of key.trim().split(".")) {
    value = value?.[k];
  }
  return value;
}

function substituteVariables(text: string, scope: Record<string, any>): string {
  return text.replace(/\{\{\.?([\w.]+)\}\}/g, (match: string, key: string) => {
    const value = resolveKey(scope, key);
    return value === undefined || value === null ? match : String(value);
  });
}

/**
 * Extracts the content between a block's opening tag and its matching closing
 * tag, accounting for nested occurrences of the same block type.
 */
function extractBlock(
  template: string,
  startIndex: number,
  openMarker: string,
  closeMarker: string
): { innerContent: string; endIndex: number } {
  let depth = 1;
  let idx = startIndex;
  while (depth > 0) {
    const nextOpen = template.indexOf(openMarker, idx);
    const nextClose = template.indexOf(closeMarker, idx);
    if (nextClose === -1) {
      return { innerContent: template.slice(startIndex), endIndex: template.length };
    }
    if (nextOpen !== -1 && nextOpen < nextClose) {
      depth++;
      idx = nextOpen + openMarker.length;
    } else {
      depth--;
      if (depth === 0) {
        return { innerContent: template.slice(startIndex, nextClose), endIndex: nextClose + closeMarker.length };
      }
      idx = nextClose + closeMarker.length;
    }
  }
  return { innerContent: "", endIndex: template.length };
}

function renderScope(template: string, scope: Record<string, any>): string {
  let result = "";
  let i = 0;

  while (i < template.length) {
    const eachStart = template.indexOf("{{#each", i);
    const ifStart = template.indexOf("{{#if", i);

    let nextTag = -1;
    let tagType: "each" | "if" | null = null;
    if (eachStart !== -1 && (ifStart === -1 || eachStart < ifStart)) {
      nextTag = eachStart;
      tagType = "each";
    } else if (ifStart !== -1) {
      nextTag = ifStart;
      tagType = "if";
    }

    if (nextTag === -1) {
      result += substituteVariables(template.slice(i), scope);
      break;
    }

    result += substituteVariables(template.slice(i, nextTag), scope);

    const openTagEnd = template.indexOf("}}", nextTag);
    if (openTagEnd === -1) {
      // Malformed tag with no closing "}}" — treat the rest as literal text.
      result += template.slice(nextTag);
      break;
    }
    const openTag = template.slice(nextTag, openTagEnd + 2);

    if (tagType === "each") {
      const keyMatch = /\{\{#each\s+([^}]+)\}\}/.exec(openTag);
      const arrayKey = keyMatch ? keyMatch[1].trim() : "";
      const { innerContent, endIndex } = extractBlock(template, openTagEnd + 2, "{{#each", "{{/each}}");
      const arr = resolveKey(scope, arrayKey);
      if (Array.isArray(arr)) {
        for (const item of arr) {
          const childScope = item && typeof item === "object" ? { ...scope, ...item } : scope;
          result += renderScope(innerContent, childScope);
        }
      }
      i = endIndex;
    } else {
      const keyMatch = /\{\{#if\s+([^}]+)\}\}/.exec(openTag);
      const condKey = keyMatch ? keyMatch[1].trim() : "";
      const { innerContent, endIndex } = extractBlock(template, openTagEnd + 2, "{{#if", "{{/if}}");
      if (resolveKey(scope, condKey)) {
        result += renderScope(innerContent, scope);
      }
      i = endIndex;
    }
  }

  return result;
}
