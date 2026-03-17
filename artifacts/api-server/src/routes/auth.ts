import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { signToken, verifyToken, getTokenFromRequest } from "../lib/auth";

const router: IRouter = Router();

function formatUser(u: typeof usersTable.$inferSelect) {
  return {
    id: u.id,
    email: u.email,
    name: u.name ?? null,
    role: u.role,
    subscription: u.subscription,
    createdAt: u.createdAt.toISOString(),
  };
}

// POST /auth/register
router.post("/auth/register", async (req, res): Promise<void> => {
  const { email, password, name } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: "Email and password are required" });
    return;
  }
  if (password.length < 6) {
    res.status(400).json({ error: "Password must be at least 6 characters" });
    return;
  }

  const existing = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase())).limit(1);
  if (existing.length > 0) {
    res.status(409).json({ error: "Email already registered" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const [user] = await db.insert(usersTable).values({
    email: email.toLowerCase(),
    passwordHash,
    name: name || null,
    role: "user",
    subscription: "none",
  }).returning();

  const token = signToken({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    subscription: user.subscription,
  });

  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.status(201).json({ user: formatUser(user), token });
});

// POST /auth/login
router.post("/auth/login", async (req, res): Promise<void> => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: "Email and password are required" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase())).limit(1);
  if (!user) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const token = signToken({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    subscription: user.subscription,
  });

  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.json({ user: formatUser(user), token });
});

// POST /auth/logout
router.post("/auth/logout", (_req, res): Promise<void> => {
  res.clearCookie("token");
  res.json({ message: "Logged out" });
  return Promise.resolve();
});

// GET /auth/me
router.get("/auth/me", async (req, res): Promise<void> => {
  const token = getTokenFromRequest(req);
  if (!token) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  try {
    const decoded = verifyToken(token);
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, decoded.id)).limit(1);
    if (!user) {
      res.status(401).json({ error: "User not found" });
      return;
    }
    res.json({ user: formatUser(user) });
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
});

// POST /auth/subscribe - update subscription plan
router.post("/auth/subscribe", async (req, res): Promise<void> => {
  const token = getTokenFromRequest(req);
  if (!token) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const { plan } = req.body;
  const validPlans = ["none", "basic", "pro", "business"];
  if (!validPlans.includes(plan)) {
    res.status(400).json({ error: "Invalid plan" });
    return;
  }
  try {
    const decoded = verifyToken(token);
    const [user] = await db.update(usersTable)
      .set({ subscription: plan as any })
      .where(eq(usersTable.id, decoded.id))
      .returning();

    const newToken = signToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      subscription: user.subscription,
    });

    res.cookie("token", newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({ user: formatUser(user), token: newToken });
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
});

// GET /admin/users - admin only
router.get("/admin/users", async (req, res): Promise<void> => {
  const token = getTokenFromRequest(req);
  if (!token) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const decoded = verifyToken(token);
    if (decoded.role !== "admin") {
      res.status(403).json({ error: "Admin only" });
      return;
    }
    const users = await db.select({
      id: usersTable.id,
      email: usersTable.email,
      name: usersTable.name,
      role: usersTable.role,
      subscription: usersTable.subscription,
      createdAt: usersTable.createdAt,
    }).from(usersTable).orderBy(usersTable.createdAt);

    res.json({ users: users.map(u => ({ ...u, createdAt: u.createdAt.toISOString() })) });
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
});

// PATCH /admin/users/:id - admin update user
router.patch("/admin/users/:id", async (req, res): Promise<void> => {
  const token = getTokenFromRequest(req);
  if (!token) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const decoded = verifyToken(token);
    if (decoded.role !== "admin") {
      res.status(403).json({ error: "Admin only" });
      return;
    }
    const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const id = parseInt(rawId, 10);
    const { subscription, role } = req.body;

    const updates: Record<string, any> = {};
    if (subscription) updates.subscription = subscription;
    if (role) updates.role = role;

    const [user] = await db.update(usersTable).set(updates).where(eq(usersTable.id, id)).returning();
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.json({ user: formatUser(user) });
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
});

export default router;
