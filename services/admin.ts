// Admin Service - API calls for dashboard and user management
import { MOCK_ADMIN_STATS, MOCK_USERS } from './mockData';

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:3001') + '/api';

// ==========================================
// Advanced Dashboard Types
// ==========================================

export type PeriodFilter = '7d' | '30d' | '90d' | '1y' | 'custom';
export type DataTypeFilter = 'bookings' | 'orders' | 'all';
export type StatusFilter = 'all' | 'active' | 'completed' | 'cancelled';

export interface AdminFilters {
  period: PeriodFilter;
  dataType: DataTypeFilter;
  status: StatusFilter;
  startDate?: string;
  endDate?: string;
}

export interface AdvancedAdminStats {
  totalBookings: number;
  totalOrders: number;
  totalRevenue: number;
  activeUsers: number;
  conversionRate: number;
  avgOrderValue: number;
  completedBookings: number;
  cancelledBookings: number;
  previousPeriod: {
    totalBookings: number;
    totalOrders: number;
    totalRevenue: number;
    activeUsers: number;
    conversionRate: number;
    avgOrderValue: number;
    completedBookings: number;
    cancelledBookings: number;
  };
}

export interface TrendDataPoint {
  date: string;
  bookings: number;
  orders: number;
  revenue: number;
  confirmed: number;
  cancelled: number;
  completed: number;
}

export interface AdvancedRegionData {
  region: string;
  bookings: number;
  orders: number;
  revenue: number;
  performance: 'excellent' | 'good' | 'average' | 'poor';
}

export interface AdvancedCategoryDistribution {
  name: string;
  value: number;
  count: number;
  color: string;
}

export interface StatusDistribution {
  status: string;
  count: number;
  percentage: number;
  color: string;
}

export interface AdvancedRevenueDataPoint {
  date: string;
  revenue: number;
  cumulativeRevenue: number;
  previousRevenue: number;
  previousCumulative: number;
}

export interface AdvancedTopExperience {
  id: string;
  name: string;
  bookings: number;
  revenue: number;
  rating: number;
  category: string;
  trend: 'up' | 'down' | 'stable';
}

export interface AdvancedTopSeller {
  id: string;
  name: string;
  avatar: string;
  totalRevenue: number;
  totalBookings: number;
  totalOrders: number;
  rating: number;
  trend: 'up' | 'down' | 'stable';
}

export interface RecentActivity {
  id: string;
  type: 'booking' | 'order';
  name: string;
  customerName: string;
  date: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'processing' | 'shipped' | 'delivered';
  amount: number;
}

// ==========================================
// Mock Data Generators for Advanced Dashboard
// ==========================================

export function generateAdvancedMockStats(filters: AdminFilters): AdvancedAdminStats {
  const multiplier = filters.period === '7d' ? 1 : filters.period === '30d' ? 4 : filters.period === '90d' ? 12 : 52;
  const typeMultiplier = filters.dataType === 'all' ? 1 : 0.6;

  const baseBookings = Math.floor(234 * multiplier * typeMultiplier);
  const baseOrders = Math.floor(156 * multiplier * typeMultiplier);
  const baseRevenue = Math.floor(45231 * multiplier * typeMultiplier);

  return {
    totalBookings: filters.dataType !== 'orders' ? baseBookings : 0,
    totalOrders: filters.dataType !== 'bookings' ? baseOrders : 0,
    totalRevenue: baseRevenue,
    activeUsers: Math.floor(1847 * (multiplier * 0.3)),
    conversionRate: 4.2 + Math.random() * 2,
    avgOrderValue: Math.floor(baseRevenue / (baseBookings + baseOrders || 1)),
    completedBookings: Math.floor(baseBookings * 0.85),
    cancelledBookings: Math.floor(baseBookings * 0.05),
    previousPeriod: {
      totalBookings: filters.dataType !== 'orders' ? Math.floor(baseBookings * 0.88) : 0,
      totalOrders: filters.dataType !== 'bookings' ? Math.floor(baseOrders * 0.92) : 0,
      totalRevenue: Math.floor(baseRevenue * 0.92),
      activeUsers: Math.floor(1654 * (multiplier * 0.3)),
      conversionRate: 3.8 + Math.random() * 2,
      avgOrderValue: Math.floor((baseRevenue * 0.92) / ((baseBookings * 0.88) + (baseOrders * 0.92) || 1)),
      completedBookings: Math.floor(baseBookings * 0.88 * 0.82),
      cancelledBookings: Math.floor(baseBookings * 0.88 * 0.06),
    },
  };
}

export function generateAdvancedMockTrends(filters: AdminFilters): TrendDataPoint[] {
  const days = filters.period === '7d' ? 7 : filters.period === '30d' ? 30 : filters.period === '90d' ? 90 : 365;
  const data: TrendDataPoint[] = [];
  const now = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);

    const bookings = filters.dataType !== 'orders' ? Math.floor(Math.random() * 50) + 10 : 0;
    const orders = filters.dataType !== 'bookings' ? Math.floor(Math.random() * 30) + 5 : 0;

    data.push({
      date: date.toISOString().split('T')[0],
      bookings,
      orders,
      revenue: (bookings * 250) + (orders * 180) + Math.floor(Math.random() * 500),
      confirmed: Math.floor(bookings * 0.7),
      cancelled: Math.floor(bookings * 0.05),
      completed: Math.floor(bookings * 0.6),
    });
  }

  return data;
}

export function generateAdvancedMockRegionData(): AdvancedRegionData[] {
  return [
    { region: 'Oaxaca Centro', bookings: 450, orders: 280, revenue: 125000, performance: 'excellent' },
    { region: 'Valles Centrales', bookings: 320, orders: 190, revenue: 89000, performance: 'excellent' },
    { region: 'Costa', bookings: 280, orders: 165, revenue: 76000, performance: 'good' },
    { region: 'Sierra Norte', bookings: 190, orders: 110, revenue: 52000, performance: 'good' },
    { region: 'Mixteca', bookings: 150, orders: 85, revenue: 41000, performance: 'average' },
    { region: 'Istmo', bookings: 130, orders: 78, revenue: 35000, performance: 'average' },
    { region: 'Papaloapan', bookings: 95, orders: 56, revenue: 26000, performance: 'poor' },
    { region: 'Canadas', bookings: 75, orders: 45, revenue: 20000, performance: 'poor' },
    { region: 'Sierra Sur', bookings: 60, orders: 35, revenue: 16000, performance: 'poor' },
    { region: 'Costa Chica', bookings: 45, orders: 28, revenue: 12000, performance: 'poor' },
  ];
}

export function generateAdvancedMockCategoryDistribution(): AdvancedCategoryDistribution[] {
  return [
    { name: 'Tours Culturales', value: 35, count: 156, color: '#EC4899' },
    { name: 'Talleres Artesanales', value: 25, count: 112, color: '#8B5CF6' },
    { name: 'Gastronomia', value: 20, count: 89, color: '#F59E0B' },
    { name: 'Ecoturismo', value: 12, count: 54, color: '#10B981' },
    { name: 'Eventos Especiales', value: 8, count: 36, color: '#3B82F6' },
  ];
}

export function generateMockStatusDistribution(filters: AdminFilters): StatusDistribution[] {
  if (filters.dataType === 'orders') {
    return [
      { status: 'Entregadas', count: 540, percentage: 60, color: '#22c55e' },
      { status: 'En camino', count: 180, percentage: 20, color: '#3b82f6' },
      { status: 'Procesando', count: 120, percentage: 13, color: '#f59e0b' },
      { status: 'Canceladas', count: 60, percentage: 7, color: '#ef4444' },
    ];
  }
  return [
    { status: 'Completadas', count: 540, percentage: 54, color: '#22c55e' },
    { status: 'Confirmadas', count: 280, percentage: 28, color: '#3b82f6' },
    { status: 'Pendientes', count: 120, percentage: 12, color: '#f59e0b' },
    { status: 'Canceladas', count: 60, percentage: 6, color: '#ef4444' },
  ];
}

export function generateAdvancedMockRevenueData(filters: AdminFilters): AdvancedRevenueDataPoint[] {
  const days = filters.period === '7d' ? 7 : filters.period === '30d' ? 30 : filters.period === '90d' ? 90 : 365;
  const data: AdvancedRevenueDataPoint[] = [];
  const now = new Date();
  let cumulativeRevenue = 0;
  let previousCumulative = 0;

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const baseRevenue = Math.floor(Math.random() * 5000) + 1000;
    const prevRevenue = baseRevenue * (0.8 + Math.random() * 0.4);

    cumulativeRevenue += baseRevenue;
    previousCumulative += prevRevenue;

    data.push({
      date: date.toISOString().split('T')[0],
      revenue: baseRevenue,
      cumulativeRevenue,
      previousRevenue: prevRevenue,
      previousCumulative,
    });
  }

  return data;
}

export function generateAdvancedMockTopExperiences(): AdvancedTopExperience[] {
  return [
    { id: '1', name: 'Tour Guelaguetza Completo', bookings: 156, revenue: 78000, rating: 4.9, category: 'Tours Culturales', trend: 'up' },
    { id: '2', name: 'Taller de Alebrijes', bookings: 134, revenue: 53600, rating: 4.8, category: 'Talleres Artesanales', trend: 'up' },
    { id: '3', name: 'Ruta del Mezcal', bookings: 128, revenue: 64000, rating: 4.7, category: 'Gastronomia', trend: 'stable' },
    { id: '4', name: 'Monte Alban al Amanecer', bookings: 112, revenue: 44800, rating: 4.9, category: 'Tours Culturales', trend: 'up' },
    { id: '5', name: 'Cocina Oaxaquena Tradicional', bookings: 98, revenue: 49000, rating: 4.8, category: 'Gastronomia', trend: 'down' },
    { id: '6', name: 'Hierve el Agua + Teotitlan', bookings: 87, revenue: 34800, rating: 4.6, category: 'Ecoturismo', trend: 'stable' },
    { id: '7', name: 'Noche de Calendas', bookings: 76, revenue: 30400, rating: 4.7, category: 'Eventos Especiales', trend: 'up' },
    { id: '8', name: 'Taller de Barro Negro', bookings: 65, revenue: 26000, rating: 4.5, category: 'Talleres Artesanales', trend: 'stable' },
    { id: '9', name: 'Tour Mitla y Yagul', bookings: 54, revenue: 21600, rating: 4.4, category: 'Tours Culturales', trend: 'down' },
    { id: '10', name: 'Observacion de Aves', bookings: 43, revenue: 21500, rating: 4.6, category: 'Ecoturismo', trend: 'up' },
  ];
}

export function generateAdvancedMockTopSellers(): AdvancedTopSeller[] {
  return [
    { id: '1', name: 'Maria Gonzalez', avatar: 'MG', totalRevenue: 125000, totalBookings: 312, totalOrders: 156, rating: 4.9, trend: 'up' },
    { id: '2', name: 'Jose Martinez', avatar: 'JM', totalRevenue: 98000, totalBookings: 245, totalOrders: 134, rating: 4.8, trend: 'up' },
    { id: '3', name: 'Ana Lopez', avatar: 'AL', totalRevenue: 87500, totalBookings: 218, totalOrders: 112, rating: 4.7, trend: 'stable' },
    { id: '4', name: 'Carlos Ruiz', avatar: 'CR', totalRevenue: 76000, totalBookings: 190, totalOrders: 98, rating: 4.6, trend: 'down' },
    { id: '5', name: 'Elena Sanchez', avatar: 'ES', totalRevenue: 65000, totalBookings: 162, totalOrders: 87, rating: 4.8, trend: 'up' },
    { id: '6', name: 'Roberto Diaz', avatar: 'RD', totalRevenue: 54000, totalBookings: 135, totalOrders: 76, rating: 4.5, trend: 'stable' },
    { id: '7', name: 'Laura Torres', avatar: 'LT', totalRevenue: 48000, totalBookings: 120, totalOrders: 65, rating: 4.7, trend: 'up' },
    { id: '8', name: 'Miguel Flores', avatar: 'MF', totalRevenue: 42000, totalBookings: 105, totalOrders: 54, rating: 4.4, trend: 'down' },
  ];
}

export function generateMockRecentActivity(filters: AdminFilters): RecentActivity[] {
  const bookingStatuses: RecentActivity['status'][] = ['pending', 'confirmed', 'completed', 'cancelled'];
  const orderStatuses: RecentActivity['status'][] = ['processing', 'shipped', 'delivered', 'cancelled'];
  const experiences = [
    'Tour Guelaguetza Completo',
    'Taller de Alebrijes',
    'Ruta del Mezcal',
    'Monte Alban al Amanecer',
    'Cocina Oaxaquena Tradicional',
  ];
  const products = [
    'Alebrije Jaguar Decorativo',
    'Mezcal Artesanal 750ml',
    'Textil Telar de Cintura',
    'Barro Negro Figura Grande',
    'Set Chocolate Oaxaqueno',
  ];
  const names = ['Juan Perez', 'Maria Garcia', 'Carlos Lopez', 'Ana Martinez', 'Pedro Sanchez', 'Sofia Rodriguez'];

  return Array.from({ length: 20 }, (_, i) => {
    const date = new Date();
    date.setHours(date.getHours() - i * 2);
    const isOrder = filters.dataType === 'orders' || (filters.dataType === 'all' && Math.random() > 0.5);

    return {
      id: `activity-${i + 1}`,
      type: isOrder ? 'order' : 'booking',
      name: isOrder
        ? products[Math.floor(Math.random() * products.length)]
        : experiences[Math.floor(Math.random() * experiences.length)],
      customerName: names[Math.floor(Math.random() * names.length)],
      date: date.toISOString(),
      status: isOrder
        ? orderStatuses[Math.floor(Math.random() * orderStatuses.length)]
        : bookingStatuses[Math.floor(Math.random() * bookingStatuses.length)],
      amount: Math.floor(Math.random() * 2000) + 500,
    };
  });
}

// ==========================================
// Advanced Dashboard API Service
// ==========================================

function buildQueryParams(filters: AdminFilters): string {
  const params = new URLSearchParams();
  params.append('period', filters.period);
  params.append('dataType', filters.dataType);
  params.append('status', filters.status);
  if (filters.startDate) params.append('startDate', filters.startDate);
  if (filters.endDate) params.append('endDate', filters.endDate);
  return params.toString();
}

export async function getAdvancedStats(filters: AdminFilters, token: string): Promise<AdvancedAdminStats & { isUsingMockData?: boolean }> {
  try {
    const queryParams = buildQueryParams(filters);
    const response = await fetch(`${API_BASE}/admin/advanced/stats?${queryParams}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!response.ok) throw new Error(`API unavailable: ${response.status}`);
    const data = await response.json();
    return data.data;
  } catch (err) {
    if (import.meta.env.DEV) console.warn('[admin] getAdvancedStats falling back to mock data:', err);
    return { ...generateAdvancedMockStats(filters), isUsingMockData: true };
  }
}

export async function getAdvancedTrends(filters: AdminFilters, token: string): Promise<TrendDataPoint[]> {
  try {
    const queryParams = buildQueryParams(filters);
    const response = await fetch(`${API_BASE}/admin/advanced/trends?${queryParams}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!response.ok) throw new Error(`API unavailable: ${response.status}`);
    const data = await response.json();
    return data.data;
  } catch (err) {
    if (import.meta.env.DEV) console.warn('[admin] getAdvancedTrends falling back to mock data:', err);
    return generateAdvancedMockTrends(filters);
  }
}

export async function getAdvancedRegionData(filters: AdminFilters, token: string): Promise<AdvancedRegionData[]> {
  try {
    const queryParams = buildQueryParams(filters);
    const response = await fetch(`${API_BASE}/admin/advanced/regions?${queryParams}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!response.ok) throw new Error(`API unavailable: ${response.status}`);
    const data = await response.json();
    return data.data;
  } catch (err) {
    if (import.meta.env.DEV) console.warn('[admin] getAdvancedRegionData falling back to mock data:', err);
    return generateAdvancedMockRegionData();
  }
}

export async function getAdvancedCategoryDistribution(filters: AdminFilters, token: string): Promise<AdvancedCategoryDistribution[]> {
  try {
    const queryParams = buildQueryParams(filters);
    const response = await fetch(`${API_BASE}/admin/advanced/categories?${queryParams}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!response.ok) throw new Error(`API unavailable: ${response.status}`);
    const data = await response.json();
    return data.data;
  } catch (err) {
    if (import.meta.env.DEV) console.warn('[admin] getAdvancedCategoryDistribution falling back to mock data:', err);
    return generateAdvancedMockCategoryDistribution();
  }
}

export async function getStatusDistribution(filters: AdminFilters, token: string): Promise<StatusDistribution[]> {
  try {
    const queryParams = buildQueryParams(filters);
    const response = await fetch(`${API_BASE}/admin/advanced/status-distribution?${queryParams}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!response.ok) throw new Error(`API unavailable: ${response.status}`);
    const data = await response.json();
    return data.data;
  } catch (err) {
    if (import.meta.env.DEV) console.warn('[admin] getStatusDistribution falling back to mock data:', err);
    return generateMockStatusDistribution(filters);
  }
}

export async function getAdvancedRevenueData(filters: AdminFilters, token: string): Promise<AdvancedRevenueDataPoint[]> {
  try {
    const queryParams = buildQueryParams(filters);
    const response = await fetch(`${API_BASE}/admin/advanced/revenue?${queryParams}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!response.ok) throw new Error(`API unavailable: ${response.status}`);
    const data = await response.json();
    return data.data;
  } catch (err) {
    if (import.meta.env.DEV) console.warn('[admin] getAdvancedRevenueData falling back to mock data:', err);
    return generateAdvancedMockRevenueData(filters);
  }
}

export async function getAdvancedTopExperiences(filters: AdminFilters, token: string): Promise<AdvancedTopExperience[]> {
  try {
    const queryParams = buildQueryParams(filters);
    const response = await fetch(`${API_BASE}/admin/advanced/top-experiences?${queryParams}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!response.ok) throw new Error(`API unavailable: ${response.status}`);
    const data = await response.json();
    return data.data;
  } catch (err) {
    if (import.meta.env.DEV) console.warn('[admin] getAdvancedTopExperiences falling back to mock data:', err);
    return generateAdvancedMockTopExperiences();
  }
}

export async function getAdvancedTopSellers(filters: AdminFilters, token: string): Promise<AdvancedTopSeller[]> {
  try {
    const queryParams = buildQueryParams(filters);
    const response = await fetch(`${API_BASE}/admin/advanced/top-sellers?${queryParams}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!response.ok) throw new Error(`API unavailable: ${response.status}`);
    const data = await response.json();
    return data.data;
  } catch (err) {
    if (import.meta.env.DEV) console.warn('[admin] getAdvancedTopSellers falling back to mock data:', err);
    return generateAdvancedMockTopSellers();
  }
}

export async function getRecentActivity(filters: AdminFilters, token: string): Promise<RecentActivity[]> {
  try {
    const queryParams = buildQueryParams(filters);
    const response = await fetch(`${API_BASE}/admin/advanced/recent-activity?${queryParams}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!response.ok) throw new Error(`API unavailable: ${response.status}`);
    const data = await response.json();
    return data.data;
  } catch (err) {
    if (import.meta.env.DEV) console.warn('[admin] getRecentActivity falling back to mock data:', err);
    return generateMockRecentActivity(filters);
  }
}

export async function exportDashboardData(
  filters: AdminFilters,
  format: 'csv' | 'xlsx' = 'csv',
  token: string
): Promise<Blob> {
  const queryParams = buildQueryParams(filters);
  const response = await fetch(
    `${API_BASE}/admin/advanced/export?${queryParams}&format=${format}`,
    {
      headers: { 'Authorization': `Bearer ${token}` },
    }
  );
  if (!response.ok) throw new Error('Export failed');
  return response.blob();
}

// ==========================================
// Legacy Types (kept for compatibility)
// ==========================================

export type UserRole = 'USER' | 'SELLER' | 'MODERATOR' | 'ADMIN';

export interface DashboardStats {
  totalUsers: number;
  totalStories: number;
  totalComments: number;
  totalLikes: number;
  totalCommunities: number;
  totalEvents: number;
  newUsersToday: number;
  newStoriesToday: number;
  activeUsersToday: number;
}

export interface AdminUser {
  id: string;
  email: string;
  nombre: string;
  apellido: string | null;
  avatar: string | null;
  role: UserRole;
  bannedAt: string | null;
  bannedReason: string | null;
  createdAt: string;
  storiesCount: number;
  followersCount: number;
}

export interface ContentItem {
  id: string;
  description: string;
  mediaUrl: string;
  mediaType: string;
  authorId: string;
  authorName: string;
  likesCount: number;
  commentsCount: number;
  createdAt: string;
}

export interface ReportsData {
  userGrowth: Array<{ date: string; count: number }>;
  storyGrowth: Array<{ date: string; count: number }>;
  topCreators: Array<{ id: string; nombre: string; storiesCount: number }>;
}

// Get dashboard stats
export async function getDashboardStats(token: string): Promise<DashboardStats & { isUsingMockData?: boolean }> {
  try {
    const response = await fetch(`${API_BASE}/admin/dashboard`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Error al obtener dashboard: ${response.status}`);
    }

    const data = await response.json();
    return data.data;
  } catch (err) {
    // Return mock data when backend is unavailable; flag so callers can detect this
    if (import.meta.env.DEV) console.warn('[admin] getDashboardStats falling back to mock data:', err);
    return { ...MOCK_ADMIN_STATS, isUsingMockData: true };
  }
}

// Get users
export async function getUsers(
  token: string,
  page: number = 1,
  limit: number = 20,
  filters: {
    search?: string;
    role?: UserRole;
    banned?: boolean;
  } = {}
): Promise<{ users: AdminUser[]; total: number }> {
  try {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    if (filters.search) params.append('search', filters.search);
    if (filters.role) params.append('role', filters.role);
    if (filters.banned !== undefined) params.append('banned', filters.banned.toString());

    const response = await fetch(`${API_BASE}/admin/users?${params}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Error al obtener usuarios');
    }

    const data = await response.json();
    return data.data;
  } catch (err) {
    // Return mock data when backend is unavailable
    if (import.meta.env.DEV) console.warn('[admin] getUsers falling back to mock data:', err);
    let filteredUsers = MOCK_USERS.map(u => ({
      ...u,
      bannedAt: null,
      bannedReason: null,
    }));

    if (filters.search) {
      const search = filters.search.toLowerCase();
      filteredUsers = filteredUsers.filter(u =>
        u.nombre.toLowerCase().includes(search) ||
        u.email.toLowerCase().includes(search)
      );
    }
    if (filters.role) {
      filteredUsers = filteredUsers.filter(u => u.role === filters.role);
    }

    const start = (page - 1) * limit;
    const paginatedUsers = filteredUsers.slice(start, start + limit);

    return { users: paginatedUsers, total: filteredUsers.length };
  }
}

// Change user role
export async function changeUserRole(userId: string, role: UserRole, token: string): Promise<void> {
  const response = await fetch(`${API_BASE}/admin/users/${userId}/role`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ role }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Error al cambiar rol');
  }
}

// Ban user
export async function banUser(userId: string, reason: string, token: string): Promise<void> {
  const response = await fetch(`${API_BASE}/admin/users/${userId}/ban`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ reason }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Error al banear usuario');
  }
}

// Unban user
export async function unbanUser(userId: string, token: string): Promise<void> {
  const response = await fetch(`${API_BASE}/admin/users/${userId}/ban`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Error al desbanear usuario');
  }
}

export async function resetUserPassword(userId: string, newPassword: string, token: string): Promise<void> {
  const response = await fetch(`${API_BASE}/admin/users/${userId}/reset-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ newPassword }),
  });

  if (!response.ok) {
    throw new Error('Error al resetear contraseña');
  }
}

// Get content for moderation
export async function getContent(
  token: string,
  page: number = 1,
  limit: number = 20,
  type: 'all' | 'recent' = 'recent'
): Promise<{ content: ContentItem[]; total: number }> {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    type,
  });

  const response = await fetch(`${API_BASE}/admin/content?${params}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Error al obtener contenido');
  }

  const data = await response.json();
  return data.data;
}

// Delete content
export async function deleteContent(storyId: string, token: string): Promise<void> {
  const response = await fetch(`${API_BASE}/admin/content/${storyId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Error al eliminar contenido');
  }
}

// Get reports
export async function getReports(days: number = 30, token: string): Promise<ReportsData> {
  const response = await fetch(`${API_BASE}/admin/reports?days=${days}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Error al obtener reportes');
  }

  const data = await response.json();
  return data.data;
}
