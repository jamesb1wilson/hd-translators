import { describe, it, expect } from 'vitest';
import { extractProfile } from '../../src/lib/hd-engine/calculator';

describe('HD Extraction Engine - Reference Profile Validation', () => {
  it('should extract profile matching reference (Dzava 1985-07-31)', async () => {
    const profile = await extractProfile('1985-07-31', '04:33:00', {
      latitude: -19.8,
      longitude: 32.86667,
      timezone: 'Africa/Harare',
    });

    function checkActivation(
      activation: {
        gate: number;
        line: number;
        color: number;
        tone: number;
        base: number;
      },
      expectedGate: number,
      expectedLine: number,
      expectedColor: number,
      expectedTone: number,
      expectedBase: number,
      planetName: string
    ) {
      expect(activation.gate, `${planetName} gate`).toBe(expectedGate);
      expect(activation.line, `${planetName} line`).toBe(expectedLine);
      expect(activation.color, `${planetName} color`).toBe(expectedColor);
      expect(activation.tone, `${planetName} tone`).toBe(expectedTone);
      expect(activation.base, `${planetName} base`).toBe(expectedBase);
    }

    const pSun = profile.personality[0];
    checkActivation(pSun, 33, 1, 2, 3, 2, 'Personality Sun');

    const pEarth = profile.personality[1];
    checkActivation(pEarth, 19, 1, 2, 3, 2, 'Personality Earth');

    const pMoon = profile.personality[2];
    checkActivation(pMoon, 60, 2, 4, 1, 4, 'Personality Moon');

    const pNorthNode = profile.personality[3];
    checkActivation(pNorthNode, 2, 2, 2, 5, 1, 'Personality North Node');

    const pSouthNode = profile.personality[4];
    checkActivation(pSouthNode, 1, 2, 2, 5, 1, 'Personality South Node');

    const pMercury = profile.personality[5];
    checkActivation(pMercury, 29, 1, 3, 4, 5, 'Personality Mercury');

    const pVenus = profile.personality[6];
    checkActivation(pVenus, 12, 6, 1, 4, 4, 'Personality Venus');

    const pMars = profile.personality[7];
    checkActivation(pMars, 31, 2, 6, 5, 2, 'Personality Mars');

    const pJupiter = profile.personality[8];
    checkActivation(pJupiter, 19, 6, 2, 6, 1, 'Personality Jupiter');

    const pSaturn = profile.personality[9];
    checkActivation(pSaturn, 43, 3, 5, 5, 3, 'Personality Saturn');

    const pUranus = profile.personality[10];
    checkActivation(pUranus, 5, 3, 6, 6, 4, 'Personality Uranus');

    const pNeptune = profile.personality[11];
    checkActivation(pNeptune, 10, 4, 2, 4, 5, 'Personality Neptune');

    const pPluto = profile.personality[12];
    checkActivation(pPluto, 28, 1, 1, 1, 5, 'Personality Pluto');

    const dSun = profile.design[0];
    checkActivation(dSun, 24, 3, 3, 2, 1, 'Design Sun');

    const dEarth = profile.design[1];
    checkActivation(dEarth, 44, 3, 3, 2, 1, 'Design Earth');

    const dMoon = profile.design[2];
    checkActivation(dMoon, 40, 1, 3, 6, 3, 'Design Moon');

    const dNorthNode = profile.design[3];
    checkActivation(dNorthNode, 2, 6, 2, 5, 5, 'Design North Node');

    const dSouthNode = profile.design[4];
    checkActivation(dSouthNode, 1, 6, 2, 5, 5, 'Design South Node');

    const dMercury = profile.design[5];
    checkActivation(dMercury, 21, 4, 6, 2, 3, 'Design Mercury');

    const dVenus = profile.design[6];
    checkActivation(dVenus, 17, 3, 5, 6, 4, 'Design Venus');

    const dMars = profile.design[7];
    checkActivation(dMars, 20, 3, 5, 3, 2, 'Design Mars');

    const dJupiter = profile.design[8];
    checkActivation(dJupiter, 13, 2, 6, 2, 5, 'Design Jupiter');

    const dSaturn = profile.design[9];
    checkActivation(dSaturn, 14, 2, 4, 3, 2, 'Design Saturn');

    const dUranus = profile.design[10];
    checkActivation(dUranus, 26, 1, 3, 3, 5, 'Design Uranus');

    const dNeptune = profile.design[11];
    checkActivation(dNeptune, 10, 6, 4, 2, 4, 'Design Neptune');

    const dPluto = profile.design[12];
    checkActivation(dPluto, 28, 2, 2, 4, 1, 'Design Pluto');
  });
});
