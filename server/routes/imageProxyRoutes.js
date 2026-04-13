import express from 'express';
import { proxyCloudinaryImage } from '../controllers/imageProxyController.js';

const router = express.Router();

router.get('/proxy', proxyCloudinaryImage);

export default router;
