import sharp from 'sharp';

/**
 * Konversi file gambar (JPEG/PNG) ke format WebP.
 * File video akan dilewati (tidak dikonversi).
 * 
 * @param {Object} file - Object file dari Multer (req.file)
 * @returns {Object} - { buffer, mimetype, originalname } yang sudah dikonversi
 */
const convertToWebp = async (file) => {
  const imageMimeTypes = ['image/jpeg', 'image/png'];

  // Jika bukan gambar (misal video), kembalikan file asli tanpa konversi
  if (!imageMimeTypes.includes(file.mimetype)) {
    return {
      buffer: file.buffer,
      mimetype: file.mimetype,
      originalname: file.originalname
    };
  }

  // Konversi gambar ke WebP dengan kualitas 80% (balance antara ukuran & kualitas)
  const webpBuffer = await sharp(file.buffer)
    .webp({ quality: 80 })
    .toBuffer();

  // Ganti ekstensi file ke .webp
  const nameWithoutExt = file.originalname.replace(/\.[^.]+$/, '');

  return {
    buffer: webpBuffer,
    mimetype: 'image/webp',
    originalname: `${nameWithoutExt}.webp`
  };
};

export default convertToWebp;
