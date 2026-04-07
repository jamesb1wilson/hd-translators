import { DateTime } from 'luxon';
import type { ExtractRequest } from './types';

export type ExtractValidationError = {
  code: 'INVALID_DATE' | 'INVALID_TIMEZONE' | 'INVALID_INPUT';
  message: string;
  details?: string;
};

export type ValidateExtractResult =
  | { ok: true; value: ExtractRequest }
  | { ok: false; error: ExtractValidationError };

const ISO_DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_24H = /^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function timezoneSuggestionHint(invalidZone: string): string {
  return `Received "${invalidZone}". Use a valid IANA timezone identifier (e.g. Africa/Harare, America/New_York, Europe/London). Short names like "EST" are not accepted.`;
}

/**
 * Validates extract request shape and values before calling extractProfile.
 */
export function validateExtractRequest(body: unknown): ValidateExtractResult {
  if (!isRecord(body)) {
    return {
      ok: false,
      error: {
        code: 'INVALID_INPUT',
        message: 'Request body must be a JSON object',
        details: 'Expected an object with birthDate, birthTime, and birthLocation.',
      },
    };
  }

  const { birthDate, birthTime, birthLocation } = body;

  if (typeof birthDate !== 'string') {
    return {
      ok: false,
      error: {
        code: 'INVALID_DATE',
        message: 'Birth date must be a string in ISO 8601 format (YYYY-MM-DD)',
        details: `Expected a string, received ${typeof birthDate}.`,
      },
    };
  }

  const dateMatch = birthDate.match(ISO_DATE_ONLY);
  if (!dateMatch) {
    return {
      ok: false,
      error: {
        code: 'INVALID_DATE',
        message: 'Birth date must be in ISO 8601 format (YYYY-MM-DD)',
        details: `Received: '${birthDate}'`,
      },
    };
  }

  const y = Number(dateMatch[1]);
  const m = Number(dateMatch[2]);
  const d = Number(dateMatch[3]);
  const parsed = DateTime.fromObject({ year: y, month: m, day: d }, { zone: 'utc' });
  if (!parsed.isValid) {
    return {
      ok: false,
      error: {
        code: 'INVALID_DATE',
        message: 'Birth date is not a valid calendar date',
        details: `Received: '${birthDate}'`,
      },
    };
  }

  if (parsed.year < 1900) {
    return {
      ok: false,
      error: {
        code: 'INVALID_DATE',
        message: 'Birth date must be on or after 1900-01-01',
        details: `Received: '${birthDate}'`,
      },
    };
  }

  const todayUtc = DateTime.utc().startOf('day');
  if (parsed.startOf('day') > todayUtc) {
    return {
      ok: false,
      error: {
        code: 'INVALID_DATE',
        message: 'Birth date cannot be in the future',
        details: `Received: '${birthDate}'`,
      },
    };
  }

  if (typeof birthTime !== 'string') {
    return {
      ok: false,
      error: {
        code: 'INVALID_INPUT',
        message: 'Birth time must be a string in 24-hour format (HH:MM:SS)',
        details: `Expected a string, received ${typeof birthTime}.`,
      },
    };
  }

  if (!TIME_24H.test(birthTime)) {
    return {
      ok: false,
      error: {
        code: 'INVALID_INPUT',
        message: 'Birth time must be valid 24-hour HH:MM:SS (00:00:00 to 23:59:59)',
        details: `Received: '${birthTime}'`,
      },
    };
  }

  if (!isRecord(birthLocation)) {
    return {
      ok: false,
      error: {
        code: 'INVALID_INPUT',
        message: 'birthLocation must be an object',
        details: 'Expected { latitude, longitude, timezone }.',
      },
    };
  }

  const { latitude, longitude, timezone } = birthLocation;

  if (!isFiniteNumber(latitude)) {
    return {
      ok: false,
      error: {
        code: 'INVALID_INPUT',
        message: 'Latitude must be a finite number between -90 and 90 (inclusive)',
        details: `Expected a number, received ${typeof latitude}.`,
      },
    };
  }
  if (latitude < -90 || latitude > 90) {
    return {
      ok: false,
      error: {
        code: 'INVALID_INPUT',
        message: 'Latitude must be between -90 and 90 (inclusive)',
        details: `Received: ${latitude}`,
      },
    };
  }

  if (!isFiniteNumber(longitude)) {
    return {
      ok: false,
      error: {
        code: 'INVALID_INPUT',
        message: 'Longitude must be a finite number between -180 and 180 (inclusive)',
        details: `Expected a number, received ${typeof longitude}.`,
      },
    };
  }
  if (longitude < -180 || longitude > 180) {
    return {
      ok: false,
      error: {
        code: 'INVALID_INPUT',
        message: 'Longitude must be between -180 and 180 (inclusive)',
        details: `Received: ${longitude}`,
      },
    };
  }

  if (typeof timezone !== 'string' || timezone.trim() === '') {
    return {
      ok: false,
      error: {
        code: 'INVALID_TIMEZONE',
        message: 'Timezone must be a non-empty IANA identifier',
        details: timezoneSuggestionHint(String(timezone)),
      },
    };
  }

  const zoneProbe = DateTime.fromObject(
    { year: 2020, month: 6, day: 15, hour: 12, minute: 0, second: 0 },
    { zone: timezone }
  );
  if (!zoneProbe.isValid) {
    return {
      ok: false,
      error: {
        code: 'INVALID_TIMEZONE',
        message: 'Timezone must be a valid IANA timezone identifier',
        details: timezoneSuggestionHint(timezone),
      },
    };
  }

  const value: ExtractRequest = {
    birthDate,
    birthTime,
    birthLocation: {
      latitude,
      longitude,
      timezone,
    },
  };

  return { ok: true, value };
}
