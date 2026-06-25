import type { TeamWorkspaceRole } from "@/db/team-workspaces";
import type { EditorLocale } from "@/features/editor/editor-localization";

export type TeamWorkspaceCopy = {
  title: string;
  description: string;
  workspaceName: string;
  workspacePlaceholder: string;
  createWorkspace: string;
  invitesForYou: string;
  roleAccess: (role: TeamWorkspaceRole) => string;
  accept: string;
  pendingInvites: (count: number) => string;
  inviteByEmail: string;
  teammateEmailPlaceholder: string;
  inviteRole: string;
  inviteTeammate: (workspaceName: string) => string;
  empty: string;
  roleLabels: Record<TeamWorkspaceRole, string>;
};

const defaultLocale: EditorLocale = "en";

export function getTeamWorkspaceCopy(locale: EditorLocale): TeamWorkspaceCopy {
  return teamWorkspaceCopy[locale] ?? teamWorkspaceCopy[defaultLocale];
}

const teamWorkspaceCopy: Record<EditorLocale, TeamWorkspaceCopy> = {
  en: {
    title: "Team workspaces",
    description:
      "Create shared spaces, invite teammates, and keep reusable team assets organized.",
    workspaceName: "Workspace name",
    workspacePlaceholder: "Design team",
    createWorkspace: "Create workspace",
    invitesForYou: "Invites for you",
    roleAccess: (role) => `${teamWorkspaceCopy.en.roleLabels[role]} access`,
    accept: "Accept",
    pendingInvites: (count) =>
      `${count} pending ${count === 1 ? "invite" : "invites"}`,
    inviteByEmail: "Invite by email",
    teammateEmailPlaceholder: "teammate@example.com",
    inviteRole: "Invite role",
    inviteTeammate: (workspaceName) => `Invite teammate to ${workspaceName}`,
    empty: "No team workspace yet.",
    roleLabels: {
      owner: "Owner",
      admin: "Admin",
      member: "Member",
    },
  },
  bn: {
    title: "টিম ওয়ার্কস্পেস",
    description:
      "শেয়ার করা স্পেস তৈরি করুন, টিমমেট আমন্ত্রণ করুন, এবং টিম অ্যাসেট সংগঠিত রাখুন।",
    workspaceName: "ওয়ার্কস্পেসের নাম",
    workspacePlaceholder: "ডিজাইন টিম",
    createWorkspace: "ওয়ার্কস্পেস তৈরি করুন",
    invitesForYou: "আপনার আমন্ত্রণ",
    roleAccess: (role) => `${teamWorkspaceCopy.bn.roleLabels[role]} অ্যাক্সেস`,
    accept: "গ্রহণ করুন",
    pendingInvites: (count) => `${count}টি অপেক্ষমান আমন্ত্রণ`,
    inviteByEmail: "ইমেইলে আমন্ত্রণ",
    teammateEmailPlaceholder: "teammate@example.com",
    inviteRole: "আমন্ত্রণের ভূমিকা",
    inviteTeammate: (workspaceName) =>
      `${workspaceName}-এ টিমমেট আমন্ত্রণ করুন`,
    empty: "এখনও কোনো টিম ওয়ার্কস্পেস নেই।",
    roleLabels: {
      owner: "মালিক",
      admin: "অ্যাডমিন",
      member: "মেম্বার",
    },
  },
  es: {
    title: "Espacios de equipo",
    description:
      "Crea espacios compartidos, invita al equipo y organiza recursos reutilizables.",
    workspaceName: "Nombre del espacio",
    workspacePlaceholder: "Equipo de diseño",
    createWorkspace: "Crear espacio",
    invitesForYou: "Invitaciones para ti",
    roleAccess: (role) => `Acceso ${teamWorkspaceCopy.es.roleLabels[role]}`,
    accept: "Aceptar",
    pendingInvites: (count) =>
      `${count} ${count === 1 ? "invitación pendiente" : "invitaciones pendientes"}`,
    inviteByEmail: "Invitar por email",
    teammateEmailPlaceholder: "teammate@example.com",
    inviteRole: "Rol de invitación",
    inviteTeammate: (workspaceName) =>
      `Invitar compañero a ${workspaceName}`,
    empty: "Aún no hay espacio de equipo.",
    roleLabels: {
      owner: "Propietario",
      admin: "Admin",
      member: "Miembro",
    },
  },
  fr: {
    title: "Espaces d'équipe",
    description:
      "Créez des espaces partagés, invitez des coéquipiers et organisez les ressources réutilisables.",
    workspaceName: "Nom de l'espace",
    workspacePlaceholder: "Équipe design",
    createWorkspace: "Créer un espace",
    invitesForYou: "Invitations pour vous",
    roleAccess: (role) => `Accès ${teamWorkspaceCopy.fr.roleLabels[role]}`,
    accept: "Accepter",
    pendingInvites: (count) =>
      `${count} ${count === 1 ? "invitation en attente" : "invitations en attente"}`,
    inviteByEmail: "Inviter par email",
    teammateEmailPlaceholder: "teammate@example.com",
    inviteRole: "Rôle d'invitation",
    inviteTeammate: (workspaceName) =>
      `Inviter un coéquipier dans ${workspaceName}`,
    empty: "Aucun espace d'équipe pour le moment.",
    roleLabels: {
      owner: "Propriétaire",
      admin: "Admin",
      member: "Membre",
    },
  },
  hi: {
    title: "टीम वर्कस्पेस",
    description:
      "साझा स्पेस बनाएं, टीममेट आमंत्रित करें, और उपयोगी टीम एसेट व्यवस्थित रखें।",
    workspaceName: "वर्कस्पेस नाम",
    workspacePlaceholder: "डिजाइन टीम",
    createWorkspace: "वर्कस्पेस बनाएं",
    invitesForYou: "आपके आमंत्रण",
    roleAccess: (role) => `${teamWorkspaceCopy.hi.roleLabels[role]} एक्सेस`,
    accept: "स्वीकार करें",
    pendingInvites: (count) => `${count} लंबित आमंत्रण`,
    inviteByEmail: "ईमेल से आमंत्रित करें",
    teammateEmailPlaceholder: "teammate@example.com",
    inviteRole: "आमंत्रण भूमिका",
    inviteTeammate: (workspaceName) =>
      `${workspaceName} में टीममेट आमंत्रित करें`,
    empty: "अभी कोई टीम वर्कस्पेस नहीं है।",
    roleLabels: {
      owner: "मालिक",
      admin: "एडमिन",
      member: "सदस्य",
    },
  },
};
