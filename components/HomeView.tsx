import React, { useState, useEffect } from 'react';
import { MapPin, Calendar, PlayCircle, Camera, X, ChevronRight, Utensils, Wine, Coffee, IceCream, MessageCircle, Sparkles, ShoppingBag, Ticket, Search, Users, CalendarDays, User, Heart, ChevronLeft, Star, Navigation, ExternalLink, Clock } from 'lucide-react';
import { ViewState } from '../types';
import { getWishlistCount } from '../services/marketplace';
import { useLanguage, LanguageSelector } from '../contexts/LanguageContext';
import {
  GastronomyCategory,
  GastronomyPlace,
  GASTRONOMY_PLACES,
  GASTRONOMY_CATEGORIES,
  getCategoryLabel,
  getCategoryColor,
  getGoogleMapsUrl,
  getGoogleMapsDirectionsUrl,
} from '../services/gastronomy';
import GradientPlaceholder, { type PlaceholderVariant } from './ui/GradientPlaceholder';

// Image assets mapping
// Image assets mapping
const HERO_IMAGES = [
  '/images/dance_pluma.png',
  '/images/dance_flor_de_pina.png',
  '/images/poi_auditorio_guelaguetza.png'
];

interface HomeViewProps {
  setView: (view: ViewState) => void;
}

const GASTRO_ITEMS: { name: string; desc: string; icon: typeof Utensils; category: GastronomyCategory }[] = [
  { name: 'Tlayudas', desc: 'Tortilla gigante con asiento, frijoles y quesillo', icon: Utensils, category: 'TLAYUDAS' },
  { name: 'Mezcal', desc: 'Destilado artesanal de agave oaxaqueño', icon: Wine, category: 'MEZCAL' },
  { name: 'Chocolate', desc: 'Bebida tradicional de cacao y canela', icon: Coffee, category: 'CHOCOLATE' },
  { name: 'Nieves', desc: 'Helados artesanales de sabores regionales', icon: IceCream, category: 'NIEVES' },
];

interface DiscoverySlide {
  id: string;
  tag: string;
  title: string;
  image: string;
  action: string;
}

const DISCOVER_SLIDES: DiscoverySlide[] = [
  {
    id: 'gastro',
    tag: 'Guía culinaria',
    title: 'Gastronomía',
    image: '/images/gastro_tlayuda_dish.png',
    action: 'gastro',
  },
  {
    id: 'artesanias',
    tag: 'Arte popular',
    title: 'Artesanías',
    image: '/images/product_alebrije.png',
    action: 'tienda',
  },
  {
    id: 'mezcal',
    tag: 'Tradición ancestral',
    title: 'Mezcal',
    image: '/images/experience_mezcal_tasting.png',
    action: 'gastro',
  },
  {
    id: 'danzas',
    tag: 'Folklore vivo',
    title: 'Danzas',
    image: '/images/dance_tehuana.png',
    action: 'programa',
  },
  {
    id: 'naturaleza',
    tag: 'Ecoturismo',
    title: 'Naturaleza',
    image: '/images/poi_hierve_el_agua.png',
    action: 'experiencias',
  },
];

const HomeView: React.FC<HomeViewProps> = ({ setView }) => {
  const { t, greeting } = useLanguage();
  const [showGastroModal, setShowGastroModal] = useState(false);
  const [selectedGastroCategory, setSelectedGastroCategory] = useState<GastronomyCategory | 'ALL'>('ALL');
  const [heroIndex, setHeroIndex] = useState(0);
  const [discoverIndex, setDiscoverIndex] = useState(0);
  const [wishlistCount, setWishlistCount] = useState(0);

  // Filter gastronomy places by selected category
  const filteredPlaces = selectedGastroCategory === 'ALL'
    ? GASTRONOMY_PLACES
    : GASTRONOMY_PLACES.filter(p => p.category === selectedGastroCategory);

  useEffect(() => {
    // Auto-advance hero carousel
    const interval = setInterval(() => {
      setHeroIndex((prev) => (prev + 1) % HERO_IMAGES.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Auto-advance discover carousel (slower - 6 seconds)
    const interval = setInterval(() => {
      setDiscoverIndex((prev) => (prev + 1) % DISCOVER_SLIDES.length);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Load wishlist count
    getWishlistCount().then(setWishlistCount).catch(() => { });
  }, []);

  const nextHero = () => setHeroIndex((prev) => (prev + 1) % HERO_IMAGES.length);
  const prevHero = () => setHeroIndex((prev) => (prev - 1 + HERO_IMAGES.length) % HERO_IMAGES.length);

  return (
    <div className="pb-24 md:pb-8 animate-fade-in">
      {/* Hero Header - Responsive with Carousel */}
      <div className="relative h-72 md:h-96 lg:h-[28rem] md:rounded-b-[2rem] lg:rounded-b-[3rem] overflow-hidden shadow-lg">
        {/* Hero Gradient Carousel */}
        {HERO_IMAGES.map((image, index) => (
          <div
            key={index}
            className={`absolute inset-0 transition-opacity duration-700 ${index === heroIndex ? 'opacity-100' : 'opacity-0'
              }`}
          >
            <img
              src={image}
              alt="Guelaguetza Hero"
              className="w-full h-full object-cover"
            />
          </div>
        ))}

        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/70"></div>

        {/* Carousel Controls */}
        <button
          onClick={prevHero}
          aria-label="Imagen anterior"
          className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/30 hover:bg-black/50 rounded-full text-white transition z-10 hidden md:block"
        >
          <ChevronLeft size={24} aria-hidden="true" />
        </button>
        <button
          onClick={nextHero}
          aria-label="Imagen siguiente"
          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/30 hover:bg-black/50 rounded-full text-white transition z-10 hidden md:block"
        >
          <ChevronRight size={24} aria-hidden="true" />
        </button>

        {/* Carousel Indicators */}
        <div className="absolute bottom-20 md:bottom-24 left-1/2 -translate-x-1/2 flex gap-2 z-10">
          {HERO_IMAGES.map((_, index) => (
            <button
              key={index}
              onClick={() => setHeroIndex(index)}
              className={`w-2 h-2 rounded-full transition-all ${index === heroIndex ? 'bg-white w-6' : 'bg-white/50 hover:bg-white/70'
                }`}
            />
          ))}
        </div>

        {/* Top Navigation Bar */}
        <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-3 md:px-6">
          <div className="flex items-center gap-3">
            <div className="text-white font-bold text-lg drop-shadow-lg">GC</div>
            {/* Language Selector */}
            <LanguageSelector compact />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setView(ViewState.SEARCH)}
              className="p-2 rounded-full bg-black/20 hover:bg-black/40 transition text-white backdrop-blur-sm"
              aria-label={t('search')}
            >
              <Search size={20} />
            </button>
            <button
              onClick={() => setView(ViewState.WISHLIST)}
              className="p-2 rounded-full bg-black/20 hover:bg-black/40 transition text-white backdrop-blur-sm relative"
              aria-label="Lista de deseos"
            >
              <Heart size={20} />
              {wishlistCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-oaxaca-pink text-white text-[10px] rounded-full flex items-center justify-center font-bold border border-white">
                  {wishlistCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setView(ViewState.EVENTS)}
              className="p-2 rounded-full bg-black/20 hover:bg-black/40 transition text-white backdrop-blur-sm relative"
              aria-label={t('events')}
            >
              <CalendarDays size={20} />
              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-oaxaca-yellow rounded-full border border-white"></span>
            </button>
            <button
              onClick={() => setView(ViewState.PROFILE)}
              className="p-2 rounded-full bg-black/20 hover:bg-black/40 transition text-white backdrop-blur-sm"
              aria-label={t('profile')}
            >
              <User size={20} />
            </button>
          </div>
        </div>

        {/* Hero Content */}
        <div className="absolute bottom-6 left-6 right-6 md:bottom-10 md:left-10 text-white">
          <p className="text-sm md:text-base font-semibold uppercase tracking-wider mb-1 text-oaxaca-yellow drop-shadow-lg">{t('july_dates')}</p>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold leading-tight drop-shadow-lg">{greeting}! Guelaguetza</h1>
          <p className="text-white/90 text-sm md:text-base lg:text-lg mt-2 max-w-xl drop-shadow">{t('welcome_message')} {t('in_your_pocket')}.</p>
        </div>
      </div>

      {/* Main Content Grid - Responsive */}
      <div className="px-4 md:px-6 lg:px-8">
        {/* Next Event Card */}
        <div className="-mt-8 relative z-10 max-w-3xl">
          <div
            onClick={() => setView(ViewState.PROGRAM)}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 md:p-5 flex items-center justify-between border-l-4 border-oaxaca-yellow cursor-pointer hover:shadow-lg transition active:scale-[0.98]"
          >
            <div>
              <h2 className="font-bold text-gray-800 dark:text-gray-100 md:text-lg">{t('next_event')}</h2>
              <p className="text-sm md:text-base text-gray-500 dark:text-gray-400">{t('parade')} • 17:00</p>
            </div>
            <button className="bg-oaxaca-purple text-white p-2 md:p-3 rounded-full hover:bg-opacity-90 transition">
              <PlayCircle size={24} />
            </button>
          </div>
        </div>

        {/* Two Column Layout for Desktop */}
        <div className="mt-6 lg:grid lg:grid-cols-3 lg:gap-8">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2">
            {/* Quick Actions Grid - Responsive */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div
                onClick={() => setView(ViewState.TRANSPORT)}
                className="bg-white dark:bg-gray-800 p-4 md:p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 active:scale-95 transition cursor-pointer hover:shadow-lg hover:-translate-y-0.5"
              >
                <img src="/images/ui/icon_transport.png" alt="Transporte" className="w-14 h-14 md:w-16 md:h-16 object-contain mb-3 drop-shadow-md" />
                <h3 className="font-bold text-gray-800 dark:text-gray-100">{t('transport')}</h3>
                <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-1">{t('safe_routes')}</p>
              </div>

              <div
                onClick={() => setView(ViewState.AR_SCANNER)}
                className="bg-white dark:bg-gray-800 p-4 md:p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 active:scale-95 transition cursor-pointer hover:shadow-lg hover:-translate-y-0.5"
              >
                <img src="/images/ui/icon_ar.png" alt="AR Guelaguetza" className="w-14 h-14 md:w-16 md:h-16 object-contain mb-3 drop-shadow-md" />
                <h3 className="font-bold text-gray-800 dark:text-gray-100">{t('ar_museum')}</h3>
                <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-1">{t('discover_magic')}</p>
              </div>

              <div
                onClick={() => {
                  setView(ViewState.AR_SCANNER);
                }}
                className="bg-gradient-to-r from-purple-600 to-violet-500 p-4 md:p-5 rounded-2xl shadow-lg border-2 border-purple-400 active:scale-95 transition cursor-pointer hover:shadow-xl hover:-translate-y-1"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl md:text-3xl">🦌</span>
                  <span className="bg-white text-purple-600 text-xs font-bold px-2 py-1 rounded-full">3D</span>
                </div>
                <h3 className="font-bold text-white text-sm md:text-lg">Alebrijes 3D</h3>
                <p className="text-purple-100 text-xs mt-1">Ve modelos AR</p>
                <div className="mt-2 flex items-center gap-1 text-white text-xs font-semibold">
                  <span>Toca aquí</span>
                  <ChevronRight className="w-3 h-3 md:w-4 md:h-4" />
                </div>
              </div>

              <div
                onClick={() => setView(ViewState.STORIES)}
                className="bg-white dark:bg-gray-800 p-4 md:p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 active:scale-95 transition cursor-pointer hover:shadow-lg hover:-translate-y-0.5"
              >
                <img src="/images/ui/icon_home.png" alt="Historias" className="w-14 h-14 md:w-16 md:h-16 object-contain mb-3 drop-shadow-md" />
                <h3 className="font-bold text-gray-800 dark:text-gray-100">{t('stories')}</h3>
                <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-1">{t('live_moments')}</p>
              </div>

              <div
                onClick={() => setView(ViewState.PROGRAM)}
                className="bg-white dark:bg-gray-800 p-4 md:p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 active:scale-95 transition cursor-pointer hover:shadow-lg hover:-translate-y-0.5"
              >
                <img src="/images/ui/icon_events.png" alt="Programa" className="w-14 h-14 md:w-16 md:h-16 object-contain mb-3 drop-shadow-md" />
                <h3 className="font-bold text-gray-800 dark:text-gray-100">{t('program')}</h3>
                <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-1">{t('complete_calendar')}</p>
              </div>
            </div>

            {/* Phase 6 Features - Responsive */}
            <div className="mt-6 md:mt-8">
              <h2 className="font-bold text-lg md:text-xl mb-4 text-gray-800 dark:text-gray-100">{t('new_experiences')}</h2>
              <div className="grid grid-cols-4 md:grid-cols-4 gap-3 md:gap-4">
                <div
                  onClick={() => setView(ViewState.TIENDA)}
                  className="flex flex-col items-center p-3 md:p-4 bg-oaxaca-yellow-light dark:bg-oaxaca-yellow/20 rounded-2xl cursor-pointer hover:bg-oaxaca-yellow/30 transition active:scale-95"
                >
                  <img src="/images/ui/icon_market.png" alt="Tienda" className="w-11 h-11 md:w-14 md:h-14 object-contain mb-2 drop-shadow-sm" />
                  <span className="text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300">{t('shop')}</span>
                </div>

                <div
                  onClick={() => setView(ViewState.STREAMS)}
                  className="flex flex-col items-center p-3 md:p-4 bg-red-50 dark:bg-red-900/20 rounded-2xl cursor-pointer hover:bg-red-100 transition active:scale-95"
                >
                  <img src="/images/ui/icon_live.png" alt="En Vivo" className="w-11 h-11 md:w-14 md:h-14 object-contain mb-2 drop-shadow-sm" />
                  <span className="text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300">{t('streams')}</span>
                </div>

                <div
                  onClick={() => setView(ViewState.EXPERIENCES)}
                  className="flex flex-col items-center p-3 md:p-4 bg-oaxaca-purple-light dark:bg-oaxaca-purple/20 rounded-2xl cursor-pointer hover:bg-oaxaca-purple/30 transition active:scale-95"
                >
                  <img src="/images/ui/icon_events.png" alt="Tours" className="w-11 h-11 md:w-14 md:h-14 object-contain mb-2 drop-shadow-sm" />
                  <span className="text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300">{t('tours')}</span>
                </div>

                <div
                  onClick={() => setView(ViewState.SMART_MAP)}
                  className="flex flex-col items-center p-3 md:p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl cursor-pointer hover:bg-emerald-100 transition active:scale-95"
                >
                  <img src="/images/ui/icon_plan.png" alt="Planificar" className="w-11 h-11 md:w-14 md:h-14 object-contain mb-2 drop-shadow-sm" />
                  <span className="text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300">{t('plan')}</span>
                </div>
              </div>
            </div>

            {/* Community Features - Events & Communities */}
            <div className="mt-6 md:mt-8">
              <h2 className="font-bold text-lg md:text-xl mb-4 text-gray-800 dark:text-gray-100">{t('community')}</h2>
              <div className="grid grid-cols-2 gap-4">
                <div
                  onClick={() => setView(ViewState.EVENTS)}
                  className="bg-gradient-to-br from-oaxaca-pink to-oaxaca-purple p-4 md:p-5 rounded-xl shadow-md cursor-pointer hover:shadow-lg transition active:scale-[0.98] text-white"
                >
                  <img src="/images/ui/icon_events.png" alt="Eventos" className="w-12 h-12 md:w-14 md:h-14 object-contain mb-3 drop-shadow-lg" />
                  <h3 className="font-bold">{t('events')}</h3>
                  <p className="text-xs md:text-sm text-white/80 mt-1">{t('complete_calendar')}</p>
                </div>

                <div
                  onClick={() => setView(ViewState.COMMUNITIES)}
                  className="bg-gradient-to-br from-oaxaca-purple to-oaxaca-pink p-4 md:p-5 rounded-xl shadow-md cursor-pointer hover:shadow-lg transition active:scale-[0.98] text-white"
                >
                  <img src="/images/ui/icon_community.png" alt="Comunidades" className="w-12 h-12 md:w-14 md:h-14 object-contain mb-3 drop-shadow-lg" />
                  <h3 className="font-bold">{t('communities')}</h3>
                  <p className="text-xs md:text-sm text-white/80 mt-1">{t('community_groups')}</p>
                </div>
              </div>
            </div>

            {/* Featured Banner - Discover Oaxaca Carousel */}
            <div className="mt-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-lg md:text-xl text-gray-800 dark:text-gray-100">{t('discover_oaxaca')}</h2>
                <div className="flex gap-1.5">
                  {DISCOVER_SLIDES.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setDiscoverIndex(index)}
                      className={`w-2 h-2 rounded-full transition-all ${index === discoverIndex ? 'bg-oaxaca-pink w-5' : 'bg-gray-300 dark:bg-gray-600 hover:bg-gray-400'
                        }`}
                      aria-label={`Ir a slide ${index + 1}`}
                    />
                  ))}
                </div>
              </div>
              <div
                onClick={() => {
                  const currentSlide = DISCOVER_SLIDES[discoverIndex];
                  if (currentSlide.action === 'gastro') {
                    setShowGastroModal(true);
                  } else if (currentSlide.action === 'tienda') {
                    setView(ViewState.TIENDA);
                  } else if (currentSlide.action === 'programa') {
                    setView(ViewState.PROGRAM);
                  } else if (currentSlide.action === 'experiencias') {
                    setView(ViewState.EXPERIENCES);
                  }
                }}
                className="relative rounded-xl overflow-hidden h-40 md:h-48 lg:h-56 shadow-md cursor-pointer hover:shadow-lg transition active:scale-[0.98]"
              >
                {/* Carousel Gradients */}
                {DISCOVER_SLIDES.map((slide, index) => (
                  <div
                    key={slide.id}
                    className={`absolute inset-0 transition-opacity duration-1000 ${index === discoverIndex ? 'opacity-100' : 'opacity-0'
                      }`}
                  >
                    <img
                      src={slide.image}
                      alt={slide.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
                <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-transparent flex items-center">
                  <div className="pl-6 md:pl-8">
                    {/* Tag with fade animation */}
                    {DISCOVER_SLIDES.map((slide, index) => (
                      <p
                        key={`tag-${slide.id}`}
                        className={`text-oaxaca-yellow text-xs md:text-sm font-semibold uppercase tracking-wider transition-opacity duration-700 ${index === discoverIndex ? 'opacity-100' : 'opacity-0 absolute'
                          }`}
                      >
                        {slide.tag}
                      </p>
                    ))}
                    {/* Title with fade animation */}
                    {DISCOVER_SLIDES.map((slide, index) => (
                      <p
                        key={`title-${slide.id}`}
                        className={`font-bold text-2xl md:text-3xl lg:text-4xl text-white transition-opacity duration-700 ${index === discoverIndex ? 'opacity-100' : 'opacity-0 absolute'
                          }`}
                      >
                        {slide.title}
                      </p>
                    ))}
                    <div className="mt-2 flex items-center gap-1 text-white/80 text-xs md:text-sm">
                      <span>Explorar</span>
                      <ChevronRight size={14} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Sidebar Content (Desktop Only) */}
          <div className="hidden lg:block">
            <div className="sticky top-4 space-y-6">
              {/* Quick Stats Card */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5">
                <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-4">{t('festival_numbers')}</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 dark:text-gray-400">{t('delegations')}</span>
                    <span className="font-bold text-oaxaca-pink">8 {t('regions')}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 dark:text-gray-400">{t('events')}</span>
                    <span className="font-bold text-oaxaca-purple">50+</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 dark:text-gray-400">{t('artisans')}</span>
                    <span className="font-bold text-oaxaca-yellow">200+</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 dark:text-gray-400">{t('expected_visitors')}</span>
                    <span className="font-bold text-emerald-500">100k+</span>
                  </div>
                </div>
              </div>

              {/* GuelaBot Card */}
              <div className="bg-gradient-to-br from-oaxaca-purple to-oaxaca-pink rounded-xl p-5 text-white">
                <div className="flex items-center gap-3 mb-3">
                  <div className="bg-white/20 p-2 rounded-full">
                    <MessageCircle size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold">{t('guelabot')}</h3>
                    <p className="text-xs text-white/70">{t('virtual_assistant')}</p>
                  </div>
                </div>
                <p className="text-sm text-white/90 mb-4">{t('ask_about')}</p>
                <button
                  onClick={() => setView(ViewState.CHAT)}
                  className="w-full bg-white text-oaxaca-purple font-medium py-2 rounded-lg hover:bg-white/90 transition"
                >
                  {t('start_chat')}
                </button>
              </div>

              {/* Gastronomy Quick Links */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5">
                <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-4">{t('gastronomy')}</h3>
                <div className="space-y-3">
                  {GASTRO_ITEMS.map((item, index) => (
                    <div
                      key={index}
                      onClick={() => {
                        setSelectedGastroCategory(item.category);
                        setShowGastroModal(true);
                      }}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition"
                    >
                      <div className="bg-oaxaca-yellow/20 p-2 rounded-full">
                        <item.icon size={16} className="text-oaxaca-purple" />
                      </div>
                      <span className="text-sm text-gray-700 dark:text-gray-300">{item.name}</span>
                      <ChevronRight size={14} className="ml-auto text-gray-400" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Gastronomy Modal - Enhanced with real places */}
      {showGastroModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg max-h-[85vh] overflow-hidden animate-in slide-in-from-bottom duration-300">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-oaxaca-purple to-oaxaca-pink p-4 text-white">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-bold text-lg">{t('flavors_of_oaxaca')}</h3>
                  <p className="text-xs text-white/70">{t('curated_by_locals')}</p>
                </div>
                <button
                  onClick={() => {
                    setShowGastroModal(false);
                    setSelectedGastroCategory('ALL');
                  }}
                  aria-label="Cerrar"
                  className="p-1 rounded-full hover:bg-white/20 transition"
                >
                  <X size={24} aria-hidden="true" />
                </button>
              </div>

              {/* Category Filter Tabs */}
              <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
                <button
                  onClick={() => setSelectedGastroCategory('ALL')}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition ${selectedGastroCategory === 'ALL'
                    ? 'bg-white text-oaxaca-purple'
                    : 'bg-white/20 text-white hover:bg-white/30'
                    }`}
                >
                  {t('all_categories')}
                </button>
                {GASTRO_ITEMS.map((item) => (
                  <button
                    key={item.category}
                    onClick={() => setSelectedGastroCategory(item.category)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition flex items-center gap-1.5 ${selectedGastroCategory === item.category
                      ? 'bg-white text-oaxaca-purple'
                      : 'bg-white/20 text-white hover:bg-white/30'
                      }`}
                  >
                    <item.icon size={12} />
                    {item.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Places List */}
            <div className="p-4 space-y-4 overflow-y-auto max-h-[55vh]">
              {filteredPlaces.map((place) => (
                <div
                  key={place.id}
                  className="bg-gray-50 dark:bg-gray-700/50 rounded-xl overflow-hidden border border-gray-100 dark:border-gray-600"
                >
                  {/* Place Image and Info */}
                  <div className="flex gap-3 p-3">
                    <div className="relative flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden">
                      <img
                        src={place.imageUrl}
                        alt={place.name}
                        className="w-full h-full object-cover saturate-[1.2]"
                      />
                      {/* Category Badge */}
                      <div
                        className="absolute bottom-0 left-0 right-0 py-0.5 text-center text-[9px] font-medium text-white"
                        style={{ backgroundColor: getCategoryColor(place.category) }}
                      >
                        {getCategoryLabel(place.category)}
                      </div>
                      {/* Reservation Badge */}
                      {place.requiresReservation && (
                        <div className="absolute top-1 right-1 bg-oaxaca-yellow p-0.5 rounded">
                          <Clock size={10} className="text-white" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-gray-900 dark:text-gray-100 text-sm leading-tight">
                        {place.name}
                      </h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-1">
                        <MapPin size={10} />
                        {place.address}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 italic">
                        "{place.vibe}"
                      </p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-xs font-medium text-oaxaca-yellow dark:text-oaxaca-yellow">
                          {place.priceRange}
                        </span>
                        {place.requiresReservation && (
                          <span className="text-[10px] bg-oaxaca-yellow-light dark:bg-oaxaca-yellow/20 text-oaxaca-yellow dark:text-oaxaca-yellow px-1.5 py-0.5 rounded">
                            Reservar
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Must Try Section */}
                  <div className="px-3 pb-2">
                    <div className="flex items-start gap-1.5 text-xs">
                      <Star size={12} className="text-oaxaca-yellow fill-oaxaca-yellow flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="font-medium text-gray-700 dark:text-gray-300">{t('must_try')}: </span>
                        <span className="text-gray-600 dark:text-gray-400">{place.mustTry}</span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex border-t border-gray-200 dark:border-gray-600">
                    <a
                      href={getGoogleMapsUrl(place)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 transition"
                    >
                      <ExternalLink size={12} />
                      {t('view_in_maps')}
                    </a>
                    <div className="w-px bg-gray-200 dark:bg-gray-600" />
                    <a
                      href={getGoogleMapsDirectionsUrl(place)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-oaxaca-purple dark:text-oaxaca-yellow hover:bg-oaxaca-purple-light dark:hover:bg-oaxaca-purple/20 transition"
                    >
                      <Navigation size={12} />
                      {t('how_to_get_there')}
                    </a>
                  </div>
                </div>
              ))}

              {/* Empty State */}
              {filteredPlaces.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-gray-500 dark:text-gray-400">{t('no_places_category')}</p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
              <button
                onClick={() => {
                  setShowGastroModal(false);
                  setSelectedGastroCategory('ALL');
                  setView(ViewState.CHAT);
                }}
                className="w-full py-3 bg-oaxaca-pink text-white rounded-xl font-medium hover:bg-opacity-90 transition flex items-center justify-center gap-2"
              >
                <MessageCircle size={18} aria-hidden="true" />
                {t('ask_guelabot')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating GuelaBot Button - Mobile Only */}
      <button
        onClick={() => setView(ViewState.CHAT)}
        aria-label={t('ask_guelabot_short')}
        className="md:hidden fixed bottom-24 right-4 bg-oaxaca-purple text-white p-4 rounded-full shadow-lg hover:bg-oaxaca-purple/90 transition-all hover:scale-110 active:scale-95 z-40 group"
      >
        <div className="relative">
          <MessageCircle size={24} aria-hidden="true" />
          <Sparkles size={12} className="absolute -top-1 -right-1 text-oaxaca-yellow" aria-hidden="true" />
        </div>
        <span className="absolute right-full mr-2 top-1/2 -translate-y-1/2 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 text-xs font-medium px-3 py-1.5 rounded-lg shadow-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
          {t('ask_guelabot_short')}
        </span>
      </button>
    </div>
  );
};

export default HomeView;
