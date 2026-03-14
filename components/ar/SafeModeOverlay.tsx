import React, { useEffect, useCallback } from 'react';
import { ShieldCheck } from 'lucide-react';

// ============================================================================
// COMPONENT: SafeModeOverlay
// Shown when the user is walking during an AR session to prevent theft/accidents.
// Sprint G2 — User Safety UX
// ============================================================================

interface SafeModeOverlayProps {
  /** True when the user is detected as walking */
  isActive: boolean;
  /** Temporary dismiss — re-activates on next walking detection */
  onDismiss?: () => void;
  children?: React.ReactNode;
}

export function SafeModeOverlay({
  isActive,
  onDismiss,
  children,
}: SafeModeOverlayProps) {
  // Auto-dismiss when isActive becomes false (user stopped walking)
  useEffect(() => {
    if (!isActive && onDismiss) {
      onDismiss();
    }
  }, [isActive, onDismiss]);

  const handleDismiss = useCallback(() => {
    onDismiss?.();
  }, [onDismiss]);

  return (
    <div className="relative w-full h-full" data-testid="safe-mode-overlay-wrapper">
      {/* Children (camera / AR view) always rendered underneath */}
      {children}

      {/* Overlay — fades in/out with CSS transition */}
      <div
        data-testid="safe-mode-overlay"
        aria-live="assertive"
        aria-label={isActive ? 'Modo Seguro Activado' : undefined}
        aria-hidden={!isActive}
        className={`absolute inset-0 z-50 flex flex-col items-center justify-center
                    bg-black/70 backdrop-blur-sm
                    transition-opacity duration-300
                    ${isActive ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
      >
        {/* Shield icon with pulse animation */}
        <div
          className="mb-6 flex items-center justify-center"
          aria-hidden="true"
        >
          {/* Outer pulse ring */}
          <span className="absolute w-24 h-24 rounded-full bg-amber-400/20 animate-ping" />
          {/* Inner icon container */}
          <div
            className="relative z-10 w-20 h-20 rounded-full bg-amber-500/20 border-2 border-amber-400
                        flex items-center justify-center"
          >
            <ShieldCheck className="w-10 h-10 text-amber-400" />
          </div>
        </div>

        {/* Message */}
        <h2 className="text-xl font-bold text-white mb-2 text-center px-6">
          Modo Seguro Activado
        </h2>
        <p className="text-sm text-white/80 text-center px-8 leading-relaxed mb-8">
          Detente para activar la experiencia AR
        </p>

        {/* Subtle dismiss button */}
        {onDismiss && (
          <button
            onClick={handleDismiss}
            data-testid="safe-mode-dismiss-btn"
            className="text-white/60 text-sm underline underline-offset-2
                       hover:text-white/90 focus:outline-none focus:ring-2
                       focus:ring-white/40 rounded px-2 py-1 transition-colors"
            aria-label="Ignorar modo seguro temporalmente"
          >
            Ya estoy detenido
          </button>
        )}
      </div>
    </div>
  );
}

export default SafeModeOverlay;
