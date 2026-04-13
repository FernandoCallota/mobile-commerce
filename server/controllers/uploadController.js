import { uploadToCloudinary } from '../middleware/upload.js';

// Subir imagen a Cloudinary
export const uploadImage = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No se proporcionó ninguna imagen' });
        }

        // Obtener el tipo de carpeta desde el query parameter o body
        // Tipos permitidos: 'products', 'payments', 'orders', 'users'
        const folderType = req.query.type || req.body.type || 'products';
        
        // Validar tipo de carpeta
        const allowedTypes = ['products', 'payments', 'orders', 'users'];
        if (!allowedTypes.includes(folderType)) {
            return res.status(400).json({ 
                message: `Tipo de carpeta inválido. Tipos permitidos: ${allowedTypes.join(', ')}` 
            });
        }

        // Construir la ruta de la carpeta
        const folder = `nutrimentos-pavio/${folderType}`;

        // Subir a Cloudinary
        const result = await uploadToCloudinary(req.file, folder);

        // Retornar la URL de la imagen
        res.json({
            success: true,
            imageUrl: result.secure_url,
            publicId: result.public_id,
            width: result.width,
            height: result.height,
            folder: folderType
        });
    } catch (error) {
        console.error('Error al subir imagen:', error);
        res.status(500).json({ 
            message: 'Error al subir la imagen', 
            error: error.message 
        });
    }
};

// Eliminar imagen de Cloudinary
export const deleteImage = async (req, res) => {
    try {
        const { publicId } = req.params;
        
        if (!publicId) {
            return res.status(400).json({ message: 'ID público de la imagen requerido' });
        }

        const { default: cloudinary } = await import('../config/cloudinary.config.js');
        
        const result = await cloudinary.uploader.destroy(publicId);
        
        if (result.result === 'ok') {
            res.json({ success: true, message: 'Imagen eliminada correctamente' });
        } else {
            res.status(404).json({ message: 'Imagen no encontrada' });
        }
    } catch (error) {
        console.error('Error al eliminar imagen:', error);
        res.status(500).json({ 
            message: 'Error al eliminar la imagen', 
            error: error.message 
        });
    }
};

