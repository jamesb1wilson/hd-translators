// The fixed Human Design wheel sequence starting at 302° (2° Aquarius)
export const GATE_SEQUENCE: number[] = [
  41, 19, 13, 49, 30, 55, 37, 63, 22, 36, 25, 17, 21, 51, 42, 3,
  27, 24, 2, 23, 8, 20, 16, 35, 45, 12, 15, 52, 39, 53, 62, 56,
  31, 33, 7, 4, 29, 59, 40, 64, 47, 6, 46, 18, 48, 57, 32, 50,
  28, 44, 1, 43, 14, 34, 9, 5, 26, 11, 10, 58, 38, 54, 61, 60,
];

export const WHEEL_START_LONGITUDE = 302;
export const GATE_WIDTH = 5.625;
export const LINE_WIDTH = 0.9375;
export const COLOR_WIDTH = 0.15625;
export const TONE_WIDTH = 5 / 192;
export const BASE_WIDTH = 1 / 192;
export const DESIGN_OFFSET_DEGREES = 88;

export const PLANETS = [
  'Sun',
  'Earth',
  'Moon',
  'NorthNode',
  'SouthNode',
  'Mercury',
  'Venus',
  'Mars',
  'Jupiter',
  'Saturn',
  'Uranus',
  'Neptune',
  'Pluto',
] as const;

export type Planet = (typeof PLANETS)[number];

export const PLANET_DISPLAY_NAMES: Record<Planet, string> = {
  Sun: 'Sun',
  Earth: 'Earth',
  Moon: 'Moon',
  NorthNode: 'North Node',
  SouthNode: 'South Node',
  Mercury: 'Mercury',
  Venus: 'Venus',
  Mars: 'Mars',
  Jupiter: 'Jupiter',
  Saturn: 'Saturn',
  Uranus: 'Uranus',
  Neptune: 'Neptune',
  Pluto: 'Pluto',
};

// 9 centers in Human Design
export const CENTERS = [
  'Head',
  'Ajna',
  'Throat',
  'G',
  'Heart',
  'Spleen',
  'Solar Plexus',
  'Sacral',
  'Root',
] as const;

export type Center = (typeof CENTERS)[number];
