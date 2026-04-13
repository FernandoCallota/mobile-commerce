import sequelize from '../config/db.config.js';
import Product from '../models/Product.js';
import cloudinary from '../config/cloudinary.config.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const products = [
    {
        name: 'Alimento para Pollos Premium',
        description: 'Alimento balanceado de alta calidad para pollos de engorde',
        price: 450.00,
        localImage: 'pollos.jpg',
        category: 'Aves',
        stock: 100
    },
    {
        name: 'Alimento para Gallos',
        description: 'Nutrición especializada para gallos de pelea',
        price: 520.00,
        localImage: 'gallos.jpg',
        category: 'Aves',
        stock: 80
    },
    {
        name: 'Alimento para Ponedoras',
        description: 'Alimento optimizado para máxima producción de huevos',
        price: 480.00,
        localImage: 'ponedoras.jpg',
        category: 'Aves',
        stock: 90
    },
    {
        name: 'Alimento para Patos',
        description: 'Nutrición completa para patos en crecimiento',
        price: 460.00,
        localImage: 'patos.jpg',
        category: 'Aves',
        stock: 70
    },
    {
        name: 'Alimento para Pavos',
        description: 'Alimento especializado para pavos',
        price: 500.00,
        localImage: 'pavos.jpg',
        category: 'Aves',
        stock: 60
    },
    {
        name: 'Alimento para Porcinos',
        description: 'Alimento balanceado para cerdos',
        price: 550.00,
        localImage: 'porcinos.jpg',
        category: 'Porcinos',
        stock: 85
    },
    {
        name: 'Alimento para Mascotas',
        description: 'Nutrición premium para perros y gatos',
        price: 380.00,
        localImage: 'mascotas.jpg',
        category: 'Mascotas',
        stock: 120
    },
    {
        name: 'Medicamentos Veterinarios',
        description: 'Línea completa de medicamentos para animales',
        price: 250.00,
        localImage: 'medicamentos.jpg',
        category: 'Medicamentos',
        stock: 200
    }
];

async function seedProductsWithCloudinary() {
    try {
        await sequelize.authenticate();
        console.log('✅ Conectado a la base de datos\n');

        // Verificar si ya hay productos
        const existingProducts = await Product.count();
        if (existingProducts > 0) {
            console.log(`⚠️  Ya existen ${existingProducts} productos en la base de datos.`);
            console.log('💡 Si quieres reemplazarlos, elimina los productos existentes primero.');
            process.exit(0);
        }

        // Ruta a las imágenes locales
        const imagesPath = path.join(__dirname, '../../client/public/assets/productos');
        
        console.log('📤 Subiendo imágenes a Cloudinary...\n');

        // Crear productos con imágenes en Cloudinary
        for (const productData of products) {
            const { localImage, ...productInfo } = productData;
            const imagePath = path.join(imagesPath, localImage);

            // Verificar que la imagen existe
            if (!fs.existsSync(imagePath)) {
                console.log(`⚠️  Imagen no encontrada: ${localImage}, creando producto sin imagen`);
                await Product.create({
                    ...productInfo,
                    image: null
                });
                continue;
            }

            try {
                // Subir imagen a Cloudinary
                console.log(`   Subiendo: ${localImage}...`);
                const uploadResult = await cloudinary.uploader.upload(imagePath, {
                    folder: 'nutrimentos-pavio/products',
                    public_id: `product-${productInfo.name.toLowerCase().replace(/\s+/g, '-')}`,
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

                // Crear producto con URL de Cloudinary
                await Product.create({
                    ...productInfo,
                    image: uploadResult.secure_url
                });

                console.log(`   ✅ ${productInfo.name} - Imagen subida: ${uploadResult.secure_url.substring(0, 60)}...`);
            } catch (uploadError) {
                console.error(`   ❌ Error al subir ${localImage}:`, uploadError.message);
                // Crear producto sin imagen si falla la subida
                await Product.create({
                    ...productInfo,
                    image: null
                });
            }
        }

        console.log(`\n✅ ${products.length} productos creados exitosamente con imágenes en Cloudinary`);
        await sequelize.close();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

seedProductsWithCloudinary();

