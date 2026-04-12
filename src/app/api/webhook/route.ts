import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { extractProfile } from '@/lib/hd-engine/calculator';
import type { ExtractRequest } from '@/lib/hd-engine/types';
import type Stripe from 'stripe';

function parseBirthData(raw: string | undefined): ExtractRequest | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'birthDate' in parsed &&
      'birthTime' in parsed &&
      'birthLocation' in parsed
    ) {
      return parsed as ExtractRequest;
    }
    return null;
  } catch {
    return null;
  }
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  const meta = session.metadata ?? {};
  const birthData = parseBirthData(meta.birthData);
  const orderId = meta.orderId;

  if (!birthData || !orderId) {
    console.error('Webhook: missing birthData or orderId in session metadata', {
      sessionId: session.id,
    });
    return;
  }

  const profile = await extractProfile(
    birthData.birthDate,
    birthData.birthTime,
    birthData.birthLocation
  );
  console.log('Profile extracted:', JSON.stringify(profile, null, 2));
}

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET is not set');
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
  }

  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature' }, { status: 400 });
  }

  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Stripe webhook signature verification failed:', message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    try {
      await handleCheckoutSessionCompleted(session);
    } catch (err) {
      console.error('Webhook: extraction failed after payment', err);
      return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
