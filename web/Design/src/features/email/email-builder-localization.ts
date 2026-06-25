import type { EditorLocale } from "@/features/editor/editor-localization";

export type EmailBuilderCopy = {
  title: string;
  description: string;
  design: string;
  selectDesign: string;
  testRecipient: string;
  subject: string;
  previewText: string;
  previewTextPlaceholder: string;
  blockPack: string;
  blockPackDescription: string;
  sendTestEmail: string;
  preview: string;
  exportHtml: string;
};

const defaultLocale: EditorLocale = "en";

export function getEmailBuilderCopy(locale: EditorLocale): EmailBuilderCopy {
  return emailBuilderCopy[locale] ?? emailBuilderCopy[defaultLocale];
}

const emailBuilderCopy: Record<EditorLocale, EmailBuilderCopy> = {
  en: {
    title: "Email builder",
    description: "Prepare campaign emails from saved Essence designs.",
    design: "Design",
    selectDesign: "Select design",
    testRecipient: "Test recipient",
    subject: "Subject",
    previewText: "Preview text",
    previewTextPlaceholder: "Short inbox preview text",
    blockPack: "Reusable block",
    blockPackDescription: "Add an optional email-safe content block.",
    sendTestEmail: "Send test email",
    preview: "Preview",
    exportHtml: "Export HTML",
  },
  bn: {
    title: "ইমেইল বিল্ডার",
    description:
      "সংরক্ষিত Essence ডিজাইন থেকে ক্যাম্পেইন ইমেইল প্রস্তুত করুন।",
    design: "ডিজাইন",
    selectDesign: "ডিজাইন নির্বাচন করুন",
    testRecipient: "টেস্ট প্রাপক",
    subject: "বিষয়",
    previewText: "প্রিভিউ টেক্সট",
    previewTextPlaceholder: "ইনবক্সের জন্য ছোট প্রিভিউ টেক্সট",
    blockPack: "রিইউজেবল ব্লক",
    blockPackDescription: "ঐচ্ছিক email-safe content block যোগ করুন।",
    sendTestEmail: "টেস্ট ইমেইল পাঠান",
    preview: "প্রিভিউ",
    exportHtml: "HTML এক্সপোর্ট",
  },
  es: {
    title: "Constructor de email",
    description:
      "Prepara emails de campaña desde diseños guardados de Essence.",
    design: "Diseño",
    selectDesign: "Seleccionar diseño",
    testRecipient: "Destinatario de prueba",
    subject: "Asunto",
    previewText: "Texto de vista previa",
    previewTextPlaceholder: "Texto breve para la bandeja de entrada",
    blockPack: "Bloque reutilizable",
    blockPackDescription: "Agrega un bloque opcional seguro para email.",
    sendTestEmail: "Enviar email de prueba",
    preview: "Vista previa",
    exportHtml: "Exportar HTML",
  },
  fr: {
    title: "Créateur d'email",
    description:
      "Préparez des emails de campagne depuis les designs Essence enregistrés.",
    design: "Design",
    selectDesign: "Sélectionner un design",
    testRecipient: "Destinataire de test",
    subject: "Objet",
    previewText: "Texte d'aperçu",
    previewTextPlaceholder: "Court texte d'aperçu dans la boîte de réception",
    blockPack: "Bloc réutilisable",
    blockPackDescription: "Ajoutez un bloc optionnel compatible email.",
    sendTestEmail: "Envoyer un email de test",
    preview: "Aperçu",
    exportHtml: "Exporter HTML",
  },
  hi: {
    title: "ईमेल बिल्डर",
    description: "सेव किए गए Essence डिजाइनों से कैंपेन ईमेल तैयार करें।",
    design: "डिजाइन",
    selectDesign: "डिजाइन चुनें",
    testRecipient: "टेस्ट प्राप्तकर्ता",
    subject: "विषय",
    previewText: "प्रिव्यू टेक्स्ट",
    previewTextPlaceholder: "इनबॉक्स के लिए छोटा प्रिव्यू टेक्स्ट",
    blockPack: "रीयूजेबल ब्लॉक",
    blockPackDescription: "एक वैकल्पिक email-safe content block जोड़ें।",
    sendTestEmail: "टेस्ट ईमेल भेजें",
    preview: "प्रिव्यू",
    exportHtml: "HTML एक्सपोर्ट",
  },
};
