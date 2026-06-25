import type { EditorLocale } from "@/features/editor/editor-localization";

type AudienceKind = "poll" | "quiz" | "qa";
type PublicViewMode = "public" | "private";

export type PublicSurfaceCopy = {
  language: string;
  viewLabel: Record<PublicViewMode, string>;
  viewAction: Record<PublicViewMode, string>;
  audience: string;
  name: string;
  guest: string;
  kind: Record<AudienceKind, string>;
  askQuestion: string;
  send: string;
  sending: string;
  sendError: string;
  questionSent: string;
  responseCounted: string;
  noPrompts: string;
  noPromptOnSlide: string;
  createPublicLink: string;
  noQuestionsYet: string;
  correct: string;
};

const defaultLocale: EditorLocale = "en";

export function getPublicSurfaceCopy(locale: EditorLocale): PublicSurfaceCopy {
  return publicSurfaceCopy[locale] ?? publicSurfaceCopy[defaultLocale];
}

const publicSurfaceCopy: Record<EditorLocale, PublicSurfaceCopy> = {
  en: {
    language: "Public page language",
    viewLabel: {
      public: "Public view",
      private: "Private view",
    },
    viewAction: {
      public: "Create your own",
      private: "Projects",
    },
    audience: "Audience",
    name: "Name",
    guest: "Guest",
    kind: {
      poll: "Poll",
      quiz: "Quiz",
      qa: "Q&A",
    },
    askQuestion: "Ask a question",
    send: "Send",
    sending: "Sending",
    sendError: "Could not send this response.",
    questionSent: "Question sent.",
    responseCounted: "Response counted.",
    noPrompts: "No audience prompts are active for this presentation.",
    noPromptOnSlide: "No audience prompt on this slide.",
    createPublicLink: "Create a public view link to open audience participation.",
    noQuestionsYet: "No questions yet.",
    correct: "correct",
  },
  bn: {
    language: "পাবলিক পেজের ভাষা",
    viewLabel: {
      public: "পাবলিক ভিউ",
      private: "প্রাইভেট ভিউ",
    },
    viewAction: {
      public: "নিজেরটি তৈরি করুন",
      private: "প্রজেক্ট",
    },
    audience: "দর্শক",
    name: "নাম",
    guest: "অতিথি",
    kind: {
      poll: "পোল",
      quiz: "কুইজ",
      qa: "প্রশ্নোত্তর",
    },
    askQuestion: "প্রশ্ন করুন",
    send: "পাঠান",
    sending: "পাঠানো হচ্ছে",
    sendError: "এই উত্তর পাঠানো যায়নি।",
    questionSent: "প্রশ্ন পাঠানো হয়েছে।",
    responseCounted: "উত্তর গণনা হয়েছে।",
    noPrompts: "এই প্রেজেন্টেশনে সক্রিয় দর্শক প্রম্পট নেই।",
    noPromptOnSlide: "এই স্লাইডে দর্শক প্রম্পট নেই।",
    createPublicLink: "দর্শক অংশগ্রহণ খুলতে একটি পাবলিক ভিউ লিংক তৈরি করুন।",
    noQuestionsYet: "এখনও কোনো প্রশ্ন নেই।",
    correct: "সঠিক",
  },
  es: {
    language: "Idioma de la pagina publica",
    viewLabel: {
      public: "Vista publica",
      private: "Vista privada",
    },
    viewAction: {
      public: "Crea el tuyo",
      private: "Proyectos",
    },
    audience: "Audiencia",
    name: "Nombre",
    guest: "Invitado",
    kind: {
      poll: "Encuesta",
      quiz: "Quiz",
      qa: "Preguntas",
    },
    askQuestion: "Haz una pregunta",
    send: "Enviar",
    sending: "Enviando",
    sendError: "No se pudo enviar esta respuesta.",
    questionSent: "Pregunta enviada.",
    responseCounted: "Respuesta contada.",
    noPrompts: "No hay preguntas activas para esta presentacion.",
    noPromptOnSlide: "No hay pregunta de audiencia en esta diapositiva.",
    createPublicLink:
      "Crea un enlace de vista publica para abrir la participacion.",
    noQuestionsYet: "Todavia no hay preguntas.",
    correct: "correcta",
  },
  fr: {
    language: "Langue de la page publique",
    viewLabel: {
      public: "Vue publique",
      private: "Vue privee",
    },
    viewAction: {
      public: "Creer le votre",
      private: "Projets",
    },
    audience: "Audience",
    name: "Nom",
    guest: "Invite",
    kind: {
      poll: "Sondage",
      quiz: "Quiz",
      qa: "Questions",
    },
    askQuestion: "Poser une question",
    send: "Envoyer",
    sending: "Envoi",
    sendError: "Impossible d'envoyer cette reponse.",
    questionSent: "Question envoyee.",
    responseCounted: "Reponse comptee.",
    noPrompts: "Aucune question audience n'est active pour cette presentation.",
    noPromptOnSlide: "Aucune question audience sur cette diapositive.",
    createPublicLink:
      "Creez un lien de vue publique pour ouvrir la participation.",
    noQuestionsYet: "Aucune question pour le moment.",
    correct: "correcte",
  },
  hi: {
    language: "पब्लिक पेज भाषा",
    viewLabel: {
      public: "पब्लिक व्यू",
      private: "प्राइवेट व्यू",
    },
    viewAction: {
      public: "अपना बनाएं",
      private: "प्रोजेक्ट",
    },
    audience: "दर्शक",
    name: "नाम",
    guest: "अतिथि",
    kind: {
      poll: "पोल",
      quiz: "क्विज",
      qa: "प्रश्न",
    },
    askQuestion: "प्रश्न पूछें",
    send: "भेजें",
    sending: "भेजा जा रहा है",
    sendError: "यह उत्तर भेजा नहीं जा सका।",
    questionSent: "प्रश्न भेजा गया।",
    responseCounted: "उत्तर गिना गया।",
    noPrompts: "इस प्रस्तुति में कोई सक्रिय दर्शक प्रॉम्प्ट नहीं है।",
    noPromptOnSlide: "इस स्लाइड पर कोई दर्शक प्रॉम्प्ट नहीं है।",
    createPublicLink: "दर्शक भागीदारी खोलने के लिए पब्लिक व्यू लिंक बनाएं।",
    noQuestionsYet: "अभी कोई प्रश्न नहीं है।",
    correct: "सही",
  },
};
