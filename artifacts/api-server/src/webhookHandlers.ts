import { getUncachableStripeClient } from './stripeClient';
import { db, usersTable } from '@workspace/db';
import { eq } from 'drizzle-orm';

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string): Promise<void> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error(
        'STRIPE WEBHOOK ERROR: Payload must be a Buffer. ' +
        'FIX: Ensure webhook route is registered BEFORE app.use(express.json()).'
      );
    }

    const stripe = await getUncachableStripeClient();

    let event: any;

    // Verify webhook signature if secret is configured
    if (WEBHOOK_SECRET) {
      event = stripe.webhooks.constructEvent(payload, signature, WEBHOOK_SECRET);
    } else {
      // Dev mode: parse without verification
      event = JSON.parse(payload.toString());
      console.warn('STRIPE: STRIPE_WEBHOOK_SECRET not set — skipping webhook signature verification');
    }

    console.log(`Stripe webhook: ${event.type}`);

    if (event.type === 'checkout.session.completed') {
      const session = event.data?.object;
      const userId = session?.metadata?.userId;
      const plan = session?.metadata?.plan as 'pro' | 'business' | undefined;
      const stripeSubscriptionId: string | undefined = typeof session?.subscription === 'string'
        ? session.subscription : undefined;
      const stripeCustomerId: string | undefined = typeof session?.customer === 'string'
        ? session.customer : undefined;

      if (userId && plan && ['pro', 'business'].includes(plan)) {
        await db.update(usersTable)
          .set({
            subscription: plan,
            stripeCustomerId: stripeCustomerId ?? null,
            stripeSubscriptionId: stripeSubscriptionId ?? null,
          })
          .where(eq(usersTable.id, parseInt(userId)));
        console.log(`Webhook: subscription updated — user ${userId} → ${plan}`);
      }
    }

    if (event.type === 'customer.subscription.deleted') {
      const sub = event.data?.object;
      const stripeSubId: string | undefined = sub?.id;
      if (stripeSubId) {
        await db.update(usersTable)
          .set({ subscription: 'none', stripeSubscriptionId: null })
          .where(eq(usersTable.stripeSubscriptionId, stripeSubId));
        console.log(`Webhook: subscription cancelled — stripe sub ${stripeSubId}`);
      }
    }

    if (event.type === 'customer.subscription.updated') {
      const sub = event.data?.object;
      const stripeSubId: string | undefined = sub?.id;
      const status = sub?.status;
      if (stripeSubId && status !== 'active' && status !== 'trialing') {
        await db.update(usersTable)
          .set({ subscription: 'none' })
          .where(eq(usersTable.stripeSubscriptionId, stripeSubId));
        console.log(`Webhook: subscription deactivated — stripe sub ${stripeSubId}, status: ${status}`);
      }
    }
  }
}
