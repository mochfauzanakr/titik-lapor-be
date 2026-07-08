import prisma from '../config/prisma.js';

/**
 * Generate nomor resi unik untuk laporan.
 * Format: TL-{YYYYMM}-{10 karakter alfanumerik acak}
 * Contoh: TL-202605-A3F8K2BXNQ
 */
const generateNomorResi = async () => {
  const now = new Date();
  const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const RANDOM_LENGTH = 10;
  const MAX_ATTEMPTS = 10;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    let randomPart = '';
    for (let i = 0; i < RANDOM_LENGTH; i++) {
      randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    const nomorResi = `TL-${yearMonth}-${randomPart}`;

    const existing = await prisma.laporan.findUnique({
      where: { nomorResi }
    });

    if (!existing) {
      return nomorResi;
    }
  }

  throw new Error('Gagal generate nomor resi unik setelah beberapa percobaan.');
};

export default generateNomorResi;
