import express from 'express';
import upload from '../middleware/upload.js';
import { authenticateToken } from '../middleware/auth.js';
import {
    createOrder,
    listMyOrders,
    getMyOrder,
    uploadPaymentProof,
    cancelMyOrder,
    confirmMyDelivery,
} from '../controllers/orderController.js';

const router = express.Router();

router.use(authenticateToken);

router.post('/payment-proof', upload.single('image'), uploadPaymentProof);
router.get('/', listMyOrders);
router.post('/', createOrder);
router.patch('/:id/cancel', cancelMyOrder);
router.patch('/:id/confirm-delivery', confirmMyDelivery);
router.get('/:id', getMyOrder);

export default router;
