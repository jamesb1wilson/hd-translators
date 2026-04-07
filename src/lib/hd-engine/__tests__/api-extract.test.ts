import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/extract/route';
import { extractProfile } from '@/lib/hd-engine/calculator';

const referenceInput = {
  birthDate: '1985-07-31',
  birthTime: '04:33:00',
  birthLocation: {
    latitude: -19.8,
    longitude: 32.86667,
    timezone: 'Africa/Harare',
  },
} as const;

function postRequest(jsonBody: unknown) {
  return new NextRequest('http://localhost/api/extract', {
    method: 'POST',
    body: JSON.stringify(jsonBody),
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('POST /api/extract', () => {
  it('returns 200 and profile matching extractProfile (reference profile)', async () => {
    const expected = await extractProfile(
      referenceInput.birthDate,
      referenceInput.birthTime,
      { ...referenceInput.birthLocation }
    );

    const res = await POST(postRequest(referenceInput));
    expect(res.status).toBe(200);

    const body = (await res.json()) as {
      status: string;
      profile: typeof expected;
      processingTimeMs: number;
    };

    expect(body.status).toBe('success');
    expect(typeof body.processingTimeMs).toBe('number');
    expect(body.processingTimeMs).toBeGreaterThanOrEqual(0);
    expect(body.profile).toEqual(expected);
  });

  it('returns 400 INVALID_DATE for invalid date string', async () => {
    const res = await POST(
      postRequest({
        ...referenceInput,
        birthDate: 'not-a-date',
      })
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { status: string; code: string; message: string };
    expect(body.status).toBe('error');
    expect(body.code).toBe('INVALID_DATE');
    expect(body.message.toLowerCase()).toMatch(/iso|yyyy-mm-dd|format/);
  });

  it('returns 400 INVALID_TIMEZONE for invalid IANA timezone', async () => {
    const res = await POST(
      postRequest({
        ...referenceInput,
        birthLocation: {
          ...referenceInput.birthLocation,
          timezone: 'Invalid/Timezone',
        },
      })
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { status: string; code: string; message: string };
    expect(body.status).toBe('error');
    expect(body.code).toBe('INVALID_TIMEZONE');
  });

  it('returns 400 INVALID_DATE when birth date is in the future', async () => {
    const res = await POST(
      postRequest({
        ...referenceInput,
        birthDate: '2099-12-31',
      })
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { status: string; code: string; message: string };
    expect(body.status).toBe('error');
    expect(body.code).toBe('INVALID_DATE');
    expect(body.message.toLowerCase()).toContain('future');
  });

  it('returns 400 INVALID_INPUT when latitude is out of range', async () => {
    const res = await POST(
      postRequest({
        ...referenceInput,
        birthLocation: {
          ...referenceInput.birthLocation,
          latitude: 95,
        },
      })
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { status: string; code: string; message: string };
    expect(body.status).toBe('error');
    expect(body.code).toBe('INVALID_INPUT');
    expect(body.message.toLowerCase()).toMatch(/latitude/);
    expect(body.message).toMatch(/-90|90/);
  });
});
