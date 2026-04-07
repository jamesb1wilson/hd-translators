declare module 'swisseph' {
  export const SE_GREG_CAL: number;
  export const SE_SUN: number;
  export const SE_MOON: number;
  export const SE_MERCURY: number;
  export const SE_VENUS: number;
  export const SE_MARS: number;
  export const SE_JUPITER: number;
  export const SE_SATURN: number;
  export const SE_URANUS: number;
  export const SE_NEPTUNE: number;
  export const SE_PLUTO: number;
  export const SE_MEAN_NODE: number;
  export const SE_TRUE_NODE: number;
  export const SEFLG_SPEED: number;

  export function swe_julday(
    year: number,
    month: number,
    day: number,
    hour: number,
    gregflag: number
  ): number;

  export function swe_calc_ut(
    jd_ut: number,
    planet: number,
    flags: number
  ): {
    longitude: number;
    latitude: number;
    distance: number;
    longitudeSpeed: number;
    latitudeSpeed: number;
    distanceSpeed: number;
    rflag: number;
  };
}
