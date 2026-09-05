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
 * Renders a template with Handlebars-like {{variable}} syntax.
 * Simple replacement — no complex logic, just {{key}} → value.
 */
export function renderTemplate(template: string, data: Record<string, any>): string {
  let result = template;

  // Replace {{variable}} with value
  result = result.replace(/\{\{([^}]+)\}\}/g, (match: string, key: string) => {
    const keys = key.trim().split(".");
    let value: any = data;
    for (const k of keys) {
      value = value?.[k];
    }
    return String(value ?? match);
  });

  // Handle {{#if variable}}...{{/if}} (simple conditionals)
  result = result.replace(/\{\{#if\s+([^}]+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (match: string, condition: string, content: string) => {
    const keys = condition.trim().split(".");
    let value: any = data;
    for (const k of keys) {
      value = value?.[k];
    }
    return value ? content : "";
  });

  // Handle {{#each array}}...{{/each}} (loops)
  result = result.replace(/\{\{#each\s+([^}]+)\}\}([\s\S]*?)\{\{\/each\}\}/g, (match: string, arrayKey: string, content: string) => {
    const keys = arrayKey.trim().split(".");
    let arr: any = data;
    for (const k of keys) {
      arr = arr?.[k];
    }
    if (!Array.isArray(arr)) return "";
    return arr.map((item: any) => content.replace(/\{\{\.([^}]+)\}\}/g, (m: string, key: string) => String(item[key] ?? m))).join("");
  });

  return result;
}
