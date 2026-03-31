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
        <div className="relative text-white overflow-hidden flex-shrink-0">
          <img src="/images/morado.png" alt="" className="absolute inset-0 w-full h-full object-cover" />
          <div className="relative px-4 md:px-6 lg:px-8 py-3">
            <div className="flex items-center gap-3 max-w-7xl mx-auto">
              <button
                onClick={() => setActiveTab('metrics')}
                className="p-2 hover:bg-white/10 rounded-full transition"
              >
                <ArrowLeft size={20} />
              </button>
              <div className="flex-1">
                <h1 className="font-bold text-lg">Gestion de Usuarios</h1>
                <p className="text-xs text-white/70">Administrar roles y permisos</p>
              </div>
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
        <div className="relative text-white overflow-hidden flex-shrink-0">
          <img src="/images/morado.png" alt="" className="absolute inset-0 w-full h-full object-cover" />
          <div className="relative px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => setActiveTab('metrics')}
            className="p-2 hover:bg-white/10 rounded-full transition"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1">
            <h1 className="font-bold text-lg">Codigos QR — AR</h1>
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
      <div className="relative text-white overflow-hidden">
        <img src="/images/morado.png" alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="relative px-4 md:px-6 lg:px-8 py-4 max-w-7xl mx-auto">
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

          {/* Key Metrics — Glass cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-4 border border-white/10 hover:bg-white/15 transition-all hover:scale-[1.02]">
              <div className="flex items-center justify-between mb-2">
                <div className="w-9 h-9 rounded-xl bg-blue-500/30 flex items-center justify-center">
                  <Users size={18} className="text-blue-300" />
                </div>
                <div className="flex items-center gap-1 text-xs text-green-300 bg-green-500/20 px-2 py-0.5 rounded-full">
                  <TrendingUp size={10} />
                  <span>+12.5%</span>
                </div>
              </div>
              <div className="text-2xl font-extrabold tracking-tight">{stats?.totalUsers?.toLocaleString() || '12,847'}</div>
              <div className="text-xs text-white/50 mt-0.5">Usuarios Totales</div>
            </div>
            <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-4 border border-white/10 hover:bg-white/15 transition-all hover:scale-[1.02]">
              <div className="flex items-center justify-between mb-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/30 flex items-center justify-center">
                  <Eye size={18} className="text-emerald-300" />
                </div>
                <div className="flex items-center gap-1 text-xs text-green-300 bg-green-500/20 px-2 py-0.5 rounded-full">
                  <TrendingUp size={10} />
                  <span>+8.3%</span>
                </div>
              </div>
              <div className="text-2xl font-extrabold tracking-tight">{stats?.activeUsersToday?.toLocaleString() || '4,567'}</div>
              <div className="text-xs text-white/50 mt-0.5">Usuarios Activos</div>
            </div>
            <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-4 border border-white/10 hover:bg-white/15 transition-all hover:scale-[1.02]">
              <div className="flex items-center justify-between mb-2">
                <div className="w-9 h-9 rounded-xl bg-amber-500/30 flex items-center justify-center">
                  <Activity size={18} className="text-amber-300" />
                </div>
                <div className="flex items-center gap-1 text-xs text-green-300 bg-green-500/20 px-2 py-0.5 rounded-full">
                  <TrendingUp size={10} />
                  <span>+23%</span>
                </div>
              </div>
              <div className="text-2xl font-extrabold tracking-tight text-amber-300">+{stats?.newUsersToday || '234'}</div>
              <div className="text-xs text-white/50 mt-0.5">Nuevos Hoy</div>
            </div>
            <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-4 border border-white/10 hover:bg-white/15 transition-all hover:scale-[1.02]">
              <div className="flex items-center justify-between mb-2">
                <div className="w-9 h-9 rounded-xl bg-pink-500/30 flex items-center justify-center">
                  <Image size={18} className="text-pink-300" />
                </div>
                <div className="flex items-center gap-1 text-xs text-green-300 bg-green-500/20 px-2 py-0.5 rounded-full">
                  <TrendingUp size={10} />
                  <span>+15%</span>
                </div>
              </div>
              <div className="text-2xl font-extrabold tracking-tight">{stats?.totalStories?.toLocaleString() || '3,567'}</div>
              <div className="text-xs text-white/50 mt-0.5">Historias</div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 md:p-6 lg:p-8 space-y-4 max-w-7xl mx-auto">
        {/* Real-time Activity */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-lg border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2 text-base">
              <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                <Activity size={18} className="text-green-500" />
              </div>
              Actividad en Tiempo Real
            </h3>
            <span className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-3 py-1.5 rounded-full font-medium">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              En vivo
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="relative overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl p-4 text-center group hover:shadow-md transition-all">
              <div className="absolute -top-4 -right-4 w-16 h-16 bg-blue-500/10 rounded-full" />
              <Eye size={28} className="mx-auto text-blue-500 mb-2" />
              <div className="text-3xl font-extrabold text-gray-900 dark:text-white">1,247</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-1">Online ahora</div>
            </div>
            <div className="relative overflow-hidden bg-gradient-to-br from-pink-50 to-rose-50 dark:from-pink-900/20 dark:to-rose-900/20 rounded-2xl p-4 text-center group hover:shadow-md transition-all">
              <div className="absolute -top-4 -right-4 w-16 h-16 bg-pink-500/10 rounded-full" />
              <Image size={28} className="mx-auto text-pink-500 mb-2" />
              <div className="text-3xl font-extrabold text-gray-900 dark:text-white">47</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-1">Historias/hora</div>
            </div>
            <div className="relative overflow-hidden bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20 rounded-2xl p-4 text-center group hover:shadow-md transition-all">
              <div className="absolute -top-4 -right-4 w-16 h-16 bg-purple-500/10 rounded-full" />
              <MessageCircle size={28} className="mx-auto text-purple-500 mb-2" />
              <div className="text-3xl font-extrabold text-gray-900 dark:text-white">312</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-1">Mensajes/hora</div>
            </div>
            <div className="relative overflow-hidden bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 rounded-2xl p-4 text-center group hover:shadow-md transition-all">
              <div className="absolute -top-4 -right-4 w-16 h-16 bg-green-500/10 rounded-full" />
              <ShoppingBag size={28} className="mx-auto text-emerald-500 mb-2" />
              <div className="text-3xl font-extrabold text-gray-900 dark:text-white">$18.5k</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-1">Ventas hoy</div>
            </div>
          </div>
        </div>

        {/* Weekly Users Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-lg border border-gray-100 dark:border-gray-700">
          <h3 className="font-bold text-gray-900 dark:text-white mb-5 flex items-center gap-2 text-base">
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <BarChart3 size={18} className="text-purple-500" />
            </div>
            Usuarios por Dia
          </h3>
          <div className="h-52 flex items-end justify-between gap-2 px-1">
            {WEEKLY_USERS.map((data, i) => {
              const height = (data.users / maxWeeklyUsers) * 160;
              const isMax = data.users === maxWeeklyUsers;
              return (
                <div key={data.day} className="flex-1 flex flex-col items-center group">
                  <div className={`text-xs font-bold mb-1.5 transition-colors ${isMax ? 'text-purple-600 dark:text-purple-400' : 'text-gray-400 dark:text-gray-500'}`}>
                    {(data.users / 1000).toFixed(1)}k
                  </div>
                  <div className="w-full relative">
                    <div
                      className={`w-full rounded-xl transition-all duration-500 group-hover:shadow-lg ${
                        isMax
                          ? 'bg-gradient-to-t from-purple-600 via-pink-500 to-amber-400 shadow-purple-500/30 shadow-md'
                          : 'bg-gradient-to-t from-purple-500/80 to-pink-400/80 group-hover:from-purple-600 group-hover:to-pink-500'
                      }`}
                      style={{ height: `${height}px`, animationDelay: `${i * 80}ms` }}
                    />
                    {isMax && (
                      <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
                    )}
                  </div>
                  <div className={`text-xs font-semibold mt-2 ${isMax ? 'text-purple-600 dark:text-purple-400' : 'text-gray-500 dark:text-gray-400'}`}>
                    {data.day}
                  </div>
                  <div className="text-[10px] text-emerald-500 font-medium">+{data.newUsers}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Two Column Grid */}
        <div className="grid md:grid-cols-2 gap-4">
          {/* Feature Usage */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-lg border border-gray-100 dark:border-gray-700">
            <h3 className="font-bold text-gray-900 dark:text-white mb-5 flex items-center gap-2 text-base">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <PieChart size={18} className="text-amber-500" />
              </div>
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
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-lg border border-gray-100 dark:border-gray-700">
            <h3 className="font-bold text-gray-900 dark:text-white mb-5 flex items-center gap-2 text-base">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Globe size={18} className="text-blue-500" />
              </div>
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
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-lg border border-gray-100 dark:border-gray-700">
          <h3 className="font-bold text-gray-900 dark:text-white mb-5 flex items-center gap-2 text-base">
            <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center">
              <Heart size={18} className="text-red-500" />
            </div>
            Metricas de Engagement
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="relative overflow-hidden text-center p-4 bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/10 dark:to-orange-900/10 rounded-2xl border border-yellow-100 dark:border-yellow-800/30">
              <div className="text-4xl font-extrabold text-gray-900 dark:text-white">4.8</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-1">Rating promedio</div>
              <div className="flex justify-center mt-1.5 text-yellow-400 text-lg">★★★★★</div>
            </div>
            <div className="relative overflow-hidden text-center p-4 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/10 dark:to-cyan-900/10 rounded-2xl border border-blue-100 dark:border-blue-800/30">
              <div className="text-4xl font-extrabold text-gray-900 dark:text-white">12:34</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-1">Tiempo promedio</div>
              <div className="text-xs text-emerald-500 font-semibold mt-1.5">+2:15 vs ayer</div>
            </div>
            <div className="relative overflow-hidden text-center p-4 bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/10 dark:to-green-900/10 rounded-2xl border border-emerald-100 dark:border-emerald-800/30">
              <div className="text-4xl font-extrabold text-emerald-600 dark:text-emerald-400">78%</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-1">Tasa de retencion</div>
              <div className="text-xs text-emerald-500 font-semibold mt-1.5">+5% vs semana</div>
            </div>
            <div className="relative overflow-hidden text-center p-4 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/10 dark:to-pink-900/10 rounded-2xl border border-purple-100 dark:border-purple-800/30">
              <div className="text-4xl font-extrabold text-purple-600 dark:text-purple-400">92</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-1">NPS Score</div>
              <div className="text-xs text-emerald-500 font-semibold mt-1.5">Excelente</div>
            </div>
          </div>
        </div>

        {/* Content Stats */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-lg border border-gray-100 dark:border-gray-700">
          <h3 className="font-bold text-gray-900 dark:text-white mb-5 flex items-center gap-2 text-base">
            <div className="w-8 h-8 rounded-lg bg-pink-500/10 flex items-center justify-center">
              <Image size={18} className="text-pink-500" />
            </div>
            Estadisticas de Contenido
          </h3>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            {[
              { value: stats?.totalStories?.toLocaleString() || '3,567', label: 'Historias', color: 'from-pink-500 to-rose-500' },
              { value: stats?.totalComments?.toLocaleString() || '18,345', label: 'Comentarios', color: 'from-blue-500 to-indigo-500' },
              { value: stats?.totalLikes?.toLocaleString() || '45,901', label: 'Likes', color: 'from-red-500 to-pink-500' },
              { value: stats?.totalCommunities || '156', label: 'Comunidades', color: 'from-purple-500 to-violet-500' },
              { value: stats?.totalEvents || '89', label: 'Eventos', color: 'from-amber-500 to-orange-500' },
              { value: '234', label: 'Productos', color: 'from-emerald-500 to-green-500' },
            ].map((item) => (
              <div key={item.label} className="text-center group">
                <div className={`text-2xl font-extrabold bg-gradient-to-r ${item.color} bg-clip-text text-transparent`}>
                  {item.value}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-1">{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MetricsDashboard;
