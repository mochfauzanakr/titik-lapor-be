import prisma from '../config/prisma.js';
import catchAsync from '../utils/catchAsync.js';
import serializeBigInt from '../utils/serializeBigInt.js';

// ============================================================
// GET /api/category
// ============================================================
export const getAllCategories = catchAsync(async (req, res, next) => {
  const categories = await prisma.kategoriLaporan.findMany({
    where: { isActive: true },
    orderBy: { namaKategori: 'asc' }
  });

  res.status(200).json(serializeBigInt({
    success: true,
    message: "Berhasil mengambil data kategori",
    data: categories
  }));
});

// ============================================================
// GET /api/category/all
// ============================================================
export const getAllCategoriesAdmin = catchAsync(async (req, res, next) => {
  const categories = await prisma.kategoriLaporan.findMany({
    orderBy: { namaKategori: 'asc' },
    include: {
      _count: {
        select: { laporan: true }
      }
    }
  });

  res.status(200).json(serializeBigInt({
    success: true,
    message: "Berhasil mengambil semua data kategori (termasuk nonaktif)",
    data: categories
  }));
});

// ============================================================
// POST /api/category
// ============================================================
export const createCategory = catchAsync(async (req, res, next) => {
  const { namaKategori } = req.body;

  if (!namaKategori || !namaKategori.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Nama kategori wajib diisi!'
    });
  }

  const existing = await prisma.kategoriLaporan.findFirst({
    where: { namaKategori: namaKategori.trim() }
  });

  if (existing) {
    return res.status(400).json({
      success: false,
      message: 'Kategori dengan nama tersebut sudah ada!'
    });
  }

  const newCategory = await prisma.kategoriLaporan.create({
    data: {
      namaKategori: namaKategori.trim()
    }
  });

  res.status(201).json(serializeBigInt({
    success: true,
    message: 'Kategori berhasil dibuat!',
    data: newCategory
  }));
});

// ============================================================
// PUT /api/category/:id
// ============================================================
export const updateCategory = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { namaKategori } = req.body;

  if (!namaKategori || !namaKategori.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Nama kategori wajib diisi!'
    });
  }

  const category = await prisma.kategoriLaporan.findUnique({
    where: { id: BigInt(id) }
  });

  if (!category) {
    return res.status(404).json({
      success: false,
      message: 'Kategori tidak ditemukan.'
    });
  }

  const duplicate = await prisma.kategoriLaporan.findFirst({
    where: {
      namaKategori: namaKategori.trim(),
      id: { not: BigInt(id) }
    }
  });

  if (duplicate) {
    return res.status(400).json({
      success: false,
      message: 'Kategori dengan nama tersebut sudah ada!'
    });
  }

  const updated = await prisma.kategoriLaporan.update({
    where: { id: BigInt(id) },
    data: { namaKategori: namaKategori.trim() }
  });

  res.status(200).json(serializeBigInt({
    success: true,
    message: 'Kategori berhasil diperbarui!',
    data: updated
  }));
});

// ============================================================
// DELETE /api/category/:id
// ============================================================
export const deleteCategory = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const category = await prisma.kategoriLaporan.findUnique({
    where: { id: BigInt(id) }
  });

  if (!category) {
    return res.status(404).json({
      success: false,
      message: 'Kategori tidak ditemukan.'
    });
  }

  if (!category.isActive) {
    return res.status(400).json({
      success: false,
      message: 'Kategori ini sudah dinonaktifkan sebelumnya.'
    });
  }

  const updated = await prisma.kategoriLaporan.update({
    where: { id: BigInt(id) },
    data: { isActive: false }
  });

  res.status(200).json(serializeBigInt({
    success: true,
    message: 'Kategori berhasil dinonaktifkan (soft delete).',
    data: updated
  }));
});

// ============================================================
// PATCH /api/category/:id/restore
// ============================================================
export const restoreCategory = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const category = await prisma.kategoriLaporan.findUnique({
    where: { id: BigInt(id) }
  });

  if (!category) {
    return res.status(404).json({
      success: false,
      message: 'Kategori tidak ditemukan.'
    });
  }

  if (category.isActive) {
    return res.status(400).json({
      success: false,
      message: 'Kategori ini sudah aktif.'
    });
  }

  const updated = await prisma.kategoriLaporan.update({
    where: { id: BigInt(id) },
    data: { isActive: true }
  });

  res.status(200).json(serializeBigInt({
    success: true,
    message: 'Kategori berhasil diaktifkan kembali!',
    data: updated
  }));
});