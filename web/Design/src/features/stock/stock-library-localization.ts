import type { EditorLocale } from "@/features/editor/editor-localization";

export type StockLibraryCopy = {
  title: string;
  description: string;
  searchPlaceholder: string;
  searchAria: string;
  searchFailedAnotherQuery: string;
  noResults: string;
  searchFailed: string;
  importFailed: string;
  importedAsset: (name: string) => string;
  freeLicense: string;
  importing: string;
  import: string;
};

const defaultLocale: EditorLocale = "en";

export function getStockLibraryCopy(locale: EditorLocale): StockLibraryCopy {
  return stockLibraryCopy[locale] ?? stockLibraryCopy[defaultLocale];
}

const stockLibraryCopy: Record<EditorLocale, StockLibraryCopy> = {
  en: {
    title: "Free stock",
    description: "Search Wikimedia Commons and import license-tracked images.",
    searchPlaceholder: "Search free images",
    searchAria: "Search free stock",
    searchFailedAnotherQuery: "Stock search failed. Please try another query.",
    noResults: "No free stock results found.",
    searchFailed: "Stock search failed. Please try again.",
    importFailed: "Could not import this stock image.",
    importedAsset: (name) => `Imported ${name} into uploads.`,
    freeLicense: "Free",
    importing: "Importing",
    import: "Import",
  },
  bn: {
    title: "ফ্রি স্টক",
    description: "Wikimedia Commons খুঁজুন এবং লাইসেন্স-ট্র্যাকড ছবি ইমপোর্ট করুন।",
    searchPlaceholder: "ফ্রি ছবি খুঁজুন",
    searchAria: "ফ্রি স্টক খুঁজুন",
    searchFailedAnotherQuery: "স্টক সার্চ ব্যর্থ হয়েছে। অন্য কুয়েরি চেষ্টা করুন।",
    noResults: "কোনো ফ্রি স্টক ফলাফল পাওয়া যায়নি।",
    searchFailed: "স্টক সার্চ ব্যর্থ হয়েছে। আবার চেষ্টা করুন।",
    importFailed: "এই স্টক ছবিটি ইমপোর্ট করা যায়নি।",
    importedAsset: (name) => `${name} uploads-এ ইমপোর্ট হয়েছে।`,
    freeLicense: "ফ্রি",
    importing: "ইমপোর্ট হচ্ছে",
    import: "ইমপোর্ট",
  },
  es: {
    title: "Stock gratis",
    description:
      "Busca en Wikimedia Commons e importa imágenes con licencia registrada.",
    searchPlaceholder: "Buscar imágenes gratis",
    searchAria: "Buscar stock gratis",
    searchFailedAnotherQuery:
      "Falló la búsqueda de stock. Prueba otra consulta.",
    noResults: "No se encontraron resultados de stock gratis.",
    searchFailed: "Falló la búsqueda de stock. Inténtalo de nuevo.",
    importFailed: "No se pudo importar esta imagen de stock.",
    importedAsset: (name) => `${name} importado a uploads.`,
    freeLicense: "Gratis",
    importing: "Importando",
    import: "Importar",
  },
  fr: {
    title: "Stock gratuit",
    description:
      "Recherchez Wikimedia Commons et importez des images avec licence suivie.",
    searchPlaceholder: "Rechercher des images gratuites",
    searchAria: "Rechercher du stock gratuit",
    searchFailedAnotherQuery:
      "La recherche de stock a échoué. Essayez une autre requête.",
    noResults: "Aucun résultat de stock gratuit trouvé.",
    searchFailed: "La recherche de stock a échoué. Réessayez.",
    importFailed: "Impossible d'importer cette image de stock.",
    importedAsset: (name) => `${name} importé dans les uploads.`,
    freeLicense: "Gratuit",
    importing: "Importation",
    import: "Importer",
  },
  hi: {
    title: "फ्री स्टॉक",
    description:
      "Wikimedia Commons खोजें और license-tracked images इम्पोर्ट करें।",
    searchPlaceholder: "फ्री इमेज खोजें",
    searchAria: "फ्री स्टॉक खोजें",
    searchFailedAnotherQuery:
      "स्टॉक खोज विफल हुई। दूसरी query आजमाएं।",
    noResults: "कोई फ्री स्टॉक परिणाम नहीं मिला।",
    searchFailed: "स्टॉक खोज विफल हुई। फिर कोशिश करें।",
    importFailed: "यह स्टॉक इमेज इम्पोर्ट नहीं हो सकी।",
    importedAsset: (name) => `${name} uploads में इम्पोर्ट हुआ।`,
    freeLicense: "फ्री",
    importing: "इम्पोर्ट हो रहा है",
    import: "इम्पोर्ट",
  },
};
