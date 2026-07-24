import { describe, it, expect } from 'vitest';
import { analyzePixelData } from './image-triage';

// Helper: create RGBA pixel data for N pixels of a single color
function solidPixels(r: number, g: number, b: number, count: number): Uint8ClampedArray {
  const data = new Uint8ClampedArray(count * 4);
  for (let i = 0; i < count; i++) {
    data[i * 4] = r;
    data[i * 4 + 1] = g;
    data[i * 4 + 2] = b;
    data[i * 4 + 3] = 255;
  }
  return data;
}

// Helper: mix multiple colors by ratio
function mixedPixels(
  colors: Array<{ r: number; g: number; b: number; ratio: number }>,
  total = 100,
): Uint8ClampedArray {
  const data = new Uint8ClampedArray(total * 4);
  let offset = 0;
  for (const { r, g, b, ratio } of colors) {
    const count = Math.round(total * ratio);
    for (let i = 0; i < count && offset < total; i++, offset++) {
      data[offset * 4] = r;
      data[offset * 4 + 1] = g;
      data[offset * 4 + 2] = b;
      data[offset * 4 + 3] = 255;
    }
  }
  return data;
}

describe('image-triage analyzePixelData', () => {
  it('pure green → low severity (1)', () => {
    const data = solidPixels(0, 200, 0, 100); // H≈120
    const result = analyzePixelData(data, 100);
    expect(result.preliminarySeverity).toBe(1);
    expect(result.greenRatio).toBeGreaterThan(0.8);
    expect(result.yellowBrownRatio).toBeLessThan(0.1);
    expect(result.analysisMethod).toBe('color-histogram');
  });

  it('mostly brown → high severity (3)', () => {
    const data = solidPixels(139, 90, 43, 100); // H≈30 (brown)
    const result = analyzePixelData(data, 100);
    expect(result.preliminarySeverity).toBe(3);
    expect(result.yellowBrownRatio).toBeGreaterThan(0.5);
    expect(result.greenRatio).toBeLessThan(0.1);
  });

  it('mixed green and yellow → moderate severity (2)', () => {
    const data = mixedPixels([
      { r: 0, g: 180, b: 0, ratio: 0.6 },    // green H≈120
      { r: 180, g: 150, b: 30, ratio: 0.4 },  // yellow H≈48
    ], 100);
    const result = analyzePixelData(data, 100);
    expect(result.preliminarySeverity).toBe(2);
    expect(result.greenRatio).toBeGreaterThan(0.3);
    expect(result.yellowBrownRatio).toBeGreaterThan(0.2);
  });

  it('grey pixels are neither green nor yellow → severity 1', () => {
    const data = solidPixels(200, 200, 200, 100);
    const result = analyzePixelData(data, 100);
    expect(result.greenRatio).toBe(0);
    expect(result.yellowBrownRatio).toBe(0);
    expect(result.preliminarySeverity).toBe(1);
  });

  it('validates output shape', () => {
    const data = solidPixels(0, 150, 0, 10);
    const result = analyzePixelData(data, 10);
    expect(result).toHaveProperty('greenRatio');
    expect(result).toHaveProperty('yellowBrownRatio');
    expect(result).toHaveProperty('preliminarySeverity');
    expect(result.analysisMethod).toBe('color-histogram');
    expect(typeof result.greenRatio).toBe('number');
    expect(result.preliminarySeverity).toBeGreaterThanOrEqual(1);
    expect(result.preliminarySeverity).toBeLessThanOrEqual(3);
  });
});
