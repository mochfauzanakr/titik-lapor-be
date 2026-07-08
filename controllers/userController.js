import prisma from '../config/prisma.js';
import serializeBigInt from '../utils/serializeBigInt.js';
import catchAsync from '../utils/catchAsync.js';
import bcrypt from 'bcrypt';
// ============================================================
// GET /api/users
// ============================================================
export const getAllUsers = catchAsync(async (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  // Filter opsional: ?role=petugas&search=john
  const { role, search } = req.query;
  const where = {};

  if (role) {
    const validRoles = ['user', 'petugas', 'admin'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: `Role tidak valid! Pilihan: ${validRoles.join(', ')}`
      });
    }
    where.role = role;
  }

  if (search && search.trim()) {
    where.OR = [
      { username: { contains: search.trim() } },
      { email: { contains: search.trim() } }
    ];
  }

  const [users, totalItems] = await Promise.all([
    prisma.users.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        username: true,
        phoneNumber: true,
        role: true,
        isActive: true,
        createdAt: true,
      }
    }),
    prisma.users.count({ where })
  ]);

  const totalPages = Math.ceil(totalItems / limit);

  res.status(200).json(serializeBigInt({
    success: true,
    message: "Berhasil mengambil data pengguna",
    data: users,
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
// POST /api/users/petugas
// ============================================================
export const addPetugas = catchAsync(async (req, res, next) => {
  const { email, password, username, phoneNumber } = req.body;
  
  if (!email || !password || !username || !phoneNumber) {
    return res.status(400).json({ success: false, message: "Email, password, username, dan phoneNumber harus diisi" });
  }

  const existingEmail = await prisma.users.findUnique({ where: { email } });
  if (existingEmail) {
    return res.status(400).json({ success: false, message: "Email sudah digunakan" });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  
  const newPetugas = await prisma.users.create({
    data: {
      email,
      username,
      phoneNumber,
      password: hashedPassword,
      role: 'petugas',
    },
    select: {
      id: true,
      email: true,
      username: true,
      phoneNumber: true,
      role: true,
      createdAt: true
    }
  });

  res.status(201).json(serializeBigInt({ 
    success: true, 
    message: "Petugas berhasil ditambahkan", 
    data: newPetugas 
  }));
});

// ============================================================
// GET /api/users/:id
// ============================================================
export const getUserById = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const user = await prisma.users.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      username: true,
      phoneNumber: true,
      role: true,
      isActive: true,
      createdAt: true,
      _count: {
        select: {
          laporan: true,
          comments: true
        }
      }
    }
  });

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User tidak ditemukan.'
    });
  }

  res.status(200).json(serializeBigInt({
    success: true,
    message: 'Berhasil mengambil data user.',
    data: user
  }));
});

// ============================================================
// PUT /api/users/:id
// ============================================================
export const updateUser = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { username, phoneNumber, email, role } = req.body;

  const user = await prisma.users.findUnique({
    where: { id }
  });

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User tidak ditemukan.'
    });
  }

  // Cek jika mencoba mengubah data Admin lain
  if (user.role === 'admin' && req.user.id !== user.id) {
    return res.status(403).json({
      success: false,
      message: 'Tidak diizinkan mengubah data Admin lain!'
    });
  }

  // Validasi role jika disediakan
  if (role) {
    const validRoles = ['user', 'petugas']; // admin dihapus dari validRoles yang bisa di-assign
    if (role === 'admin' && user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Tidak diizinkan mengangkat pengguna menjadi Admin!'
      });
    }
    
    if (user.role !== 'admin' && !validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: `Role tidak valid! Pilihan: ${validRoles.join(', ')}`
      });
    }
  }

  // Cek duplikat email jika berubah
  if (email && email !== user.email) {
    const emailExists = await prisma.users.findUnique({
      where: { email }
    });
    if (emailExists) {
      return res.status(400).json({
        success: false,
        message: 'Email sudah digunakan oleh user lain!'
      });
    }
  }

  // Cek duplikat phoneNumber jika berubah
  if (phoneNumber && phoneNumber !== user.phoneNumber) {
    const phoneExists = await prisma.users.findUnique({
      where: { phoneNumber }
    });
    if (phoneExists) {
      return res.status(400).json({
        success: false,
        message: 'Nomor telepon sudah digunakan oleh user lain!'
      });
    }
  }

  const updatedUser = await prisma.users.update({
    where: { id },
    data: {
      username: username || user.username,
      phoneNumber: phoneNumber || user.phoneNumber,
      email: email || user.email,
      role: role || user.role
    },
    select: {
      id: true,
      email: true,
      username: true,
      phoneNumber: true,
      role: true,
      isActive: true,
      createdAt: true
    }
  });

  res.status(200).json(serializeBigInt({
    success: true,
    message: 'Data user berhasil diperbarui!',
    data: updatedUser
  }));
});

// ============================================================
// DELETE /api/users/:id
// ============================================================
export const deleteUser = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const user = await prisma.users.findUnique({
    where: { id }
  });

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User tidak ditemukan.'
    });
  }

  // Proteksi: admin tidak bisa menghapus dirinya sendiri
  if (id === req.user.id) {
    return res.status(400).json({
      success: false,
      message: 'Anda tidak bisa menonaktifkan akun sendiri!'
    });
  }

  // Proteksi: tidak bisa menghapus akun admin lain
  if (user.role === 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Akun Admin tidak bisa dinonaktifkan!'
    });
  }

  if (!user.isActive) {
    return res.status(400).json({
      success: false,
      message: 'User ini sudah dinonaktifkan sebelumnya.'
    });
  }

  const updated = await prisma.users.update({
    where: { id },
    data: { isActive: false },
    select: {
      id: true,
      email: true,
      username: true,
      role: true,
      isActive: true
    }
  });

  res.status(200).json(serializeBigInt({
    success: true,
    message: 'User berhasil dinonaktifkan (soft delete).',
    data: updated
  }));
});

// ============================================================
// PATCH /api/users/:id/restore
// ============================================================
export const restoreUser = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const user = await prisma.users.findUnique({
    where: { id }
  });

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User tidak ditemukan.'
    });
  }

  if (user.isActive) {
    return res.status(400).json({
      success: false,
      message: 'User ini sudah aktif.'
    });
  }

  // Proteksi: mencegah interaksi tak terduga dengan akun admin
  if (user.role === 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Akun Admin tidak bisa diubah statusnya melalui fitur ini!'
    });
  }

  const updated = await prisma.users.update({
    where: { id },
    data: { isActive: true },
    select: {
      id: true,
      email: true,
      username: true,
      role: true,
      isActive: true
    }
  });

  res.status(200).json(serializeBigInt({
    success: true,
    message: 'User berhasil diaktifkan kembali!',
    data: updated
  }));
});