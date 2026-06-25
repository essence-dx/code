const minute = 60;
const day = 24 * 60 * minute;

export const authSessionPolicy = {
  expiresIn: 7 * day,
  updateAge: day,
  freshAge: 10 * minute,
};

export const authRateLimitPolicy = {
  enabled: true,
  storage: "database" as const,
  window: minute,
  max: 60,
  customRules: {
    "/sign-in/email": {
      window: minute,
      max: 5,
    },
    "/sign-up/email": {
      window: minute,
      max: 3,
    },
  },
};

export const emailOtpPolicy = {
  otpLength: 6,
  expiresIn: 10 * minute,
  allowedAttempts: 5,
  rateLimit: {
    window: minute,
    max: 3,
  },
};

export const workbookImportRateLimitPolicy = {
  window: 10 * minute,
  max: 12,
  reservationTtl: 15 * minute,
};
