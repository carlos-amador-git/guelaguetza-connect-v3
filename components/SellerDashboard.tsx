import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft,
  Home,
  Package,
  Users,
  Calendar,
  Star,
  Clock,
  ChevronRight,
  Plus,
  Bell,
  TrendingUp,
  Edit,
  Trash2,
  Eye,
  X,
  Loader2,
  Save,
  Settings,
} from 'lucide-react';
import { ViewState } from '../types';
import { useAuth } from '../contexts/AuthContext';
import GradientPlaceholder from './ui/GradientPlaceholder';
import {
  getMyProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getSellerProfile,
  createSellerProfile,
  updateSellerProfile,
  Product,
  ProductCategory,
  CATEGORY_LABELS,
  formatPrice,
  uploadProductImage,
} from '../services/marketplace';

interface SellerDashboardProps {
  onBack: () => void;
  onNavigate?: (view: ViewState) => void;
}

type TabType = 'products' | 'stats' | 'settings';

const PRODUCT_CATEGORIES = [
  { key: 'ALL', label: 'Todos' },
  { key: 'ARTESANIA', label: 'Artesanias' },
  { key: 'MEZCAL', label: 'Mezcal' },
  { key: 'TEXTIL', label: 'Textiles' },
  { key: 'CERAMICA', label: 'Ceramica' },
  { key: 'JOYERIA', label: 'Joyeria' },
  { key: 'GASTRONOMIA', label: 'Gastronomia' },
  { key: 'OTRO', label: 'Otro' },
];

const CATEGORY_OPTIONS: ProductCategory[] = ['ARTESANIA', 'MEZCAL', 'TEXTIL', 'CERAMICA', 'JOYERIA', 'GASTRONOMIA', 'OTRO'];

interface ProductFormData {
  name: string;
  description: string;
  price: string;
  category: ProductCategory;
  stock: string;
}

const EMPTY_FORM: ProductFormData = { name: '', description: '', price: '', category: 'ARTESANIA', stock: '0' };

const SellerDashboard: React.FC<SellerDashboardProps> = ({ onBack, onNavigate }) => {
  const { user, token, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('products');
  const [productFilter, setProductFilter] = useState('ALL');

  // Data
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasSellerProfile, setHasSellerProfile] = useState(false);
  const [creatingProfile, setCreatingProfile] = useState(false);
  const [authInvalid, setAuthInvalid] = useState(false);

  // Product form
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<ProductFormData>(EMPTY_FORM);
  const [formImages, setFormImages] = useState<string[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  // Seller profile form
  const [showProfileForm, setShowProfileForm] = useState(false);
  const [profileData, setProfileData] = useState({ businessName: '', description: '', location: '' });
  const [sellerProfile, setSellerProfile] = useState<any>(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [settingsRenderKey, setSettingsRenderKey] = useState(0);

  // Delete confirm
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const loadProducts = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const result = await getMyProducts({ category: productFilter === 'ALL' ? undefined : productFilter });
      console.log('[SellerDashboard] loadProducts result:', result.products.map(p => ({ id: p.id, name: p.name, images: p.images })));
      setProducts(result.products);
      setHasSellerProfile(true);
    } catch (error: any) {
      // If no seller profile, products will be empty
      if (error?.status === 404 || error?.message?.includes('perfil')) {
        setHasSellerProfile(false);
      }
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [token, productFilter]);

  useEffect(() => {
    const init = async () => {
      console.log('[SellerDashboard] init called, token:', token ? `present (${token.substring(0, 20)}...)` : 'NULL/UNDEFINED');
      if (!token) {
        console.log('[SellerDashboard] No token, setting authInvalid=true');
        setAuthInvalid(true);
        setLoading(false);
        return;
      }
      try {
        console.log('[SellerDashboard] Calling getSellerProfile with token:', token.substring(0, 20) + '...');
        const profile = await getSellerProfile();
        setSellerProfile(profile);
        setHasSellerProfile(true);
        loadProducts();
      } catch (error: any) {
        console.log('[SellerDashboard] Profile fetch error:', error?.statusCode, error?.message);
        if (error?.statusCode === 401) {
          console.error('[SellerDashboard] Token inválido o expirado');
          logout();
          return;
        } else if (error?.statusCode === 404 || error?.message?.includes('perfil')) {
          setHasSellerProfile(false);
        } else {
          setHasSellerProfile(false);
        }
        setLoading(false);
      }
    };
    init();
  }, [token]);

  useEffect(() => {
    if (hasSellerProfile) loadProducts();
  }, [productFilter, hasSellerProfile]);

  const handleCreateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileData.businessName.trim()) return;
    setCreatingProfile(true);
    try {
      const profile = await createSellerProfile({
        businessName: profileData.businessName.trim(),
        description: profileData.description.trim() || undefined,
        location: profileData.location.trim() || undefined,
      });
      setSellerProfile(profile);
      setHasSellerProfile(true);
      setShowProfileForm(false);
      loadProducts();
    } catch (error: any) {
      console.error('Error creating profile:', error);
      if (error?.statusCode === 401) {
        logout();
        return;
      }
      if (error?.statusCode === 409 || error?.message?.includes('perfil') || error?.message?.includes('Ya tienes')) {
        try {
          const existingProfile = await getSellerProfile();
          setSellerProfile(existingProfile);
          setHasSellerProfile(true);
          setShowProfileForm(false);
        } catch (fetchError) {
          console.error('Error fetching existing profile:', fetchError);
        }
      }
    } finally {
      setCreatingProfile(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileData.businessName.trim()) return;
    setUpdatingProfile(true);
    try {
      const profile = await updateSellerProfile({
        businessName: profileData.businessName.trim(),
        description: profileData.description.trim() || undefined,
        location: profileData.location.trim() || undefined,
      });
      setSellerProfile(profile);
      setEditingProfile(false);
    } catch (error) {
      console.error('Error updating profile:', error);
    } finally {
      setUpdatingProfile(false);
    }
  };

  const startEditProfile = useCallback(() => {
    console.log('startEditProfile called', { sellerProfile, editingProfile });
    setProfileData({
      businessName: sellerProfile?.businessName || '',
      description: sellerProfile?.description || '',
      location: sellerProfile?.location || '',
    });
    setEditingProfile(true);
    setSettingsRenderKey(prev => prev + 1);
  }, [sellerProfile]);

  const openCreateForm = () => {
    setEditingProduct(null);
    setFormData(EMPTY_FORM);
    setFormImages([]);
    setFormError('');
    setShowProductForm(true);
  };

  const openEditForm = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description,
      price: String(product.price),
      category: product.category,
      stock: String(product.stock),
    });
    setFormImages(product.images || []);
    setFormError('');
    setShowProductForm(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    setUploadingImage(true);
    try {
      for (const file of Array.from(files)) {
        console.log('[SellerDashboard] Uploading image:', file.name);
        const url = await uploadProductImage(file);
        console.log('[SellerDashboard] Uploaded image URL:', url);
        setFormImages(prev => [...prev, url]);
      }
    } catch (err) {
      console.error('[SellerDashboard] Image upload error:', err);
      setFormError('Error al subir imagen');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmitProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const price = parseFloat(formData.price);
    const stock = parseInt(formData.stock, 10);

    if (!formData.name.trim() || formData.name.length < 3) {
      setFormError('El nombre debe tener al menos 3 caracteres');
      return;
    }
    if (!formData.description.trim() || formData.description.length < 10) {
      setFormError('La descripcion debe tener al menos 10 caracteres');
      return;
    }
    if (isNaN(price) || price <= 0) {
      setFormError('El precio debe ser mayor a 0');
      return;
    }

    setFormLoading(true);
    try {
      if (editingProduct) {
        await updateProduct(editingProduct.id, {
          name: formData.name.trim(),
          description: formData.description.trim(),
          price,
          category: formData.category,
          stock: isNaN(stock) ? 0 : stock,
          images: formImages,
        });
      } else {
        await createProduct({
          name: formData.name.trim(),
          description: formData.description.trim(),
          price,
          category: formData.category,
          stock: isNaN(stock) ? 0 : stock,
          images: formImages,
        });
      }
      setShowProductForm(false);
      loadProducts();
    } catch (error) {
      setFormError('Error al guardar el producto');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (productId: string) => {
    setDeleteLoading(true);
    try {
      await deleteProduct(productId);
      setDeleteConfirm(null);
      loadProducts();
    } catch (error) {
      console.error('Error deleting product:', error);
    } finally {
      setDeleteLoading(false);
    }
  };

  const filteredProducts = productFilter === 'ALL'
    ? products
    : products.filter(p => p.category === productFilter);

  return (
    <div className="h-full bg-gray-50 dark:bg-gray-950 overflow-y-auto pb-20">
      {/* Header */}
      <div className="bg-[url('/images/rojo.png')] bg-cover bg-center text-white">
        <div className="px-4 md:px-6 lg:px-8 py-4 max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-full transition">
                <ArrowLeft size={20} />
              </button>
              <div>
                <h1 className="font-bold text-xl">Panel de Artesano</h1>
                <p className="text-xs text-white/70">Bienvenido, {user?.nombre || 'Artesano'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="p-2 hover:bg-white/10 rounded-full transition">
                <Bell size={18} />
              </button>
              {onNavigate && (
                <button onClick={() => onNavigate(ViewState.HOME)} className="p-2 hover:bg-white/10 rounded-full transition">
                  <Home size={18} />
                </button>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 text-center">
              <p className="text-2xl font-bold">{products.length}</p>
              <p className="text-xs text-white/70">Productos</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 text-center">
              <p className="text-2xl font-bold">0</p>
              <p className="text-xs text-white/70">Pedidos</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 text-center">
              <p className="text-2xl font-bold">0</p>
              <p className="text-xs text-white/70">Resenas</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mt-4">
            {([
              { key: 'products' as TabType, label: 'Productos', icon: Package },
              { key: 'stats' as TabType, label: 'Estadísticas', icon: TrendingUp },
              { key: 'settings' as TabType, label: 'Configuración', icon: Settings },
            ]).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition ${
                  activeTab === tab.key ? 'bg-white text-oaxaca-purple' : 'bg-white/20 hover:bg-white/30'
                }`}
              >
                <tab.icon size={16} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
        {/* Auth invalid — redirect to login */}
        {authInvalid && (
          <div className="text-center py-12">
            <Package className="mx-auto mb-4 text-gray-300" size={48} />
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Sesión expirada</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Por favor inicia sesión nuevamente para continuar</p>
            <button
              onClick={() => onBack()}
              className="bg-oaxaca-yellow text-white px-6 py-3 rounded-xl font-medium hover:bg-oaxaca-yellow/90 transition"
            >
              Ir a inicio de sesión
            </button>
          </div>
        )}

        {/* No seller profile — setup form */}
        {!hasSellerProfile && !loading && !showProfileForm && (
          <div className="text-center py-12">
            <Package className="mx-auto mb-4 text-gray-300" size={48} />
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Configura tu tienda</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Crea tu perfil de artesano para empezar a vender productos</p>
            <button
              onClick={() => {
                const defaultBusinessName = (user as any)?.businessName || user?.nombre ? `${user.nombre}'s Store` : '';
                setProfileData({ businessName: defaultBusinessName, description: '', location: user?.region || '' });
                setShowProfileForm(true);
              }}
              className="bg-oaxaca-yellow text-white px-6 py-3 rounded-xl font-medium hover:bg-oaxaca-yellow/90 transition flex items-center gap-2 mx-auto"
            >
              <Plus size={18} />
              Crear mi tienda
            </button>
          </div>
        )}

        {!hasSellerProfile && showProfileForm && (
          <div className="max-w-lg mx-auto">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm">
              <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-1">Datos de tu tienda</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Esta informacion sera visible para los compradores</p>

              <form onSubmit={handleCreateProfile} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre de la tienda *</label>
                  <input
                    type="text"
                    value={profileData.businessName}
                    onChange={(e) => setProfileData(prev => ({ ...prev, businessName: e.target.value }))}
                    placeholder="Ej: Artesanias Oaxaca, Mezcales Don Pedro..."
                    className="w-full px-3 py-2.5 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-oaxaca-yellow outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descripcion</label>
                  <textarea
                    value={profileData.description}
                    onChange={(e) => setProfileData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Cuenta sobre ti y tus productos..."
                    rows={3}
                    className="w-full px-3 py-2.5 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-oaxaca-yellow outline-none resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ubicacion</label>
                  <input
                    type="text"
                    value={profileData.location}
                    onChange={(e) => setProfileData(prev => ({ ...prev, location: e.target.value }))}
                    placeholder="Ej: Centro de Oaxaca, Mercado 20 de Noviembre..."
                    className="w-full px-3 py-2.5 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-oaxaca-yellow outline-none"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowProfileForm(false)}
                    className="flex-1 py-3 border border-gray-300 dark:border-gray-600 rounded-xl font-medium text-gray-700 dark:text-gray-200"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={creatingProfile || !profileData.businessName.trim()}
                    className="flex-1 py-3 bg-oaxaca-yellow text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-oaxaca-yellow/90 transition disabled:opacity-50"
                  >
                    {creatingProfile ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                    Crear tienda
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Products Tab */}
        {hasSellerProfile && activeTab === 'products' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-900 dark:text-white">Mi Vitrina</h2>
              <button
                onClick={openCreateForm}
                className="text-sm bg-oaxaca-yellow text-white px-3 py-1.5 rounded-lg font-medium flex items-center gap-1 hover:bg-oaxaca-yellow/90 transition"
              >
                <Plus size={16} /> Nuevo producto
              </button>
            </div>

            {/* Category Filter */}
            <div className="flex gap-2 overflow-x-auto pb-2">
              {PRODUCT_CATEGORIES.map((cat) => (
                <button
                  key={cat.key}
                  onClick={() => setProductFilter(cat.key)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition ${
                    productFilter === cat.key
                      ? 'bg-oaxaca-yellow text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="animate-spin text-oaxaca-yellow" size={32} />
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-12">
                <Package className="mx-auto mb-3 text-gray-300" size={40} />
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  {products.length === 0 ? 'Aun no tienes productos. Agrega tu primer producto!' : 'No hay productos en esta categoria'}
                </p>
              </div>
            ) : (
              filteredProducts.map((product) => (
                <div key={product.id} className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm flex gap-3">
                  <div className="relative">
                    {product.images?.[0] ? (
                      <img src={product.images[0]} alt={product.name} className="w-20 h-20 rounded-lg object-cover" />
                    ) : (
                      <GradientPlaceholder variant="shop" className="w-20 h-20 rounded-lg" alt={product.name} />
                    )}
                    {product.stock <= 3 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded-full">
                        {product.stock === 0 ? 'Agotado' : 'Pocas!'}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 dark:text-white text-sm truncate">{product.name}</h3>
                    <p className="text-lg font-bold text-oaxaca-yellow">{formatPrice(product.price)}</p>
                    <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mt-1">
                      <span className={`flex items-center gap-1 ${product.stock <= 3 ? 'text-red-500' : ''}`}>
                        <Package size={12} />
                        Stock: {product.stock}
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 dark:bg-gray-700">
                        {CATEGORY_LABELS[product.category]}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => openEditForm(product)}
                      className="p-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                    >
                      <Edit size={14} className="text-gray-600 dark:text-gray-300" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(product.id)}
                      className="p-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition"
                    >
                      <Trash2 size={14} className="text-gray-600 dark:text-gray-300" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Stats Tab */}
        {hasSellerProfile && activeTab === 'stats' && (
          <div className="text-center py-12">
            <TrendingUp className="mx-auto mb-3 text-gray-300" size={40} />
            <p className="text-gray-500 dark:text-gray-400">Las estadisticas se generan conforme vendes productos</p>
          </div>
        )}

        {/* Settings Tab */}
        {hasSellerProfile && activeTab === 'settings' && !editingProfile && (
          <div key={`settings-view-${settingsRenderKey}`} className="max-w-lg mx-auto">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm">
              <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-1">Configuración de la tienda</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Actualiza la información de tu negocio</p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre de la tienda</label>
                  <p className="px-3 py-2.5 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm">
                    {sellerProfile?.businessName || '-'}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descripción</label>
                  <p className="px-3 py-2.5 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm min-h-[60px]">
                    {sellerProfile?.description || 'Sin descripción'}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ubicación</label>
                  <p className="px-3 py-2.5 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm">
                    {sellerProfile?.location || 'Sin ubicación'}
                  </p>
                </div>

                <button
                  onClick={(e) => {
                    console.log('Button clicked!');
                    startEditProfile();
                  }}
                  className="w-full py-3 bg-oaxaca-yellow text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-oaxaca-yellow/90 transition"
                >
                  <Edit size={18} />
                  Editar tienda
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Settings Tab - Edit Form */}
        {hasSellerProfile && activeTab === 'settings' && editingProfile && (
          <div key={`settings-edit-${settingsRenderKey}`} className="max-w-lg mx-auto">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm">
              <pre className="text-xs bg-gray-100 p-2 mb-4">Debug: editingProfile={String(editingProfile)}</pre>
              <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-1">Editar tienda</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Actualiza la información de tu negocio</p>

              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre de la tienda *</label>
                  <input
                    type="text"
                    value={profileData.businessName}
                    onChange={(e) => setProfileData(prev => ({ ...prev, businessName: e.target.value }))}
                    placeholder="Ej: Artesanias Oaxaca, Mezcales Don Pedro..."
                    className="w-full px-3 py-2.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-oaxaca-yellow outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descripción</label>
                  <textarea
                    value={profileData.description}
                    onChange={(e) => setProfileData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Cuenta sobre ti y tus productos..."
                    rows={3}
                    className="w-full px-3 py-2.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-oaxaca-yellow outline-none resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ubicación</label>
                  <input
                    type="text"
                    value={profileData.location}
                    onChange={(e) => setProfileData(prev => ({ ...prev, location: e.target.value }))}
                    placeholder="Ej: Centro de Oaxaca, Mercado 20 de Noviembre..."
                    className="w-full px-3 py-2.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-oaxaca-yellow outline-none"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingProfile(false)}
                    className="flex-1 py-3 border border-gray-300 dark:border-gray-600 rounded-xl font-medium text-gray-700 dark:text-gray-200"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={updatingProfile || !profileData.businessName.trim()}
                    className="flex-1 py-3 bg-oaxaca-yellow text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-oaxaca-yellow/90 transition disabled:opacity-50"
                  >
                    {updatingProfile ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                    Guardar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* Product Form Modal */}
      {showProductForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white dark:bg-gray-800 w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between sticky top-0 bg-white dark:bg-gray-800 z-10">
              <h3 className="font-bold text-gray-900 dark:text-gray-100">
                {editingProduct ? 'Editar producto' : 'Nuevo producto'}
              </h3>
              <button onClick={() => setShowProductForm(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmitProduct} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nombre *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Nombre del producto"
                  className="w-full px-3 py-2.5 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-oaxaca-yellow outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descripcion *</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe tu producto (min. 10 caracteres)"
                  rows={3}
                  className="w-full px-3 py-2.5 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-oaxaca-yellow outline-none resize-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Precio (MXN) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.price}
                    onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                    placeholder="0.00"
                    className="w-full px-3 py-2.5 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-oaxaca-yellow outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Stock</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.stock}
                    onChange={(e) => setFormData(prev => ({ ...prev, stock: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-oaxaca-yellow outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Categoria *</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value as ProductCategory }))}
                  className="w-full px-3 py-2.5 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-oaxaca-yellow outline-none"
                >
                  {CATEGORY_OPTIONS.map((cat) => (
                    <option key={cat} value={cat}>{CATEGORY_LABELS[cat]}</option>
                  ))}
                </select>
              </div>

              {/* Images */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Imagenes</label>
                <div className="flex gap-2 flex-wrap mb-2">
                  {formImages.map((img, i) => (
                    <div key={i} className="relative w-16 h-16">
                      <img src={img} alt="" className="w-full h-full object-cover rounded-lg" />
                      <button
                        type="button"
                        onClick={() => setFormImages(prev => prev.filter((_, idx) => idx !== i))}
                        className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                  <label className={`w-16 h-16 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg flex items-center justify-center cursor-pointer hover:border-oaxaca-yellow transition ${uploadingImage ? 'opacity-50' : ''}`}>
                    {uploadingImage ? (
                      <Loader2 size={18} className="animate-spin text-gray-400" />
                    ) : (
                      <Plus size={18} className="text-gray-400" />
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageUpload}
                      disabled={uploadingImage}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {formError && <p className="text-red-500 text-xs">{formError}</p>}

              <button
                type="submit"
                disabled={formLoading}
                className="w-full bg-oaxaca-yellow text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-oaxaca-yellow/90 transition disabled:opacity-50"
              >
                {formLoading ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  <>
                    <Save size={18} />
                    {editingProduct ? 'Guardar cambios' : 'Publicar producto'}
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">Eliminar producto?</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
              El producto se archivara y dejara de mostrarse en la tienda.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-3 border border-gray-300 dark:border-gray-600 rounded-xl font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                disabled={deleteLoading}
                className="flex-1 py-3 bg-red-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {deleteLoading ? <Loader2 className="animate-spin" size={18} /> : <Trash2 size={18} />}
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SellerDashboard;
