/**
 * Sprint G2 — User Safety UX + Audio-First
 * Tests for:
 *   - useMotionDetection hook
 *   - SafeModeOverlay component
 *   - ar-audio service (speak, stop, hapticPulse, playAudioCue)
 *   - useAudioGuide hook
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '../test-utils';
import { renderHook } from '@testing-library/react';
import { act } from 'react';

// ============================================================================
// MOCK SpeechSynthesisUtterance globally
// ============================================================================

const speakMock = vi.fn();
const cancelMock = vi.fn();
const speakingMock = vi.fn().mockReturnValue(false);

class MockSpeechSynthesisUtterance {
  text: string;
  lang = 'es-MX';
  rate = 0.9;
  pitch = 1;
  volume = 0.8;
  constructor(text: string) { this.text = text; }
}
vi.stubGlobal('SpeechSynthesisUtterance', MockSpeechSynthesisUtterance);

Object.defineProperty(window, 'speechSynthesis', {
  configurable: true,
  writable: true,
  value: {
    cancel: cancelMock,
    speak: speakMock,
    get speaking() { return speakingMock(); },
  },
});

// Vibration API
const vibrateMock = vi.fn();
Object.defineProperty(navigator, 'vibrate', {
  configurable: true,
  writable: true,
  value: vibrateMock,
});

// AudioContext mock
class MockOscillator {
  type = 'sine';
  frequency = { setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() };
  connect = vi.fn();
  start = vi.fn();
  stop = vi.fn();
}
class MockGain {
  gain = { setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() };
  connect = vi.fn();
}
class MockAudioContext {
  state = 'running';
  currentTime = 0;
  destination = {};
  createOscillator() { return new MockOscillator(); }
  createGain() { return new MockGain(); }
  resume() { return Promise.resolve(); }
}
vi.stubGlobal('AudioContext', MockAudioContext);

// ============================================================================
// IMPORTS (after globals are stubbed)
// ============================================================================

import { useMotionDetection } from '../../hooks/ar/useMotionDetection';
import { SafeModeOverlay } from '../../components/ar/SafeModeOverlay';
import * as arAudio from '../../services/ar-audio';
import { useAudioGuide } from '../../hooks/ar/useAudioGuide';

// ============================================================================
// 1. MOTION DETECTION HOOK
// ============================================================================

describe('useMotionDetection', () => {
  let addSpy: ReturnType<typeof vi.spyOn>;
  let removeSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    addSpy = vi.spyOn(window, 'addEventListener');
    removeSpy = vi.spyOn(window, 'removeEventListener');
  });

  afterEach(() => {
    addSpy.mockRestore();
    removeSpy.mockRestore();
  });

  it('returns initial stationary state (not walking)', () => {
    const { result } = renderHook(() => useMotionDetection());
    expect(result.current.isWalking).toBe(false);
    expect(result.current.isStationary).toBe(true);
  });

  it('motionIntensity starts at 0', () => {
    const { result } = renderHook(() => useMotionDetection());
    expect(result.current.motionIntensity).toBe(0);
  });

  it('adds a devicemotion event listener on mount', async () => {
    renderHook(() => useMotionDetection());
    // startListening is async — flush the microtask queue
    await act(async () => {
      await Promise.resolve();
    });
    const listenerNames = addSpy.mock.calls.map((c) => c[0]);
    expect(listenerNames).toContain('devicemotion');
  });

  it('removes the devicemotion event listener on unmount', async () => {
    const { unmount } = renderHook(() => useMotionDetection());
    await act(async () => { await Promise.resolve(); });
    unmount();
    const listenerNames = removeSpy.mock.calls.map((c) => c[0]);
    expect(listenerNames).toContain('devicemotion');
  });

  it('isWalking is false and isStationary is true initially', () => {
    const { result } = renderHook(() => useMotionDetection());
    // Sanity check on the initial state shape
    expect(result.current).toHaveProperty('isWalking', false);
    expect(result.current).toHaveProperty('isStationary', true);
    expect(result.current).toHaveProperty('motionIntensity');
    expect(result.current).toHaveProperty('permissionGranted');
  });
});

// ============================================================================
// 2. SAFE MODE OVERLAY
// ============================================================================

describe('SafeModeOverlay', () => {
  it('renders wrapper element always', () => {
    render(
      <SafeModeOverlay isActive={false}>
        <div data-testid="child" />
      </SafeModeOverlay>
    );
    expect(screen.getByTestId('safe-mode-overlay-wrapper')).toBeInTheDocument();
  });

  it('renders children regardless of isActive', () => {
    render(
      <SafeModeOverlay isActive={false}>
        <div data-testid="child-content">Camera View</div>
      </SafeModeOverlay>
    );
    expect(screen.getByTestId('child-content')).toBeInTheDocument();
  });

  it('overlay is invisible (opacity-0) when isActive is false', () => {
    render(<SafeModeOverlay isActive={false} />);
    const overlay = screen.getByTestId('safe-mode-overlay');
    expect(overlay).toHaveClass('opacity-0');
    expect(overlay).toHaveClass('pointer-events-none');
  });

  it('overlay is visible (opacity-100) when isActive is true', () => {
    render(<SafeModeOverlay isActive={true} />);
    const overlay = screen.getByTestId('safe-mode-overlay');
    expect(overlay).toHaveClass('opacity-100');
    expect(overlay).not.toHaveClass('pointer-events-none');
  });

  it('shows "Modo Seguro Activado" text when active', () => {
    render(<SafeModeOverlay isActive={true} />);
    expect(screen.getByText('Modo Seguro Activado')).toBeInTheDocument();
  });

  it('shows dismiss button when onDismiss is provided', () => {
    render(<SafeModeOverlay isActive={true} onDismiss={vi.fn()} />);
    expect(screen.getByTestId('safe-mode-dismiss-btn')).toBeInTheDocument();
  });

  it('calls onDismiss when dismiss button is clicked', () => {
    const onDismiss = vi.fn();
    render(<SafeModeOverlay isActive={true} onDismiss={onDismiss} />);
    fireEvent.click(screen.getByTestId('safe-mode-dismiss-btn'));
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it('does not show dismiss button when onDismiss is not provided', () => {
    render(<SafeModeOverlay isActive={true} />);
    expect(screen.queryByTestId('safe-mode-dismiss-btn')).not.toBeInTheDocument();
  });
});

// ============================================================================
// 3. AR AUDIO SERVICE
// ============================================================================

describe('ar-audio service', () => {
  beforeEach(() => {
    speakMock.mockClear();
    cancelMock.mockClear();
    vibrateMock.mockClear();
    speakingMock.mockReturnValue(false);
  });

  it('speak() calls speechSynthesis.speak with correct text', () => {
    arAudio.speak('Hola Oaxaca');
    expect(speakMock).toHaveBeenCalledOnce();
    const utterance = speakMock.mock.calls[0][0] as MockSpeechSynthesisUtterance;
    expect(utterance.text).toBe('Hola Oaxaca');
  });

  it('speak() cancels existing speech before speaking', () => {
    arAudio.speak('Punto cercano');
    expect(cancelMock).toHaveBeenCalled();
    expect(speakMock).toHaveBeenCalled();
  });

  it('speak() sets default lang to es-MX', () => {
    arAudio.speak('Test');
    const utterance = speakMock.mock.calls[0][0] as MockSpeechSynthesisUtterance;
    expect(utterance.lang).toBe('es-MX');
  });

  it('stopSpeaking() calls speechSynthesis.cancel', () => {
    arAudio.stopSpeaking();
    expect(cancelMock).toHaveBeenCalled();
  });

  it('isSpeaking() returns false when not speaking', () => {
    speakingMock.mockReturnValue(false);
    expect(arAudio.isSpeaking()).toBe(false);
  });

  it('isSpeaking() returns true when speaking', () => {
    speakingMock.mockReturnValue(true);
    expect(arAudio.isSpeaking()).toBe(true);
  });

  it('hapticPulse("approaching") calls navigator.vibrate with double pulse', () => {
    arAudio.hapticPulse('approaching');
    expect(vibrateMock).toHaveBeenCalledWith([50, 50, 50]);
  });

  it('hapticPulse("arrived") calls navigator.vibrate with strong single vibration', () => {
    arAudio.hapticPulse('arrived');
    expect(vibrateMock).toHaveBeenCalledWith([200]);
  });

  it('hapticPulse("collected") calls navigator.vibrate with celebration pattern', () => {
    arAudio.hapticPulse('collected');
    expect(vibrateMock).toHaveBeenCalledWith([50, 30, 50, 30, 100]);
  });

  it('hapticPulse("achievement") uses long pattern', () => {
    arAudio.hapticPulse('achievement');
    expect(vibrateMock).toHaveBeenCalledWith([100, 50, 100, 50, 200]);
  });

  it('playAudioCue("ping") runs without throwing', () => {
    expect(() => arAudio.playAudioCue('ping')).not.toThrow();
  });

  it('playAudioCue("collect") runs without throwing', () => {
    expect(() => arAudio.playAudioCue('collect')).not.toThrow();
  });

  it('playAudioCue("quest_item") runs without throwing', () => {
    expect(() => arAudio.playAudioCue('quest_item')).not.toThrow();
  });

  it('playAudioCue("achievement") runs without throwing', () => {
    expect(() => arAudio.playAudioCue('achievement')).not.toThrow();
  });
});

// ============================================================================
// 4. AUDIO GUIDE HOOK
// ============================================================================

const MOCK_POINT = {
  id: 42,
  uuid: 'uuid-42',
  codigo: 'MONTE-01',
  nombre: 'Monte Alban',
  tipo: 'monument' as const,
  lat: 17.046, lng: -96.767,
  activationRadiusMeters: 50,
  trackingType: 'ground' as const,
  isCollectible: true,
  pointsValue: 100,
  active: true,
  featured: false,
};

describe('useAudioGuide', () => {
  beforeEach(() => {
    speakMock.mockClear();
    cancelMock.mockClear();
    vibrateMock.mockClear();
    speakingMock.mockReturnValue(false);
    try { localStorage.removeItem('ar_audio_guide_enabled'); } catch {}
  });

  it('is enabled by default (no localStorage pref)', () => {
    const { result } = renderHook(() => useAudioGuide());
    expect(result.current.isEnabled).toBe(true);
  });

  it('toggle() disables the guide when it was enabled', () => {
    const { result } = renderHook(() => useAudioGuide());
    expect(result.current.isEnabled).toBe(true);
    act(() => { result.current.toggle(); });
    expect(result.current.isEnabled).toBe(false);
  });

  it('toggle() persists preference to localStorage', () => {
    const { result } = renderHook(() => useAudioGuide());
    act(() => { result.current.toggle(); });
    expect(localStorage.getItem('ar_audio_guide_enabled')).toBe('false');
  });

  it('announcePoint() calls speechSynthesis.speak when enabled and within range', () => {
    const { result } = renderHook(() => useAudioGuide({ announceDistance: 100 }));
    act(() => {
      result.current.announcePoint(
        MOCK_POINT as Parameters<typeof result.current.announcePoint>[0],
        80
      );
    });
    expect(speakMock).toHaveBeenCalled();
    const utterance = speakMock.mock.calls[0][0] as MockSpeechSynthesisUtterance;
    expect(utterance.text).toContain('Monte Alban');
  });

  it('announcePoint() does NOT speak when disabled', () => {
    const { result } = renderHook(() => useAudioGuide({ enabled: false }));
    act(() => {
      result.current.announcePoint(
        MOCK_POINT as Parameters<typeof result.current.announcePoint>[0],
        80
      );
    });
    expect(speakMock).not.toHaveBeenCalled();
  });

  it('announcePoint() does NOT speak when distance > announceDistance', () => {
    const { result } = renderHook(() => useAudioGuide({ announceDistance: 100 }));
    act(() => {
      result.current.announcePoint(
        MOCK_POINT as Parameters<typeof result.current.announcePoint>[0],
        150
      );
    });
    expect(speakMock).not.toHaveBeenCalled();
  });

  it('announceCollection() includes point name and points in speech', () => {
    const { result } = renderHook(() => useAudioGuide());
    act(() => { result.current.announceCollection('Monte Alban', 100); });
    expect(speakMock).toHaveBeenCalled();
    const utterance = speakMock.mock.calls[0][0] as MockSpeechSynthesisUtterance;
    expect(utterance.text).toContain('Monte Alban');
    expect(utterance.text).toContain('100');
  });

  it('announceQuestProgress() announces completion when current === total', () => {
    const { result } = renderHook(() => useAudioGuide());
    act(() => { result.current.announceQuestProgress('La Busqueda de Donaji', 4, 4); });
    expect(speakMock).toHaveBeenCalled();
    const utterance = speakMock.mock.calls[0][0] as MockSpeechSynthesisUtterance;
    expect(utterance.text).toContain('Completaste');
  });

  it('announceArrival() triggers haptic feedback and speech', () => {
    const { result } = renderHook(() => useAudioGuide());
    act(() => {
      result.current.announceArrival(
        MOCK_POINT as Parameters<typeof result.current.announceArrival>[0]
      );
    });
    expect(vibrateMock).toHaveBeenCalled();
    expect(speakMock).toHaveBeenCalled();
    const utterance = speakMock.mock.calls[0][0] as MockSpeechSynthesisUtterance;
    expect(utterance.text).toContain('Monte Alban');
  });
});
