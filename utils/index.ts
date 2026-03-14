// utils — barrel export

export * from './accessibility';
export * from './haptics';

// Sprint G1 — MediaPipe configuration + device utilities
export {
  DEFAULT_CONFIG,
  LOW_END_CONFIG,
  BATTERY_SAVER_CONFIG,
  detectLowEndDevice,
  checkBatteryLevel,
  getOptimalConfig,
  createFrameThrottler,
  downsampleVideoFrame,
} from './mediapipe-config';

export type { MediaPipeConfig } from './mediapipe-config';
