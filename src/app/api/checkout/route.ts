import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { createCheckoutSession } from '@/lib/stripe';
import { validateExtractRequest } from '@/lib/hd-engine/validation';
import type { ExtractValidationError } from '@/lib/hd-engine/validation';
import type { ErrorResponse } from '@/lib/hd-engine/types';

function jsonError(
  err: ExtractValidationError,
  status: number
): NextResponse<ErrorResponse> {
  return NextResponse.json<ErrorResponse>(
    {
      status: 'error',
      code: err.code,
      message: err.message,
      details: err.details,
    },
    {
      status,
      headers: {
        'Cache-Control': 'no-store, max-age=0',
        'Content-Type': 'application/json',
      },
    }
  );
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json<ErrorResponse>(
      {
        status: 'error',
        code: 'INVALID_INPUT',
        message: 'Request body must be valid JSON',
        details: 'Send a JSON object with birthDate, birthTime, and birthLocation.',
      },
      { status: 400 }
    );
  }

  const validated = validateExtractRequest(body);
  if (!validated.ok) {
    return jsonError(validated.error, 400);
  }

  const orderId = randomUUID();

  try {
    const url = await createCheckoutSession(validated.value, orderId);
    return NextResponse.json(
      { url, orderId },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, max-age=0',
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Stripe checkout error:', error);
    return NextResponse.json<ErrorResponse>(
      {
        status: 'error',
        code: 'INTERNAL_ERROR',
        message: 'Failed to create checkout session',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
