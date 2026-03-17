import { Router, type IRouter } from 'express';
import { stripeStorage } from '../stripeStorage';
import { stripeService } from '../stripeService';
import { authMiddleware } from '../lib/auth';
import type { AuthUser } from '../lib/auth';

const router: IRouter = Router();

// GET /stripe/plans — public endpoint returning plan info (no live Stripe needed)
router.get('/stripe/plans', (_req, res) => {
  res.json({
    plans: [
      {
        id: 'pro',
        name: 'Pro',
        price: 40000,       // cents = €400.00
        currency: 'eur',
        interval: 'month',
        features: ['Download hărți și imagini', 'Modele 3D geologice', 'Seturi de date geofizice', 'Imagini satelitare procesate'],
      },
      {
        id: 'business',
        name: 'Business',
        price: 200000,      // cents = €2000.00
        currency: 'eur',
        interval: 'month',
        features: ['Toate funcțiile Pro', 'Rapoarte geologice detaliate', 'Baze de date complete', 'API access', 'Suport dedicat 24/7'],
      },
    ],
  });
});

// POST /stripe/checkout — create Stripe checkout session
router.post('/stripe/checkout', authMiddleware, async (req, res) => {
  const user = (req as any).user as AuthUser;
  const { plan } = req.body as { plan: 'pro' | 'business' };

  if (!['pro', 'business'].includes(plan)) {
    res.status(400).json({ error: 'Plan invalid. Alege pro sau business.' });
    return;
  }

  try {
    const dbUser = await stripeStorage.getUserById(user.id);
    if (!dbUser) {
      res.status(404).json({ error: 'Utilizator negăsit' });
      return;
    }

    // Find the Stripe price for this plan
    const rows = await stripeStorage.listProductsWithPrices();
    const planName = plan === 'pro' ? 'GeoViewer Pro' : 'GeoViewer Business';
    const planRow = rows.find((r: any) => {
      const name: string = (r.product_name || '').toLowerCase();
      return name.includes(plan) || name.includes(planName.toLowerCase());
    });

    if (!planRow || !planRow.price_id) {
      res.status(503).json({ error: 'Produsul Stripe nu este configurat încă. Contactați administratorul.' });
      return;
    }

    // Get or create Stripe customer
    let customerId = dbUser.stripeCustomerId;
    if (!customerId) {
      const customer = await stripeService.createCustomer(dbUser.email, String(dbUser.id));
      await stripeStorage.updateUserStripeInfo(dbUser.id, { stripeCustomerId: customer.id });
      customerId = customer.id;
    }

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const session = await stripeService.createCheckoutSession({
      customerId,
      priceId: planRow.price_id as string,
      userId: String(dbUser.id),
      plan,
      successUrl: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${baseUrl}/checkout/cancel`,
    });

    res.json({ url: session.url });
  } catch (err: any) {
    console.error('Stripe checkout error:', err.message);
    res.status(500).json({ error: 'Stripe nu este configurat. Contactați administratorul.' });
  }
});

// GET /stripe/verify-checkout — verify session after success redirect
router.get('/stripe/verify-checkout', authMiddleware, async (req, res) => {
  const user = (req as any).user as AuthUser;
  const { session_id } = req.query as { session_id?: string };

  if (!session_id) {
    res.status(400).json({ error: 'session_id lipsă' });
    return;
  }

  try {
    const session = await stripeService.getCheckoutSession(session_id);

    if (session.payment_status !== 'paid' && session.status !== 'complete') {
      res.status(402).json({ error: 'Plata nu a fost finalizată' });
      return;
    }

    const userId = session.metadata?.userId;
    const plan = session.metadata?.plan as 'pro' | 'business' | undefined;

    if (!userId || !plan || String(user.id) !== userId) {
      res.status(403).json({ error: 'Sesiune invalidă' });
      return;
    }

    // Update user subscription immediately (webhook may also do this)
    const updated = await stripeStorage.updateUserStripeInfo(parseInt(userId), {
      subscription: plan,
      stripeCustomerId: typeof session.customer === 'string' ? session.customer : undefined,
      stripeSubscriptionId: typeof session.subscription === 'string' ? session.subscription : undefined,
    });

    res.json({ success: true, subscription: updated.subscription });
  } catch (err: any) {
    console.error('Verify checkout error:', err.message);
    res.status(500).json({ error: 'Verificare eșuată: ' + err.message });
  }
});

// POST /stripe/portal — redirect to Stripe Customer Portal
router.post('/stripe/portal', authMiddleware, async (req, res) => {
  const user = (req as any).user as AuthUser;

  try {
    const dbUser = await stripeStorage.getUserById(user.id);
    if (!dbUser?.stripeCustomerId) {
      res.status(404).json({ error: 'Niciun abonament activ găsit' });
      return;
    }

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const portalSession = await stripeService.createCustomerPortalSession(
      dbUser.stripeCustomerId,
      `${baseUrl}/subscription`
    );

    res.json({ url: portalSession.url });
  } catch (err: any) {
    console.error('Portal error:', err.message);
    res.status(500).json({ error: 'Portal Stripe indisponibil' });
  }
});

export default router;
