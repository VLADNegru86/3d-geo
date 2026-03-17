import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const JWT_SECRET = process.env.JWT_SECRET || "geo3d-super-secret-key-2024";
const JWT_EXPIRES = "7d";

export interface AuthUser {
  id: number;
  email: string;
  name: string | null;
  role: string;
  subscription: string;
}

export function signToken(user: AuthUser): string {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, subscription: user.subscription },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES }
  );
}

export function verifyToken(token: string): AuthUser & { iat?: number; exp?: number } {
  return jwt.verify(token, JWT_SECRET) as AuthUser & { iat?: number; exp?: number };
}

export function getTokenFromRequest(req: Request): string | null {
  // Check Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }
  // Check cookie
  if (req.cookies && req.cookies.token) {
    return req.cookies.token;
  }
  return null;
}

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const token = getTokenFromRequest(req);
  if (!token) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const user = verifyToken(token);
    (req as any).user = user;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = getTokenFromRequest(req);
  if (token) {
    try {
      const user = verifyToken(token);
      (req as any).user = user;
    } catch {
      // ignore invalid token for optional auth
    }
  }
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const user = (req as any).user as AuthUser | undefined;
  if (!user || user.role !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return;
  }
  next();
}

export function requireSubscription(minLevel: "basic" | "pro" | "business") {
  const levels = { none: 0, basic: 1, pro: 2, business: 3 };
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as any).user as AuthUser | undefined;
    if (!user) {
      res.status(401).json({ error: "Login required" });
      return;
    }
    const userLevel = levels[user.subscription as keyof typeof levels] ?? 0;
    const required = levels[minLevel];
    if (userLevel < required) {
      res.status(403).json({ error: `${minLevel} subscription required`, requiredSubscription: minLevel });
      return;
    }
    next();
  };
}
