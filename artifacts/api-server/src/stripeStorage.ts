import { db, usersTable } from '@workspace/db';
import { eq } from 'drizzle-orm';
import { getUncachableStripeClient } from './stripeClient';

export class StripeStorage {
  async listProductsWithPrices() {
    const stripe = await getUncachableStripeClient();
    const products = await stripe.products.list({ active: true, limit: 100 });
    const prices = await stripe.prices.list({ active: true, limit: 100 });

    return products.data.map(product => {
      const price = prices.data.find(p => p.product === product.id && p.recurring);
      return {
        product_id: product.id,
        product_name: product.name,
        product_description: product.description,
        product_active: product.active,
        product_metadata: product.metadata,
        price_id: price?.id,
        unit_amount: price?.unit_amount,
        currency: price?.currency,
        recurring: price?.recurring,
        price_active: price?.active,
        price_metadata: price?.metadata,
      };
    });
  }

  async getUserById(id: number) {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id));
    return user || null;
  }

  async updateUserStripeInfo(userId: number, stripeInfo: {
    stripeCustomerId?: string | null;
    stripeSubscriptionId?: string | null;
    subscription?: 'none' | 'basic' | 'pro' | 'business';
  }) {
    const [user] = await db.update(usersTable).set(stripeInfo).where(eq(usersTable.id, userId)).returning();
    return user;
  }
}

export const stripeStorage = new StripeStorage();
