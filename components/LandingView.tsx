import React, { useState, useEffect, useRef } from 'react';
import {
  Users,
  ShoppingBag,
  Shield,
  ChevronRight,
  Sparkles,
  MapPin,
  Calendar,
} from 'lucide-react';
import gsap from 'gsap';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import ThemeToggle from './ui/ThemeToggle';

interface LandingViewProps {
  onUserSelected: (role?: string) => void;
}

const INTRO_IMAGES = [
  '/images/intro/1 lagarto1.png',
  '/images/intro/2 guela1.png',
  '/images/intro/3 chica.png',
  '/images/intro/4 arcoiris.png',
  '/images/intro/5 guela2.png',
  '/images/intro/6 lagarto2.png',
];

const USER_TYPES = [
  {
    type: 'user' as const,
    name: 'Visitante',
    title: 'Soy Visitante',
    description: 'Explora la Guelaguetza, descubre eventos, transporte, historias y conecta con la comunidad.',
    icon: Users,
    image: '/images/dance_pluma.png',
    color: 'from-oaxaca-sky to-oaxaca-purple',
    features: ['Mapa interactivo', 'Rutas de transporte', 'Eventos y calendario', 'Historias de la comunidad'],
  },
  {
    type: 'seller' as const,
    name: 'Artesano / Vendedor',
    title: 'Soy Vendedor',
    description: 'Vende productos artesanales, ofrece tours y experiencias, gestiona pedidos y reservas.',
    icon: ShoppingBag,
    image: '/images/product_barro_negro.png',
    color: 'from-oaxaca-yellow to-oaxaca-pink',
    features: ['Gestiona productos', 'Crea experiencias', 'Pedidos y reservas', 'Estadisticas de ventas'],
  },
  {
    type: 'admin' as const,
    name: 'Administrador',
    title: 'Administrador',
    description: 'Panel de metricas, estadisticas de uso y gestion de la plataforma.',
    icon: Shield,
    image: '/images/poi_monte_alban.png',
    color: 'from-oaxaca-purple to-oaxaca-pink',
    features: ['Dashboard de metricas', 'Gestion de usuarios', 'Ver app como usuario', 'Reportes de actividad'],
  },
];

const LandingView: React.FC<LandingViewProps> = ({ onUserSelected }) => {
  const { loginAsDemo } = useAuth();
  const { t } = useLanguage();
  const [loading, setLoading] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const imagesRef = useRef<(HTMLImageElement | null)[]>([]);
  const cardsRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });

      // Images fade in with gentle zoom, one by one
      imagesRef.current.forEach((img, i) => {
        if (img) {
          gsap.set(img, { opacity: 0, scale: 1.1, filter: 'blur(4px)' });
          tl.to(img, {
            opacity: 1,
            scale: 1,
            filter: 'blur(0px)',
            duration: 0.8,
            ease: 'power2.out',
          }, i * 0.35);
        }
      });

      // Cards slide up smoothly
      if (cardsRef.current) {
        const cards = cardsRef.current.children;
        gsap.set(cards, { opacity: 0, y: 40 });
        tl.to(cards, {
          opacity: 1,
          y: 0,
          duration: 0.8,
          stagger: 0.2,
          ease: 'power2.out',
        }, '-=0.5');
      }

      // Footer fades in
      if (footerRef.current) {
        gsap.set(footerRef.current, { opacity: 0 });
        tl.to(footerRef.current, { opacity: 1, duration: 0.8 }, '-=0.3');
      }

      // Subtle Ken Burns on final visible image
      const lastImg = imagesRef.current[0];
      if (lastImg) {
        gsap.to(lastImg, {
          scale: 1.03,
          duration: 10,
          ease: 'none',
          repeat: -1,
          yoyo: true,
          delay: tl.duration(),
        });
      }
    }, containerRef);

    return () => ctx.revert();
  }, []);

  const handleSelectUser = async (type: 'user' | 'seller' | 'admin') => {
    setLoading(type);
    setSelectedType(type);
    await loginAsDemo(type);
    const roleMap: Record<string, string> = {
      user: 'USER',
      seller: 'SELLER',
      admin: 'ADMIN',
    };
    setTimeout(() => {
      onUserSelected(roleMap[type]);
    }, 300);
  };

  return (
    <div ref={containerRef} className="min-h-screen relative overflow-hidden">
      {/* Background - Image 7 as base */}
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
            <ThemeToggle
              variant="toggle"
              size="md"
              className="min-w-[44px] min-h-[44px]"
            />
          </div>
        </header>


        {/* Main Content */}
        <main className="flex-1 flex flex-col justify-end px-3 sm:px-4 pb-10 sm:pb-12">
          <div className="max-w-5xl mx-auto w-full">
            <div ref={cardsRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {USER_TYPES.map((userType) => (
                <button
                  key={userType.type}
                  onClick={() => handleSelectUser(userType.type)}
                  disabled={loading !== null}
                  aria-label={`Ingresar como ${userType.name}`}
                  aria-busy={loading === userType.type}
                  style={{ boxShadow: 'inset 0 1px 1px 0 rgba(255,255,255,0.3), 0 8px 32px rgba(0,0,0,0.1)' }}
                  className={`relative bg-white/5 dark:bg-white/[0.03] backdrop-blur-2xl backdrop-saturate-150 border border-white/15 dark:border-white/10 rounded-2xl p-4 sm:p-5 text-left transition-all duration-200 hover:scale-[1.02] hover:bg-white/10 active:scale-[0.98] focus-visible:ring-4 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-oaxaca-purple ${
                    selectedType === userType.type ? 'ring-4 ring-white/50 scale-[1.02] bg-white/15 dark:bg-white/10' : ''
                  } ${loading && loading !== userType.type ? 'opacity-50' : ''}`}
                >
                  {/* Image & Title */}
                  <div className="flex items-start gap-3 sm:gap-4 mb-2 sm:mb-3">
                    <img
                      src={userType.image}
                      alt={userType.name}
                      className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl object-cover shadow-lg flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-base sm:text-lg text-gray-900 dark:text-white truncate">
                        {userType.title}
                      </h3>
                      <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                        {userType.name}
                      </p>
                    </div>
                    <ChevronRight
                      size={20}
                      className={`text-gray-400 transition-transform flex-shrink-0 sm:w-6 sm:h-6 ${
                        selectedType === userType.type ? 'translate-x-1' : ''
                      }`}
                      aria-hidden="true"
                    />
                  </div>

                  {/* Description */}
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 mb-2 sm:mb-3 line-clamp-2">
                    {userType.description}
                  </p>

                  {/* Features */}
                  <div className="flex flex-wrap gap-1.5 sm:gap-2">
                    {userType.features.slice(0, 3).map((feature, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] sm:text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 sm:py-1 rounded-full"
                      >
                        {feature}
                      </span>
                    ))}
                    {userType.features.length > 3 && (
                      <span className="text-[10px] sm:text-xs text-gray-400 dark:text-gray-500 px-1 hidden sm:inline">
                        +{userType.features.length - 3} mas
                      </span>
                    )}
                  </div>

                  {/* Loading indicator */}
                  {loading === userType.type && (
                    <div className="absolute inset-0 bg-white/80 dark:bg-gray-800/80 rounded-2xl flex items-center justify-center" role="status">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 border-2 border-oaxaca-purple border-t-transparent rounded-full animate-spin" aria-hidden="true" />
                        <span className="text-oaxaca-purple font-medium text-sm sm:text-base">{t('entering')}</span>
                      </div>
                    </div>
                  )}
                </button>
              ))}
            </div>
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

export default LandingView;
