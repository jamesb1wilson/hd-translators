import { DateTime } from 'luxon';
import * as swisseph from 'swisseph';
import { PLANETS, Planet, DESIGN_OFFSET_DEGREES } from './constants';

function julianDayUt(utc: Date): number {
  const y = utc.getUTCFullYear();
  const month = utc.getUTCMonth() + 1;
  const day = utc.getUTCDate();
  const hour =
    utc.getUTCHours() +
    utc.getUTCMinutes() / 60 +
    utc.getUTCSeconds() / 3600 +
    utc.getUTCMilliseconds() / 3600000;
  return swisseph.swe_julday(y, month, day, hour, swisseph.SE_GREG_CAL);
}

/**
 * Converts civil date/time in an IANA zone to the corresponding UTC instant.
 */
export function localWallTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  timeZone: string
): Date {
  const dt = DateTime.fromObject(
    { year, month, day, hour, minute, second },
    { zone: timeZone }
  );
  return dt.toUTC().toJSDate();
}

function longitudeBody(jdUt: number, bodyId: number): number {
  const flags = swisseph.SEFLG_SPEED;
  return swisseph.swe_calc_ut(jdUt, bodyId, flags).longitude;
}

export function ephemerisQuerySync(utcInstant: Date): Record<Planet, number> {
  const jd = julianDayUt(utcInstant);
  const result = {} as Record<Planet, number>;

  const sunLon = longitudeBody(jd, swisseph.SE_SUN);
  result.Sun = sunLon;
  result.Earth = (sunLon + 180) % 360;
  result.Moon = longitudeBody(jd, swisseph.SE_MOON);
  result.Mercury = longitudeBody(jd, swisseph.SE_MERCURY);
  result.Venus = longitudeBody(jd, swisseph.SE_VENUS);
  result.Mars = longitudeBody(jd, swisseph.SE_MARS);
  result.Jupiter = longitudeBody(jd, swisseph.SE_JUPITER);
  result.Saturn = longitudeBody(jd, swisseph.SE_SATURN);
  result.Uranus = longitudeBody(jd, swisseph.SE_URANUS);
  result.Neptune = longitudeBody(jd, swisseph.SE_NEPTUNE);
  result.Pluto = longitudeBody(jd, swisseph.SE_PLUTO);

  const trueNode = longitudeBody(jd, swisseph.SE_TRUE_NODE);
  result.NorthNode = trueNode;
  result.SouthNode = (trueNode + 180) % 360;

  for (const p of PLANETS) {
    if (result[p] === undefined) {
      throw new Error(`Missing ephemeris for ${p}`);
    }
  }

  return result;
}

export async function ephemerisQuery(utcInstant: Date): Promise<Record<Planet, number>> {
  return ephemerisQuerySync(utcInstant);
}

/** Shortest signed difference (a - b) in (-180, 180]. */
function normalizeAngleDiff(a: number, b: number): number {
  return ((a - b + 540) % 360) - 180;
}

export async function calculateDesignOffset(birthUtc: Date): Promise<Date> {
  const birthEph = await ephemerisQuery(birthUtc);
  const birthSun = birthEph.Sun;
  const targetLongitude = (birthSun - DESIGN_OFFSET_DEGREES + 360) % 360;

  let low = new Date(birthUtc.getTime() - 130 * 24 * 3600000);
  let high = birthUtc;

  for (let i = 0; i < 70; i++) {
    const mid = new Date((low.getTime() + high.getTime()) / 2);
    const midSun = (await ephemerisQuery(mid)).Sun;
    const delta = normalizeAngleDiff(midSun, targetLongitude);
    if (Math.abs(delta) < 1e-9) {
      return mid;
    }
    if (delta > 0) {
      high = mid;
    } else {
      low = mid;
    }
  }

  return new Date((low.getTime() + high.getTime()) / 2);
}
