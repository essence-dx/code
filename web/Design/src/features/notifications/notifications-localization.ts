import type { EditorLocale } from "@/features/editor/editor-localization";

export type NotificationsCopy = {
  title: string;
  description: string;
  markAllRead: string;
  open: string;
  markAsRead: (title: string) => string;
  empty: string;
};

const defaultLocale: EditorLocale = "en";

export function getNotificationsCopy(locale: EditorLocale): NotificationsCopy {
  return notificationsCopy[locale] ?? notificationsCopy[defaultLocale];
}

const notificationsCopy: Record<EditorLocale, NotificationsCopy> = {
  en: {
    title: "Notifications",
    description: "Team activity that needs your attention.",
    markAllRead: "Mark all read",
    open: "Open",
    markAsRead: (title) => `Mark ${title} as read`,
    empty: "No notifications yet.",
  },
  bn: {
    title: "নোটিফিকেশন",
    description: "যে টিম কার্যকলাপে আপনার নজর দরকার।",
    markAllRead: "সব পড়া হিসেবে চিহ্নিত করুন",
    open: "খুলুন",
    markAsRead: (title) => `${title} পড়া হিসেবে চিহ্নিত করুন`,
    empty: "এখনও কোনো নোটিফিকেশন নেই।",
  },
  es: {
    title: "Notificaciones",
    description: "Actividad del equipo que necesita tu atención.",
    markAllRead: "Marcar todo como leído",
    open: "Abrir",
    markAsRead: (title) => `Marcar ${title} como leído`,
    empty: "Aún no hay notificaciones.",
  },
  fr: {
    title: "Notifications",
    description: "Activité d'équipe qui demande votre attention.",
    markAllRead: "Tout marquer comme lu",
    open: "Ouvrir",
    markAsRead: (title) => `Marquer ${title} comme lu`,
    empty: "Aucune notification pour le moment.",
  },
  hi: {
    title: "नोटिफिकेशन",
    description: "टीम गतिविधि जिस पर आपका ध्यान चाहिए।",
    markAllRead: "सभी को पढ़ा हुआ करें",
    open: "खोलें",
    markAsRead: (title) => `${title} को पढ़ा हुआ करें`,
    empty: "अभी कोई नोटिफिकेशन नहीं है।",
  },
};
