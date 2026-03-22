import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Language = 'es' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  greeting: string;
  languageLabel: string;
}

// Comprehensive translations organized by domain
const translations: Record<Language, Record<string, string>> = {
  es: {
    // Common
    greeting: 'Bienvenido',
    welcome_message: 'La maxima fiesta de los Oaxaquenos',
    hello: 'Hola',
    thank_you: 'Gracias',
    goodbye: 'Adios',
    loading: 'Cargando...',
    close: 'Cerrar',
    cancel: 'Cancelar',
    confirm: 'Confirmar',
    save: 'Guardar',
    delete: 'Eliminar',
    edit: 'Editar',
    back: 'Volver',
    next: 'Siguiente',
    previous: 'Anterior',
    see_more: 'Ver mas',
    see_all: 'Ver todo',
    see_details: 'Ver detalles',
    share: 'Compartir',
    filter: 'Filtrar',
    sort: 'Ordenar',
    no_results: 'Sin resultados',
    error_generic: 'Ocurrio un error. Intenta de nuevo.',
    retry: 'Reintentar',
    required_field: 'Campo requerido',
    select_option: 'Selecciona una opcion',

    // Nav
    home: 'Inicio',
    events: 'Eventos',
    explore: 'Explorar',
    profile: 'Perfil',
    search: 'Buscar',
    transport: 'Transporte',
    program: 'Programa',
    stories: 'Historias',
    shop: 'Tienda',
    communities: 'Comunidades',
    settings: 'Configuracion',
    notifications: 'Notificaciones',
    wishlist: 'Lista de deseos',
    cart: 'Carrito',
    orders: 'Pedidos',
    bookings: 'Reservas',
    chat: 'Chat',
    map: 'Mapa',
    streams: 'En Vivo',
    tours: 'Tours',
    plan: 'Planificar',

    // Auth
    login: 'Iniciar sesion',
    logout: 'Cerrar sesion',
    register: 'Registrarse',
    email: 'Correo electronico',
    password: 'Contrasena',
    confirm_password: 'Confirmar contrasena',
    forgot_password: 'Olvide mi contrasena',
    login_with_face: 'Acceder con Face ID',
    login_as_visitor: 'Soy Visitante',
    login_as_seller: 'Soy Vendedor',
    login_as_admin: 'Administrador',
    entering: 'Ingresando...',
    login_error: 'Credenciales incorrectas. Intenta de nuevo.',
    camera_error: 'No se pudo acceder a la camara',
    no_account: 'No tienes cuenta?',
    already_account: 'Ya tienes cuenta?',
    create_account: 'Crear cuenta',
    full_name: 'Nombre completo',
    please_login: 'Por favor inicia sesion',

    // Events
    next_event: 'Proximo Evento',
    all_events: 'Todos los eventos',
    event_calendar: 'Calendario de eventos',
    event_details: 'Detalles del evento',
    rsvp: 'Confirmar asistencia',
    confirmed: 'Confirmado',
    attending: 'asistiran',
    sold_out: 'Agotado',
    few_left: 'Ultimos boletos!',
    get_tickets: 'Obtener boletos',
    free_entry: 'Entrada libre',
    add_to_calendar: 'Agregar al calendario',
    delegations: 'Delegaciones',
    parade: 'Desfile de Delegaciones',

    // Festival
    festival: 'Festival',
    dance: 'Danza',
    music: 'Musica',
    food: 'Comida',
    crafts: 'Artesanias',
    ceremony: 'Ceremonia',
    regions: 'regiones',
    artisans: 'Artesanos',
    expected_visitors: 'Visitantes esperados',
    festival_numbers: 'Festival en Numeros',
    new_experiences: 'Nuevas Experiencias',
    community: 'Comunidad',
    community_groups: 'Grupos y foros',
    complete_calendar: 'Calendario completo',
    discover_oaxaca: 'Descubre Oaxaca',
    celebrating_culture: 'Celebrando la cultura y tradiciones de Oaxaca',
    select_entry: 'Selecciona como deseas ingresar',
    in_your_pocket: 'en tu bolsillo',
    july_dates: 'Julio 21-28, 2025',

    // Gastronomy
    gastronomy: 'Gastronomia',
    flavors_of_oaxaca: 'Sabores de Oaxaca',
    curated_by_locals: 'Lugares curados por locales',
    all_categories: 'Todos',
    must_try: 'El imperdible',
    view_in_maps: 'Ver en Maps',
    how_to_get_there: 'Como llegar',
    reservation_required: 'Reservar',
    ask_guelabot: 'Pregunta a GuelaBot por mas recomendaciones',
    no_places_category: 'No hay lugares en esta categoria',

    // Shop / Marketplace
    add_to_cart: 'Agregar al carrito',
    buy_now: 'Comprar ahora',
    checkout: 'Pagar',
    total: 'Total',
    subtotal: 'Subtotal',
    shipping: 'Envio',
    quantity: 'Cantidad',
    price: 'Precio',
    product_details: 'Detalles del producto',
    categories: 'Categorias',
    best_sellers: 'Mas vendidos',
    new_arrivals: 'Nuevos',
    free_shipping: 'Envio gratis',

    // Experiences / Tours
    book_now: 'Reservar ahora',
    duration: 'Duracion',
    group_size: 'Tamano de grupo',
    includes: 'Incluye',
    meeting_point: 'Punto de encuentro',
    available_dates: 'Fechas disponibles',
    per_person: 'por persona',
    reviews: 'Resenas',

    // Transport
    safe_routes: 'Rutas seguras y ETA',
    estimated_time: 'Tiempo estimado',
    directions: 'Direcciones',

    // AR / Museum
    ar_museum: 'AR Guelaguetza',
    discover_magic: 'Descubre la magia',
    scan: 'Escanear',

    // Stories
    live_moments: 'Momentos en vivo',

    // Chat
    guelabot: 'GuelaBot',
    virtual_assistant: 'Tu asistente virtual',
    ask_about: 'Preguntame sobre rutas, horarios, recomendaciones y mas.',
    start_chat: 'Iniciar chat',
    ask_guelabot_short: 'Pregunta a GuelaBot',

    // Profile
    my_profile: 'Mi perfil',
    edit_profile: 'Editar perfil',
    my_orders: 'Mis pedidos',
    my_bookings: 'Mis reservas',

    // Seller
    seller_dashboard: 'Panel de vendedor',
    manage_products: 'Gestiona productos',
    create_experiences: 'Crea experiencias',
    orders_bookings: 'Pedidos y reservas',
    sales_stats: 'Estadisticas de ventas',
    visitor: 'Visitante',
    artisan_seller: 'Artesano / Vendedor',

    // Admin
    admin_dashboard: 'Panel de administracion',
    metrics_dashboard: 'Dashboard de metricas',
    user_management: 'Gestion de usuarios',
    view_as_user: 'Ver app como usuario',
    activity_reports: 'Reportes de actividad',
    interactive_map: 'Mapa interactivo',

    // Forms
    name_label: 'Nombre',
    email_label: 'Correo',
    phone_label: 'Telefono',
    message_label: 'Mensaje',
    send: 'Enviar',
    description: 'Descripcion',
    location: 'Ubicacion',
    date: 'Fecha',
    time: 'Hora',
    address: 'Direccion',

    // Errors & States
    empty_wishlist: 'Tu lista de deseos esta vacia',
    empty_cart: 'Tu carrito esta vacio',
    empty_orders: 'No tienes pedidos',
    empty_bookings: 'No tienes reservas',
    no_events: 'No hay eventos disponibles',
    offline: 'Sin conexion',
    offline_message: 'Verifica tu conexion a internet',

    // Language
    language_label: 'Idioma',
    preserving_languages: 'Preservando lenguas originarias',
  },
  en: {
    // Common
    greeting: 'Welcome',
    welcome_message: 'The greatest celebration of Oaxaca',
    hello: 'Hello',
    thank_you: 'Thank you',
    goodbye: 'Goodbye',
    loading: 'Loading...',
    close: 'Close',
    cancel: 'Cancel',
    confirm: 'Confirm',
    save: 'Save',
    delete: 'Delete',
    edit: 'Edit',
    back: 'Back',
    next: 'Next',
    previous: 'Previous',
    see_more: 'See more',
    see_all: 'See all',
    see_details: 'See details',
    share: 'Share',
    filter: 'Filter',
    sort: 'Sort',
    no_results: 'No results',
    error_generic: 'An error occurred. Please try again.',
    retry: 'Retry',
    required_field: 'Required field',
    select_option: 'Select an option',

    // Nav
    home: 'Home',
    events: 'Events',
    explore: 'Explore',
    profile: 'Profile',
    search: 'Search',
    transport: 'Transport',
    program: 'Program',
    stories: 'Stories',
    shop: 'Shop',
    communities: 'Communities',
    settings: 'Settings',
    notifications: 'Notifications',
    wishlist: 'Wishlist',
    cart: 'Cart',
    orders: 'Orders',
    bookings: 'Bookings',
    chat: 'Chat',
    map: 'Map',
    streams: 'Live',
    tours: 'Tours',
    plan: 'Plan',

    // Auth
    login: 'Log in',
    logout: 'Log out',
    register: 'Sign up',
    email: 'Email',
    password: 'Password',
    confirm_password: 'Confirm password',
    forgot_password: 'Forgot password',
    login_with_face: 'Log in with Face ID',
    login_as_visitor: 'I\'m a Visitor',
    login_as_seller: 'I\'m a Seller',
    login_as_admin: 'Administrator',
    entering: 'Entering...',
    login_error: 'Invalid credentials. Please try again.',
    camera_error: 'Could not access camera',
    no_account: 'Don\'t have an account?',
    already_account: 'Already have an account?',
    create_account: 'Create account',
    full_name: 'Full name',
    please_login: 'Please log in',

    // Events
    next_event: 'Next Event',
    all_events: 'All events',
    event_calendar: 'Event calendar',
    event_details: 'Event details',
    rsvp: 'RSVP',
    confirmed: 'Confirmed',
    attending: 'attending',
    sold_out: 'Sold out',
    few_left: 'Few tickets left!',
    get_tickets: 'Get tickets',
    free_entry: 'Free entry',
    add_to_calendar: 'Add to calendar',
    delegations: 'Delegations',
    parade: 'Delegations Parade',

    // Festival
    festival: 'Festival',
    dance: 'Dance',
    music: 'Music',
    food: 'Food',
    crafts: 'Crafts',
    ceremony: 'Ceremony',
    regions: 'regions',
    artisans: 'Artisans',
    expected_visitors: 'Expected visitors',
    festival_numbers: 'Festival in Numbers',
    new_experiences: 'New Experiences',
    community: 'Community',
    community_groups: 'Groups & forums',
    complete_calendar: 'Full calendar',
    discover_oaxaca: 'Discover Oaxaca',
    celebrating_culture: 'Celebrating the culture and traditions of Oaxaca',
    select_entry: 'Select how you want to enter',
    in_your_pocket: 'in your pocket',
    july_dates: 'July 21-28, 2025',

    // Gastronomy
    gastronomy: 'Gastronomy',
    flavors_of_oaxaca: 'Flavors of Oaxaca',
    curated_by_locals: 'Places curated by locals',
    all_categories: 'All',
    must_try: 'Must try',
    view_in_maps: 'View in Maps',
    how_to_get_there: 'Directions',
    reservation_required: 'Reserve',
    ask_guelabot: 'Ask GuelaBot for more recommendations',
    no_places_category: 'No places in this category',

    // Shop / Marketplace
    add_to_cart: 'Add to cart',
    buy_now: 'Buy now',
    checkout: 'Checkout',
    total: 'Total',
    subtotal: 'Subtotal',
    shipping: 'Shipping',
    quantity: 'Quantity',
    price: 'Price',
    product_details: 'Product details',
    categories: 'Categories',
    best_sellers: 'Best sellers',
    new_arrivals: 'New arrivals',
    free_shipping: 'Free shipping',

    // Experiences / Tours
    book_now: 'Book now',
    duration: 'Duration',
    group_size: 'Group size',
    includes: 'Includes',
    meeting_point: 'Meeting point',
    available_dates: 'Available dates',
    per_person: 'per person',
    reviews: 'Reviews',

    // Transport
    safe_routes: 'Safe routes & ETA',
    estimated_time: 'Estimated time',
    directions: 'Directions',

    // AR / Museum
    ar_museum: 'AR Guelaguetza',
    discover_magic: 'Discover the magic',
    scan: 'Scan',

    // Stories
    live_moments: 'Live moments',

    // Chat
    guelabot: 'GuelaBot',
    virtual_assistant: 'Your virtual assistant',
    ask_about: 'Ask me about routes, schedules, recommendations and more.',
    start_chat: 'Start chat',
    ask_guelabot_short: 'Ask GuelaBot',

    // Profile
    my_profile: 'My profile',
    edit_profile: 'Edit profile',
    my_orders: 'My orders',
    my_bookings: 'My bookings',

    // Seller
    seller_dashboard: 'Seller dashboard',
    manage_products: 'Manage products',
    create_experiences: 'Create experiences',
    orders_bookings: 'Orders & bookings',
    sales_stats: 'Sales statistics',
    visitor: 'Visitor',
    artisan_seller: 'Artisan / Seller',

    // Admin
    admin_dashboard: 'Admin dashboard',
    metrics_dashboard: 'Metrics dashboard',
    user_management: 'User management',
    view_as_user: 'View as user',
    activity_reports: 'Activity reports',
    interactive_map: 'Interactive map',

    // Forms
    name_label: 'Name',
    email_label: 'Email',
    phone_label: 'Phone',
    message_label: 'Message',
    send: 'Send',
    description: 'Description',
    location: 'Location',
    date: 'Date',
    time: 'Time',
    address: 'Address',

    // Errors & States
    empty_wishlist: 'Your wishlist is empty',
    empty_cart: 'Your cart is empty',
    empty_orders: 'You have no orders',
    empty_bookings: 'You have no bookings',
    no_events: 'No events available',
    offline: 'Offline',
    offline_message: 'Check your internet connection',

    // Language
    language_label: 'Language',
    preserving_languages: 'Preserving native languages',
  },
};

const languageLabels: Record<Language, string> = {
  es: 'Espanol',
  en: 'English',
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('guelaguetza-language');
    if (saved === 'es' || saved === 'en') return saved;
    return 'es';
  });

  useEffect(() => {
    localStorage.setItem('guelaguetza-language', language);
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  const t = (key: string): string => {
    return translations[language][key] || translations['es'][key] || key;
  };

  const greeting = translations[language].greeting;
  const languageLabel = languageLabels[language];

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, greeting, languageLabel }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

// Language selector component
export function LanguageSelector({ compact = false }: { compact?: boolean }) {
  const { language, setLanguage, t, languageLabel } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  const languages: { code: Language; label: string; native: string; flag: string }[] = [
    { code: 'es', label: 'Espanol', native: 'Espanol', flag: '🇲🇽' },
    { code: 'en', label: 'English', native: 'English', flag: '🇺🇸' },
  ];

  if (compact) {
    return (
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1.5 px-2 py-1 text-xs bg-oaxaca-purple/10 hover:bg-oaxaca-purple/20 text-oaxaca-purple dark:text-oaxaca-yellow rounded-full transition"
          aria-label={t('language_label')}
        >
          <span>{languages.find(l => l.code === language)?.flag}</span>
          <span className="font-medium">{languageLabel}</span>
        </button>

        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <div className="absolute top-full right-0 mt-1 w-44 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden z-50">
              <div className="p-2 border-b border-gray-100 dark:border-gray-700">
                <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('language_label')} / Language</p>
              </div>
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => {
                    setLanguage(lang.code);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition ${
                    language === lang.code ? 'bg-oaxaca-purple/10 text-oaxaca-purple dark:text-oaxaca-yellow' : 'text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <span className="text-lg">{lang.flag}</span>
                  <div className="text-left">
                    <p className="font-medium">{lang.native}</p>
                    <p className="text-[10px] text-gray-400">{lang.label}</p>
                  </div>
                  {language === lang.code && (
                    <span className="ml-auto text-oaxaca-pink">✓</span>
                  )}
                </button>
              ))}
              <div className="p-2 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                <p className="text-[10px] text-gray-400 text-center">
                  {t('preserving_languages')}
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
      <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
        {t('language_label')} / Language
      </h3>
      <div className="space-y-2">
        {languages.map((lang) => (
          <button
            key={lang.code}
            onClick={() => setLanguage(lang.code)}
            className={`w-full flex items-center gap-3 p-3 rounded-lg transition ${
              language === lang.code
                ? 'bg-oaxaca-purple text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            <span className="text-2xl">{lang.flag}</span>
            <div className="text-left">
              <p className="font-medium">{lang.native}</p>
              <p className={`text-xs ${language === lang.code ? 'text-white/70' : 'text-gray-400'}`}>
                {lang.label}
              </p>
            </div>
          </button>
        ))}
      </div>
      <p className="text-xs text-gray-400 text-center mt-3">
        {t('preserving_languages')}
      </p>
    </div>
  );
}
