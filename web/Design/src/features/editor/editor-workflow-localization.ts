import type { EditorLocale } from "@/features/editor/editor-localization";

type CommandPaletteCopy = {
  title: string;
  description: string;
  search: string;
  empty: string;
  create: string;
  edit: string;
  automation?: string;
  view: string;
  file: string;
  addText: string;
  addDocument?: string;
  addRectangle: string;
  addEllipse: string;
  addLine: string;
  addStickyNote: string;
  addConnector: string;
  addVectorPath?: string;
  addFlowchart: string;
  addQrCode: string;
  addTable: string;
  addChart: string;
  addDataStory: string;
  addForm: string;
  addEmbed: string;
  addTimer: string;
  undo: string;
  redo: string;
  duplicateSelection: string;
  deleteSelection: string;
  connectSelection: string;
  booleanUnion?: string;
  booleanSubtract?: string;
  booleanIntersect?: string;
  booleanExclude?: string;
  distributeHorizontal: string;
  distributeVertical: string;
  groupSelection: string;
  ungroupSelection: string;
  zoomOut: string;
  zoomIn: string;
  toggleGrid: string;
  toggleGuides: string;
  togglePrintMarks: string;
  saveDesign: string;
  exportPng: string;
  exportJpg: string;
  exportWebp: string;
  exportGif: string;
  exportMp4: string;
  exportMediaSequence: string;
  exportPdf: string;
  exportDocx: string;
  exportXlsx: string;
  exportAllPagesPdf: string;
  exportPrintPdf: string;
  exportHtml: string;
};

type PagesPanelCopy = {
  title: string;
  description: string;
  exportSpeakerNotes: string;
  importSpeakerNotes: string;
  exportTranslationPack: string;
  importTranslationPack: string;
  bulkCreateCsv: string;
  addPage: string;
  csvReadError: string;
  notesImportError: string;
  translationImportError: string;
  csvUseHeader: string;
  csvSizeLimit: string;
  csvCreated: (count: number) => string;
  csvCreatedTruncated: (count: number) => string;
  speakerNotesUpdated: (count: number) => string;
  noTranslationsApplied: (count: number) => string;
  translationsApplied: (applied: number, skipped: number) => string;
  selectPage: (number: number) => string;
  pageName: (number: number) => string;
  movePageUp: string;
  movePageDown: string;
  duplicatePage: string;
  deletePage: string;
  pageSize?: string;
  pageFormat?: string;
  pageWidth?: string;
  pageHeight?: string;
  slideOutline: string;
  layerCount: (count: number) => string;
  websiteNavigation?: string;
  websiteNavigationLabel?: string;
  websiteNavigationLabelFor?: (pageName: string) => string;
  websiteNavigationGroup?: string;
  websiteNavigationGroupFor?: (pageName: string) => string;
  websiteNavigationGroupPlaceholder?: string;
  websiteShowInNavigation?: string;
  websiteShowInNavigationFor?: (pageName: string) => string;
  websiteShowInNavigationDescription?: string;
  websiteSeo?: string;
  websiteSeoTitle?: string;
  websiteSeoDescription?: string;
  websiteSeoTitleFor?: (pageName: string) => string;
  websiteSeoDescriptionFor?: (pageName: string) => string;
  websiteSeoDescriptionHelp?: string;
  speakerNotes: string;
  speakerNotesFor: (pageName: string) => string;
  transition: string;
  transitions: Record<"none" | "fade" | "slide" | "zoom", string>;
};

export function getEditorCommandPaletteCopy(locale: EditorLocale) {
  return commandPaletteCopy[locale] ?? commandPaletteCopy.en;
}

export function getEditorPagesPanelCopy(locale: EditorLocale) {
  return pagesPanelCopy[locale] ?? pagesPanelCopy.en;
}

const commandPaletteCopy: Record<EditorLocale, CommandPaletteCopy> = {
  en: {
    title: "Editor commands",
    description: "Search editor actions",
    search: "Search commands...",
    empty: "No command found.",
    create: "Create",
    edit: "Edit",
    automation: "Automation",
    view: "View",
    file: "File",
    addText: "Add text",
    addDocument: "Add document",
    addRectangle: "Add rectangle",
    addEllipse: "Add ellipse",
    addLine: "Add line",
    addStickyNote: "Add sticky note",
    addConnector: "Add connector",
    addVectorPath: "Add Bezier path",
    addFlowchart: "Add flowchart",
    addQrCode: "Add QR code",
    addTable: "Add table",
    addChart: "Add chart",
    addDataStory: "Add data story",
    addForm: "Add form field",
    addEmbed: "Add embed link",
    addTimer: "Add timer",
    undo: "Undo",
    redo: "Redo",
    duplicateSelection: "Duplicate selected layer",
    deleteSelection: "Delete selected layer",
    connectSelection: "Connect selected layers",
    booleanUnion: "Union selected shapes",
    booleanSubtract: "Subtract selected shapes",
    booleanIntersect: "Intersect selected shapes",
    booleanExclude: "Exclude selected shapes",
    distributeHorizontal: "Distribute horizontally",
    distributeVertical: "Distribute vertically",
    groupSelection: "Group selected layers",
    ungroupSelection: "Ungroup selected layers",
    zoomOut: "Zoom out",
    zoomIn: "Zoom in",
    toggleGrid: "Toggle grid",
    toggleGuides: "Toggle rulers and guides",
    togglePrintMarks: "Toggle bleed and crop marks",
    saveDesign: "Save design",
    exportPng: "Export PNG",
    exportJpg: "Export JPG",
    exportWebp: "Export WebP",
    exportGif: "Export GIF",
    exportMp4: "Export MP4",
    exportMediaSequence: "Export media sequence JSON",
    exportPdf: "Export PDF",
    exportDocx: "Export DOCX",
    exportXlsx: "Export XLSX",
    exportAllPagesPdf: "Export all pages PDF",
    exportPrintPdf: "Export print-ready PDF",
    exportHtml: "Export website HTML",
  },
  bn: {
    title: "এডিটর কমান্ড",
    description: "এডিটর কাজ খুঁজুন",
    search: "কমান্ড খুঁজুন...",
    empty: "কোনো কমান্ড পাওয়া যায়নি।",
    create: "তৈরি করুন",
    edit: "সম্পাদনা",
    view: "ভিউ",
    file: "ফাইল",
    addText: "টেক্সট যোগ করুন",
    addRectangle: "আয়তক্ষেত্র যোগ করুন",
    addEllipse: "বৃত্ত যোগ করুন",
    addLine: "লাইন যোগ করুন",
    addStickyNote: "স্টিকি নোট যোগ করুন",
    addConnector: "কানেক্টর যোগ করুন",
    addFlowchart: "ফ্লোচার্ট যোগ করুন",
    addQrCode: "QR কোড যোগ করুন",
    addTable: "টেবিল যোগ করুন",
    addChart: "চার্ট যোগ করুন",
    addDataStory: "ডেটা স্টোরি যোগ করুন",
    addForm: "ফর্ম ফিল্ড যোগ করুন",
    addEmbed: "এম্বেড লিংক যোগ করুন",
    addTimer: "টাইমার যোগ করুন",
    undo: "পেছনে যান",
    redo: "আবার করুন",
    duplicateSelection: "নির্বাচিত লেয়ার কপি করুন",
    deleteSelection: "নির্বাচিত লেয়ার মুছুন",
    connectSelection: "নির্বাচিত লেয়ার সংযুক্ত করুন",
    distributeHorizontal: "অনুভূমিকভাবে ছড়ান",
    distributeVertical: "উল্লম্বভাবে ছড়ান",
    groupSelection: "নির্বাচিত লেয়ার গ্রুপ করুন",
    ungroupSelection: "গ্রুপ খুলুন",
    zoomOut: "জুম কমান",
    zoomIn: "জুম বাড়ান",
    toggleGrid: "গ্রিড চালু/বন্ধ",
    toggleGuides: "রুলার ও গাইড চালু/বন্ধ",
    togglePrintMarks: "ব্লিড ও ক্রপ মার্ক চালু/বন্ধ",
    saveDesign: "ডিজাইন সেভ করুন",
    exportPng: "PNG এক্সপোর্ট",
    exportJpg: "JPG এক্সপোর্ট",
    exportWebp: "WebP এক্সপোর্ট",
    exportGif: "GIF এক্সপোর্ট",
    exportMp4: "MP4 এক্সপোর্ট",
    exportMediaSequence: "মিডিয়া সিকোয়েন্স JSON এক্সপোর্ট",
    exportPdf: "PDF এক্সপোর্ট",
    exportDocx: "DOCX এক্সপোর্ট",
    exportXlsx: "XLSX এক্সপোর্ট",
    exportAllPagesPdf: "সব পেজ PDF এক্সপোর্ট",
    exportPrintPdf: "প্রিন্ট-ready PDF এক্সপোর্ট",
    exportHtml: "ওয়েবসাইট HTML এক্সপোর্ট",
  },
  es: {
    title: "Comandos del editor",
    description: "Buscar acciones del editor",
    search: "Buscar comandos...",
    empty: "No se encontró ningún comando.",
    create: "Crear",
    edit: "Editar",
    view: "Vista",
    file: "Archivo",
    addText: "Agregar texto",
    addRectangle: "Agregar rectángulo",
    addEllipse: "Agregar elipse",
    addLine: "Agregar línea",
    addStickyNote: "Agregar nota",
    addConnector: "Agregar conector",
    addFlowchart: "Agregar diagrama",
    addQrCode: "Agregar código QR",
    addTable: "Agregar tabla",
    addChart: "Agregar gráfico",
    addDataStory: "Agregar historia de datos",
    addForm: "Agregar campo de formulario",
    addEmbed: "Agregar enlace incrustado",
    addTimer: "Agregar temporizador",
    undo: "Deshacer",
    redo: "Rehacer",
    duplicateSelection: "Duplicar capa seleccionada",
    deleteSelection: "Eliminar capa seleccionada",
    connectSelection: "Conectar capas seleccionadas",
    distributeHorizontal: "Distribuir horizontalmente",
    distributeVertical: "Distribuir verticalmente",
    groupSelection: "Agrupar capas seleccionadas",
    ungroupSelection: "Desagrupar capas seleccionadas",
    zoomOut: "Alejar",
    zoomIn: "Acercar",
    toggleGrid: "Alternar cuadrícula",
    toggleGuides: "Alternar reglas y guías",
    togglePrintMarks: "Alternar sangrado y marcas",
    saveDesign: "Guardar diseño",
    exportPng: "Exportar PNG",
    exportJpg: "Exportar JPG",
    exportWebp: "Exportar WebP",
    exportGif: "Exportar GIF",
    exportMp4: "Exportar MP4",
    exportMediaSequence: "Exportar secuencia JSON",
    exportPdf: "Exportar PDF",
    exportDocx: "Exportar DOCX",
    exportXlsx: "Exportar XLSX",
    exportAllPagesPdf: "Exportar todas las páginas PDF",
    exportPrintPdf: "Exportar PDF para impresión",
    exportHtml: "Exportar HTML del sitio",
  },
  fr: {
    title: "Commandes de l'éditeur",
    description: "Rechercher des actions",
    search: "Rechercher des commandes...",
    empty: "Aucune commande trouvée.",
    create: "Créer",
    edit: "Modifier",
    view: "Affichage",
    file: "Fichier",
    addText: "Ajouter du texte",
    addRectangle: "Ajouter un rectangle",
    addEllipse: "Ajouter une ellipse",
    addLine: "Ajouter une ligne",
    addStickyNote: "Ajouter une note",
    addConnector: "Ajouter un connecteur",
    addFlowchart: "Ajouter un organigramme",
    addQrCode: "Ajouter un code QR",
    addTable: "Ajouter un tableau",
    addChart: "Ajouter un graphique",
    addDataStory: "Ajouter une histoire de données",
    addForm: "Ajouter un champ de formulaire",
    addEmbed: "Ajouter un lien intégré",
    addTimer: "Ajouter un minuteur",
    undo: "Annuler",
    redo: "Rétablir",
    duplicateSelection: "Dupliquer le calque sélectionné",
    deleteSelection: "Supprimer le calque sélectionné",
    connectSelection: "Connecter les calques sélectionnés",
    distributeHorizontal: "Distribuer horizontalement",
    distributeVertical: "Distribuer verticalement",
    groupSelection: "Grouper les calques sélectionnés",
    ungroupSelection: "Dégrouper les calques sélectionnés",
    zoomOut: "Zoom arrière",
    zoomIn: "Zoom avant",
    toggleGrid: "Activer la grille",
    toggleGuides: "Activer règles et repères",
    togglePrintMarks: "Activer fond perdu et repères",
    saveDesign: "Enregistrer le design",
    exportPng: "Exporter PNG",
    exportJpg: "Exporter JPG",
    exportWebp: "Exporter WebP",
    exportGif: "Exporter GIF",
    exportMp4: "Exporter MP4",
    exportMediaSequence: "Exporter la séquence JSON",
    exportPdf: "Exporter PDF",
    exportDocx: "Exporter DOCX",
    exportXlsx: "Exporter XLSX",
    exportAllPagesPdf: "Exporter toutes les pages PDF",
    exportPrintPdf: "Exporter PDF prêt à imprimer",
    exportHtml: "Exporter HTML du site",
  },
  hi: {
    title: "एडिटर कमांड",
    description: "एडिटर काम खोजें",
    search: "कमांड खोजें...",
    empty: "कोई कमांड नहीं मिला।",
    create: "बनाएं",
    edit: "संपादित करें",
    view: "व्यू",
    file: "फाइल",
    addText: "टेक्स्ट जोड़ें",
    addRectangle: "आयत जोड़ें",
    addEllipse: "दीर्घवृत्त जोड़ें",
    addLine: "लाइन जोड़ें",
    addStickyNote: "स्टिकी नोट जोड़ें",
    addConnector: "कनेक्टर जोड़ें",
    addFlowchart: "फ्लोचार्ट जोड़ें",
    addQrCode: "QR कोड जोड़ें",
    addTable: "टेबल जोड़ें",
    addChart: "चार्ट जोड़ें",
    addDataStory: "डेटा स्टोरी जोड़ें",
    addForm: "फॉर्म फील्ड जोड़ें",
    addEmbed: "एम्बेड लिंक जोड़ें",
    addTimer: "टाइमर जोड़ें",
    undo: "पहले जैसा",
    redo: "फिर से करें",
    duplicateSelection: "चुनी हुई लेयर कॉपी करें",
    deleteSelection: "चुनी हुई लेयर हटाएं",
    connectSelection: "चुनी हुई लेयर जोड़ें",
    distributeHorizontal: "क्षैतिज बांटें",
    distributeVertical: "ऊर्ध्वाधर बांटें",
    groupSelection: "चुनी हुई लेयर समूह करें",
    ungroupSelection: "समूह हटाएं",
    zoomOut: "जूम घटाएं",
    zoomIn: "जूम बढ़ाएं",
    toggleGrid: "ग्रिड चालू/बंद",
    toggleGuides: "रूलर और गाइड चालू/बंद",
    togglePrintMarks: "ब्लीड और क्रॉप मार्क चालू/बंद",
    saveDesign: "डिजाइन सेव करें",
    exportPng: "PNG एक्सपोर्ट",
    exportJpg: "JPG एक्सपोर्ट",
    exportWebp: "WebP एक्सपोर्ट",
    exportGif: "GIF एक्सपोर्ट",
    exportMp4: "MP4 एक्सपोर्ट",
    exportMediaSequence: "मीडिया सीक्वेंस JSON एक्सपोर्ट",
    exportPdf: "PDF एक्सपोर्ट",
    exportDocx: "DOCX एक्सपोर्ट",
    exportXlsx: "XLSX एक्सपोर्ट",
    exportAllPagesPdf: "सभी पेज PDF एक्सपोर्ट",
    exportPrintPdf: "प्रिंट-ready PDF एक्सपोर्ट",
    exportHtml: "वेबसाइट HTML एक्सपोर्ट",
  },
};

const pagesPanelCopy: Record<EditorLocale, PagesPanelCopy> = {
  en: {
    title: "Pages",
    description: "Multipage designs and decks.",
    exportSpeakerNotes: "Export speaker notes",
    importSpeakerNotes: "Import speaker notes",
    exportTranslationPack: "Export translation pack",
    importTranslationPack: "Import translation pack",
    bulkCreateCsv: "Bulk create pages from CSV",
    addPage: "Add page",
    csvReadError: "Could not read this CSV file.",
    notesImportError: "Could not import this notes file.",
    translationImportError: "Could not import this translation pack.",
    csvUseHeader: "Use a CSV file with a header row for bulk create.",
    csvSizeLimit: "CSV bulk create is limited to 256 KB.",
    csvCreated: (count) => `Created ${count} pages from CSV rows.`,
    csvCreatedTruncated: (count) =>
      `Created ${count} pages; extra rows were clipped.`,
    speakerNotesUpdated: (count) => `Updated speaker notes for ${count} slides.`,
    noTranslationsApplied: (count) =>
      `No translations were applied from ${count} entries.`,
    translationsApplied: (applied, skipped) =>
      `Applied ${applied} translations; skipped ${skipped}.`,
    selectPage: (number) => `Select page ${number}`,
    pageName: (number) => `Page ${number} name`,
    movePageUp: "Move page up",
    movePageDown: "Move page down",
    duplicatePage: "Duplicate page",
    deletePage: "Delete page",
    pageSize: "Page size",
    pageFormat: "Format",
    pageWidth: "Width",
    pageHeight: "Height",
    slideOutline: "Slide outline",
    layerCount: (count) => `${count} layers`,
    websiteNavigation: "Website navigation",
    websiteNavigationLabel: "Navigation label",
    websiteNavigationLabelFor: (pageName) =>
      `${pageName} website navigation label`,
    websiteNavigationGroup: "Menu group",
    websiteNavigationGroupFor: (pageName) =>
      `${pageName} website menu group`,
    websiteNavigationGroupPlaceholder: "Optional group",
    websiteShowInNavigation: "Show in navigation",
    websiteShowInNavigationFor: (pageName) =>
      `Show ${pageName} in website navigation`,
    websiteShowInNavigationDescription:
      "Keep this section in hosted website navigation.",
    websiteSeo: "Website SEO",
    websiteSeoTitle: "Section SEO title",
    websiteSeoDescription: "Section SEO description",
    websiteSeoTitleFor: (pageName) => `${pageName} website SEO title`,
    websiteSeoDescriptionFor: (pageName) =>
      `${pageName} website SEO description`,
    websiteSeoDescriptionHelp:
      "Used for hosted website sections when this page is published.",
    speakerNotes: "Speaker notes",
    speakerNotesFor: (pageName) => `${pageName} speaker notes`,
    transition: "Transition",
    transitions: { none: "None", fade: "Fade", slide: "Slide", zoom: "Zoom" },
  },
  bn: {
    title: "পেজ",
    description: "মাল্টিপেজ ডিজাইন ও ডেক।",
    exportSpeakerNotes: "স্পিকার নোট এক্সপোর্ট",
    importSpeakerNotes: "স্পিকার নোট ইমপোর্ট",
    exportTranslationPack: "অনুবাদ প্যাক এক্সপোর্ট",
    importTranslationPack: "অনুবাদ প্যাক ইমপোর্ট",
    bulkCreateCsv: "CSV থেকে পেজ তৈরি",
    addPage: "পেজ যোগ করুন",
    csvReadError: "এই CSV ফাইল পড়া যায়নি।",
    notesImportError: "এই নোট ফাইল ইমপোর্ট করা যায়নি।",
    translationImportError: "এই অনুবাদ প্যাক ইমপোর্ট করা যায়নি।",
    csvUseHeader: "বাল্ক তৈরির জন্য হেডার row সহ CSV ব্যবহার করুন।",
    csvSizeLimit: "CSV বাল্ক তৈরি 256 KB পর্যন্ত।",
    csvCreated: (count) => `CSV row থেকে ${count}টি পেজ তৈরি হয়েছে।`,
    csvCreatedTruncated: (count) =>
      `${count}টি পেজ তৈরি হয়েছে; অতিরিক্ত row কাটা হয়েছে।`,
    speakerNotesUpdated: (count) => `${count}টি স্লাইডের নোট আপডেট হয়েছে।`,
    noTranslationsApplied: (count) =>
      `${count}টি entry থেকে কোনো অনুবাদ প্রয়োগ হয়নি।`,
    translationsApplied: (applied, skipped) =>
      `${applied}টি অনুবাদ প্রয়োগ হয়েছে; ${skipped}টি বাদ।`,
    selectPage: (number) => `পেজ ${number} নির্বাচন করুন`,
    pageName: (number) => `পেজ ${number} নাম`,
    movePageUp: "পেজ ওপরে নিন",
    movePageDown: "পেজ নিচে নিন",
    duplicatePage: "পেজ কপি করুন",
    deletePage: "পেজ মুছুন",
    slideOutline: "স্লাইড আউটলাইন",
    layerCount: (count) => `${count} লেয়ার`,
    speakerNotes: "স্পিকার নোট",
    speakerNotesFor: (pageName) => `${pageName} স্পিকার নোট`,
    transition: "ট্রানজিশন",
    transitions: { none: "কিছু নয়", fade: "ফেড", slide: "স্লাইড", zoom: "জুম" },
  },
  es: {
    title: "Páginas",
    description: "Diseños y presentaciones multipágina.",
    exportSpeakerNotes: "Exportar notas",
    importSpeakerNotes: "Importar notas",
    exportTranslationPack: "Exportar paquete de traducción",
    importTranslationPack: "Importar paquete de traducción",
    bulkCreateCsv: "Crear páginas desde CSV",
    addPage: "Agregar página",
    csvReadError: "No se pudo leer este CSV.",
    notesImportError: "No se pudo importar este archivo de notas.",
    translationImportError: "No se pudo importar este paquete de traducción.",
    csvUseHeader: "Usa un CSV con fila de encabezado.",
    csvSizeLimit: "La creación CSV está limitada a 256 KB.",
    csvCreated: (count) => `Se crearon ${count} páginas desde CSV.`,
    csvCreatedTruncated: (count) =>
      `Se crearon ${count} páginas; se recortaron filas extra.`,
    speakerNotesUpdated: (count) =>
      `Notas actualizadas para ${count} diapositivas.`,
    noTranslationsApplied: (count) =>
      `No se aplicaron traducciones de ${count} entradas.`,
    translationsApplied: (applied, skipped) =>
      `Se aplicaron ${applied} traducciones; ${skipped} omitidas.`,
    selectPage: (number) => `Seleccionar página ${number}`,
    pageName: (number) => `Nombre de página ${number}`,
    movePageUp: "Subir página",
    movePageDown: "Bajar página",
    duplicatePage: "Duplicar página",
    deletePage: "Eliminar página",
    slideOutline: "Esquema de diapositivas",
    layerCount: (count) => `${count} capas`,
    speakerNotes: "Notas del presentador",
    speakerNotesFor: (pageName) => `Notas de ${pageName}`,
    transition: "Transición",
    transitions: { none: "Ninguna", fade: "Fundido", slide: "Deslizar", zoom: "Zoom" },
  },
  fr: {
    title: "Pages",
    description: "Designs et présentations multipages.",
    exportSpeakerNotes: "Exporter les notes",
    importSpeakerNotes: "Importer les notes",
    exportTranslationPack: "Exporter le pack de traduction",
    importTranslationPack: "Importer le pack de traduction",
    bulkCreateCsv: "Créer des pages depuis CSV",
    addPage: "Ajouter une page",
    csvReadError: "Impossible de lire ce fichier CSV.",
    notesImportError: "Impossible d'importer ce fichier de notes.",
    translationImportError: "Impossible d'importer ce pack de traduction.",
    csvUseHeader: "Utilisez un CSV avec une ligne d'en-tête.",
    csvSizeLimit: "La création CSV est limitée à 256 Ko.",
    csvCreated: (count) => `${count} pages créées depuis le CSV.`,
    csvCreatedTruncated: (count) =>
      `${count} pages créées; des lignes en trop ont été ignorées.`,
    speakerNotesUpdated: (count) =>
      `Notes mises à jour pour ${count} diapositives.`,
    noTranslationsApplied: (count) =>
      `Aucune traduction appliquée sur ${count} entrées.`,
    translationsApplied: (applied, skipped) =>
      `${applied} traductions appliquées; ${skipped} ignorées.`,
    selectPage: (number) => `Sélectionner la page ${number}`,
    pageName: (number) => `Nom de la page ${number}`,
    movePageUp: "Monter la page",
    movePageDown: "Descendre la page",
    duplicatePage: "Dupliquer la page",
    deletePage: "Supprimer la page",
    slideOutline: "Plan des diapositives",
    layerCount: (count) => `${count} calques`,
    speakerNotes: "Notes du présentateur",
    speakerNotesFor: (pageName) => `Notes de ${pageName}`,
    transition: "Transition",
    transitions: { none: "Aucune", fade: "Fondu", slide: "Glisser", zoom: "Zoom" },
  },
  hi: {
    title: "पेज",
    description: "मल्टीपेज डिजाइन और डेक।",
    exportSpeakerNotes: "स्पीकर नोट्स एक्सपोर्ट",
    importSpeakerNotes: "स्पीकर नोट्स इम्पोर्ट",
    exportTranslationPack: "अनुवाद पैक एक्सपोर्ट",
    importTranslationPack: "अनुवाद पैक इम्पोर्ट",
    bulkCreateCsv: "CSV से पेज बनाएं",
    addPage: "पेज जोड़ें",
    csvReadError: "यह CSV फाइल पढ़ी नहीं गई।",
    notesImportError: "यह नोट्स फाइल इम्पोर्ट नहीं हुई।",
    translationImportError: "यह अनुवाद पैक इम्पोर्ट नहीं हुआ।",
    csvUseHeader: "बड़े पैमाने पर बनाने के लिए header row वाला CSV इस्तेमाल करें।",
    csvSizeLimit: "CSV bulk create 256 KB तक सीमित है।",
    csvCreated: (count) => `CSV row से ${count} पेज बने।`,
    csvCreatedTruncated: (count) =>
      `${count} पेज बने; अतिरिक्त row काटे गए।`,
    speakerNotesUpdated: (count) => `${count} स्लाइड के नोट्स अपडेट हुए।`,
    noTranslationsApplied: (count) =>
      `${count} entries से कोई अनुवाद लागू नहीं हुआ।`,
    translationsApplied: (applied, skipped) =>
      `${applied} अनुवाद लागू हुए; ${skipped} छोड़े गए।`,
    selectPage: (number) => `पेज ${number} चुनें`,
    pageName: (number) => `पेज ${number} नाम`,
    movePageUp: "पेज ऊपर करें",
    movePageDown: "पेज नीचे करें",
    duplicatePage: "पेज कॉपी करें",
    deletePage: "पेज हटाएं",
    slideOutline: "स्लाइड आउटलाइन",
    layerCount: (count) => `${count} लेयर`,
    speakerNotes: "स्पीकर नोट्स",
    speakerNotesFor: (pageName) => `${pageName} स्पीकर नोट्स`,
    transition: "ट्रांजिशन",
    transitions: { none: "कोई नहीं", fade: "फेड", slide: "स्लाइड", zoom: "जूम" },
  },
};
