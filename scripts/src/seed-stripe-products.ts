/**
 * Script: seed-stripe-products.ts
 * Creates GeoViewer Pro and Business products in Stripe.
 * Run after connecting Stripe: pnpm --filter @workspace/scripts exec tsx src/seed-stripe-products.ts
 */
import { getUncachableStripeClient } from '../../artifacts/api-server/src/stripeClient';

async function createProducts() {
  const stripe = await getUncachableStripeClient();
  console.log('Creating GeoViewer products in Stripe...');

  // --- Pro Plan ---
  const existingPro = await stripe.products.search({ query: "name:'GeoViewer Pro' AND active:'true'" });
  let proProduct;
  if (existingPro.data.length > 0) {
    proProduct = existingPro.data[0];
    console.log(`GeoViewer Pro already exists: ${proProduct.id}`);
  } else {
    proProduct = await stripe.products.create({
      name: 'GeoViewer Pro',
      description: 'Acces complet + descărcare hărți, modele 3D, seturi de date geologice',
      metadata: { plan: 'pro' },
    });
    const proPrice = await stripe.prices.create({
      product: proProduct.id,
      unit_amount: 40000,   // €400.00
      currency: 'eur',
      recurring: { interval: 'month' },
      metadata: { plan: 'pro' },
    });
    console.log(`Created GeoViewer Pro: ${proProduct.id} | Price: €400/lună (${proPrice.id})`);
  }

  // --- Business Plan ---
  const existingBiz = await stripe.products.search({ query: "name:'GeoViewer Business' AND active:'true'" });
  if (existingBiz.data.length > 0) {
    console.log(`GeoViewer Business already exists: ${existingBiz.data[0].id}`);
  } else {
    const bizProduct = await stripe.products.create({
      name: 'GeoViewer Business',
      description: 'Acces complet la toate datele geologice, rapoarte, baze de date, API',
      metadata: { plan: 'business' },
    });
    const bizPrice = await stripe.prices.create({
      product: bizProduct.id,
      unit_amount: 200000,  // €2000.00
      currency: 'eur',
      recurring: { interval: 'month' },
      metadata: { plan: 'business' },
    });
    console.log(`Created GeoViewer Business: ${bizProduct.id} | Price: €2000/lună (${bizPrice.id})`);
  }

  console.log('\n✓ Produse Stripe create cu succes!');
  console.log('Webhook-urile vor sincroniza datele în baza de date automat.');
}

createProducts().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
