export const editorLocales = [
  { id: "en", label: "English", shortLabel: "EN" },
  { id: "bn", label: "বাংলা", shortLabel: "BN" },
  { id: "es", label: "Español", shortLabel: "ES" },
  { id: "fr", label: "Français", shortLabel: "FR" },
  { id: "hi", label: "हिन्दी", shortLabel: "HI" },
] as const;

export type EditorLocale = (typeof editorLocales)[number]["id"];

const defaultEditorLocale: EditorLocale = "en";

type EditorSaveState = "dirty" | "saving" | "saved" | "error";
type EditorAutosaveState = "idle" | "saving" | "saved" | "error";
type EditorTemplateSaveState = EditorSaveState | "idle";
type EditorShareState = "idle" | "saving" | "copied" | "error";

type EditorToolbarCopy = {
  projects: string;
  projectName: string;
  commands: string;
  comments: string;
  present: string;
  language: string;
  share: Record<EditorShareState, string>;
  saveState: Record<EditorSaveState, string>;
  autosaveState: Record<EditorAutosaveState, string>;
  templateState: Record<EditorTemplateSaveState, string>;
  versionHistory: string;
  undo: string;
  redo: string;
  zoomOut: string;
  zoomIn: string;
  showGrid: string;
  hideGrid: string;
  showGuides: string;
  hideGuides: string;
  showPrintMarks: string;
  hidePrintMarks: string;
  exportScale: string;
  exportQuality: string;
  export: string;
  save: string;
  template: string;
};

export function getEditorLocale(locale: string | undefined | null): EditorLocale {
  return editorLocales.some((item) => item.id === locale)
    ? (locale as EditorLocale)
    : defaultEditorLocale;
}

export function getEditorToolbarCopy(locale: EditorLocale): EditorToolbarCopy {
  return toolbarCopy[locale] ?? toolbarCopy[defaultEditorLocale];
}

const toolbarCopy: Record<EditorLocale, EditorToolbarCopy> = {
  en: {
    projects: "Projects",
    projectName: "Project name",
    commands: "Commands",
    comments: "Comments",
    present: "Present",
    language: "Editor language",
    share: {
      idle: "Share",
      saving: "Sharing...",
      copied: "Copied",
      error: "Share error",
    },
    saveState: {
      dirty: "Unsaved",
      saving: "Saving",
      saved: "Saved",
      error: "Save error",
    },
    autosaveState: {
      idle: "Draft",
      saving: "Saving draft",
      saved: "Draft saved",
      error: "Draft error",
    },
    templateState: {
      idle: "Template",
      dirty: "Template",
      saving: "Saving...",
      saved: "Saved",
      error: "Error",
    },
    versionHistory: "Open version history",
    undo: "Undo",
    redo: "Redo",
    zoomOut: "Zoom out",
    zoomIn: "Zoom in",
    showGrid: "Show grid",
    hideGrid: "Hide grid",
    showGuides: "Show guides",
    hideGuides: "Hide guides",
    showPrintMarks: "Show print marks",
    hidePrintMarks: "Hide print marks",
    exportScale: "Export scale",
    exportQuality: "JPG and WebP quality",
    export: "Export",
    save: "Save",
    template: "Template",
  },
  bn: {
    projects: "প্রজেক্ট",
    projectName: "প্রজেক্টের নাম",
    commands: "কমান্ড",
    comments: "মন্তব্য",
    present: "প্রেজেন্ট",
    language: "এডিটর ভাষা",
    share: {
      idle: "শেয়ার",
      saving: "শেয়ার হচ্ছে...",
      copied: "কপি হয়েছে",
      error: "শেয়ার সমস্যা",
    },
    saveState: {
      dirty: "সেভ হয়নি",
      saving: "সেভ হচ্ছে",
      saved: "সেভ হয়েছে",
      error: "সেভ সমস্যা",
    },
    autosaveState: {
      idle: "Draft",
      saving: "Saving draft",
      saved: "Draft saved",
      error: "Draft error",
    },
    templateState: {
      idle: "টেমপ্লেট",
      dirty: "টেমপ্লেট",
      saving: "সেভ হচ্ছে...",
      saved: "সেভ হয়েছে",
      error: "সমস্যা",
    },
    versionHistory: "ভার্সন ইতিহাস খুলুন",
    undo: "পেছনে যান",
    redo: "আবার করুন",
    zoomOut: "জুম কমান",
    zoomIn: "জুম বাড়ান",
    showGrid: "গ্রিড দেখান",
    hideGrid: "গ্রিড লুকান",
    showGuides: "গাইড দেখান",
    hideGuides: "গাইড লুকান",
    showPrintMarks: "প্রিন্ট মার্ক দেখান",
    hidePrintMarks: "প্রিন্ট মার্ক লুকান",
    exportScale: "এক্সপোর্ট স্কেল",
    exportQuality: "JPG এবং WebP মান",
    export: "এক্সপোর্ট",
    save: "সেভ",
    template: "টেমপ্লেট",
  },
  es: {
    projects: "Proyectos",
    projectName: "Nombre del proyecto",
    commands: "Comandos",
    comments: "Comentarios",
    present: "Presentar",
    language: "Idioma del editor",
    share: {
      idle: "Compartir",
      saving: "Compartiendo...",
      copied: "Copiado",
      error: "Error al compartir",
    },
    saveState: {
      dirty: "Sin guardar",
      saving: "Guardando",
      saved: "Guardado",
      error: "Error al guardar",
    },
    autosaveState: {
      idle: "Borrador local",
      saving: "Guardando borrador",
      saved: "Borrador guardado",
      error: "Error de borrador",
    },
    templateState: {
      idle: "Plantilla",
      dirty: "Plantilla",
      saving: "Guardando...",
      saved: "Guardado",
      error: "Error",
    },
    versionHistory: "Abrir historial de versiones",
    undo: "Deshacer",
    redo: "Rehacer",
    zoomOut: "Alejar",
    zoomIn: "Acercar",
    showGrid: "Mostrar cuadrícula",
    hideGrid: "Ocultar cuadrícula",
    showGuides: "Mostrar guías",
    hideGuides: "Ocultar guías",
    showPrintMarks: "Mostrar marcas de impresión",
    hidePrintMarks: "Ocultar marcas de impresión",
    exportScale: "Escala de exportación",
    exportQuality: "Calidad JPG y WebP",
    export: "Exportar",
    save: "Guardar",
    template: "Plantilla",
  },
  fr: {
    projects: "Projets",
    projectName: "Nom du projet",
    commands: "Commandes",
    comments: "Commentaires",
    present: "Présenter",
    language: "Langue de l'éditeur",
    share: {
      idle: "Partager",
      saving: "Partage...",
      copied: "Copié",
      error: "Erreur de partage",
    },
    saveState: {
      dirty: "Non enregistré",
      saving: "Enregistrement",
      saved: "Enregistré",
      error: "Erreur d'enregistrement",
    },
    autosaveState: {
      idle: "Brouillon local",
      saving: "Brouillon en cours",
      saved: "Brouillon enregistre",
      error: "Erreur brouillon",
    },
    templateState: {
      idle: "Modèle",
      dirty: "Modèle",
      saving: "Enregistrement...",
      saved: "Enregistré",
      error: "Erreur",
    },
    versionHistory: "Ouvrir l'historique",
    undo: "Annuler",
    redo: "Rétablir",
    zoomOut: "Zoom arrière",
    zoomIn: "Zoom avant",
    showGrid: "Afficher la grille",
    hideGrid: "Masquer la grille",
    showGuides: "Afficher les repères",
    hideGuides: "Masquer les repères",
    showPrintMarks: "Afficher les repères d'impression",
    hidePrintMarks: "Masquer les repères d'impression",
    exportScale: "Échelle d'export",
    exportQuality: "Qualité JPG et WebP",
    export: "Exporter",
    save: "Enregistrer",
    template: "Modèle",
  },
  hi: {
    projects: "प्रोजेक्ट",
    projectName: "प्रोजेक्ट नाम",
    commands: "कमांड",
    comments: "टिप्पणियां",
    present: "प्रस्तुत करें",
    language: "एडिटर भाषा",
    share: {
      idle: "शेयर",
      saving: "शेयर हो रहा है...",
      copied: "कॉपी हुआ",
      error: "शेयर समस्या",
    },
    saveState: {
      dirty: "सेव नहीं हुआ",
      saving: "सेव हो रहा है",
      saved: "सेव हुआ",
      error: "सेव समस्या",
    },
    autosaveState: {
      idle: "Draft",
      saving: "Saving draft",
      saved: "Draft saved",
      error: "Draft error",
    },
    templateState: {
      idle: "टेम्पलेट",
      dirty: "टेम्पलेट",
      saving: "सेव हो रहा है...",
      saved: "सेव हुआ",
      error: "समस्या",
    },
    versionHistory: "वर्जन इतिहास खोलें",
    undo: "पहले जैसा",
    redo: "फिर से करें",
    zoomOut: "जूम घटाएं",
    zoomIn: "जूम बढ़ाएं",
    showGrid: "ग्रिड दिखाएं",
    hideGrid: "ग्रिड छिपाएं",
    showGuides: "गाइड दिखाएं",
    hideGuides: "गाइड छिपाएं",
    showPrintMarks: "प्रिंट मार्क दिखाएं",
    hidePrintMarks: "प्रिंट मार्क छिपाएं",
    exportScale: "एक्सपोर्ट स्केल",
    exportQuality: "JPG और WebP गुणवत्ता",
    export: "एक्सपोर्ट",
    save: "सेव",
    template: "टेम्पलेट",
  },
};
