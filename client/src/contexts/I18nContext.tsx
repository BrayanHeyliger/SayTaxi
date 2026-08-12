import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type Lang = "es" | "en" | "fr";

export const LANGUAGES: { code: Lang; label: string; flag: string }[] = [
  { code: "es", label: "Español", flag: "🇪🇸" },
  { code: "en", label: "English", flag: "🇺🇸" },
  { code: "fr", label: "Français", flag: "🇫🇷" },
];

type StepItem = { title: string; desc: string };
type ModuleFeature = { title: string; desc: string };
type ModuleData = { label: string; desc: string; features: ModuleFeature[] };

type Translations = {
  nav: { features: string; howItWorks: string; modules: string; pricing: string; contact: string; login: string; register: string; requestTrip: string; beDriver: string };
  hero: { badge: string; title1: string; title2: string; title3: string; desc: string; cta: string; demo: string; noContract: string; activation: string; support: string };
  features: { badge: string; title: string; sub: string };
  howItWorks: { badge: string; title: string; sub: string; demoBadge: string; demoTitle: string; demoSub: string; step: string; steps: StepItem[] };
  modules: { badge: string; title: string; sub: string; bot: ModuleData; panel: ModuleData; admin: ModuleData };
  pricing: { badge: string; title: string; sub: string; monthly: string; annual: string; save: string; popular: string; getStarted: string; contact: string };
  cta: { title: string; sub: string; client: string; driver: string };
  footer: { rights: string; privacy: string; terms: string; support: string };
  login: { title: string; sub: string; email: string; password: string; submit: string; noAccount: string; register: string; forgot: string };
  register: { title: string; sub: string; asClient: string; asDriver: string; asFleet: string; clientDesc: string; driverDesc: string; fleetDesc: string; name: string; email: string; phone: string; password: string; submit: string; haveAccount: string; login: string };
  dashboard: { welcome: string; trips: string; earnings: string; rating: string; online: string; offline: string; requestTrip: string; history: string; settings: string; logout: string };
};

const translations: Record<Lang, Translations> = {
  es: {
    nav: { features: "Características", howItWorks: "Cómo funciona", modules: "Módulos", pricing: "Precios", contact: "Contacto", login: "Iniciar sesión", register: "Registrarse", requestTrip: "Pedir un Viaje", beDriver: "Ser Chofer" },
    hero: { badge: "Plataforma SaaS Multitenant", title1: "Gestiona tu flota", title2: "desde WhatsApp", title3: "Sin apps. Sin complicaciones.", desc: "La plataforma SaaS que convierte WhatsApp en tu central de taxis. Recibe pedidos, asigna conductores y gestiona tarifas — todo desde un bot inteligente.", cta: "Empezar gratis", demo: "Ver demo", noContract: "Sin contrato mínimo", activation: "Activación en 48h", support: "Soporte 24/7" },
    features: { badge: "Funcionalidades", title: "Todo lo que necesitas para gestionar tu flota", sub: "Una plataforma completa diseñada para empresas de taxi modernas" },
    howItWorks: {
      badge: "Proceso", title: "Cómo funciona en 60 segundos", sub: "Desde la solicitud hasta el destino, todo automatizado",
      demoBadge: "Demostración en vivo", demoTitle: "Mira el bot en acción", demoSub: "Aquí puedes ver el flujo completo: desde el primer mensaje hasta el viaje completado y calificado.",
      step: "PASO",
      steps: [
        { title: "El cliente escribe a tu WhatsApp", desc: "El bot saluda automáticamente, detecta el idioma y guía al cliente paso a paso. Sin descargar ninguna app." },
        { title: "Comparte ubicación y destino", desc: "El bot solicita la ubicación en tiempo real o dirección. Google Maps calcula la ruta y estima la tarifa al instante." },
        { title: "Ve el costo y confirma el viaje", desc: "El cliente recibe el desglose de la tarifa y confirma con un botón. Sin llamadas. Sin negociaciones." },
        { title: "Conductor asignado en segundos", desc: "El sistema notifica al conductor más cercano. Al aceptar, el cliente recibe todos los datos del chofer." },
        { title: "Notificaciones en cada etapa del viaje", desc: "El cliente recibe mensajes automáticos: conductor en camino, llegó, viaje iniciado y finalizado." },
        { title: "Califica y el admin lo ve todo", desc: "Encuesta de satisfacción automática al finalizar. El administrador ve métricas, ingresos y conductores en el dashboard." },
      ],
    },
    modules: {
      badge: "Arquitectura del sistema", title: "Tres módulos perfectamente integrados", sub: "Cada módulo está diseñado para un actor específico del ecosistema de taxis.",
      bot: { label: "Bot WhatsApp", desc: "El bot que convierte WhatsApp en tu central de despacho: recibe pedidos, calcula tarifas, confirma viajes y notifica al cliente en cada etapa.", features: [
        { title: "Bienvenida e idioma", desc: "Saludo automático y detección/selección de idioma del cliente." },
        { title: "Solicitud de ubicación", desc: "Pide ubicación en tiempo real o dirección exacta vía WhatsApp." },
        { title: "Cálculo de ruta y tarifa", desc: "Distancia, tiempo y costo estimado con Google Maps API." },
        { title: "Confirmación del viaje", desc: "Botones interactivos para confirmar o cancelar el pedido." },
        { title: "Asignación de conductor", desc: "Notifica nombre, auto, placa y enlace de seguimiento." },
        { title: "Calificación del viaje", desc: "Encuesta de satisfacción de 1 a 5 estrellas al finalizar." },
      ]},
      panel: { label: "Panel Empresa", desc: "Tu central de operaciones: ve en tiempo real qué conductores están activos, qué viajes están en curso y cuánto ingresó tu flota hoy.", features: [
        { title: "Dashboard de viajes", desc: "Vista en tiempo real de viajes activos, pendientes y completados." },
        { title: "Gestión de flota", desc: "Conductores, vehículos, placas y documentos en un solo lugar." },
        { title: "Gestión de tarifas", desc: "Tarifa base, costo por km/min, mínimos y recargos nocturnos." },
        { title: "Ajustes de WhatsApp", desc: "Credenciales API, respuestas automáticas y mensajes personalizados." },
        { title: "App para conductores", desc: "PWA para recibir alertas, aceptar/rechazar y navegar al cliente." },
        { title: "Reportes y métricas", desc: "Ingresos, volumen de viajes y satisfacción del cliente." },
      ]},
      admin: { label: "Super Admin", desc: "Controla toda la plataforma: da de alta empresas de taxi, gestiona sus suscripciones, monitorea el uso de la API de WhatsApp y cobra automáticamente con Stripe.", features: [
        { title: "Gestión de suscripciones", desc: "Planes Básico, Pro y Enterprise con límites configurables." },
        { title: "Gestión de tenants", desc: "Altas, bajas, suspensión y monitoreo de uso por empresa." },
        { title: "Facturación con Stripe", desc: "Cobros recurrentes automáticos para las membresías SaaS." },
        { title: "Reportes globales", desc: "Ganancias, volumen de viajes por región y métricas de API." },
        { title: "Multi-región", desc: "Soporte para empresas en múltiples países y monedas." },
        { title: "Configuración global", desc: "Parámetros del sistema, límites de API y configuración de seguridad." },
      ]},
    },
    pricing: { badge: "Planes", title: "Precios transparentes, sin sorpresas", sub: "Elige el plan que mejor se adapte a tu flota", monthly: "Mensual", annual: "Anual", save: "Ahorra 20%", popular: "Más popular", getStarted: "Empezar ahora", contact: "Contactar ventas" },
    cta: { title: "¿Listo para tu próximo viaje?", sub: "Únete a miles de usuarios en Passenger", client: "Pedir un Viaje", driver: "Ser Chofer" },
    footer: { rights: "Todos los derechos reservados", privacy: "Privacidad", terms: "Términos", support: "Soporte" },
    login: { title: "Bienvenido de vuelta", sub: "Ingresa a tu cuenta", email: "Correo electrónico", password: "Contraseña", submit: "Iniciar sesión", noAccount: "¿No tienes cuenta?", register: "Regístrate", forgot: "¿Olvidaste tu contraseña?" },
    register: { title: "Crear cuenta", sub: "Elige cómo quieres usar la plataforma", asClient: "Soy Cliente", asDriver: "Soy Conductor", asFleet: "Empresa / Flotilla", clientDesc: "Pide viajes fácilmente", driverDesc: "Gana dinero conduciendo", fleetDesc: "Gestiona tu propia flota", name: "Nombre completo", email: "Correo electrónico", phone: "Teléfono", password: "Contraseña", submit: "Crear cuenta", haveAccount: "¿Ya tienes cuenta?", login: "Inicia sesión" },
    dashboard: { welcome: "Bienvenido", trips: "Viajes", earnings: "Ganancias", rating: "Calificación", online: "En línea", offline: "Desconectado", requestTrip: "Solicitar viaje", history: "Historial", settings: "Configuración", logout: "Cerrar sesión" },
  },
  en: {
    nav: { features: "Features", howItWorks: "How it works", modules: "Modules", pricing: "Pricing", contact: "Contact", login: "Sign in", register: "Sign up", requestTrip: "Request a Ride", beDriver: "Become a Driver" },
    hero: { badge: "Multitenant SaaS Platform", title1: "Manage your fleet", title2: "via WhatsApp", title3: "No apps. No hassle.", desc: "The SaaS platform that turns WhatsApp into your taxi dispatch center. Receive orders, assign drivers and manage fares — all from an intelligent bot.", cta: "Get started free", demo: "Watch demo", noContract: "No minimum contract", activation: "48h activation", support: "24/7 support" },
    features: { badge: "Features", title: "Everything you need to manage your fleet", sub: "A complete platform designed for modern taxi companies" },
    howItWorks: {
      badge: "Process", title: "How it works in 60 seconds", sub: "From request to destination, fully automated",
      demoBadge: "Live demonstration", demoTitle: "Watch the bot in action", demoSub: "Here you can see the complete flow: from the first message to the completed and rated trip.",
      step: "STEP",
      steps: [
        { title: "Client writes to your WhatsApp", desc: "The bot greets automatically, detects the language and guides the client step by step. No app download needed." },
        { title: "Share location and destination", desc: "The bot requests real-time location or address. Google Maps calculates the route and estimates the fare instantly." },
        { title: "See the cost and confirm the trip", desc: "The client receives the fare breakdown and confirms with a button. No calls. No negotiations." },
        { title: "Driver assigned in seconds", desc: "The system notifies the nearest driver. Upon acceptance, the client receives all driver details." },
        { title: "Notifications at every trip stage", desc: "The client receives automatic messages: driver on the way, arrived, trip started and completed." },
        { title: "Rate and the admin sees everything", desc: "Automatic satisfaction survey at the end. The admin sees metrics, revenue and drivers in the dashboard." },
      ],
    },
    modules: {
      badge: "System architecture", title: "Three perfectly integrated modules", sub: "Each module is designed for a specific actor in the taxi ecosystem.",
      bot: { label: "WhatsApp Bot", desc: "The bot that turns WhatsApp into your dispatch center: receives orders, calculates fares, confirms trips and notifies the client at every stage.", features: [
        { title: "Welcome & language", desc: "Automatic greeting and client language detection/selection." },
        { title: "Location request", desc: "Requests real-time location or exact address via WhatsApp." },
        { title: "Route & fare calculation", desc: "Distance, time and estimated cost with Google Maps API." },
        { title: "Trip confirmation", desc: "Interactive buttons to confirm or cancel the order." },
        { title: "Driver assignment", desc: "Notifies name, car, plate and tracking link." },
        { title: "Trip rating", desc: "1 to 5 star satisfaction survey at the end." },
      ]},
      panel: { label: "Company Panel", desc: "Your operations center: see in real time which drivers are active, which trips are in progress and how much your fleet earned today.", features: [
        { title: "Trips dashboard", desc: "Real-time view of active, pending and completed trips." },
        { title: "Fleet management", desc: "Drivers, vehicles, plates and documents in one place." },
        { title: "Fare management", desc: "Base fare, cost per km/min, minimums and night surcharges." },
        { title: "WhatsApp settings", desc: "API credentials, auto-replies and custom messages." },
        { title: "Driver app", desc: "PWA to receive alerts, accept/reject and navigate to client." },
        { title: "Reports & metrics", desc: "Revenue, trip volume and client satisfaction." },
      ]},
      admin: { label: "Super Admin", desc: "Control the entire platform: register taxi companies, manage their subscriptions, monitor WhatsApp API usage and charge automatically with Stripe.", features: [
        { title: "Subscription management", desc: "Basic, Pro and Enterprise plans with configurable limits." },
        { title: "Tenant management", desc: "Register, suspend and monitor usage per company." },
        { title: "Stripe billing", desc: "Automatic recurring charges for SaaS memberships." },
        { title: "Global reports", desc: "Revenue, trip volume by region and API metrics." },
        { title: "Multi-region", desc: "Support for companies in multiple countries and currencies." },
        { title: "Global settings", desc: "System parameters, API limits and security configuration." },
      ]},
    },
    pricing: { badge: "Plans", title: "Transparent pricing, no surprises", sub: "Choose the plan that best fits your fleet", monthly: "Monthly", annual: "Annual", save: "Save 20%", popular: "Most popular", getStarted: "Get started", contact: "Contact sales" },
    cta: { title: "Ready to modernize your fleet?", sub: "Join over 2,400 taxi companies already using WhatsApp Taxi", client: "Request a Ride", driver: "Become a Driver" },
    footer: { rights: "All rights reserved", privacy: "Privacy", terms: "Terms", support: "Support" },
    login: { title: "Welcome back", sub: "Sign in to your account", email: "Email address", password: "Password", submit: "Sign in", noAccount: "Don't have an account?", register: "Sign up", forgot: "Forgot your password?" },
    register: { title: "Create account", sub: "Choose how you want to use the platform", asClient: "I'm a Client", asDriver: "I'm a Driver", asFleet: "Company / Fleet", clientDesc: "Request rides easily", driverDesc: "Earn money driving", fleetDesc: "Manage your own fleet", name: "Full name", email: "Email address", phone: "Phone number", password: "Password", submit: "Create account", haveAccount: "Already have an account?", login: "Sign in" },
    dashboard: { welcome: "Welcome", trips: "Trips", earnings: "Earnings", rating: "Rating", online: "Online", offline: "Offline", requestTrip: "Request trip", history: "History", settings: "Settings", logout: "Sign out" },
  },
  fr: {
    nav: { features: "Fonctionnalités", howItWorks: "Comment ça marche", modules: "Modules", pricing: "Tarifs", contact: "Contact", login: "Se connecter", register: "S'inscrire", requestTrip: "Demander un trajet", beDriver: "Devenir chauffeur" },
    hero: { badge: "Plateforme SaaS Multilocataire", title1: "Gérez votre flotte", title2: "via WhatsApp", title3: "Sans apps. Sans complications.", desc: "La plateforme SaaS qui transforme WhatsApp en votre centrale de taxis. Recevez des commandes, assignez des chauffeurs et gérez les tarifs — tout depuis un bot intelligent.", cta: "Commencer gratuitement", demo: "Voir la démo", noContract: "Sans contrat minimum", activation: "Activation en 48h", support: "Support 24/7" },
    features: { badge: "Fonctionnalités", title: "Tout ce dont vous avez besoin pour gérer votre flotte", sub: "Une plateforme complète conçue pour les entreprises de taxi modernes" },
    howItWorks: {
      badge: "Processus", title: "Comment ça marche en 60 secondes", sub: "De la demande à la destination, tout est automatisé",
      demoBadge: "Démonstration en direct", demoTitle: "Regardez le bot en action", demoSub: "Ici vous pouvez voir le flux complet : du premier message au trajet terminé et noté.",
      step: "ÉTAPE",
      steps: [
        { title: "Le client écrit sur votre WhatsApp", desc: "Le bot salue automatiquement, détecte la langue et guide le client étape par étape. Sans télécharger d'application." },
        { title: "Partage la localisation et la destination", desc: "Le bot demande la localisation en temps réel ou l'adresse. Google Maps calcule l'itinéraire et estime le tarif instantanément." },
        { title: "Voir le coût et confirmer le trajet", desc: "Le client reçoit le détail du tarif et confirme avec un bouton. Pas d'appels. Pas de négociations." },
        { title: "Chauffeur assigné en quelques secondes", desc: "Le système notifie le chauffeur le plus proche. À l'acceptation, le client reçoit toutes les informations du chauffeur." },
        { title: "Notifications à chaque étape du trajet", desc: "Le client reçoit des messages automatiques : chauffeur en route, arrivé, trajet commencé et terminé." },
        { title: "Évaluer et l'admin voit tout", desc: "Enquête de satisfaction automatique à la fin. L'administrateur voit les métriques, les revenus et les chauffeurs dans le tableau de bord." },
      ],
    },
    modules: {
      badge: "Architecture du système", title: "Trois modules parfaitement intégrés", sub: "Chaque module est conçu pour un acteur spécifique de l'écosystème taxi.",
      bot: { label: "Bot WhatsApp", desc: "Le bot qui transforme WhatsApp en votre centrale de dispatch : reçoit les commandes, calcule les tarifs, confirme les trajets et notifie le client à chaque étape.", features: [
        { title: "Accueil et langue", desc: "Salutation automatique et détection/sélection de la langue du client." },
        { title: "Demande de localisation", desc: "Demande la localisation en temps réel ou l'adresse exacte via WhatsApp." },
        { title: "Calcul d'itinéraire et tarif", desc: "Distance, temps et coût estimé avec l'API Google Maps." },
        { title: "Confirmation du trajet", desc: "Boutons interactifs pour confirmer ou annuler la commande." },
        { title: "Attribution du chauffeur", desc: "Notifie le nom, la voiture, la plaque et le lien de suivi." },
        { title: "Évaluation du trajet", desc: "Enquête de satisfaction de 1 à 5 étoiles à la fin." },
      ]},
      panel: { label: "Panneau Entreprise", desc: "Votre centre d'opérations : voyez en temps réel quels chauffeurs sont actifs, quels trajets sont en cours et combien votre flotte a gagné aujourd'hui.", features: [
        { title: "Tableau de bord des trajets", desc: "Vue en temps réel des trajets actifs, en attente et terminés." },
        { title: "Gestion de flotte", desc: "Chauffeurs, véhicules, plaques et documents en un seul endroit." },
        { title: "Gestion des tarifs", desc: "Tarif de base, coût par km/min, minimums et suppléments nuit." },
        { title: "Paramètres WhatsApp", desc: "Identifiants API, réponses automatiques et messages personnalisés." },
        { title: "App pour chauffeurs", desc: "PWA pour recevoir des alertes, accepter/refuser et naviguer vers le client." },
        { title: "Rapports et métriques", desc: "Revenus, volume de trajets et satisfaction client." },
      ]},
      admin: { label: "Super Admin", desc: "Contrôlez toute la plateforme : enregistrez des entreprises de taxi, gérez leurs abonnements, surveillez l'utilisation de l'API WhatsApp et facturez automatiquement avec Stripe.", features: [
        { title: "Gestion des abonnements", desc: "Plans Basique, Pro et Entreprise avec limites configurables." },
        { title: "Gestion des locataires", desc: "Inscription, suspension et surveillance de l'utilisation par entreprise." },
        { title: "Facturation Stripe", desc: "Prélèvements récurrents automatiques pour les abonnements SaaS." },
        { title: "Rapports globaux", desc: "Revenus, volume de trajets par région et métriques API." },
        { title: "Multi-région", desc: "Support pour les entreprises dans plusieurs pays et devises." },
        { title: "Paramètres globaux", desc: "Paramètres système, limites API et configuration de sécurité." },
      ]},
    },
    pricing: { badge: "Plans", title: "Tarifs transparents, sans surprises", sub: "Choisissez le plan qui correspond le mieux à votre flotte", monthly: "Mensuel", annual: "Annuel", save: "Économisez 20%", popular: "Le plus populaire", getStarted: "Commencer", contact: "Contacter les ventes" },
    cta: { title: "Prêt à moderniser votre flotte?", sub: "Rejoignez plus de 2 400 entreprises de taxi qui utilisent déjà WhatsApp Taxi", client: "Demander un trajet", driver: "Devenir chauffeur" },
    footer: { rights: "Tous droits réservés", privacy: "Confidentialité", terms: "Conditions", support: "Support" },
    login: { title: "Bon retour", sub: "Connectez-vous à votre compte", email: "Adresse e-mail", password: "Mot de passe", submit: "Se connecter", noAccount: "Vous n'avez pas de compte?", register: "S'inscrire", forgot: "Mot de passe oublié?" },
    register: { title: "Créer un compte", sub: "Choisissez comment vous souhaitez utiliser la plateforme", asClient: "Je suis client", asDriver: "Je suis chauffeur", asFleet: "Entreprise / Flotte", clientDesc: "Demandez des trajets facilement", driverDesc: "Gagnez de l'argent en conduisant", fleetDesc: "Gérez votre propre flotte", name: "Nom complet", email: "Adresse e-mail", phone: "Numéro de téléphone", password: "Mot de passe", submit: "Créer un compte", haveAccount: "Vous avez déjà un compte?", login: "Se connecter" },
    dashboard: { welcome: "Bienvenue", trips: "Trajets", earnings: "Revenus", rating: "Note", online: "En ligne", offline: "Hors ligne", requestTrip: "Demander un trajet", history: "Historique", settings: "Paramètres", logout: "Se déconnecter" },
  },
};

type I18nContextType = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: Translations;
};

const I18nContext = createContext<I18nContextType>({
  lang: "es",
  setLang: () => {},
  t: translations.es,
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const saved = localStorage.getItem("wataxi_lang") as Lang;
    return saved && ["es", "en", "fr"].includes(saved) ? saved : "es";
  });

  const setLang = (newLang: Lang) => {
    setLangState(newLang);
    localStorage.setItem("wataxi_lang", newLang);
  };

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  return (
    <I18nContext.Provider value={{ lang, setLang, t: translations[lang] }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
