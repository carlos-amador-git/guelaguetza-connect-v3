import React, { useState, useEffect, lazy, Suspense, useRef } from 'react';
import Navigation from './components/Navigation';
import PageTransition from './components/ui/PageTransition';
import HomeView from './components/HomeView';
import TransportView from './components/TransportView';
import StoriesView from './components/StoriesView';
import ChatAssistant from './components/ChatAssistant';
import ProgramView from './components/ProgramView';
import LoginView from './components/LoginView';
import RegisterView from './components/RegisterView';
import ProfileView from './components/ProfileView';
import UserProfileView from './components/UserProfileView';
import BadgesView from './components/BadgesView';
import LeaderboardView from './components/LeaderboardView';
import DirectMessagesView from './components/DirectMessagesView';
import DirectChatView from './components/DirectChatView';
import SearchView from './components/SearchView';
import EventsView from './components/EventsView';
import EventDetailView from './components/EventDetailView';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import MetricsDashboard from './components/admin/MetricsDashboard';
import CommunitiesView from './components/CommunitiesView';
import CommunityDetailView from './components/CommunityDetailView';
// Phase 6 components
import ExperiencesView from './components/ExperiencesView';
import ExperienceDetailView from './components/ExperienceDetailView';
import MyBookingsView from './components/MyBookingsView';
import { ARPointDetailView } from './components/ar/ARPointDetailView';
import { ARHomeView } from './components/ar/ARHomeView';
import { QuestView } from './components/ar/QuestView';
import VitrinaArtesanias, { type VitrinaSection } from './components/ar/vitrina/VitrinaArtesanias';
import VitrinaDetalle from './components/ar/vitrina/VitrinaDetalle';
import ARDirectView from './components/ar/vitrina/ARDirectView';
import TiendaView from './components/TiendaView';
import ProductDetailView from './components/ProductDetailView';
import WishlistView from './components/WishlistView';
import StreamsView from './components/StreamsView';
import StreamWatchView from './components/StreamWatchView';
import OfflineIndicator from './components/OfflineIndicator';
import UpdatePrompt from './components/UpdatePrompt';
import NotificationPrompt from './components/NotificationPrompt';
import Onboarding from './components/Onboarding';
import DemoUserSelector from './components/DemoUserSelector';
// Landing and role-specific views
import LandingView from './components/LandingView';
import SellerDashboard from './components/SellerDashboard';
import SmartMapView from './components/SmartMapView';
import { ViewState } from './types';
import { Eye } from 'lucide-react';
import { Participant } from './services/dm';
import { useAuth } from './contexts/AuthContext';

// Lazy load ARScanner for code splitting
const ARScanner = lazy(() => import('./components/ARScanner'));

// ErrorBoundary catches unhandled render errors and shows a recoverable fallback UI.
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  state = { hasError: false, error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-8 text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Algo salió mal</h2>
          <p className="text-gray-600 mb-4">{this.state.error?.message}</p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-4 py-2 bg-oaxaca-red text-white rounded-lg"
          >
            Reintentar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const App: React.FC = () => {
  const { isAuthenticated, isDemoMode, user } = useAuth();

  // Detect QR code hash routing: #/ar/<modelId> opens AR_DIRECT without login
  const initialArModelId = (() => {
    if (typeof window === 'undefined') return null;
    const hash = window.location.hash;
    if (hash.startsWith('#/ar/')) {
      const id = hash.slice('#/ar/'.length).trim();
      return id || null;
    }
    return null;
  })();

  const [currentView, setCurrentView] = useState<ViewState>(
    initialArModelId ? ViewState.AR_DIRECT : ViewState.HOME
  );
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [previousView, setPreviousView] = useState<ViewState>(ViewState.HOME);
  const [showLanding, setShowLanding] = useState(!initialArModelId);
  const [adminViewingAsUser, setAdminViewingAsUser] = useState(false);

  // DM state
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);

  // Events state
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  // Communities state
  const [selectedCommunityId, setSelectedCommunityId] = useState<string | null>(null);

  // Phase 6 state
  const [selectedExperienceId, setSelectedExperienceId] = useState<string | null>(null);
  const [selectedPoiId, setSelectedPoiId] = useState<string | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [selectedStreamId, setSelectedStreamId] = useState<string | null>(null);
  // AR module: selected AR point ID (numeric, stored as string)
  const [selectedArPointId, setSelectedArPointId] = useState<string | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(initialArModelId);
  const [vitrinaSection, setVitrinaSection] = useState<VitrinaSection>('premium');
  // AR module: selected Quest ID
  const [selectedQuestId, setSelectedQuestId] = useState<string | null>(null);

  // Handle user selection from landing - receives role directly to avoid race condition
  const handleUserSelected = (selectedRole?: string) => {
    setShowLanding(false);
    setAdminViewingAsUser(false); // Reset admin view mode
    // Set initial view based on selected role
    const role = selectedRole || user?.role;
    if (role === 'ADMIN') {
      setCurrentView(ViewState.ADMIN);
    } else if (role === 'SELLER' || role === 'HOST') {
      // Both SELLER and HOST (legacy) use the unified SellerDashboard
      setCurrentView(ViewState.SELLER_DASHBOARD);
    } else {
      setCurrentView(ViewState.HOME);
    }
  };

  const handleViewUserProfile = (userId: string) => {
    setSelectedUserId(userId);
    setPreviousView(currentView);
    setCurrentView(ViewState.USER_PROFILE);
  };

  const handleOpenChat = (conversationId: string, participant: Participant) => {
    setSelectedConversationId(conversationId);
    setSelectedParticipant(participant);
    setCurrentView(ViewState.DIRECT_CHAT);
  };

  const handleEventDetail = (eventId: string) => {
    setSelectedEventId(eventId);
    setCurrentView(ViewState.EVENT_DETAIL);
  };

  const handleCommunityDetail = (communityId: string) => {
    setSelectedCommunityId(communityId);
    setCurrentView(ViewState.COMMUNITY_DETAIL);
  };

  // Phase 6 handlers
  const handleNavigate = (view: ViewState, data?: unknown) => {
    const d = data as Record<string, unknown> | undefined;
    if (d?.experienceId) setSelectedExperienceId(d.experienceId as string);
    if (d?.poiId) setSelectedPoiId(d.poiId as string);
    if (d?.productId) setSelectedProductId(d.productId as string);
    if (d?.streamId) setSelectedStreamId(d.streamId as string);
    if (d?.vitrinaSection) setVitrinaSection(d.vitrinaSection as VitrinaSection);
    if (d?.questId) setSelectedQuestId(d.questId as string);

    // AR module: store AR point ID and proximity data for ARPointDetailView
    if (d?.pointId !== undefined) {
      const arPointId = String(d.pointId);
      setSelectedArPointId(arPointId);
      // Persist proximity data so ARPointDetailView can read it without prop-drilling
      const proximity = {
        isWithinActivation: !!(d as { isWithinActivation?: boolean }).isWithinActivation,
        distanceMeters: (d as { distanceMeters?: number }).distanceMeters ?? null,
      };
      try {
        sessionStorage.setItem(
          `ar_point_proximity_${arPointId}`,
          JSON.stringify(proximity)
        );
      } catch {
        // sessionStorage unavailable — proximity indicator will be hidden
      }
    }

    setCurrentView(view);
  };

  // Check if onboarding has been completed
  useEffect(() => {
    const completed = localStorage.getItem('guelaguetza_onboarding_completed');
    if (!completed) {
      setShowOnboarding(true);
    }
  }, []);

  const renderView = () => {
    switch (currentView) {
      case ViewState.HOME:
        return <HomeView setView={setCurrentView} />;
      case ViewState.TRANSPORT:
        return <TransportView onBack={() => setCurrentView(ViewState.HOME)} />;
      case ViewState.AR_SCANNER:
        return (
          <Suspense fallback={<div className="flex items-center justify-center h-full">Cargando AR...</div>}>
            <ARScanner onBack={() => setCurrentView(ViewState.HOME)} />
          </Suspense>
        );
      case ViewState.STORIES:
        return <StoriesView onUserProfile={handleViewUserProfile} onBack={() => setCurrentView(ViewState.HOME)} />;
      case ViewState.USER_PROFILE:
        return selectedUserId ? (
          <UserProfileView
            userId={selectedUserId}
            onBack={() => setCurrentView(previousView)}
            onOpenChat={handleOpenChat}
          />
        ) : (
          <StoriesView onUserProfile={handleViewUserProfile} />
        );
      case ViewState.CHAT:
        return <ChatAssistant onBack={() => setCurrentView(ViewState.HOME)} />;
      case ViewState.PROGRAM:
        return <ProgramView onBack={() => setCurrentView(ViewState.HOME)} />;
      case ViewState.LOGIN:
        return <LoginView setView={setCurrentView} />;
      case ViewState.REGISTER:
        return <RegisterView setView={setCurrentView} />;
      case ViewState.PROFILE:
        return <ProfileView setView={setCurrentView} />;
      case ViewState.BADGES:
        return <BadgesView onBack={() => setCurrentView(ViewState.PROFILE)} />;
      case ViewState.LEADERBOARD:
        return (
          <LeaderboardView
            onBack={() => setCurrentView(ViewState.PROFILE)}
            onUserProfile={handleViewUserProfile}
          />
        );
      case ViewState.DIRECT_MESSAGES:
        return (
          <DirectMessagesView
            onBack={() => setCurrentView(ViewState.PROFILE)}
            onOpenChat={handleOpenChat}
          />
        );
      case ViewState.DIRECT_CHAT:
        return selectedConversationId && selectedParticipant ? (
          <DirectChatView
            conversationId={selectedConversationId}
            participant={selectedParticipant}
            onBack={() => setCurrentView(ViewState.DIRECT_MESSAGES)}
            onUserProfile={handleViewUserProfile}
          />
        ) : (
          <DirectMessagesView
            onBack={() => setCurrentView(ViewState.PROFILE)}
            onOpenChat={handleOpenChat}
          />
        );
      case ViewState.SEARCH:
        return (
          <SearchView
            onBack={() => setCurrentView(ViewState.HOME)}
            onUserProfile={handleViewUserProfile}
          />
        );
      case ViewState.EVENTS:
        return (
          <EventsView
            onBack={() => setCurrentView(ViewState.HOME)}
            onEventDetail={handleEventDetail}
          />
        );
      case ViewState.EVENT_DETAIL:
        return selectedEventId ? (
          <EventDetailView
            eventId={selectedEventId}
            onBack={() => setCurrentView(ViewState.EVENTS)}
          />
        ) : (
          <EventsView
            onBack={() => setCurrentView(ViewState.HOME)}
            onEventDetail={handleEventDetail}
          />
        );
      case ViewState.ANALYTICS:
        return (
          <AnalyticsDashboard
            onBack={() => setCurrentView(ViewState.PROFILE)}
          />
        );
      case ViewState.ADMIN:
        return (
          <MetricsDashboard
            onBack={() => setShowLanding(true)}
            onNavigate={(view: ViewState) => {
              if (view === ViewState.HOME) {
                setAdminViewingAsUser(true);
              }
              setCurrentView(view);
            }}
          />
        );
      case ViewState.SELLER_DASHBOARD:
        return (
          <SellerDashboard
            onBack={() => setShowLanding(true)}
            onNavigate={(view: ViewState) => setCurrentView(view)}
          />
        );
      case ViewState.COMMUNITIES:
        return (
          <CommunitiesView
            onCommunityClick={handleCommunityDetail}
            onBack={() => setCurrentView(ViewState.HOME)}
          />
        );
      case ViewState.COMMUNITY_DETAIL:
        return selectedCommunityId ? (
          <CommunityDetailView
            communityId={selectedCommunityId}
            onBack={() => setCurrentView(ViewState.COMMUNITIES)}
            onUserProfile={handleViewUserProfile}
          />
        ) : (
          <CommunitiesView
            onCommunityClick={handleCommunityDetail}
          />
        );
      // Phase 6: Experiences/Bookings
      case ViewState.EXPERIENCES:
        return (
          <ExperiencesView
            onNavigate={handleNavigate}
            onBack={() => setCurrentView(ViewState.HOME)}
          />
        );
      case ViewState.EXPERIENCE_DETAIL:
        return selectedExperienceId ? (
          <ExperienceDetailView
            experienceId={selectedExperienceId}
            onNavigate={handleNavigate}
            onBack={() => setCurrentView(ViewState.EXPERIENCES)}
          />
        ) : (
          <ExperiencesView
            onNavigate={handleNavigate}
            onBack={() => setCurrentView(ViewState.HOME)}
          />
        );
      case ViewState.MY_BOOKINGS:
        return (
          <MyBookingsView
            onNavigate={handleNavigate}
            onBack={() => setCurrentView(ViewState.EXPERIENCES)}
          />
        );
      // AR Module views
      case ViewState.AR_HOME:
        return (
          <ARHomeView
            onNavigate={handleNavigate}
            onBack={() => setCurrentView(ViewState.HOME)}
          />
        );
      case ViewState.AR_POINT_DETAIL:
        return selectedArPointId ? (
          <ARPointDetailView
            pointId={selectedArPointId}
            onNavigate={handleNavigate}
            onBack={() => setCurrentView(ViewState.AR_HOME)}
          />
        ) : (
          <ARHomeView
            onNavigate={handleNavigate}
            onBack={() => setCurrentView(ViewState.HOME)}
          />
        );
      // Sprint 4.1: Quests
      case ViewState.AR_QUEST:
        return selectedQuestId ? (
          <QuestView
            questId={selectedQuestId}
            onNavigate={handleNavigate}
            onBack={() => setCurrentView(ViewState.AR_HOME)}
          />
        ) : (
          <ARHomeView
            onNavigate={handleNavigate}
            onBack={() => setCurrentView(ViewState.HOME)}
          />
        );
      // AR Vitrina 3D
      case ViewState.AR_VITRINA:
        return (
          <VitrinaArtesanias
            section={vitrinaSection}
            onSelect={(item) => {
              setSelectedItemId(item.id);
              setCurrentView(ViewState.AR_VITRINA_DETALLE);
            }}
            onBack={() => setCurrentView(ViewState.AR_HOME)}
          />
        );
      case ViewState.AR_VITRINA_DETALLE:
        return (
          <VitrinaDetalle
            itemId={selectedItemId ?? undefined}
            onBack={() => setCurrentView(ViewState.AR_VITRINA)}
          />
        );
      case ViewState.SMART_MAP:
        return (
          <SmartMapView
            onBack={() => setCurrentView(ViewState.HOME)}
          />
        );
      // Phase 6: Vitrina Digital (showcase)
      case ViewState.TIENDA:
        return (
          <TiendaView
            onNavigate={handleNavigate}
            onBack={() => setCurrentView(ViewState.HOME)}
          />
        );
      case ViewState.PRODUCT_DETAIL:
        return selectedProductId ? (
          <ProductDetailView
            productId={selectedProductId}
            onNavigate={handleNavigate}
            onBack={() => setCurrentView(ViewState.TIENDA)}
          />
        ) : (
          <TiendaView
            onNavigate={handleNavigate}
            onBack={() => setCurrentView(ViewState.HOME)}
          />
        );
      case ViewState.WISHLIST:
        return (
          <WishlistView
            onNavigate={handleNavigate}
            onBack={() => setCurrentView(ViewState.HOME)}
          />
        );
      // Phase 6: Streaming
      case ViewState.STREAMS:
        return (
          <StreamsView
            onNavigate={handleNavigate}
            onBack={() => setCurrentView(ViewState.HOME)}
          />
        );
      case ViewState.STREAM_WATCH:
        return selectedStreamId ? (
          <StreamWatchView
            streamId={selectedStreamId}
            onNavigate={handleNavigate}
            onBack={() => setCurrentView(ViewState.STREAMS)}
          />
        ) : (
          <StreamsView
            onNavigate={handleNavigate}
            onBack={() => setCurrentView(ViewState.HOME)}
          />
        );
      // QR tourist direct AR — no login required
      case ViewState.AR_DIRECT:
        return (
          <ARDirectView
            modelId={selectedItemId ?? ''}
            onClose={() => {
              window.location.hash = '';
              setCurrentView(ViewState.HOME);
              setShowLanding(true);
            }}
          />
        );
      default:
        return <HomeView setView={setCurrentView} />;
    }
  };

  // Hide navigation on auth screens, user profile, gamification views, and new feature views
  const hideNav = [
    ViewState.LOGIN,
    ViewState.REGISTER,
    ViewState.USER_PROFILE,
    ViewState.BADGES,
    ViewState.LEADERBOARD,
    ViewState.DIRECT_MESSAGES,
    ViewState.DIRECT_CHAT,
    ViewState.SEARCH,
    ViewState.EVENTS,
    ViewState.EVENT_DETAIL,
    ViewState.ANALYTICS,
    ViewState.ADMIN,
    ViewState.SELLER_DASHBOARD,
    ViewState.COMMUNITIES,
    ViewState.COMMUNITY_DETAIL,
    // Phase 6 views
    ViewState.EXPERIENCES,
    ViewState.EXPERIENCE_DETAIL,
    ViewState.MY_BOOKINGS,
    ViewState.SMART_MAP,
    ViewState.TIENDA,
    ViewState.PRODUCT_DETAIL,
    ViewState.STREAMS,
    ViewState.STREAM_WATCH,
    // AR Module views
    ViewState.AR_HOME,
    ViewState.AR_POINT_DETAIL,
    ViewState.AR_QUEST,
    ViewState.AR_VITRINA,
    ViewState.AR_VITRINA_DETALLE,
    // QR tourist direct AR — fullscreen, no nav
    ViewState.AR_DIRECT,
  ].includes(currentView);

  // QR hash route: render AR view immediately, bypass everything else
  if (currentView === ViewState.AR_DIRECT && selectedItemId) {
    return (
      <ARDirectView
        modelId={selectedItemId}
        onClose={() => {
          window.location.hash = '';
          setCurrentView(ViewState.HOME);
          setShowLanding(true);
        }}
      />
    );
  }

  // Show landing page if not authenticated or showLanding is true
  if (showLanding) {
    return <LandingView onUserSelected={handleUserSelected} />;
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-950 font-sans transition-colors">
      {/* Skip to main content link for keyboard/screen reader users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-white focus:text-gray-900 focus:rounded-lg focus:shadow-lg"
      >
        Saltar al contenido principal
      </a>

      {/* Demo Mode Indicator */}
      {isDemoMode && !adminViewingAsUser && (
        <div className="fixed top-0 left-0 right-0 bg-gradient-to-r from-oaxaca-sky to-oaxaca-purple text-white text-xs py-1.5 px-4 z-50 flex items-center justify-between">
          <span className="hidden sm:inline">Modo Demo: {user?.nombre}</span>
          <span className="sm:hidden">Demo</span>
          <DemoUserSelector
            compact
            onUserChange={(type) => {
              // Map demo type to role and navigate
              const roleMap: Record<string, string> = {
                user: 'USER',
                seller: 'SELLER',
                admin: 'ADMIN',
              };
              handleUserSelected(roleMap[type]);
            }}
          />
        </div>
      )}

      {/* Admin Viewing as User Banner */}
      {adminViewingAsUser && user?.role === 'ADMIN' && (
        <div className="fixed top-0 left-0 right-0 bg-gradient-to-r from-oaxaca-purple to-oaxaca-pink text-white text-xs py-2 px-4 z-50 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Eye size={14} />
            <span className="hidden sm:inline">Modo Vista de Usuario - Administrador</span>
            <span className="sm:hidden">Vista Usuario</span>
          </span>
          <button
            onClick={() => {
              setAdminViewingAsUser(false);
              setCurrentView(ViewState.ADMIN);
            }}
            className="bg-white/20 hover:bg-white/30 px-3 py-1 rounded-full transition text-xs font-medium"
          >
            Volver al Panel
          </button>
        </div>
      )}

      <div className={`flex h-screen ${isDemoMode || adminViewingAsUser ? 'pt-8' : ''}`}>
        {/* Sidebar Navigation - Desktop/Tablet */}
        {!hideNav && (
          <Navigation
            currentView={currentView}
            setView={setCurrentView}
            onUserProfile={handleViewUserProfile}
            variant="sidebar"
          />
        )}

        {/* Main Content */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Onboarding */}
          {showOnboarding && <Onboarding onComplete={() => setShowOnboarding(false)} />}

          {/* PWA Offline Indicator */}
          <OfflineIndicator />

          <div id="main-content" className="flex-1 overflow-y-auto no-scrollbar scroll-smooth bg-white dark:bg-gray-900 lg:rounded-tl-2xl">
            <PageTransition key={currentView} type="fade" duration={200}>
              <ErrorBoundary>{renderView()}</ErrorBoundary>
            </PageTransition>
          </div>

          {/* Bottom Navigation - Mobile Only */}
          {!hideNav && (
            <Navigation
              currentView={currentView}
              setView={setCurrentView}
              onUserProfile={handleViewUserProfile}
              variant="bottom"
            />
          )}
        </main>
      </div>

      {/* PWA Prompts — hidden in AR direct mode (QR scan) */}
      {currentView !== ViewState.AR_DIRECT && <NotificationPrompt />}
      <UpdatePrompt />
    </div>
  );
};

export default App;
