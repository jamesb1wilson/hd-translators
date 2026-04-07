# HD Translators — System Specification

## Project Identity

HD Translators is a suite of single-transformation products. Each product takes one input (birth date, time, location) and produces one output (a personalized Human Design interpretation artifact). Products share a backend data extraction engine and diverge only at the interpretation/delivery layer.

The operator (Dzava) does not read, write, or edit code. All architectural decisions are expressed in this document. All code generation must conform to this specification. No code is generated that is not explicitly described here.

## Architecture Principles (Non-Negotiable)

### Wall-Immunity Rules

1. **Feature Count = 1 per product.** Each product performs exactly one transformation. No feature additions without updating this document first.
2. **Stateless per transaction.** Each interpretation request is independent. No session state carries between requests.
3. **No custom authentication at launch.** Use Supabase Auth with magic link or OAuth. Zero custom auth code.
4. **No relational complexity.** Maximum 3 database tables for the entire system: `users`, `orders`, `hd_profiles`. No joins deeper than one level.
5. **Single external integration per product.** The data extraction backend is the one integration. Each product's LLM pipeline is internal logic, not an integration.
6. **Code under 5,000 lines total.** If approaching this limit, stop and consult this document before adding any code.

### Technical Stack (Locked)

- **Language:** TypeScript (strict mode). The compiler catches AI hallucinations.
- **Framework:** Next.js 14+ (App Router). Opinionated structure constrains AI drift.
- **Backend:** Supabase (PostgreSQL, Auth, Edge Functions).
- **Deployment:** Vercel + GitHub. Push = deploy. Zero manual DevOps.
- **Styling:** Tailwind CSS. No custom CSS files.
- **Payments:** Stripe Checkout (redirect mode, not embedded). Simplest integration path.

### Folder Structure (Exact)

```
hd-translators/
├── .cursor/
│   └── rules/
│       └── project.mdc
├── src/
│   ├── app/
│   │   ├── page.tsx
│   │   ├── api/
│   │   │   ├── extract/
│   │   │   │   └── route.ts
│   │   │   ├── interpret/
│   │   │   └── webhook/
│   │   └── result/
│   │       └── [orderId]/
│   │           └── page.tsx
│   ├── lib/
│   │   ├── hd-engine/
│   │   │   ├── calculator.ts
│   │   │   ├── constants.ts
│   │   │   ├── types.ts
│   │   │   ├── validation.ts
│   │   │   └── __tests__/
│   │   │       └── api-extract.test.ts
│   │   ├── interpret/
│   │   │   ├── prompts.ts
│   │   │   └── pipeline.ts
│   │   ├── supabase.ts
│   │   └── stripe.ts
│   └── components/
│       ├── BirthDataForm.tsx
│       └── ResultDisplay.tsx
├── supabase/
│   └── migrations/
├── docs/
│   └── decisions.md
├── next.config.mjs
├── vitest.config.ts
├── system.md
└── package.json
```

**Rule: The AI must not create files outside this structure without updating system.md first.**

### Known Stack Constraints
- next.config.mjs uses `webpack externals` for swisseph (not serverExternalPackages — 
  unsupported in Next 14.2.35). Do not revert this.

## The Data Extraction Engine (Phase 1 — Current Build Target)

### What It Does

Takes birth date, birth time, and birth location as input. Returns a complete Human Design profile data object as output.

### Required Calculations

The extraction engine must compute:

1. **Personality (Conscious) Gate Positions:** Sun, Earth, North Node, South Node, Moon, Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune, Pluto — calculated from the exact birth moment.
2. **Design (Unconscious) Gate Positions:** Same 13 planetary positions calculated from exactly 88 solar degrees before birth (approximately 88-89 days before birth, precise to the degree).
3. **Gate and Line:** Each planetary position maps to one of 64 Gates and one of 6 Lines via the Human Design wheel (the I Ching mapped onto the zodiac).
4. **Type:** Determined by defined centers — Generator, Manifesting Generator, Projector, Manifestor, or Reflector.
5. **Authority:** Determined by the hierarchy of defined centers — Emotional, Sacral, Splenic, Ego, Self-Projected, Mental/Environmental, or Lunar.
6. **Profile:** Determined by the Line of the Personality Sun and the Line of the Design Sun (e.g., 1/3, 4/6, 6/2).
7. **Defined Centers:** Which of the 9 centers are defined (colored in) by channel activations.
8. **Defined Channels:** Which channels are activated by having gates at both ends.
9. **Incarnation Cross:** Determined by the four Sun/Earth gates (Personality Sun, Personality Earth, Design Sun, Design Earth).

### Data Source Strategy

**Option A (Preferred): Swiss Ephemeris via npm package.**
Use `swisseph` npm package (Node.js bindings for Swiss Ephemeris). This is the astronomical standard. Provides precise planetary positions for any date/time/location.

**Option B (Fallback): Public API.**
If Swiss Ephemeris integration proves too complex for initial build, use a verified astrology API (e.g., AstroSage, Prokerala) for planetary positions only, then apply HD wheel mapping locally.

**The HD Wheel Mapping** (Gate-to-Zodiac degree mapping) is a fixed lookup table. It does not change. It must be hardcoded as a constant, not computed.

### Output Schema

```typescript
interface HDProfile {
  // Input
  birthDate: string;        // ISO 8601
  birthTime: string;        // HH:MM (24h)
  birthLocation: {
    latitude: number;
    longitude: number;
    timezone: string;
  };

  // Computed
  type: 'Generator' | 'Manifesting Generator' | 'Projector' | 'Manifestor' | 'Reflector';
  authority: string;
  profile: string;          // e.g., "4/6"
  incarnationCross: {
    name: string;
    gates: [number, number, number, number];
  };

  // Planetary Activations
  personality: PlanetaryActivation[];  // Conscious
  design: PlanetaryActivation[];       // Unconscious (88° before birth)

  // Bodygraph
  definedCenters: string[];
  undefinedCenters: string[];
  definedChannels: Channel[];

  // Raw for downstream products
  allGates: number[];       // Unique activated gates
  allLines: GateLine[];     // Gate + Line pairs
}

interface PlanetaryActivation {
  planet: string;
  gate: number;
  line: number;
  zodiacDegree: number;
  color?: number;           // For advanced products
  tone?: number;            // For advanced products
  base?: number;            // For advanced products
}

interface Channel {
  gate1: number;
  gate2: number;
  center1: string;
  center2: string;
}

interface GateLine {
  gate: number;
  line: number;
}
```

### Validation Rules

- Birth date: Must be a real date. No future dates.
- Birth time: Required. If unknown, flag the profile as "time-approximate" — Type and Authority may be inaccurate.
- Birth location: Must resolve to valid latitude/longitude/timezone. Use a geocoding service or timezone lookup.

## Product Pipeline (Future — Not Current Build)

Each product below shares the extraction engine. Each adds a distinct interpretation layer. Each is a separate vertical slice built AFTER the extraction engine is verified.

1. **HD Core Report** — Written interpretation, delivered as sequenced emails.
2. **HD Voice Journey** — AI voice narration of the interpretation.
3. **HD Personal Music** — AI-generated music reflecting the HD type/authority.
4. **HD Career Compass** — Professional/career-specific interpretation.

**Rule: Do not build any product until the extraction engine produces verified, correct output for at least 10 test profiles compared against known-correct reference data.**

## Verification Protocol

The operator will provide reference profiles (birth data + known correct HD chart data from established platforms). The extraction engine's output must match these references exactly on: Type, Authority, Profile, all 26 planetary gate/line activations, defined centers, and defined channels.

Discrepancies are bugs. The AI must not rationalize discrepancies. Fix them.

## Decision Log

After every completed feature or significant code change, the AI must append to `docs/decisions.md`:
- What was built
- Why this approach was chosen
- What alternatives were considered
- What edge cases were identified

This log is fed back into context for future sessions to prevent context collapse.
