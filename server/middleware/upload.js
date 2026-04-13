import multer from 'multer';
import { Readable } from 'stream';

// Configurar multer para almacenamiento en memoria (luego subiremos a Cloudinary)
const storage = multer.memoryStorage();

// Configurar multer
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB máximo
    },
    fileFilter: (req, file, cb) => {
        // Validar tipo de archivo
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Solo se permiten archivos de imagen'), false);
        }
    }
});

// Función helper para convertir buffer a stream (requerido por Cloudinary)
const bufferToStream = (buffer) => {
    const readable = new Readable();
    readable.push(buffer);
    readable.push(null);
    return readable;
};

// Función para subir imagen a Cloudinary
export const uploadToCloudinary = async (file, folder = 'nutrimentos-pavio/products') => {
    const { default: cloudinary } = await import('../config/cloudinary.config.js');
    
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder: folder,
                transformation: [
                    {
                        width: 800,
                        height: 800,
                        crop: 'limit', // Mantener proporción, limitar tamaño
                        quality: 'auto', // Optimización automática
                        fetch_format: 'auto' // WebP si el navegador lo soporta
                    }
                ],
                resource_type: 'image'
            },
            (error, result) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(result);
                }
            }
        );

        bufferToStream(file.buffer).pipe(uploadStream);
    });
};

export default upload;

