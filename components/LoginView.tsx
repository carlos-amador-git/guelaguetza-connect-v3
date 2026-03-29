import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Mail, Lock, Eye, EyeOff, Scan, Camera, X, Loader2, ArrowRight, Sparkles } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { ViewState } from '../types';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
          }) => void;
          renderButton: (element: HTMLElement, config: Record<string, unknown>) => void;
        };
      };
    };
  }
}

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

interface LoginViewProps {
  setView: (view: ViewState) => void;
}

const LoginView: React.FC<LoginViewProps> = ({ setView }) => {
  const { login, loginWithGoogle, loginWithFace, loginAsDemo } = useAuth();
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showFaceAuth, setShowFaceAuth] = useState(false);
  const [faceStatus, setFaceStatus] = useState<'scanning' | 'success' | 'error' | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Load Google Identity Services SDK
  useEffect(() => {
    if (window.google?.accounts?.identity) return;

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);
  }, []);

  const handleGoogleResponse = useCallback(async (response: { credential: string }) => {
    setIsLoading(true);
    setError('');

    const success = await loginWithGoogle(response.credential);
    if (success) {
      setView(ViewState.HOME);
    } else {
      setError('Error al iniciar sesión con Google');
    }
    setIsLoading(false);
  }, [loginWithGoogle, setView]);

  // Initialize Google button
  useEffect(() => {
    if (!window.google?.accounts?.identity) return;

    window.google.accounts.id.initialize({
      client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID',
      callback: handleGoogleResponse,
      auto_select: false,
      cancel_on_tap_outside: false,
    });

    window.google.accounts.id.renderButton(
      document.getElementById('google-button') as HTMLElement,
      {
        theme: 'outline',
        size: 'large',
        width: '100%',
        text: 'continue_with',
        shape: 'rectangle',
      }
    );
  }, [handleGoogleResponse]);

  // Camera setup for Face ID
  useEffect(() => {
    if (!showFaceAuth) return;

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error('Camera error:', err);
        setError('No se pudo acceder a la cámara');
        setShowFaceAuth(false);
      }
    };

    startCamera();

    return () => {
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      }
    };
  }, [showFaceAuth]);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const success = await login(email, password);

    if (success) {
      setView(ViewState.HOME);
    } else {
      setError('Credenciales incorrectas');
    }
    setIsLoading(false);
  };

  const handleFaceCapture = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    setFaceStatus('scanning');

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw current video frame
    ctx.drawImage(video, 0, 0);

    // Get image data
    const imageData = canvas.toDataURL('image/jpeg', 0.8);

    // Simulate face detection delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Try to login with face
    const success = await loginWithFace(imageData);

    if (success) {
      setFaceStatus('success');
      await new Promise(resolve => setTimeout(resolve, 1000));
      setView(ViewState.HOME);
    } else {
      setFaceStatus('error');
      setTimeout(() => {
        setFaceStatus(null);
        setError('Face ID no reconocido. Usa email/contraseña o regístrate primero.');
      }, 1500);
    }
  };

  const closeFaceAuth = () => {
    setShowFaceAuth(false);
    setFaceStatus(null);
    if (videoRef.current?.srcObject) {
      (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
    }
  };

  // Face ID Modal
  if (showFaceAuth) {
    return (
      <div className="h-full bg-gradient-to-br from-gray-900 via-oaxaca-purple/30 to-black flex flex-col">
        {/* Header */}
        <div className="p-4 flex items-center justify-between">
          <button onClick={closeFaceAuth} className="text-white p-2 rounded-full bg-white/10">
            <X size={24} />
          </button>
          <h2 className="text-white font-bold">Face ID</h2>
          <div className="w-10" />
        </div>

        {/* Camera View */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 pb-24">
          <div className="relative w-64 h-64 rounded-full overflow-hidden border-4 border-white/20 mb-8">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover scale-x-[-1]"
            />

            {/* Face Outline */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className={`w-48 h-56 border-4 rounded-[50%] transition-all duration-500 ${
                faceStatus === 'scanning' ? 'border-oaxaca-yellow animate-pulse' :
                faceStatus === 'success' ? 'border-green-400' :
                faceStatus === 'error' ? 'border-red-400' :
                'border-white/50'
              }`} />
            </div>

            {/* Status Overlay */}
            {faceStatus && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                {faceStatus === 'scanning' && (
                  <div className="text-center">
                    <Loader2 className="w-12 h-12 text-oaxaca-yellow animate-spin mx-auto mb-2" />
                    <p className="text-white text-sm">Escaneando...</p>
                  </div>
                )}
                {faceStatus === 'success' && (
                  <div className="text-center">
                    <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-2">
                      <Sparkles className="w-8 h-8 text-white" />
                    </div>
                    <p className="text-green-400 font-bold">¡Bienvenido!</p>
                  </div>
                )}
                {faceStatus === 'error' && (
                  <div className="text-center">
                    <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-2">
                      <X className="w-8 h-8 text-white" />
                    </div>
                    <p className="text-red-400 font-bold">No reconocido</p>
                  </div>
                )}
              </div>
            )}
          </div>

          <canvas ref={canvasRef} className="hidden" />

          <p className="text-white/70 text-sm text-center mb-6">
            Coloca tu rostro dentro del círculo y mantente quieto
          </p>

          <button
            onClick={handleFaceCapture}
            disabled={faceStatus !== null}
            className="bg-oaxaca-pink text-white px-8 py-4 rounded-full font-bold flex items-center gap-2 hover:bg-opacity-90 transition disabled:opacity-50"
          >
            <Camera size={20} />
            Escanear rostro
          </button>
        </div>
      </div>
    );
  }

  // Regular Login View
  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-oaxaca-purple via-oaxaca-pink to-oaxaca-purple">
      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 pt-12">
        <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mb-6">
          <Sparkles className="w-10 h-10 text-oaxaca-yellow" />
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">{t('greeting')}!</h1>
        <p className="text-white/70 text-center">{t('login')}</p>
      </div>

      {/* Login Form */}
      <div className="bg-white dark:bg-gray-900 rounded-t-[2.5rem] px-6 py-8 shadow-2xl">
        <form onSubmit={handleEmailLogin} className="space-y-4">
          {/* Email */}
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" size={20} />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('email')}
              className="w-full pl-12 pr-4 py-4 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 rounded-xl focus:ring-2 focus:ring-oaxaca-pink outline-none transition"
              required
            />
          </div>

          {/* Password */}
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" size={20} />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('password')}
              className="w-full pl-12 pr-12 py-4 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 rounded-xl focus:ring-2 focus:ring-oaxaca-pink outline-none transition"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          {/* Error */}
          {error && (
            <p className="text-red-500 dark:text-red-400 text-sm text-center">{error}</p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-oaxaca-pink text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-opacity-90 transition disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              <>
                {t('login')}
                <ArrowRight size={20} />
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-4 my-6">
          <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
          <span className="text-gray-400 dark:text-gray-500 text-sm">o continúa con</span>
          <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
        </div>

        {/* Google Button */}
        <div id="google-button" className="mb-3" />

        {/* Face ID Button */}
        <button
          onClick={() => setShowFaceAuth(true)}
          className="w-full bg-gray-900 dark:bg-gray-700 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-3 hover:bg-gray-800 dark:hover:bg-gray-600 transition"
        >
          <Scan size={24} />
          {t('login_with_face')}
        </button>

        {/* Register Link */}
        <p className="text-center mt-6 text-gray-600 dark:text-gray-400">
          {t('no_account')}{' '}
          <button
            onClick={() => setView(ViewState.REGISTER)}
            className="text-oaxaca-pink font-bold hover:underline"
          >
            {t('register')}
          </button>
        </p>

        {/* Demo Mode Section */}
        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-center text-gray-500 dark:text-gray-400 text-sm mb-3">Modo Demo - Acceso rapido</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={async () => {
                setIsLoading(true);
                await loginAsDemo('user');
                setView(ViewState.HOME);
              }}
              className="py-3 px-4 bg-gradient-to-r from-oaxaca-sky to-oaxaca-sky text-white rounded-xl text-sm font-medium hover:opacity-90 transition"
            >
              Usuario Demo
            </button>
            <button
              onClick={async () => {
                setIsLoading(true);
                await loginAsDemo('seller');
                setView(ViewState.HOME);
              }}
              className="py-3 px-4 bg-gradient-to-r from-oaxaca-yellow to-oaxaca-yellow text-white rounded-xl text-sm font-medium hover:opacity-90 transition"
            >
              Vendedor Demo
            </button>
            <button
              onClick={async () => {
                setIsLoading(true);
                await loginAsDemo('host');
                setView(ViewState.HOME);
              }}
              className="py-3 px-4 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl text-sm font-medium hover:opacity-90 transition"
            >
              Guia Demo
            </button>
            <button
              onClick={async () => {
                setIsLoading(true);
                await loginAsDemo('admin');
                setView(ViewState.HOME);
              }}
              className="py-3 px-4 bg-gradient-to-r from-oaxaca-purple to-oaxaca-purple text-white rounded-xl text-sm font-medium hover:opacity-90 transition"
            >
              Admin Demo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginView;
