import express from 'express';
import {
  getAllCategories,
  getAllCategoriesAdmin,
  createCategory,
  updateCategory,
  deleteCategory,
  restoreCategory
} from '../controllers/categoryController.js';
import { authenticateToken } from '../middlewares/auth.js';
import { authorizeRoles } from '../middlewares/roleMiddleware.js';

const categoryRouter = express.Router();

categoryRouter.get(
  '/', 
  getAllCategories);

categoryRouter.get(
  '/all', 
  authenticateToken,
  authorizeRoles('admin'), 
  getAllCategoriesAdmin);

categoryRouter.post(
  '/',
  authenticateToken, 
  authorizeRoles('admin'), 
  createCategory);

categoryRouter.put(
  '/:id', 
  authenticateToken, 
  authorizeRoles('admin'), 
  updateCategory);

categoryRouter.delete(
  '/:id', 
  authenticateToken, 
  authorizeRoles('admin'), 
  deleteCategory);

categoryRouter.patch(
  '/:id/restore', 
  authenticateToken, 
  authorizeRoles('admin'), 
  restoreCategory);

export default categoryRouter;
