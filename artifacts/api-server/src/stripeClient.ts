// Stripe client — uses STRIPE_SECRET_KEY env var (set from Replit Stripe integration)
// @integration: Stripe (conn_stripe_01KKVW5BTPBP8NZ6KAEYX2SK9Z)
import Stripe from 'stripe';
import { StripeSync } from 'stripe-replit-sync';

export const STRIPE_CONFIGURED = true;

function getSecretKey(): string {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error('STRIPE_SECRET_KEY env var not set. Reconnect Stripe in the Replit integrations panel.');
  }
  return key;
}

export async function getUncachableStripeClient(): Promise<Stripe> {
  // Never cache — always create a fresh instance
  return new Stripe(getSecretKey(), { apiVersion: '2025-01-27.acacia' as any });
}

let _stripeSync: StripeSync | null = null;

export async function getStripeSync(): Promise<StripeSync> {
  // Allow caching of StripeSync (it manages its own DB connection pool)
  if (_stripeSync) return _stripeSync;
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL required for StripeSync');
  _stripeSync = new StripeSync({ stripeSecretKey: getSecretKey(), databaseUrl });
  return _stripeSync;
}
