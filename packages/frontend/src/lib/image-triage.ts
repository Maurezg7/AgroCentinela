import { TriageResultSchema, type TriageResult } from '@agrocentinela/shared';

// HSL thresholds for classification
const GREEN_H_MIN = 80;
const GREEN_H_MAX = 160;
const GREEN_S_MIN = 20;
const GREEN_L_MIN = 15;
const GREEN_L_MAX = 80;

const YELLOW_BROWN_H_MIN = 20;
const YELLOW_BROWN_H_MAX = 80;
const YELLOW_BROWN_S_MIN = 15;

/**
 * Analyze a canvas image by color histogram.
 * Returns TriageResult with green vs yellow/brown ratio.
 */
export function analyzeImageTriage(canvas: HTMLCanvasElement): TriageResult {
  const ctx = canvas.getContext('2d')!;
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  return analyzePixelData(imageData.data, canvas.width * canvas.height);
}

/**
 * Core analysis on raw RGBA pixel data. Exported for testing.
 */
export function analyzePixelData(data: Uint8ClampedArray, totalPixels: number): TriageResult {
  let greenCount = 0;
  let yellowBrownCount = 0;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const [h, s, l] = rgbToHsl(r, g, b);

    if (h >= GREEN_H_MIN && h <= GREEN_H_MAX && s >= GREEN_S_MIN && l >= GREEN_L_MIN && l <= GREEN_L_MAX) {
      greenCount++;
    } else if (h >= YELLOW_BROWN_H_MIN && h <= YELLOW_BROWN_H_MAX && s >= YELLOW_BROWN_S_MIN) {
      yellowBrownCount++;
    }
  }

  const greenRatio = greenCount / totalPixels;
  const yellowBrownRatio = yellowBrownCount / totalPixels;

  let preliminarySeverity: 1 | 2 | 3;
  if (yellowBrownRatio > 0.5) preliminarySeverity = 3;
  else if (yellowBrownRatio > 0.2) preliminarySeverity = 2;
  else preliminarySeverity = 1;

  const result: TriageResult = {
    greenRatio: Math.round(greenRatio * 1000) / 1000,
    yellowBrownRatio: Math.round(yellowBrownRatio * 1000) / 1000,
    preliminarySeverity,
    analysisMethod: 'color-histogram',
  };

  return TriageResultSchema.parse(result);
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  if (max === min) return [0, 0, l * 100];

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
  else if (max === g) h = ((b - r) / d + 2) * 60;
  else h = ((r - g) / d + 4) * 60;

  return [h, s * 100, l * 100];
}
