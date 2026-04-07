import type { Planet, Center } from './constants';

export interface HDActivation {
  gate: number;
  line: number;
  color: number;
  tone: number;
  base: number;
}

export interface PlanetaryActivation extends HDActivation {
  planet: Planet;
  zodiacDegree: number;
}

export interface Channel {
  gate1: number;
  gate2: number;
  center1: Center;
  center2: Center;
}

export interface CenterStatus {
  name: Center;
  defined: boolean;
}

export interface HDProfile {
  // Input
  birthDate: string;
  birthTime: string;
  birthLocation: {
    latitude: number;
    longitude: number;
    timezone: string;
  };

  // Core activations
  personality: PlanetaryActivation[];
  design: PlanetaryActivation[];

  // Derived
  definedCenters: Center[];
  undefinedCenters: Center[];
  definedChannels: Channel[];
  type:
    | 'Generator'
    | 'Manifesting Generator'
    | 'Projector'
    | 'Manifestor'
    | 'Reflector';
  strategy: string;
  authority: string;
  profile: string;
  incarnationCross: string;
}

export interface ExtractRequest {
  birthDate: string;
  birthTime: string;
  birthLocation: {
    latitude: number;
    longitude: number;
    timezone: string;
  };
}

export interface ExtractResponse {
  status: 'success';
  profile: HDProfile;
  processingTimeMs: number;
}

/** Error codes returned by POST /api/extract */
export type ExtractErrorCode =
  | 'INVALID_DATE'
  | 'INVALID_TIMEZONE'
  | 'INVALID_INPUT'
  | 'EPHEMERIS_ERROR'
  | 'INTERNAL_ERROR';

export interface ErrorResponse {
  status: 'error';
  code: ExtractErrorCode;
  message: string;
  details?: string;
}
