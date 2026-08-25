// One-off: writes NBGSM's logo/name/colors into Tenant.brandingJson as
// data, replacing what used to be hardcoded constants in layout.tsx and
// synopsis.ts. Safe to re-run — it's a plain update, not a create.
import "dotenv/config";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import type { TenantBranding } from "../src/lib/branding";

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 2 });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const logoPath = join(__dirname, "..", "src", "assets", "nbgsm-logo.png");
  const logoDataUrl = `data:image/png;base64,${readFileSync(logoPath).toString("base64")}`;

  const branding: TenantBranding = {
    name: "Nirankari Baba Gurbachan Singh Memorial College",
    shortName: "NBGSM",
    logoDataUrl,
    gradient: { from: "#0f2359", via: "#1b449c", to: "#3465c9" },
  };

  await prisma.tenant.update({
    where: { slug: "nbgsm" },
    data: { brandingJson: JSON.stringify(branding) },
  });
  console.log("NBGSM branding written.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
