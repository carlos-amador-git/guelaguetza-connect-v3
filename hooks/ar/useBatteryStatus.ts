/**
 * hooks/ar/useBatteryStatus.ts
 *
 * Monitors device battery level via the Battery Status API.
 * Falls back gracefully when the API is not available (Firefox, Safari, iOS).
 *
 * shouldThrottle  → true when level < 0.15 and not charging (warn user)
 * shouldDisableAR → true when level < 0.05 (stop AR to prevent shutdown)
 */

import { useState, useEffect } from 'react';

export interface BatteryStatusResult {
  /** Current battery level (0–1), or null if API not supported. */
  level: number | null;
  /** Whether the device is currently plugged in. */
  charging: boolean;
  /**
   * True when battery is low (< 15 %) and discharging.
   * The AR module should reduce frame rate / quality.
   */
  shouldThrottle: boolean;
  /**
   * True when battery is critically low (< 5 %) and discharging.
   * The AR module should be disabled entirely.
   */
  shouldDisableAR: boolean;
}

// Browser Battery interface (not yet in lib.dom.d.ts in all TS versions)
interface BatteryManager extends EventTarget {
  charging: boolean;
  chargingTime: number;
  dischargingTime: number;
  level: number;
  onchargingchange: ((this: BatteryManager, ev: Event) => void) | null;
  onchargingtimechange: ((this: BatteryManager, ev: Event) => void) | null;
  ondischargingtimechange: ((this: BatteryManager, ev: Event) => void) | null;
  onlevelchange: ((this: BatteryManager, ev: Event) => void) | null;
}

type NavigatorWithBattery = Navigator & {
  getBattery?: () => Promise<BatteryManager>;
};

const THROTTLE_THRESHOLD = 0.15;
const DISABLE_THRESHOLD = 0.05;

function computeFlags(level: number | null, charging: boolean) {
  if (level === null) return { shouldThrottle: false, shouldDisableAR: false };
  return {
    shouldThrottle: !charging && level < THROTTLE_THRESHOLD,
    shouldDisableAR: !charging && level < DISABLE_THRESHOLD,
  };
}

export function useBatteryStatus(): BatteryStatusResult {
  const [level, setLevel] = useState<number | null>(null);
  const [charging, setCharging] = useState<boolean>(false);

  useEffect(() => {
    const nav = navigator as NavigatorWithBattery;

    if (typeof nav.getBattery !== 'function') {
      // API not supported — return null level, no throttling
      return;
    }

    let battery: BatteryManager | null = null;
    let cancelled = false;

    const handleLevelChange = () => {
      if (battery && !cancelled) setLevel(battery.level);
    };

    const handleChargingChange = () => {
      if (battery && !cancelled) setCharging(battery.charging);
    };

    nav
      .getBattery()
      .then((b) => {
        if (cancelled) return;
        battery = b;

        // Sync initial state
        setLevel(b.level);
        setCharging(b.charging);

        // Subscribe to changes
        b.addEventListener('levelchange', handleLevelChange);
        b.addEventListener('chargingchange', handleChargingChange);
      })
      .catch(() => {
        // getBattery() rejected — treat as unsupported
      });

    return () => {
      cancelled = true;
      if (battery) {
        battery.removeEventListener('levelchange', handleLevelChange);
        battery.removeEventListener('chargingchange', handleChargingChange);
      }
    };
  }, []);

  const { shouldThrottle, shouldDisableAR } = computeFlags(level, charging);

  return { level, charging, shouldThrottle, shouldDisableAR };
}
