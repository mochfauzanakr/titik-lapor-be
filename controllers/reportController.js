import prisma from "../config/prisma.js";
import { supabase } from "../config/supabase.js";
import catchAsync from "../utils/catchAsync.js";
import parseCoordinate from "../utils/parseCoordinate.js";
import serializeBigInt from "../utils/serializeBigInt.js";
import generateNomorResi from "../utils/generateNomorResi.js";

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

// ============================================================
// ATURAN TRANSISI STATUS (dipakai di updateReportStatus)
// pending  → diproses | ditolak
// diproses → selesai
// selesai  → (tidak bisa diubah)
// ditolak  → (tidak bisa diubah)
// ============================================================
const ALLOWED_TRANSITIONS = {
  pending: ['diproses', 'ditolak'],
  diproses: ['selesai'],
  selesai: [],
  ditolak: [] 
};

// ============================================================
// POST /api/reports — Buat laporan baru
// ============================================================
export const createReport = catchAsync(async (req, res, next) => {

  const { kategoriId, judul, deskripsi, lat, lng, alamat } = req.body;
  const file = req.file;
  const userId = req.user.id;

  if (!file) {
    return res.status(400).json({
      success: false,
      message: 'Lampiran (attachment) wajib dikirim!'
    });
  }

  const parsedLat = parseCoordinate(lat, 'lat');
  const parsedLng = parseCoordinate(lng, 'lng');

  if (!kategoriId || !judul || parsedLat === null || parsedLng === null) {
    return res.status(400).json({
      success: false,
      message: 'Data tidak lengkap atau koordinat tidak valid! Kategori, judul, lat, dan lng wajib diisi.'
    });
  }

  const uniqueFilename = `${Date.now()}-${file.originalname.replace(/\s/g, '-')}`;
  const { error: uploadError } = await supabase
    .storage
    .from('laporan_image')
    .upload(`lampiran/${uniqueFilename}`, file.buffer, { contentType: file.mimetype });

  if (uploadError) throw new Error(`Gagal upload ke Supabase: ${uploadError.message}`);

  const { data: publicUrlData } = supabase
    .storage
    .from('laporan_image')
    .getPublicUrl(`lampiran/${uniqueFilename}`);

  const fileUrl = publicUrlData.publicUrl;

  const nomorResi = await generateNomorResi();

  const newReport = await prisma.laporan.create({
    data: {
      userId: userId,
      kategoriId: BigInt(kategoriId),
      judul: judul,
      deskripsi: deskripsi || null,
      lat: parsedLat,
      lng: parsedLng,
      alamat: alamat || null,
      mediaUrls: [fileUrl],
      nomorResi: nomorResi
    }
  });

  const responseData = serializeBigInt(newReport);

  res.status(201).json({
    success: true,
    message: 'Laporan berhasil dibuat!',
    data: responseData
  });
});

// ============================================================
// PUT /api/reports/:id — Edit laporan (pemilik, status pending)
// ============================================================
export const editReport = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const userId = req.user.id;
  const { kategoriId, judul, deskripsi, lat, lng, alamat } = req.body;
  const file = req.file;

  const existingReport = await prisma.laporan.findUnique({
    where: { id: id }
  });

  if (!existingReport) {
    return res.status(404).json({ success: false, message: 'Laporan tidak ditemukan.' });
  }

  if (existingReport.userId !== userId) {
    return res.status(403).json({ success: false, message: 'Akses ditolak! Anda hanya bisa mengedit laporan milik sendiri.' });
  }

  if (existingReport.status !== 'pending') {
    return res.status(400).json({
      success: false,
      message: `Laporan tidak bisa diedit karena status saat ini adalah '${existingReport.status}'.`
    });
  }

  const parsedLat = lat ? parseCoordinate(lat, 'lat') : existingReport.lat;
  const parsedLng = lng ? parseCoordinate(lng, 'lng') : existingReport.lng;

  if ((lat && parsedLat === null) || (lng && parsedLng === null)) {
    return res.status(400).json({ success: false, message: 'Format latitude atau longitude baru tidak valid!' });
  }

  let updatedMediaUrls = existingReport.mediaUrls;

  if (file) {
    const uniqueFilename = `${Date.now()}-${file.originalname.replace(/\s/g, '-')}`;
    const { error: uploadError } = await supabase
      .storage
      .from('laporan_image')
      .upload(`lampiran/${uniqueFilename}`, file.buffer, { contentType: file.mimetype });

    if (uploadError) throw new Error(`Gagal upload file baru ke Supabase: ${uploadError.message}`);

    const { data: publicUrlData } = supabase
      .storage
      .from('laporan_image')
      .getPublicUrl(`lampiran/${uniqueFilename}`);

    if (existingReport.mediaUrls && existingReport.mediaUrls.length > 0) {
      const oldFilePaths = existingReport.mediaUrls
        .map(url => extractStoragePath(url))
        .filter(Boolean);


      if (oldFilePaths.length > 0) {
        const { data: removeData, error: removeError } = await supabase.storage.from('laporan_image').remove(oldFilePaths);
        if (removeError) {
          console.error('Gagal hapus file lama dari Supabase:', removeError.message);
        } else {
          console.log('File lama berhasil dihapus:', removeData);
        }
      }
    }

    updatedMediaUrls = [publicUrlData.publicUrl];
  }


  const updatedReport = await prisma.laporan.update({
    where: { id: id },
    data: {
      judul: judul || existingReport.judul,
      deskripsi: deskripsi !== undefined ? deskripsi : existingReport.deskripsi,
      kategoriId: kategoriId ? BigInt(kategoriId) : existingReport.kategoriId,
      lat: parsedLat,
      lng: parsedLng,
      alamat: alamat !== undefined ? alamat : existingReport.alamat,
      mediaUrls: updatedMediaUrls
    }
  });

  const responseData = serializeBigInt(updatedReport);

  res.status(200).json({
    success: true,
    message: 'Laporan berhasil diperbarui!',
    data: responseData
  });
});

// ============================================================
// GET /api/reports — Ambil semua laporan 
// ============================================================
export const getAllReports = catchAsync(async (req, res, next) => {
  // Setup Pagination (Ambil dari query URL, contoh: ?page=1&limit=10) 
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  // Filter : ?kategoriId=1&status=pending&sort=asc
  const { kategoriId, status, sort } = req.query;
  const where = {};

  if (kategoriId) {
    where.kategoriId = BigInt(kategoriId);
  }

  if (status) {
    const validStatuses = ['pending', 'diproses', 'selesai', 'ditolak'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Status tidak valid! Pilihan: ${validStatuses.join(', ')}`
      });
    }
    where.status = status;
  }

  const [reports, totalItems] = await Promise.all([
    prisma.laporan.findMany({
    where,
    skip: skip,
    take: limit,
    orderBy: {
      createdAt: sort === 'asc' ? 'asc' : 'desc'
    },
    select: {
      id: true,
      nomorResi: true,
      judul: true,
      status: true,
      createdAt: true,
      mediaUrls: true,
      kategori_laporan: {
        select: {
          namaKategori: true
        }
      },
      users: {
        select: {
          id: true,
          username: true
        }
      },
      _count: {
        select: { comments: true, tanggapan: true }
      }
    }
  }),
    prisma.laporan.count({ where })
  ]);
  const totalPages = Math.ceil(totalItems / limit);

  const serializedReports = serializeBigInt(reports);

  res.status(200).json({
    success: true,
    message: 'Berhasil mengambil daftar laporan',
    data: serializedReports,
    meta: {
      currentPage: page,
      limit: limit,
      totalItems: totalItems,
      totalPages: totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    }
  });
});

// ============================================================
// GET /api/reports/me — Ambil laporan milik user
// ============================================================
export const getMyReports = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  const status = req.query.status;

  const where = { userId };

  if (status) {
    const validStatuses = ['pending', 'diproses', 'selesai', 'ditolak'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Status tidak valid! Pilihan: ${validStatuses.join(', ')}`
      });
    }
    where.status = status;
  }

  const [reports, totalItems] = await Promise.all([
    prisma.laporan.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: req.query.sort === 'asc' ? 'asc' : 'desc' },
      select: {
        id: true,
        nomorResi: true,
        judul: true,
        deskripsi: true,
        status: true,
        createdAt: true,
        mediaUrls: true,
        kategori_laporan: {
          select: { namaKategori: true }
        },
        tanggapan: {
          select: { isi_tanggapan: true },
          orderBy: { createdAt: 'desc' },
          take: 1
        },
        _count: {
          select: { comments: true, tanggapan: true }
        }
      }
    }),
    prisma.laporan.count({ where })
  ]);

  const totalPages = Math.ceil(totalItems / limit);

  res.status(200).json(serializeBigInt({
    success: true,
    message: 'Berhasil mengambil laporan Anda.',
    data: reports,
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

// ============================================================
// GET /api/reports/search?resi=TL-2026-XXX — Cari laporan via nomor resi
// ============================================================
export const searchByNomorResi = catchAsync(async (req, res, next) => {
  const { resi } = req.query;

  if (!resi || !resi.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Parameter pencarian "resi" wajib diisi!'
    });
  }

  const reports = await prisma.laporan.findMany({
    where: {
      nomorResi: {
        contains: resi.trim()
      }
    },
    select: {
      id: true,
      nomorResi: true,
      judul: true,
      status: true,
      createdAt: true,
      kategori_laporan: {
        select: { namaKategori: true }
      },
      users: {
        select: { id: true, username: true }
      }
    },
    take: 10
  });

  res.status(200).json(serializeBigInt({
    success: true,
    message: reports.length > 0
      ? 'Laporan ditemukan.'
      : 'Tidak ada laporan dengan nomor resi tersebut.',
    data: reports
  }));
});

// ============================================================
// GET /api/reports/:id — Ambil detail laporan lengkap
// ============================================================
export const getReportDetail = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const userId = req.user?.id ?? null;
  const userRole = req.user?.role ?? null;

  const report = await prisma.laporan.findUnique({
    where: { id },
    include: {
      users: {
        select: { id: true, username: true }
      },
      kategori_laporan: {
        select: { id: true, namaKategori: true }
      },
      tanggapan: {
        orderBy: { createdAt: 'asc' },
        include: {
          users: {
            select: { id: true, username: true, role: true }
          },
          comments: {
            orderBy: { createdAt: 'asc' },
            include: {
              users: {
                select: { id: true, username: true }
              }
            }
          }
        }
      },
      comments: {
        where: { tanggapanId: null },
        orderBy: { createdAt: 'asc' },
        include: {
          users: {
            select: { id: true, username: true }
          }
        }
      }
    }
  });

  if (!report) {
    return res.status(404).json({
      success: false,
      message: 'Laporan tidak ditemukan.'
    });
  }

  const isPrivateStatus = report.status === 'pending' || report.status === 'ditolak';
  const isOwner = report.userId === userId;
  const isPrivileged = userRole === 'admin' || userRole === 'petugas';

  if (isPrivateStatus && !isOwner && !isPrivileged) {
    return res.status(403).json({
      success: false,
      message: 'Anda tidak memiliki izin untuk melihat laporan ini!'
    });
  }

  res.status(200).json(serializeBigInt({
    success: true,
    message: 'Berhasil mengambil detail laporan.',
    data: report
  }));
});

// ============================================================
// DELETE /api/reports/:id — Hapus laporan (pembuat laporan atau admin)
// ============================================================
export const deleteReport = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const userId = req.user.id;
  const userRole = req.user.role;

  const report = await prisma.laporan.findUnique({
    where: { id },
    include: {
      tanggapan: {
        select: { mediaUrls: true }
      }
    }
  });

  if (!report) {
    return res.status(404).json({
      success: false,
      message: 'Laporan tidak ditemukan.'
    });
  }

  if (report.userId !== userId && userRole !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Anda tidak memiliki izin untuk menghapus laporan ini!'
    });
  }

  const allMediaUrls = [
    ...(report.mediaUrls || []),
    ...report.tanggapan.flatMap(t => t.mediaUrls || [])
  ];

  const filePaths = allMediaUrls
    .map(url => extractStoragePath(url))
    .filter(Boolean);

  if (filePaths.length > 0) {
    await supabase.storage.from('laporan_image').remove(filePaths);
  }

  await prisma.laporan.delete({
    where: { id }
  });

  res.status(200).json({
    success: true,
    message: 'Laporan berhasil dihapus!'
  });
});

// ============================================================
// PATCH /api/reports/:id/status — Update status laporan (admin/petugas)
// ============================================================
export const updateReportStatus = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({
      success: false,
      message: 'Status baru wajib diisi!'
    });
  }

  const validStatuses = ['pending', 'diproses', 'selesai', 'ditolak'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      message: `Status tidak valid! Pilihan: ${validStatuses.join(', ')}`
    });
  }

  const report = await prisma.laporan.findUnique({
    where: { id }
  });

  if (!report) {
    return res.status(404).json({
      success: false,
      message: 'Laporan tidak ditemukan.'
    });
  }

  const allowed = ALLOWED_TRANSITIONS[report.status] || [];
  if (!allowed.includes(status)) {
    return res.status(400).json({
      success: false,
      message: `Transisi status tidak valid! Status '${report.status}' hanya bisa diubah ke: ${allowed.length > 0 ? allowed.join(', ') : '(tidak ada transisi yang diizinkan)'}`
    });
  }

  const updated = await prisma.laporan.update({
    where: { id },
    data: { status }
  });

  res.status(200).json(serializeBigInt({
    success: true,
    message: `Status laporan berhasil diubah menjadi '${status}'.`,
    data: updated
  }));
});

// ============================================================
// GET /api/reports/news — Ambil laporan untuk fitur News (tanpa pending, include tanggapan)
// ============================================================
export const getNewsReports = catchAsync(async (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  const { kategoriId, status, sort } = req.query;

  const where = {
    status: {
      in: ['diproses', 'selesai']
    }
  };

  if (kategoriId) {
    where.kategoriId = BigInt(kategoriId);
  }

  if (status) {
    const validStatuses = ['diproses', 'selesai'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Status tidak valid untuk news! Pilihan: ${validStatuses.join(', ')}`
      });
    }
    where.status = status;
  }

  const reports = await prisma.laporan.findMany({
    where,
    skip,
    take: limit,
    orderBy: { createdAt: sort === 'asc' ? 'asc' : 'desc' },
    select: {
      id: true,
      nomorResi: true,
      judul: true,
      deskripsi: true,
      status: true,
      createdAt: true,
      mediaUrls: true,
      kategori_laporan: {
        select: { namaKategori: true }
      },
      users: {
        select: { id: true, username: true }
      },
      tanggapan: {
        orderBy: { createdAt: 'asc' },
        include: {
          users: { select: { id: true, username: true, role: true } }
        }
      },
      _count: {
        select: { comments: true }
      }
    }
  });

  const totalItems = await prisma.laporan.count({ where });
  const totalPages = Math.ceil(totalItems / limit);

  res.status(200).json({
    success: true,
    message: 'Berhasil mengambil berita laporan',
    data: serializeBigInt(reports),
    meta: {
      currentPage: page,
      limit,
      totalItems,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    }
  });
});
