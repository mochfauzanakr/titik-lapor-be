import express from 'express';
import {
  createReport,
  editReport,
  getAllReports,
  getMyReports,
  searchByNomorResi,
  getReportDetail,
  deleteReport,
  updateReportStatus,
  getNewsReports
} from '../controllers/reportController.js';
import { upload } from '../middlewares/uploadMiddleware.js';
import { authenticateToken, optionalAuth } from '../middlewares/auth.js';
import { authorizeRoles } from '../middlewares/roleMiddleware.js';

const reportRouter = express.Router();


reportRouter.get(
  '/me', 
  authenticateToken, 
  getMyReports);

reportRouter.get(
  '/search', 
  authenticateToken, 
  searchByNomorResi);

reportRouter.get(
  '/', 
  authenticateToken, 
  authorizeRoles('admin', 'petugas'), 
  getAllReports);

reportRouter.get(
  '/news', 
  getNewsReports);

reportRouter.get(
  '/:id', 
  optionalAuth,
  getReportDetail);

reportRouter.post(
  '/', 
  authenticateToken, 
  upload.single('attachment'), 
  createReport);

reportRouter.put(
  '/:id', 
  authenticateToken, 
  upload.single('attachment'), 
  editReport);

reportRouter.patch(
  '/:id/status', 
  authenticateToken, 
  authorizeRoles('admin', 'petugas'), 
  updateReportStatus);

reportRouter.delete(
  '/:id', 
  authenticateToken, 
  deleteReport);

export default reportRouter;