import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { isAdmin } from '../middleware/isAdmin.js';
import {
    getAllUsers,
    getUserById,
    createUser,
    updateUser,
    deleteUser
} from '../controllers/adminController.js';
import {
    listOrdersAdmin,
    getOrderAdmin,
    updateOrderStatus
} from '../controllers/orderAdminController.js';
import {
    listContactTicketsAdmin,
    getContactTicketAdmin,
    updateContactTicketAdmin,
} from '../controllers/contactTicketAdminController.js';

const router = express.Router();

// Todas las rutas requieren autenticación y ser administrador
router.use(authenticateToken);
router.use(isAdmin);

// Rutas CRUD de usuarios
router.get('/users', getAllUsers);
router.get('/users/:id', getUserById);
router.post('/users', createUser);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);

router.get('/orders', listOrdersAdmin);
router.get('/orders/:id', getOrderAdmin);
router.patch('/orders/:id', updateOrderStatus);

router.get('/contact-tickets', listContactTicketsAdmin);
router.get('/contact-tickets/:id', getContactTicketAdmin);
router.patch('/contact-tickets/:id', updateContactTicketAdmin);

export default router;

