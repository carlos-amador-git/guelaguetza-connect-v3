/**
 * hooks/ar/useDevicePerformance.ts
 *
 * Monitors real-time device performance via a requestAnimationFrame loop.
 * Detects thermal throttling by watching sustained FPS drops.
 *
 * performanceLevel:
 *   'high'   → ≥ 50 fps
 *   'medium' → 20–49 fps
 *   'low'    → < 20 fps sustained for THROTTLE_WINDOW_MS
 *
 * shouldReduceQuality → true when level is 'low'
 */

import { useState, useEffect, useRef, useCallback } from 'react';

export interface DevicePerformanceResult {
  /** Estimated current rendering FPS (rolling average over last second). */
  fps: number;
  /** Coarse performance tier. */
  performanceLevel: 'high' | 'medium' | 'low';
  /**
   * True when FPS has been below 20 for at least THROTTLE_WINDOW_MS (5 s).
   * Signals the AR module to reduce texture/mesh quality.
   */
  shouldReduceQuality: boolean;
}

const FPS_HIGH_THRESHOLD = 50;
const FPS_LOW_THRESHOLD = 20;
/** How long FPS must stay below threshold before flagging thermal throttle (ms). */
const THROTTLE_WINDOW_MS = 5_000;
/** Rolling window for FPS samples (ms). */
const SAMPLE_WINDOW_MS = 1_000;

function classifyFps(fps: number): DevicePerformanceResult['performanceLevel'] {
  if (fps >= FPS_HIGH_THRESHOLD) return 'high';
  if (fps >= FPS_LOW_THRESHOLD) return 'medium';
  return 'low';
}

export function useDevicePerformance(): DevicePerformanceResult {
  const [fps, setFps] = useState<number>(60);
  const [performanceLevel, setPerformanceLevel] =
    useState<DevicePerformanceResult['performanceLevel']>('high');
  const [shouldReduceQuality, setShouldReduceQuality] = useState<boolean>(false);

  // Timestamps of recent frames within the rolling window
  const frameTimesRef = useRef<number[]>([]);
  // When we first observed FPS < threshold (for thermal window)
  const lowFpsStartRef = useRef<number | null>(null);
  const rafRef = useRef<number>(0);
  const mountedRef = useRef<boolean>(true);

  const tick = useCallback((timestamp: number) => {
    if (!mountedRef.current) return;

    // Record this frame
    frameTimesRef.current.push(timestamp);

    // Prune frames older than the sample window
    const cutoff = timestamp - SAMPLE_WINDOW_MS;
    frameTimesRef.current = frameTimesRef.current.filter((t) => t >= cutoff);

    const currentFps = frameTimesRef.current.length; // frames in last second

    setFps(currentFps);

    const level = classifyFps(currentFps);
    setPerformanceLevel(level);

    // Track sustained low-FPS window
    if (currentFps < FPS_LOW_THRESHOLD) {
      if (lowFpsStartRef.current === null) {
        lowFpsStartRef.current = timestamp;
      }
      const lowDuration = timestamp - lowFpsStartRef.current;
      if (lowDuration >= THROTTLE_WINDOW_MS) {
        setShouldReduceQuality(true);
      }
    } else {
      // FPS recovered — reset throttle window
      lowFpsStartRef.current = null;
      setShouldReduceQuality(false);
    }

    rafRef.current = requestAnimationFrame(tick);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      mountedRef.current = false;
      cancelAnimationFrame(rafRef.current);
    };
  }, [tick]);

  return { fps, performanceLevel, shouldReduceQuality };
}
