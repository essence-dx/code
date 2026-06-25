import type { EditorLocale } from "@/features/editor/editor-localization";

export type AuthFoundationId =
  | "createDesigns"
  | "manageProjects"
  | "reuseTemplates"
  | "protectAccount";

export type AuthCopy = {
  language: string;
  privateWorkspace: string;
  heroTitle: string;
  heroDescription: string;
  foundation: Record<AuthFoundationId, string>;
  authCard: {
    title: {
      signIn: string;
      signUp: string;
    };
    description: string;
    tabs: {
      signIn: string;
      signUp: string;
    };
    name: string;
    email: string;
    password: string;
    working: string;
    signIn: string;
    createAccount: string;
    forgotPassword: string;
    authenticationFailed: string;
    fallbackName: string;
  };
  verifyEmail: {
    title: string;
    description: (productName: string) => string;
    email: string;
    verificationCode: string;
    codeSent: string;
    sendCodeFailed: string;
    codeMismatch: string;
    verified: string;
    checking: string;
    verifyAndContinue: string;
    sendNewCode: string;
    backToSignIn: string;
  };
  forgotPassword: {
    title: string;
    description: (productName: string) => string;
    email: string;
    sent: string;
    error: string;
    sendResetLink: string;
    backToSignIn: string;
  };
  resetPassword: {
    title: string;
    description: string;
    newPassword: string;
    confirmPassword: string;
    resetPassword: string;
    backToSignIn: string;
    errors: {
      password: string;
      missingToken: string;
      invalid: string;
    };
  };
  twoFactor: {
    title: string;
    description: string;
    authenticatorCode: string;
    mismatch: string;
    verify: string;
  };
};

const defaultLocale: EditorLocale = "en";

export function getAuthCopy(locale: EditorLocale): AuthCopy {
  return authCopy[locale] ?? authCopy[defaultLocale];
}

const authCopy: Record<EditorLocale, AuthCopy> = {
  en: {
    language: "Auth language",
    privateWorkspace: "Private design workspace",
    heroTitle: "Design, organize, and publish from one calm workspace.",
    heroDescription:
      "Create social posts, documents, presentations, websites, media, and print-ready files with your own projects, brand assets, templates, and exports under one account.",
    foundation: {
      createDesigns: "Create designs",
      manageProjects: "Manage projects",
      reuseTemplates: "Reuse templates",
      protectAccount: "Protect account",
    },
    authCard: {
      title: {
        signIn: "Welcome back",
        signUp: "Create account",
      },
      description:
        "Sign in to continue designing, publishing, and managing your studio.",
      tabs: {
        signIn: "Sign in",
        signUp: "Sign up",
      },
      name: "Name",
      email: "Email",
      password: "Password",
      working: "Working...",
      signIn: "Sign in",
      createAccount: "Create account",
      forgotPassword: "Forgot password?",
      authenticationFailed: "Authentication failed",
      fallbackName: "Designer",
    },
    verifyEmail: {
      title: "Verify your email",
      description: (productName) =>
        `Enter the six digit code sent by ${productName}.`,
      email: "Email",
      verificationCode: "Verification code",
      codeSent: "A verification code has been sent.",
      sendCodeFailed: "We could not send a code for that email.",
      codeMismatch: "That code did not match or has expired.",
      verified: "Email verified. Opening your studio.",
      checking: "Checking...",
      verifyAndContinue: "Verify and continue",
      sendNewCode: "Send new code",
      backToSignIn: "Back to sign in",
    },
    forgotPassword: {
      title: "Reset password",
      description: (productName) =>
        `Enter your account email and ${productName} will send a secure reset link.`,
      email: "Email",
      sent: "If that email exists, a reset link has been sent.",
      error: "Enter a valid email address.",
      sendResetLink: "Send reset link",
      backToSignIn: "Back to sign in",
    },
    resetPassword: {
      title: "Choose new password",
      description: "Use a strong password with at least eight characters.",
      newPassword: "New password",
      confirmPassword: "Confirm password",
      resetPassword: "Reset password",
      backToSignIn: "Back to sign in",
      errors: {
        password: "Passwords must match and be at least eight characters.",
        missingToken: "This reset link is missing its secure token.",
        invalid: "This reset link is invalid or expired.",
      },
    },
    twoFactor: {
      title: "Two-factor check",
      description: "Enter the current code from your authenticator app.",
      authenticatorCode: "Authenticator code",
      mismatch: "That code did not match.",
      verify: "Verify",
    },
  },
  bn: {
    language: "অথ ভাষা",
    privateWorkspace: "ব্যক্তিগত ডিজাইন ওয়ার্কস্পেস",
    heroTitle: "একটি শান্ত ওয়ার্কস্পেসে ডিজাইন, সাজানো, ও প্রকাশ করুন।",
    heroDescription:
      "নিজস্ব প্রজেক্ট, ব্র্যান্ড অ্যাসেট, টেমপ্লেট, এবং এক্সপোর্টসহ সোশ্যাল পোস্ট, ডকুমেন্ট, প্রেজেন্টেশন, ওয়েবসাইট, মিডিয়া, এবং প্রিন্ট-রেডি ফাইল তৈরি করুন।",
    foundation: {
      createDesigns: "ডিজাইন তৈরি",
      manageProjects: "প্রজেক্ট পরিচালনা",
      reuseTemplates: "টেমপ্লেট পুনরায় ব্যবহার",
      protectAccount: "অ্যাকাউন্ট সুরক্ষা",
    },
    authCard: {
      title: {
        signIn: "আবার স্বাগতম",
        signUp: "অ্যাকাউন্ট তৈরি করুন",
      },
      description:
        "ডিজাইন, প্রকাশনা, এবং স্টুডিও পরিচালনা চালিয়ে যেতে সাইন ইন করুন।",
      tabs: {
        signIn: "সাইন ইন",
        signUp: "সাইন আপ",
      },
      name: "নাম",
      email: "ইমেইল",
      password: "পাসওয়ার্ড",
      working: "কাজ হচ্ছে...",
      signIn: "সাইন ইন",
      createAccount: "অ্যাকাউন্ট তৈরি করুন",
      forgotPassword: "পাসওয়ার্ড ভুলে গেছেন?",
      authenticationFailed: "অথেনটিকেশন ব্যর্থ হয়েছে",
      fallbackName: "ডিজাইনার",
    },
    verifyEmail: {
      title: "ইমেইল ভেরিফাই করুন",
      description: (productName) =>
        `${productName} পাঠানো ছয় সংখ্যার কোড লিখুন।`,
      email: "ইমেইল",
      verificationCode: "ভেরিফিকেশন কোড",
      codeSent: "একটি ভেরিফিকেশন কোড পাঠানো হয়েছে।",
      sendCodeFailed: "এই ইমেইলের জন্য কোড পাঠানো যায়নি।",
      codeMismatch: "কোডটি মেলেনি বা মেয়াদ শেষ হয়েছে।",
      verified: "ইমেইল ভেরিফাই হয়েছে। স্টুডিও খোলা হচ্ছে।",
      checking: "চেক করা হচ্ছে...",
      verifyAndContinue: "ভেরিফাই করে চালিয়ে যান",
      sendNewCode: "নতুন কোড পাঠান",
      backToSignIn: "সাইন ইনে ফিরুন",
    },
    forgotPassword: {
      title: "পাসওয়ার্ড রিসেট",
      description: (productName) =>
        `আপনার অ্যাকাউন্ট ইমেইল লিখুন, ${productName} নিরাপদ রিসেট লিংক পাঠাবে।`,
      email: "ইমেইল",
      sent: "ইমেইলটি থাকলে রিসেট লিংক পাঠানো হয়েছে।",
      error: "একটি বৈধ ইমেইল ঠিকানা লিখুন।",
      sendResetLink: "রিসেট লিংক পাঠান",
      backToSignIn: "সাইন ইনে ফিরুন",
    },
    resetPassword: {
      title: "নতুন পাসওয়ার্ড বেছে নিন",
      description: "কমপক্ষে আট অক্ষরের শক্তিশালী পাসওয়ার্ড ব্যবহার করুন।",
      newPassword: "নতুন পাসওয়ার্ড",
      confirmPassword: "পাসওয়ার্ড নিশ্চিত করুন",
      resetPassword: "পাসওয়ার্ড রিসেট",
      backToSignIn: "সাইন ইনে ফিরুন",
      errors: {
        password: "পাসওয়ার্ড মিলতে হবে এবং কমপক্ষে আট অক্ষরের হতে হবে।",
        missingToken: "এই রিসেট লিংকে নিরাপদ টোকেন নেই।",
        invalid: "এই রিসেট লিংকটি অবৈধ বা মেয়াদোত্তীর্ণ।",
      },
    },
    twoFactor: {
      title: "টু-ফ্যাক্টর যাচাই",
      description: "আপনার অথেনটিকেটর অ্যাপের বর্তমান কোড লিখুন।",
      authenticatorCode: "অথেনটিকেটর কোড",
      mismatch: "কোডটি মেলেনি।",
      verify: "ভেরিফাই",
    },
  },
  es: {
    language: "Idioma de acceso",
    privateWorkspace: "Espacio de diseño privado",
    heroTitle: "Diseña, organiza y publica desde un espacio tranquilo.",
    heroDescription:
      "Crea posts sociales, documentos, presentaciones, sitios web, media y archivos listos para imprimir con tus proyectos, marca, plantillas y exportaciones en una cuenta.",
    foundation: {
      createDesigns: "Crear diseños",
      manageProjects: "Gestionar proyectos",
      reuseTemplates: "Reutilizar plantillas",
      protectAccount: "Proteger cuenta",
    },
    authCard: {
      title: {
        signIn: "Bienvenido de nuevo",
        signUp: "Crear cuenta",
      },
      description:
        "Inicia sesión para seguir diseñando, publicando y gestionando tu estudio.",
      tabs: {
        signIn: "Entrar",
        signUp: "Registrarse",
      },
      name: "Nombre",
      email: "Email",
      password: "Contraseña",
      working: "Trabajando...",
      signIn: "Entrar",
      createAccount: "Crear cuenta",
      forgotPassword: "¿Olvidaste tu contraseña?",
      authenticationFailed: "Autenticación fallida",
      fallbackName: "Diseñador",
    },
    verifyEmail: {
      title: "Verifica tu email",
      description: (productName) =>
        `Ingresa el código de seis dígitos enviado por ${productName}.`,
      email: "Email",
      verificationCode: "Código de verificación",
      codeSent: "Se envió un código de verificación.",
      sendCodeFailed: "No pudimos enviar un código a ese email.",
      codeMismatch: "Ese código no coincide o expiró.",
      verified: "Email verificado. Abriendo tu estudio.",
      checking: "Comprobando...",
      verifyAndContinue: "Verificar y continuar",
      sendNewCode: "Enviar nuevo código",
      backToSignIn: "Volver a entrar",
    },
    forgotPassword: {
      title: "Restablecer contraseña",
      description: (productName) =>
        `Ingresa el email de tu cuenta y ${productName} enviará un enlace seguro.`,
      email: "Email",
      sent: "Si ese email existe, se envió un enlace de restablecimiento.",
      error: "Ingresa un email válido.",
      sendResetLink: "Enviar enlace",
      backToSignIn: "Volver a entrar",
    },
    resetPassword: {
      title: "Elige nueva contraseña",
      description: "Usa una contraseña fuerte de al menos ocho caracteres.",
      newPassword: "Nueva contraseña",
      confirmPassword: "Confirmar contraseña",
      resetPassword: "Restablecer contraseña",
      backToSignIn: "Volver a entrar",
      errors: {
        password:
          "Las contraseñas deben coincidir y tener al menos ocho caracteres.",
        missingToken: "A este enlace le falta su token seguro.",
        invalid: "Este enlace es inválido o expiró.",
      },
    },
    twoFactor: {
      title: "Comprobación en dos pasos",
      description: "Ingresa el código actual de tu app autenticadora.",
      authenticatorCode: "Código autenticador",
      mismatch: "Ese código no coincide.",
      verify: "Verificar",
    },
  },
  fr: {
    language: "Langue d'authentification",
    privateWorkspace: "Espace de design privé",
    heroTitle: "Concevez, organisez et publiez depuis un espace calme.",
    heroDescription:
      "Créez des posts sociaux, documents, présentations, sites web, médias et fichiers prêts à imprimer avec vos projets, ressources de marque, modèles et exports dans un seul compte.",
    foundation: {
      createDesigns: "Créer des designs",
      manageProjects: "Gérer les projets",
      reuseTemplates: "Réutiliser les modèles",
      protectAccount: "Protéger le compte",
    },
    authCard: {
      title: {
        signIn: "Bon retour",
        signUp: "Créer un compte",
      },
      description:
        "Connectez-vous pour continuer à concevoir, publier et gérer votre studio.",
      tabs: {
        signIn: "Connexion",
        signUp: "Inscription",
      },
      name: "Nom",
      email: "Email",
      password: "Mot de passe",
      working: "Traitement...",
      signIn: "Connexion",
      createAccount: "Créer un compte",
      forgotPassword: "Mot de passe oublié ?",
      authenticationFailed: "Échec de l'authentification",
      fallbackName: "Designer",
    },
    verifyEmail: {
      title: "Vérifiez votre email",
      description: (productName) =>
        `Saisissez le code à six chiffres envoyé par ${productName}.`,
      email: "Email",
      verificationCode: "Code de vérification",
      codeSent: "Un code de vérification a été envoyé.",
      sendCodeFailed: "Impossible d'envoyer un code à cet email.",
      codeMismatch: "Ce code ne correspond pas ou a expiré.",
      verified: "Email vérifié. Ouverture de votre studio.",
      checking: "Vérification...",
      verifyAndContinue: "Vérifier et continuer",
      sendNewCode: "Envoyer un nouveau code",
      backToSignIn: "Retour à la connexion",
    },
    forgotPassword: {
      title: "Réinitialiser le mot de passe",
      description: (productName) =>
        `Saisissez l'email du compte et ${productName} enverra un lien sécurisé.`,
      email: "Email",
      sent: "Si cet email existe, un lien de réinitialisation a été envoyé.",
      error: "Saisissez une adresse email valide.",
      sendResetLink: "Envoyer le lien",
      backToSignIn: "Retour à la connexion",
    },
    resetPassword: {
      title: "Choisir un nouveau mot de passe",
      description: "Utilisez un mot de passe fort d'au moins huit caractères.",
      newPassword: "Nouveau mot de passe",
      confirmPassword: "Confirmer le mot de passe",
      resetPassword: "Réinitialiser le mot de passe",
      backToSignIn: "Retour à la connexion",
      errors: {
        password:
          "Les mots de passe doivent correspondre et contenir au moins huit caractères.",
        missingToken: "Il manque le jeton sécurisé à ce lien.",
        invalid: "Ce lien est invalide ou expiré.",
      },
    },
    twoFactor: {
      title: "Vérification à deux facteurs",
      description:
        "Saisissez le code actuel de votre application d'authentification.",
      authenticatorCode: "Code d'authentification",
      mismatch: "Ce code ne correspond pas.",
      verify: "Vérifier",
    },
  },
  hi: {
    language: "ऑथ भाषा",
    privateWorkspace: "निजी डिजाइन वर्कस्पेस",
    heroTitle: "एक शांत वर्कस्पेस से डिजाइन, व्यवस्थित और प्रकाशित करें।",
    heroDescription:
      "अपने प्रोजेक्ट, ब्रांड एसेट, टेम्पलेट और एक्सपोर्ट के साथ सोशल पोस्ट, दस्तावेज, प्रेजेंटेशन, वेबसाइट, मीडिया और प्रिंट-रेडी फाइलें बनाएं।",
    foundation: {
      createDesigns: "डिजाइन बनाएं",
      manageProjects: "प्रोजेक्ट संभालें",
      reuseTemplates: "टेम्पलेट फिर इस्तेमाल करें",
      protectAccount: "अकाउंट सुरक्षित रखें",
    },
    authCard: {
      title: {
        signIn: "वापसी पर स्वागत",
        signUp: "अकाउंट बनाएं",
      },
      description:
        "डिजाइन, प्रकाशन और स्टूडियो प्रबंधन जारी रखने के लिए साइन इन करें।",
      tabs: {
        signIn: "साइन इन",
        signUp: "साइन अप",
      },
      name: "नाम",
      email: "ईमेल",
      password: "पासवर्ड",
      working: "काम हो रहा है...",
      signIn: "साइन इन",
      createAccount: "अकाउंट बनाएं",
      forgotPassword: "पासवर्ड भूल गए?",
      authenticationFailed: "ऑथेंटिकेशन विफल",
      fallbackName: "डिजाइनर",
    },
    verifyEmail: {
      title: "अपना ईमेल वेरिफाई करें",
      description: (productName) =>
        `${productName} द्वारा भेजा गया छह अंकों का कोड दर्ज करें।`,
      email: "ईमेल",
      verificationCode: "वेरिफिकेशन कोड",
      codeSent: "वेरिफिकेशन कोड भेज दिया गया है।",
      sendCodeFailed: "उस ईमेल पर कोड नहीं भेज सके।",
      codeMismatch: "यह कोड मेल नहीं खाता या समाप्त हो गया है।",
      verified: "ईमेल वेरिफाई हो गया। आपका स्टूडियो खुल रहा है।",
      checking: "जांच हो रही है...",
      verifyAndContinue: "वेरिफाई करके जारी रखें",
      sendNewCode: "नया कोड भेजें",
      backToSignIn: "साइन इन पर वापस",
    },
    forgotPassword: {
      title: "पासवर्ड रीसेट",
      description: (productName) =>
        `अपना अकाउंट ईमेल दर्ज करें और ${productName} सुरक्षित रीसेट लिंक भेजेगा।`,
      email: "ईमेल",
      sent: "अगर वह ईमेल मौजूद है, तो रीसेट लिंक भेजा गया है।",
      error: "मान्य ईमेल पता दर्ज करें।",
      sendResetLink: "रीसेट लिंक भेजें",
      backToSignIn: "साइन इन पर वापस",
    },
    resetPassword: {
      title: "नया पासवर्ड चुनें",
      description: "कम से कम आठ अक्षरों वाला मजबूत पासवर्ड उपयोग करें।",
      newPassword: "नया पासवर्ड",
      confirmPassword: "पासवर्ड पुष्टि करें",
      resetPassword: "पासवर्ड रीसेट",
      backToSignIn: "साइन इन पर वापस",
      errors: {
        password: "पासवर्ड मेल खाने चाहिए और कम से कम आठ अक्षर होने चाहिए।",
        missingToken: "इस रीसेट लिंक में सुरक्षित टोकन नहीं है।",
        invalid: "यह रीसेट लिंक अमान्य या समाप्त हो गया है।",
      },
    },
    twoFactor: {
      title: "टू-फैक्टर जांच",
      description: "अपने ऑथेंटिकेटर ऐप का मौजूदा कोड दर्ज करें।",
      authenticatorCode: "ऑथेंटिकेटर कोड",
      mismatch: "यह कोड मेल नहीं खाता।",
      verify: "वेरिफाई",
    },
  },
};
