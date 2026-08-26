// Sends transactional email via Zoho ZeptoMail's REST API. Needs
// ZEPTOMAIL_TOKEN (the account's Send Mail Token) and ZEPTOMAIL_FROM_EMAIL
// (a sender address verified in that ZeptoMail account) set as env vars —
// without them this is a no-op (logs and returns, never throws), so a
// tenant that hasn't set up email yet doesn't break interview scheduling.
const ZEPTOMAIL_API_URL = process.env.ZEPTOMAIL_API_URL || "https://api.zeptomail.com/v1.1/email";

export async function sendEmail(input: { to: string; toName?: string; subject: string; html: string }): Promise<{ sent: boolean; error?: string }> {
  const token = process.env.ZEPTOMAIL_TOKEN;
  const fromEmail = process.env.ZEPTOMAIL_FROM_EMAIL;
  if (!token || !fromEmail) {
    console.warn("[email] ZEPTOMAIL_TOKEN/ZEPTOMAIL_FROM_EMAIL not configured — skipping send.");
    return { sent: false, error: "Email not configured" };
  }

  const res = await fetch(ZEPTOMAIL_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Zoho-enczapikey ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: { address: fromEmail, name: process.env.ZEPTOMAIL_FROM_NAME || undefined },
      to: [{ email_address: { address: input.to, name: input.toName || undefined } }],
      subject: input.subject,
      htmlbody: input.html,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error(`[email] ZeptoMail send failed: HTTP ${res.status} ${body}`);
    return { sent: false, error: `HTTP ${res.status}` };
  }
  return { sent: true };
}

// {placeholder} substitution, same lightweight approach as
// prisma/sheet-import/sync.ts's applyTemplate — no unknown placeholder
// left in the output ever leaks a raw {token} to the candidate; anything
// not in the map is simply removed.
export function renderTemplate(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_match, key: string) => values[key] ?? "");
}

export const DEFAULT_INTERVIEW_EMAIL_SUBJECT = "Your interview for {jobTitle} has been scheduled";
export const DEFAULT_INTERVIEW_EMAIL_BODY = `<p>Dear {candidateName},</p>
<p>Your interview for <strong>{jobTitle}</strong> at {collegeName} has been scheduled.</p>
<ul>
  <li><strong>Date &amp; time:</strong> {scheduledAt}</li>
  <li><strong>Mode:</strong> {mode}</li>
  <li><strong>Location / link:</strong> {location}</li>
</ul>
<p>Please be available at least 15 minutes before the scheduled time.</p>
<p>Regards,<br/>{collegeName}</p>`;
