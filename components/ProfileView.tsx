import React, { useState, useEffect } from 'react';
import { User, Mail, MapPin, LogOut, Camera, Scan, ChevronRight, Settings, Bell, Shield, Heart, HelpCircle, Trophy, Award, Loader2, MessageSquare, BarChart3, Users, ShieldCheck, Sun, Moon } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { ViewState } from '../types';
import { getMyStats, checkIn, UserStats } from '../services/gamification';
import XPProgress from './ui/XPProgress';
import { ThemeSegmentControl } from './ui/ThemeToggle';

interface ProfileViewProps {
  setView: (view: ViewState) => void;
  onLogout?: () => void;
}

const ProfileView: React.FC<ProfileViewProps> = ({ setView, onLogout }) => {
  const { user, logout, isAuthenticated, token } = useAuth();
  const { isDark } = useTheme();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    if (token) {
      loadStats();
      doCheckIn();
    }
  }, [token]);

  const loadStats = async () => {
    if (!token) return;
    try {
      const data = await getMyStats(token);
      setStats(data);
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  const doCheckIn = async () => {
    if (!token) return;
    try {
      await checkIn(token);
      // Reload stats to get updated streak
      loadStats();
    } catch (error) {
      // Silently fail check-in
    }
  };

  const handleLogout = () => {
    logout();
    onLogout?.();
  };

  // Not logged in state
  if (!isAuthenticated || !user) {
    return (
      <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-950 pb-20 transition-colors">
        <div className="bg-oaxaca-purple p-6 pt-8">
          <h2 className="text-white font-bold text-xl">Mi Perfil</h2>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <div className="w-24 h-24 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mb-6">
            <User className="w-12 h-12 text-gray-400" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">¡Únete a la fiesta!</h3>
          <p className="text-gray-500 dark:text-gray-400 text-center text-sm mb-8 max-w-xs">
            Crea una cuenta para guardar tus favoritos, subir historias y más
          </p>
          <button
            onClick={() => setView(ViewState.LOGIN)}
            className="w-full max-w-xs bg-oaxaca-pink text-white py-4 rounded-xl font-bold"
          >
            Iniciar Sesión
          </button>
          <button
            onClick={() => setView(ViewState.REGISTER)}
            className="w-full max-w-xs mt-3 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 py-4 rounded-xl font-bold"
          >
            Crear Cuenta
          </button>
        </div>
      </div>
    );
  }

  // Logged in state
  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-950 pb-20 transition-colors">
      {/* Header */}
      <div className="relative overflow-hidden">
        <img src="/images/verde.png" alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="relative p-6 md:px-6 lg:px-8 pt-8 pb-20 text-white max-w-7xl mx-auto w-full">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-xl mb-1">Mi Perfil</h2>
              <p className="text-white/70 text-sm">Gestiona tu cuenta</p>
            </div>
            <button
              onClick={() => setShowLogoutConfirm(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-red-500/80 rounded-full transition"
              title="Cerrar sesión"
            >
              <LogOut size={16} />
              <span className="text-xs font-medium hidden sm:inline">Salir</span>
            </button>
          </div>
        </div>
      </div>

      {/* Profile Card */}
      <div className="px-4 md:px-6 lg:px-8 -mt-14 relative z-10 max-w-7xl mx-auto w-full">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="relative">
              {user.faceData ? (
                <img
                  src={user.faceData}
                  alt={user.nombre}
                  className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-md"
                />
              ) : (
                <div className="w-20 h-20 bg-oaxaca-yellow rounded-full flex items-center justify-center border-4 border-white shadow-md">
                  <span className="text-2xl font-bold text-oaxaca-purple">
                    {user.nombre.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <button className="absolute bottom-0 right-0 bg-oaxaca-pink p-1.5 rounded-full text-white shadow-md">
                <Camera size={14} />
              </button>
            </div>

            {/* Info */}
            <div className="flex-1">
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {user.nombre} {user.apellido || ''}
              </h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm">{user.email}</p>
              {user.region && (
                <div className="flex items-center gap-1 mt-1 text-oaxaca-pink text-xs">
                  <MapPin size={12} />
                  <span>{user.region}</span>
                </div>
              )}
            </div>
          </div>

          {/* Face ID Status */}
          <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${user.faceData ? 'bg-green-100 dark:bg-green-900/30' : 'bg-gray-100 dark:bg-gray-600'}`}>
                <Scan size={20} className={user.faceData ? 'text-green-600 dark:text-green-400' : 'text-gray-400'} />
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-gray-100 text-sm">Face ID</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {user.faceData ? 'Configurado' : 'No configurado'}
                </p>
              </div>
            </div>
            <ChevronRight size={20} className="text-gray-400" />
          </div>
        </div>
      </div>

      {/* XP Progress */}
      <div className="px-4 md:px-6 lg:px-8 mt-4 max-w-7xl mx-auto w-full">
        {loadingStats ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 flex justify-center">
            <Loader2 className="animate-spin text-oaxaca-pink" size={24} />
          </div>
        ) : stats ? (
          <XPProgress
            xp={stats.xp}
            level={stats.level}
            xpProgress={stats.xpProgress}
            xpForNextLevel={stats.xpForNextLevel}
            streak={stats.currentStreak}
          />
        ) : null}
      </div>

      {/* Gamification Buttons */}
      <div className="px-4 md:px-6 lg:px-8 mt-4 flex gap-3 max-w-7xl mx-auto w-full">
        <button
          onClick={() => setView(ViewState.BADGES)}
          className="flex-1 bg-white dark:bg-gray-800 rounded-xl p-4 flex flex-col items-center gap-2 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="p-3 bg-oaxaca-yellow/20 rounded-full">
            <Award size={24} className="text-oaxaca-yellow" />
          </div>
          <span className="text-sm font-medium text-gray-900 dark:text-white">Mis Logros</span>
        </button>
        <button
          onClick={() => setView(ViewState.LEADERBOARD)}
          className="flex-1 bg-white dark:bg-gray-800 rounded-xl p-4 flex flex-col items-center gap-2 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="p-3 bg-oaxaca-pink/20 rounded-full">
            <Trophy size={24} className="text-oaxaca-pink" />
          </div>
          <span className="text-sm font-medium text-gray-900 dark:text-white">Tabla de clasificación</span>
          {stats && (
            <span className="text-xs text-gray-400">#{stats.rank}</span>
          )}
        </button>
      </div>

      {/* Menu Options */}
      <div className="px-4 md:px-6 lg:px-8 mt-6 space-y-3 max-w-7xl mx-auto w-full">
        {/* Theme Section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden">
          <p className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase">Apariencia</p>

          <div className="w-full px-4 py-3 flex items-center gap-3">
            <div className="p-2 bg-oaxaca-yellow-light dark:bg-oaxaca-yellow/20 rounded-full">
              {isDark ? (
                <Moon size={18} className="text-oaxaca-sky dark:text-oaxaca-sky" />
              ) : (
                <Sun size={18} className="text-oaxaca-yellow" />
              )}
            </div>
            <span className="flex-1 text-left text-gray-900 dark:text-gray-100">Tema</span>
            <ThemeSegmentControl />
          </div>
        </div>

        {/* Account Section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden">
          <p className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase">Cuenta</p>

          <button className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition">
            <div className="p-2 bg-oaxaca-sky-light dark:bg-oaxaca-sky/20 rounded-full">
              <Settings size={18} className="text-oaxaca-sky dark:text-oaxaca-sky" />
            </div>
            <span className="flex-1 text-left text-gray-900 dark:text-gray-100">Configuracion</span>
            <ChevronRight size={18} className="text-gray-400" />
          </button>

          <button className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition">
            <div className="p-2 bg-oaxaca-purple-light dark:bg-oaxaca-purple/20 rounded-full">
              <Bell size={18} className="text-oaxaca-purple dark:text-oaxaca-purple" />
            </div>
            <span className="flex-1 text-left text-gray-900 dark:text-gray-100">Notificaciones</span>
            <ChevronRight size={18} className="text-gray-400" />
          </button>

          <button className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-full">
              <Shield size={18} className="text-green-600 dark:text-green-400" />
            </div>
            <span className="flex-1 text-left text-gray-900 dark:text-gray-100">Privacidad</span>
            <ChevronRight size={18} className="text-gray-400" />
          </button>
        </div>

        {/* Social Section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden">
          <p className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase">Social</p>

          <button
            onClick={() => setView(ViewState.DIRECT_MESSAGES)}
            className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
          >
            <div className="p-2 bg-oaxaca-sky-light dark:bg-oaxaca-sky/20 rounded-full">
              <MessageSquare size={18} className="text-oaxaca-sky dark:text-oaxaca-sky" />
            </div>
            <span className="flex-1 text-left text-gray-900 dark:text-gray-100">Mensajes Directos</span>
            <ChevronRight size={18} className="text-gray-400" />
          </button>

          <button
            onClick={() => setView(ViewState.COMMUNITIES)}
            className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
          >
            <div className="p-2 bg-oaxaca-purple-light dark:bg-oaxaca-purple/20 rounded-full">
              <Users size={18} className="text-oaxaca-purple dark:text-oaxaca-purple" />
            </div>
            <span className="flex-1 text-left text-gray-900 dark:text-gray-100">Comunidades</span>
            <ChevronRight size={18} className="text-gray-400" />
          </button>
        </div>

        {/* Activity Section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden">
          <p className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase">Actividad</p>

          <button
            onClick={() => setView(ViewState.ANALYTICS)}
            className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
          >
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-full">
              <BarChart3 size={18} className="text-emerald-600 dark:text-emerald-400" />
            </div>
            <span className="flex-1 text-left text-gray-900 dark:text-gray-100">Mis Estadísticas</span>
            <ChevronRight size={18} className="text-gray-400" />
          </button>

          <button className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition">
            <div className="p-2 bg-oaxaca-pink-light dark:bg-oaxaca-pink/20 rounded-full">
              <Heart size={18} className="text-oaxaca-pink dark:text-oaxaca-pink" />
            </div>
            <span className="flex-1 text-left text-gray-900 dark:text-gray-100">Mis favoritos</span>
            <ChevronRight size={18} className="text-gray-400" />
          </button>

          <button
            onClick={() => setView(ViewState.CHAT)}
            className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
          >
            <div className="p-2 bg-oaxaca-yellow-light dark:bg-oaxaca-yellow/20 rounded-full">
              <HelpCircle size={18} className="text-oaxaca-yellow dark:text-oaxaca-yellow" />
            </div>
            <span className="flex-1 text-left text-gray-900 dark:text-gray-100">Mis conversaciones con GuelaBot</span>
            <ChevronRight size={18} className="text-gray-400" />
          </button>
        </div>

        {/* Admin Section - Only for admins */}
        {user.role === 'ADMIN' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden">
            <p className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase">Administración</p>

            <button
              onClick={() => setView(ViewState.ADMIN)}
              className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
            >
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full">
                <ShieldCheck size={18} className="text-red-600 dark:text-red-400" />
              </div>
              <span className="flex-1 text-left text-gray-900 dark:text-gray-100">Panel de Admin</span>
              <ChevronRight size={18} className="text-gray-400" />
            </button>
          </div>
        )}

        {/* Logout */}
        <button
          onClick={() => setShowLogoutConfirm(true)}
          className="w-full bg-white dark:bg-gray-800 rounded-xl px-4 py-3 flex items-center gap-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
        >
          <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full">
            <LogOut size={18} className="text-red-500 dark:text-red-400" />
          </div>
          <span className="flex-1 text-left font-medium">Cerrar Sesión</span>
        </button>
      </div>

      {/* App Version */}
      <div className="mt-auto px-4 py-4">
        <p className="text-center text-gray-400 text-xs">
          Guelaguetza Connect v1.0.0
        </p>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">¿Cerrar sesión?</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
              Tendrás que volver a iniciar sesión para acceder a tu cuenta
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 py-3 border border-gray-300 dark:border-gray-600 rounded-xl font-medium text-gray-700 dark:text-gray-200"
              >
                Cancelar
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 py-3 bg-red-500 text-white rounded-xl font-bold"
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileView;
