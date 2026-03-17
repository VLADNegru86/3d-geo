import app from "./app";
import { runStartupSeed } from "./lib/startup-seed";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

async function initStripe() {
  try {
    const { STRIPE_CONFIGURED, getUncachableStripeClient } = await import('./stripeClient');

    if (!STRIPE_CONFIGURED) {
      console.log('Stripe not configured — payment features disabled');
      return;
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      console.log('STRIPE_SECRET_KEY not set — Stripe payments disabled');
      return;
    }

    // Quick connectivity check
    const stripe = await getUncachableStripeClient();
    const account = await stripe.account.retrieve();
    console.log(`Stripe connected: account ${account.id}`);
  } catch (err: any) {
    console.error('Stripe init error (non-fatal):', err.message?.slice(0, 100));
  }
}

runStartupSeed()
  .then(() => initStripe())
  .then(() => {
    app.listen(port, () => {
      console.log(`Server listening on port ${port}`);
    });
  })
  .catch((err) => {
    console.error("Startup failed:", err);
    app.listen(port, () => {
      console.log(`Server listening on port ${port} (with startup warnings)`);
    });
  });
