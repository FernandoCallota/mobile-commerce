import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import https from 'https';
import fs from 'fs';
import { syncModels } from './models/index.js';
import authRoutes from './routes/authRoutes.js';
import productRoutes from './routes/productRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import kardexRoutes from './routes/kardexRoutes.js';
import imageProxyRoutes from './routes/imageProxyRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import contactTicketRoutes from './routes/contactTicketRoutes.js';
import { apiLimiter } from './middleware/rateLimiter.js';
import { runAutoEntregadoJob } from './jobs/autoEntregado.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const HTTPS_PORT = process.env.HTTPS_PORT || 3443;

// Configurar Helmet para headers de seguridad
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
            imgSrc: ["'self'", "data:", "https:", "blob:"],
        },
    },
    crossOriginEmbedderPolicy: false, // Permitir recursos externos si es necesario
}));

// CORS configurado
const allowedOrigins = process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(',').map((o) => o.trim())
    : [
        'http://localhost:5173',
        'http://localhost:4040',
        'http://localhost:3000',
        'http://127.0.0.1:5173',
        'http://127.0.0.1:4040',
        'http://127.0.0.1:3000',
    ];

// Sin NODE_ENV en .env, Node no define "development" — en local suele ser undefined
const allowLocalNetworkOrigins = process.env.NODE_ENV !== 'production';

app.use(cors({
    origin: (origin, callback) => {
        // Permitir requests sin origin (mobile apps, Postman, etc.)
        if (!origin) return callback(null, true);

        // Fuera de producción: localhost, 127.0.0.1, ::1 e IPs de red privada (móvil en LAN)
        if (allowLocalNetworkOrigins) {
            if (
                allowedOrigins.includes(origin) ||
                origin.includes('localhost') ||
                origin.includes('127.0.0.1') ||
                /^http:\/\/\[::1\]:\d+$/.test(origin) ||
                /^http:\/\/192\.168\.\d+\.\d+:\d+$/.test(origin) ||
                /^http:\/\/10\.\d+\.\d+\.\d+:\d+$/.test(origin) ||
                /^http:\/\/172\.(1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+:\d+$/.test(origin)
            ) {
                return callback(null, true);
            }
        }

        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('No permitido por CORS'));
        }
    },
    credentials: true, // Permitir cookies
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Cookie parser para refresh tokens
app.use(cookieParser());

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Proxy de imágenes Cloudinary (mismo origen → sin cookies de terceros por res.cloudinary.com)
app.use('/api/images', imageProxyRoutes);

// Rate limiting general para API
app.use('/api', apiLimiter);

// API Routes
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Server is running' });
});

// Rutas de autenticación
app.use('/api/auth', authRoutes);

// Rutas de productos
app.use('/api/products', productRoutes);

// Rutas de administrador (requieren autenticación y rol admin)
app.use('/api/admin', adminRoutes);

// Rutas de subida de archivos (requieren autenticación y rol admin)
app.use('/api/upload', uploadRoutes);

// Rutas de kardex (requieren autenticación y rol admin)
app.use('/api/kardex', kardexRoutes);

// Pedidos (cliente autenticado)
app.use('/api/orders', orderRoutes);

// Quejas / consultas (crear con auth opcional; listar propias con token)
app.use('/api/contact-tickets', contactTicketRoutes);

// Serve static files from the React app
// Note: We assume the client is built to ../client/dist
const clientDistPath = path.join(__dirname, '../client/dist');
app.use(express.static(clientDistPath));

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.get('*', (req, res) => {
    // If the file exists, serve it, otherwise serve index.html
    // But express.static handles existing files, so here we just serve index.html
    // Check if we are in development or production
    // For now, simple fallback
    res.sendFile(path.join(clientDistPath, 'index.html'));
});

// Función para iniciar servidor HTTP
const startHttpServer = () => {
    app.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT} (HTTP)`);
        console.log(`📊 Database: ${process.env.DB_NAME}`);
        setTimeout(() => runAutoEntregadoJob(), 8000);
        setInterval(() => runAutoEntregadoJob(), 15 * 60 * 1000);
    });
};

// Función para iniciar servidor HTTPS (producción)
const startHttpsServer = () => {
    const options = {
        key: fs.readFileSync(process.env.SSL_KEY_PATH || path.join(__dirname, 'ssl/key.pem')),
        cert: fs.readFileSync(process.env.SSL_CERT_PATH || path.join(__dirname, 'ssl/cert.pem'))
    };

    https.createServer(options, app).listen(HTTPS_PORT, () => {
        console.log(`🔒 HTTPS Server running on port ${HTTPS_PORT}`);
        console.log(`📊 Database: ${process.env.DB_NAME}`);
        setTimeout(() => runAutoEntregadoJob(), 8000);
        setInterval(() => runAutoEntregadoJob(), 15 * 60 * 1000);
    });
};

// Sincronizar modelos y luego iniciar servidor
syncModels(false).then(() => {
    if (process.env.NODE_ENV === 'production' && process.env.ENABLE_HTTPS === 'true') {
        // Verificar que existan los certificados SSL
        const keyPath = process.env.SSL_KEY_PATH || path.join(__dirname, 'ssl/key.pem');
        const certPath = process.env.SSL_CERT_PATH || path.join(__dirname, 'ssl/cert.pem');
        
        if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
            startHttpsServer();
            // También iniciar HTTP para redirigir a HTTPS
            const httpApp = express();
            httpApp.get('*', (req, res) => {
                res.redirect(`https://${req.hostname}:${HTTPS_PORT}${req.url}`);
            });
            httpApp.listen(PORT, () => {
                console.log(`🔄 HTTP redirect server running on port ${PORT}`);
            });
        } else {
            console.warn('⚠️  Certificados SSL no encontrados. Iniciando solo HTTP.');
            startHttpServer();
        }
    } else {
        startHttpServer();
    }
}).catch((error) => {
    console.error('❌ Error al iniciar servidor:', error);
    process.exit(1);
});
