// Sends transactional email via Zoho ZeptoMail's REST API. Needs
// ZEPTOMAIL_TOKEN (the account's Send Mail Token) and ZEPTOMAIL_FROM_EMAIL
// (a sender address verified in that ZeptoMail account) set as env vars —
// without them this is a no-op (logs and returns, never throws), so a
// tenant that hasn't set up email yet doesn't break interview scheduling.
const ZEPTOMAIL_API_URL = process.env.ZEPTOMAIL_API_URL || "https://api.zeptomail.com/v1.1/email";

export async function sendEmail(input: {
  to: string;
  toName?: string;
  cc?: string[];
  bcc?: string[];
  subject: string;
  html: string;
}): Promise<{ sent: boolean; error?: string }> {
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
      cc: input.cc?.length ? input.cc.map((address) => ({ email_address: { address } })) : undefined,
      bcc: input.bcc?.length ? input.bcc.map((address) => ({ email_address: { address } })) : undefined,
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

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Comma or semicolon separated CC/BCC input from a plain text field ->
// deduplicated, validated address list. Silently drops anything that
// doesn't look like an email rather than rejecting the whole send over one
// typo'd address.
export function parseEmailList(raw: string | null | undefined): string[] {
  if (!raw) return [];
  const addresses = raw
    .split(/[,;]/)
    .map((a) => a.trim())
    .filter((a) => EMAIL_PATTERN.test(a));
  return [...new Set(addresses)];
}

export const INTERVIEW_EMAIL_PLACEHOLDERS = [
  "candidateName",
  "jobTitle",
  "collegeName",
  "scheduledAt",
  "mode",
  "location",
  "logoUrl",
  "brandColor",
];

export const DEFAULT_INTERVIEW_EMAIL_SUBJECT = "Your interview for {jobTitle} has been scheduled";

// Table-based layout with every color/font inlined, not linked to a
// stylesheet or CSS variables — email clients routinely strip <style>
// blocks and don't support var(...), unlike a normal web page. Same
// palette and Apple-system font stack as the kpi dashboard's own theme
// (ink/body/faint text hierarchy, hairline borders, a soft boxed details
// panel), with {logoUrl} and {brandColor} pulling each college's own
// branding rather than hardcoding one tenant's colors.
export const DEFAULT_INTERVIEW_EMAIL_BODY = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F5F5F7;padding:32px 16px;">
  <tr>
    <td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#FFFFFF;border:1px solid #D2D2D7;border-radius:12px;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
        <tr>
          <td style="background-color:{brandColor};height:4px;line-height:4px;font-size:0;">&nbsp;</td>
        </tr>
        <tr>
          <td style="padding:28px 32px 20px 32px;">
            <table role="presentation" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding-right:12px;"><img src="{logoUrl}" alt="{collegeName}" width="40" height="40" style="display:block;border-radius:8px;object-fit:contain;"></td>
                <td style="font-size:17px;font-weight:600;letter-spacing:-0.01em;color:#1D1D1F;">{collegeName}</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:0 32px;">
            <div style="border-top:1px solid #E8E8ED;"></div>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px 8px 32px;font-size:15px;line-height:1.55;color:#1D1D1F;">
            Dear {candidateName},
          </td>
        </tr>
        <tr>
          <td style="padding:0 32px 20px 32px;font-size:15px;line-height:1.55;color:#6E6E73;">
            Your interview for <strong style="color:#1D1D1F;">{jobTitle}</strong> at {collegeName} has been scheduled. Here are the details:
          </td>
        </tr>
        <tr>
          <td style="padding:0 32px 24px 32px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F5F5F7;border-radius:10px;">
              <tr>
                <td style="padding:16px 18px;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="padding-bottom:10px;font-size:11px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:#86868B;">Date &amp; time</td>
                    </tr>
                    <tr>
                      <td style="padding-bottom:14px;font-size:15px;font-weight:600;color:#1D1D1F;">{scheduledAt}</td>
                    </tr>
                    <tr>
                      <td style="padding-bottom:10px;font-size:11px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:#86868B;">Mode</td>
                    </tr>
                    <tr>
                      <td style="padding-bottom:14px;font-size:15px;font-weight:600;color:#1D1D1F;">{mode}</td>
                    </tr>
                    <tr>
                      <td style="padding-bottom:10px;font-size:11px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:#86868B;">Location / link</td>
                    </tr>
                    <tr>
                      <td style="font-size:15px;font-weight:600;color:#1D1D1F;">{location}</td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:0 32px 28px 32px;font-size:13.5px;line-height:1.55;color:#6E6E73;">
            Please be available at least 15 minutes before the scheduled time.
          </td>
        </tr>
        <tr>
          <td style="padding:0 32px;">
            <div style="border-top:1px solid #E8E8ED;"></div>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 32px 28px 32px;font-size:13.5px;line-height:1.55;color:#86868B;">
            Regards,<br>{collegeName}
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`;
