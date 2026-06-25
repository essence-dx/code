import type { DataTableColumnHeaderCopy } from "@/components/tablecn/data-table-column-header";
import type { DataTablePaginationCopy } from "@/components/tablecn/data-table-pagination";
import type { EditorLocale } from "@/features/editor/editor-localization";

export type AdminDashboardCopy = {
  title: string;
  description: string;
  tabs: {
    users: string;
    emails: string;
    projects: string;
    auth: string;
  };
  columns: {
    email: string;
    name: string;
    verified: string;
    created: string;
    recipient: string;
    purpose: string;
    status: string;
    project: string;
    size: string;
    state: string;
    updated: string;
    user: string;
    ip: string;
    expires: string;
  };
  status: {
    verified: string;
    pending: string;
    sent: string;
    failed: string;
    starred: string;
    trash: string;
    active: string;
    unknown: string;
  };
  search: {
    users: string;
    recipients: string;
    projects: string;
    userIds: string;
  };
  tableHeader: DataTableColumnHeaderCopy;
  pagination: DataTablePaginationCopy;
  noResults: string;
  dateLocale: string;
};

const defaultLocale: EditorLocale = "en";

export function getAdminDashboardCopy(
  locale: EditorLocale,
): AdminDashboardCopy {
  return adminDashboardCopy[locale] ?? adminDashboardCopy[defaultLocale];
}

function selectedRowsCopy(selected: number, total: number, rowLabel: string) {
  return `${selected} of ${total} ${rowLabel} selected.`;
}

function pageOfCopy(page: number, total: number, pageLabel: string, of: string) {
  return `${pageLabel} ${page} ${of} ${total}`;
}

const adminDashboardCopy: Record<EditorLocale, AdminDashboardCopy> = {
  en: {
    title: "Admin control room",
    description:
      "Review users, sessions, emails, and project records from one place.",
    tabs: {
      users: "Users",
      emails: "Emails",
      projects: "Projects",
      auth: "Auth",
    },
    columns: {
      email: "Email",
      name: "Name",
      verified: "Verified",
      created: "Created",
      recipient: "Recipient",
      purpose: "Purpose",
      status: "Status",
      project: "Project",
      size: "Size",
      state: "State",
      updated: "Updated",
      user: "User",
      ip: "IP",
      expires: "Expires",
    },
    status: {
      verified: "Verified",
      pending: "Pending",
      sent: "Sent",
      failed: "Failed",
      starred: "Starred",
      trash: "Trash",
      active: "Active",
      unknown: "Unknown",
    },
    search: {
      users: "Search users...",
      recipients: "Search recipients...",
      projects: "Search projects...",
      userIds: "Search user ids...",
    },
    tableHeader: {
      asc: "Asc",
      desc: "Desc",
      reset: "Reset",
      hide: "Hide",
    },
    pagination: {
      selectedRows: (selected, total) =>
        selectedRowsCopy(selected, total, "row(s)"),
      rowsPerPage: "Rows per page",
      pageOf: (page, total) => pageOfCopy(page, total, "Page", "of"),
      firstPage: "Go to first page",
      previousPage: "Go to previous page",
      nextPage: "Go to next page",
      lastPage: "Go to last page",
    },
    noResults: "No results.",
    dateLocale: "en-US",
  },
  bn: {
    title: "অ্যাডমিন কন্ট্রোল রুম",
    description:
      "এক জায়গা থেকে ব্যবহারকারী, সেশন, ইমেইল, এবং প্রজেক্ট রেকর্ড দেখুন।",
    tabs: {
      users: "ব্যবহারকারী",
      emails: "ইমেইল",
      projects: "প্রজেক্ট",
      auth: "অথ",
    },
    columns: {
      email: "ইমেইল",
      name: "নাম",
      verified: "ভেরিফায়েড",
      created: "তৈরি",
      recipient: "প্রাপক",
      purpose: "উদ্দেশ্য",
      status: "স্ট্যাটাস",
      project: "প্রজেক্ট",
      size: "সাইজ",
      state: "অবস্থা",
      updated: "আপডেট",
      user: "ব্যবহারকারী",
      ip: "IP",
      expires: "মেয়াদ",
    },
    status: {
      verified: "ভেরিফায়েড",
      pending: "অপেক্ষমাণ",
      sent: "পাঠানো",
      failed: "ব্যর্থ",
      starred: "স্টারড",
      trash: "ট্র্যাশ",
      active: "সক্রিয়",
      unknown: "অজানা",
    },
    search: {
      users: "ব্যবহারকারী খুঁজুন...",
      recipients: "প্রাপক খুঁজুন...",
      projects: "প্রজেক্ট খুঁজুন...",
      userIds: "ব্যবহারকারী আইডি খুঁজুন...",
    },
    tableHeader: {
      asc: "ঊর্ধ্বক্রম",
      desc: "নিম্নক্রম",
      reset: "রিসেট",
      hide: "লুকান",
    },
    pagination: {
      selectedRows: (selected, total) =>
        `${selected} / ${total} সারি নির্বাচিত।`,
      rowsPerPage: "প্রতি পৃষ্ঠায় সারি",
      pageOf: (page, total) => `পৃষ্ঠা ${page} / ${total}`,
      firstPage: "প্রথম পৃষ্ঠায় যান",
      previousPage: "আগের পৃষ্ঠায় যান",
      nextPage: "পরের পৃষ্ঠায় যান",
      lastPage: "শেষ পৃষ্ঠায় যান",
    },
    noResults: "কোনো ফলাফল নেই।",
    dateLocale: "bn-BD",
  },
  es: {
    title: "Sala de control admin",
    description:
      "Revisa usuarios, sesiones, emails y proyectos desde un solo lugar.",
    tabs: {
      users: "Usuarios",
      emails: "Emails",
      projects: "Proyectos",
      auth: "Auth",
    },
    columns: {
      email: "Email",
      name: "Nombre",
      verified: "Verificado",
      created: "Creado",
      recipient: "Destinatario",
      purpose: "Propósito",
      status: "Estado",
      project: "Proyecto",
      size: "Tamaño",
      state: "Estado",
      updated: "Actualizado",
      user: "Usuario",
      ip: "IP",
      expires: "Expira",
    },
    status: {
      verified: "Verificado",
      pending: "Pendiente",
      sent: "Enviado",
      failed: "Fallido",
      starred: "Favorito",
      trash: "Papelera",
      active: "Activo",
      unknown: "Desconocido",
    },
    search: {
      users: "Buscar usuarios...",
      recipients: "Buscar destinatarios...",
      projects: "Buscar proyectos...",
      userIds: "Buscar IDs de usuario...",
    },
    tableHeader: {
      asc: "Asc",
      desc: "Desc",
      reset: "Restablecer",
      hide: "Ocultar",
    },
    pagination: {
      selectedRows: (selected, total) =>
        selectedRowsCopy(selected, total, "fila(s)"),
      rowsPerPage: "Filas por página",
      pageOf: (page, total) => pageOfCopy(page, total, "Página", "de"),
      firstPage: "Ir a la primera página",
      previousPage: "Ir a la página anterior",
      nextPage: "Ir a la página siguiente",
      lastPage: "Ir a la última página",
    },
    noResults: "Sin resultados.",
    dateLocale: "es-ES",
  },
  fr: {
    title: "Salle de contrôle admin",
    description:
      "Consultez les utilisateurs, sessions, emails et projets au même endroit.",
    tabs: {
      users: "Utilisateurs",
      emails: "Emails",
      projects: "Projets",
      auth: "Auth",
    },
    columns: {
      email: "Email",
      name: "Nom",
      verified: "Vérifié",
      created: "Créé",
      recipient: "Destinataire",
      purpose: "Objectif",
      status: "Statut",
      project: "Projet",
      size: "Taille",
      state: "État",
      updated: "Mis à jour",
      user: "Utilisateur",
      ip: "IP",
      expires: "Expire",
    },
    status: {
      verified: "Vérifié",
      pending: "En attente",
      sent: "Envoyé",
      failed: "Échec",
      starred: "Favori",
      trash: "Corbeille",
      active: "Actif",
      unknown: "Inconnu",
    },
    search: {
      users: "Rechercher des utilisateurs...",
      recipients: "Rechercher des destinataires...",
      projects: "Rechercher des projets...",
      userIds: "Rechercher des IDs utilisateur...",
    },
    tableHeader: {
      asc: "Asc",
      desc: "Desc",
      reset: "Réinitialiser",
      hide: "Masquer",
    },
    pagination: {
      selectedRows: (selected, total) =>
        selectedRowsCopy(selected, total, "ligne(s)"),
      rowsPerPage: "Lignes par page",
      pageOf: (page, total) => pageOfCopy(page, total, "Page", "sur"),
      firstPage: "Aller à la première page",
      previousPage: "Aller à la page précédente",
      nextPage: "Aller à la page suivante",
      lastPage: "Aller à la dernière page",
    },
    noResults: "Aucun résultat.",
    dateLocale: "fr-FR",
  },
  hi: {
    title: "एडमिन कंट्रोल रूम",
    description:
      "एक जगह से यूजर, सेशन, ईमेल और प्रोजेक्ट रिकॉर्ड देखें।",
    tabs: {
      users: "यूजर",
      emails: "ईमेल",
      projects: "प्रोजेक्ट",
      auth: "ऑथ",
    },
    columns: {
      email: "ईमेल",
      name: "नाम",
      verified: "वेरिफाइड",
      created: "बनाया गया",
      recipient: "प्राप्तकर्ता",
      purpose: "उद्देश्य",
      status: "स्टेटस",
      project: "प्रोजेक्ट",
      size: "साइज",
      state: "स्थिति",
      updated: "अपडेट",
      user: "यूजर",
      ip: "IP",
      expires: "समाप्ति",
    },
    status: {
      verified: "वेरिफाइड",
      pending: "लंबित",
      sent: "भेजा गया",
      failed: "विफल",
      starred: "स्टार",
      trash: "ट्रैश",
      active: "सक्रिय",
      unknown: "अज्ञात",
    },
    search: {
      users: "यूजर खोजें...",
      recipients: "प्राप्तकर्ता खोजें...",
      projects: "प्रोजेक्ट खोजें...",
      userIds: "यूजर आईडी खोजें...",
    },
    tableHeader: {
      asc: "आरोही",
      desc: "अवरोही",
      reset: "रीसेट",
      hide: "छिपाएं",
    },
    pagination: {
      selectedRows: (selected, total) =>
        `${selected} / ${total} पंक्ति चुनी गई।`,
      rowsPerPage: "प्रति पृष्ठ पंक्तियां",
      pageOf: (page, total) => `पृष्ठ ${page} / ${total}`,
      firstPage: "पहले पृष्ठ पर जाएं",
      previousPage: "पिछले पृष्ठ पर जाएं",
      nextPage: "अगले पृष्ठ पर जाएं",
      lastPage: "अंतिम पृष्ठ पर जाएं",
    },
    noResults: "कोई परिणाम नहीं।",
    dateLocale: "hi-IN",
  },
};
