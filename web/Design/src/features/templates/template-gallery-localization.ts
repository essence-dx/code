import type { EditorLocale } from "@/features/editor/editor-localization";

export type TemplateGalleryCopy = {
  title: string;
  description: string;
  search: string;
  filterTemplates: string;
  filterTemplateKind: string;
  allSizes: string;
  square: string;
  wide: string;
  tall: string;
  allTypes: string;
  brand: string;
  team: string;
  standard: string;
  starterPacks?: string;
  starterPacksDescription?: string;
  starterTemplates?: string;
  starterTemplatesDescription?: string;
  savedTemplates?: string;
  savedTemplatesDescription?: string;
  filterFormat?: string;
  filterCategory?: string;
  filterIndustry?: string;
  filterSeason?: string;
  filterPlatform?: string;
  allFormats?: string;
  allCategories?: string;
  allIndustries?: string;
  allSeasons?: string;
  allPlatforms?: string;
  emptyStarters?: string;
  starterCopyPlaceholder?: (name: string) => string;
  newStarterDesignName?: (name: string) => string;
  previewStarterTemplate?: (name: string) => string;
  useStarterTemplate?: string;
  noThumbnail: string;
  templateCopyPlaceholder: (name: string) => string;
  newDesignNameFromTemplate: (name: string) => string;
  useTemplate: string;
  empty: string;
};

const defaultLocale: EditorLocale = "en";

export function getTemplateGalleryCopy(
  locale: EditorLocale,
): TemplateGalleryCopy {
  return templateGalleryCopy[locale] ?? templateGalleryCopy[defaultLocale];
}

const templateGalleryCopy: Record<EditorLocale, TemplateGalleryCopy> = {
  en: {
    title: "Templates",
    description: "Saved layouts you can reuse as new designs.",
    search: "Search templates",
    filterTemplates: "Filter templates",
    filterTemplateKind: "Filter template kind",
    allSizes: "All sizes",
    square: "Square",
    wide: "Wide",
    tall: "Tall",
    allTypes: "All types",
    brand: "Brand",
    team: "Team",
    standard: "Standard",
    starterPacks: "Recommended starter packs",
    starterPacksDescription:
      "Curated multi-format packs for campaigns, clients, events, education, and brand presence.",
    starterTemplates: "Starter templates",
    starterTemplatesDescription:
      "Original first-party starters across social, docs, websites, email, whiteboards, presentations, and print.",
    savedTemplates: "Saved templates",
    savedTemplatesDescription:
      "Brand, team, and personal templates saved from the editor.",
    filterFormat: "Filter format",
    filterCategory: "Filter category",
    filterIndustry: "Filter industry",
    filterSeason: "Filter season",
    filterPlatform: "Filter platform",
    allFormats: "All formats",
    allCategories: "All categories",
    allIndustries: "All industries",
    allSeasons: "All seasons",
    allPlatforms: "All platforms",
    emptyStarters: "No starter templates match this view.",
    starterCopyPlaceholder: (name) => `${name} project`,
    newStarterDesignName: (name) => `New design name from ${name}`,
    previewStarterTemplate: (name) => `Preview ${name}`,
    useStarterTemplate: "Use starter template",
    noThumbnail: "No thumbnail",
    templateCopyPlaceholder: (name) => `${name} copy`,
    newDesignNameFromTemplate: (name) => `New design name from ${name}`,
    useTemplate: "Use template",
    empty: "No saved templates match this view.",
  },
  bn: {
    title: "টেমপ্লেট",
    description: "সংরক্ষিত লেআউট নতুন ডিজাইন হিসেবে ব্যবহার করুন।",
    search: "টেমপ্লেট খুঁজুন",
    filterTemplates: "টেমপ্লেট ফিল্টার করুন",
    filterTemplateKind: "টেমপ্লেট ধরন ফিল্টার করুন",
    allSizes: "সব মাপ",
    square: "স্কয়ার",
    wide: "ওয়াইড",
    tall: "লম্বা",
    allTypes: "সব ধরন",
    brand: "ব্র্যান্ড",
    team: "টিম",
    standard: "স্ট্যান্ডার্ড",
    noThumbnail: "থাম্বনেইল নেই",
    templateCopyPlaceholder: (name) => `${name} কপি`,
    newDesignNameFromTemplate: (name) => `${name} থেকে নতুন ডিজাইনের নাম`,
    useTemplate: "টেমপ্লেট ব্যবহার করুন",
    empty: "এই ভিউতে কোনো সংরক্ষিত টেমপ্লেট মিলছে না।",
  },
  es: {
    title: "Plantillas",
    description: "Diseños guardados que puedes reutilizar como diseños nuevos.",
    search: "Buscar plantillas",
    filterTemplates: "Filtrar plantillas",
    filterTemplateKind: "Filtrar tipo de plantilla",
    allSizes: "Todos los tamaños",
    square: "Cuadrado",
    wide: "Ancho",
    tall: "Alto",
    allTypes: "Todos los tipos",
    brand: "Marca",
    team: "Equipo",
    standard: "Estándar",
    noThumbnail: "Sin miniatura",
    templateCopyPlaceholder: (name) => `Copia de ${name}`,
    newDesignNameFromTemplate: (name) => `Nombre del diseño desde ${name}`,
    useTemplate: "Usar plantilla",
    empty: "No hay plantillas guardadas para esta vista.",
  },
  fr: {
    title: "Modèles",
    description:
      "Des mises en page enregistrées à réutiliser comme nouveaux designs.",
    search: "Rechercher des modèles",
    filterTemplates: "Filtrer les modèles",
    filterTemplateKind: "Filtrer le type de modèle",
    allSizes: "Tous les formats",
    square: "Carré",
    wide: "Large",
    tall: "Vertical",
    allTypes: "Tous les types",
    brand: "Marque",
    team: "Équipe",
    standard: "Standard",
    noThumbnail: "Aucune miniature",
    templateCopyPlaceholder: (name) => `Copie de ${name}`,
    newDesignNameFromTemplate: (name) => `Nom du design depuis ${name}`,
    useTemplate: "Utiliser le modèle",
    empty: "Aucun modèle enregistré ne correspond à cette vue.",
  },
  hi: {
    title: "टेम्पलेट",
    description: "सेव किए गए लेआउट जिन्हें नए डिजाइन के रूप में इस्तेमाल करें।",
    search: "टेम्पलेट खोजें",
    filterTemplates: "टेम्पलेट फिल्टर करें",
    filterTemplateKind: "टेम्पलेट प्रकार फिल्टर करें",
    allSizes: "सभी आकार",
    square: "वर्ग",
    wide: "चौड़ा",
    tall: "लंबा",
    allTypes: "सभी प्रकार",
    brand: "ब्रांड",
    team: "टीम",
    standard: "स्टैंडर्ड",
    noThumbnail: "थंबनेल नहीं",
    templateCopyPlaceholder: (name) => `${name} कॉपी`,
    newDesignNameFromTemplate: (name) => `${name} से नए डिजाइन का नाम`,
    useTemplate: "टेम्पलेट इस्तेमाल करें",
    empty: "इस व्यू में कोई सेव टेम्पलेट मेल नहीं खाता।",
  },
};
