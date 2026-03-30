import React, { useState } from 'react';
import { Home, Bus, Camera, Search, User, ShoppingBag, Radio, Map, Ticket, MessageCircle, Users, CalendarDays, Menu, MoreHorizontal, X, ChevronRight } from 'lucide-react';
import { ViewState } from '../types';
import { useAuth } from '../contexts/AuthContext';
import haptics from '../services/haptics';
import NotificationBell from './ui/NotificationBell';
import NotificationsDropdown from './NotificationsDropdown';
import ThemeToggle from './ui/ThemeToggle';

interface NavigationProps {
  currentView: ViewState;
  setView: (view: ViewState) => void;
  onUserProfile?: (userId: string) => void;
  variant?: 'bottom' | 'sidebar';
  onToggleSidebar?: () => void;
  sidebarVisible?: boolean;
  sidebarStyle?: 'amarillo' | 'verde' | 'rojo' | 'azul' | 'morado' | 'blanco';
  setSidebarStyle?: (style: 'amarillo' | 'verde' | 'rojo' | 'azul' | 'morado' | 'blanco') => void;
  onOpenMobileSidebar?: () => void;
}

const Navigation: React.FC<NavigationProps> = ({ currentView, setView, onUserProfile, variant = 'bottom', onToggleSidebar, sidebarVisible, sidebarStyle = 'gradient1', setSidebarStyle, onOpenMobileSidebar }) => {
  const { isAuthenticated, user } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  // Main nav items for mobile (4 items + More button)
  const mobileNavItems = [
    { view: ViewState.HOME, icon: '/images/ui/icon_home.png', label: 'Inicio', isImage: true },
    { view: ViewState.PROGRAM, icon: CalendarDays, label: 'Programa' },
    { view: ViewState.TIENDA, icon: '/images/ui/icon_market.png', label: 'Tienda', isImage: true },
    { view: ViewState.PROFILE, icon: User, label: 'Perfil' },
  ];

  // Items shown in desktop sidebar - all main items
  const mainNavItems = [
    { view: ViewState.HOME, icon: '/images/poi_auditorio_guelaguetza.png', label: 'Inicio', isImage: true },
    { view: ViewState.PROGRAM, icon: '/images/poi_auditorio_guelaguetza.png', label: 'Programa', isImage: true },
    { view: ViewState.TIENDA, icon: '/images/product_barro_negro.png', label: 'Tienda', isImage: true },
    { view: ViewState.SEARCH, icon: '/images/poi_santo_domingo.png', label: 'Buscar', isImage: true },
    { view: ViewState.PROFILE, icon: '/images/dance_tehuana.png', label: 'Perfil', isImage: true },
  ];

  // Extra items for sidebar "Explorar" section
  const extraNavItems = [
    { view: ViewState.TRANSPORT, icon: '/images/poi_santo_domingo.png', label: 'BinniBus', isImage: true },
    { view: ViewState.STREAMS, icon: '/images/poi_auditorio_guelaguetza.png', label: 'En Vivo', isImage: true },
    { view: ViewState.SMART_MAP, icon: '/images/poi_monte_alban.png', label: 'Itinerario', isImage: true },
    { view: ViewState.EXPERIENCES, icon: '/images/experience_mezcal_tasting.png', label: 'Tours', isImage: true },
    { view: ViewState.COMMUNITIES, icon: '/images/textil_huipil_istmo.png', label: 'Comunidad', isImage: true },
    { view: ViewState.AR_HOME, icon: '/images/product_alebrije.png', label: 'AR Guelaguetza', isImage: true },
    { view: ViewState.CHAT, icon: '/images/dance_pluma.png', label: 'GuelaBot', isImage: true },
  ];

  // All extra items for mobile "More" menu (includes Search)
  const moreMenuItems = [
    { view: ViewState.SEARCH, icon: Search, label: 'Buscar' },
    ...extraNavItems,
  ];

  const handleNavClick = (view: ViewState) => {
    haptics.tap();
    setView(view);
  };

  // Sidebar gradient styles
  const sidebarGradients = {
    amarillo: '',
    verde: '',
    rojo: '',
    azul: '',
    morado: '',
    blanco: 'bg-white dark:bg-gray-900',
  };

  const textColors = {
    amarillo: 'text-black',
    verde: 'text-black',
    rojo: 'text-white',
    azul: 'text-white',
    morado: 'text-white',
    blanco: 'text-gray-900 dark:text-white',
  };

  const getSidebarBgImage = (style: string) => {
    const images: Record<string, string> = {
      amarillo: '/images/amarillo.png',
      verde: '/images/verde.png',
      rojo: '/images/rojo.png',
      azul: '/images/azul.png',
      morado: '/images/morado.png',
      blanco: '',
    };
    return images[style] || '';
  };

  // Sidebar variant for tablet/desktop
  if (variant === 'sidebar') {
    const bgImage = getSidebarBgImage(sidebarStyle);
    const isImageBg = bgImage !== '';

    // Collapsed state - show images only
    if (!sidebarVisible) {
      return (
        <aside
          className={`relative flex flex-col w-20 ${sidebarGradients[sidebarStyle]} h-full`}
          role="complementary"
          aria-label="Barra lateral de navegación"
        >
          {bgImage && (
            <img src={bgImage} alt="" className="absolute inset-0 w-full h-full object-cover" />
          )}
          <div className="relative z-10">
            {/* Logo */}
            <div className={`p-4 border-b flex justify-center ${sidebarStyle === 'blanco' ? 'border-gray-200 dark:border-gray-700' : 'border-white/20'}`}>
              <h1 className={`text-2xl font-bold ${textColors[sidebarStyle]}`}>G</h1>
            </div>

            {/* Navigation Icons */}
            <nav className="flex-1 py-4 space-y-2 overflow-y-auto" role="navigation">
              {[...mainNavItems, ...extraNavItems].map((item) => {
                const isActive = currentView === item.view;
                return (
                  <button
                    key={item.view}
                    onClick={() => handleNavClick(item.view)}
                    aria-label={item.label}
                    className={`flex w-full justify-center p-2 rounded-xl transition-all ${isActive
                      ? 'bg-white/20'
                      : 'hover:bg-white/10'
                      }`}
                  >
                    {item.isImage ? (
                      <img
                        src={item.icon as string}
                        alt={item.label}
                        className={`w-10 h-10 rounded-lg object-cover ${isActive ? 'ring-2 ring-white' : ''}`}
                      />
                    ) : (
                      <item.icon size={22} className="text-white" />
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Toggle Button - collapsed state */}
            <div className="absolute -right-3.5 bottom-6 z-10">
              {onToggleSidebar && (
                <button
                  onClick={onToggleSidebar}
                  className="w-7 h-7 rounded-full flex items-center justify-center bg-white dark:bg-gray-800 shadow-md hover:shadow-lg text-gray-700 dark:text-gray-300"
                  aria-label="Mostrar sidebar"
                >
                  <ChevronRight size={14} />
                </button>
              )}
            </div>
          </div>
        </aside>
      );
    }

    // Expanded state
    return (
      <aside
        className={`relative flex flex-col w-64 lg:w-72 ${sidebarGradients[sidebarStyle]} border-r border-gray-200 dark:border-gray-700 h-full`}
        role="complementary"
        aria-label="Barra lateral de navegación"
      >
        <style>{`
          @media (max-width: 768px) {
            aside[aria-label="Barra lateral de navegación"] nav button,
            aside[aria-label="Barra lateral de navegación"] nav a {
              justify-content: flex-start !important;
            }
            aside[aria-label="Barra lateral de navegación"] > div.relative {
              height: 100% !important;
              max-height: 100vh !important;
              overflow: visible !important;
            }
            aside[aria-label="Barra lateral de navegación"] > div.relative > nav {
              flex: 1 !important;
              min-height: 0 !important;
              overflow-y: auto !important;
            }
          }
        `}</style>
        {bgImage && (
          <img src={bgImage} alt="" className="absolute inset-0 w-full h-full object-cover" />
        )}
        
        {/* Scrollable content area */}
        <div className="relative z-10 flex flex-col h-full overflow-hidden">
          {/* Logo/Brand */}
          <div className="p-4 border-b border-gray-100/20 dark:border-gray-800/50 flex-shrink-0">
            <h1 className={`text-xl font-bold ${textColors[sidebarStyle]}`}>Guelaguetza</h1>
            <p className={`text-xs ${sidebarStyle === 'amarillo' || sidebarStyle === 'verde' ? 'text-black/70' : sidebarStyle === 'blanco' ? 'text-gray-500 dark:text-gray-400' : 'text-white/70'}`}>Connect 2025</p>
          </div>

          {/* Main Navigation - Scrollable */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto" role="navigation" aria-label="Navegación principal">
            {sidebarVisible && (
              <p className={`text-xs font-semibold uppercase tracking-wider mb-3 px-3 ${textColors[sidebarStyle]} opacity-60`} aria-hidden="true">Principal</p>
            )}
            {mainNavItems.map((item) => {
              const isActive = currentView === item.view;
              const isProfile = item.view === ViewState.PROFILE;

              return (
                <button
                  key={item.view}
                  onClick={() => handleNavClick(item.view)}
                  aria-label={item.label}
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex items-center ${sidebarVisible ? 'gap-3 px-3 py-2.5' : 'justify-center p-2'} w-full rounded-xl transition-all ${isActive
                    ? (sidebarStyle === 'amarillo' || sidebarStyle === 'verde' || sidebarStyle === 'blanco' ? 'bg-black/20 text-black dark:text-white font-medium' : 'bg-white/20 text-white font-medium')
                    : sidebarStyle === 'amarillo' || sidebarStyle === 'verde' || sidebarStyle === 'blanco' ? 'text-black/80 dark:text-white/80 hover:bg-black/10 dark:hover:bg-white/10' : 'text-white/80 hover:bg-white/10'
                    }`}
                >
                  {isProfile && isAuthenticated && user?.faceData ? (
                    <img
                      src={user.faceData}
                      alt="Perfil"
                      className={`${sidebarVisible ? 'w-5 h-5' : 'w-8 h-8'} rounded-full object-cover ${isActive ? 'ring-2 ring-oaxaca-pink' : ''}`}
                    />
                  ) : item.isImage ? (
                    <img
                      src={item.icon as string}
                      alt={item.label}
                      className={`${sidebarVisible ? 'w-9 h-9' : 'w-10 h-10'} rounded-lg object-cover shadow-sm ${isActive ? 'ring-2 ring-oaxaca-pink' : ''}`}
                    />
                  ) : (
                    <item.icon size={sidebarVisible ? 20 : 24} strokeWidth={isActive ? 2.5 : 2} aria-hidden="true" />
                  )}
                  {sidebarVisible && <span className="text-sm">{item.label}</span>}
                </button>
              );
            })}

            <div className={`my-4 border-t ${sidebarStyle === 'amarillo' || sidebarStyle === 'verde' ? 'border-black/20' : sidebarStyle === 'blanco' ? 'border-gray-200 dark:border-gray-700' : 'border-white/20'}`} aria-hidden="true" />

            {sidebarVisible && (
              <p className={`text-xs font-semibold uppercase tracking-wider mb-3 px-3 ${textColors[sidebarStyle]} opacity-60`} aria-hidden="true">Explorar</p>
            )}
            {extraNavItems.map((item) => {
              const isActive = currentView === item.view;

              return (
                <button
                  key={item.view}
                  onClick={() => handleNavClick(item.view)}
                  aria-label={item.label}
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex items-center ${sidebarVisible ? 'gap-3 px-3 py-2.5' : 'justify-center p-2'} w-full rounded-xl transition-all ${isActive
                    ? (sidebarStyle === 'amarillo' || sidebarStyle === 'verde' || sidebarStyle === 'blanco' ? 'bg-black/20 text-black dark:text-white font-medium' : 'bg-white/20 text-white font-medium')
                    : sidebarStyle === 'amarillo' || sidebarStyle === 'verde' || sidebarStyle === 'blanco' ? 'text-black/80 dark:text-white/80 hover:bg-black/10 dark:hover:bg-white/10' : 'text-white/80 hover:bg-white/10'
                    }`}
                >
                  {item.isImage ? (
                    <img
                      src={item.icon as string}
                      alt={item.label}
                      className={`${sidebarVisible ? 'w-9 h-9' : 'w-10 h-10'} rounded-lg object-cover shadow-sm ${isActive ? 'ring-2 ring-oaxaca-pink' : 'opacity-80'}`}
                    />
                  ) : (
                    <item.icon size={sidebarVisible ? 20 : 24} strokeWidth={isActive ? 2.5 : 2} aria-hidden="true" />
                  )}
                  {sidebarVisible && <span className="text-sm">{item.label}</span>}
                </button>
              );
            })}
          </nav>

          {/* Theme Toggle & User Info - Fixed at bottom */}
          <div className="p-3 border-t border-gray-100 dark:border-gray-800 space-y-3 flex-shrink-0">
            {/* Theme Toggle */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Tema</span>
              <ThemeToggle variant="dropdown" size="sm" showLabel={false} />
            </div>

            {/* User Info & Notifications */}
            {isAuthenticated && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-oaxaca-pink/20 flex items-center justify-center">
                    {user?.faceData ? (
                      <img src={user.faceData} alt="" className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <User size={20} className="text-oaxaca-pink" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {user?.nombre}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                  </div>
                </div>
                <NotificationBell onClick={() => setShowNotifications(true)} />
              </div>
            )}

            {/* Style selector buttons */}
            {setSidebarStyle && (
              <div className="flex gap-1 justify-center py-2">
                {(['amarillo', 'verde', 'rojo', 'azul', 'morado', 'blanco'] as const).map((style) => (
                  <button
                    key={style}
                    onClick={() => setSidebarStyle(style)}
                    className={`w-5 h-5 rounded-full border-2 transition-all ${
                      sidebarStyle === style ? 'border-gray-800 dark:border-white scale-110' : 'border-gray-400 dark:border-gray-500 opacity-70 hover:opacity-100'
                    } ${
                      style === 'amarillo' ? 'bg-yellow-400' :
                      style === 'verde' ? 'bg-green-500' :
                      style === 'rojo' ? 'bg-red-500' :
                      style === 'azul' ? 'bg-blue-500' :
                      style === 'morado' ? 'bg-purple-500' :
                      'bg-white'
                    }`}
                    aria-label={`Estilo ${style}`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Toggle Button - at bottom on the border */}
        <div className="absolute -right-3.5 bottom-6 z-10">
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className="w-7 h-7 rounded-full flex items-center justify-center bg-white dark:bg-gray-800 shadow-md hover:shadow-lg text-gray-700 dark:text-gray-300"
              aria-label="Ocultar sidebar"
            >
              <ChevronRight size={14} className="rotate-180" />
            </button>
          )}
        </div>
      </aside>
    );
  }

  // Check if current view is in the "More" menu
const isMoreActive = moreMenuItems.some(item => item.view === currentView);

// Bottom variant for mobile
return (
    <>
      {/* More Menu Bottom Sheet */}
      {showMoreMenu && (
        <div
          className="md:hidden fixed inset-0 z-[60]"
          role="dialog"
          aria-modal="true"
          aria-label="Menú de exploración"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
            onClick={() => setShowMoreMenu(false)}
            aria-hidden="true"
          />

          {/* Bottom Sheet */}
          <div className="absolute bottom-0 left-0 right-0 bg-white dark:bg-gray-900 rounded-t-3xl pb-safe animate-slide-up">
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-2" aria-hidden="true">
              <div className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-6 pb-4 border-b border-gray-100 dark:border-gray-800">
              <h3 id="more-menu-title" className="text-lg font-semibold text-gray-900 dark:text-white">Explorar</h3>
              <button
                onClick={() => setShowMoreMenu(false)}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                aria-label="Cerrar menú"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            {/* Menu Grid */}
            <div className="grid grid-cols-4 gap-2 p-4">
              {moreMenuItems.map((item) => {
                const isActive = currentView === item.view;
                return (
                  <button
                    key={item.view}
                    onClick={() => {
                      handleNavClick(item.view);
                      setShowMoreMenu(false);
                    }}
                    className={`flex flex-col items-center justify-center p-3 rounded-2xl transition-all ${isActive
                      ? 'bg-white/20 text-white'
                    : sidebarStyle === 'amarillo' || sidebarStyle === 'verde' ? 'text-black/80 hover:bg-black/10' : 'text-white/80 hover:bg-white/10'
                      }`}
                  >
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-2 ${isActive
                      ? 'bg-oaxaca-pink/20'
                      : 'bg-gray-100 dark:bg-gray-800'
                      }`}>
                      {item.isImage ? (
                        <img
                          src={item.icon as string}
                          alt={item.label}
                          className={`w-6 h-6 rounded-lg object-cover shadow-sm ${isActive ? 'ring-2 ring-oaxaca-pink' : ''}`}
                        />
                      ) : (
                        <item.icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                      )}
                    </div>
                    <span className="text-xs font-medium text-center leading-tight">{item.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Theme Toggle for Mobile */}
            <div className="px-4 pb-4 pt-2 border-t border-gray-100 dark:border-gray-800 mt-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Tema</span>
                <ThemeToggle variant="dropdown" size="sm" showLabel />
              </div>
            </div>
          </div>
        </div>
      )}

      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 pb-safe z-50 transition-colors"
        role="navigation"
        aria-label="Navegación principal"
      >
        <img src="/images/rojo.png" alt="" className="absolute inset-0 w-full h-full object-cover opacity-20" />
        {/* Minimum height of 64px ensures 44px touch targets with some padding */}
        <div className="flex justify-around items-center h-16 sm:h-[68px] relative z-10">
          {mobileNavItems.map((item) => {
            const isActive = currentView === item.view;
            const isProfile = item.view === ViewState.PROFILE;

            return (
              <button
                key={item.view}
                onClick={() => handleNavClick(item.view)}
                aria-label={item.label}
                aria-current={isActive ? 'page' : undefined}
                className={`flex flex-col items-center justify-center w-full h-full min-h-[48px] transition-colors duration-200 focus-visible:bg-gray-100 dark:focus-visible:bg-gray-800 focus-visible:outline-none ${isActive ? 'text-oaxaca-pink' : 'text-gray-500 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
                  }`}
              >
                {isProfile && isAuthenticated && user?.faceData ? (
                  <div className="relative">
                    <img
                      src={user.faceData}
                      alt="Perfil"
                      className={`w-6 h-6 rounded-full object-cover ${isActive ? 'ring-2 ring-oaxaca-pink' : ''}`}
                    />
                  </div>
                ) : isProfile ? (
                  <div className="relative">
                    <item.icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                  </div>
                ) : item.isImage ? (
                  <img
                    src={item.icon as string}
                    alt={item.label}
                    className={`w-6 h-6 rounded-lg object-cover shadow-sm ${isActive ? 'ring-2 ring-oaxaca-pink' : ''}`}
                  />
                ) : (
                  <item.icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                )}
                <span className="text-[10px] font-medium mt-1">{item.label}</span>
              </button>
            );
          })}

          {/* Menu Button - Opens mobile sidebar */}
          <button
            onClick={() => {
              haptics.tap();
              onOpenMobileSidebar?.();
            }}
            aria-label="Abrir menú"
            className={`flex flex-col items-center justify-center w-full h-full min-h-[48px] transition-colors duration-200 focus-visible:bg-gray-100 dark:focus-visible:bg-gray-800 focus-visible:outline-none ${isMoreActive ? 'text-oaxaca-pink' : 'text-gray-500 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
              }`}
          >
            <Menu size={24} strokeWidth={isMoreActive ? 2.5 : 2} aria-hidden="true" />
            <span className="text-[10px] sm:text-xs font-medium mt-1">Menú</span>
          </button>
        </div>

        {/* Notification Bell - floating above nav */}
        {isAuthenticated && (
          <div className="absolute -top-10 right-4">
            <NotificationBell onClick={() => setShowNotifications(true)} />
          </div>
        )}
      </nav>

      {/* Notifications Dropdown */}
      <NotificationsDropdown
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
        onUserProfile={onUserProfile}
      />
    </>
  );
};

export default Navigation;
