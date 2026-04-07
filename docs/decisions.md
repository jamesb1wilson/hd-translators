# HD Translators API - Technical Decisions

## What Was Built

### API endpoint

- **Endpoint**: `POST /api/extract`
- **Purpose**: Stateless JSON API that returns a full `HDProfile` from birth date, time, and location.
- **Framework**: Next.js 14 (App Router), TypeScript strict mode.
- **Engine**: Session 1 `extractProfile()` in `src/lib/hd-engine/calculator.ts` (unchanged algorithmically).

### Core components

1. **HD extraction engine** (`src/lib/hd-engine/calculator.ts`)  
   - `extractProfile(birthDate, birthTime, birthLocation)`  
   - Ephemeris via **Swiss Ephemeris** (`swisseph` native addon), Julian day → longitudes → HD activations.

2. **Validation** (`src/lib/hd-engine/validation.ts`)  
   - Runs **before** `extractProfile`.  
   - Returns a discriminated result: either a typed `ExtractRequest` or a field-level error (`INVALID_DATE`, `INVALID_TIMEZONE`, `INVALID_INPUT`).  
   - Date: ISO `YYYY-MM-DD`, not future, on or after `1900-01-01`.  
   - Time: `HH:MM:SS` (24h).  
   - Lat/lng and IANA timezone (Luxon zone probe; short names like `EST` rejected).

3. **API route** (`src/app/api/extract/route.ts`)  
   - Parses JSON, validates, calls `extractProfile`, measures `processingTimeMs`.  
   - **400**: validation / bad JSON (code `INVALID_INPUT` for non-JSON body).  
   - **500**: `EPHEMERIS_ERROR` when calculation throws (e.g. swisseph failure).

4. **Types** (`src/lib/hd-engine/types.ts`)  
   - `ExtractRequest`, `ExtractResponse`, `ErrorResponse`, `ExtractErrorCode`.

### Testing

- **Vitest** integration tests: `src/lib/hd-engine/__tests__/api-extract.test.ts`  
  - Reference profile (Dzava / Chimanimani), invalid date, invalid timezone, future date, out-of-range latitude.  
- Reference activations: `tests/fixtures/reference-profile.test.ts` (engine-level).

### Configuration

- **`next.config.mjs`**: Webpack `externals` for `swisseph` on the server build so the native `.node` addon is not bundled (Next 14.2.35 does not expose `serverExternalPackages` here).  
- **`vitest.config.ts`**: `@/*` → `src/*`.

---

## Why stateless

- No session, DB, or cache: each request is independent.  
- **Horizontal scaling**: any instance can serve any request; no shared mutable server state.  
- **Operational simplicity**: no migrations or storage for this layer (Session 3 may add persistence and paywall).

---

## Edge cases handled

| Area | Behavior |
|------|----------|
| Malformed JSON | 400, `INVALID_INPUT` |
| Bad date format / impossible date / before 1900-01-01 / future | 400, `INVALID_DATE` where applicable |
| Bad time format | 400, `INVALID_INPUT` |
| Lat/lng out of range or wrong type | 400, `INVALID_INPUT` |
| Invalid or empty IANA timezone | 400, `INVALID_TIMEZONE` (message suggests valid IANA examples) |
| `extractProfile` / swisseph throws | 500, `EPHEMERIS_ERROR` with message in `details` |

**Not in this session**: authentication, rate limits, caching, Supabase, Stripe.

---

## Estimated latency

- **Typical local dev**: on the order of **tens to low hundreds of ms** per request (ephemeris + design-time binary search dominate).  
- **Production**: depends on host CPU and cold starts; same order of magnitude unless a platform adds large overhead.

---

## Code footprint (approximate)

HD engine + API wrapper + validation + tests remain **well under** the 5,000-line project cap discussed for Session 1–2.

---

## Next phase (Session 3)

- Supabase (or similar) for stored profiles.  
- Stripe / paywall on `/api/extract`.  
- Rate limiting per key or user.
