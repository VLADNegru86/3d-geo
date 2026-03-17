import bcrypt from "bcryptjs";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const ADMIN_EMAIL = "vladnegru1986@gmail.com";
const ADMIN_PASSWORD = "Romania86$";

export async function runStartupSeed() {
  try {
    const existing = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.email, ADMIN_EMAIL))
      .limit(1);

    if (existing.length === 0) {
      const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
      await db.insert(usersTable).values({
        email: ADMIN_EMAIL,
        passwordHash,
        name: "Admin",
        role: "admin",
        subscription: "business",
      });
      console.log(`[startup] Admin account created: ${ADMIN_EMAIL}`);
    } else {
      // Ensure the existing account has admin role and business subscription
      await db
        .update(usersTable)
        .set({ role: "admin", subscription: "business" })
        .where(eq(usersTable.email, ADMIN_EMAIL));
      console.log(`[startup] Admin account verified: ${ADMIN_EMAIL}`);
    }
  } catch (err) {
    console.error("[startup] Failed to seed admin account:", err);
  }
}
