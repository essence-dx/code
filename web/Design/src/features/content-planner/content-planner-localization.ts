import type {
  ContentPlannerStatus,
  ContentScheduleSummary,
} from "@/db/content-planner";
import type { EditorLocale } from "@/features/editor/editor-localization";

export type ContentPlannerCopy = {
  title: string;
  description: string;
  design: string;
  selectDesign: string;
  channel: string;
  date: string;
  caption: string;
  captionPlaceholder: string;
  scheduleDesign: string;
  empty: string;
  calendarTitle?: string;
  calendarDescription?: string;
  calendarPlannedLabel?: string;
  calendarEmptyDay?: string;
  calendarMoveHint?: string;
  calendarMoveLabel?: string;
  reschedule?: string;
  rescheduleDate?: string;
  itemSchedule: (channel: string, date: string) => string;
  status: Record<ContentPlannerStatus, string>;
  copied: string;
  copyCaption: string;
  openDesign: string;
  published: string;
  remove: string;
  manualUploadHint: string;
  publisherLabel: (item: ContentScheduleSummary, fallbackLabel: string) => string;
};

const defaultLocale: EditorLocale = "en";

export function getContentPlannerCopy(locale: EditorLocale): ContentPlannerCopy {
  return contentPlannerCopy[locale] ?? contentPlannerCopy[defaultLocale];
}

function channelPublisherLabel(channel: string, labels: Record<string, string>) {
  return labels[channel] ?? labels.Website;
}

const contentPlannerCopy: Record<EditorLocale, ContentPlannerCopy> = {
  en: {
    title: "Content planner",
    description: "Schedule saved designs for campaign and publishing work.",
    design: "Design",
    selectDesign: "Select design",
    channel: "Channel",
    date: "Date",
    caption: "Caption",
    captionPlaceholder: "Campaign copy or publishing note",
    scheduleDesign: "Schedule design",
    empty: "No scheduled content yet.",
    calendarTitle: "Publishing calendar",
    calendarDescription: "Planned items by day.",
    calendarPlannedLabel: "planned",
    calendarEmptyDay: "No planned items",
    calendarMoveHint: "Move to another publishing day",
    calendarMoveLabel: "Move {title}",
    reschedule: "Reschedule",
    rescheduleDate: "Reschedule date",
    itemSchedule: (channel, date) => `${channel} - ${date}`,
    status: {
      planned: "Planned",
      published: "Published",
      cancelled: "Cancelled",
    },
    copied: "Copied",
    copyCaption: "Copy caption",
    openDesign: "Open design",
    published: "Published",
    remove: "Remove",
    manualUploadHint:
      "Export the design, upload it manually, then mark it published.",
    publisherLabel: (_item, fallbackLabel) => fallbackLabel,
  },
  bn: {
    title: "কনটেন্ট প্ল্যানার",
    description: "ক্যাম্পেইন এবং পাবলিশিং কাজের জন্য সংরক্ষিত ডিজাইন শিডিউল করুন।",
    design: "ডিজাইন",
    selectDesign: "ডিজাইন নির্বাচন করুন",
    channel: "চ্যানেল",
    date: "তারিখ",
    caption: "ক্যাপশন",
    captionPlaceholder: "ক্যাম্পেইন কপি বা পাবলিশিং নোট",
    scheduleDesign: "ডিজাইন শিডিউল করুন",
    empty: "এখনও কোনো শিডিউল করা কনটেন্ট নেই।",
    itemSchedule: (channel, date) => `${channel} - ${date}`,
    status: {
      planned: "পরিকল্পিত",
      published: "প্রকাশিত",
      cancelled: "বাতিল",
    },
    copied: "কপি হয়েছে",
    copyCaption: "ক্যাপশন কপি করুন",
    openDesign: "ডিজাইন খুলুন",
    published: "প্রকাশিত",
    remove: "সরান",
    manualUploadHint:
      "ডিজাইন এক্সপোর্ট করুন, ম্যানুয়ালি আপলোড করুন, তারপর প্রকাশিত হিসেবে চিহ্নিত করুন।",
    publisherLabel: (item, fallbackLabel) =>
      channelPublisherLabel(item.channel, {
        Instagram: "Instagram খুলুন",
        TikTok: "TikTok আপলোড খুলুন",
        YouTube: "YouTube Studio খুলুন",
        LinkedIn: "LinkedIn খুলুন",
        Pinterest: "Pinterest create খুলুন",
        X: "X-এ ড্রাফট",
        Website: "ওয়েবসাইট এক্সপোর্ট খুলুন",
        Email: "ইমেইল ড্রাফট",
      }) || fallbackLabel,
  },
  es: {
    title: "Planificador de contenido",
    description: "Programa diseños guardados para campañas y publicaciones.",
    design: "Diseño",
    selectDesign: "Seleccionar diseño",
    channel: "Canal",
    date: "Fecha",
    caption: "Texto",
    captionPlaceholder: "Copy de campaña o nota de publicación",
    scheduleDesign: "Programar diseño",
    empty: "Aún no hay contenido programado.",
    itemSchedule: (channel, date) => `${channel} - ${date}`,
    status: {
      planned: "Planificado",
      published: "Publicado",
      cancelled: "Cancelado",
    },
    copied: "Copiado",
    copyCaption: "Copiar texto",
    openDesign: "Abrir diseño",
    published: "Publicado",
    remove: "Eliminar",
    manualUploadHint:
      "Exporta el diseño, súbelo manualmente y márcalo como publicado.",
    publisherLabel: (item, fallbackLabel) =>
      channelPublisherLabel(item.channel, {
        Instagram: "Abrir Instagram",
        TikTok: "Abrir carga de TikTok",
        YouTube: "Abrir YouTube Studio",
        LinkedIn: "Abrir LinkedIn",
        Pinterest: "Abrir creación en Pinterest",
        X: "Redactar en X",
        Website: "Abrir exportación web",
        Email: "Redactar email",
      }) || fallbackLabel,
  },
  fr: {
    title: "Planning de contenu",
    description: "Planifiez les designs enregistrés pour les campagnes.",
    design: "Design",
    selectDesign: "Sélectionner un design",
    channel: "Canal",
    date: "Date",
    caption: "Légende",
    captionPlaceholder: "Texte de campagne ou note de publication",
    scheduleDesign: "Planifier le design",
    empty: "Aucun contenu planifié pour le moment.",
    itemSchedule: (channel, date) => `${channel} - ${date}`,
    status: {
      planned: "Planifié",
      published: "Publié",
      cancelled: "Annulé",
    },
    copied: "Copié",
    copyCaption: "Copier la légende",
    openDesign: "Ouvrir le design",
    published: "Publié",
    remove: "Supprimer",
    manualUploadHint:
      "Exportez le design, téléversez-le manuellement, puis marquez-le publié.",
    publisherLabel: (item, fallbackLabel) =>
      channelPublisherLabel(item.channel, {
        Instagram: "Ouvrir Instagram",
        TikTok: "Ouvrir l'envoi TikTok",
        YouTube: "Ouvrir YouTube Studio",
        LinkedIn: "Ouvrir LinkedIn",
        Pinterest: "Créer sur Pinterest",
        X: "Rédiger sur X",
        Website: "Ouvrir l'export web",
        Email: "Rédiger l'email",
      }) || fallbackLabel,
  },
  hi: {
    title: "कंटेंट प्लानर",
    description: "कैंपेन और पब्लिशिंग काम के लिए सेव डिजाइन शेड्यूल करें।",
    design: "डिजाइन",
    selectDesign: "डिजाइन चुनें",
    channel: "चैनल",
    date: "तारीख",
    caption: "कैप्शन",
    captionPlaceholder: "कैंपेन कॉपी या पब्लिशिंग नोट",
    scheduleDesign: "डिजाइन शेड्यूल करें",
    empty: "अभी कोई शेड्यूल कंटेंट नहीं है।",
    itemSchedule: (channel, date) => `${channel} - ${date}`,
    status: {
      planned: "योजनाबद्ध",
      published: "प्रकाशित",
      cancelled: "रद्द",
    },
    copied: "कॉपी हुआ",
    copyCaption: "कैप्शन कॉपी करें",
    openDesign: "डिजाइन खोलें",
    published: "प्रकाशित",
    remove: "हटाएं",
    manualUploadHint:
      "डिजाइन एक्सपोर्ट करें, मैनुअली अपलोड करें, फिर प्रकाशित चिह्नित करें।",
    publisherLabel: (item, fallbackLabel) =>
      channelPublisherLabel(item.channel, {
        Instagram: "Instagram खोलें",
        TikTok: "TikTok upload खोलें",
        YouTube: "YouTube Studio खोलें",
        LinkedIn: "LinkedIn खोलें",
        Pinterest: "Pinterest create खोलें",
        X: "X पर ड्राफ्ट",
        Website: "वेबसाइट export खोलें",
        Email: "ईमेल ड्राफ्ट",
      }) || fallbackLabel,
  },
};
