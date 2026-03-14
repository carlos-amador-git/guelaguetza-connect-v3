import { useState, useCallback, useRef, useEffect } from 'react';
import type { ARPoint } from '../../types/ar';
import {
  speak,
  stopSpeaking,
  hapticPulse,
  playAudioCue,
} from '../../services/ar-audio';

// ============================================================================
// HOOK: AUDIO GUIDE
// Integrates TTS + haptics with proximity to AR points.
// Sprint G2 — Audio-First Navigation
// ============================================================================

const ANNOUNCE_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes before re-announcing same point
const LS_KEY = 'ar_audio_guide_enabled';

interface UseAudioGuideOptions {
  enabled?: boolean;
  announceDistance?: number; // meters, default 100
  arrivalDistance?: number;  // meters, default 30
}

interface UseAudioGuideReturn {
  isEnabled: boolean;
  toggle: () => void;
  announcePoint: (point: ARPoint, distance: number) => void;
  announceArrival: (point: ARPoint) => void;
  announceCollection: (pointName: string, pointsEarned: number) => void;
  announceQuestProgress: (questName: string, current: number, total: number) => void;
}

// ============================================================================
// HELPERS
// ============================================================================

function loadPreference(): boolean {
  try {
    const raw = localStorage.getItem(LS_KEY);
    // Default true when not set
    return raw === null ? true : raw === 'true';
  } catch {
    return true;
  }
}

function savePreference(value: boolean): void {
  try {
    localStorage.setItem(LS_KEY, String(value));
  } catch {
    // ignore
  }
}

// ============================================================================
// HOOK
// ============================================================================

export function useAudioGuide(options: UseAudioGuideOptions = {}): UseAudioGuideReturn {
  const {
    announceDistance = 100,
    arrivalDistance = 30,
  } = options;

  // Initialise from localStorage; options.enabled overrides if explicitly set
  const [isEnabled, setIsEnabled] = useState<boolean>(() => {
    if (options.enabled !== undefined) return options.enabled;
    return loadPreference();
  });

  // Track last announcement time per point id to honour the 5-min cooldown
  const lastAnnouncedRef = useRef<Map<number, number>>(new Map());

  // Sync options.enabled changes from outside (if controlled externally)
  useEffect(() => {
    if (options.enabled !== undefined) {
      setIsEnabled(options.enabled);
    }
  }, [options.enabled]);

  // ── Toggle ───────────────────────────────────────────────────────────────

  const toggle = useCallback(() => {
    setIsEnabled((prev) => {
      const next = !prev;
      savePreference(next);
      if (!next) stopSpeaking();
      return next;
    });
  }, []);

  // ── Cooldown check ───────────────────────────────────────────────────────

  const canAnnounce = useCallback((pointId: number): boolean => {
    const last = lastAnnouncedRef.current.get(pointId);
    if (last === undefined) return true;
    return Date.now() - last >= ANNOUNCE_COOLDOWN_MS;
  }, []);

  const markAnnounced = useCallback((pointId: number) => {
    lastAnnouncedRef.current.set(pointId, Date.now());
  }, []);

  // ── API ──────────────────────────────────────────────────────────────────

  /**
   * Announce that a point is nearby (within announceDistance).
   * Only speaks once per ANNOUNCE_COOLDOWN_MS per point.
   */
  const announcePoint = useCallback(
    (point: ARPoint, distance: number) => {
      if (!isEnabled) return;
      if (distance > announceDistance) return;
      if (!canAnnounce(point.id)) return;

      markAnnounced(point.id);

      const distText = distance < 1000
        ? `${Math.round(distance)} metros`
        : `${(distance / 1000).toFixed(1)} kilómetros`;

      if (distance <= arrivalDistance) {
        // Within arrival range — stronger signal
        hapticPulse('approaching');
        speak(`Estás cerca de ${point.nombre}. Detente para explorar en AR`);
      } else {
        speak(`Punto cercano: ${point.nombre}, a ${distText}`);
      }
    },
    [isEnabled, announceDistance, arrivalDistance, canAnnounce, markAnnounced]
  );

  /**
   * Announce arrival at a point (within arrivalDistance).
   */
  const announceArrival = useCallback(
    (point: ARPoint) => {
      if (!isEnabled) return;
      hapticPulse('approaching');
      speak(`Estás cerca de ${point.nombre}. Detente para explorar en AR`);
    },
    [isEnabled]
  );

  /**
   * Announce successful collection of an AR point.
   */
  const announceCollection = useCallback(
    (pointName: string, pointsEarned: number) => {
      if (!isEnabled) return;
      hapticPulse('collected');
      playAudioCue('collect');
      speak(`Colectaste ${pointName}. Ganaste ${pointsEarned} puntos`);
    },
    [isEnabled]
  );

  /**
   * Announce quest progress.
   */
  const announceQuestProgress = useCallback(
    (questName: string, current: number, total: number) => {
      if (!isEnabled) return;
      if (current >= total) {
        hapticPulse('achievement');
        playAudioCue('achievement');
        speak(`¡Completaste la misión ${questName}!`);
      } else {
        speak(`Misión ${questName}: ${current} de ${total} completado`);
      }
    },
    [isEnabled]
  );

  return {
    isEnabled,
    toggle,
    announcePoint,
    announceArrival,
    announceCollection,
    announceQuestProgress,
  };
}
