import Tesseract from 'tesseract.js';

interface VisionResult {
  text: string;
  error?: string;
}

let stream: MediaStream | null = null;
let captureInterval: number | null = null;
const FRAME_RATE = 1; // 1 FPS is enough for OCR

export const visionService = {
  startScreenCapture: async (): Promise<MediaStream | null> => {
    try {
      // Browser standard
      // Fix: Added 'as any' cast to bypass strict TS check for non-standard constraints like 'cursor'
      stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: 'monitor',
          cursor: 'always'
        } as any,
        audio: false
      });
      return stream;
    } catch (err) {
      console.error("Error starting screen capture:", err);
      // Fallback for Electron if navigator.mediaDevices is blocked/different
      const electron = (window as any).electron;
      if (electron) {
        try {
          // Assuming an IPC handler for desktopCapturer exists in Electron version
          const sourceId = await electron.invoke('system:get-screen-source');
          if (sourceId) {
            stream = await navigator.mediaDevices.getUserMedia({
              audio: false,
              video: {
                mandatory: {
                  chromeMediaSource: 'desktop',
                  chromeMediaSourceId: sourceId,
                }
              }
            } as any);
            return stream;
          }
        } catch (e) {
          console.error("Electron capture failed", e);
        }
      }
      return null;
    }
  },

  stopScreenCapture: () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      stream = null;
    }
    if (captureInterval) {
      clearInterval(captureInterval);
      captureInterval = null;
    }
  },

  performOCR: async (video: HTMLVideoElement): Promise<VisionResult> => {
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return { text: '', error: 'Canvas context failed' };

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    try {
      const { data: { text } } = await Tesseract.recognize(canvas, 'eng');
      return { text };
    } catch (err) {
      return { text: '', error: (err as Error).message };
    }
  }
};