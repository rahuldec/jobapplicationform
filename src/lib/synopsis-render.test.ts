import { describe, it, expect } from "vitest";
import { renderTemplate } from "./synopsis-render";

describe("renderTemplate", () => {
  it("substitutes plain variables", () => {
    const out = renderTemplate("Hello {{name}}", { name: "John" });
    expect(out).toBe("Hello John");
  });

  it("leaves unknown variables untouched", () => {
    const out = renderTemplate("Hello {{missing}}", {});
    expect(out).toBe("Hello {{missing}}");
  });

  it("handles {{#if}} conditionals", () => {
    expect(renderTemplate("{{#if show}}visible{{/if}}", { show: true })).toBe("visible");
    expect(renderTemplate("{{#if show}}visible{{/if}}", { show: false })).toBe("");
  });

  it("handles a single {{#each}} loop with bare variable names", () => {
    const out = renderTemplate(
      "{{#each items}}<li>{{label}}</li>{{/each}}",
      { items: [{ label: "A" }, { label: "B" }] }
    );
    expect(out).toBe("<li>A</li><li>B</li>");
  });

  it("handles nested {{#each}} loops (the synopsis table case)", () => {
    const template =
      "{{#each formSections}}{{#each fields}}<tr><td>{{fieldLabel}}</td><td>{{fieldValue}}</td></tr>{{/each}}{{/each}}";
    const data = {
      formSections: [
        { sectionName: "Personal", fields: [{ fieldLabel: "Name", fieldValue: "John" }] },
        { sectionName: "Education", fields: [{ fieldLabel: "Degree", fieldValue: "B.S." }] },
      ],
    };
    const out = renderTemplate(template, data);
    expect(out).toBe(
      "<tr><td>Name</td><td>John</td></tr><tr><td>Degree</td><td>B.S.</td></tr>"
    );
    expect(out).not.toContain("{{");
  });

  it("allows inner loop scope to fall back to outer/global variables", () => {
    const out = renderTemplate(
      "{{#each items}}{{outer}}-{{label}} {{/each}}",
      { outer: "X", items: [{ label: "A" }, { label: "B" }] }
    );
    expect(out).toBe("X-A X-B ");
  });
});
