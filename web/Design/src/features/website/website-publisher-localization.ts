import type { WebsitePublishStatus } from "@/db/website-publishing";
import type { EditorLocale } from "@/features/editor/editor-localization";
import type { WebsiteNavigationStyle } from "@/features/editor/types";
import type { WebsiteSeoAuditCode } from "@/features/website/website-seo-audit";

type PreviewWidth = "mobile" | "tablet" | "desktop";

export type WebsitePublisherCopy = {
  title: string;
  description: string;
  design: string;
  selectDesign: string;
  publicSlug: string;
  websiteTitle: string;
  seoTitle: string;
  seoDescription: string;
  seoDescriptionPlaceholder: string;
  seoReadinessTitle?: string;
  seoReadinessDescription?: string;
  seoAuditLabels?: Partial<Record<WebsiteSeoAuditCode, string>>;
  navigationStyle: string;
  navigationStyleDescription: string;
  navigationStyles: Record<WebsiteNavigationStyle, string>;
  publishWebsite: string;
  linkInBioStarterTitle: string;
  linkInBioStarterDescription: string;
  linkInBioStarterName: string;
  createLinkInBioStarter: string;
  previewWidth: Record<PreviewWidth, string>;
  open: string;
  previewTitle: (title: string) => string;
  analytics: string;
  views: string;
  clicks: string;
  lastActivity: string;
  noActivity: string;
  customDomains: string;
  customDomainsDescription: string;
  domain: string;
  domainPlaceholder: string;
  addDomain: string;
  verificationRecord: string;
  txtName: string;
  txtValue: string;
  platformRouting?: string;
  platformRoutingReady?: string;
  platformRoutingPending?: string;
  platformRoutingStatus?: Partial<Record<"ready" | "waiting", string>>;
  routingHost?: string;
  routingType?: string;
  routingValue?: string;
  attachDomain?: string;
  refreshDomain?: string;
  platformDomainStatus?: Partial<Record<"manual" | "attached" | "error", string>>;
  verifyDomain: string;
  removeDomain: string;
  noDomains: string;
  domainStatus: Record<"pending" | "verified", string>;
  status: Record<WebsitePublishStatus, string>;
  deletedDesign: string;
  emptyWebsites: string;
  unpublishSelected: string;
  recentSubmissions: string;
  fallbackWebsiteTitle: string;
  emptySubmissions: string;
};

const defaultLocale: EditorLocale = "en";

export function getWebsitePublisherCopy(
  locale: EditorLocale,
): WebsitePublisherCopy {
  return websitePublisherCopy[locale] ?? websitePublisherCopy[defaultLocale];
}

const websitePublisherCopy: Record<EditorLocale, WebsitePublisherCopy> = {
  en: {
    title: "Website publisher",
    description:
      "Publish a design as a hosted responsive site with public form capture.",
    design: "Design",
    selectDesign: "Select design",
    publicSlug: "Public slug",
    websiteTitle: "Website title",
    seoTitle: "SEO title",
    seoDescription: "SEO description",
    seoDescriptionPlaceholder: "A short search and share description.",
    seoReadinessTitle: "SEO readiness",
    seoReadinessDescription:
      "Check publish metadata before the site goes live.",
    seoAuditLabels: {
      design: "Select a design to publish.",
      title: "Use a readable website title.",
      "seo-title": "Write a focused SEO title.",
      description: "Add an 80 to 160 character SEO description.",
      slug: "Use lowercase words and hyphens for the slug.",
    },
    navigationStyle: "Navigation style",
    navigationStyleDescription:
      "Choose how section links appear on the published site.",
    navigationStyles: {
      top: "Top bar",
      pills: "Floating pills",
      side: "Side rail",
      hidden: "Hidden",
    },
    publishWebsite: "Publish website",
    linkInBioStarterTitle: "Link-in-bio starter",
    linkInBioStarterDescription:
      "Create a mobile-first website design with editable linked buttons, profile copy, and a QR block.",
    linkInBioStarterName: "Link hub name",
    createLinkInBioStarter: "Create link hub",
    previewWidth: {
      mobile: "mobile",
      tablet: "tablet",
      desktop: "desktop",
    },
    open: "Open",
    previewTitle: (title) => `${title} preview`,
    analytics: "Website analytics",
    views: "Views",
    clicks: "Clicks",
    lastActivity: "Last activity",
    noActivity: "No activity yet",
    customDomains: "Custom domains",
    customDomainsDescription:
      "Connect a domain you own, add the TXT record, then verify it.",
    domain: "Domain",
    domainPlaceholder: "example.com",
    addDomain: "Add domain",
    verificationRecord: "Verification record",
    txtName: "TXT name",
    txtValue: "TXT value",
    platformRouting: "Platform routing",
    platformRoutingReady:
      "Add this record so the hosting platform can serve this domain.",
    platformRoutingPending:
      "Verify the TXT record before adding the hosting record.",
    platformRoutingStatus: {
      ready: "ready",
      waiting: "waiting",
    },
    routingHost: "Host",
    routingType: "Type",
    routingValue: "Value",
    attachDomain: "Attach domain",
    refreshDomain: "Check status",
    platformDomainStatus: {
      manual: "manual",
      attached: "attached",
      error: "error",
    },
    verifyDomain: "Verify",
    removeDomain: "Remove",
    noDomains: "No custom domains connected.",
    domainStatus: {
      pending: "pending",
      verified: "verified",
    },
    status: {
      published: "published",
      unpublished: "unpublished",
    },
    deletedDesign: "Deleted design",
    emptyWebsites: "No hosted websites yet.",
    unpublishSelected: "Unpublish selected website",
    recentSubmissions: "Recent form submissions",
    fallbackWebsiteTitle: "Website",
    emptySubmissions: "Published website forms will appear here.",
  },
  bn: {
    title: "ওয়েবসাইট পাবলিশার",
    description:
      "একটি ডিজাইনকে পাবলিক ফর্মসহ হোস্টেড রেসপনসিভ সাইট হিসেবে প্রকাশ করুন।",
    design: "ডিজাইন",
    selectDesign: "ডিজাইন নির্বাচন করুন",
    publicSlug: "পাবলিক স্লাগ",
    websiteTitle: "ওয়েবসাইট শিরোনাম",
    seoTitle: "SEO শিরোনাম",
    seoDescription: "SEO বিবরণ",
    seoDescriptionPlaceholder: "সার্চ এবং শেয়ারের জন্য ছোট বিবরণ।",
    navigationStyle: "নেভিগেশন স্টাইল",
    navigationStyleDescription:
      "প্রকাশিত সাইটে সেকশন লিংক কীভাবে দেখাবে তা বেছে নিন।",
    navigationStyles: {
      top: "টপ বার",
      pills: "ফ্লোটিং পিল",
      side: "সাইড রেল",
      hidden: "লুকানো",
    },
    publishWebsite: "ওয়েবসাইট প্রকাশ করুন",
    linkInBioStarterTitle: "লিংক-ইন-বায়ো স্টার্টার",
    linkInBioStarterDescription:
      "এডিটযোগ্য লিংক বাটন, প্রোফাইল কপি এবং QR ব্লকসহ মোবাইল-ফার্স্ট ওয়েবসাইট তৈরি করুন।",
    linkInBioStarterName: "লিংক হাবের নাম",
    createLinkInBioStarter: "লিংক হাব তৈরি করুন",
    previewWidth: {
      mobile: "মোবাইল",
      tablet: "ট্যাবলেট",
      desktop: "ডেস্কটপ",
    },
    open: "খুলুন",
    previewTitle: (title) => `${title} প্রিভিউ`,
    analytics: "ওয়েবসাইট অ্যানালিটিক্স",
    views: "ভিউ",
    clicks: "ক্লিক",
    lastActivity: "শেষ কার্যকলাপ",
    noActivity: "এখনও কার্যকলাপ নেই",
    customDomains: "কাস্টম ডোমেইন",
    customDomainsDescription:
      "আপনার ডোমেইন যুক্ত করুন, TXT রেকর্ড দিন, তারপর যাচাই করুন।",
    domain: "ডোমেইন",
    domainPlaceholder: "example.com",
    addDomain: "ডোমেইন যোগ করুন",
    verificationRecord: "যাচাইকরণ রেকর্ড",
    txtName: "TXT নাম",
    txtValue: "TXT মান",
    verifyDomain: "যাচাই",
    removeDomain: "সরান",
    noDomains: "কোনো কাস্টম ডোমেইন যুক্ত নেই।",
    domainStatus: {
      pending: "অপেক্ষমাণ",
      verified: "যাচাইকৃত",
    },
    status: {
      published: "প্রকাশিত",
      unpublished: "অপ্রকাশিত",
    },
    deletedDesign: "মুছে ফেলা ডিজাইন",
    emptyWebsites: "এখনও কোনো হোস্টেড ওয়েবসাইট নেই।",
    unpublishSelected: "নির্বাচিত ওয়েবসাইট অপ্রকাশিত করুন",
    recentSubmissions: "সাম্প্রতিক ফর্ম সাবমিশন",
    fallbackWebsiteTitle: "ওয়েবসাইট",
    emptySubmissions: "প্রকাশিত ওয়েবসাইটের ফর্ম এখানে দেখা যাবে।",
  },
  es: {
    title: "Publicador web",
    description:
      "Publica un diseño como sitio responsive alojado con captura de formularios.",
    design: "Diseño",
    selectDesign: "Seleccionar diseño",
    publicSlug: "Slug público",
    websiteTitle: "Título del sitio",
    seoTitle: "Título SEO",
    seoDescription: "Descripción SEO",
    seoDescriptionPlaceholder: "Una descripción breve para búsqueda y compartir.",
    navigationStyle: "Estilo de navegación",
    navigationStyleDescription:
      "Elige cómo aparecen los enlaces de sección en el sitio publicado.",
    navigationStyles: {
      top: "Barra superior",
      pills: "Píldoras flotantes",
      side: "Riel lateral",
      hidden: "Oculta",
    },
    publishWebsite: "Publicar sitio",
    linkInBioStarterTitle: "Inicio link-in-bio",
    linkInBioStarterDescription:
      "Crea un sitio movil con botones enlazados editables, perfil y bloque QR.",
    linkInBioStarterName: "Nombre del hub",
    createLinkInBioStarter: "Crear hub",
    previewWidth: {
      mobile: "móvil",
      tablet: "tablet",
      desktop: "escritorio",
    },
    open: "Abrir",
    previewTitle: (title) => `Vista previa de ${title}`,
    analytics: "Analiticas del sitio",
    views: "Vistas",
    clicks: "Clics",
    lastActivity: "Ultima actividad",
    noActivity: "Sin actividad aun",
    customDomains: "Dominios personalizados",
    customDomainsDescription:
      "Conecta un dominio propio, agrega el TXT y luego verificalo.",
    domain: "Dominio",
    domainPlaceholder: "example.com",
    addDomain: "Agregar dominio",
    verificationRecord: "Registro de verificacion",
    txtName: "Nombre TXT",
    txtValue: "Valor TXT",
    verifyDomain: "Verificar",
    removeDomain: "Eliminar",
    noDomains: "No hay dominios personalizados conectados.",
    domainStatus: {
      pending: "pendiente",
      verified: "verificado",
    },
    status: {
      published: "publicado",
      unpublished: "sin publicar",
    },
    deletedDesign: "Diseño eliminado",
    emptyWebsites: "Aún no hay sitios alojados.",
    unpublishSelected: "Despublicar sitio seleccionado",
    recentSubmissions: "Envíos recientes de formularios",
    fallbackWebsiteTitle: "Sitio web",
    emptySubmissions: "Los formularios publicados aparecerán aquí.",
  },
  fr: {
    title: "Publication web",
    description:
      "Publiez un design comme site responsive hébergé avec collecte de formulaires.",
    design: "Design",
    selectDesign: "Sélectionner un design",
    publicSlug: "Slug public",
    websiteTitle: "Titre du site",
    seoTitle: "Titre SEO",
    seoDescription: "Description SEO",
    seoDescriptionPlaceholder:
      "Une courte description pour la recherche et le partage.",
    navigationStyle: "Style de navigation",
    navigationStyleDescription:
      "Choisissez comment les liens de section apparaissent sur le site publié.",
    navigationStyles: {
      top: "Barre supérieure",
      pills: "Pastilles flottantes",
      side: "Rail latéral",
      hidden: "Masquée",
    },
    publishWebsite: "Publier le site",
    linkInBioStarterTitle: "Starter link-in-bio",
    linkInBioStarterDescription:
      "Creez un site mobile avec boutons lies editables, profil et bloc QR.",
    linkInBioStarterName: "Nom du hub",
    createLinkInBioStarter: "Creer le hub",
    previewWidth: {
      mobile: "mobile",
      tablet: "tablette",
      desktop: "bureau",
    },
    open: "Ouvrir",
    previewTitle: (title) => `Aperçu de ${title}`,
    analytics: "Analytics du site",
    views: "Vues",
    clicks: "Clics",
    lastActivity: "Derniere activite",
    noActivity: "Aucune activite",
    customDomains: "Domaines personnalises",
    customDomainsDescription:
      "Connectez un domaine, ajoutez le TXT, puis verifiez-le.",
    domain: "Domaine",
    domainPlaceholder: "example.com",
    addDomain: "Ajouter un domaine",
    verificationRecord: "Enregistrement de verification",
    txtName: "Nom TXT",
    txtValue: "Valeur TXT",
    verifyDomain: "Verifier",
    removeDomain: "Supprimer",
    noDomains: "Aucun domaine personnalise connecte.",
    domainStatus: {
      pending: "en attente",
      verified: "verifie",
    },
    status: {
      published: "publié",
      unpublished: "non publié",
    },
    deletedDesign: "Design supprimé",
    emptyWebsites: "Aucun site hébergé pour le moment.",
    unpublishSelected: "Dépublier le site sélectionné",
    recentSubmissions: "Soumissions récentes de formulaire",
    fallbackWebsiteTitle: "Site web",
    emptySubmissions: "Les formulaires publiés apparaîtront ici.",
  },
  hi: {
    title: "वेबसाइट पब्लिशर",
    description:
      "डिजाइन को सार्वजनिक फॉर्म कैप्चर वाले होस्टेड responsive साइट के रूप में प्रकाशित करें।",
    design: "डिजाइन",
    selectDesign: "डिजाइन चुनें",
    publicSlug: "पब्लिक स्लग",
    websiteTitle: "वेबसाइट शीर्षक",
    seoTitle: "SEO शीर्षक",
    seoDescription: "SEO विवरण",
    seoDescriptionPlaceholder: "सर्च और शेयर के लिए छोटा विवरण।",
    navigationStyle: "नेविगेशन स्टाइल",
    navigationStyleDescription:
      "प्रकाशित साइट पर सेक्शन लिंक कैसे दिखेंगे, यह चुनें।",
    navigationStyles: {
      top: "टॉप बार",
      pills: "फ्लोटिंग पिल्स",
      side: "साइड रेल",
      hidden: "छिपा हुआ",
    },
    publishWebsite: "वेबसाइट प्रकाशित करें",
    linkInBioStarterTitle: "लिंक-इन-बायो स्टार्टर",
    linkInBioStarterDescription:
      "एडिट होने वाले लिंक बटन, प्रोफाइल कॉपी और QR ब्लॉक के साथ मोबाइल वेबसाइट बनाएं।",
    linkInBioStarterName: "लिंक हब नाम",
    createLinkInBioStarter: "लिंक हब बनाएं",
    previewWidth: {
      mobile: "मोबाइल",
      tablet: "टैबलेट",
      desktop: "डेस्कटॉप",
    },
    open: "खोलें",
    previewTitle: (title) => `${title} प्रिव्यू`,
    analytics: "वेबसाइट एनालिटिक्स",
    views: "व्यू",
    clicks: "क्लिक",
    lastActivity: "आखिरी गतिविधि",
    noActivity: "अभी कोई गतिविधि नहीं",
    customDomains: "कस्टम डोमेन",
    customDomainsDescription:
      "अपना डोमेन जोड़ें, TXT रिकॉर्ड लगाएं, फिर सत्यापित करें।",
    domain: "डोमेन",
    domainPlaceholder: "example.com",
    addDomain: "डोमेन जोड़ें",
    verificationRecord: "सत्यापन रिकॉर्ड",
    txtName: "TXT नाम",
    txtValue: "TXT मान",
    verifyDomain: "सत्यापित करें",
    removeDomain: "हटाएं",
    noDomains: "कोई कस्टम डोमेन जुड़ा नहीं है।",
    domainStatus: {
      pending: "लंबित",
      verified: "सत्यापित",
    },
    status: {
      published: "प्रकाशित",
      unpublished: "अप्रकाशित",
    },
    deletedDesign: "हटाया गया डिजाइन",
    emptyWebsites: "अभी कोई होस्टेड वेबसाइट नहीं है।",
    unpublishSelected: "चुनी हुई वेबसाइट अप्रकाशित करें",
    recentSubmissions: "हाल की फॉर्म सबमिशन",
    fallbackWebsiteTitle: "वेबसाइट",
    emptySubmissions: "प्रकाशित वेबसाइट फॉर्म यहां दिखाई देंगे।",
  },
};
