import express from 'express';
import { 
    getAllKardex, 
    getKardexById, 
    createKardex, 
    deleteKardex,
    getStockSummary
} from '../controllers/kardexController.js';
import { authenticateToken } from '../middleware/auth.js';
import { isAdmin } from '../middleware/isAdmin.js';

const router = express.Router();

// Todas las rutas requieren autenticación y ser admin
router.use(authenticateToken, isAdmin);

// Rutas
router.get('/', getAllKardex);
router.get('/summary', getStockSummary);
router.get('/:id', getKardexById);
router.post('/', createKardex);
router.delete('/:id', deleteKardex);

export default router;

