import express from 'express';
import { registerUser, loginUser, logoutUser, getMe, updateProfile } from '../controllers/authController.js';
import { authenticateToken } from '../middlewares/auth.js';

const authRouter = express.Router();

authRouter.post(
  "/register", 
  registerUser);

authRouter.post(
  "/login", 
  loginUser);

authRouter.post(
  "/logout", 
  authenticateToken, 
  logoutUser);

authRouter.get(
  "/me", 
  authenticateToken, 
  getMe);

authRouter.put(
  "/profile", 
  authenticateToken, 
  updateProfile); 

export default authRouter;