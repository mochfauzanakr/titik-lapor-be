import prisma from '../config/prisma.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import catchAsync from '../utils/catchAsync.js';


export const registerUser = catchAsync(async (req, res, next) => {
  const { email, password, name, phoneNumber } = req.body;
  if (!email || !password || !name || !phoneNumber) {
    return res.status(400).json({ error: "Email, password, username, dan p_number harus diisi" });
  }

  // Cek apakah email sudah terdaftar
  const existingUser = await prisma.users.findUnique({
    where: { email },
  });

  if (existingUser) {
    return res.status(400).json({ success: false, error: "Email sudah terdaftar" });
  }

  // Cek apakah nomor telepon sudah terdaftar
  const existingPhone = await prisma.users.findUnique({
    where: { phoneNumber },
  });

  if (existingPhone) {
    return res.status(400).json({ success: false, error: "Nomor telepon sudah terdaftar" });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = await prisma.users.create({
    data: {
      email,
      username: name,
      phoneNumber,
      password: hashedPassword,
    },
  });

  res.status(201).json({ success: true, message: "User berhasil dibuat", userId: newUser.id });
});


export const loginUser = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, error: "Email dan password harus diisi" });
  }

  console.time("1. Waktu Query Prisma");
  const user = await prisma.users.findUnique({
    where: { email: email },
  });
  console.timeEnd("1. Waktu Query Prisma");

  if (!user) {
    return res.status(401).json({ success: false, error: "Email atau password salah" });
  }

  console.time("2. Waktu Cek Password (Bcrypt)");
  const isPasswordValid = await bcrypt.compare(password, user.password);
  console.timeEnd("2. Waktu Cek Password (Bcrypt)");

  if (!isPasswordValid) {
    return res.status(401).json({ success: false, error: "Email atau password salah" });
  }

  if (!user.isActive) {
    return res.status(403).json({ success: false, error: "Akun Anda telah dinonaktifkan. Hubungi admin." });
  }

  const token = jwt.sign(
    { id: user.id, username: user.username, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '14d' }
  );

  const isProduction = process.env.NODE_ENV === 'production';

  res.cookie('token', token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000 // seminggu expired
  });

  res.json({
    success: true,
    message: "Login sukses",
    token
  });
});

export const logoutUser = catchAsync(async (req, res, next) => {
  const isProduction = process.env.NODE_ENV === 'production';

  res.clearCookie('token', {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax'
  });

  res.json({
    success: true,
    message: "Logout sukses"
  });
});


export const getMe = catchAsync(async (req, res, next) => {
  const user = await prisma.users.findUnique({
    where: { id: req.user.id },
    select: {
      id: true,
      username: true,
      email: true,
      phoneNumber: true,
      role: true,
      createdAt: true
    }
  });

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'User tidak ditemukan.'
    });
  }

  res.json({
    success: true,
    message: "Berhasil mengambil data profil",
    user
  });
});

export const updateProfile = catchAsync(async (req, res, next) => {
  const { username, email, phoneNumber } = req.body;
  const userId = req.user.id;

  if (!username && !email && !phoneNumber) {
    return res.status(400).json({ success: false, message: 'Minimal satu field harus diisi.' });
  }

  // Cek email unik jika diubah
  if (email) {
    const existing = await prisma.users.findFirst({
      where: { email, NOT: { id: userId } }
    });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Email sudah digunakan akun lain.' });
    }
  }

  const updated = await prisma.users.update({
    where: { id: userId },
    data: {
      ...(username && { username }),
      ...(email && { email }),
      ...(phoneNumber && { phoneNumber }),
    },
    select: { id: true, username: true, email: true, phoneNumber: true, role: true, createdAt: true }
  });

  res.json({ success: true, message: 'Profil berhasil diperbarui!', user: updated });
});
