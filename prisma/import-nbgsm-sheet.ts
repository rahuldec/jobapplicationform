// Thin entry point kept for backward compatibility (the CLI invocation
// and the sync-sheet API route both still reference this). The actual
// column mapping now lives in NBGSM's Tenant.sheetMappingJson (see
// prisma/seed-nbgsm-sheet-config.ts) and the sync logic itself is the
// generic engine in prisma/sheet-import/sync.ts — nothing here is
// NBGSM-specific anymore.
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { syncTenantSheet } from "./sheet-import/sync";

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 2 });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export async function syncNbgsmSheet() {
  return syncTenantSheet(prisma, "nbgsm");
}

if (require.main === module) {
  syncNbgsmSheet()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
