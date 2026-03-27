import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, MessageCircle, Archive, Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
  getConversations,
  Conversation,
  timeAgo,
  connectDMWebSocket,
  disconnectDMWebSocket,
  onMessage,
  onDMUnreadCount,
} from '../services/dm';
import PullToRefresh from './ui/PullToRefresh';
import { SkeletonGrid } from './ui/LoadingSpinner';
import SwipeAction from './ui/SwipeAction';
import EmptyState from './ui/EmptyState';
import Avatar from './ui/Avatar';
import { SlideUp } from './ui/PageTransition';

interface DirectMessagesViewProps {
  onBack: () => void;
  onOpenChat: (conversationId: string, participant: Conversation['otherParticipant']) => void;
}

const DirectMessagesView: React.FC<DirectMessagesViewProps> = ({
  onBack,
  onOpenChat,
}) => {
  const { token, isAuthenticated } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalUnread, setTotalUnread] = useState(0);

  useEffect(() => {
    if (!isAuthenticated || !token) return;

    loadConversations();

    // Connect WebSocket for real-time messages
    connectDMWebSocket(token);

    // Listen for new messages
    const unsubMessage = onMessage((message) => {
      setConversations((prev) => {
        const updated = prev.map((conv) => {
          if (conv.id === message.conversationId) {
            return {
              ...conv,
              lastMessage: {
                content: message.content,
                senderId: message.senderId,
                createdAt: message.createdAt,
              },
              lastMessageAt: message.createdAt,
              unreadCount: conv.unreadCount + 1,
            };
          }
          return conv;
        });

        // Sort by lastMessageAt
        return updated.sort((a, b) => {
          if (!a.lastMessageAt) return 1;
          if (!b.lastMessageAt) return -1;
          return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
        });
      });
    });

    const unsubUnread = onDMUnreadCount((count) => {
      setTotalUnread(count);
    });

    return () => {
      unsubMessage();
      unsubUnread();
      disconnectDMWebSocket();
    };
  }, [isAuthenticated, token]);

  const loadConversations = useCallback(async () => {
    if (!token) return;

    setLoading(true);
    try {
      const data = await getConversations(1, 50, token);
      setConversations(data.conversations);
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  }, [token]);

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 -ml-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
          >
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Mensajes</h1>
            {totalUnread > 0 && (
              <p className="text-xs text-oaxaca-pink">{totalUnread} sin leer</p>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <PullToRefresh onRefresh={loadConversations} className="flex-1">
        <div className="h-full max-w-7xl mx-auto">
          {loading ? (
            <div className="p-4">
              <SkeletonGrid type="message" count={6} columns={1} />
            </div>
          ) : conversations.length === 0 ? (
            <EmptyState
              type="messages"
              title="Sin conversaciones"
              description="Inicia una conversación desde el perfil de otro usuario"
            />
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {conversations.map((conv, index) => (
                <SlideUp key={conv.id} delay={index * 50}>
                  <SwipeAction
                    leftActions={[
                      {
                        icon: <Archive size={20} />,
                        color: 'white',
                        bgColor: 'bg-oaxaca-sky',
                        label: 'Archivar',
                        onClick: () => {
                          // Archive conversation
                          setConversations(prev => prev.filter(c => c.id !== conv.id));
                        },
                      },
                    ]}
                    rightActions={[
                      {
                        icon: <Trash2 size={20} />,
                        color: 'white',
                        bgColor: 'bg-red-500',
                        label: 'Eliminar',
                        onClick: () => {
                          // Delete conversation
                          if (window.confirm('¿Eliminar esta conversación?')) {
                            setConversations(prev => prev.filter(c => c.id !== conv.id));
                          }
                        },
                      },
                    ]}
                  >
                    <button
                      onClick={() => onOpenChat(conv.id, conv.otherParticipant)}
                      className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                    >
                      {/* Avatar */}
                      <div className="relative">
                        <Avatar
                          src={conv.otherParticipant.avatar}
                          name={`${conv.otherParticipant.nombre} ${conv.otherParticipant.apellido || ''}`}
                          size="lg"
                        />
                        {conv.unreadCount > 0 && (
                          <div className="absolute -top-1 -right-1 w-5 h-5 bg-oaxaca-pink text-white text-xs font-bold rounded-full flex items-center justify-center">
                            {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0 text-left">
                        <div className="flex items-center justify-between">
                          <h3
                            className={`font-semibold truncate ${
                              conv.unreadCount > 0
                                ? 'text-gray-900 dark:text-white'
                                : 'text-gray-700 dark:text-gray-300'
                            }`}
                          >
                            {conv.otherParticipant.nombre}{' '}
                            {conv.otherParticipant.apellido && conv.otherParticipant.apellido}
                          </h3>
                          {conv.lastMessage && (
                            <span className="text-xs text-gray-400 ml-2">
                              {timeAgo(conv.lastMessage.createdAt)}
                            </span>
                          )}
                        </div>
                        {conv.lastMessage && (
                          <p
                            className={`text-sm truncate mt-1 ${
                              conv.unreadCount > 0
                                ? 'text-gray-900 dark:text-white font-medium'
                                : 'text-gray-500 dark:text-gray-400'
                            }`}
                          >
                            {conv.lastMessage.content}
                          </p>
                        )}
                      </div>
                    </button>
                  </SwipeAction>
                </SlideUp>
              ))}
            </div>
          )}
        </div>
      </PullToRefresh>
    </div>
  );
};

export default DirectMessagesView;
