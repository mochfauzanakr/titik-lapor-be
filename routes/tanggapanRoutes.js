import express from 'express';
import { createTanggapan, getTanggapanByLaporan, editTanggapan, deleteTanggapan } from '../controllers/tanggapanController.js';
import { authenticateToken } from '../middlewares/auth.js';
import { authorizeRoles } from '../middlewares/roleMiddleware.js';
import { upload } from '../middlewares/uploadMiddleware.js';

const tanggapanRouter = express.Router();

// POST /api/reports/:laporanId/tanggapan
tanggapanRouter.post(
  '/:laporanId/tanggapan',
  authenticateToken,
  authorizeRoles('admin', 'petugas'),
  upload.single('attachment'),
  createTanggapan
);

// GET /api/reports/:laporanId/tanggapan
tanggapanRouter.get(
  '/:laporanId/tanggapan',
  authenticateToken,
  getTanggapanByLaporan
);

// PUT /api/reports/:laporanId/tanggapan/:tanggapanId
tanggapanRouter.put(
  '/:laporanId/tanggapan/:tanggapanId',
  authenticateToken,
  authorizeRoles('admin', 'petugas'),
  upload.single('attachment'),
  editTanggapan
);

// DELETE /api/reports/:laporanId/tanggapan/:tanggapanId
tanggapanRouter.delete(
  '/:laporanId/tanggapan/:tanggapanId',
  authenticateToken,
  authorizeRoles('admin', 'petugas'),
  deleteTanggapan
);

export default tanggapanRouter;
