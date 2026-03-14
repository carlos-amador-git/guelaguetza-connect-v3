// AR Hooks — barrel export

export { useGeolocation } from './useGeolocation';
export { useNearbyPoints } from './useNearbyPoints';
export { useUserCollection } from './useUserCollection';
export { useUserProgress } from './useUserProgress';
export { useVestimentas } from './useVestimentas';
export { useFavorites } from './useFavorites';
export { useDeviceId } from './useDeviceId';
export { useOfflineAR } from './useOfflineAR';
export type { UseOfflineARResult } from './useOfflineAR';

// Sprint 2.1 — Quests
export { useQuests } from './useQuests';

// Sprint 2.2 — Achievements + Leaderboard
export { useAchievements } from './useAchievements';

// Sprint 3.2 — Crea tu Alebrije
export { useAlebrije } from './useAlebrije';
export type { UseAlebrijeReturn } from './useAlebrije';

// Sprint 4.2 — Analytics
export { useARAnalytics } from './useARAnalytics';
export type { UseARAnalyticsReturn, AREventType, ARAnalyticsEvent } from './useARAnalytics';

// Sprint G1 — Infrastructure
export { useBatteryStatus } from './useBatteryStatus';
export type { BatteryStatusResult } from './useBatteryStatus';

export { useDevicePerformance } from './useDevicePerformance';
export type { DevicePerformanceResult } from './useDevicePerformance';

// Sprint G2 — User Safety + Audio-First
export { useMotionDetection } from './useMotionDetection';
export { useAudioGuide } from './useAudioGuide';
