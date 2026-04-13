import sequelize from '../config/db.config.js';
import Product from '../models/Product.js';
import cloudinary from '../config/cloudinary.config.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Mapeo de nombres de productos a archivos de imagen
const productImageMap = {
    'Alimento para Pollos Premium': 'pollos.jpg',
    'Alimento para Gallos': 'gallos.jpg',
    'Alimento para Ponedoras': 'ponedoras.jpg',
    'Alimento para Patos': 'patos.jpg',
    'Alimento para Pavos': 'pavos.jpg',
    'Alimento para Porcinos': 'porcinos.jpg',
    'Alimento para Mascotas': 'mascotas.jpg',
    'Medicamentos Veterinarios': 'medicamentos.jpg'
};

async function updateProductsToCloudinary() {
    try {
        await sequelize.authenticate();
        console.log('✅ Conectado a la base de datos\n');

        const products = await Product.findAll();
        
        if (products.length === 0) {
            console.log('⚠️  No hay productos para actualizar.');
            process.exit(0);
        }

        console.log(`📤 Actualizando ${products.length} productos a Cloudinary...\n`);

        const imagesPath = path.join(__dirname, '../../client/public/assets/productos');
        let updated = 0;
        let skipped = 0;

        for (const product of products) {
            // Si ya tiene imagen de Cloudinary, saltar
            if (product.image && product.image.includes('cloudinary.com')) {
                console.log(`⏭️  ${product.name} - Ya tiene imagen en Cloudinary`);
                skipped++;
                continue;
            }

            // Buscar el archivo de imagen correspondiente
            const imageFile = productImageMap[product.name];
            
            if (!imageFile) {
                console.log(`⚠️  ${product.name} - No se encontró mapeo de imagen`);
                skipped++;
                continue;
            }

            const imagePath = path.join(imagesPath, imageFile);

            // Verificar que la imagen existe
            if (!fs.existsSync(imagePath)) {
                console.log(`⚠️  ${product.name} - Imagen no encontrada: ${imageFile}`);
                skipped++;
                continue;
            }

            try {
                // Subir imagen a Cloudinary
                console.log(`   Subiendo: ${imageFile} para "${product.name}"...`);
                const uploadResult = await cloudinary.uploader.upload(imagePath, {
                    folder: 'nutrimentos-pavio/products',
                    public_id: `product-${product.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}`,
                    overwrite: true, // Sobrescribir si ya existe
                    transformation: [
                        {
                            width: 800,
                            height: 800,
                            crop: 'limit',
                            quality: 'auto',
                            fetch_format: 'auto'
                        }
                    ]
                });

                // Actualizar producto con URL de Cloudinary
                product.image = uploadResult.secure_url;
                await product.save();

                console.log(`   ✅ ${product.name} - Actualizado: ${uploadResult.secure_url.substring(0, 60)}...`);
                updated++;
            } catch (uploadError) {
                console.error(`   ❌ Error al subir ${imageFile}:`, uploadError.message);
                skipped++;
            }
        }

        console.log(`\n✅ Proceso completado:`);
        console.log(`   Actualizados: ${updated}`);
        console.log(`   Omitidos: ${skipped}`);
        console.log(`   Total: ${products.length}`);

        await sequelize.close();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

updateProductsToCloudinary();

