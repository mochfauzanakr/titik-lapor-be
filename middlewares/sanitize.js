import xss from 'xss';

/**
 * Mencegah stored XSS pada field seperti judul, deskripsi, body komentar, dll.
 */
export const sanitizeBody = (req, res, next) => {
  if (req.body) {
    for (const key in req.body) {
      if (typeof req.body[key] === 'string') {
        req.body[key] = xss(req.body[key]);
      }
    }
  }
  next();
};
