import type { EditorLocale } from "@/features/editor/editor-localization";

export type AccountSettingsCopy = {
  title: string;
  description: string;
  displayName: string;
  saveAccountName: string;
  emailSecurity: string;
  emailSecurityDescription: string;
  verified: string;
  unverified: string;
  emailAddress: string;
  sendCode: string;
  deliveryStatus: (status: string, date: string) => string;
  openSecurityEmailLink: string;
  noSecurityEmails: string;
  twoFactor: string;
  twoFactorDescription: string;
  enabled: string;
  off: string;
  authenticatorCode: string;
  disableTwoFactor: string;
  twoFactorQrAlt: string;
  manualKey: string;
  enableTwoFactor: string;
  activeSessions: string;
  unknownDevice: string;
  noIpRecorded: string;
  sessionExpires: (ipAddress: string, date: string) => string;
  revokeSession: string;
  noActiveSessions: string;
  deleteAccount: string;
  deleteAccountDescription: string;
  deleteConfirmation: string;
};

const defaultLocale: EditorLocale = "en";

export function getAccountSettingsCopy(
  locale: EditorLocale,
): AccountSettingsCopy {
  return accountSettingsCopy[locale] ?? accountSettingsCopy[defaultLocale];
}

const accountSettingsCopy: Record<EditorLocale, AccountSettingsCopy> = {
  en: {
    title: "Account",
    description: "Profile and active session controls.",
    displayName: "Display name",
    saveAccountName: "Save account name",
    emailSecurity: "Email security",
    emailSecurityDescription:
      "Verification and password recovery links for this account.",
    verified: "Verified",
    unverified: "Unverified",
    emailAddress: "Email address",
    sendCode: "Send code",
    deliveryStatus: (status, date) => `${status} - ${date}`,
    openSecurityEmailLink: "Open security email link",
    noSecurityEmails: "No security emails sent yet.",
    twoFactor: "Two-factor authentication",
    twoFactorDescription:
      "Protect this account with an authenticator app code.",
    enabled: "Enabled",
    off: "Off",
    authenticatorCode: "Authenticator code",
    disableTwoFactor: "Disable two-factor authentication",
    twoFactorQrAlt: "Two-factor setup QR code",
    manualKey: "Manual key",
    enableTwoFactor: "Enable two-factor authentication",
    activeSessions: "Active sessions",
    unknownDevice: "Unknown device",
    noIpRecorded: "No IP recorded",
    sessionExpires: (ipAddress, date) => `${ipAddress} - expires ${date}`,
    revokeSession: "Revoke session",
    noActiveSessions: "No active sessions found.",
    deleteAccount: "Delete account",
    deleteAccountDescription:
      "This permanently removes your account and saved workspace data.",
    deleteConfirmation: "Type DELETE to confirm",
  },
  bn: {
    title: "অ্যাকাউন্ট",
    description: "প্রোফাইল এবং সক্রিয় সেশন নিয়ন্ত্রণ।",
    displayName: "প্রদর্শন নাম",
    saveAccountName: "অ্যাকাউন্ট নাম সংরক্ষণ",
    emailSecurity: "ইমেইল সিকিউরিটি",
    emailSecurityDescription:
      "এই অ্যাকাউন্টের ভেরিফিকেশন এবং পাসওয়ার্ড পুনরুদ্ধার লিংক।",
    verified: "ভেরিফায়েড",
    unverified: "ভেরিফাই হয়নি",
    emailAddress: "ইমেইল ঠিকানা",
    sendCode: "কোড পাঠান",
    deliveryStatus: (status, date) => `${status} - ${date}`,
    openSecurityEmailLink: "সিকিউরিটি ইমেইল লিংক খুলুন",
    noSecurityEmails: "এখনও কোনো সিকিউরিটি ইমেইল পাঠানো হয়নি।",
    twoFactor: "টু-ফ্যাক্টর অথেন্টিকেশন",
    twoFactorDescription: "অথেন্টিকেটর অ্যাপ কোড দিয়ে অ্যাকাউন্ট সুরক্ষিত রাখুন।",
    enabled: "চালু",
    off: "বন্ধ",
    authenticatorCode: "অথেন্টিকেটর কোড",
    disableTwoFactor: "টু-ফ্যাক্টর অথেন্টিকেশন বন্ধ করুন",
    twoFactorQrAlt: "টু-ফ্যাক্টর সেটআপ QR কোড",
    manualKey: "ম্যানুয়াল কী",
    enableTwoFactor: "টু-ফ্যাক্টর অথেন্টিকেশন চালু করুন",
    activeSessions: "সক্রিয় সেশন",
    unknownDevice: "অজানা ডিভাইস",
    noIpRecorded: "কোনো IP রেকর্ড নেই",
    sessionExpires: (ipAddress, date) => `${ipAddress} - মেয়াদ শেষ ${date}`,
    revokeSession: "সেশন বাতিল করুন",
    noActiveSessions: "কোনো সক্রিয় সেশন পাওয়া যায়নি।",
    deleteAccount: "অ্যাকাউন্ট মুছুন",
    deleteAccountDescription:
      "এটি আপনার অ্যাকাউন্ট এবং সংরক্ষিত ওয়ার্কস্পেস ডেটা স্থায়ীভাবে মুছে দেবে।",
    deleteConfirmation: "নিশ্চিত করতে DELETE লিখুন",
  },
  es: {
    title: "Cuenta",
    description: "Controles de perfil y sesiones activas.",
    displayName: "Nombre visible",
    saveAccountName: "Guardar nombre de cuenta",
    emailSecurity: "Seguridad del email",
    emailSecurityDescription:
      "Enlaces de verificación y recuperación de contraseña para esta cuenta.",
    verified: "Verificado",
    unverified: "Sin verificar",
    emailAddress: "Dirección de email",
    sendCode: "Enviar código",
    deliveryStatus: (status, date) => `${status} - ${date}`,
    openSecurityEmailLink: "Abrir enlace de email de seguridad",
    noSecurityEmails: "Aún no se enviaron emails de seguridad.",
    twoFactor: "Autenticación en dos pasos",
    twoFactorDescription:
      "Protege esta cuenta con un código de app autenticadora.",
    enabled: "Activado",
    off: "Desactivado",
    authenticatorCode: "Código autenticador",
    disableTwoFactor: "Desactivar autenticación en dos pasos",
    twoFactorQrAlt: "Código QR de configuración en dos pasos",
    manualKey: "Clave manual",
    enableTwoFactor: "Activar autenticación en dos pasos",
    activeSessions: "Sesiones activas",
    unknownDevice: "Dispositivo desconocido",
    noIpRecorded: "Sin IP registrada",
    sessionExpires: (ipAddress, date) => `${ipAddress} - expira ${date}`,
    revokeSession: "Revocar sesión",
    noActiveSessions: "No se encontraron sesiones activas.",
    deleteAccount: "Eliminar cuenta",
    deleteAccountDescription:
      "Esto elimina permanentemente tu cuenta y los datos guardados del espacio.",
    deleteConfirmation: "Escribe DELETE para confirmar",
  },
  fr: {
    title: "Compte",
    description: "Contrôles du profil et des sessions actives.",
    displayName: "Nom affiché",
    saveAccountName: "Enregistrer le nom du compte",
    emailSecurity: "Sécurité email",
    emailSecurityDescription:
      "Liens de vérification et de récupération du mot de passe pour ce compte.",
    verified: "Vérifié",
    unverified: "Non vérifié",
    emailAddress: "Adresse email",
    sendCode: "Envoyer le code",
    deliveryStatus: (status, date) => `${status} - ${date}`,
    openSecurityEmailLink: "Ouvrir le lien email de sécurité",
    noSecurityEmails: "Aucun email de sécurité envoyé pour le moment.",
    twoFactor: "Authentification à deux facteurs",
    twoFactorDescription:
      "Protégez ce compte avec un code d'application d'authentification.",
    enabled: "Activé",
    off: "Désactivé",
    authenticatorCode: "Code d'authentification",
    disableTwoFactor: "Désactiver l'authentification à deux facteurs",
    twoFactorQrAlt: "Code QR de configuration à deux facteurs",
    manualKey: "Clé manuelle",
    enableTwoFactor: "Activer l'authentification à deux facteurs",
    activeSessions: "Sessions actives",
    unknownDevice: "Appareil inconnu",
    noIpRecorded: "Aucune IP enregistrée",
    sessionExpires: (ipAddress, date) => `${ipAddress} - expire le ${date}`,
    revokeSession: "Révoquer la session",
    noActiveSessions: "Aucune session active trouvée.",
    deleteAccount: "Supprimer le compte",
    deleteAccountDescription:
      "Cela supprime définitivement votre compte et les données enregistrées.",
    deleteConfirmation: "Tapez DELETE pour confirmer",
  },
  hi: {
    title: "अकाउंट",
    description: "प्रोफाइल और सक्रिय सेशन नियंत्रण।",
    displayName: "डिस्प्ले नाम",
    saveAccountName: "अकाउंट नाम सेव करें",
    emailSecurity: "ईमेल सुरक्षा",
    emailSecurityDescription:
      "इस अकाउंट के लिए सत्यापन और पासवर्ड रिकवरी लिंक।",
    verified: "सत्यापित",
    unverified: "असत्यापित",
    emailAddress: "ईमेल पता",
    sendCode: "कोड भेजें",
    deliveryStatus: (status, date) => `${status} - ${date}`,
    openSecurityEmailLink: "सुरक्षा ईमेल लिंक खोलें",
    noSecurityEmails: "अभी कोई सुरक्षा ईमेल नहीं भेजा गया।",
    twoFactor: "टू-फैक्टर ऑथेंटिकेशन",
    twoFactorDescription: "ऑथेंटिकेटर ऐप कोड से इस अकाउंट को सुरक्षित रखें।",
    enabled: "चालू",
    off: "बंद",
    authenticatorCode: "ऑथेंटिकेटर कोड",
    disableTwoFactor: "टू-फैक्टर ऑथेंटिकेशन बंद करें",
    twoFactorQrAlt: "टू-फैक्टर सेटअप QR कोड",
    manualKey: "मैनुअल की",
    enableTwoFactor: "टू-फैक्टर ऑथेंटिकेशन चालू करें",
    activeSessions: "सक्रिय सेशन",
    unknownDevice: "अज्ञात डिवाइस",
    noIpRecorded: "कोई IP रिकॉर्ड नहीं",
    sessionExpires: (ipAddress, date) => `${ipAddress} - समाप्त ${date}`,
    revokeSession: "सेशन रद्द करें",
    noActiveSessions: "कोई सक्रिय सेशन नहीं मिला।",
    deleteAccount: "अकाउंट हटाएं",
    deleteAccountDescription:
      "यह आपका अकाउंट और सेव किया गया वर्कस्पेस डेटा स्थायी रूप से हटा देगा।",
    deleteConfirmation: "पुष्टि के लिए DELETE लिखें",
  },
};
