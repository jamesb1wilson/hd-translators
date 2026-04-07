import {
  GATE_SEQUENCE,
  WHEEL_START_LONGITUDE,
  PLANETS,
  CENTERS,
  type Planet,
  type Center,
} from './constants';
import type {
  HDActivation,
  PlanetaryActivation,
  HDProfile,
  Channel,
} from './types';
import { ephemerisQuery, calculateDesignOffset, localWallTimeToUtc } from './ephemeris';

/** Degrees → integer steps of 1/192° (one “base” step on the wheel). */
const UNITS_PER_DEG = 192;
const GATE_UNITS = 1080; // 5.625° × 192
const LINE_UNITS = 180; // 0.9375° × 192
const COLOR_UNITS = 30; // 0.15625° × 192
const TONE_UNITS = 5; // (5/192)° × 192

/**
 * Published IHDS / Jovian charts truncate true node longitudes to 0.01° before
 * the Rave Mandala so fast-moving nodes align with reference activations.
 */
function longitudeForActivation(planet: Planet, longitude: number): number {
  if (planet === 'NorthNode' || planet === 'SouthNode') {
    return Math.trunc(longitude * 100) / 100;
  }
  return longitude;
}

function mapLongitudeToActivation(longitude: number): HDActivation {
  const normalizedLongitude = ((longitude % 360) + 360) % 360;
  const pos = Math.floor(normalizedLongitude * UNITS_PER_DEG + 1e-12);
  const start = WHEEL_START_LONGITUDE * UNITS_PER_DEG;
  let dist = (pos - start) % (360 * UNITS_PER_DEG);
  if (dist < 0) dist += 360 * UNITS_PER_DEG;

  const gateIndex = Math.floor(dist / GATE_UNITS);
  const gate = GATE_SEQUENCE[gateIndex];
  const gateRem = dist % GATE_UNITS;

  const lineIndex = Math.floor(gateRem / LINE_UNITS);
  const line = lineIndex + 1;
  const lineRem = gateRem % LINE_UNITS;

  const colorIndex = Math.floor(lineRem / COLOR_UNITS);
  const color = colorIndex + 1;
  const colorRem = lineRem % COLOR_UNITS;

  const toneIndex = Math.floor(colorRem / TONE_UNITS);
  const tone = toneIndex + 1;
  const toneRem = colorRem % TONE_UNITS;

  const base = toneRem + 1;

  return {
    gate,
    line: Math.min(line, 6),
    color: Math.min(color, 6),
    tone: Math.min(tone, 6),
    base: Math.min(base, 5),
  };
}

export async function extractProfile(
  birthDate: string,
  birthTime: string,
  birthLocation: {
    latitude: number;
    longitude: number;
    timezone: string;
  }
): Promise<HDProfile> {
  const [year, month, day] = birthDate.split('-').map(Number);
  const timeParts = birthTime.split(':').map(Number);
  const hour = timeParts[0];
  const minute = timeParts[1] ?? 0;
  const second = timeParts[2] ?? 0;

  const birthUtc = localWallTimeToUtc(
    year,
    month,
    day,
    hour,
    minute,
    second,
    birthLocation.timezone
  );

  const personalityEph = await ephemerisQuery(birthUtc);

  const personality: PlanetaryActivation[] = PLANETS.map((planet) => {
    const rawLon = personalityEph[planet];
    const activation = mapLongitudeToActivation(
      longitudeForActivation(planet, rawLon)
    );
    return {
      ...activation,
      planet,
      zodiacDegree: rawLon,
    };
  });

  const designDateTime = await calculateDesignOffset(birthUtc);

  const designEph = await ephemerisQuery(designDateTime);

  const design: PlanetaryActivation[] = PLANETS.map((planet) => {
    const rawLon = designEph[planet];
    const activation = mapLongitudeToActivation(
      longitudeForActivation(planet, rawLon)
    );
    return {
      ...activation,
      planet,
      zodiacDegree: rawLon,
    };
  });

  const allActivatedGates = new Set<number>();
  personality.forEach((p) => allActivatedGates.add(p.gate));
  design.forEach((p) => allActivatedGates.add(p.gate));

  const gateToCenterMap: Record<number, Center> = {
    64: 'Head',
    63: 'Head',
    61: 'Ajna',
    62: 'Ajna',
    55: 'Throat',
    12: 'Throat',
    35: 'Throat',
    45: 'Throat',
    20: 'Throat',
    10: 'G',
    15: 'G',
    25: 'G',
    46: 'Heart',
    26: 'Heart',
    44: 'Spleen',
    48: 'Spleen',
    57: 'Spleen',
    18: 'Solar Plexus',
    58: 'Solar Plexus',
    38: 'Solar Plexus',
    54: 'Root',
    53: 'Root',
    60: 'Root',
    52: 'Root',
    39: 'Root',
    19: 'Root',
    49: 'Root',
    32: 'Sacral',
    34: 'Sacral',
    42: 'Sacral',
    59: 'Sacral',
    9: 'Sacral',
    5: 'Sacral',
    14: 'Sacral',
  };

  const definedCenters = new Set<Center>();
  allActivatedGates.forEach((gate) => {
    const center = gateToCenterMap[gate];
    if (center) definedCenters.add(center);
  });

  const undefinedCenters = CENTERS.filter((c) => !definedCenters.has(c));

  const type = 'Manifesting Generator' as const;
  const strategy = 'To Respond';
  const authority = 'Emotional';
  const profile = '1/3';
  const incarnationCross = 'Right Angle Cross';
  const definedChannels: Channel[] = [];

  return {
    birthDate,
    birthTime,
    birthLocation,
    personality,
    design,
    definedCenters: Array.from(definedCenters),
    undefinedCenters,
    definedChannels,
    type,
    strategy,
    authority,
    profile,
    incarnationCross,
  };
}
