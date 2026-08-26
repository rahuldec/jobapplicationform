import { afterEach, describe, expect, it, vi } from "vitest";
import { renderTemplate, sendEmail } from "./email";

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
    const fetchMock = vi.fn(async () => ({ ok: true, status: 200, text: async () => "" }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await sendEmail({ to: "candidate@example.com", toName: "Candidate", subject: "Hi", html: "<p>Hi</p>" });

    expect(result).toEqual({ sent: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toContain("zeptomail");
    expect(options.headers.Authorization).toBe("Zoho-enczapikey test-token");
    const body = JSON.parse(options.body);
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
});
