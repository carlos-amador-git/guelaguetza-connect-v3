import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Plus,
  Users,
  X,
  Lock,
  Globe,
  ArrowLeft,
} from 'lucide-react';
import EmptyState from './ui/EmptyState';
import { useToast } from './ui/Toast';
import { useAuth } from '../contexts/AuthContext';
import {
  getCommunities,
  getMyCommunities,
  createCommunity,
  Community,
} from '../services/communities';
import CommunityCard from './ui/CommunityCard';
import PullToRefresh from './ui/PullToRefresh';
import LoadingButton from './ui/LoadingButton';
import { SkeletonGrid } from './ui/LoadingSpinner';

interface CommunitiesViewProps {
  onCommunityClick: (communityId: string) => void;
  onBack?: () => void;
}

const CommunitiesView: React.FC<CommunitiesViewProps> = ({ onCommunityClick, onBack }) => {
  const { token, isAuthenticated } = useAuth();
  const toast = useToast();
  const [communities, setCommunities] = useState<Community[]>([]);
  const [myCommunities, setMyCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'discover' | 'my'>('discover');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newCommunity, setNewCommunity] = useState({
    name: '',
    description: '',
    isPublic: true,
  });

  useEffect(() => {
    loadCommunities();
  }, [token, search]);

  useEffect(() => {
    if (isAuthenticated && activeTab === 'my') {
      loadMyCommunities();
    }
  }, [activeTab, token]);

  const loadCommunities = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getCommunities(1, 50, search || undefined, token || undefined);
      setCommunities(data.communities);
    } catch (error) {
      console.error('Error loading communities:', error);
      toast.error('Error al cargar', 'No se pudieron cargar las comunidades');
    } finally {
      setLoading(false);
    }
  }, [search, token, toast]);

  const handleRefresh = useCallback(async () => {
    if (activeTab === 'my') {
      await loadMyCommunities();
    } else {
      await loadCommunities();
    }
  }, [activeTab, loadCommunities]);

  const loadMyCommunities = async () => {
    if (!token) return;

    try {
      const data = await getMyCommunities(token);
      setMyCommunities(data.communities);
    } catch (error) {
      console.error('Error loading my communities:', error);
      toast.error('Error al cargar', 'No se pudieron cargar tus comunidades');
    }
  };

  const handleCreate = async () => {
    if (!token || !newCommunity.name.trim()) return;

    setCreating(true);
    try {
      const created = await createCommunity(
        newCommunity.name,
        newCommunity.description || undefined,
        newCommunity.isPublic,
        token
      );
      setShowCreateModal(false);
      setNewCommunity({ name: '', description: '', isPublic: true });
      toast.success('Comunidad creada', 'Tu comunidad ha sido creada exitosamente');
      onCommunityClick(created.id);
    } catch (error) {
      console.error('Error creating community:', error);
      toast.error('Error al crear', 'No se pudo crear la comunidad');
    } finally {
      setCreating(false);
    }
  };

  const displayedCommunities = activeTab === 'my' ? myCommunities : communities;

  return (
    <div className="h-full bg-gray-50 dark:bg-gray-950 pb-20 overflow-y-auto transition-colors">
      {/* Header */}
      <div className="relative overflow-hidden">
        <img src="/images/azul.png" alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="relative p-4 pt-6 text-white max-w-7xl mx-auto w-full">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              {onBack && (
                <button
                  onClick={onBack}
                  className="p-2 -ml-2 bg-white/20 hover:bg-white/30 rounded-full text-white transition-colors"
                  aria-label="Volver"
                >
                  <ArrowLeft size={20} />
                </button>
              )}
              <img src="/images/textil_huipil_istmo.png" alt="Comunidades" className="w-10 h-10 md:w-12 md:h-12 rounded-lg object-cover drop-shadow-md" />
              <h2 className="text-xl font-bold">Comunidades</h2>
            </div>
            {isAuthenticated && (
              <button
                onClick={() => setShowCreateModal(true)}
                aria-label="Crear comunidad"
                className="p-2 bg-white/20 hover:bg-white/30 rounded-full text-white transition-colors"
              >
                <Plus size={20} aria-hidden="true" />
              </button>
            )}
          </div>
          <p className="text-sm text-white/70">Conecta con personas con intereses similares</p>
        </div>
      </div>

      {/* Search & Tabs */}
      <div className="bg-oaxaca-blue dark:bg-gray-900 px-4 md:px-6 lg:px-8 py-4 max-w-7xl mx-auto w-full">
        <div className="relative">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
            aria-hidden="true"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar comunidades..."
            aria-label="Buscar comunidades"
            className="w-full pl-10 pr-4 py-2.5 bg-gray-100 text-gray-900 placeholder-gray-400 rounded-full focus:outline-none focus:ring-2 focus:ring-oaxaca-sky"
          />
        </div>

        {isAuthenticated && (
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => setActiveTab('discover')}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                activeTab === 'discover'
                  ? 'bg-white text-oaxaca-blue font-semibold shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              Descubrir
            </button>
            <button
              onClick={() => setActiveTab('my')}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                activeTab === 'my'
                  ? 'bg-white text-oaxaca-blue font-semibold shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              Mis comunidades
            </button>
          </div>
        )}
      </div>

      <PullToRefresh onRefresh={handleRefresh} className="flex-1">
        <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
          {loading ? (
            <SkeletonGrid type="community" count={6} columns={1} />
          ) : displayedCommunities.length === 0 ? (
            <EmptyState
              type="communities"
              title={activeTab === 'my' ? 'Sin comunidades' : 'Sin resultados'}
              description={
                activeTab === 'my'
                  ? 'Aun no te has unido a ninguna comunidad'
                  : search
                  ? 'No se encontraron comunidades con ese nombre'
                  : 'No hay comunidades disponibles'
              }
              action={
                isAuthenticated && activeTab === 'discover'
                  ? {
                      label: 'Crear comunidad',
                      onClick: () => setShowCreateModal(true),
                    }
                  : activeTab === 'my'
                  ? {
                      label: 'Explorar comunidades',
                      onClick: () => setActiveTab('discover'),
                      variant: 'secondary',
                    }
                  : undefined
              }
            />
          ) : (
            <div className="space-y-3">
              {displayedCommunities.map((community) => (
                <CommunityCard
                  key={community.id}
                  community={community}
                  onClick={() => onCommunityClick(community.id)}
                />
              ))}
            </div>
          )}
        </div>
      </PullToRefresh>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl p-6 animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                Nueva comunidad
              </h2>
              <button
                onClick={() => setShowCreateModal(false)}
                aria-label="Cerrar"
                className="p-2 text-gray-400 hover:text-gray-600"
              >
                <X size={20} aria-hidden="true" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nombre
                </label>
                <input
                  type="text"
                  value={newCommunity.name}
                  onChange={(e) =>
                    setNewCommunity({ ...newCommunity, name: e.target.value })
                  }
                  placeholder="Nombre de la comunidad"
                  className="w-full px-4 py-2.5 bg-gray-100 dark:bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-oaxaca-pink text-gray-900 dark:text-gray-100"
                  maxLength={100}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Descripcion (opcional)
                </label>
                <textarea
                  value={newCommunity.description}
                  onChange={(e) =>
                    setNewCommunity({ ...newCommunity, description: e.target.value })
                  }
                  placeholder="De que se trata esta comunidad?"
                  className="w-full px-4 py-2.5 bg-gray-100 dark:bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-oaxaca-pink text-gray-900 dark:text-gray-100 resize-none"
                  rows={3}
                  maxLength={500}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Visibilidad
                </label>
                <div className="flex gap-3">
                  <button
                    onClick={() => setNewCommunity({ ...newCommunity, isPublic: true })}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border-2 transition-colors ${
                      newCommunity.isPublic
                        ? 'border-oaxaca-pink bg-oaxaca-pink/10 text-oaxaca-pink'
                        : 'border-gray-200 dark:border-gray-600 text-gray-500'
                    }`}
                  >
                    <Globe size={18} />
                    Publica
                  </button>
                  <button
                    onClick={() => setNewCommunity({ ...newCommunity, isPublic: false })}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border-2 transition-colors ${
                      !newCommunity.isPublic
                        ? 'border-oaxaca-pink bg-oaxaca-pink/10 text-oaxaca-pink'
                        : 'border-gray-200 dark:border-gray-600 text-gray-500'
                    }`}
                  >
                    <Lock size={18} />
                    Privada
                  </button>
                </div>
              </div>

              <LoadingButton
                onClick={handleCreate}
                disabled={!newCommunity.name.trim()}
                loading={creating}
                loadingText="Creando..."
                fullWidth
                size="lg"
              >
                Crear comunidad
              </LoadingButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CommunitiesView;
