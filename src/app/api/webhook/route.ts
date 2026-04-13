import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { supabaseAdmin } from '@/lib/supabase';
import { extractProfile } from '@/lib/hd-engine/calculator';
import type { ExtractRequest, HDProfile } from '@/lib/hd-engine/types';
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

/** Resolves auth user id by email via paginated listUsers (getUserByEmail is not in @supabase/auth-js). */
async function findAuthUserIdByEmail(email: string): Promise<string | null> {
  const normalized = email.trim().toLowerCase();
  let page = 1;
  const perPage = 1000;
  for (;;) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const users = data.users;
    const match = users.find((u) => u.email?.toLowerCase() === normalized);
    if (match) return match.id;
    if (users.length < perPage) break;
    page += 1;
  }
  return null;
}

async function ensureAppUserRow(userId: string, email: string): Promise<void> {
  const { error } = await supabaseAdmin.from('users').upsert(
    { id: userId, email: email.trim() },
    { onConflict: 'id' }
  );
  if (error) throw error;
}

/**
 * Create or retrieve Auth + public.users row by email.
 * Note: auth.admin.getUserByEmail() is not exposed in the installed JS client; we use
 * public.users, createUser, and listUsers fallback instead.
 */
async function getOrCreateUserIdByEmail(email: string): Promise<string> {
  const trimmed = email.trim();
  const { data: existingRow, error: selectErr } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('email', trimmed)
    .maybeSingle();
  if (selectErr) throw selectErr;
  if (existingRow) return existingRow.id;

  const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
    email: trimmed,
    email_confirm: true,
  });

  if (!createErr && created.user) {
    await ensureAppUserRow(created.user.id, trimmed);
    return created.user.id;
  }

  const existingId = await findAuthUserIdByEmail(trimmed);
  if (!existingId) {
    throw createErr ?? new Error('Failed to create or locate auth user');
  }
  await ensureAppUserRow(existingId, trimmed);
  return existingId;
}

async function persistOrderAndProfile(params: {
  orderId: string;
  session: Stripe.Checkout.Session;
  userId: string;
  profile: HDProfile;
  birthData: ExtractRequest;
}): Promise<void> {
  const { orderId, session, userId, profile, birthData } = params;
  const amountCents = session.amount_total;
  if (amountCents == null) {
    throw new Error('Stripe session missing amount_total');
  }

  const { error: orderErr } = await supabaseAdmin.from('orders').upsert(
    {
      id: orderId,
      user_id: userId,
      stripe_session_id: session.id,
      amount_cents: amountCents,
      currency: session.currency ?? 'usd',
      status: 'complete',
    },
    { onConflict: 'id' }
  );
  if (orderErr) throw orderErr;

  const { error: delErr } = await supabaseAdmin.from('hd_profiles').delete().eq('order_id', orderId);
  if (delErr) throw delErr;

  const { error: profileErr } = await supabaseAdmin.from('hd_profiles').insert({
    order_id: orderId,
    user_id: userId,
    birth_date: birthData.birthDate,
    birth_time: birthData.birthTime,
    latitude: birthData.birthLocation.latitude,
    longitude: birthData.birthLocation.longitude,
    timezone: birthData.birthLocation.timezone,
    profile_json: profile as unknown as Record<string, unknown>,
  });
  if (profileErr) throw profileErr;
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  const meta = session.metadata ?? {};
  const birthData = parseBirthData(meta.birthData);
  const orderId = meta.orderId;
  const customerEmail = session.customer_details?.email?.trim();

  if (!birthData || !orderId) {
    console.error('Webhook: missing birthData or orderId in session metadata', {
      sessionId: session.id,
    });
    throw new Error('Missing birthData or orderId');
  }
  if (!customerEmail) {
    console.error('Webhook: missing customer email on session', { sessionId: session.id });
    throw new Error('Missing customer email');
  }

  const profile = await extractProfile(
    birthData.birthDate,
    birthData.birthTime,
    birthData.birthLocation
  );

  const userId = await getOrCreateUserIdByEmail(customerEmail);

  await persistOrderAndProfile({ orderId, session, userId, profile, birthData });

  const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
    type: 'magiclink',
    email: customerEmail,
  });
  if (linkErr) throw linkErr;

  const magicLink = linkData.properties?.action_link ?? '(no action_link in response)';
  console.log('Magic link (log only until email delivery):', magicLink);
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
      console.error('Webhook: processing failed after payment', err);
      return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
