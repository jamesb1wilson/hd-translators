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

---

## Session 3a — Stripe Checkout (payment gating)

### What was built

- **Stripe Checkout (redirect mode)** via `src/lib/stripe.ts`: singleton Stripe client, `createCheckoutSession(birthData, orderId)` with inline `price_data` ($9.00 USD), metadata `birthData` (JSON string) and `orderId`, `success_url` / `cancel_url` using `NEXT_PUBLIC_BASE_URL`.
- **`POST /api/checkout`** (`src/app/api/checkout/route.ts`): same body and validation as `/api/extract` (`validateExtractRequest`), UUID `orderId`, returns `{ url, orderId }`; **400** validation/JSON errors, **500** Stripe failures.
- **`POST /api/webhook`** (`src/app/api/webhook/route.ts`): raw body via `request.text()`, `stripe.webhooks.constructEvent` with `STRIPE_WEBHOOK_SECRET`; handles **`checkout.session.completed`** only — parses metadata, calls `extractProfile`, logs `Profile extracted:` + JSON; other events **200**; bad signature **400**.
- **Landing page** (`src/app/page.tsx`): minimal birth-data form (flat fields → nested `birthLocation`), submit → `POST /api/checkout` → browser redirect to Stripe URL.
- **Result page** (`src/app/result/[orderId]/page.tsx`): placeholder copy + displays `orderId` from the route (no profile UI until Session 3b / Supabase).
- **Dependencies**: `stripe`, `@stripe/stripe-js` (publishable key reserved for future client use).
- **Env**: `.env.local` placeholders for Stripe keys and `NEXT_PUBLIC_BASE_URL`; `.gitignore` includes `.env.local`.

### Why `price_data` inline (no Stripe Product/Price IDs)

- Avoids dashboard setup and extra IDs while the flow is being wired; Session 3b can migrate to a Product/Price in Stripe for reporting and reuse.

### Why `orderId` is generated at checkout, not in the webhook

- The success redirect can be `/result/{orderId}` before payment completes; the same id is stored in session metadata for the webhook and later persistence.

### App Router note: `bodyParser: false`

- Next.js 14 App Router **rejects** the Pages API pattern `export const config = { api: { bodyParser: false } }` (deprecated error at build). Raw bytes for Stripe verification are read with **`await request.text()`** on the `NextRequest`, which is the supported approach (no automatic JSON parse unless `request.json()` is called).

### Edge cases

- **Webhook signature failure** → **400** (Stripe retry behavior unchanged).
- **Stripe metadata**: **500 characters per metadata value**; `birthData` JSON for normal inputs is well under this limit.

### Verification (this environment)

- **`stripe listen` / `stripe trigger` were not run** — Stripe CLI is not available on the operator machine. End-to-end webhook delivery will be confirmed in **Session 3b** using the Stripe Dashboard’s built-in test webhook sender (or an equivalent dashboard-driven test) against the deployed `/api/webhook` URL.

### Not in this session

- Supabase, email delivery, modifying `calculator.ts` or `/api/extract`.

---

## Session 3b — Supabase storage and Auth (webhook + result page)

### What was built

- **Schema** (`supabase/migrations/001_initial_schema.sql`): three tables only — `users` (FK to `auth.users`), `orders`, `hd_profiles` — plus RLS and `SELECT` policies scoped to `auth.uid()` for each table.
- **Clients** (`src/lib/supabase.ts`): `supabase` (anon / `NEXT_PUBLIC_*`) and `supabaseAdmin` (service role / `SUPABASE_SERVICE_ROLE_KEY`). Dependencies: `@supabase/supabase-js`, `@supabase/ssr` (result page only, for cookie-aware anon sessions).
- **Webhook** (`src/app/api/webhook/route.ts`): On `checkout.session.completed`, reads `birthData` and `orderId` from metadata and `customer_details.email`, runs `extractProfile()`, then with `supabaseAdmin` upserts `users`, upserts `orders` (`status: 'complete'`), replaces any prior `hd_profiles` row for that `order_id` and inserts the new profile JSON, then `auth.admin.generateLink({ type: 'magiclink', email })` and logs `properties.action_link` to the console (email sending deferred).
- **Result page** (`src/app/result/[orderId]/page.tsx`): Server component; `createServerClient` + anon key; loads `hd_profiles` by `order_id` and shows a short summary (type, authority, profile, defined centers) or the “being prepared” message when no row or RLS yields no access.
- **Env** (`.env.local`): placeholders for `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (and non-empty Stripe placeholders so `next build` can load routes that import `stripe.ts`).

### Why the service role key is only used in the webhook

- Stripe’s server handler must write orders and profiles **without** an end-user JWT. Row Level Security is written for authenticated clients (`auth.uid()`). The **service role** client bypasses RLS so the webhook can insert/upsert on behalf of the paying customer after payment. The **anon** key is used for normal app reads (e.g. the result page) so unprivileged access stays constrained by RLS when a session exists.

### Why the magic link is logged, not emailed

- Outbound email (SMTP, Resend, etc.) is not configured in this session; logging the generated link matches the “custom email provider” workflow until an email integration is added.

### Why the user upsert / lookup pattern

- The same customer may complete checkout more than once; `public.users` and Auth must resolve **one** user id per email. The implementation upserts `users` on `id` and, when creating a new Auth user fails because the email already exists, falls back to **paginated** `auth.admin.listUsers` to find the id. (**Note:** `auth.admin.getUserByEmail()` is **not** implemented in the installed `@supabase/auth-js` / `GoTrueAdminApi`; the task’s name was mapped to this behavior. If Supabase adds a direct API later, the fallback can be simplified.)

### Auth API caveat (operator / maintainer)

- If `listUsers` pagination becomes too heavy at scale, prefer a DB trigger or a supported Admin API for email lookup once available.

### RLS and the result page

- Policies allow `SELECT` on `hd_profiles` only when `auth.uid() = user_id`. Visitors **without** a Supabase session (e.g. immediately after Stripe redirect, before opening the magic link) will typically see the “being prepared” message until they authenticate; after the magic link establishes a session, the same URL can show the summary.

### Verification (this environment)

- **`npm run typecheck`** — passed.
- **`npm run build`** — passed (with `.env.local` containing non-empty Stripe placeholders so `stripe.ts` can load during the build).

### Operator follow-up (manual)

- Run `001_initial_schema.sql` in the Supabase SQL Editor.
- Set real Supabase and Stripe values in `.env.local`.
- Test the webhook from the Stripe Dashboard (e.g. tunnel with `npx localtunnel --port 3000` if localhost is not public).
