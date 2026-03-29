import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  Users,
  MessageSquare,
  Lock,
  Globe,
  Send,
  Loader2,
  MoreVertical,
  Trash2,
  Image as ImageIcon,
  X,
  PlusCircle,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/ui/Toast';
import {
  getCommunity,
  getCommunityPosts,
  joinCommunity,
  leaveCommunity,
  createPost,
  deletePost,
  Community,
  CommunityPost,
  timeAgo,
} from '../services/communities';

interface CommunityDetailViewProps {
  communityId: string;
  onBack: () => void;
  onUserProfile?: (userId: string) => void;
}

const CommunityDetailView: React.FC<CommunityDetailViewProps> = ({
  communityId,
  onBack,
  onUserProfile,
}) => {
  const { token, user, isAuthenticated } = useAuth();
  const toast = useToast();
  const [community, setCommunity] = useState<Community | null>(null);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [joining, setJoining] = useState(false);
  const [newPost, setNewPost] = useState('');
  const [posting, setPosting] = useState(false);
  const [showPostMenu, setShowPostMenu] = useState<string | null>(null);
  const [postImage, setPostImage] = useState<string | null>(null);
  const [uploadingPostImage, setUploadingPostImage] = useState(false);
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  const [newComments, setNewComments] = useState<Record<string, string>>({});
  const [commentImages, setCommentImages] = useState<Record<string, string>>({});
  const [uploadingCommentImages, setUploadingCommentImages] = useState<Record<string, boolean>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const commentFileInputRef = useRef<HTMLInputElement>(null);

  const API_BASE = ((import.meta as unknown as { env: { VITE_API_URL?: string } }).env.VITE_API_URL || 'http://localhost:3001') + '/api';

  const handleImageUpload = async (file: File, forComment: boolean = false, commentPostId?: string) => {
    if (!token) {
      toast.error('Error', 'Debes iniciar sesion para subir imagenes');
      return null;
    }

    if (forComment && commentPostId) {
      setUploadingCommentImages({ ...uploadingCommentImages, [commentPostId]: true });
    } else {
      setUploadingPostImage(true);
    }

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_BASE}/upload/image`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Error al subir imagen');
      }

      const data = await response.json();
      return data.data.url;
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Error', 'No se pudo subir la imagen');
      return null;
    } finally {
      if (forComment && commentPostId) {
        setUploadingCommentImages(prev => ({ ...prev, [commentPostId]: false }));
      } else {
        setUploadingPostImage(false);
      }
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>, forComment: boolean = false, commentPostId?: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const imageUrl = await handleImageUpload(file, forComment, commentPostId);
    if (imageUrl) {
      if (forComment && commentPostId) {
        setCommentImages({ ...commentImages, [commentPostId]: imageUrl });
      } else {
        setPostImage(imageUrl);
      }
    }

    e.target.value = '';
  };

  const handleRemoveImage = (forComment: boolean = false, commentPostId?: string) => {
    if (forComment && commentPostId) {
      const newCommentImages = { ...commentImages };
      delete newCommentImages[commentPostId];
      setCommentImages(newCommentImages);
    } else {
      setPostImage(null);
    }
  };

  useEffect(() => {
    loadCommunity();
    loadPosts();
  }, [communityId, token]);

  const loadCommunity = async () => {
    try {
      const data = await getCommunity(communityId, token || undefined);
      console.log('Community loaded:', data.name, 'isMember:', data.isMember, 'memberRole:', data.memberRole, 'isPublic:', data.isPublic);
      setCommunity(data);
    } catch (error) {
      console.error('Error loading community:', error);
      toast.error('Error', 'No se pudo cargar la comunidad');
    } finally {
      setLoading(false);
    }
  };

  const loadPosts = async () => {
    try {
      const data = await getCommunityPosts(communityId);
      console.log('Loading posts:', data.posts.length, 'posts');
      setPosts(data.posts);
    } catch (error) {
      console.error('Error loading posts:', error);
    } finally {
      setLoadingPosts(false);
    }
  };

  const handleJoinLeave = async () => {
    if (!token || !community) {
      toast.error('Error', 'Debes iniciar sesion para unirte a la comunidad');
      return;
    }

    setJoining(true);
    try {
      if (community.isMember) {
        await leaveCommunity(communityId, token);
        setCommunity({
          ...community,
          isMember: false,
          memberRole: undefined,
          membersCount: Math.max(0, community.membersCount - 1),
        });
        toast.success('Saliendo', 'Has salido de la comunidad');
      } else {
        await joinCommunity(communityId, token);
        setCommunity({
          ...community,
          isMember: true,
          memberRole: 'MEMBER',
          membersCount: community.membersCount + 1,
        });
        toast.success('Unido!', 'Te has unido a la comunidad');
      }
    } catch (error: unknown) {
      console.error('Error joining/leaving:', error, 'community.isMember:', community.isMember);
      const message = error instanceof Error ? error.message : 'Error al procesar la solicitud';
      toast.error('Error', message);
    } finally {
      setJoining(false);
    }
  };

  const handlePost = async () => {
    if (!newPost.trim()) {
      toast.error('Error', 'Escribe algo para publicar');
      return;
    }
    if (!token) {
      toast.error('Error', 'Debes iniciar sesion para publicar');
      return;
    }

    setPosting(true);
    try {
      await createPost(communityId, newPost, postImage, token);
      setNewPost('');
      setPostImage(null);
      await loadPosts();
      toast.success('Publicado!', 'Tu publicacion esta lista');
    } catch (error: unknown) {
      console.error('Error creating post:', error);
      const message = error instanceof Error ? error.message : 'No se pudo crear la publicacion';
      toast.error('Error', message);
    } finally {
      setPosting(false);
    }
  };

  const handleComment = async (postId: string) => {
    const comment = newComments[postId]?.trim();
    if (!token || !comment) return;

    const imageUrl = commentImages[postId] || null;
    console.log('Comment submitted:', { postId, comment, imageUrl });
    
    const newCommentsState = { ...newComments };
    delete newCommentsState[postId];
    setNewComments(newCommentsState);
    
    const newCommentImagesState = { ...commentImages };
    delete newCommentImagesState[postId];
    setCommentImages(newCommentImagesState);
    
    setExpandedComments({ ...expandedComments, [postId]: false });
  };

  const handleDeletePost = async (postId: string) => {
    if (!token) return;

    try {
      await deletePost(communityId, postId, token);
      setPosts(posts.filter((p) => p.id !== postId));
      if (community) {
        setCommunity({ ...community, postsCount: community.postsCount - 1 });
      }
    } catch (error) {
      console.error('Error deleting post:', error);
    }
    setShowPostMenu(null);
  };

  if (loading) {
    return (
      <div className="h-full bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <Loader2 className="animate-spin text-oaxaca-pink" size={32} />
      </div>
    );
  }

  if (!community) {
    return (
      <div className="h-full bg-gray-50 dark:bg-gray-950 flex flex-col items-center justify-center p-4">
        <p className="text-gray-500">Comunidad no encontrada</p>
        <button onClick={onBack} className="mt-4 text-oaxaca-pink font-medium">
          Volver
        </button>
      </div>
    );
  }

  const canPost = community.isMember;
  const isAdminOrMod = community.memberRole === 'ADMIN' || community.memberRole === 'MODERATOR';

  return (
    <div className="h-full bg-gray-50 dark:bg-gray-950 pb-20 flex flex-col transition-colors">
      {/* Header - Full Width */}
      <div className="relative">
        {/* Cover */}
        <div className={`h-32 ${community.coverUrl ? '' : 'bg-gradient-to-br from-oaxaca-purple to-oaxaca-pink'}`}>
          {community.coverUrl && (
            <img src={community.coverUrl} alt="" className="w-full h-full object-cover" />
          )}
          <button
            onClick={onBack}
            className="absolute top-4 left-4 p-2 bg-black/30 text-white rounded-full hover:bg-black/50"
          >
            <ArrowLeft size={20} />
          </button>
        </div>

        {/* Community Info - Container Width */}
        <div className="px-4 md:px-6 lg:px-8 -mt-8 relative max-w-7xl mx-auto">
          <div className="flex items-end gap-4">
            <div className="w-20 h-20 rounded-xl overflow-hidden border-4 border-white dark:border-gray-800 shadow-lg bg-gradient-to-br from-oaxaca-purple to-oaxaca-pink">
              {community.imageUrl ? (
                <img src={community.imageUrl} alt={community.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white text-2xl font-bold">
                  {community.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="flex-1 pb-1">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">{community.name}</h1>
                {community.isPublic ? <Globe size={16} className="text-gray-400" /> : <Lock size={16} className="text-gray-400" />}
              </div>
            </div>
          </div>

          {community.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-3">{community.description}</p>
          )}

          <div className="flex items-center gap-4 mt-3">
            <span className="flex items-center gap-1 text-sm text-gray-500">
              <Users size={16} />
              {community.membersCount} miembros
            </span>
            <span className="flex items-center gap-1 text-sm text-gray-500">
              <MessageSquare size={16} />
              {community.postsCount} posts
            </span>
          </div>

          {/* Join/Leave Button */}
          {isAuthenticated && (
            <button
              onClick={handleJoinLeave}
              disabled={joining}
              className={`mt-4 w-full py-2.5 rounded-lg font-medium transition-colors ${
                community.isMember
                  ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                  : 'bg-oaxaca-pink text-white hover:bg-oaxaca-pink/90'
              }`}
            >
              {joining ? (
                <Loader2 className="animate-spin mx-auto" size={20} />
              ) : community.isMember ? (
                'Salir de la comunidad'
              ) : (
                'Unirse a la comunidad'
              )}
            </button>
          )}
        </div>
      </div>

      {/* Body - Constrained Width */}
      <div className="flex-1 overflow-y-auto mt-4 max-w-7xl mx-auto w-full px-4 md:px-6 lg:px-8">
        {/* New Post Input - Blog Style */}
        {canPost && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm mb-6 overflow-hidden">
            <div className="bg-gradient-to-r from-oaxaca-pink to-oaxaca-purple p-4">
              <h3 className="text-white font-bold text-lg flex items-center gap-2">
                <PlusCircle size={20} />
                Nueva Publicacion
              </h3>
            </div>
            <div className="p-4">
              <textarea
                value={newPost}
                onChange={(e) => setNewPost(e.target.value)}
                placeholder="Escribe tu publicacion aqui..."
                className="w-full bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-oaxaca-pink rounded-lg p-3"
                rows={4}
                maxLength={2000}
              />

              {/* Post Image Preview - Featured */}
              {postImage && (
                <div className="relative mt-4 rounded-xl overflow-hidden">
                  <img src={postImage} alt="Preview" className="w-full max-h-80 object-cover" />
                  <button
                    onClick={() => handleRemoveImage()}
                    className="absolute top-3 right-3 p-2 bg-black/60 text-white rounded-full hover:bg-black/80 transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>
              )}

              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingPostImage}
                  className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-oaxaca-pink hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  {uploadingPostImage ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      <span>Subiendo...</span>
                    </>
                  ) : (
                    <>
                      <ImageIcon size={20} />
                      <span>Agregar imagen</span>
                    </>
                  )}
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFileSelect(e)} />

                <button
                  onClick={handlePost}
                  disabled={posting || !newPost.trim()}
                  className="flex items-center gap-2 px-4 py-2 bg-oaxaca-pink text-white rounded-lg font-medium disabled:opacity-50"
                >
                  {posting ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
                  Publicar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Posts List */}
        {loadingPosts ? (
          <div className="flex justify-center py-8">
            <Loader2 className="animate-spin text-oaxaca-pink" size={24} />
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <MessageSquare size={48} className="mx-auto mb-3 opacity-50" />
            <p>Aun no hay posts en esta comunidad</p>
            {canPost && <p className="text-sm mt-1">Se el primero en publicar!</p>}
          </div>
        ) : (
          <div className="space-y-3 pb-4">
            {posts.map((post) => (
              <div key={post.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
                {/* Featured Image */}
                {post.imageUrl && (
                  <div className="w-full">
                    <img src={post.imageUrl} alt="" className="w-full max-h-96 object-cover" />
                  </div>
                )}

                <div className="p-5">
                  <div className="flex items-center gap-3">
                    <button onClick={() => onUserProfile?.(post.author.id)} className="flex-shrink-0">
                      {post.author.avatar ? (
                        <img
                          src={post.author.avatar}
                          alt={post.author.nombre}
                          className="w-12 h-12 rounded-full object-cover border-2 border-gray-100 dark:border-gray-700"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-oaxaca-yellow rounded-full flex items-center justify-center border-2 border-gray-100 dark:border-gray-700">
                          <span className="text-oaxaca-purple font-bold text-lg">
                            {post.author.nombre.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                    </button>

                    <div className="flex-1 min-w-0">
                      <button
                        onClick={() => onUserProfile?.(post.author.id)}
                        className="font-semibold text-gray-900 dark:text-gray-100 hover:text-oaxaca-pink transition-colors"
                      >
                        {post.author.nombre}
                      </button>
                      <p className="text-xs text-gray-400">{timeAgo(post.createdAt)}</p>
                    </div>
                  </div>

                  <div className="mt-4">
                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">{post.content}</p>
                  </div>

                  {/* Post Actions */}
                  <div className="flex items-center gap-6 mt-5 pt-4 border-t border-gray-100 dark:border-gray-700">
                    <button
                      onClick={() => setExpandedComments({ ...expandedComments, [post.id]: !expandedComments[post.id] })}
                      className="flex items-center gap-2 text-sm text-gray-500 hover:text-oaxaca-pink transition-colors"
                    >
                      <MessageSquare size={18} />
                      <span>Comentar</span>
                    </button>

                    {(post.author.id === user?.id || isAdminOrMod) && (
                      <div className="relative ml-auto">
                        <button
                          onClick={() => setShowPostMenu(showPostMenu === post.id ? null : post.id)}
                          className="p-1 text-gray-400 hover:text-gray-600"
                        >
                          <MoreVertical size={16} />
                        </button>

                        {showPostMenu === post.id && (
                          <div className="absolute right-0 top-6 w-32 bg-white dark:bg-gray-700 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 py-1 z-10">
                            <button
                              onClick={() => handleDeletePost(post.id)}
                              className="w-full px-3 py-2 text-left text-sm text-red-500 hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center gap-2"
                            >
                              <Trash2 size={14} />
                              Eliminar
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Comment Section */}
                  {expandedComments[post.id] && (
                    <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
                      {isAuthenticated && (
                        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                          <textarea
                            value={newComments[post.id] || ''}
                            onChange={(e) => setNewComments({ ...newComments, [post.id]: e.target.value })}
                            placeholder="Escribe un comentario..."
                            className="w-full bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-400 resize-none focus:outline-none text-sm"
                            rows={2}
                            maxLength={1000}
                          />

                          {commentImages[post.id] && (
                            <div className="relative mt-2">
                              <img src={commentImages[post.id]} alt="Preview" className="rounded-lg max-h-32 object-cover" />
                              <button
                                onClick={() => handleRemoveImage(true, post.id)}
                                className="absolute top-1 right-1 p-1 bg-black/50 rounded-full text-white hover:bg-black/70"
                              >
                                <X size={12} />
                              </button>
                            </div>
                          )}

                          <div className="flex items-center justify-between mt-2">
                            <button
                              onClick={() => commentFileInputRef.current?.click()}
                              disabled={uploadingCommentImages[post.id]}
                              className="flex items-center gap-1 text-gray-400 hover:text-oaxaca-pink transition-colors disabled:opacity-50"
                            >
                              {uploadingCommentImages[post.id] ? (
                                <Loader2 size={16} className="animate-spin" />
                              ) : (
                                <ImageIcon size={16} />
                              )}
                            </button>
                            <input
                              ref={commentFileInputRef}
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => handleFileSelect(e, true, post.id)}
                            />

                            <button
                              onClick={() => handleComment(post.id)}
                              disabled={!newComments[post.id]?.trim()}
                              className="flex items-center gap-1 px-3 py-1 bg-oaxaca-pink text-white rounded-lg text-sm font-medium disabled:opacity-50"
                            >
                              <Send size={14} />
                              Enviar
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CommunityDetailView;
