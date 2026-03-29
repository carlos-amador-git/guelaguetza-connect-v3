import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft,
  Search,
  Filter,
  Star,
  Heart,
  MapPin,
  ExternalLink,
} from 'lucide-react';
import Modal from './ui/Modal';
import {
  getProducts,
  getWishlistCount,
  Product,
  ProductCategory,
  CATEGORY_LABELS,
  formatPrice,
} from '../services/marketplace';
import { ViewState } from '../types';
import EmptyState from './ui/EmptyState';
import { SkeletonGrid } from './ui/LoadingSpinner';
import GradientPlaceholder from './ui/GradientPlaceholder';
import LoadingButton from './ui/LoadingButton';

interface TiendaViewProps {
  onNavigate: (view: ViewState, data?: unknown) => void;
  onBack: () => void;
}

const CATEGORIES: ProductCategory[] = ['ARTESANIA', 'MEZCAL', 'TEXTIL', 'CERAMICA', 'JOYERIA', 'GASTRONOMIA'];

export default function TiendaView({ onNavigate, onBack }: TiendaViewProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<ProductCategory | ''>('');
  const [showFilters, setShowFilters] = useState(false);
  const [wishlistCount, setWishlistCount] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    loadProducts();
    loadWishlistCount();
  }, [category, search]);

  const loadProducts = async (append = false) => {
    try {
      setLoading(true);
      const currentPage = append ? page + 1 : 1;
      const result = await getProducts({
        category: category || undefined,
        search: search || undefined,
        page: currentPage,
        limit: 20,
      });

      if (append) {
        setProducts((prev) => [...prev, ...result.products]);
      } else {
        setProducts(result.products);
      }

      setPage(currentPage);
      setHasMore(currentPage < result.pagination.totalPages);
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadWishlistCount = async () => {
    try {
      const count = await getWishlistCount();
      setWishlistCount(count);
    } catch {
      // Error loading wishlist
    }
  };

  const handleSearch = () => {
    setPage(1);
    loadProducts();
  };

  const handleRefresh = useCallback(async () => {
    setPage(1);
    await loadProducts();
    await loadWishlistCount();
  }, [category, search]);

  const handleProductClick = (product: Product) => {
    onNavigate(ViewState.PRODUCT_DETAIL, { productId: product.id });
  };

  return (
    <div className="flex flex-col h-full min-h-0 bg-gray-50 dark:bg-gray-900">
      {/* Header - with image */}
      <div className="flex-shrink-0 sticky top-0 z-10 relative overflow-hidden">
        <img src="/images/amarillo.png" alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="relative p-4 pt-8 md:pt-6 text-white">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <button onClick={onBack} className="p-2 hover:bg-white/20 rounded-full transition">
                  <ArrowLeft className="w-6 h-6" />
                </button>
                <img src="/images/ui/icon_market.png" alt="Tienda" className="w-10 h-10 md:w-12 md:h-12 object-contain drop-shadow-md" />
                <div>
                  <h1 className="text-xl md:text-2xl font-bold">Vitrina Digital</h1>
                  <p className="text-sm md:text-base text-white/80">Artesanias y productos oaxaquenos</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onNavigate(ViewState.WISHLIST)}
                  className="relative p-2 md:p-3 bg-white/20 rounded-full hover:bg-white/30 transition"
                >
                  <Heart className="w-6 h-6" />
                  {wishlistCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-oaxaca-pink text-white text-xs rounded-full flex items-center justify-center">
                      {wishlistCount}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Search */}
            <div className="flex gap-2 max-w-2xl">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Buscar productos..."
                  className="w-full pl-10 pr-4 py-2.5 md:py-3 bg-white text-gray-900 rounded-lg"
                />
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`p-2.5 md:p-3 rounded-lg ${showFilters ? 'bg-white text-oaxaca-yellow' : 'bg-white/20'}`}
              >
                <Filter className="w-5 h-5" />
              </button>
            </div>

            {/* Category filters */}
            {showFilters && (
              <div className="mt-3 flex gap-2 overflow-x-auto pb-2 md:flex-wrap">
                <button
                  onClick={() => setCategory('')}
                  className={`px-3 py-1.5 md:px-4 md:py-2 rounded-full text-sm whitespace-nowrap ${
                    category === '' ? 'bg-white text-oaxaca-yellow' : 'bg-white/20 hover:bg-white/30'
                  } transition`}
                >
                  Todos
                </button>
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCategory(cat)}
                    className={`px-3 py-1.5 md:px-4 md:py-2 rounded-full text-sm whitespace-nowrap ${
                      category === cat ? 'bg-white text-oaxaca-yellow' : 'bg-white/20 hover:bg-white/30'
                    } transition`}
                  >
                    {CATEGORY_LABELS[cat]}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div className="flex-1 overflow-y-auto min-h-0 pb-20">
        <div className="p-4 md:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {loading && products.length === 0 ? (
              <SkeletonGrid count={8} type="product" />
            ) : products.length === 0 ? (
              <EmptyState
                type="products"
                title={search ? 'Sin resultados' : 'Sin productos'}
                description={search ? `No encontramos productos para "${search}"` : 'No hay productos disponibles en esta categoria.'}
                action={{
                  label: 'Ver todos',
                  onClick: () => {
                    setSearchInput('');
                    setSearch('');
                    setCategory('');
                  },
                }}
              />
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4 lg:gap-6">
                  {products.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onClick={() => handleProductClick(product)}
                    />
                  ))}
                </div>

                {hasMore && (
                  <div className="mt-6 flex justify-center">
                    <LoadingButton
                      onClick={() => loadProducts(true)}
                      loading={loading}
                      loadingText="Cargando..."
                      variant="outline"
                    >
                      Cargar mas productos
                    </LoadingButton>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface ProductCardProps {
  product: Product;
  onClick: () => void;
}

function ProductCard({ product, onClick }: ProductCardProps) {
  const mainImage = product.images[0] || '';
  const [showLocationModal, setShowLocationModal] = useState(false);

  const getMapEmbedUrl = (location: string) => {
    const encoded = encodeURIComponent(location);
    return `https://www.google.com/maps?q=${encoded}&output=embed`;
  };

  const handleLocationClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (product.seller.location) {
      setShowLocationModal(true);
    }
  };

  return (
    <>
      <div
        onClick={onClick}
        className="relative bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-2xl shadow-md overflow-hidden cursor-pointer hover:shadow-xl hover:scale-[1.02] transition-all border border-white/30 dark:border-white/20"
      >
        <div className="relative aspect-square">
          {mainImage ? (
            <img
              src={mainImage}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <GradientPlaceholder variant="shop" className="w-full h-full" alt={product.name} />
          )}
          <div className="absolute top-2 left-2">
            <span className="px-2.5 py-1 bg-white/90 backdrop-blur-sm rounded-full text-xs font-semibold text-oaxaca-yellow shadow-sm">
              {CATEGORY_LABELS[product.category]}
            </span>
          </div>
        </div>

        <div className="p-3 md:p-4">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 line-clamp-1 md:text-base">{product.name}</h3>
          <p className="text-xl md:text-2xl font-bold text-oaxaca-yellow mt-1">{formatPrice(product.price)}</p>

          <span className="block text-xs font-medium text-gray-600 dark:text-gray-300 truncate mt-2">
            {product.seller.businessName}
          </span>

          {product.seller.location && (
            <div className="flex justify-end mt-1">
              <button
                onClick={handleLocationClick}
                className="flex items-center gap-1 text-xs text-yellow-800 bg-oaxaca-yellow px-2 py-1 rounded-full hover:bg-yellow-400 transition-colors"
              >
                <MapPin className="w-3 h-3" />
                <span className="truncate font-medium">
                  {product.seller.location.includes('maps') ? 'Ver ubicación' : product.seller.location.split(',')[0]}
                </span>
              </button>
            </div>
          )}
        </div>
      </div>

      <Modal
        isOpen={showLocationModal}
        onClose={() => setShowLocationModal(false)}
        size="md"
      >
        <div className="p-6 text-center">
          <div className="mx-auto w-16 h-16 bg-oaxaca-purple/10 rounded-full flex items-center justify-center mb-4">
            <MapPin className="w-8 h-8 text-oaxaca-purple" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Ubicación de {product.seller.businessName}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            Abre la ubicación en Google Maps para ver cómo llegar
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setShowLocationModal(false)}
              className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              Cerrar
            </button>
            <a
              href={product.seller.location!}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-oaxaca-purple text-white rounded-xl font-medium hover:bg-oaxaca-purple/90 transition-colors"
            >
              <ExternalLink size={18} />
              Abrir Maps
            </a>
          </div>
        </div>
      </Modal>
    </>
  );
}
