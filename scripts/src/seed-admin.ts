import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

async function seedAdmin() {
  const email = "vladnegru1986@gmail.com";
  const password = "Romania86$";

  const existing = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);

  if (existing.length > 0) {
    console.log("Admin already exists, updating password...");
    const passwordHash = await bcrypt.hash(password, 12);
    await db.update(usersTable).set({ passwordHash, role: "admin", subscription: "business" }).where(eq(usersTable.email, email));
    console.log("Admin updated:", email);
  } else {
    const passwordHash = await bcrypt.hash(password, 12);
    const [admin] = await db.insert(usersTable).values({
      email,
      passwordHash,
      name: "Admin",
      role: "admin",
      subscription: "business",
    }).returning();
    console.log("Admin created:", admin.email, "role:", admin.role);
  }
}

seedAdmin().catch(console.error);
