import React, { useState, useEffect, useRef } from 'react';
import {
  ChevronLeft,
  Users,
  Heart,
  Share2,
  Send,
  MoreVertical,
  Maximize,
} from 'lucide-react';
import {
  getStream,
  connectToStreamChat,
  sendStreamMessage,
  LiveStream,
  StreamMessage,
  CATEGORY_LABELS,
} from '../services/streams';
import LoadingSpinner from './ui/LoadingSpinner';
import GradientPlaceholder from './ui/GradientPlaceholder';
import { ViewState } from '../types';

interface StreamWatchViewProps {
  streamId: string;
  onNavigate: (view: ViewState, data?: unknown) => void;
  onBack: () => void;
}

export default function StreamWatchView({
  streamId,
  onNavigate,
  onBack,
}: StreamWatchViewProps) {
  const [stream, setStream] = useState<(LiveStream & { messages: StreamMessage[] }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<StreamMessage[]>([]);
  const [viewerCount, setViewerCount] = useState(0);
  const [newMessage, setNewMessage] = useState('');
  const [showChat, setShowChat] = useState(true);
  const chatRef = useRef<{ sendMessage: (content: string) => void; close: () => void } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadStream();
  }, [streamId]);

  useEffect(() => {
    if (stream?.status === 'LIVE') {
      connectToChat();
    }

    return () => {
      chatRef.current?.close();
    };
  }, [stream?.id, stream?.status]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadStream = async () => {
    try {
      setLoading(true);
      const data = await getStream(streamId);
      setStream(data);
      setMessages(data.messages.reverse());
      setViewerCount(data.viewerCount);
    } catch (error) {
      console.error('Error loading stream:', error);
    } finally {
      setLoading(false);
    }
  };

  const connectToChat = () => {
    if (chatRef.current) {
      chatRef.current.close();
    }

    chatRef.current = connectToStreamChat(streamId, {
      onMessage: (message) => {
        setMessages((prev) => [...prev, message]);
      },
      onViewerCount: (count) => {
        setViewerCount(count);
      },
      onError: (error) => {
        console.error('Chat error:', error);
      },
      onClose: () => {
        if (import.meta.env.DEV) console.log('[StreamWatchView] Chat disconnected');
      },
    });
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    try {
      if (chatRef.current) {
        chatRef.current.sendMessage(newMessage);
      } else {
        await sendStreamMessage(streamId, newMessage);
        loadStream();
      }
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleShare = async () => {
    try {
      await navigator.share({
        title: stream?.title,
        text: `Mira este stream: ${stream?.title}`,
        url: window.location.href,
      });
    } catch {
      navigator.clipboard.writeText(window.location.href);
    }
  };

  if (loading || !stream) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-900">
        <LoadingSpinner size="lg" color="white" text="Conectando al stream..." />
      </div>
    );
  }

  const isLive = stream.status === 'LIVE';

  return (
    <div className="flex flex-col h-full bg-gray-900 max-w-7xl mx-auto">
      {/* Top bar — always accessible, outside iframe */}
      <div className="flex items-center justify-between px-3 py-2 bg-gray-800 border-b border-gray-700">
        <button onClick={onBack} className="flex items-center gap-1 p-2 text-white hover:text-gray-300 transition-colors">
          <ChevronLeft className="w-5 h-5" />
          <span className="text-sm">Streams</span>
        </button>
        <div className="flex gap-2">
          {isLive && (
            <div className="flex items-center gap-1 px-2 py-1 bg-red-600 rounded text-white text-sm">
              <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
              EN VIVO
            </div>
          )}
          <div className="flex items-center gap-1 px-2 py-1 bg-gray-700 rounded text-white text-sm">
            <Users className="w-4 h-4" />
            {viewerCount}
          </div>
        </div>
      </div>

      {/* Video Player / Embed */}
      <div className="relative bg-black aspect-video">
        {stream.embedUrl ? (
          <iframe
            src={stream.embedUrl}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            title={stream.title}
          />
        ) : stream.playbackUrl ? (
          <video
            src={stream.playbackUrl}
            className="w-full h-full"
            controls
            autoPlay
            playsInline
          />
        ) : stream.vodUrl ? (
          <video
            src={stream.vodUrl}
            className="w-full h-full"
            controls
            playsInline
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            {stream.thumbnailUrl ? (
              <img
                src={stream.thumbnailUrl}
                alt={stream.title}
                className="w-full h-full object-cover opacity-50"
              />
            ) : (
              <GradientPlaceholder variant="stage" className="w-full h-full opacity-50" alt={stream.title} />
            )}
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-white text-lg">
                {isLive ? 'Conectando...' : 'Stream no disponible'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Stream Info */}
      <div className="p-4 bg-gray-800 border-b border-gray-700">
        <div className="flex gap-3">
          <img
            src={stream.user.avatar || '/default-avatar.png'}
            alt={stream.user.nombre}
            className="w-12 h-12 rounded-full"
          />
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-white line-clamp-1">{stream.title}</h1>
            <p className="text-sm text-gray-400">
              {stream.user.nombre} {stream.user.apellido}
            </p>
            <span className="text-xs text-gray-500">{CATEGORY_LABELS[stream.category]}</span>
          </div>
          <div className="flex gap-2">
            <button className="p-2 text-gray-400 hover:text-red-500">
              <Heart className="w-6 h-6" />
            </button>
            <button onClick={handleShare} className="p-2 text-gray-400 hover:text-white">
              <Share2 className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>

      {/* Chat */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Chat toggle */}
        <button
          onClick={() => setShowChat(!showChat)}
          className="p-2 text-gray-400 text-sm text-center bg-gray-800 border-b border-gray-700"
        >
          {showChat ? 'Ocultar chat' : 'Mostrar chat'}
        </button>

        {showChat && (
          <>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 ? (
                <p className="text-center text-gray-500 py-4">
                  {isLive ? 'Se el primero en comentar!' : 'No hay comentarios'}
                </p>
              ) : (
                messages.map((msg) => (
                  <div key={msg.id} className="flex gap-2">
                    <img
                      src={msg.user.avatar || '/default-avatar.png'}
                      alt={msg.user.nombre}
                      className="w-8 h-8 rounded-full"
                    />
                    <div>
                      <span className="text-sm font-medium text-red-400">{msg.user.nombre}</span>
                      <p className="text-white text-sm">{msg.content}</p>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message input */}
            {isLive && (
              <div className="p-4 bg-gray-800 border-t border-gray-700">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Escribe un mensaje..."
                    className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim()}
                    className="p-2 bg-red-600 text-white rounded-lg disabled:opacity-50"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
