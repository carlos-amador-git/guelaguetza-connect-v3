// ============================================================================
// SERVICE: AR Audio Guide
// Text-to-Speech (Web Speech API) + Haptic feedback + Audio cues (Web Audio API)
// Works offline — no audio files required.
// Sprint G2 — Audio-First Navigation
// ============================================================================

// ============================================================================
// TTS — Text to Speech
// ============================================================================

/**
 * Speak text using the Web Speech API.
 * If already speaking, cancels the current utterance first.
 */
export function speak(
  text: string,
  options: {
    lang?: string;
    rate?: number;
    pitch?: number;
    volume?: number;
  } = {}
): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;

  const { lang = 'es-MX', rate = 0.9, pitch = 1, volume = 0.8 } = options;

  // Cancel any ongoing speech before queuing a new one
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang;
  utterance.rate = rate;
  utterance.pitch = pitch;
  utterance.volume = volume;

  window.speechSynthesis.speak(utterance);
}

/**
 * Stop any ongoing speech synthesis immediately.
 */
export function stopSpeaking(): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
}

/**
 * Returns true if speech synthesis is currently active.
 */
export function isSpeaking(): boolean {
  if (typeof window === 'undefined' || !window.speechSynthesis) return false;
  return window.speechSynthesis.speaking;
}

// ============================================================================
// HAPTIC FEEDBACK
// ============================================================================

type HapticPattern = 'approaching' | 'arrived' | 'collected' | 'achievement';

const HAPTIC_PATTERNS: Record<HapticPattern, number[]> = {
  approaching: [50, 50, 50],
  arrived: [200],
  collected: [50, 30, 50, 30, 100],
  achievement: [100, 50, 100, 50, 200],
};

/**
 * Trigger haptic feedback via the Vibration API.
 * Silently no-ops on platforms that don't support it.
 */
export function hapticPulse(pattern: HapticPattern): void {
  if (typeof navigator === 'undefined' || !navigator.vibrate) return;
  navigator.vibrate(HAPTIC_PATTERNS[pattern]);
}

// ============================================================================
// AUDIO CUES — Web Audio API oscillator tones (no files needed)
// ============================================================================

type AudioCueType = 'ping' | 'collect' | 'quest_item' | 'achievement';

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx || audioCtx.state === 'closed') {
    try {
      audioCtx = new AudioContext();
    } catch {
      return null;
    }
  }
  return audioCtx;
}

/**
 * Play a single oscillator tone.
 * @param freq  Frequency in Hz
 * @param durationMs  Duration in milliseconds
 * @param startTime  AudioContext time offset (seconds) to schedule at
 * @param ctx  AudioContext instance
 */
function playTone(
  freq: number,
  durationMs: number,
  startTime: number,
  ctx: AudioContext
): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, startTime);

  // Short fade-in + fade-out to avoid clicks
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(0.25, startTime + 0.01);
  gain.gain.linearRampToValueAtTime(0, startTime + durationMs / 1000);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(startTime);
  osc.stop(startTime + durationMs / 1000 + 0.02);
}

/**
 * Play a frequency sweep from startFreq to endFreq over durationMs.
 */
function playSweep(
  startFreq: number,
  endFreq: number,
  durationMs: number,
  startTime: number,
  ctx: AudioContext
): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(startFreq, startTime);
  osc.frequency.linearRampToValueAtTime(endFreq, startTime + durationMs / 1000);

  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(0.2, startTime + 0.01);
  gain.gain.linearRampToValueAtTime(0, startTime + durationMs / 1000);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(startTime);
  osc.stop(startTime + durationMs / 1000 + 0.02);
}

/**
 * Play a short audio cue using the Web Audio API.
 * - ping:        880 Hz for 100 ms
 * - collect:     440→880 Hz sweep 200 ms
 * - quest_item:  C-E-G melody (523, 659, 784 Hz), 100 ms each
 * - achievement: C-E-G-C(octave) fanfare (523, 659, 784, 1046 Hz), 150 ms each
 */
export function playAudioCue(type: AudioCueType): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  // Resume suspended context (autoplay policy)
  if (ctx.state === 'suspended') {
    ctx.resume().then(() => playAudioCue(type)).catch(() => {});
    return;
  }

  const now = ctx.currentTime;

  switch (type) {
    case 'ping':
      playTone(880, 100, now, ctx);
      break;

    case 'collect':
      playSweep(440, 880, 200, now, ctx);
      break;

    case 'quest_item': {
      // C-E-G, 100 ms each, 10 ms gap
      const notes = [523.25, 659.25, 783.99];
      const dur = 100;
      const gap = 0.01;
      notes.forEach((freq, i) => {
        playTone(freq, dur, now + i * (dur / 1000 + gap), ctx);
      });
      break;
    }

    case 'achievement': {
      // C-E-G-C(octave), 150 ms each, 10 ms gap
      const notes = [523.25, 659.25, 783.99, 1046.5];
      const dur = 150;
      const gap = 0.01;
      notes.forEach((freq, i) => {
        playTone(freq, dur, now + i * (dur / 1000 + gap), ctx);
      });
      break;
    }
  }
}
