import rateLimit from 'express-rate-limit';

/**
 * Rate limiter global untuk semua endpoint /api
 * Max 100 request per IP per 15 menit
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Terlalu banyak request. Coba lagi dalam 15 menit.' }
});

/**
 * Rate limiter ketat untuk auth (login/register)
 * Max 10 percobaan per IP per 15 menit
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Terlalu banyak percobaan. Coba lagi nanti.' }
});
