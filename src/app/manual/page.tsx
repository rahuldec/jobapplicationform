import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Configuration Guide — Recruitment Ops Portal",
  description: "Step-by-step guide to configuring a client on the Recruitment Ops Portal.",
};

const BODY_HTML = "<div class=\"manual-page\"><div class=\"shell\">\n  <nav class=\"sidebar\" aria-label=\"Table of contents\">\n    <div class=\"brand\"><span class=\"brand-mark\">ROP</span></div>\n    <h1>Recruitment Ops Portal</h1>\n    <div class=\"subtitle\">Configuration Guide</div>\n    <a href=\"/admin\" class=\"back-link\">\u2190 Back to admin</a>\n\n    <div class=\"nav-group-label\">Start here</div>\n    <ul class=\"toc\">\n      <li><a href=\"#getting-started\"><span class=\"num\">00</span> Getting started</a></li>\n      <li><a href=\"#adding-a-client\"><span class=\"num\">01</span> Adding a client</a></li>\n    </ul>\n\n    <div class=\"nav-group-label\">Configure a client</div>\n    <ul class=\"toc\">\n      <li><a href=\"#branding\"><span class=\"num\">02</span> Branding</a></li>\n      <li><a href=\"#staff\"><span class=\"num\">03</span> Staff</a></li>\n      <li><a href=\"#interview-email\"><span class=\"num\">04</span> Interview email</a></li>\n      <li><a href=\"#sheet-sync\"><span class=\"num\">05</span> Sheet sync</a></li>\n    </ul>\n\n    <div class=\"nav-group-label\">After setup</div>\n    <ul class=\"toc\">\n      <li><a href=\"#access\"><span class=\"num\">06</span> Giving access</a></li>\n      <li><a href=\"#syncing\"><span class=\"num\">07</span> Keeping data fresh</a></li>\n    </ul>\n  </nav>\n\n  <main>\n    <!-- 00 GETTING STARTED -->\n    <section class=\"chapter\" id=\"getting-started\">\n      <div class=\"chapter-head\">\n        <span class=\"chapter-num\">00</span>\n        <h2>Getting started</h2>\n      </div>\n      <p>All configuration happens in the <strong>admin area</strong>, at:</p>\n      <table class=\"field-ref\">\n        <tr><td class=\"label\">Admin area</td><td><code class=\"token\">jobportal.odpay.in/admin</code></td></tr>\n      </table>\n      <p class=\"muted\" style=\"margin-top:14px;\">This lists every client currently configured on the portal. Open one to edit it, or add a new one from the bottom of that page.</p>\n      <div class=\"callout warn\">\n        <span class=\"icon\">!</span>\n        <p>The admin area has no login screen yet \u2014 anyone with the link can open it. Don't share the <code class=\"token\">/admin</code> link outside the team that manages client setup.</p>\n      </div>\n    </section>\n\n    <!-- 01 ADDING A CLIENT -->\n    <section class=\"chapter\" id=\"adding-a-client\">\n      <div class=\"chapter-head\">\n        <span class=\"chapter-num\">01</span>\n        <h2>Adding a new client</h2>\n      </div>\n      <p class=\"chapter-dek\">Every institution \u2014 a college, a company, any organization running its own hiring pipeline \u2014 is a separate <strong>client</strong>. Creating one takes seconds; branding and data sync are configured after.</p>\n\n      <div class=\"ui-mock\">\n        <div class=\"ui-mock-head\"><span class=\"title\">Add a new client</span><span class=\"chip\">/admin</span></div>\n        <div class=\"ui-mock-body\">\n          <div class=\"mock-grid cols-2\">\n            <div class=\"mock-field\"><span class=\"mock-label\">Client name</span><div class=\"mock-input filled\" data-val=\"Doon Nagar College\"></div></div>\n            <div class=\"mock-field\"><span class=\"mock-label\">Route (used in the entry link)</span><div class=\"mock-input filled\" data-val=\"dn\"></div></div>\n          </div>\n          <div class=\"mock-actions\"><span class=\"mock-btn\">Create client</span></div>\n        </div>\n      </div>\n\n      <ol class=\"steps\">\n        <li><p><span class=\"field-name\">Client name</span> \u2014 the institution's full name. Shown throughout the portal.</p></li>\n        <li><p><span class=\"field-name\">Route</span> \u2014 a short, URL-safe id, e.g. <code class=\"token\">dn</code>. It will be the URL for that client's job portal.</p></li>\n        <li><p>Click <strong>Create client</strong>. You're taken straight into that client's configuration page \u2014 continue with Branding, below.</p></li>\n      </ol>\n\n    </section>\n\n    <!-- 02 BRANDING -->\n    <section class=\"chapter\" id=\"branding\">\n      <div class=\"chapter-head\">\n        <span class=\"chapter-num\">02</span>\n        <h2>Branding</h2>\n      </div>\n      <p class=\"chapter-dek\">Set the theme here \u2014 logo, name, and colors. You can change it anytime.</p>\n\n      <div class=\"ui-mock\">\n        <div class=\"ui-mock-head\"><span class=\"title\">Branding</span><span class=\"chip\">Section 1 of 4</span></div>\n        <div class=\"ui-mock-body\">\n          <div class=\"mock-grid cols-2\">\n            <div class=\"mock-field\"><span class=\"mock-label\">Full display name</span><div class=\"mock-input filled\" data-val=\"Doon Nagar College\"></div></div>\n            <div class=\"mock-field\"><span class=\"mock-label\">Short name (mobile nav)</span><div class=\"mock-input filled\" data-val=\"DN College\"></div></div>\n          </div>\n          <div class=\"mock-grid cols-3\" style=\"margin-top:14px;\">\n            <div class=\"mock-field\"><span class=\"mock-label\">Gradient \u2014 from</span><div class=\"mock-input\" style=\"background:#0f2359;border-color:#0f2359;\"></div></div>\n            <div class=\"mock-field\"><span class=\"mock-label\">Gradient \u2014 via</span><div class=\"mock-input\" style=\"background:#1b449c;border-color:#1b449c;\"></div></div>\n            <div class=\"mock-field\"><span class=\"mock-label\">Gradient \u2014 to</span><div class=\"mock-input\" style=\"background:#3465c9;border-color:#3465c9;\"></div></div>\n          </div>\n          <div class=\"mock-actions\"><span class=\"mock-btn\">Save branding</span></div>\n        </div>\n      </div>\n\n      <div class=\"tbl-wrap\">\n      <table class=\"field-ref\">\n        <tr><th>Field</th><th>What it controls</th></tr>\n        <tr><td class=\"label\">Full display name</td><td>The client's name wherever it's written out in full.</td></tr>\n        <tr><td class=\"label\">Short name</td><td>Used on narrow (mobile) screens where the full name would wrap or crowd the nav bar.</td></tr>\n        <tr><td class=\"label\">Tagline</td><td class=\"muted\">Optional one-liner under the name, e.g. \"Excellence in Education Since 1956.\" Leave blank for none.</td></tr>\n        <tr><td class=\"label\">Logo</td><td class=\"muted\">PNG or JPEG. Leave blank on an update to keep the current logo.</td></tr>\n        <tr><td class=\"label\">Gradient (from / via / to)</td><td>Three colors blended for the nav bar background. Pick with the color swatch or type a hex code directly.</td></tr>\n      </table>\n      </div>\n    </section>\n\n    <!-- 03 STAFF -->\n    <section class=\"chapter\" id=\"staff\">\n      <div class=\"chapter-head\">\n        <span class=\"chapter-num\">03</span>\n        <h2>Staff</h2>\n      </div>\n      <p class=\"chapter-dek\">The recruiters and panel members who show up in the \"assign to\" dropdown on that client's Applications list.</p>\n\n      <div class=\"ui-mock\">\n        <div class=\"ui-mock-head\"><span class=\"title\">Staff</span><span class=\"chip\">Section 2 of 4</span></div>\n        <div class=\"ui-mock-body\">\n          <div class=\"staff-row\"><span><span class=\"staff-name\">Dr. A. Sharma</span><span class=\"staff-email\">a.sharma@example.com</span></span><span class=\"role-pill\">Recruiter</span></div>\n          <div class=\"staff-row\"><span><span class=\"staff-name\">Prof. B. Singh</span><span class=\"staff-email\">b.singh@example.com</span></span><span class=\"role-pill\">Panel Member</span></div>\n          <div class=\"mock-grid cols-3\" style=\"margin-top:16px;\">\n            <div class=\"mock-field\"><span class=\"mock-label\">Name</span><div class=\"mock-input\"></div></div>\n            <div class=\"mock-field\"><span class=\"mock-label\">Email</span><div class=\"mock-input\"></div></div>\n            <div class=\"mock-field\"><span class=\"mock-label\">Role</span><div class=\"mock-input filled\" data-val=\"Recruiter \u25be\"></div></div>\n          </div>\n          <div class=\"mock-actions\"><span class=\"mock-btn\">Add</span></div>\n        </div>\n      </div>\n\n      <ol class=\"steps\">\n        <li><p>Fill in <span class=\"field-name\">Name</span>, <span class=\"field-name\">Email</span>, and pick a <span class=\"field-name\">Role</span> \u2014 Recruiter or Panel Member.</p></li>\n        <li><p>Click <strong>Add</strong>. They appear immediately in the list above.</p></li>\n        <li><p>To remove someone, click <strong>Remove</strong> next to their row. This only removes them from the dropdown \u2014 it doesn't touch any application they were already assigned to.</p></li>\n      </ol>\n\n    </section>\n\n    <!-- 04 INTERVIEW EMAIL -->\n    <section class=\"chapter\" id=\"interview-email\">\n      <div class=\"chapter-head\">\n        <span class=\"chapter-num\">04</span>\n        <h2>Interview email</h2>\n      </div>\n      <p class=\"chapter-dek\">The email sent to a candidate automatically the moment their interview is scheduled or rescheduled.</p>\n\n      <div class=\"ui-mock\">\n        <div class=\"ui-mock-head\"><span class=\"title\">Interview email</span><span class=\"chip\">Section 3 of 4</span></div>\n        <div class=\"ui-mock-body\">\n          <div class=\"mock-field\"><span class=\"mock-label\">Subject</span><div class=\"mock-input filled\" data-val=\"Your interview for {jobTitle} has been scheduled\"></div></div>\n          <div class=\"chip-row\">\n            <span class=\"placeholder-chip\">{candidateName}</span><span class=\"placeholder-chip\">{jobTitle}</span><span class=\"placeholder-chip\">{collegeName}</span><span class=\"placeholder-chip\">{scheduledAt}</span><span class=\"placeholder-chip\">{mode}</span><span class=\"placeholder-chip\">{location}</span>\n          </div>\n          <div class=\"mock-field\" style=\"margin-top:14px;\"><span class=\"mock-label\">Body (HTML)</span><div class=\"mock-textarea\"></div></div>\n          <div class=\"mock-field\" style=\"margin-top:14px;\"><span class=\"mock-label\">CC</span><div class=\"mock-input filled\" data-val=\"placements@college.edu\"></div></div>\n          <div class=\"mock-actions\"><span class=\"mock-btn\">Save Template</span></div>\n        </div>\n      </div>\n\n      <h3 class=\"sub-head\"><span class=\"dot\"></span>Variables you can use</h3>\n      <p class=\"muted\">Add any of these to the Subject or Body. Each one is replaced with the candidate's real details when the email is sent.</p>\n      <div class=\"tbl-wrap\">\n      <table class=\"field-ref\">\n        <tr><th>Variable</th><th>Fills in with</th></tr>\n        <tr><td><code class=\"token\">{candidateName}</code></td><td>The candidate's full name</td></tr>\n        <tr><td><code class=\"token\">{jobTitle}</code></td><td>The job they applied for</td></tr>\n        <tr><td><code class=\"token\">{collegeName}</code></td><td>This client's display name</td></tr>\n        <tr><td><code class=\"token\">{scheduledAt}</code></td><td>Interview date and time, formatted for reading</td></tr>\n        <tr><td><code class=\"token\">{mode}</code></td><td>In Person, Video Call, or Phone Call</td></tr>\n        <tr><td><code class=\"token\">{location}</code></td><td>Room, address, or call link \u2014 whatever was entered when scheduling</td></tr>\n      </table>\n      </div>\n\n      <h3 class=\"sub-head\"><span class=\"dot\"></span>CC</h3>\n      <p>You can add email in CC.</p>\n    </section>\n\n    <!-- 05 SHEET SYNC -->\n    <section class=\"chapter\" id=\"sheet-sync\">\n      <div class=\"chapter-head\">\n        <span class=\"chapter-num\">05</span>\n        <h2>Sheet sync</h2>\n      </div>\n      <p class=\"chapter-dek\">This connects a client's Google Sheet to the portal, so applications come in automatically.</p>\n\n      <h3 class=\"sub-head\"><span class=\"dot\"></span>1. Connect the sheet</h3>\n      <div class=\"ui-mock\">\n        <div class=\"ui-mock-head\"><span class=\"title\">Google Sheet source</span></div>\n        <div class=\"ui-mock-body\">\n          <div class=\"mock-field\"><span class=\"mock-label\">Sheet export URL</span><div class=\"mock-input filled\" data-val=\"https://docs.google.com/spreadsheets/d/\u2026/edit?usp=sharing\"></div></div>\n          <div class=\"mock-actions\"><span class=\"mock-btn ghost\">Convert</span><span class=\"mock-btn\">Save URL</span></div>\n        </div>\n      </div>\n      <p>Paste the link in viewer mode, click <strong>Convert</strong>, then <strong>Save URL</strong>.</p>\n\n      <h3 class=\"sub-head\"><span class=\"dot\"></span>2. Let it guess the mapping</h3>\n      <p>Click <strong>Auto-map from Sheet</strong>. It looks at the column names and fills in the setup for you. Check everything before saving.</p>\n\n      <h3 class=\"sub-head\"><span class=\"dot\"></span>3. Check the core columns</h3>\n      <p class=\"muted\">Spreadsheet columns are numbered from <strong>0</strong>, not 1 \u2014 column A is <code class=\"token\">0</code>, B is <code class=\"token\">1</code>, C is <code class=\"token\">2</code>, and so on.</p>\n      <div class=\"ui-mock\">\n        <div class=\"ui-mock-head\"><span class=\"title\">Core columns</span></div>\n        <div class=\"ui-mock-body\">\n          <div class=\"mock-grid cols-3\">\n            <div class=\"mock-field\"><span class=\"mock-label\">Submitted time</span><div class=\"mock-input filled\" data-val=\"0\"></div></div>\n            <div class=\"mock-field\"><span class=\"mock-label\">Email</span><div class=\"mock-input filled\" data-val=\"2\"></div></div>\n            <div class=\"mock-field\"><span class=\"mock-label\">Full name</span><div class=\"mock-input filled\" data-val=\"1\"></div></div>\n            <div class=\"mock-field\"><span class=\"mock-label\">Job selector</span><div class=\"mock-input filled\" data-val=\"3\"></div></div>\n            <div class=\"mock-field\"><span class=\"mock-label\">Application/unique ID</span><div class=\"mock-input filled\" data-val=\"4\"></div></div>\n            <div class=\"mock-field\"><span class=\"mock-label\">Mobile (optional)</span><div class=\"mock-input filled\" data-val=\"5\"></div></div>\n          </div>\n        </div>\n      </div>\n      <div class=\"tbl-wrap\">\n      <table class=\"field-ref\">\n        <tr><th>Column</th><th>Required?</th><th>Notes</th></tr>\n        <tr><td class=\"label\">Submitted time</td><td>Required</td><td class=\"muted\">The timestamp the form response was recorded.</td></tr>\n        <tr><td class=\"label\">Email</td><td>Required</td><td class=\"muted\">Used to tell candidates apart and match re-submissions.</td></tr>\n        <tr><td class=\"label\">Full name</td><td>Required</td><td class=\"muted\">&nbsp;</td></tr>\n        <tr><td class=\"label\">Job selector</td><td>Required</td><td class=\"muted\">The column that says which job/post they applied for.</td></tr>\n        <tr><td class=\"label\">Application/unique ID</td><td class=\"muted\">Optional</td><td class=\"muted\">If the sheet already assigns its own reference number.</td></tr>\n        <tr><td class=\"label\">Mobile, DOB, Gender</td><td class=\"muted\">Optional</td><td class=\"muted\">Leave blank if the sheet doesn't collect them.</td></tr>\n      </table>\n      </div>\n\n      <h3 class=\"sub-head\"><span class=\"dot\"></span>4. Everything else: sections & fields</h3>\n      <p>Every other column becomes a question on the form, grouped under a <strong>section</strong> name like \"Educational Qualifications.\" For each one, pick the column it comes from, give it a name, and choose its type \u2014 text, number, date, email, or phone.</p>\n\n      <h3 class=\"sub-head\"><span class=\"dot\"></span>5. Document columns</h3>\n      <p>If a column has a file link — like a photo or certificate from Google Drive — add it here. Give it a column number and a simple name, like \"Photograph\" or \"10+2 Certificate.\"</p>\n\n      <div class=\"callout tip\">\n        <span class=\"icon\">\u2713</span>\n        <p>Saving this does not change data you have already imported. It only affects new rows going forward. You can update and save it as many times as you want.</p>\n      </div>\n    </section>\n\n    <!-- 06 ACCESS -->\n    <section class=\"chapter\" id=\"access\">\n      <div class=\"chapter-head\">\n        <span class=\"chapter-num\">06</span>\n        <h2>Giving the client access</h2>\n      </div>\n      <p>Once a client is configured, their team's entry point is a single link:</p>\n      <table class=\"field-ref\">\n        <tr><td class=\"label\">Entry link</td><td><code class=\"token\">jobportal.odpay.in/route</code></td></tr>\n      </table>\n      <p class=\"muted\" style=\"margin-top:14px;\">Visiting it sets that browser to this client \u2014 from then on, Dashboard, Applications, Jobs, and Emails all show that client's data only. There's no separate login; the link itself is the access.</p>\n    </section>\n\n    <!-- 07 SYNCING -->\n    <section class=\"chapter\" id=\"syncing\">\n      <div class=\"chapter-head\">\n        <span class=\"chapter-num\">07</span>\n        <h2>Keeping data fresh</h2>\n      </div>\n      <p>Once a sheet is connected, a client's Dashboard shows a <strong>Sync now</strong> button \u2014 click it any time to pull in new rows immediately.</p>\n      <div class=\"callout note\">\n        <span class=\"icon\">\u2699</span>\n        <p><strong>It already syncs on its own</strong> every 15 minutes, without anyone clicking anything. New clients are covered automatically too, as soon as their Google Sheet is connected.</p>\n      </div>\n    </section>\n\n    <div class=\"manual-footer\">Recruitment Ops Portal \u2014 Configuration Guide. Covers the admin area's Branding, Staff, Interview email, and Sheet sync sections.</div>\n  </main></div></div>";

// Static reference document with its own self-contained design system
// (fonts, colors, layout) — deliberately not reusing the app's Tailwind
// components, since it stays readable even if the admin app's own styling
// changes later. The body markup is static, author-controlled HTML (not
// user input), so dangerouslySetInnerHTML carries no injection risk here;
// it's plain "class=", not JSX "className=", since this bypasses React's
// attribute translation entirely.
export default function ConfigManualPage() {
  return (
    <>
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@500;600;700&family=Source+Sans+3:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap"
      />
      <style>{`

  :root {
    --bg: #f6f7fa;
    --surface: #ffffff;
    --surface-2: #eef1f6;
    --ink: #101826;
    --ink-muted: #5b6472;
    --ink-faint: #8992a3;
    --border: #dfe3ea;
    --border-strong: #c7ccd6;
    --accent: #cc5211;
    --accent-ink: #ffffff;
    --accent-wash: #fdf1e7;
    --navy: #0f2359;
    --navy-2: #16307a;
    --navy-ink: #eef2ff;
    --navy-ink-muted: #a9b6da;
    --danger: #b3261e;
    --good: #1d6b3f;
    --radius: 10px;
    --shadow: 0 1px 2px rgba(16, 24, 38, 0.04), 0 8px 24px -12px rgba(16, 24, 38, 0.12);
  }

  @media (prefers-color-scheme: dark) {
    :root:not([data-theme="light"]) {
      --bg: #0a1120;
      --surface: #121a2c;
      --surface-2: #1a2338;
      --ink: #e8ecf5;
      --ink-muted: #99a3b8;
      --ink-faint: #6e7890;
      --border: #263153;
      --border-strong: #35426b;
      --accent: #ff9452;
      --accent-ink: #17110a;
      --accent-wash: #2a1c10;
      --navy: #16264a;
      --navy-2: #1c3164;
      --navy-ink: #eef2ff;
      --navy-ink-muted: #9aa8cc;
      --danger: #ff6b62;
      --good: #4fd18b;
      --shadow: 0 1px 2px rgba(0, 0, 0, 0.3), 0 12px 32px -14px rgba(0, 0, 0, 0.6);
    }
  }

  :root[data-theme="dark"] {
    --bg: #0a1120;
    --surface: #121a2c;
    --surface-2: #1a2338;
    --ink: #e8ecf5;
    --ink-muted: #99a3b8;
    --ink-faint: #6e7890;
    --border: #263153;
    --border-strong: #35426b;
    --accent: #ff9452;
    --accent-ink: #17110a;
    --accent-wash: #2a1c10;
    --navy: #16264a;
    --navy-2: #1c3164;
    --navy-ink: #eef2ff;
    --navy-ink-muted: #9aa8cc;
    --danger: #ff6b62;
    --good: #4fd18b;
    --shadow: 0 1px 2px rgba(0, 0, 0, 0.3), 0 12px 32px -14px rgba(0, 0, 0, 0.6);
  }

  * { box-sizing: border-box; }

  html { scroll-behavior: smooth; overflow-anchor: none; }

  .manual-page {
    background: var(--bg);
    color: var(--ink);
    min-height: 100vh;
  }

  body {
    margin: 0;
    font-family: 'Source Sans 3', 'Segoe UI', system-ui, sans-serif;
    font-size: 16px;
    line-height: 1.6;
    -webkit-font-smoothing: antialiased;
  }

  h1, h2, h3, h4 {
    font-family: 'IBM Plex Sans', 'Segoe UI', system-ui, sans-serif;
    color: var(--ink);
    text-wrap: balance;
    line-height: 1.2;
    margin: 0;
  }

  code, .mono {
    font-family: 'IBM Plex Mono', 'SFMono-Regular', Consolas, monospace;
  }

  a { color: var(--accent); }

  .shell {
    display: grid;
    grid-template-columns: 272px minmax(0, 1fr);
    min-height: 100vh;
  }

  /* ---------- Sidebar ---------- */
  .sidebar {
    background: var(--navy);
    color: var(--navy-ink);
    padding: 28px 22px 32px;
    position: sticky;
    top: 0;
    height: 100vh;
    overflow-y: auto;
  }

  .brand {
    display: flex;
    align-items: baseline;
    gap: 8px;
    margin-bottom: 4px;
  }

  .brand-mark {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 12px;
    letter-spacing: 0.12em;
    color: var(--accent);
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 5px;
    padding: 2px 6px;
  }

  .sidebar h1 {
    font-size: 19px;
    color: #fff;
    margin: 10px 0 2px;
  }

  .sidebar .subtitle {
    font-size: 13.5px;
    color: var(--navy-ink-muted);
    margin-bottom: 26px;
  }

  .nav-group-label {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.09em;
    color: var(--navy-ink-muted);
    margin: 22px 0 8px;
    font-weight: 600;
  }

  .nav-group-label:first-of-type { margin-top: 0; }

  .toc { list-style: none; margin: 0; padding: 0; }

  .toc li a {
    display: flex;
    gap: 10px;
    align-items: baseline;
    color: var(--navy-ink);
    text-decoration: none;
    font-size: 14.5px;
    padding: 7px 8px;
    border-radius: 7px;
    transition: background 0.15s ease;
  }

  .toc li a:hover { background: rgba(255, 255, 255, 0.08); }

  .toc .num {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 12px;
    color: var(--accent);
    min-width: 18px;
  }

  .toc .sub { padding-left: 26px; font-size: 13.5px; color: var(--navy-ink-muted); }

  /* ---------- Main ---------- */
  main { padding: 56px clamp(24px, 5vw, 72px) 120px; max-width: 900px; }

  .lede {
    max-width: 640px;
    margin-bottom: 56px;
  }

  .kicker {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 12.5px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--accent);
    margin-bottom: 14px;
  }

  .lede h1 { font-size: clamp(30px, 4vw, 40px); margin-bottom: 16px; }
  .lede p { color: var(--ink-muted); font-size: 17px; max-width: 60ch; }

  .who-this-is-for {
    margin-top: 26px;
    display: flex;
    gap: 10px;
    align-items: flex-start;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 14px 16px;
    font-size: 14.5px;
    color: var(--ink-muted);
  }

  .who-this-is-for strong { color: var(--ink); }

  section.chapter {
    margin-bottom: 64px;
    scroll-margin-top: 28px;
  }

  .chapter-head {
    display: flex;
    align-items: baseline;
    gap: 14px;
    margin-bottom: 8px;
    padding-bottom: 16px;
    border-bottom: 1px solid var(--border);
  }

  .chapter-num {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 14px;
    color: var(--accent);
    background: var(--accent-wash);
    border-radius: 6px;
    padding: 3px 8px;
  }

  .chapter-head h2 { font-size: 25px; }

  .chapter-dek {
    color: var(--ink-muted);
    max-width: 62ch;
    margin: 14px 0 26px;
    font-size: 15.5px;
  }

  h3.sub-head {
    font-size: 17px;
    margin: 34px 0 12px;
    display: flex;
    align-items: center;
    gap: 10px;
  }

  h3.sub-head .dot { width: 6px; height: 6px; border-radius: 50%; background: var(--accent); flex-shrink: 0; }

  p { color: var(--ink); max-width: 68ch; }
  p.muted { color: var(--ink-muted); }

  /* Step list */
  ol.steps {
    list-style: none;
    margin: 18px 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  ol.steps li {
    display: grid;
    grid-template-columns: 30px 1fr;
    gap: 14px;
    align-items: baseline;
  }

  ol.steps li::before {
    content: counter(step);
    counter-increment: step;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 13px;
    color: var(--accent);
    border: 1px solid var(--border-strong);
    border-radius: 50%;
    width: 26px;
    height: 26px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--surface);
  }

  ol.steps { counter-reset: step; }
  ol.steps li p { margin: 0; }
  ol.steps li .field-name { color: var(--ink); font-weight: 600; }

  /* Field reference table */
  table.field-ref {
    width: 100%;
    border-collapse: collapse;
    margin: 18px 0 8px;
    font-size: 14.5px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    overflow: hidden;
  }

  table.field-ref th {
    text-align: left;
    background: var(--surface-2);
    color: var(--ink-muted);
    font-weight: 600;
    font-size: 12.5px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    padding: 10px 14px;
    border-bottom: 1px solid var(--border);
  }

  table.field-ref td {
    padding: 11px 14px;
    border-bottom: 1px solid var(--border);
    vertical-align: top;
    color: var(--ink);
  }

  table.field-ref tr:last-child td { border-bottom: none; }
  table.field-ref td.label { font-weight: 600; white-space: nowrap; }
  table.field-ref td.muted, table.field-ref .muted { color: var(--ink-muted); }
  .tbl-wrap { overflow-x: auto; }

  code.token {
    background: var(--accent-wash);
    color: var(--accent);
    padding: 1px 6px;
    border-radius: 5px;
    font-size: 13px;
    white-space: nowrap;
  }

  /* Callouts */
  .callout {
    display: flex;
    gap: 12px;
    border-radius: var(--radius);
    padding: 14px 16px;
    margin: 20px 0;
    font-size: 14.5px;
    border: 1px solid var(--border);
    background: var(--surface);
  }

  .callout .icon {
    font-family: 'IBM Plex Mono', monospace;
    font-weight: 700;
    font-size: 12px;
    width: 22px;
    height: 22px;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    margin-top: 1px;
  }

  .callout p { margin: 0; color: var(--ink); }
  .callout.tip .icon { background: var(--accent-wash); color: var(--accent); }
  .callout.warn { border-color: color-mix(in srgb, var(--danger) 35%, var(--border)); }
  .callout.warn .icon { background: color-mix(in srgb, var(--danger) 16%, transparent); color: var(--danger); }
  .callout.note .icon { background: var(--surface-2); color: var(--ink-muted); }

  /* UI mockup panels — recreate the real field layout so readers can pattern-match */
  .ui-mock {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    box-shadow: var(--shadow);
    margin: 22px 0 28px;
    overflow: hidden;
  }

  .ui-mock-head {
    padding: 13px 18px;
    border-bottom: 1px solid var(--border);
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .ui-mock-head .title { font-family: 'IBM Plex Sans', sans-serif; font-weight: 600; font-size: 14.5px; }
  .ui-mock-head .chip {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 10.5px;
    color: var(--ink-faint);
    border: 1px solid var(--border);
    border-radius: 4px;
    padding: 2px 6px;
  }

  .ui-mock-body { padding: 18px; }

  .mock-grid { display: grid; gap: 14px; }
  .mock-grid.cols-2 { grid-template-columns: 1fr 1fr; }
  .mock-grid.cols-3 { grid-template-columns: repeat(3, 1fr); }

  @media (max-width: 560px) {
    .mock-grid.cols-2, .mock-grid.cols-3 { grid-template-columns: 1fr; }
  }

  .mock-field .mock-label {
    font-size: 11.5px;
    color: var(--ink-muted);
    margin-bottom: 6px;
    display: block;
  }

  .mock-field .mock-input {
    height: 34px;
    border: 1px solid var(--border-strong);
    border-radius: 6px;
    background: var(--surface-2);
    position: relative;
  }

  .mock-field .mock-input.filled::after {
    content: attr(data-val);
    position: absolute;
    left: 10px;
    top: 50%;
    transform: translateY(-50%);
    font-size: 13px;
    color: var(--ink-faint);
    font-family: 'IBM Plex Mono', monospace;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: calc(100% - 20px);
  }

  .mock-field .mock-textarea {
    min-height: 64px;
    border: 1px solid var(--border-strong);
    border-radius: 6px;
    background: var(--surface-2);
  }

  .mock-btn {
    display: inline-flex;
    align-items: center;
    height: 32px;
    padding: 0 14px;
    border-radius: 6px;
    background: var(--accent);
    color: var(--accent-ink);
    font-size: 13px;
    font-weight: 600;
    font-family: 'IBM Plex Sans', sans-serif;
  }

  .mock-btn.ghost {
    background: transparent;
    border: 1px solid var(--border-strong);
    color: var(--ink-muted);
  }

  .mock-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px; }

  /* Collapsible mock */
  .mock-collapsible {
    border: 1px solid var(--border);
    border-radius: 8px;
    margin-bottom: 10px;
    background: var(--surface);
  }
  .mock-collapsible .mc-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 13px 16px;
  }
  .mock-collapsible .mc-title { font-weight: 600; font-size: 14px; }
  .mock-collapsible .mc-desc { font-size: 12.5px; color: var(--ink-muted); margin-top: 2px; }
  .mock-collapsible .chevron { color: var(--ink-faint); font-size: 13px; }
  .mock-collapsible.open .mc-body {
    padding: 0 16px 16px;
    border-top: 1px solid var(--border);
    padding-top: 14px;
  }

  /* Chips for placeholder list */
  .chip-row { display: flex; flex-wrap: wrap; gap: 7px; margin: 10px 0 4px; }
  .placeholder-chip {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 12.5px;
    background: var(--accent-wash);
    color: var(--accent);
    border-radius: 5px;
    padding: 3px 8px;
  }

  .staff-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 0;
    border-bottom: 1px solid var(--border);
    font-size: 13.5px;
  }
  .staff-row:last-of-type { border-bottom: none; }
  .staff-name { font-weight: 600; }
  .staff-email { color: var(--ink-faint); font-family: 'IBM Plex Mono', monospace; font-size: 12px; margin-left: 8px; }
  .role-pill {
    font-size: 11px;
    padding: 2px 8px;
    border-radius: 20px;
    background: var(--surface-2);
    color: var(--ink-muted);
    font-weight: 600;
  }

  /* End-of-manual footer */
  .manual-footer {
    margin-top: 80px;
    padding-top: 24px;
    border-top: 1px solid var(--border);
    color: var(--ink-faint);
    font-size: 13px;
  }

  @media (max-width: 860px) {
    .shell { grid-template-columns: 1fr; }
    .sidebar {
      position: static;
      height: auto;
      padding: 20px;
    }
    .toc { display: flex; flex-wrap: wrap; gap: 4px; }
    .toc li { flex: 0 0 auto; }
    .toc .sub { display: none; }
    .nav-group-label { display: none; }
    main { padding: 40px 20px 80px; }
  }

  @media (prefers-reduced-motion: reduce) {
    html { scroll-behavior: auto; }
  }


  .back-link {
    display: inline-block;
    font-size: 12.5px;
    color: var(--navy-ink-muted);
    text-decoration: none;
    margin-bottom: 20px;
  }
  .back-link:hover { color: #fff; }

      `}</style>
      <div dangerouslySetInnerHTML={{ __html: BODY_HTML }} />
    </>
  );
}
