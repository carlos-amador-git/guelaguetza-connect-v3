import React, { useState, useRef, useEffect } from 'react';
import DOMPurify from 'dompurify';
import { Send, Sparkles, User, Bot, Trash2, ChevronLeft, Mic, MicOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: Date;
}

// Knowledge base for GuelaBot
const GUELAGUETZA_KNOWLEDGE = {
  general: {
    keywords: ['qué es', 'guelaguetza', 'que es', 'significa', 'origen', 'historia'],
    response: `¡La Guelaguetza es la fiesta más grande de Oaxaca! 🎉

Es una celebración ancestral que significa "ofrenda" o "don recíproco" en zapoteco. Se celebra los dos lunes después del 16 de julio (Lunes del Cerro).

Durante la fiesta, delegaciones de las 8 regiones de Oaxaca presentan sus danzas tradicionales y comparten sus productos típicos con el público.`
  },
  danzas: {
    keywords: ['danza', 'baile', 'flor de piña', 'pluma', 'danzas', 'bailes'],
    response: `Las danzas más emblemáticas de la Guelaguetza son:

🍍 **Flor de Piña** - Mujeres tuxtepecanas con huipiles bordados y piñas en la cabeza
🦅 **Danza de la Pluma** - Representa la conquista española con impresionantes penachos
💃 **Jarabe del Valle** - El baile de cortejo oaxaqueño
🎭 **Danza de los Diablos** - De la Costa, con máscaras y movimientos enérgicos

Cada danza cuenta una historia de la región que representa.`
  },
  transporte: {
    keywords: ['bus', 'transporte', 'ruta', 'llegar', 'auditorio', 'cómo llego', 'binnibus'],
    response: `Para llegar al Auditorio Guelaguetza tienes estas opciones:

🚌 **BinniBus RC01** - Ruta especial Guelaguetza
   • Sale de Alameda de León
   • Cada 5 minutos
   • Costo: $10 MXN

📍 **Paradas**: Alameda → Chedraui Madero → Museo Infantil → Auditorio

También hay taxis colectivos desde el Zócalo. ¡Usa la sección BinniBus de la app para ver rutas en tiempo real!`
  },
  horarios: {
    keywords: ['horario', 'hora', 'cuando', 'programa', 'fecha', 'calendario', 'cuándo'],
    response: `📅 **Guelaguetza 2025**

**Fechas**: 21-28 de julio 2025

**Lunes del Cerro** (eventos principales):
• 21 y 28 de julio
• 10:00 AM - 4:00 PM

**Eventos destacados**:
• Desfile de Delegaciones - 17:00
• Feria del Mezcal - Todo el día
• Noche de Calenda - 20:00

¡Revisa la sección "Programa" para ver todos los eventos!`
  },
  boletos: {
    keywords: ['boleto', 'ticket', 'entrada', 'comprar', 'precio', 'costo', 'cuánto'],
    response: `🎫 **Boletos Guelaguetza 2025**

**Precios aproximados**:
• Palco A (VIP): $1,500 - $2,500 MXN
• Palco B: $800 - $1,200 MXN
• Gradería: $300 - $500 MXN

**Dónde comprar**:
• Ticketmaster.com.mx
• Taquillas del Auditorio
• Módulos en el Zócalo

⚠️ ¡Compra con anticipación! Se agotan rápido.`
  },
  comida: {
    keywords: ['comida', 'comer', 'gastronomía', 'mezcal', 'mole', 'tlayuda', 'restaurante'],
    response: `🍽️ **Gastronomía Oaxaqueña**

No puedes perderte:
• 🫓 **Tlayudas** - La pizza oaxaqueña
• 🍲 **7 Moles** - Negro, rojo, amarillo, verde, coloradito, chichilo, manchamanteles
• 🥃 **Mezcal** - Pruébalo en la Feria del Mezcal
• 🧀 **Quesillo** - Queso Oaxaca tradicional
• 🍫 **Chocolate** - De molinillo

**Lugares recomendados**:
• Mercado 20 de Noviembre
• Mercado Benito Juárez
• Restaurantes en el Centro Histórico`
  },
  regiones: {
    keywords: ['región', 'regiones', 'delegación', 'delegaciones', 'pueblos'],
    response: `🗺️ **Las 8 Regiones de Oaxaca**

Cada una presenta su cultura en la Guelaguetza:

1. **Valles Centrales** - Sede de la ciudad de Oaxaca
2. **Sierra Norte** - Pueblos mancomunados, mezcal
3. **Sierra Sur** - Artesanías de palma
4. **Mixteca** - Cuna de la civilización mixteca
5. **Costa** - Playas y Danza de los Diablos
6. **Istmo** - Tehuana, Flor de Piña
7. **Papaloapan** - Tuxtepec, piña
8. **Cañada** - Mazateca, hongos sagrados`
  },
  clima: {
    keywords: ['clima', 'tiempo', 'lluvia', 'temperatura', 'qué llevar', 'ropa'],
    response: `🌤️ **Clima en julio en Oaxaca**

• Temperatura: 18°C - 28°C
• Es temporada de lluvias ☔

**Recomendaciones**:
• 🧥 Lleva una chamarra ligera
• ☂️ Paraguas o impermeable
• 🧴 Protector solar
• 👟 Zapatos cómodos
• 🎒 Mochila pequeña

Las lluvias suelen ser por la tarde, ¡las mañanas son perfectas!`
  },
  ubicacion: {
    keywords: ['dónde', 'ubicación', 'dirección', 'mapa', 'cerro', 'fortín'],
    response: `📍 **Ubicación del Auditorio Guelaguetza**

El Auditorio está en el **Cerro del Fortín**, con vista panorámica a la ciudad.

**Dirección**:
Camino al Cerro del Fortín s/n
Col. Loma del Fortín
Oaxaca de Juárez

**Cómo llegar**:
• En BinniBus: Ruta RC01
• En taxi: Pide "Auditorio Guelaguetza"
• Caminando: 30 min desde el Zócalo (subida)

¡Usa el mapa en la sección BinniBus!`
  }
};

const QUICK_SUGGESTIONS = [
  '¿Qué es la Guelaguetza?',
  '¿Cómo llego al Auditorio?',
  '¿Cuáles son las danzas?',
  '¿Dónde compro boletos?',
  '¿Qué puedo comer?',
  '¿Cuál es el horario?',
];

// Simple AI response generator
const generateResponse = (userMessage: string): string => {
  const message = userMessage.toLowerCase();

  // Check each knowledge category
  for (const [, data] of Object.entries(GUELAGUETZA_KNOWLEDGE)) {
    if (data.keywords.some(keyword => message.includes(keyword))) {
      return data.response;
    }
  }

  // Check for greetings
  if (/^(hola|hey|buenos|buenas|qué tal|saludos)/i.test(message)) {
    return `¡Hola! 👋 Soy GuelaBot, tu guía virtual para la Guelaguetza 2025.

¿En qué puedo ayudarte? Puedo contarte sobre:
• 🎭 Danzas tradicionales
• 🚌 Rutas de transporte
• 🎫 Boletos y precios
• 🍽️ Gastronomía oaxaqueña
• 📅 Horarios y programa

¡Pregúntame lo que quieras!`;
  }

  // Check for thanks
  if (/gracias|thanks|thx/i.test(message)) {
    return `¡Con mucho gusto! 😊 Si tienes más preguntas sobre la Guelaguetza, aquí estaré.

¡Que disfrutes la máxima fiesta de Oaxaca! 🎉`;
  }

  // Default response
  return `Mmm, no estoy seguro de entender tu pregunta. 🤔

Puedo ayudarte con información sobre:
• La historia de la Guelaguetza
• Cómo llegar al Auditorio
• Danzas y delegaciones
• Boletos y precios
• Gastronomía oaxaqueña
• Horarios del evento

¿Sobre cuál tema te gustaría saber más?`;
};

interface ChatAssistantProps {
  onClose?: () => void;
  onBack?: () => void;
  embedded?: boolean;
}

const ChatAssistant: React.FC<ChatAssistantProps> = ({ onClose, onBack, embedded = false }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load chat history from localStorage
  useEffect(() => {
    const savedMessages = localStorage.getItem('guelabot_history');
    if (savedMessages) {
      const parsed = JSON.parse(savedMessages);
      setMessages(parsed.map((m: Message) => ({ ...m, timestamp: new Date(m.timestamp) })));
    } else {
      // Welcome message
      setMessages([{
        id: 'welcome',
        role: 'assistant',
        text: `¡Hola${user?.nombre ? ` ${user.nombre}` : ''}! 👋 Soy **GuelaBot**, tu guía virtual para la Guelaguetza 2025.

Puedo ayudarte con:
• 🎭 Danzas y tradiciones
• 🚌 Rutas de transporte
• 🎫 Boletos y precios
• 🍽️ Gastronomía
• 📅 Programa de eventos

¿Qué te gustaría saber?`,
        timestamp: new Date()
      }]);
    }
  }, [user?.nombre]);

  // Save messages to localStorage
  useEffect(() => {
    if (messages.length > 1) {
      localStorage.setItem('guelabot_history', JSON.stringify(messages));
    }
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (text?: string) => {
    const messageText = text || inputValue;
    if (!messageText.trim() || isLoading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: messageText,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsLoading(true);

    // Simulate typing delay
    await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 700));

    const responseText = generateResponse(messageText);

    const botMsg: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      text: responseText,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, botMsg]);
    setIsLoading(false);
  };

  const clearHistory = () => {
    localStorage.removeItem('guelabot_history');
    setMessages([{
      id: 'welcome-new',
      role: 'assistant',
      text: `¡Conversación reiniciada! 🔄

¿En qué puedo ayudarte con la Guelaguetza 2025?`,
      timestamp: new Date()
    }]);
  };

  const toggleVoice = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Tu navegador no soporta reconocimiento de voz');
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as unknown as { SpeechRecognition?: new () => SpeechRecognition; webkitSpeechRecognition?: new () => SpeechRecognition }).SpeechRecognition || (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognition }).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.lang = 'es-MX';
    recognition.continuous = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript;
      setInputValue(transcript);
      inputRef.current?.focus();
    };

    recognition.start();
  };

  // Format message text with markdown-like syntax
  const formatMessage = (text: string) => {
    return text.split('\n').map((line, i) => {
      // Bold
      line = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      const sanitized = DOMPurify.sanitize(line, { ALLOWED_TAGS: ['strong'] });
      // Bullet points
      if (line.startsWith('•')) {
        return <li key={i} className="ml-4" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(line.substring(1), { ALLOWED_TAGS: ['strong'] }) }} />;
      }
      return <p key={i} className="mb-1" dangerouslySetInnerHTML={{ __html: sanitized }} />;
    });
  };

  return (
    <div className={`flex flex-col bg-gradient-to-b from-oaxaca-purple to-oaxaca-purple ${embedded ? 'h-full' : 'h-full pb-20'}`}>
      {/* Header with image */}
      <div className="relative overflow-hidden">
        <img src="/images/morado.png" alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="relative p-4 pt-6 text-white max-w-7xl mx-auto w-full">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              {(onBack || onClose) && (
                <button onClick={onBack || onClose} className="p-2 -ml-2 rounded-full hover:bg-white/10 transition">
                  <ChevronLeft size={20} aria-hidden="true" />
                </button>
              )}
              <img src="/images/ui/icon_bot.png" alt="GuelaBot" className="w-10 h-10 md:w-12 md:h-12 object-contain drop-shadow-md" />
              <h2 className="text-xl font-bold">GuelaBot</h2>
            </div>
            <button
              onClick={clearHistory}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
              title="Borrar conversación"
            >
              <Trash2 size={18} />
            </button>
          </div>
          <p className="text-sm text-white/70">Tu guia virtual de la Guelaguetza</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 md:px-6 lg:px-8 py-2 space-y-4 max-w-7xl mx-auto w-full">
        {/* Welcome & Quick Suggestions */}
        {messages.length <= 1 && (
          <div className="text-center py-6 space-y-4">
            <div className="bg-white/20 p-4 rounded-full w-16 h-16 mx-auto flex items-center justify-center">
              <Sparkles size={28} className="text-oaxaca-yellow" />
            </div>
            <div>
              <p className="text-white font-semibold">Tu guía de la Guelaguetza</p>
              <p className="text-white/60 text-sm">Pregúntame lo que quieras</p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              {QUICK_SUGGESTIONS.map((suggestion, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(suggestion)}
                  className="bg-white/10 hover:bg-white/20 text-white text-xs px-3 py-1.5 rounded-full transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div key={msg.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
              <div className={`flex max-w-[85%] ${isUser ? 'flex-row-reverse' : 'flex-row'} items-end gap-2`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  isUser ? 'bg-oaxaca-yellow' : 'bg-oaxaca-pink'
                }`}>
                  {isUser ? (
                    user?.faceData ? (
                      <img src={user.faceData} alt="" className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <User size={16} className="text-oaxaca-purple" />
                    )
                  ) : (
                    <Bot size={16} className="text-white" />
                  )}
                </div>
                <div
                  className={`p-3 rounded-2xl text-sm ${
                    isUser
                      ? 'bg-oaxaca-yellow text-oaxaca-purple rounded-br-sm'
                      : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-bl-sm shadow-lg'
                  }`}
                >
                  <div className="leading-relaxed">
                    {formatMessage(msg.text)}
                  </div>
                  <p className={`text-[10px] mt-1 ${isUser ? 'text-oaxaca-purple/50' : 'text-gray-400 dark:text-gray-500'}`}>
                    {msg.timestamp.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex justify-start">
            <div className="flex items-end gap-2">
              <div className="w-8 h-8 rounded-full bg-oaxaca-pink flex items-center justify-center">
                <Bot size={16} className="text-white" />
              </div>
              <div className="bg-white dark:bg-gray-800 px-4 py-3 rounded-2xl rounded-bl-sm shadow-lg">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 md:px-6 lg:px-8 bg-white/10 backdrop-blur-sm max-w-7xl mx-auto w-full">
        <div className="flex gap-2 items-center">
          <button
            onClick={toggleVoice}
            className={`p-3 rounded-full transition-colors ${
              isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-white/20 text-white hover:bg-white/30'
            }`}
          >
            {isListening ? <MicOff size={20} /> : <Mic size={20} />}
          </button>
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Pregunta sobre la Guelaguetza..."
            className="flex-1 bg-white/20 text-white placeholder-white/70 border-0 rounded-full px-4 py-3 text-sm focus:ring-2 focus:ring-oaxaca-yellow outline-none transition"
          />
          <button
            onClick={() => handleSend()}
            disabled={isLoading || !inputValue.trim()}
            className="bg-oaxaca-yellow text-oaxaca-purple p-3 rounded-full hover:bg-oaxaca-yellow/90 disabled:opacity-50 transition shadow-lg"
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatAssistant;
