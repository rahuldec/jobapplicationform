import { afterEach, describe, expect, it, vi } from "vitest";
import { parseEmailList, renderTemplate, sendEmail } from "./email";

describe("renderTemplate", () => {
  it("substitutes every placeholder present in the values map", () => {
    const out = renderTemplate("Hi {name}, your role is {role}.", { name: "Alice", role: "Recruiter" });
    expect(out).toBe("Hi Alice, your role is Recruiter.");
  });

  it("removes a placeholder with no matching value instead of leaving the raw token", () => {
    const out = renderTemplate("Hi {name}, code {missing}.", { name: "Alice" });
    expect(out).toBe("Hi Alice, code .");
  });

  it("leaves plain text with no placeholders untouched", () => {
    expect(renderTemplate("No placeholders here.", {})).toBe("No placeholders here.");
  });
});

describe("sendEmail", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("is a safe no-op (never throws) when ZEPTOMAIL env vars aren't configured", async () => {
    vi.stubEnv("ZEPTOMAIL_TOKEN", "");
    vi.stubEnv("ZEPTOMAIL_FROM_EMAIL", "");
    const result = await sendEmail({ to: "candidate@example.com", subject: "Hi", html: "<p>Hi</p>" });
    expect(result).toEqual({ sent: false, error: "Email not configured" });
  });

  it("posts to the ZeptoMail API with the configured credentials when set", async () => {
    vi.stubEnv("ZEPTOMAIL_TOKEN", "test-token");
    vi.stubEnv("ZEPTOMAIL_FROM_EMAIL", "noreply@example.com");
    const fetchMock = vi.fn(async (_url: string, _options: RequestInit) => ({ ok: true, status: 200, text: async () => "" }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await sendEmail({ to: "candidate@example.com", toName: "Candidate", subject: "Hi", html: "<p>Hi</p>" });

    expect(result).toEqual({ sent: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const call = fetchMock.mock.calls[0];
    if (!call) throw new Error("fetch was not called");
    const [url, options] = call;
    expect(url).toContain("zeptomail");
    const headers = options.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Zoho-enczapikey test-token");
    const body = JSON.parse(options.body as string);
    expect(body.from.address).toBe("noreply@example.com");
    expect(body.to[0].email_address.address).toBe("candidate@example.com");
    expect(body.subject).toBe("Hi");
  });

  it("reports failure without throwing when the API responds with an error status", async () => {
    vi.stubEnv("ZEPTOMAIL_TOKEN", "test-token");
    vi.stubEnv("ZEPTOMAIL_FROM_EMAIL", "noreply@example.com");
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 401, text: async () => "invalid token" })));

    const result = await sendEmail({ to: "candidate@example.com", subject: "Hi", html: "<p>Hi</p>" });

    expect(result).toEqual({ sent: false, error: "HTTP 401" });
  });

  it("includes cc addresses in the ZeptoMail request body when provided", async () => {
    vi.stubEnv("ZEPTOMAIL_TOKEN", "test-token");
    vi.stubEnv("ZEPTOMAIL_FROM_EMAIL", "noreply@example.com");
    const fetchMock = vi.fn(async (_url: string, _options: RequestInit) => ({ ok: true, status: 200, text: async () => "" }));
    vi.stubGlobal("fetch", fetchMock);

    await sendEmail({ to: "candidate@example.com", cc: ["hr@example.com", "dept@example.com"], subject: "Hi", html: "<p>Hi</p>" });

    const call = fetchMock.mock.calls[0];
    if (!call) throw new Error("fetch was not called");
    const [, options] = call;
    const body = JSON.parse(options.body as string);
    expect(body.cc).toEqual([{ email_address: { address: "hr@example.com" } }, { email_address: { address: "dept@example.com" } }]);
  });

  it("omits cc from the request body when no cc addresses are given", async () => {
    vi.stubEnv("ZEPTOMAIL_TOKEN", "test-token");
    vi.stubEnv("ZEPTOMAIL_FROM_EMAIL", "noreply@example.com");
    const fetchMock = vi.fn(async (_url: string, _options: RequestInit) => ({ ok: true, status: 200, text: async () => "" }));
    vi.stubGlobal("fetch", fetchMock);

    await sendEmail({ to: "candidate@example.com", subject: "Hi", html: "<p>Hi</p>" });

    const call = fetchMock.mock.calls[0];
    if (!call) throw new Error("fetch was not called");
    const [, options] = call;
    const body = JSON.parse(options.body as string);
    expect(body.cc).toBeUndefined();
  });

  it("includes bcc addresses in the ZeptoMail request body when provided", async () => {
    vi.stubEnv("ZEPTOMAIL_TOKEN", "test-token");
    vi.stubEnv("ZEPTOMAIL_FROM_EMAIL", "noreply@example.com");
    const fetchMock = vi.fn(async (_url: string, _options: RequestInit) => ({ ok: true, status: 200, text: async () => "" }));
    vi.stubGlobal("fetch", fetchMock);

    await sendEmail({ to: "candidate@example.com", bcc: ["records@example.com"], subject: "Hi", html: "<p>Hi</p>" });

    const call = fetchMock.mock.calls[0];
    if (!call) throw new Error("fetch was not called");
    const [, options] = call;
    const body = JSON.parse(options.body as string);
    expect(body.bcc).toEqual([{ email_address: { address: "records@example.com" } }]);
  });

  it("omits bcc from the request body when no bcc addresses are given", async () => {
    vi.stubEnv("ZEPTOMAIL_TOKEN", "test-token");
    vi.stubEnv("ZEPTOMAIL_FROM_EMAIL", "noreply@example.com");
    const fetchMock = vi.fn(async (_url: string, _options: RequestInit) => ({ ok: true, status: 200, text: async () => "" }));
    vi.stubGlobal("fetch", fetchMock);

    await sendEmail({ to: "candidate@example.com", subject: "Hi", html: "<p>Hi</p>" });

    const call = fetchMock.mock.calls[0];
    if (!call) throw new Error("fetch was not called");
    const [, options] = call;
    const body = JSON.parse(options.body as string);
    expect(body.bcc).toBeUndefined();
  });
});

describe("parseEmailList", () => {
  it("splits comma and semicolon separated addresses and trims whitespace", () => {
    expect(parseEmailList("hr@example.com, dept@example.com ; another@example.com")).toEqual([
      "hr@example.com",
      "dept@example.com",
      "another@example.com",
    ]);
  });

  it("drops entries that don't look like an email address", () => {
    expect(parseEmailList("hr@example.com, not-an-email, dept@example.com")).toEqual(["hr@example.com", "dept@example.com"]);
  });

  it("deduplicates repeated addresses", () => {
    expect(parseEmailList("hr@example.com, hr@example.com")).toEqual(["hr@example.com"]);
  });

  it("returns an empty array for null, undefined, or empty input", () => {
    expect(parseEmailList(null)).toEqual([]);
    expect(parseEmailList(undefined)).toEqual([]);
    expect(parseEmailList("")).toEqual([]);
  });
});
