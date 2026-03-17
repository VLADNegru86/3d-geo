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
  return new Stripe(getSecretKey(), { apiVersion: '2025-01-27.acacia' as any });
}

let _stripeSync: StripeSync | null = null;

export async function getStripeSync(): Promise<StripeSync> {
  if (_stripeSync) return _stripeSync;
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL required for StripeSync');
  _stripeSync = new StripeSync({ stripeSecretKey: getSecretKey(), databaseUrl } as any);
  return _stripeSync;
}