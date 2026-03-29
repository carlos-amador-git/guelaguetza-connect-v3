import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Star,
  Heart,
  Share2,
  MessageSquare,
  MapPin,
  Check,
  Phone,
} from 'lucide-react';
import {
  getProduct,
  addToWishlist,
  removeFromWishlist,
  isInWishlist,
  Product,
  ProductReview,
  CATEGORY_LABELS,
  formatPrice,
} from '../services/marketplace';
import { ViewState } from '../types';
import LoadingSpinner from './ui/LoadingSpinner';
import GradientPlaceholder from './ui/GradientPlaceholder';
import { useToast } from './ui/Toast';

interface ProductDetailViewProps {
  productId: string;
  onNavigate: (view: ViewState, data?: unknown) => void;
  onBack: () => void;
}

export default function ProductDetailView({
  productId,
  onNavigate,
  onBack,
}: ProductDetailViewProps) {
  const toast = useToast();
  const [product, setProduct] = useState<(Product & { reviews: ProductReview[] }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<'description' | 'reviews'>('description');
  const [inWishlist, setInWishlist] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);

  useEffect(() => {
    loadProduct();
    checkWishlist();
  }, [productId]);

  const checkWishlist = async () => {
    const result = await isInWishlist(productId);
    setInWishlist(result);
  };

  const handleToggleWishlist = async () => {
    try {
      setWishlistLoading(true);
      if (inWishlist) {
        await removeFromWishlist(productId);
        setInWishlist(false);
        toast.info('Eliminado', 'Producto eliminado de tu lista de deseos');
      } else {
        await addToWishlist(productId);
        setInWishlist(true);
        toast.success('Guardado', 'Producto agregado a tu lista de deseos');
      }
    } catch (error) {
      console.error('Error toggling wishlist:', error);
      toast.error('Error', 'No se pudo actualizar la lista de deseos');
    } finally {
      setWishlistLoading(false);
    }
  };

  const loadProduct = async () => {
    try {
      setLoading(true);
      const data = await getProduct(productId);
      setProduct(data);
    } catch (error) {
      console.error('Error loading product:', error);
      toast.error('Error', 'No se pudo cargar el producto');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    try {
      await navigator.share({
        title: product?.name,
        text: product?.description,
        url: window.location.href,
      });
    } catch {
      navigator.clipboard.writeText(window.location.href);
    }
  };

  if (loading || !product) {
    return <LoadingSpinner fullScreen text="Cargando producto..." />;
  }

  const images = product.images.length > 0
    ? product.images
    : [];

  return (
    <div className="flex flex-col h-full min-h-0 bg-white">
      {/* Header */}
      <div className="flex-none relative overflow-hidden">
        <img src="/images/amarillo.png" alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="relative p-4 pt-8 md:pt-6 text-white">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button onClick={onBack} className="p-2 hover:bg-white/20 rounded-full transition">
                  <ArrowLeft className="w-6 h-6" />
                </button>
                <div>
                  <h1 className="text-xl md:text-2xl font-bold">{product.name}</h1>
                  <p className="text-sm md:text-base text-white/80">{CATEGORY_LABELS[product.category]}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleToggleWishlist}
                  disabled={wishlistLoading}
                  className={`p-2 md:p-3 rounded-full transition ${
                    inWishlist ? 'bg-oaxaca-pink text-white' : 'bg-white/20 hover:bg-white/30'
                  } ${wishlistLoading ? 'opacity-50' : ''}`}
                >
                  <Heart className={`w-6 h-6 ${inWishlist ? 'fill-current' : ''}`} />
                </button>
                <button onClick={handleShare} className="p-2 md:p-3 bg-white/20 rounded-full hover:bg-white/30 transition">
                  <Share2 className="w-6 h-6" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto overscroll-contain min-h-0 pb-24">
        {/* Image Gallery */}
        <div className="relative px-6 md:px-8 lg:px-12 py-4 max-w-7xl mx-auto w-full">
          <div className="h-[30vh] sm:h-[35vh] md:h-[40vh] lg:h-[45vh] bg-gray-100 rounded-2xl overflow-hidden shadow-xl">
            {images.length > 0 ? (
              <img
                src={images[activeImageIndex]}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <GradientPlaceholder variant="shop" className="w-full h-full" alt={product.name} />
            )}
          </div>

          {/* Thumbnails */}
          {images.length > 1 && (
            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
              {images.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setActiveImageIndex(index)}
                  className={`w-2 h-2 rounded-full ${
                    index === activeImageIndex ? 'bg-oaxaca-yellow' : 'bg-white/50'
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto p-4">
          {/* Category & Price */}
          <div className="flex justify-between items-start mb-2">
            <span className="px-3 py-1 bg-oaxaca-yellow-light text-oaxaca-yellow text-sm font-medium rounded-full">
              {CATEGORY_LABELS[product.category]}
            </span>
            <div className="text-right">
              <p className="text-2xl font-bold text-oaxaca-yellow">{formatPrice(product.price)}</p>
              <p className="text-sm text-gray-500">{product.stock} disponibles</p>
            </div>
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{product.name}</h1>

          {/* Rating */}
          {product.seller.rating > 0 && (
            <div className="flex items-center gap-2 mb-4">
              <div className="flex items-center gap-1">
                <Star className="w-5 h-5 fill-oaxaca-yellow text-oaxaca-yellow" />
                <span className="font-medium">{product.seller.rating.toFixed(1)}</span>
              </div>
              <span className="text-gray-500">({product._count?.reviews || 0} resenas)</span>
            </div>
          )}

          {/* Seller */}
          <div className="flex items-center gap-3 py-4 border-y">
            <img
              src={product.seller.user.avatar || '/default-avatar.png'}
              alt={product.seller.user.nombre}
              className="w-12 h-12 rounded-full"
            />
            <div className="flex-1">
              <p className="font-medium text-gray-900">{product.seller.businessName}</p>
              {product.seller.location && (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(product.seller.location + ', Oaxaca, Mexico')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                >
                  <MapPin className="w-4 h-4" />
                  {product.seller.location}
                </a>
              )}
            </div>
            {product.seller.verified && (
              <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full flex items-center gap-1">
                <Check className="w-3 h-3" />
                Verificado
              </span>
            )}
          </div>

          {/* Tabs */}
          <div className="flex border-b mt-4">
            <button
              onClick={() => setActiveTab('description')}
              className={`flex-1 py-3 text-center font-medium border-b-2 transition-colors ${
                activeTab === 'description'
                  ? 'border-oaxaca-yellow text-oaxaca-yellow'
                  : 'border-transparent text-gray-500'
              }`}
            >
              Descripcion
            </button>
            <button
              onClick={() => setActiveTab('reviews')}
              className={`flex-1 py-3 text-center font-medium border-b-2 transition-colors ${
                activeTab === 'reviews'
                  ? 'border-oaxaca-yellow text-oaxaca-yellow'
                  : 'border-transparent text-gray-500'
              }`}
            >
              Resenas ({product.reviews.length})
            </button>
          </div>

          {activeTab === 'description' ? (
            <div className="py-4">
              <p className="text-gray-600 whitespace-pre-line">{product.description}</p>
            </div>
          ) : (
            <div className="py-4">
              {product.reviews.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-500">Aun no hay resenas</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {product.reviews.map((review) => (
                    <div key={review.id} className="border-b pb-4">
                      <div className="flex items-center gap-3 mb-2">
                        <img
                          src={review.user.avatar || '/default-avatar.png'}
                          alt={review.user.nombre}
                          className="w-10 h-10 rounded-full"
                        />
                        <div>
                          <p className="font-medium">{review.user.nombre}</p>
                          <div className="flex gap-0.5">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`w-4 h-4 ${
                                  star <= review.rating
                                    ? 'fill-oaxaca-yellow text-oaxaca-yellow'
                                    : 'text-gray-300'
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                      {review.comment && <p className="text-gray-600">{review.comment}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Contact Seller Bar - Fixed above bottom nav */}
      <div className="fixed bottom-16 left-0 right-0 bg-white border-t p-4 z-40">
        <div className="max-w-md mx-auto px-4">
          <button
            onClick={() => onNavigate(ViewState.DIRECT_MESSAGES)}
            className="w-full py-4 rounded-lg font-medium flex items-center justify-center gap-2 bg-oaxaca-yellow text-white hover:bg-oaxaca-yellow/90 transition shadow-lg"
          >
            <Phone className="w-5 h-5" />
            Contactar vendedor
          </button>
        </div>
      </div>
    </div>
  );
}
