import express from 'express';
import {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  restoreUser,
  addPetugas
} from '../controllers/userController.js';
import { authenticateToken } from '../middlewares/auth.js';
import { authorizeRoles } from '../middlewares/roleMiddleware.js';

const userRouter = express.Router();

userRouter.post(
  '/petugas', 
  authenticateToken, 
  authorizeRoles('admin'), 
  addPetugas);

userRouter.get(
  '/', 
  authenticateToken, 
  authorizeRoles('admin', 'petugas'), 
  getAllUsers);

userRouter.get(
  '/:id', 
  authenticateToken, 
  authorizeRoles('admin', 'petugas'), 
  getUserById);

userRouter.put(
  '/:id', 
  authenticateToken, 
  authorizeRoles('admin'), 
  updateUser);

userRouter.delete(
  '/:id', 
  authenticateToken, 
  authorizeRoles('admin'), 
  deleteUser);

userRouter.patch(
  '/:id/restore', 
  authenticateToken, 
  authorizeRoles('admin'), 
  restoreUser);

export default userRouter;