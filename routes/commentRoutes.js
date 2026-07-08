import express from 'express';
import {
  createComment,
  getCommentsByLaporan,
  editComment,
  deleteComment
} from '../controllers/commentController.js';
import { authenticateToken } from '../middlewares/auth.js';

const commentRouter = express.Router();

// POST /api/reports/:laporanId/comments
commentRouter.post(
  '/:laporanId/comments',
  authenticateToken,
  createComment
);

// GET /api/reports/:laporanId/comments
commentRouter.get(
  '/:laporanId/comments',
  getCommentsByLaporan
);


// PUT /api/reports/:laporanId/comments/:commentId
commentRouter.put(
  '/:laporanId/comments/:commentId',
  authenticateToken,
  editComment
);

// DELETE /api/reports/:laporanId/comments/:commentId
commentRouter.delete(
  '/:laporanId/comments/:commentId',
  authenticateToken,
  deleteComment
);

export default commentRouter;
