export const config = {
  port: Number(process.env.PORT || 4200),
  jwtSecret: process.env.JWT_SECRET || 'ctr-cms-dev-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  isProduction: process.env.NODE_ENV === 'production',
};
