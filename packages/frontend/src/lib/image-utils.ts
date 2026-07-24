const MAX_DIMENSION = 1024;
const JPEG_QUALITY = 0.7;

/**
 * Resize a canvas to max 1024px on its longest side and export as JPEG blob.
 */
export function resizeAndExport(source: HTMLCanvasElement): Promise<Blob> {
  const { width, height } = source;
  const scale = Math.min(1, MAX_DIMENSION / Math.max(width, height));
  const targetW = Math.round(width * scale);
  const targetH = Math.round(height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(source, 0, 0, targetW, targetH);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('toBlob failed'))),
      'image/jpeg',
      JPEG_QUALITY,
    );
  });
}

/**
 * Load a File/Blob into a canvas for processing.
 */
export function fileToCanvas(file: Blob): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(img.src);
      resolve(canvas);
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
}
