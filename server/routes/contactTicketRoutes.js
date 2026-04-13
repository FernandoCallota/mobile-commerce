import express from 'express';
import { optionalAuth, authenticateToken } from '../middleware/auth.js';
import {
    createContactTicket,
    listMyContactTickets,
    getMyContactTicket,
} from '../controllers/contactTicketController.js';

const router = express.Router();

router.post('/', optionalAuth, createContactTicket);
router.get('/', authenticateToken, listMyContactTickets);
router.get('/:id', authenticateToken, getMyContactTicket);

export default router;
