import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Home,
  Users,
  Eye,
  TrendingUp,
  TrendingDown,
  Activity,
  BarChart3,
  PieChart,
  Globe,
  Clock,
  Calendar,
  Image,
  MessageCircle,
  Heart,
  ShoppingBag,
  Map,
  Video,
  Ticket,
  RefreshCw,
  ChevronRight,
  QrCode,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getDashboardStats, DashboardStats } from '../../services/admin';
import { ViewState } from '../../types';
import QRCodesPanel from './QRCodesPanel';
import UsersManagement from './UsersManagement';

interface MetricsDashboardProps {
  onBack: () => void;
  onNavigate?: (view: ViewState) => void;
}

// Mock data for charts
const HOURLY_ACTIVITY = [
  { hour: '00', users: 120 },
  { hour: '04', users: 45 },
  { hour: '08', users: 890 },
  { hour: '12', users: 2340 },
  { hour: '16', users: 3200 },
  { hour: '20', users: 2890 },
];

const WEEKLY_USERS = [
  { day: 'Lun', users: 8250, newUsers: 145 },
  { day: 'Mar', users: 9380, newUsers: 262 },
  { day: 'Mie', users: 10520, newUsers: 378 },
  { day: 'Jue', users: 11890, newUsers: 495 },
  { day: 'Vie', users: 14340, newUsers: 756 },
  { day: 'Sab', users: 18200, newUsers: 934 },
  { day: 'Dom', users: 15890, newUsers: 689 },
];

const FEATURE_USAGE = [
  { name: 'Historias', usage: 34, color: '#EC4899', icon: Image },
  { name: 'Transporte', usage: 22, color: '#8B5CF6', icon: Map },
  { name: 'Eventos', usage: 18, color: '#F59E0B', icon: Calendar },
  { name: 'Tienda', usage: 12, color: '#10B981', icon: ShoppingBag },
  { name: 'Streaming', usage: 8, color: '#EF4444', icon: Video },
  { name: 'Experiencias', usage: 6, color: '#3B82F6', icon: Ticket },
];

const GEOGRAPHIC_DATA = [
  { region: 'Oaxaca Centro', users: 5420, percentage: 35 },
  { region: 'CDMX', users: 3100, percentage: 20 },
  { region: 'Valles Centrales', users: 2340, percentage: 15 },
  { region: 'Costa', users: 1560, percentage: 10 },
  { region: 'Internacional', users: 1248, percentage: 8 },
  { region: 'Otros', users: 1872, percentage: 12 },
];

const MetricsDashboard: React.FC<MetricsDashboardProps> = ({ onBack, onNavigate }) => {
  const { token, logout } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month'>('today');
  const [activeTab, setActiveTab] = useState<'metrics' | 'qrcodes' | 'users'>('metrics');

  useEffect(() => {
    loadStats();
  }, [token]);

  const loadStats = async () => {
    try {
      const data = await getDashboardStats(token || '');
      setStats(data);
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadStats();
    setTimeout(() => setRefreshing(false), 500);
  };

  const maxWeeklyUsers = Math.max(...WEEKLY_USERS.map(d => d.users));

  if (activeTab === 'users') {
    return (
      <div className="h-full flex flex-col">
        <div className="bg-gradient-to-br from-oaxaca-purple via-oaxaca-pink to-oaxaca-purple text-white px-4 md:px-6 lg:px-8 py-3 flex-shrink-0">
          <div className="flex items-center gap-3 max-w-7xl mx-auto">
            <button
              onClick={() => setActiveTab('metrics')}
              className="p-2 hover:bg-white/10 rounded-full transition"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="flex-1">
              <h1 className="font-bold text-lg">Gestión de Usuarios</h1>
              <p className="text-xs text-white/70">Administrar roles y permisos</p>
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <UsersManagement onBack={() => setActiveTab('metrics')} />
        </div>
      </div>
    );
  }

  if (activeTab === 'qrcodes') {
    return (
      <div className="h-full flex flex-col">
        {/* Slim header with back-to-metrics */}
        <div className="bg-gradient-to-br from-oaxaca-purple via-oaxaca-pink to-oaxaca-purple text-white px-4 py-3 flex items-center gap-3 flex-shrink-0">
          <button
            onClick={() => setActiveTab('metrics')}
            className="p-2 hover:bg-white/10 rounded-full transition"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1">
            <h1 className="font-bold text-lg">Códigos QR — AR</h1>
            <p className="text-xs text-white/70">Panel de Administracion</p>
          </div>
          {onNavigate && (
            <button
              onClick={() => onNavigate(ViewState.HOME)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-full transition"
              title="Ver la app como usuario"
            >
              <Eye size={16} />
              <span className="text-xs font-medium hidden sm:inline">Ver App</span>
            </button>
          )}
        </div>
        <div className="flex-1 overflow-hidden">
          <QRCodesPanel />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-gray-50 dark:bg-gray-950 overflow-y-auto">
      {/* Header */}
      <div className="bg-gradient-to-br from-oaxaca-purple via-oaxaca-pink to-oaxaca-purple text-white">
        <div className="px-4 md:px-6 lg:px-8 py-4 max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <button
                onClick={onBack}
                className="p-2 hover:bg-white/10 rounded-full transition"
              >
                <ArrowLeft size={20} />
              </button>
              <div>
                <h1 className="font-bold text-xl">Metricas de Uso</h1>
                <p className="text-xs text-white/70">Panel de Administracion</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('users')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-full transition"
                title="Gestión de usuarios"
              >
                <Users size={16} />
                <span className="text-xs font-medium hidden sm:inline">Usuarios</span>
              </button>
              <button
                onClick={() => setActiveTab('qrcodes')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-full transition"
                title="Códigos QR para AR"
              >
                <QrCode size={16} />
                <span className="text-xs font-medium hidden sm:inline">QR Codes</span>
              </button>
              <button
                onClick={handleRefresh}
                className={`p-2 hover:bg-white/10 rounded-full transition ${refreshing ? 'animate-spin' : ''}`}
                title="Actualizar datos"
              >
                <RefreshCw size={18} />
              </button>
              {onNavigate && (
                <button
                  onClick={() => onNavigate(ViewState.HOME)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-full transition"
                  title="Ver la app como usuario"
                >
                  <Eye size={16} />
                  <span className="text-xs font-medium hidden sm:inline">Ver App</span>
                </button>
              )}
              <button
                onClick={() => { logout(); onBack(); }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-red-500/80 rounded-full transition"
                title="Cerrar sesión"
              >
                <LogOut size={16} />
                <span className="text-xs font-medium hidden sm:inline">Salir</span>
              </button>
            </div>
          </div>

          {/* Time Range Selector */}
          <div className="flex gap-2 mb-4">
            {(['today', 'week', 'month'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${
                  timeRange === range
                    ? 'bg-white text-oaxaca-purple'
                    : 'bg-white/20 hover:bg-white/30'
                }`}
              >
                {range === 'today' ? 'Hoy' : range === 'week' ? 'Semana' : 'Mes'}
              </button>
            ))}
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white/10 backdrop-blur rounded-xl p-3">
              <div className="flex items-center gap-2 mb-1">
                <Users size={16} className="text-white/70" />
                <span className="text-xs text-white/70">Usuarios Totales</span>
              </div>
              <div className="text-2xl font-bold">{stats?.totalUsers?.toLocaleString() || '12,847'}</div>
              <div className="flex items-center gap-1 text-xs text-green-300">
                <TrendingUp size={12} />
                <span>+12.5%</span>
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-3">
              <div className="flex items-center gap-2 mb-1">
                <Eye size={16} className="text-white/70" />
                <span className="text-xs text-white/70">Usuarios Activos</span>
              </div>
              <div className="text-2xl font-bold">{stats?.activeUsersToday?.toLocaleString() || '4,567'}</div>
              <div className="flex items-center gap-1 text-xs text-green-300">
                <TrendingUp size={12} />
                <span>+8.3%</span>
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-3">
              <div className="flex items-center gap-2 mb-1">
                <Activity size={16} className="text-white/70" />
                <span className="text-xs text-white/70">Nuevos Hoy</span>
              </div>
              <div className="text-2xl font-bold text-green-300">+{stats?.newUsersToday || '234'}</div>
              <div className="flex items-center gap-1 text-xs text-green-300">
                <TrendingUp size={12} />
                <span>+23%</span>
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-3">
              <div className="flex items-center gap-2 mb-1">
                <Image size={16} className="text-white/70" />
                <span className="text-xs text-white/70">Historias</span>
              </div>
              <div className="text-2xl font-bold">{stats?.totalStories?.toLocaleString() || '3,567'}</div>
              <div className="flex items-center gap-1 text-xs text-green-300">
                <TrendingUp size={12} />
                <span>+15%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 md:p-6 lg:p-8 space-y-4 max-w-7xl mx-auto">
        {/* Real-time Activity */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Activity size={18} className="text-green-500" />
              Actividad en Tiempo Real
            </h3>
            <span className="flex items-center gap-1 text-xs text-green-500 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-full">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              En vivo
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-oaxaca-sky-light dark:bg-oaxaca-sky/20 rounded-xl p-4 text-center">
              <Eye size={24} className="mx-auto text-oaxaca-sky mb-2" />
              <div className="text-2xl font-bold text-gray-900 dark:text-white">1,247</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Online ahora</div>
            </div>
            <div className="bg-oaxaca-pink-light dark:bg-oaxaca-pink/20 rounded-xl p-4 text-center">
              <Image size={24} className="mx-auto text-oaxaca-pink mb-2" />
              <div className="text-2xl font-bold text-gray-900 dark:text-white">47</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Historias/hora</div>
            </div>
            <div className="bg-oaxaca-purple-light dark:bg-oaxaca-purple/20 rounded-xl p-4 text-center">
              <MessageCircle size={24} className="mx-auto text-oaxaca-purple mb-2" />
              <div className="text-2xl font-bold text-gray-900 dark:text-white">312</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Mensajes/hora</div>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 text-center">
              <ShoppingBag size={24} className="mx-auto text-green-500 mb-2" />
              <div className="text-2xl font-bold text-gray-900 dark:text-white">$18.5k</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Ventas hoy</div>
            </div>
          </div>
        </div>

        {/* Weekly Users Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <BarChart3 size={18} className="text-oaxaca-purple" />
            Usuarios por Dia
          </h3>
          <div className="h-48 flex items-end justify-between gap-2">
            {WEEKLY_USERS.map((data) => (
              <div key={data.day} className="flex-1 flex flex-col items-center">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                  {(data.users / 1000).toFixed(1)}k
                </div>
                <div
                  className="w-full bg-gradient-to-t from-oaxaca-purple to-oaxaca-pink rounded-t-lg transition-all hover:from-oaxaca-purple/90 hover:to-oaxaca-pink/90"
                  style={{ height: `${(data.users / maxWeeklyUsers) * 140}px` }}
                />
                <div className="text-xs font-medium text-gray-600 dark:text-gray-300 mt-2">
                  {data.day}
                </div>
                <div className="text-[10px] text-green-500">+{data.newUsers}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Two Column Grid */}
        <div className="grid md:grid-cols-2 gap-4">
          {/* Feature Usage */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <PieChart size={18} className="text-oaxaca-yellow" />
              Uso por Funcionalidad
            </h3>
            <div className="space-y-3">
              {FEATURE_USAGE.map((feature) => (
                <div key={feature.name} className="flex items-center gap-3">
                  <div
                    className="p-2 rounded-lg"
                    style={{ backgroundColor: `${feature.color}20` }}
                  >
                    <feature.icon size={16} style={{ color: feature.color }} />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-700 dark:text-gray-300">{feature.name}</span>
                      <span className="font-medium text-gray-900 dark:text-white">{feature.usage}%</span>
                    </div>
                    <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${feature.usage}%`, backgroundColor: feature.color }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Geographic Distribution */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Globe size={18} className="text-oaxaca-sky" />
              Distribucion Geografica
            </h3>
            <div className="space-y-3">
              {GEOGRAPHIC_DATA.map((region, idx) => (
                <div key={region.region} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-oaxaca-sky to-oaxaca-purple flex items-center justify-center text-white text-xs font-bold">
                    {idx + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-700 dark:text-gray-300">{region.region}</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {region.users.toLocaleString()}
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-oaxaca-sky to-oaxaca-purple rounded-full"
                        style={{ width: `${region.percentage}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-xs text-gray-500">{region.percentage}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Engagement Metrics */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Heart size={18} className="text-red-500" />
            Metricas de Engagement
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
              <div className="text-3xl font-bold text-gray-900 dark:text-white">4.8</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Rating promedio</div>
              <div className="flex justify-center mt-1 text-yellow-400">★★★★★</div>
            </div>
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
              <div className="text-3xl font-bold text-gray-900 dark:text-white">12:34</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Tiempo promedio</div>
              <div className="text-xs text-green-500 mt-1">+2:15 vs ayer</div>
            </div>
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
              <div className="text-3xl font-bold text-gray-900 dark:text-white">78%</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Tasa de retencion</div>
              <div className="text-xs text-green-500 mt-1">+5% vs semana</div>
            </div>
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
              <div className="text-3xl font-bold text-gray-900 dark:text-white">92</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">NPS Score</div>
              <div className="text-xs text-green-500 mt-1">Excelente</div>
            </div>
          </div>
        </div>

        {/* Content Stats */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Image size={18} className="text-oaxaca-pink" />
            Estadisticas de Contenido
          </h3>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            <div className="text-center">
              <div className="text-xl font-bold text-gray-900 dark:text-white">
                {stats?.totalStories?.toLocaleString() || '3,567'}
              </div>
              <div className="text-xs text-gray-500">Historias</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-gray-900 dark:text-white">
                {stats?.totalComments?.toLocaleString() || '18,345'}
              </div>
              <div className="text-xs text-gray-500">Comentarios</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-gray-900 dark:text-white">
                {stats?.totalLikes?.toLocaleString() || '45,901'}
              </div>
              <div className="text-xs text-gray-500">Likes</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-gray-900 dark:text-white">
                {stats?.totalCommunities || '156'}
              </div>
              <div className="text-xs text-gray-500">Comunidades</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-gray-900 dark:text-white">
                {stats?.totalEvents || '89'}
              </div>
              <div className="text-xs text-gray-500">Eventos</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-gray-900 dark:text-white">234</div>
              <div className="text-xs text-gray-500">Productos</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MetricsDashboard;
