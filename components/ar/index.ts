// AR Components — barrel export

export { ModelViewer, VestimentaViewer } from './ModelViewer';
export { ARPointCard, ARPointsList, ARPointsMapPreview } from './ARPointCard';
export { default as OfflineStatusBar } from './OfflineStatusBar';
export { ARHomeView } from './ARHomeView';
export { ARPermissions } from './ARPermissions';

// Sprint 2.1 — Quests
export { QuestCard } from './QuestCard';
export { QuestListView } from './QuestListView';
export { QuestView } from './QuestView';

// Sprint 2.2 — Achievements + Profile + Leaderboard
export { AchievementCard } from './AchievementCard';
export { AchievementsView } from './AchievementsView';
export { ARLeaderboard } from './ARLeaderboard';
export { ARProfileView } from './ARProfileView';
export { AchievementToast } from './AchievementToast';

// Sprint 3.1 — Vestimentas Catalog + 3D Viewer
export { VestimentaCard } from './VestimentaCard';

// Sprint 3.3 — Try-On with MediaPipe
export { TryOnView } from './TryOnView';

// Sprint 4.1 — Offline Bundles + WiFi Zones
export { WiFiZonesView } from './WiFiZonesView';
export type { WiFiZone } from './WiFiZonesView';
export { OfflineBundleManager } from './OfflineBundleManager';

// Sprint G2 — User Safety + Audio-First
export { SafeModeOverlay } from './SafeModeOverlay';

// Sprint 3.4/3.5 — Tripo3D + QR Scanner
export { QRScanner } from './QRScanner';
export type { QRScannerProps } from './QRScanner';
