import express from 'express';
import {
    register,
    login,
    getProfile,
    updateProfile,
    changePassword,
    checkAdminExists,
    refreshToken,
    logout,
} from '../controllers/authController.js';
import { authenticateToken } from '../middleware/auth.js';
import { loginLimiter, registerLimiter } from '../middleware/rateLimiter.js';
import { validateRegister, validateLogin } from '../middleware/sanitize.js';

const router = express.Router();

router.post('/register', registerLimiter, validateRegister, register);
router.post('/login', loginLimiter, validateLogin, login);
router.post('/refresh', refreshToken);
router.post('/logout', logout);
router.get('/profile', authenticateToken, getProfile);
router.patch('/profile', authenticateToken, updateProfile);
router.patch('/password', authenticateToken, changePassword);
router.get('/check-admin', checkAdminExists); // Endpoint público para verificar si existe admin

export default router;

