import { useState, useEffect, useRef, useCallback } from 'react';

// ============================================================================
// HOOK: MOTION DETECTION
// Detects if the user is walking via DeviceMotionEvent (accelerometer).
// Sprint G2 — User Safety UX
// ============================================================================

interface UseMotionDetectionReturn {
  isWalking: boolean;
  isStationary: boolean;
  motionIntensity: number; // 0-1 scale
  permissionGranted: boolean;
}

// Tuning constants
const LOW_PASS_ALPHA = 0.1;          // smoothing factor (0=no update, 1=no filter)
const WALKING_VARIANCE_THRESHOLD = 0.8; // m/s² variance → walking
const STATIONARY_VARIANCE_THRESHOLD = 0.2; // m/s² variance → stationary
const WALKING_CONFIRM_MS = 1000;     // sustain walking signal for 1 s before flagging
const STATIONARY_CONFIRM_MS = 2000;  // sustain stationary signal for 2 s before flagging
const SAMPLE_WINDOW = 20;            // samples kept in sliding window

// ============================================================================
// HELPERS
// ============================================================================

function magnitude(x: number, y: number, z: number): number {
  return Math.sqrt(x * x + y * y + z * z);
}

function variance(samples: number[]): number {
  if (samples.length === 0) return 0;
  const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
  const sq = samples.map((v) => (v - mean) ** 2);
  return sq.reduce((a, b) => a + b, 0) / sq.length;
}

// ============================================================================
// HOOK
// ============================================================================

export function useMotionDetection(): UseMotionDetectionReturn {
  const [isWalking, setIsWalking] = useState(false);
  const [isStationary, setIsStationary] = useState(true);
  const [motionIntensity, setMotionIntensity] = useState(0);
  const [permissionGranted, setPermissionGranted] = useState(false);

  // Low-pass filtered acceleration magnitude
  const filteredMagRef = useRef(0);
  // Sliding window of filtered magnitudes
  const samplesRef = useRef<number[]>([]);

  // Debounce timers for state transitions
  const walkingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stationaryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Candidate state (not yet confirmed)
  const walkingCandidateRef = useRef(false);
  const stationaryCandidateRef = useRef(true);

  const handleMotion = useCallback((event: DeviceMotionEvent) => {
    const accel = event.accelerationIncludingGravity;
    if (!accel || accel.x == null || accel.y == null || accel.z == null) return;

    const rawMag = magnitude(accel.x ?? 0, accel.y ?? 0, accel.z ?? 0);

    // Apply low-pass filter
    filteredMagRef.current =
      LOW_PASS_ALPHA * rawMag + (1 - LOW_PASS_ALPHA) * filteredMagRef.current;

    const mag = filteredMagRef.current;

    // Maintain sliding window
    const samples = samplesRef.current;
    samples.push(mag);
    if (samples.length > SAMPLE_WINDOW) {
      samples.shift();
    }

    const currentVariance = variance(samples);

    // Clamp intensity to 0–1 using walking threshold as ceiling
    const intensity = Math.min(1, currentVariance / (WALKING_VARIANCE_THRESHOLD * 2));
    setMotionIntensity(intensity);

    const looksLikeWalking = currentVariance >= WALKING_VARIANCE_THRESHOLD;
    const looksLikeStationary = currentVariance < STATIONARY_VARIANCE_THRESHOLD;

    // ── Walking detection with debounce ──────────────────────────────────
    if (looksLikeWalking && !walkingCandidateRef.current) {
      walkingCandidateRef.current = true;

      if (walkingTimerRef.current) clearTimeout(walkingTimerRef.current);
      walkingTimerRef.current = setTimeout(() => {
        if (walkingCandidateRef.current) {
          setIsWalking(true);
          setIsStationary(false);
          stationaryCandidateRef.current = false;
          if (stationaryTimerRef.current) clearTimeout(stationaryTimerRef.current);
        }
      }, WALKING_CONFIRM_MS);
    } else if (!looksLikeWalking && walkingCandidateRef.current) {
      walkingCandidateRef.current = false;
      if (walkingTimerRef.current) {
        clearTimeout(walkingTimerRef.current);
        walkingTimerRef.current = null;
      }
    }

    // ── Stationary detection with debounce ────────────────────────────────
    if (looksLikeStationary && !stationaryCandidateRef.current) {
      stationaryCandidateRef.current = true;

      if (stationaryTimerRef.current) clearTimeout(stationaryTimerRef.current);
      stationaryTimerRef.current = setTimeout(() => {
        if (stationaryCandidateRef.current) {
          setIsStationary(true);
          setIsWalking(false);
          walkingCandidateRef.current = false;
          if (walkingTimerRef.current) clearTimeout(walkingTimerRef.current);
        }
      }, STATIONARY_CONFIRM_MS);
    } else if (!looksLikeStationary && stationaryCandidateRef.current) {
      stationaryCandidateRef.current = false;
      if (stationaryTimerRef.current) {
        clearTimeout(stationaryTimerRef.current);
        stationaryTimerRef.current = null;
      }
    }
  }, []);

  useEffect(() => {
    let active = true;

    async function startListening() {
      // iOS 13+ requires explicit permission
      if (
        typeof DeviceMotionEvent !== 'undefined' &&
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        typeof (DeviceMotionEvent as any).requestPermission === 'function'
      ) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const result = await (DeviceMotionEvent as any).requestPermission();
          if (!active) return;
          if (result === 'granted') {
            setPermissionGranted(true);
            window.addEventListener('devicemotion', handleMotion);
          }
        } catch {
          // Permission denied or not available — fail silently
        }
        return;
      }

      // Non-iOS or older browsers — add listener directly
      if (typeof DeviceMotionEvent !== 'undefined') {
        setPermissionGranted(true);
        window.addEventListener('devicemotion', handleMotion);
      }
    }

    startListening();

    return () => {
      active = false;
      window.removeEventListener('devicemotion', handleMotion);
      if (walkingTimerRef.current) clearTimeout(walkingTimerRef.current);
      if (stationaryTimerRef.current) clearTimeout(stationaryTimerRef.current);
    };
  }, [handleMotion]);

  return { isWalking, isStationary, motionIntensity, permissionGranted };
}
