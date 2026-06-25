import type { EditorLocale } from "@/features/editor/editor-localization";

export type ProjectLibraryCopy = {
  trash: string;
  active: string;
  recentProjects: string;
  trashDescription: string;
  projectsDescription: string;
  newFolder: string;
  newFolderName: string;
  createFolder: string;
  searchProjects: string;
  allTypes: string;
  customSize: string;
  allFolders: string;
  unfiled: string;
  showStarredProjects: string;
  showActiveProjects: string;
  showTrash: string;
  anyTime: string;
  today: string;
  thisWeek: string;
  thisMonth: string;
  newestFirst: string;
  oldestFirst: string;
  nameAscending: string;
  nameDescending: string;
  gridView: string;
  listView: string;
  projectCount: (count: number, isTrash: boolean) => string;
  noMatchingProjects: string;
  trashEmpty: string;
  tryDifferentSearch: string;
  resizeCopy: string;
  resizeCopyDescription: string;
  targetSize: string;
  current: string;
  variant: string;
  cancel: string;
  createVariant: string;
  thumbnailAlt: (name: string) => string;
  restore: string;
  starProject: string;
  unstarProject: string;
  open: string;
  projectActions: string;
  rename: string;
  moveToFolder: string;
  folders: string;
  deletePermanently: string;
  moveToTrash: string;
  trashedAt: (date: string) => string;
  updatedAt: (date: string) => string;
  variantLabel: (name: string) => string;
  renameDesign: string;
  renameDesignDescription: string;
  name: string;
  saveName: string;
  deleteDesign: string;
  deletePermanentDescription: string;
  moveToTrashDescription: string;
  resizeGroups: {
    social: string;
    presentation: string;
    print: string;
    website: string;
    email: string;
  };
};

const defaultLocale: EditorLocale = "en";

export function getProjectLibraryCopy(locale: EditorLocale): ProjectLibraryCopy {
  return projectLibraryCopy[locale] ?? projectLibraryCopy[defaultLocale];
}

const projectLibraryCopy: Record<EditorLocale, ProjectLibraryCopy> = {
  en: {
    trash: "Trash",
    active: "Active",
    recentProjects: "Recent projects",
    trashDescription: "Restore designs or delete them permanently.",
    projectsDescription:
      "Search, sort, organize, rename, delete, and reopen your saved designs.",
    newFolder: "New folder",
    newFolderName: "New folder name",
    createFolder: "Create folder",
    searchProjects: "Search projects",
    allTypes: "All types",
    customSize: "Custom size",
    allFolders: "All folders",
    unfiled: "Unfiled",
    showStarredProjects: "Show starred projects",
    showActiveProjects: "Show active projects",
    showTrash: "Show trash",
    anyTime: "Any time",
    today: "Today",
    thisWeek: "This week",
    thisMonth: "This month",
    newestFirst: "Newest first",
    oldestFirst: "Oldest first",
    nameAscending: "Name A-Z",
    nameDescending: "Name Z-A",
    gridView: "Grid view",
    listView: "List view",
    projectCount: (count, isTrash) =>
      `${count} ${isTrash ? "trashed" : "designs"}`,
    noMatchingProjects: "No matching projects",
    trashEmpty: "The trash is empty for this filter.",
    tryDifferentSearch: "Try a different search or create a new design.",
    resizeCopy: "Resize copy",
    resizeCopyDescription:
      "Create a separate editable design variant from this project.",
    targetSize: "Target size",
    current: "Current",
    variant: "Variant",
    cancel: "Cancel",
    createVariant: "Create variant",
    thumbnailAlt: (name) => `${name} thumbnail`,
    restore: "Restore",
    starProject: "Star project",
    unstarProject: "Unstar project",
    open: "Open",
    projectActions: "Project actions",
    rename: "Rename",
    moveToFolder: "Move to folder",
    folders: "Folders",
    deletePermanently: "Delete permanently",
    moveToTrash: "Move to trash",
    trashedAt: (date) => `Trashed ${date}`,
    updatedAt: (date) => `Updated ${date}`,
    variantLabel: (name) => `Variant: ${name}`,
    renameDesign: "Rename design",
    renameDesignDescription:
      "Give this project a clearer name for search and sorting.",
    name: "Name",
    saveName: "Save name",
    deleteDesign: "Delete design",
    deletePermanentDescription:
      "This permanently deletes the project and cannot be undone.",
    moveToTrashDescription:
      "This moves the project to trash so you can restore it later.",
    resizeGroups: {
      social: "Social",
      presentation: "Presentation",
      print: "Print",
      website: "Website",
      email: "Email",
    },
  },
  bn: {
    trash: "ট্র্যাশ",
    active: "সক্রিয়",
    recentProjects: "সাম্প্রতিক প্রজেক্ট",
    trashDescription: "ডিজাইন পুনরুদ্ধার করুন বা স্থায়ীভাবে মুছে ফেলুন।",
    projectsDescription:
      "সংরক্ষিত ডিজাইন খুঁজুন, সাজান, সংগঠিত করুন, নাম বদলান, মুছুন, এবং খুলুন।",
    newFolder: "নতুন ফোল্ডার",
    newFolderName: "নতুন ফোল্ডারের নাম",
    createFolder: "ফোল্ডার তৈরি করুন",
    searchProjects: "প্রজেক্ট খুঁজুন",
    allTypes: "সব ধরন",
    customSize: "নিজস্ব মাপ",
    allFolders: "সব ফোল্ডার",
    unfiled: "ফোল্ডার ছাড়া",
    showStarredProjects: "তারকাচিহ্নিত প্রজেক্ট দেখান",
    showActiveProjects: "সক্রিয় প্রজেক্ট দেখান",
    showTrash: "ট্র্যাশ দেখান",
    anyTime: "যে কোনো সময়",
    today: "আজ",
    thisWeek: "এই সপ্তাহ",
    thisMonth: "এই মাস",
    newestFirst: "নতুন আগে",
    oldestFirst: "পুরোনো আগে",
    nameAscending: "নাম A-Z",
    nameDescending: "নাম Z-A",
    gridView: "গ্রিড ভিউ",
    listView: "লিস্ট ভিউ",
    projectCount: (count, isTrash) =>
      `${count} ${isTrash ? "ট্র্যাশে" : "ডিজাইন"}`,
    noMatchingProjects: "মেলানো প্রজেক্ট নেই",
    trashEmpty: "এই ফিল্টারে ট্র্যাশ খালি।",
    tryDifferentSearch: "অন্যভাবে খুঁজুন বা নতুন ডিজাইন তৈরি করুন।",
    resizeCopy: "কপি রিসাইজ করুন",
    resizeCopyDescription:
      "এই প্রজেক্ট থেকে আলাদা সম্পাদনাযোগ্য ডিজাইন ভ্যারিয়েন্ট তৈরি করুন।",
    targetSize: "টার্গেট মাপ",
    current: "বর্তমান",
    variant: "ভ্যারিয়েন্ট",
    cancel: "বাতিল",
    createVariant: "ভ্যারিয়েন্ট তৈরি করুন",
    thumbnailAlt: (name) => `${name} থাম্বনেইল`,
    restore: "রিস্টোর",
    starProject: "প্রজেক্টে তারকা দিন",
    unstarProject: "প্রজেক্টের তারকা সরান",
    open: "খুলুন",
    projectActions: "প্রজেক্ট অ্যাকশন",
    rename: "নাম বদলান",
    moveToFolder: "ফোল্ডারে সরান",
    folders: "ফোল্ডার",
    deletePermanently: "স্থায়ীভাবে মুছুন",
    moveToTrash: "ট্র্যাশে সরান",
    trashedAt: (date) => `ট্র্যাশে ${date}`,
    updatedAt: (date) => `আপডেট ${date}`,
    variantLabel: (name) => `ভ্যারিয়েন্ট: ${name}`,
    renameDesign: "ডিজাইনের নাম বদলান",
    renameDesignDescription: "খোঁজা ও সাজানোর জন্য পরিষ্কার নাম দিন।",
    name: "নাম",
    saveName: "নাম সংরক্ষণ",
    deleteDesign: "ডিজাইন মুছুন",
    deletePermanentDescription:
      "এটি প্রজেক্ট স্থায়ীভাবে মুছে দেবে এবং ফেরানো যাবে না।",
    moveToTrashDescription:
      "এটি প্রজেক্টকে ট্র্যাশে সরাবে যাতে পরে রিস্টোর করা যায়।",
    resizeGroups: {
      social: "সোশ্যাল",
      presentation: "প্রেজেন্টেশন",
      print: "প্রিন্ট",
      website: "ওয়েবসাইট",
      email: "ইমেইল",
    },
  },
  es: {
    trash: "Papelera",
    active: "Activos",
    recentProjects: "Proyectos recientes",
    trashDescription: "Restaura diseños o elimínalos permanentemente.",
    projectsDescription:
      "Busca, ordena, organiza, renombra, elimina y reabre diseños guardados.",
    newFolder: "Nueva carpeta",
    newFolderName: "Nombre de carpeta nueva",
    createFolder: "Crear carpeta",
    searchProjects: "Buscar proyectos",
    allTypes: "Todos los tipos",
    customSize: "Tamaño personalizado",
    allFolders: "Todas las carpetas",
    unfiled: "Sin carpeta",
    showStarredProjects: "Mostrar proyectos destacados",
    showActiveProjects: "Mostrar proyectos activos",
    showTrash: "Mostrar papelera",
    anyTime: "Cualquier fecha",
    today: "Hoy",
    thisWeek: "Esta semana",
    thisMonth: "Este mes",
    newestFirst: "Más recientes",
    oldestFirst: "Más antiguos",
    nameAscending: "Nombre A-Z",
    nameDescending: "Nombre Z-A",
    gridView: "Vista de cuadrícula",
    listView: "Vista de lista",
    projectCount: (count, isTrash) =>
      `${count} ${isTrash ? "en papelera" : "diseños"}`,
    noMatchingProjects: "No hay proyectos coincidentes",
    trashEmpty: "La papelera está vacía para este filtro.",
    tryDifferentSearch: "Prueba otra búsqueda o crea un diseño nuevo.",
    resizeCopy: "Redimensionar copia",
    resizeCopyDescription:
      "Crea una variante editable separada a partir de este proyecto.",
    targetSize: "Tamaño destino",
    current: "Actual",
    variant: "Variante",
    cancel: "Cancelar",
    createVariant: "Crear variante",
    thumbnailAlt: (name) => `Miniatura de ${name}`,
    restore: "Restaurar",
    starProject: "Destacar proyecto",
    unstarProject: "Quitar destacado",
    open: "Abrir",
    projectActions: "Acciones del proyecto",
    rename: "Renombrar",
    moveToFolder: "Mover a carpeta",
    folders: "Carpetas",
    deletePermanently: "Eliminar permanentemente",
    moveToTrash: "Mover a papelera",
    trashedAt: (date) => `En papelera ${date}`,
    updatedAt: (date) => `Actualizado ${date}`,
    variantLabel: (name) => `Variante: ${name}`,
    renameDesign: "Renombrar diseño",
    renameDesignDescription:
      "Dale un nombre más claro para búsqueda y ordenación.",
    name: "Nombre",
    saveName: "Guardar nombre",
    deleteDesign: "Eliminar diseño",
    deletePermanentDescription:
      "Esto elimina el proyecto permanentemente y no se puede deshacer.",
    moveToTrashDescription:
      "Esto mueve el proyecto a la papelera para restaurarlo después.",
    resizeGroups: {
      social: "Social",
      presentation: "Presentación",
      print: "Impresión",
      website: "Sitio web",
      email: "Email",
    },
  },
  fr: {
    trash: "Corbeille",
    active: "Actifs",
    recentProjects: "Projets récents",
    trashDescription: "Restaurez des designs ou supprimez-les définitivement.",
    projectsDescription:
      "Recherchez, triez, organisez, renommez, supprimez et rouvrez vos designs.",
    newFolder: "Nouveau dossier",
    newFolderName: "Nom du nouveau dossier",
    createFolder: "Créer un dossier",
    searchProjects: "Rechercher des projets",
    allTypes: "Tous les types",
    customSize: "Format personnalisé",
    allFolders: "Tous les dossiers",
    unfiled: "Sans dossier",
    showStarredProjects: "Afficher les projets favoris",
    showActiveProjects: "Afficher les projets actifs",
    showTrash: "Afficher la corbeille",
    anyTime: "Toute période",
    today: "Aujourd'hui",
    thisWeek: "Cette semaine",
    thisMonth: "Ce mois-ci",
    newestFirst: "Plus récents",
    oldestFirst: "Plus anciens",
    nameAscending: "Nom A-Z",
    nameDescending: "Nom Z-A",
    gridView: "Vue grille",
    listView: "Vue liste",
    projectCount: (count, isTrash) =>
      `${count} ${isTrash ? "dans la corbeille" : "designs"}`,
    noMatchingProjects: "Aucun projet correspondant",
    trashEmpty: "La corbeille est vide pour ce filtre.",
    tryDifferentSearch: "Essayez une autre recherche ou créez un design.",
    resizeCopy: "Redimensionner la copie",
    resizeCopyDescription:
      "Créez une variante éditable séparée à partir de ce projet.",
    targetSize: "Format cible",
    current: "Actuel",
    variant: "Variante",
    cancel: "Annuler",
    createVariant: "Créer une variante",
    thumbnailAlt: (name) => `Miniature de ${name}`,
    restore: "Restaurer",
    starProject: "Ajouter aux favoris",
    unstarProject: "Retirer des favoris",
    open: "Ouvrir",
    projectActions: "Actions du projet",
    rename: "Renommer",
    moveToFolder: "Déplacer vers un dossier",
    folders: "Dossiers",
    deletePermanently: "Supprimer définitivement",
    moveToTrash: "Déplacer vers la corbeille",
    trashedAt: (date) => `Dans la corbeille ${date}`,
    updatedAt: (date) => `Mis à jour ${date}`,
    variantLabel: (name) => `Variante : ${name}`,
    renameDesign: "Renommer le design",
    renameDesignDescription:
      "Donnez à ce projet un nom plus clair pour la recherche et le tri.",
    name: "Nom",
    saveName: "Enregistrer le nom",
    deleteDesign: "Supprimer le design",
    deletePermanentDescription:
      "Cela supprime définitivement le projet et ne peut pas être annulé.",
    moveToTrashDescription:
      "Cela déplace le projet vers la corbeille pour le restaurer plus tard.",
    resizeGroups: {
      social: "Social",
      presentation: "Présentation",
      print: "Impression",
      website: "Site web",
      email: "Email",
    },
  },
  hi: {
    trash: "ट्रैश",
    active: "सक्रिय",
    recentProjects: "हाल के प्रोजेक्ट",
    trashDescription: "डिजाइन वापस लाएं या स्थायी रूप से हटाएं।",
    projectsDescription:
      "सेव डिजाइन खोजें, क्रमबद्ध करें, व्यवस्थित करें, नाम बदलें, हटाएं और खोलें।",
    newFolder: "नया फोल्डर",
    newFolderName: "नए फोल्डर का नाम",
    createFolder: "फोल्डर बनाएं",
    searchProjects: "प्रोजेक्ट खोजें",
    allTypes: "सभी प्रकार",
    customSize: "कस्टम आकार",
    allFolders: "सभी फोल्डर",
    unfiled: "बिना फोल्डर",
    showStarredProjects: "स्टार किए गए प्रोजेक्ट दिखाएं",
    showActiveProjects: "सक्रिय प्रोजेक्ट दिखाएं",
    showTrash: "ट्रैश दिखाएं",
    anyTime: "कभी भी",
    today: "आज",
    thisWeek: "इस सप्ताह",
    thisMonth: "इस महीने",
    newestFirst: "नए पहले",
    oldestFirst: "पुराने पहले",
    nameAscending: "नाम A-Z",
    nameDescending: "नाम Z-A",
    gridView: "ग्रिड व्यू",
    listView: "लिस्ट व्यू",
    projectCount: (count, isTrash) =>
      `${count} ${isTrash ? "ट्रैश में" : "डिजाइन"}`,
    noMatchingProjects: "मिलते-जुलते प्रोजेक्ट नहीं",
    trashEmpty: "इस फिल्टर के लिए ट्रैश खाली है।",
    tryDifferentSearch: "दूसरी खोज करें या नया डिजाइन बनाएं।",
    resizeCopy: "कॉपी का आकार बदलें",
    resizeCopyDescription:
      "इस प्रोजेक्ट से अलग संपादन योग्य डिजाइन वैरिएंट बनाएं।",
    targetSize: "लक्ष्य आकार",
    current: "वर्तमान",
    variant: "वैरिएंट",
    cancel: "रद्द करें",
    createVariant: "वैरिएंट बनाएं",
    thumbnailAlt: (name) => `${name} थंबनेल`,
    restore: "रिस्टोर",
    starProject: "प्रोजेक्ट स्टार करें",
    unstarProject: "प्रोजेक्ट से स्टार हटाएं",
    open: "खोलें",
    projectActions: "प्रोजेक्ट कार्रवाइयां",
    rename: "नाम बदलें",
    moveToFolder: "फोल्डर में ले जाएं",
    folders: "फोल्डर",
    deletePermanently: "स्थायी रूप से हटाएं",
    moveToTrash: "ट्रैश में ले जाएं",
    trashedAt: (date) => `ट्रैश में ${date}`,
    updatedAt: (date) => `अपडेट ${date}`,
    variantLabel: (name) => `वैरिएंट: ${name}`,
    renameDesign: "डिजाइन का नाम बदलें",
    renameDesignDescription: "खोज और क्रमबद्धता के लिए साफ नाम दें।",
    name: "नाम",
    saveName: "नाम सेव करें",
    deleteDesign: "डिजाइन हटाएं",
    deletePermanentDescription:
      "यह प्रोजेक्ट स्थायी रूप से हटाएगा और वापस नहीं किया जा सकता।",
    moveToTrashDescription:
      "यह प्रोजेक्ट को ट्रैश में ले जाएगा ताकि आप बाद में रिस्टोर कर सकें।",
    resizeGroups: {
      social: "सोशल",
      presentation: "प्रेजेंटेशन",
      print: "प्रिंट",
      website: "वेबसाइट",
      email: "ईमेल",
    },
  },
};
