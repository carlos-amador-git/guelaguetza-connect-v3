import React, { useState, useEffect } from 'react';
import { ArrowLeft, Search, Users, Image, TrendingUp, Loader2, Hash } from 'lucide-react';
import SearchBar from './ui/SearchBar';
import {
  search,
  getTrending,
  SearchUser,
  SearchStory,
  TrendingHashtag,
} from '../services/search';

interface SearchViewProps {
  onBack: () => void;
  onUserProfile: (userId: string) => void;
  onStory?: (storyId: string) => void;
}

type TabType = 'all' | 'users' | 'stories';

const SearchView: React.FC<SearchViewProps> = ({
  onBack,
  onUserProfile,
  onStory,
}) => {
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [users, setUsers] = useState<SearchUser[]>([]);
  const [stories, setStories] = useState<SearchStory[]>([]);
  const [trendingHashtags, setTrendingHashtags] = useState<TrendingHashtag[]>([]);
  const [trendingStories, setTrendingStories] = useState<SearchStory[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    loadTrending();
  }, []);

  const loadTrending = async () => {
    try {
      const data = await getTrending();
      setTrendingHashtags(data.hashtags);
      setTrendingStories(data.stories);
    } catch (error) {
      console.error('Error loading trending:', error);
    }
  };

  const handleSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    setHasSearched(true);

    try {
      const type = activeTab === 'all' ? 'all' : activeTab;
      const results = await search(searchQuery, type);
      setUsers(results.users);
      setStories(results.stories);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleHashtagClick = (hashtag: string) => {
    setQuery(hashtag);
    handleSearch(hashtag);
  };

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'all', label: 'Todo', icon: <TrendingUp size={16} /> },
    { id: 'users', label: 'Usuarios', icon: <Users size={16} /> },
    { id: 'stories', label: 'Historias', icon: <Image size={16} /> },
  ];

  const renderEmptyState = () => (
    <div className="py-8">
      {/* Trending Hashtags */}
      {trendingHashtags.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Hash size={20} className="text-oaxaca-pink" />
            Tendencias
          </h3>
          <div className="flex flex-wrap gap-2">
            {trendingHashtags.map((item) => (
              <button
                key={item.hashtag}
                onClick={() => handleHashtagClick(item.hashtag)}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-full text-gray-700 dark:text-gray-300 hover:bg-oaxaca-pink hover:text-white transition-colors"
              >
                {item.hashtag} <span className="text-xs opacity-70">({item.count})</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Trending Stories */}
      {trendingStories.length > 0 && (
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <TrendingUp size={20} className="text-oaxaca-pink" />
            Historias populares
          </h3>
          <div className="grid grid-cols-3 gap-2">
            {trendingStories.slice(0, 9).map((story) => (
              <button
                key={story.id}
                onClick={() => onStory?.(story.id)}
                className="aspect-square rounded-lg overflow-hidden relative group"
              >
                <img
                  src={story.thumbnailUrl || story.mediaUrl}
                  alt={story.description}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-end p-2">
                  <span className="text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity truncate">
                    {story.likesCount} likes
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderResults = () => (
    <div className="py-4 space-y-6">
      {/* Users */}
      {(activeTab === 'all' || activeTab === 'users') && users.length > 0 && (
        <div>
          {activeTab === 'all' && (
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wider">
              Usuarios
            </h3>
          )}
          <div className="space-y-2">
            {users.map((user) => (
              <button
                key={user.id}
                onClick={() => onUserProfile(user.id)}
                className="w-full flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <img
                  src={
                    user.avatar ||
                    `https://ui-avatars.com/api/?name=${user.nombre}&background=random`
                  }
                  alt={user.nombre}
                  className="w-12 h-12 rounded-full object-cover"
                />
                <div className="flex-1 text-left">
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {user.nombre} {user.apellido}
                  </p>
                  {user.bio && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-1">
                      {user.bio}
                    </p>
                  )}
                </div>
                <span className="text-xs text-gray-400">
                  {user.followersCount} seguidores
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Stories */}
      {(activeTab === 'all' || activeTab === 'stories') && stories.length > 0 && (
        <div>
          {activeTab === 'all' && (
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wider">
              Historias
            </h3>
          )}
          <div className="grid grid-cols-3 gap-2">
            {stories.map((story) => (
              <button
                key={story.id}
                onClick={() => onStory?.(story.id)}
                className="aspect-square rounded-lg overflow-hidden relative group"
              >
                <img
                  src={story.thumbnailUrl || story.mediaUrl}
                  alt={story.description}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-2">
                  <div className="flex items-center gap-1">
                    <img
                      src={
                        story.user.avatar ||
                        `https://ui-avatars.com/api/?name=${story.user.nombre}&background=random&size=32`
                      }
                      alt={story.user.nombre}
                      className="w-5 h-5 rounded-full"
                    />
                    <span className="text-xs text-white truncate">{story.user.nombre}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* No results */}
      {users.length === 0 && stories.length === 0 && !loading && (
        <div className="text-center py-8">
          <p className="text-gray-500 dark:text-gray-400">
            No se encontraron resultados para "{query}"
          </p>
        </div>
      )}
    </div>
  );

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header con imagen */}
      <div className="relative overflow-hidden">
        <img src="/images/morado.png" alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="relative p-4 pt-6 text-white max-w-7xl mx-auto w-full">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <button onClick={onBack} aria-label="Volver" className="p-2 -ml-2 rounded-full hover:bg-white/10 transition">
                <ArrowLeft size={20} aria-hidden="true" />
              </button>
              <img src="/images/ui/icon_search.png" alt="Buscar" className="w-10 h-10 md:w-12 md:h-12 object-contain drop-shadow-md" />
              <h2 className="text-xl font-bold">Buscar</h2>
            </div>
          </div>
          <p className="text-sm text-white/70">Explora usuarios, historias y mas</p>
        </div>
      </div>

      {/* Search & Tabs */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 md:px-6 lg:px-8 py-3 space-y-3 max-w-7xl mx-auto w-full">
        <SearchBar
          value={query}
          onChange={setQuery}
          onSearch={handleSearch}
          placeholder="Buscar usuarios, historias..."
          autoFocus
        />
        <div className="flex gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                if (query) handleSearch(query);
              }}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-oaxaca-pink text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 md:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="animate-spin text-oaxaca-pink" size={32} />
          </div>
        ) : hasSearched ? (
          renderResults()
        ) : (
          renderEmptyState()
        )}
      </div>
    </div>
  );
};

export default SearchView;
