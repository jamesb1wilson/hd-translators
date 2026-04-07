import { NextRequest, NextResponse } from 'next/server';
import { extractProfile } from '@/lib/hd-engine/calculator';
import { validateExtractRequest, type ExtractValidationError } from '@/lib/hd-engine/validation';
import type { ExtractResponse, ErrorResponse } from '@/lib/hd-engine/types';

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
  const startTime = Date.now();

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

  try {
    const profile = await extractProfile(
      validated.value.birthDate,
      validated.value.birthTime,
      validated.value.birthLocation
    );

    const processingTimeMs = Date.now() - startTime;

    const response: ExtractResponse = {
      status: 'success',
      profile,
      processingTimeMs,
    };

    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, max-age=0',
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('HD extraction error:', error);

    const message =
      error instanceof Error ? error.message : 'Ephemeris calculation failed';

    return NextResponse.json<ErrorResponse>(
      {
        status: 'error',
        code: 'EPHEMERIS_ERROR',
        message: 'Failed to compute planetary positions for the given birth data',
        details: message,
      },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-store, max-age=0',
          'Content-Type': 'application/json',
        },
      }
    );
  }
}
