import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Users,
  ShoppingBag,
  Shield,
  ChevronRight,
  ChevronLeft,
  MapPin,
  Calendar,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  ArrowRight,
  UserPlus,
  Store,
} from 'lucide-react';
import gsap from 'gsap';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import ThemeToggle from './ui/ThemeToggle';

interface LandingViewProps {
  onUserSelected: (role?: string) => void;
}

const INTRO_IMAGES = [
  '/images/intro/1 lagarto.png',
  '/images/intro/2 guela1.png',
  '/images/intro/3 chica.png',
  '/images/intro/4 guela2.png',
  '/images/intro/5 arcoiris.png',
  '/images/intro/6 lagarto.png',
];

type RoleType = 'user' | 'seller' | 'admin';
type UserRole = 'USER' | 'SELLER' | 'ADMIN';

const ROLE_MAP: Record<RoleType, UserRole> = {
  user: 'USER',
  seller: 'SELLER',
  admin: 'ADMIN',
};

const USER_TYPES = [
  {
    type: 'user' as RoleType,
    name: 'Visitante',
    title: 'Soy Visitante',
    description: 'Explora la Guelaguetza, descubre eventos, transporte, historias y conecta con la comunidad.',
    icon: Users,
    image: '/images/dance_pluma.png',
    color: 'from-oaxaca-sky to-oaxaca-purple',
    features: ['Mapa interactivo', 'Rutas de transporte', 'Eventos y calendario', 'Historias de la comunidad'],
  },
  {
    type: 'seller' as RoleType,
    name: 'Artesano / Vendedor',
    title: 'Soy Vendedor',
    description: 'Vende productos artesanales, ofrece tours y experiencias, gestiona pedidos y reservas.',
    icon: ShoppingBag,
    image: '/images/product_barro_negro.png',
    color: 'from-oaxaca-yellow to-oaxaca-pink',
    features: ['Gestiona productos', 'Crea experiencias', 'Pedidos y reservas', 'Estadisticas de ventas'],
  },
  {
    type: 'admin' as RoleType,
    name: 'Administrador',
    title: 'Administrador',
    description: 'Panel de metricas, estadisticas de uso y gestion de la plataforma.',
    icon: Shield,
    image: '/images/poi_monte_alban.png',
    color: 'from-oaxaca-purple to-oaxaca-pink',
    features: ['Dashboard de metricas', 'Gestion de usuarios', 'Ver app como usuario', 'Reportes de actividad'],
  },
];

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

const LandingView: React.FC<LandingViewProps> = ({ onUserSelected }) => {
  const { login, loginWithGoogle, loginAsDemo, register } = useAuth();
  const { t } = useLanguage();
  const [loading, setLoading] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<RoleType | null>(null);

  // Login/Register form state
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nombre, setNombre] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Refs for GSAP
  const containerRef = useRef<HTMLDivElement>(null);
  const imagesRef = useRef<(HTMLImageElement | null)[]>([]);
  const cardsRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLElement>(null);
  const loginFormRef = useRef<HTMLDivElement>(null);
  const googleButtonRef = useRef<HTMLDivElement>(null);

  // GSAP intro animation
  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });

      imagesRef.current.forEach((img, i) => {
        if (img) {
          gsap.set(img, { opacity: 0, scale: 1.1, filter: 'blur(4px)' });
          tl.to(img, {
            opacity: 1,
            scale: 1,
            filter: 'blur(0px)',
            duration: 0.4,
            ease: 'power2.out',
          }, i * 0.15);
        }
      });

      if (cardsRef.current) {
        const cards = cardsRef.current.children;
        gsap.set(cards, { opacity: 0, y: 40 });
        tl.to(cards, {
          opacity: 1,
          y: 0,
          duration: 0.5,
          stagger: 0.1,
          ease: 'power2.out',
        }, '-=0.3');
      }

      if (footerRef.current) {
        gsap.set(footerRef.current, { opacity: 0 });
        tl.to(footerRef.current, { opacity: 1, duration: 0.4 }, '-=0.2');
      }

      const lastImg = imagesRef.current[0];
      if (lastImg) {
        gsap.to(lastImg, {
          scale: 1.03,
          duration: 8,
          ease: 'none',
          repeat: -1,
          yoyo: true,
          delay: tl.duration(),
        });
      }
    }, containerRef);

    return () => ctx.revert();
  }, []);

  // Initialize Google Sign-In
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || !selectedRole) return;

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (window.google && googleButtonRef.current) {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleGoogleResponse,
        });
        window.google.accounts.id.renderButton(googleButtonRef.current, {
          theme: 'outline',
          size: 'large',
          width: googleButtonRef.current.offsetWidth,
          text: 'continue_with',
          locale: 'es',
        });
      }
    };
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, [selectedRole]);

  const handleGoogleResponse = useCallback(async (response: { credential: string }) => {
    if (!selectedRole) return;
    setIsLoading(true);
    setError('');

    const result = await loginWithGoogle(response.credential, ROLE_MAP[selectedRole]);
    if (result === true) {
      onUserSelected(ROLE_MAP[selectedRole]);
    } else {
      setError(typeof result === 'string' ? result : 'Error al iniciar sesion con Google');
    }
    setIsLoading(false);
  }, [selectedRole, loginWithGoogle, onUserSelected]);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole) return;
    setError('');

    if (isRegisterMode) {
      if (password !== confirmPassword) {
        setError('Las contraseñas no coinciden');
        return;
      }
      if (password.length < 6) {
        setError('La contraseña debe tener al menos 6 caracteres');
        return;
      }
      if (!nombre.trim()) {
        setError('El nombre es requerido');
        return;
      }
      if (selectedRole === 'seller' && !businessName.trim()) {
        setError('El nombre de tu tienda es requerido');
        return;
      }
      setIsLoading(true);
      const success = await register({
        email,
        password,
        nombre: nombre.trim(),
        role: ROLE_MAP[selectedRole],
        businessName: selectedRole === 'seller' ? businessName.trim() : undefined,
      });
      if (success) {
        onUserSelected(ROLE_MAP[selectedRole]);
      } else {
        setError('Error al registrarse. El email ya puede estar en uso.');
      }
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const result = await login(email, password, ROLE_MAP[selectedRole]);
    if (result === true) {
      onUserSelected(ROLE_MAP[selectedRole]);
    } else {
      setError(typeof result === 'string' ? result : 'Credenciales incorrectas. Intenta de nuevo.');
    }
    setIsLoading(false);
  };

  const handleDemoLogin = async () => {
    if (!selectedRole) return;
    setLoading(selectedRole);
    await loginAsDemo(selectedRole);
    onUserSelected(ROLE_MAP[selectedRole]);
  };

  const handleBack = () => {
    setSelectedRole(null);
    setIsRegisterMode(false);
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setNombre('');
    setBusinessName('');
    setError('');
  };

  // Animate login form entry
  useEffect(() => {
    if (selectedRole && loginFormRef.current) {
      gsap.fromTo(loginFormRef.current,
        { opacity: 0, x: 60 },
        { opacity: 1, x: 0, duration: 0.4, ease: 'power2.out' }
      );
    }
  }, [selectedRole]);

  const selectedUserType = USER_TYPES.find(u => u.type === selectedRole);

  return (
    <div ref={containerRef} className="min-h-screen relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 z-0">
        <img src="/images/intro/7 rojo.png" alt="" className="absolute inset-0 w-full h-full object-cover" />
        {[...INTRO_IMAGES].reverse().map((src, i) => (
          <img
            key={i}
            ref={(el) => { imagesRef.current[INTRO_IMAGES.length - 1 - i] = el; }}
            src={src}
            alt=""
            className="absolute inset-0 w-full h-full object-contain"
          />
        ))}
      </div>

      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <header className="pt-6 sm:pt-8 pb-4 sm:pb-6 px-4 sm:px-6 text-center relative">
          <div className="absolute top-3 sm:top-4 right-3 sm:right-4">
            <ThemeToggle variant="toggle" size="md" className="min-w-[44px] min-h-[44px]" />
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 flex flex-col justify-end px-3 sm:px-4 pb-10 sm:pb-12">
          <div className="max-w-5xl mx-auto w-full">

            {/* === ROLE SELECTION === */}
            {!selectedRole && (
              <div ref={cardsRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {USER_TYPES.map((userType) => (
                  <button
                    key={userType.type}
                    onClick={() => setSelectedRole(userType.type)}
                    aria-label={`Ingresar como ${userType.name}`}
                    style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.12), inset 0 1px 1px 0 rgba(255,255,255,0.5), inset 0 -1px 1px 0 rgba(0,0,0,0.05)' }}
                    className="relative bg-white/35 dark:bg-gray-800/45 backdrop-blur-3xl backdrop-saturate-[180%] border border-white/40 dark:border-white/30 rounded-2xl p-3 sm:p-5 text-left transition-all duration-200 hover:scale-[1.02] hover:bg-white/45 dark:hover:bg-gray-800/55 active:scale-[0.98]"
                  >
                    {/* Mobile: Simple layout */}
                    <div className="flex items-center gap-2.5 sm:hidden">
                      <img
                        src={userType.image}
                        alt={userType.name}
                        className="w-10 h-10 rounded-xl object-cover shadow-lg flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0 py-0.5">
                        <h3 className="font-bold text-xs text-gray-900 dark:text-white truncate">
                          {userType.title}
                        </h3>
                      </div>
                      <ChevronRight
                        size={16}
                        className="text-gray-400 flex-shrink-0"
                        aria-hidden="true"
                      />
                    </div>

                    {/* Tablet/Web: Full layout with description */}
                    <div className="hidden sm:block">
                      <div className="flex items-center gap-4 mb-3">
                        <img
                          src={userType.image}
                          alt={userType.name}
                          className="w-14 h-14 rounded-xl object-cover shadow-lg flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0 py-0.5">
                          <h3 className="font-bold text-base text-gray-900 dark:text-white truncate">
                            {userType.title}
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                            {userType.name}
                          </p>
                        </div>
                        <ChevronRight
                          size={18}
                          className="text-gray-400 flex-shrink-0"
                          aria-hidden="true"
                        />
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mb-2 line-clamp-2">
                        {userType.description}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {userType.features.slice(0, 3).map((feature, index) => (
                          <span
                            key={index}
                            className="text-xs bg-white/20 dark:bg-white/10 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full"
                          >
                            {feature}
                          </span>
                        ))}
                        {userType.features.length > 3 && (
                          <span className="text-xs text-gray-400 px-1">
                            +{userType.features.length - 3} mas
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* === LOGIN FORM === */}
            {selectedRole && selectedUserType && (
              <div ref={loginFormRef} className="max-w-md mx-auto">
                <div
                  style={{ boxShadow: 'inset 0 1px 1px 0 rgba(255,255,255,0.3), 0 8px 32px rgba(0,0,0,0.15)' }}
                  className="bg-white/10 dark:bg-white/[0.05] backdrop-blur-2xl backdrop-saturate-150 border border-white/20 dark:border-white/10 rounded-2xl p-6 sm:p-8"
                >
                  {/* Header with back button */}
                  <div className="flex items-center gap-3 mb-6">
                    <button
                      onClick={handleBack}
                      className="p-2 rounded-full hover:bg-white/10 transition-colors text-white"
                    >
                      <ChevronLeft size={20} />
                    </button>
                    <img
                      src={selectedUserType.image}
                      alt={selectedUserType.name}
                      className="w-10 h-10 rounded-xl object-cover shadow-lg"
                    />
                    <div>
                      <h2 className="text-white font-bold text-lg">{selectedUserType.title}</h2>
                      <p className="text-white/60 text-xs">{selectedUserType.name}</p>
                    </div>
                  </div>

                  {/* Google Sign-In — only when configured */}
                  {GOOGLE_CLIENT_ID && (
                    <div ref={googleButtonRef} className="mb-4 rounded-xl overflow-hidden" />
                  )}

                  {/* Divider — only when Google is configured */}
                  {GOOGLE_CLIENT_ID && (
                    <div className="flex items-center gap-4 my-4">
                      <div className="flex-1 h-px bg-white/20" />
                      <span className="text-white/50 text-xs">o con email</span>
                      <div className="flex-1 h-px bg-white/20" />
                    </div>
                  )}

                  {/* Email/Password Form */}
                  <form onSubmit={handleEmailLogin} className="space-y-3">
                    {/* Name field (register only) */}
                    {isRegisterMode && (
                      <div className="relative">
                        <UserPlus className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={18} />
                        <input
                          type="text"
                          value={nombre}
                          onChange={(e) => setNombre(e.target.value)}
                          placeholder="Nombre completo"
                          className="w-full pl-11 pr-4 py-3.5 bg-white/10 text-white placeholder-white/40 rounded-xl border border-white/10 focus:border-white/30 focus:ring-0 outline-none transition text-sm"
                          required
                        />
                      </div>
                    )}

                    {/* Business name field (register only for sellers) */}
                    {isRegisterMode && selectedRole === 'seller' && (
                      <div className="relative">
                        <Store className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={18} />
                        <input
                          type="text"
                          value={businessName}
                          onChange={(e) => setBusinessName(e.target.value)}
                          placeholder="Nombre de tu tienda"
                          className="w-full pl-11 pr-4 py-3.5 bg-white/10 text-white placeholder-white/40 rounded-xl border border-white/10 focus:border-white/30 focus:ring-0 outline-none transition text-sm"
                          required
                        />
                      </div>
                    )}

                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={18} />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Email"
                        className="w-full pl-11 pr-4 py-3.5 bg-white/10 text-white placeholder-white/40 rounded-xl border border-white/10 focus:border-white/30 focus:ring-0 outline-none transition text-sm"
                        required
                      />
                    </div>

                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={18} />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Contraseña"
                        className="w-full pl-11 pr-11 py-3.5 bg-white/10 text-white placeholder-white/40 rounded-xl border border-white/10 focus:border-white/30 focus:ring-0 outline-none transition text-sm"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>

                    {/* Confirm password (register only) */}
                    {isRegisterMode && (
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={18} />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Confirmar contraseña"
                          className="w-full pl-11 pr-4 py-3.5 bg-white/10 text-white placeholder-white/40 rounded-xl border border-white/10 focus:border-white/30 focus:ring-0 outline-none transition text-sm"
                          required
                        />
                      </div>
                    )}

                    {error && (
                      <p className="text-red-300 text-xs text-center">{error}</p>
                    )}

                    <button
                      type="submit"
                      disabled={isLoading}
                      className={`w-full bg-gradient-to-r ${selectedUserType.color} text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:opacity-90 transition disabled:opacity-50 text-sm`}
                    >
                      {isLoading ? (
                        <Loader2 className="animate-spin" size={18} />
                      ) : (
                        <>
                          {isRegisterMode ? 'Crear cuenta' : 'Iniciar sesion'}
                          <ArrowRight size={18} />
                        </>
                      )}
                    </button>
                  </form>

                  {/* Toggle login/register (not for admin) */}
                  {selectedRole !== 'admin' && (
                    <p className="text-center mt-4 text-white/50 text-xs">
                      {isRegisterMode ? '¿Ya tienes cuenta?' : '¿No tienes cuenta?'}{' '}
                      <button
                        onClick={() => { setIsRegisterMode(!isRegisterMode); setError(''); }}
                        className="text-white font-semibold hover:underline"
                      >
                        {isRegisterMode ? 'Inicia sesion' : 'Registrate'}
                      </button>
                    </p>
                  )}

                </div>
              </div>
            )}
          </div>
        </main>

        {/* Footer */}
        <footer ref={footerRef} className="py-4 sm:py-6 px-4 text-center mt-auto">
          <div className="flex items-center justify-center gap-4 sm:gap-6 text-white/60 text-xs sm:text-sm mb-2 sm:mb-4 flex-wrap">
            <div className="flex items-center gap-1">
              <MapPin size={12} className="sm:w-3.5 sm:h-3.5" aria-hidden="true" />
              <span>Oaxaca, Mexico</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar size={12} className="sm:w-3.5 sm:h-3.5" aria-hidden="true" />
              <span>Guelaguetza 2026</span>
            </div>
          </div>
          <p className="text-white/70 text-[10px] sm:text-xs">
            {t('celebrating_culture')}
          </p>
        </footer>
      </div>
    </div>
  );
};

// Google Identity Services type
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: { client_id: string; callback: (response: { credential: string }) => void }) => void;
          renderButton: (element: HTMLElement, config: Record<string, unknown>) => void;
        };
      };
    };
  }
}

export default LandingView;
