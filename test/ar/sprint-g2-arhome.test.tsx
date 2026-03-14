/**
 * Sprint G2 — ARHomeView SafeModeOverlay + Audio Guide Integration Tests
 * Kept separate so vi.mock() hoisting doesn't affect the hook/service unit tests.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '../test-utils';

// ============================================================================
// MODULE MOCKS — hoisted by vitest
// ============================================================================

vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="leaflet-map-container">{children}</div>
  ),
  TileLayer: () => <div />,
  CircleMarker: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  Marker: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  Popup: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  useMap: () => ({ flyTo: vi.fn(), setView: vi.fn() }),
}));

vi.mock('leaflet', () => ({
  default: { divIcon: vi.fn(() => ({})), icon: vi.fn(() => ({})) },
  divIcon: vi.fn(() => ({})),
}));

vi.mock('leaflet/dist/leaflet.css', () => ({}));

vi.mock('../../hooks/ar/useGeolocation', () => ({
  useGeolocation: vi.fn(() => ({
    position: null, error: null, isWatching: false, isLoading: false,
    startWatching: vi.fn(), stopWatching: vi.fn(), getCurrentPosition: vi.fn(),
  })),
}));

vi.mock('../../hooks/ar/useNearbyPoints', () => ({
  useNearbyPoints: vi.fn(() => ({
    points: [], count: 0, error: null, isLoading: false, refresh: vi.fn(),
  })),
}));

vi.mock('../../hooks/ar/useUserCollection', () => ({
  useUserCollection: vi.fn(() => ({
    collected: [], totalPoints: 0, count: 0,
    collectedIds: new Set<number>(),
    isLoading: false, error: null,
    collectPoint: vi.fn(), refresh: vi.fn(),
  })),
}));

vi.mock('../../hooks/ar/useDeviceId', () => ({
  useDeviceId: vi.fn(() => 'test-device-id'),
}));

vi.mock('../../components/ar/ARPermissions', () => ({
  ARPermissions: ({ onReady }: { onReady: (granted: boolean) => void }) => (
    <div data-testid="ar-permissions-overlay">
      <button data-testid="grant-location" onClick={() => onReady(true)}>Activar</button>
    </div>
  ),
}));

vi.mock('../../hooks/ar/useMotionDetection', () => ({
  useMotionDetection: vi.fn(() => ({
    isWalking: false,
    isStationary: true,
    motionIntensity: 0,
    permissionGranted: false,
  })),
}));

vi.mock('../../hooks/ar/useAudioGuide', () => ({
  useAudioGuide: vi.fn(() => ({
    isEnabled: true,
    toggle: vi.fn(),
    announcePoint: vi.fn(),
    announceArrival: vi.fn(),
    announceCollection: vi.fn(),
    announceQuestProgress: vi.fn(),
  })),
}));

// ============================================================================
// IMPORTS
// ============================================================================

import { ARHomeView } from '../../components/ar/ARHomeView';
import * as motionModule from '../../hooks/ar/useMotionDetection';

// ============================================================================
// HELPERS
// ============================================================================

function grantLocation(container: HTMLElement) {
  const btn = container.querySelector('[data-testid="grant-location"]') as HTMLButtonElement | null;
  if (btn) fireEvent.click(btn);
}

const onNavigate = vi.fn();
const onBack = vi.fn();

function renderARHome() {
  return render(<ARHomeView onNavigate={onNavigate} onBack={onBack} />);
}

// ============================================================================
// TESTS
// ============================================================================

describe('ARHomeView — SafeModeOverlay integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(motionModule.useMotionDetection).mockReturnValue({
      isWalking: false,
      isStationary: true,
      motionIntensity: 0,
      permissionGranted: false,
    });
  });

  it('renders ar-home-view after granting location', () => {
    const { container } = renderARHome();
    grantLocation(container);
    expect(screen.getByTestId('ar-home-view')).toBeInTheDocument();
  });

  it('SafeModeOverlay wrapper is always present in the DOM', () => {
    const { container } = renderARHome();
    grantLocation(container);
    expect(screen.getByTestId('safe-mode-overlay-wrapper')).toBeInTheDocument();
  });

  it('SafeModeOverlay is inactive (opacity-0) when user is not walking', () => {
    const { container } = renderARHome();
    grantLocation(container);
    expect(screen.getByTestId('safe-mode-overlay')).toHaveClass('opacity-0');
  });

  it('SafeModeOverlay is active (opacity-100) when user is walking', () => {
    vi.mocked(motionModule.useMotionDetection).mockReturnValue({
      isWalking: true,
      isStationary: false,
      motionIntensity: 0.8,
      permissionGranted: true,
    });

    const { container } = renderARHome();
    grantLocation(container);
    expect(screen.getByTestId('safe-mode-overlay')).toHaveClass('opacity-100');
  });

  it('SafeModeOverlay shows "Modo Seguro Activado" when walking', () => {
    vi.mocked(motionModule.useMotionDetection).mockReturnValue({
      isWalking: true,
      isStationary: false,
      motionIntensity: 0.8,
      permissionGranted: true,
    });

    const { container } = renderARHome();
    grantLocation(container);
    expect(screen.getByText('Modo Seguro Activado')).toBeInTheDocument();
  });

  it('audio guide toggle button is present in header', () => {
    const { container } = renderARHome();
    grantLocation(container);
    expect(screen.getByTestId('audio-guide-toggle')).toBeInTheDocument();
  });

  it('audio guide toggle has aria-pressed reflecting enabled state', () => {
    const { container } = renderARHome();
    grantLocation(container);
    const btn = screen.getByTestId('audio-guide-toggle');
    // useAudioGuide mock returns isEnabled: true
    expect(btn).toHaveAttribute('aria-pressed', 'true');
  });

  it('SafeModeOverlay dismiss button dismisses overlay when walking', async () => {
    vi.mocked(motionModule.useMotionDetection).mockReturnValue({
      isWalking: true,
      isStationary: false,
      motionIntensity: 0.8,
      permissionGranted: true,
    });

    const { container } = renderARHome();
    grantLocation(container);

    expect(screen.getByTestId('safe-mode-overlay')).toHaveClass('opacity-100');

    fireEvent.click(screen.getByTestId('safe-mode-dismiss-btn'));

    await waitFor(() => {
      expect(screen.getByTestId('safe-mode-overlay')).toHaveClass('opacity-0');
    });
  });

  it('clicking onBack fires the onBack callback', () => {
    const { container } = renderARHome();
    grantLocation(container);
    fireEvent.click(screen.getByRole('button', { name: /volver/i }));
    expect(onBack).toHaveBeenCalledOnce();
  });
});
