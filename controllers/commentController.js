import prisma from "../config/prisma.js";
import catchAsync from "../utils/catchAsync.js";
import serializeBigInt from "../utils/serializeBigInt.js";

/**
 * POST /api/reports/:laporanId/comments
 */
export const createComment = catchAsync(async (req, res, next) => {
  const { laporanId } = req.params;
  const { body} = req.body;
  const userId = req.user.id;

  if (!body || !body.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Isi komentar wajib diisi!'
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


  if (laporan.status === 'pending' || laporan.status === 'ditolak') {
    return res.status(400).json({
      success: false,
      message: 'Komentar tidak dapat ditambahkan karena laporan masih dalam status pending atau telah ditolak.'
    });
  }

  const newComment = await prisma.comments.create({
    data: {
      laporanId,
      userId,
      body: body.trim()
    },
    include: {
      users: {
        select: { id: true, username: true }
      }
    }
  });

  res.status(201).json(serializeBigInt({
    success: true,
    message: 'Komentar berhasil ditambahkan!',
    data: newComment
  }));
});

/**
 * GET /api/reports/:laporanId/comments
 */
export const getCommentsByLaporan = catchAsync(async (req, res, next) => {
  const { laporanId } = req.params;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  const [comments, totalItems] = await Promise.all([
    prisma.comments.findMany({
      where: {
        laporanId,
        tanggapanId: null
      },
      skip,
      take: limit,
      orderBy: { createdAt: 'asc' },
      include: {
        users: {
          select: { id: true, username: true }
        }
      }
    }),
    prisma.comments.count({
      where: {
        laporanId,
        tanggapanId: null
      }
    })
  ]);

  const totalPages = Math.ceil(totalItems / limit);

  res.status(200).json(serializeBigInt({
    success: true,
    message: 'Berhasil mengambil komentar.',
    data: comments,
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
 * PUT /api/reports/:laporanId/comments/:commentId
 */
export const editComment = catchAsync(async (req, res, next) => {
  const { commentId } = req.params;
  const { body } = req.body;
  const userId = req.user.id;

  if (!body || !body.trim()) {
    return res.status(400).json({
      success: false,
      message: 'Isi komentar wajib diisi!'
    });
  }

  const comment = await prisma.comments.findUnique({
    where: { id: BigInt(commentId) }
  });

  if (!comment) {
    return res.status(404).json({
      success: false,
      message: 'Komentar tidak ditemukan.'
    });
  }

  if (comment.userId !== userId) {
    return res.status(403).json({
      success: false,
      message: 'Anda hanya bisa mengedit komentar milik sendiri!'
    });
  }

  const updatedComment = await prisma.comments.update({
    where: { id: BigInt(commentId) },
    data: { body: body.trim() },
    include: {
      users: {
        select: { id: true, username: true }
      }
    }
  });

  res.status(200).json(serializeBigInt({
    success: true,
    message: 'Komentar berhasil diperbarui!',
    data: updatedComment
  }));
});

/**
 * DELETE /api/reports/:laporanId/comments/:commentId
 */
export const deleteComment = catchAsync(async (req, res, next) => {
  const { commentId } = req.params;
  const userId = req.user.id;
  const userRole = req.user.role;


  const comment = await prisma.comments.findUnique({
    where: { id: BigInt(commentId) }
  });

  if (!comment) {
    return res.status(404).json({
      success: false,
      message: 'Komentar tidak ditemukan.'
    });
  }

  if (comment.userId !== userId && userRole !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Anda tidak memiliki izin untuk menghapus komentar ini!'
    });
  }

  // 3. Hapus komentar
  await prisma.comments.delete({
    where: { id: BigInt(commentId) }
  });

  res.status(200).json({
    success: true,
    message: 'Komentar berhasil dihapus!'
  });
});
