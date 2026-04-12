import Stripe from 'stripe';
import type { ExtractRequest } from '@/lib/hd-engine/types';

const secretKey = process.env.STRIPE_SECRET_KEY;

if (!secretKey) {
  throw new Error('STRIPE_SECRET_KEY is not set');
}

export const stripe = new Stripe(secretKey);

function getBaseUrl(): string {
  const base = process.env.NEXT_PUBLIC_BASE_URL;
  if (!base) {
    throw new Error('NEXT_PUBLIC_BASE_URL is not set');
  }
  return base.replace(/\/$/, '');
}

/**
 * Creates a Stripe Checkout session (redirect mode) with birth data in metadata.
 */
export async function createCheckoutSession(
  birthData: ExtractRequest,
  orderId: string
): Promise<string> {
  const baseUrl = getBaseUrl();

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: 'usd',
          unit_amount: 900,
          product_data: {
            name: 'Human Design Reading',
          },
        },
      },
    ],
    success_url: `${baseUrl}/result/${orderId}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/`,
    metadata: {
      birthData: JSON.stringify(birthData),
      orderId,
    },
  });

  if (!session.url) {
    throw new Error('Stripe Checkout session did not return a URL');
  }

  return session.url;
}
