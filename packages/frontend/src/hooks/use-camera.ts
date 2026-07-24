import { useState, useRef, useCallback } from 'react';

export type CameraStatus = 'idle' | 'active' | 'denied' | 'error';

export function useCamera() {
  const [status, setStatus] = useState<CameraStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const start = useCallback(async (video: HTMLVideoElement) => {
    videoRef.current = video;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      video.srcObject = stream;
      await video.play();
      setStatus('active');
    } catch (err) {
      const e = err as DOMException;
      if (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError') {
        setStatus('denied');
        setError('Permiso de cámara denegado');
      } else {
        setStatus('error');
        setError('No se pudo acceder a la cámara');
      }
    }
  }, []);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setStatus('idle');
  }, []);

  const capture = useCallback((): HTMLCanvasElement | null => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return null;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(video, 0, 0);
    return canvas;
  }, []);

  return { status, error, start, stop, capture };
}
