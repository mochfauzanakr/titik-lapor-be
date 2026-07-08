const errorHandler = (err, req, res, next) => {
  // Kalau error nggak bawa status code, dianggap itu Internal Server Error
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Terjadi kesalahan pada server!';

  // Tangkap Error Spesifik dari Multer
  if (err.code === 'LIMIT_FILE_SIZE') {
    statusCode = 400; 
    message = 'Ukuran file terlalu besar! Maksimal 10MB.';
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    statusCode = 400;
    message = 'Format file tidak didukung! Hanya menerima gambar (JPEG/PNG) dan video (MP4/MKV). Atau field name salah, pastikan menggunakan "attachment".';
  }

  if (err.code === 'MISSING_FIELD_NAME') {
    statusCode = 400;
    message = 'Field name untuk file tidak ditemukan dalam request.';
  }

  // Tangkap Error Spesifik dari Prisma (Contoh: Data duplikat / Unique Constraint)
  // Kode P2002 adalah kode Prisma kalau ada data yang unik tapi dimasukin dobel (misal email/nomor HP)
  if (err.code === 'P2002') {
    statusCode = 400;
    message = `Data duplikat terdeteksi pada field: ${err.meta?.target}. Silakan gunakan data lain.`;
  }

  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Token tidak valid atau sudah rusak. Silakan login kembali.';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Sesi login Anda sudah habis. Silakan login kembali.';
  }

  const errorResponse = {
    success: false,
    message: message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  };

  res.status(statusCode).json(errorResponse);
};

export default errorHandler;