import prisma from "../config/prisma.js";
import { supabase } from "../config/supabase.js";
import catchAsync from "../utils/catchAsync.js";
import serializeBigInt from "../utils/serializeBigInt.js";

// ============================================================
// HELPER: Ekstrak path file Supabase dari URL publik
// ============================================================
const extractStoragePath = (publicUrl) => {
  const bucketName = 'laporan_image';
  const marker = `/object/public/${bucketName}/`;
  const index = publicUrl.indexOf(marker);
  if (index === -1) return null;
  return publicUrl.substring(index + marker.length);
};

/**
 * POST /api/reports/:laporanId/tanggapan
 */
export const createTanggapan = catchAsync(async (req, res, next) => {
  const { laporanId } = req.params;
  const { isi_tanggapan } = req.body;
  const petugasId = req.user.id;
  const file = req.file;

  if (!isi_tanggapan || !isi_tanggapan.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Isi tanggapan wajib diisi!'
    });
  }

  const laporan = await prisma.laporan.findUnique({
    where: { id: laporanId }
  });

  if (!laporan) {
    return res.status(404).json({
      success: false,
      message: 'Laporan tidak ditemukan.'
    });
  }


  if (laporan.status === 'pending') {
    return res.status(400).json({
      success: false,
      message: 'Tanggapan tidak bisa dibuat pada laporan yang masih berstatus pending. Ubah status laporan terlebih dahulu.'
    });
  }

  let mediaUrls = [];
  if (file) {
    const uniqueFilename = `${Date.now()}-${file.originalname.replace(/\s/g, '-')}`;
    const { error: uploadError } = await supabase
      .storage
      .from('laporan_image')
      .upload(`tanggapan/${uniqueFilename}`, file.buffer, { contentType: file.mimetype });

    if (uploadError) throw new Error(`Gagal upload ke Supabase: ${uploadError.message}`);

    const { data: publicUrlData } = supabase
      .storage
      .from('laporan_image')
      .getPublicUrl(`tanggapan/${uniqueFilename}`);

    mediaUrls = [publicUrlData.publicUrl];
  }

  const newTanggapan = await prisma.tanggapan.create({
    data: {
      petugasId,
      laporanId,
      isi_tanggapan: isi_tanggapan.trim(),
      mediaUrls
    },
    include: {
      users: {
        select: { id: true, username: true, role: true }
      }
    }
  });

  res.status(201).json(serializeBigInt({
    success: true,
    message: 'Tanggapan berhasil dibuat!',
    data: newTanggapan
  }));
});

/**
 * GET /api/reports/:laporanId/tanggapan
 */
export const getTanggapanByLaporan = catchAsync(async (req, res, next) => {
  const { laporanId } = req.params;

  // pagination params (default page=1, limit=10)
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;


  const laporan = await prisma.laporan.findUnique({
    where: { id: laporanId }
  });

  if (!laporan) {
    return res.status(404).json({
      success: false,
      message: 'Laporan tidak ditemukan.'
    });
  }

  const [totalItems, tanggapanList] = await Promise.all([
    prisma.tanggapan.count({ where: { laporanId } }),
    prisma.tanggapan.findMany({
    where: { laporanId },
    orderBy: { createdAt: 'asc' },
    skip,
    take: limit,
    include: {
      users: {
        select: { id: true, username: true, role: true }
      },
      comments: {
        orderBy: { createdAt: 'asc' },
        include: {
          users: { select: { id: true, username: true } }
        }
      },
      _count: { select: { comments: true } }
    }
  })
  ]);

  const totalPages = Math.ceil(totalItems / limit);

  res.status(200).json(serializeBigInt({
    success: true,
    message: 'Berhasil mengambil data tanggapan.',
    data: tanggapanList,
    meta: {
      currentPage: page,
      limit,
      totalItems,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    }
  }));
});

/**
 * PUT /api/reports/:laporanId/tanggapan/:tanggapanId
 */
export const editTanggapan = catchAsync(async (req, res, next) => {
  const { laporanId, tanggapanId } = req.params;
  const { isi_tanggapan } = req.body;
  const petugasId = req.user.id;
  const file = req.file;

  const tanggapan = await prisma.tanggapan.findUnique({
    where: { id: tanggapanId }
  });

  if (!tanggapan) {
    return res.status(404).json({ success: false, message: 'Tanggapan tidak ditemukan.' });
  }

  // Cek otorisasi
  if (tanggapan.petugasId !== petugasId) {
    return res.status(403).json({ success: false, message: 'Anda tidak memiliki izin mengedit tanggapan ini.' });
  }

  let mediaUrls = tanggapan.mediaUrls || [];

  if (file) {
    const uniqueFilename = `${Date.now()}-${file.originalname.replace(/\s/g, '-')}`;
    const { error: uploadError } = await supabase
      .storage
      .from('laporan_image')
      .upload(`tanggapan/${uniqueFilename}`, file.buffer, { contentType: file.mimetype });

    if (uploadError) throw new Error(`Gagal upload ke Supabase: ${uploadError.message}`);

    const { data: publicUrlData } = supabase
      .storage
      .from('laporan_image')
      .getPublicUrl(`tanggapan/${uniqueFilename}`);

    // Hapus file lama
    if (mediaUrls.length > 0) {
      const oldPaths = mediaUrls.map(extractStoragePath).filter(Boolean);
      if (oldPaths.length > 0) {
        await supabase.storage.from('laporan_image').remove(oldPaths);
      }
    }

    mediaUrls = [publicUrlData.publicUrl];
  }

  const updatedTanggapan = await prisma.tanggapan.update({
    where: { id: tanggapanId },
    data: {
      isi_tanggapan: isi_tanggapan !== undefined ? isi_tanggapan.trim() : tanggapan.isi_tanggapan,
      mediaUrls
    },
    include: {
      users: { select: { id: true, username: true, role: true } }
    }
  });

  res.status(200).json(serializeBigInt({
    success: true,
    message: 'Tanggapan berhasil diperbarui!',
    data: updatedTanggapan
  }));
});

/**
 * DELETE /api/reports/:laporanId/tanggapan/:tanggapanId
 */
export const deleteTanggapan = catchAsync(async (req, res, next) => {
  const { laporanId, tanggapanId } = req.params;
  const petugasId = req.user.id;

  const tanggapan = await prisma.tanggapan.findUnique({
    where: { id: tanggapanId }
  });

  if (!tanggapan) {
    return res.status(404).json({ success: false, message: 'Tanggapan tidak ditemukan.' });
  }

  if (tanggapan.petugasId !== petugasId && req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Anda tidak memiliki izin menghapus tanggapan ini.' });
  }

  // Hapus gambar jika ada
  if (tanggapan.mediaUrls && tanggapan.mediaUrls.length > 0) {
    const pathsToRemove = tanggapan.mediaUrls.map(extractStoragePath).filter(Boolean);
    if (pathsToRemove.length > 0) {
      await supabase.storage.from('laporan_image').remove(pathsToRemove);
    }
  }

  await prisma.tanggapan.delete({
    where: { id: tanggapanId }
  });

  res.status(200).json({
    success: true,
    message: 'Tanggapan berhasil dihapus!'
  });
});
