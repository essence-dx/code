import type { DesignPresetId } from "@/features/editor/types";
import type { EditorLocale } from "@/features/editor/editor-localization";

export const dashboardLocaleStorageKey = "essence-dashboard-locale";

type DashboardNavCopy = {
  overview: string;
  projects: string;
  templates: string;
  planner: string;
  website: string;
  email: string;
  team: string;
  security: string;
};

type DashboardMetricsCopy = {
  activeDesigns: string;
  templates: string;
  scheduled: string;
  unread: string;
};

type DashboardTabsCopy = {
  studio: string;
  website: string;
  email: string;
  team: string;
  security: string;
  admin: string;
};

type DashboardPresetCopy = {
  name: string;
  description: string;
};

export type DashboardCopy = {
  dashboardTitle: string;
  dashboardDescription: string;
  workspace: string;
  language: string;
  productionWebsite: string;
  open: string;
  newDesign: string;
  newDesignDescription: string;
  customSize: string;
  customDesign: string;
  customWidth: string;
  customHeight: string;
  createDesign: string;
  createCustomDesign: string;
  customSizeDescription: (min: number, max: number) => string;
  presetDesignPlaceholder: (name: string) => string;
  nav: DashboardNavCopy;
  metrics: DashboardMetricsCopy;
  tabs: DashboardTabsCopy;
  presets: Record<DesignPresetId, DashboardPresetCopy>;
};

const defaultLocale: EditorLocale = "en";

export function getDashboardCopy(locale: EditorLocale): DashboardCopy {
  return dashboardCopy[locale] ?? dashboardCopy[defaultLocale];
}

const englishPresets: Record<DesignPresetId, DashboardPresetCopy> = {
  "instagram-post": {
    name: "Social post",
    description: "Square content for social feeds.",
  },
  presentation: {
    name: "Presentation",
    description: "16:9 slides and pitch decks.",
  },
  document: {
    name: "Document",
    description: "A4 pages for proposals and one-pagers.",
  },
  whiteboard: {
    name: "Whiteboard",
    description: "Wide freeform planning canvas.",
  },
  poster: {
    name: "Poster",
    description: "Print-friendly vertical artwork.",
  },
  infographic: {
    name: "Infographic",
    description: "Tall visual explainers and data stories.",
  },
  resume: {
    name: "Resume",
    description: "Letter-size personal profile layouts.",
  },
  "business-card": {
    name: "Business card",
    description: "Standard horizontal contact cards.",
  },
  flyer: {
    name: "Flyer",
    description: "Letter-size event and promo sheets.",
  },
  banner: {
    name: "Banner",
    description: "Wide website and social headers.",
  },
  spreadsheet: {
    name: "Sheet",
    description: "Grid-first analysis and planning boards.",
  },
  website: {
    name: "Website",
    description: "Long responsive page design canvas.",
  },
  video: {
    name: "Vertical video",
    description: "Short-form 9:16 video storyboards.",
  },
  "print-product": {
    name: "Print product",
    description: "High-resolution merchandise and print layouts.",
  },
  "email-template": {
    name: "Email template",
    description: "Newsletter and campaign email layouts.",
  },
  course: {
    name: "Course design",
    description: "Learning handouts and lesson assets.",
  },
  logo: {
    name: "Logo",
    description: "Compact brand marks and icons.",
  },
  custom: {
    name: "Custom size",
    description: "Exact dimensions for a custom canvas.",
  },
};

const dashboardCopy: Record<EditorLocale, DashboardCopy> = {
  en: {
    dashboardTitle: "Studio dashboard",
    dashboardDescription: "Projects, publishing, teams, and account controls.",
    workspace: "Workspace",
    language: "Dashboard language",
    productionWebsite: "Production website",
    open: "Open",
    newDesign: "New design",
    newDesignDescription:
      "Start with a useful canvas size or define exact dimensions.",
    customSize: "Custom size",
    customDesign: "Custom design",
    customWidth: "Custom width in pixels",
    customHeight: "Custom height in pixels",
    createDesign: "Create design",
    createCustomDesign: "Create custom design",
    customSizeDescription: (min, max) =>
      `Exact dimensions from ${min} to ${max} px.`,
    presetDesignPlaceholder: (name) => `${name} design`,
    nav: {
      overview: "Overview",
      projects: "Projects",
      templates: "Templates",
      planner: "Planner",
      website: "Website",
      email: "Email",
      team: "Team",
      security: "Security",
    },
    metrics: {
      activeDesigns: "Active designs",
      templates: "Templates",
      scheduled: "Scheduled",
      unread: "Unread",
    },
    tabs: {
      studio: "Studio",
      website: "Website",
      email: "Email",
      team: "Team",
      security: "Security",
      admin: "Admin",
    },
    presets: englishPresets,
  },
  bn: {
    dashboardTitle: "স্টুডিও ড্যাশবোর্ড",
    dashboardDescription: "প্রজেক্ট, প্রকাশনা, টিম, এবং অ্যাকাউন্ট নিয়ন্ত্রণ।",
    workspace: "ওয়ার্কস্পেস",
    language: "ড্যাশবোর্ড ভাষা",
    productionWebsite: "প্রোডাকশন ওয়েবসাইট",
    open: "খুলুন",
    newDesign: "নতুন ডিজাইন",
    newDesignDescription:
      "উপযোগী ক্যানভাস সাইজ বেছে নিন বা নিজের মাপ দিন।",
    customSize: "নিজস্ব মাপ",
    customDesign: "নিজস্ব ডিজাইন",
    customWidth: "নিজস্ব প্রস্থ পিক্সেলে",
    customHeight: "নিজস্ব উচ্চতা পিক্সেলে",
    createDesign: "ডিজাইন তৈরি করুন",
    createCustomDesign: "নিজস্ব ডিজাইন তৈরি করুন",
    customSizeDescription: (min, max) =>
      `${min} থেকে ${max} px পর্যন্ত নির্দিষ্ট মাপ।`,
    presetDesignPlaceholder: (name) => `${name} ডিজাইন`,
    nav: {
      overview: "ওভারভিউ",
      projects: "প্রজেক্ট",
      templates: "টেমপ্লেট",
      planner: "প্ল্যানার",
      website: "ওয়েবসাইট",
      email: "ইমেইল",
      team: "টিম",
      security: "সিকিউরিটি",
    },
    metrics: {
      activeDesigns: "সক্রিয় ডিজাইন",
      templates: "টেমপ্লেট",
      scheduled: "শিডিউল",
      unread: "অপঠিত",
    },
    tabs: {
      studio: "স্টুডিও",
      website: "ওয়েবসাইট",
      email: "ইমেইল",
      team: "টিম",
      security: "সিকিউরিটি",
      admin: "অ্যাডমিন",
    },
    presets: englishPresets,
  },
  es: {
    dashboardTitle: "Panel del estudio",
    dashboardDescription:
      "Proyectos, publicaciones, equipos y controles de cuenta.",
    workspace: "Espacio de trabajo",
    language: "Idioma del panel",
    productionWebsite: "Sitio en producción",
    open: "Abrir",
    newDesign: "Nuevo diseño",
    newDesignDescription:
      "Empieza con un tamaño útil o define dimensiones exactas.",
    customSize: "Tamaño personalizado",
    customDesign: "Diseño personalizado",
    customWidth: "Ancho personalizado en píxeles",
    customHeight: "Alto personalizado en píxeles",
    createDesign: "Crear diseño",
    createCustomDesign: "Crear diseño personalizado",
    customSizeDescription: (min, max) =>
      `Dimensiones exactas de ${min} a ${max} px.`,
    presetDesignPlaceholder: (name) => `Diseño de ${name}`,
    nav: {
      overview: "Resumen",
      projects: "Proyectos",
      templates: "Plantillas",
      planner: "Planificador",
      website: "Sitio web",
      email: "Email",
      team: "Equipo",
      security: "Seguridad",
    },
    metrics: {
      activeDesigns: "Diseños activos",
      templates: "Plantillas",
      scheduled: "Programados",
      unread: "Sin leer",
    },
    tabs: {
      studio: "Estudio",
      website: "Sitio web",
      email: "Email",
      team: "Equipo",
      security: "Seguridad",
      admin: "Admin",
    },
    presets: englishPresets,
  },
  fr: {
    dashboardTitle: "Tableau du studio",
    dashboardDescription:
      "Projets, publication, équipes et contrôles du compte.",
    workspace: "Espace de travail",
    language: "Langue du tableau",
    productionWebsite: "Site en production",
    open: "Ouvrir",
    newDesign: "Nouveau design",
    newDesignDescription:
      "Démarrez avec un format utile ou définissez des dimensions exactes.",
    customSize: "Format personnalisé",
    customDesign: "Design personnalisé",
    customWidth: "Largeur personnalisée en pixels",
    customHeight: "Hauteur personnalisée en pixels",
    createDesign: "Créer un design",
    createCustomDesign: "Créer un design personnalisé",
    customSizeDescription: (min, max) =>
      `Dimensions exactes de ${min} à ${max} px.`,
    presetDesignPlaceholder: (name) => `Design ${name}`,
    nav: {
      overview: "Aperçu",
      projects: "Projets",
      templates: "Modèles",
      planner: "Planning",
      website: "Site web",
      email: "Email",
      team: "Équipe",
      security: "Sécurité",
    },
    metrics: {
      activeDesigns: "Designs actifs",
      templates: "Modèles",
      scheduled: "Planifiés",
      unread: "Non lus",
    },
    tabs: {
      studio: "Studio",
      website: "Site web",
      email: "Email",
      team: "Équipe",
      security: "Sécurité",
      admin: "Admin",
    },
    presets: englishPresets,
  },
  hi: {
    dashboardTitle: "स्टूडियो डैशबोर्ड",
    dashboardDescription: "प्रोजेक्ट, पब्लिशिंग, टीम और अकाउंट नियंत्रण।",
    workspace: "वर्कस्पेस",
    language: "डैशबोर्ड भाषा",
    productionWebsite: "प्रोडक्शन वेबसाइट",
    open: "खोलें",
    newDesign: "नया डिजाइन",
    newDesignDescription:
      "उपयोगी कैनवास आकार से शुरू करें या सटीक माप तय करें।",
    customSize: "कस्टम आकार",
    customDesign: "कस्टम डिजाइन",
    customWidth: "कस्टम चौड़ाई पिक्सेल में",
    customHeight: "कस्टम ऊंचाई पिक्सेल में",
    createDesign: "डिजाइन बनाएं",
    createCustomDesign: "कस्टम डिजाइन बनाएं",
    customSizeDescription: (min, max) =>
      `${min} से ${max} px तक सटीक माप।`,
    presetDesignPlaceholder: (name) => `${name} डिजाइन`,
    nav: {
      overview: "ओवरव्यू",
      projects: "प्रोजेक्ट",
      templates: "टेम्पलेट",
      planner: "प्लैनर",
      website: "वेबसाइट",
      email: "ईमेल",
      team: "टीम",
      security: "सुरक्षा",
    },
    metrics: {
      activeDesigns: "सक्रिय डिजाइन",
      templates: "टेम्पलेट",
      scheduled: "शेड्यूल",
      unread: "अपठित",
    },
    tabs: {
      studio: "स्टूडियो",
      website: "वेबसाइट",
      email: "ईमेल",
      team: "टीम",
      security: "सुरक्षा",
      admin: "एडमिन",
    },
    presets: englishPresets,
  },
};
