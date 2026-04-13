import express from 'express';
import upload from '../middleware/upload.js';
import { uploadImage, deleteImage } from '../controllers/uploadController.js';
import { authenticateToken } from '../middleware/auth.js';
import { isAdmin } from '../middleware/isAdmin.js';

const router = express.Router();

// Todas las rutas requieren autenticación y ser administrador
router.use(authenticateToken);
router.use(isAdmin);

// Subir imagen
router.post('/image', upload.single('image'), uploadImage);

// Eliminar imagen
router.delete('/image/:publicId', deleteImage);

export default router;

