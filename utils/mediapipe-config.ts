/**
 * utils/mediapipe-config.ts
 *
 * Centralized MediaPipe configuration manager.
 * Handles device capability detection, FPS throttling, and video downsampling.
 * Designed for Sprint 3.3 integration — no MediaPipe runtime dependency here.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MediaPipeConfig {
  /** Inference backend. GPU preferred; CPU fallback for low-end devices. */
  delegate: 'GPU' | 'CPU';
  /** Maximum frames per second sent to the pose detector. */
  maxFps: number;
  /** Camera resolution fed into the model. Smaller = faster on low-end HW. */
  inputResolution: { width: number; height: number };
  /** Minimum score for a detection to be considered valid (0–1). */
  minDetectionConfidence: number;
  /** Minimum score to consider a tracked landmark still valid (0–1). */
  minTrackingConfidence: number;
}

// ---------------------------------------------------------------------------
// Preset configs
// ---------------------------------------------------------------------------

export const DEFAULT_CONFIG: MediaPipeConfig = {
  delegate: 'GPU',
  maxFps: 30,
  inputResolution: { width: 320, height: 240 },
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5,
};

export const LOW_END_CONFIG: MediaPipeConfig = {
  delegate: 'CPU',
  maxFps: 15,
  inputResolution: { width: 160, height: 120 },
  minDetectionConfidence: 0.4,
  minTrackingConfidence: 0.4,
};

export const BATTERY_SAVER_CONFIG: MediaPipeConfig = {
  delegate: 'CPU',
  maxFps: 10,
  inputResolution: { width: 160, height: 120 },
  minDetectionConfidence: 0.4,
  minTrackingConfidence: 0.4,
};

// ---------------------------------------------------------------------------
// Device capability detection
// ---------------------------------------------------------------------------

/**
 * Returns true when the device is likely unable to sustain 30fps GPU inference.
 * Heuristics (best-effort — browser APIs vary widely):
 *  1. Low CPU core count (< 4)
 *  2. Low RAM via navigator.deviceMemory (< 4 GB, if available)
 *  3. Weak GPU estimated via canvas fillRect benchmark (< 50 ops/ms)
 */
export function detectLowEndDevice(): boolean {
  // CPU core count
  if (typeof navigator !== 'undefined' && navigator.hardwareConcurrency < 4) {
    return true;
  }

  // Device memory (Chrome/Edge only — not in Firefox/Safari)
  const nav = navigator as Navigator & { deviceMemory?: number };
  if (typeof nav.deviceMemory === 'number' && nav.deviceMemory < 4) {
    return true;
  }

  // Rough GPU benchmark via canvas 2D fillRect throughput
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const start = performance.now();
      const ITERATIONS = 500;
      for (let i = 0; i < ITERATIONS; i++) {
        ctx.fillRect(0, 0, 256, 256);
      }
      const elapsed = performance.now() - start;
      const opsPerMs = ITERATIONS / elapsed;
      if (opsPerMs < 50) {
        return true;
      }
    }
  } catch {
    // Canvas may not be available in SSR/test environments
  }

  return false;
}

// ---------------------------------------------------------------------------
// Battery check
// ---------------------------------------------------------------------------

/** Returns true when battery is critically low (< 15 %) and discharging. */
export async function checkBatteryLevel(): Promise<boolean> {
  if (typeof navigator === 'undefined') return false;

  const nav = navigator as Navigator & {
    getBattery?: () => Promise<{
      level: number;
      charging: boolean;
    }>;
  };

  if (typeof nav.getBattery !== 'function') return false;

  try {
    const battery = await nav.getBattery();
    return !battery.charging && battery.level < 0.15;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Optimal config selector
// ---------------------------------------------------------------------------

/**
 * Returns the most appropriate MediaPipe config for the current device.
 * Checks hardware capabilities first, then battery state.
 */
export async function getOptimalConfig(): Promise<MediaPipeConfig> {
  const isLowEnd = detectLowEndDevice();
  if (isLowEnd) return LOW_END_CONFIG;

  const hasBatteryIssue = await checkBatteryLevel();
  if (hasBatteryIssue) return BATTERY_SAVER_CONFIG;

  return DEFAULT_CONFIG;
}

// ---------------------------------------------------------------------------
// Frame throttler
// ---------------------------------------------------------------------------

/**
 * Returns a wrapper that ensures `callback` is called at most `maxFps` times
 * per second. Thread-safe for use inside a requestAnimationFrame loop.
 *
 * @example
 * const throttle = createFrameThrottler(15);
 * function loop() {
 *   throttle(() => runMediaPipeInference());
 *   requestAnimationFrame(loop);
 * }
 */
export function createFrameThrottler(maxFps: number): (callback: () => void) => void {
  const intervalMs = 1000 / Math.max(1, maxFps);
  let lastCallTime = 0;

  return (callback: () => void): void => {
    const now = performance.now();
    if (now - lastCallTime >= intervalMs) {
      lastCallTime = now;
      callback();
    }
  };
}

// ---------------------------------------------------------------------------
// Video frame downsampler
// ---------------------------------------------------------------------------

/**
 * Draws the current video frame to an off-screen canvas and returns the pixel
 * data at the requested resolution.  Used to feed a low-resolution input to
 * MediaPipe while the visible <video> element stays full-resolution.
 *
 * @param video       Live HTMLVideoElement (must be playing).
 * @param targetWidth  Desired output width in px.
 * @param targetHeight Desired output height in px.
 * @returns ImageData at (targetWidth × targetHeight), or null if video is not ready.
 */
export function downsampleVideoFrame(
  video: HTMLVideoElement,
  targetWidth: number,
  targetHeight: number,
): ImageData | null {
  if (video.readyState < 2 /* HAVE_CURRENT_DATA */) return null;

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
  return ctx.getImageData(0, 0, targetWidth, targetHeight);
}
