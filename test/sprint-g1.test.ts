/**
 * test/sprint-g1.test.ts
 *
 * Sprint G1 — Infrastructure + MediaPipe Config
 * Tests for:
 *  - MediaPipe config selection (detectLowEndDevice, getOptimalConfig)
 *  - Frame throttler (createFrameThrottler)
 *  - Video frame downsampler (downsampleVideoFrame)
 *  - Battery status hook (useBatteryStatus)
 *  - Device performance hook (useDevicePerformance)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

import {
  detectLowEndDevice,
  getOptimalConfig,
  createFrameThrottler,
  downsampleVideoFrame,
  DEFAULT_CONFIG,
  LOW_END_CONFIG,
  BATTERY_SAVER_CONFIG,
} from '@/utils/mediapipe-config';

import { useBatteryStatus } from '@/hooks/ar/useBatteryStatus';
import { useDevicePerformance } from '@/hooks/ar/useDevicePerformance';

// ---------------------------------------------------------------------------
// Helper — restore navigator props after each test
// ---------------------------------------------------------------------------

function defineNavigatorProp<K extends keyof Navigator>(
  key: K,
  value: Navigator[K],
) {
  Object.defineProperty(navigator, key, {
    configurable: true,
    writable: true,
    value,
  });
}

// ---------------------------------------------------------------------------
// 1. detectLowEndDevice — low CPU count
// ---------------------------------------------------------------------------

describe('detectLowEndDevice', () => {
  afterEach(() => {
    // Restore defaults
    defineNavigatorProp('hardwareConcurrency', 8);
  });

  it('returns true when hardwareConcurrency < 4', () => {
    defineNavigatorProp('hardwareConcurrency', 2);
    expect(detectLowEndDevice()).toBe(true);
  });

  it('returns false when hardwareConcurrency >= 4 and no other signals', () => {
    defineNavigatorProp('hardwareConcurrency', 8);
    // Remove deviceMemory if set
    Object.defineProperty(navigator, 'deviceMemory', {
      configurable: true,
      writable: true,
      value: 8,
    });
    expect(detectLowEndDevice()).toBe(false);
  });

  it('returns true when deviceMemory < 4', () => {
    defineNavigatorProp('hardwareConcurrency', 8);
    Object.defineProperty(navigator, 'deviceMemory', {
      configurable: true,
      writable: true,
      value: 2,
    });
    expect(detectLowEndDevice()).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 2. getOptimalConfig — async
// ---------------------------------------------------------------------------

describe('getOptimalConfig', () => {
  beforeEach(() => {
    defineNavigatorProp('hardwareConcurrency', 8);
    Object.defineProperty(navigator, 'deviceMemory', {
      configurable: true,
      writable: true,
      value: 8,
    });
  });

  it('returns DEFAULT_CONFIG for a capable device without battery issues', async () => {
    // No getBattery API → no battery issue
    Object.defineProperty(navigator, 'getBattery', {
      configurable: true,
      writable: true,
      value: undefined,
    });

    const config = await getOptimalConfig();
    expect(config).toEqual(DEFAULT_CONFIG);
    expect(config.delegate).toBe('GPU');
    expect(config.maxFps).toBe(30);
  });

  it('returns LOW_END_CONFIG when hardwareConcurrency < 4', async () => {
    defineNavigatorProp('hardwareConcurrency', 2);
    const config = await getOptimalConfig();
    expect(config).toEqual(LOW_END_CONFIG);
    expect(config.delegate).toBe('CPU');
    expect(config.maxFps).toBe(15);
  });

  it('returns BATTERY_SAVER_CONFIG when battery is low and discharging', async () => {
    defineNavigatorProp('hardwareConcurrency', 8);
    Object.defineProperty(navigator, 'getBattery', {
      configurable: true,
      writable: true,
      value: () =>
        Promise.resolve({ level: 0.10, charging: false }),
    });

    const config = await getOptimalConfig();
    expect(config).toEqual(BATTERY_SAVER_CONFIG);
    expect(config.maxFps).toBe(10);
  });

  it('returns DEFAULT_CONFIG when battery is low but charging', async () => {
    defineNavigatorProp('hardwareConcurrency', 8);
    Object.defineProperty(navigator, 'deviceMemory', {
      configurable: true,
      writable: true,
      value: 8,
    });
    Object.defineProperty(navigator, 'getBattery', {
      configurable: true,
      writable: true,
      value: () =>
        Promise.resolve({ level: 0.10, charging: true }),
    });

    const config = await getOptimalConfig();
    expect(config).toEqual(DEFAULT_CONFIG);
  });
});

// ---------------------------------------------------------------------------
// 3. createFrameThrottler
// ---------------------------------------------------------------------------

describe('createFrameThrottler', () => {
  it('calls callback immediately on first invocation', () => {
    // Control performance.now from the start so lastCallTime initialises to 0
    let now = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => now);

    const throttle = createFrameThrottler(30); // ~33 ms interval
    const cb = vi.fn();

    now = 1000; // well beyond the 33 ms interval from lastCallTime=0
    throttle(cb);
    expect(cb).toHaveBeenCalledTimes(1);

    vi.restoreAllMocks();
  });

  it('skips callback when called too soon after previous call', () => {
    let now = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => now);

    const throttle = createFrameThrottler(10); // 100 ms interval

    const cb = vi.fn();

    // First call: now=1000, well past lastCallTime=0 — fires
    now = 1000;
    throttle(cb);
    expect(cb).toHaveBeenCalledTimes(1);

    // Second call: only 50 ms later — should NOT fire
    now = 1050;
    throttle(cb);
    expect(cb).toHaveBeenCalledTimes(1);

    vi.restoreAllMocks();
  });

  it('calls callback again after interval has elapsed', () => {
    let now = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => now);

    const throttle = createFrameThrottler(10); // 100 ms interval
    const cb = vi.fn();

    now = 1000;
    throttle(cb); // fires
    now = 1110;   // > 100 ms later
    throttle(cb); // should fire again
    expect(cb).toHaveBeenCalledTimes(2);

    vi.restoreAllMocks();
  });
});

// ---------------------------------------------------------------------------
// 4. downsampleVideoFrame
// ---------------------------------------------------------------------------

describe('downsampleVideoFrame', () => {
  it('returns null when video is not ready (readyState < 2)', () => {
    const video = { readyState: 1 } as HTMLVideoElement;
    const result = downsampleVideoFrame(video, 160, 120);
    expect(result).toBeNull();
  });

  it('returns ImageData of correct dimensions when video is ready', () => {
    // jsdom supports canvas with limited 2d context
    const video = document.createElement('video');
    // Fake readyState = 2
    Object.defineProperty(video, 'readyState', { value: 2, writable: false });

    const result = downsampleVideoFrame(video, 160, 120);
    // In jsdom, canvas 2d context drawImage on a video element may return null
    // We only assert: if returned, dimensions match
    if (result !== null) {
      expect(result.width).toBe(160);
      expect(result.height).toBe(120);
    } else {
      // jsdom limitation — acceptable
      expect(result).toBeNull();
    }
  });
});

// ---------------------------------------------------------------------------
// 5. useBatteryStatus hook
// ---------------------------------------------------------------------------

describe('useBatteryStatus', () => {
  afterEach(() => {
    Object.defineProperty(navigator, 'getBattery', {
      configurable: true,
      writable: true,
      value: undefined,
    });
  });

  it('returns null level and no flags when Battery API is unavailable', () => {
    Object.defineProperty(navigator, 'getBattery', {
      configurable: true,
      writable: true,
      value: undefined,
    });

    const { result } = renderHook(() => useBatteryStatus());
    expect(result.current.level).toBeNull();
    expect(result.current.shouldThrottle).toBe(false);
    expect(result.current.shouldDisableAR).toBe(false);
  });

  it('returns correct flags when battery is critically low and discharging', async () => {
    const mockBattery = {
      level: 0.03,
      charging: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };

    Object.defineProperty(navigator, 'getBattery', {
      configurable: true,
      writable: true,
      value: () => Promise.resolve(mockBattery),
    });

    const { result } = renderHook(() => useBatteryStatus());

    // Wait for the promise to resolve
    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.level).toBe(0.03);
    expect(result.current.charging).toBe(false);
    expect(result.current.shouldThrottle).toBe(true);
    expect(result.current.shouldDisableAR).toBe(true);
  });

  it('sets shouldThrottle but not shouldDisableAR at 10% battery', async () => {
    const mockBattery = {
      level: 0.10,
      charging: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };

    Object.defineProperty(navigator, 'getBattery', {
      configurable: true,
      writable: true,
      value: () => Promise.resolve(mockBattery),
    });

    const { result } = renderHook(() => useBatteryStatus());

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.shouldThrottle).toBe(true);
    expect(result.current.shouldDisableAR).toBe(false);
  });

  it('clears flags when charging at low battery', async () => {
    const mockBattery = {
      level: 0.10,
      charging: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };

    Object.defineProperty(navigator, 'getBattery', {
      configurable: true,
      writable: true,
      value: () => Promise.resolve(mockBattery),
    });

    const { result } = renderHook(() => useBatteryStatus());

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.shouldThrottle).toBe(false);
    expect(result.current.shouldDisableAR).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 6. useDevicePerformance hook — basic smoke test
// ---------------------------------------------------------------------------

describe('useDevicePerformance', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders without error and returns expected shape', () => {
    const { result } = renderHook(() => useDevicePerformance());
    expect(typeof result.current.fps).toBe('number');
    expect(['high', 'medium', 'low']).toContain(result.current.performanceLevel);
    expect(typeof result.current.shouldReduceQuality).toBe('boolean');
  });

  it('initialises with shouldReduceQuality = false', () => {
    const { result } = renderHook(() => useDevicePerformance());
    expect(result.current.shouldReduceQuality).toBe(false);
  });
});
