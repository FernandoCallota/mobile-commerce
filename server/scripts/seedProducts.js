import sequelize from '../config/db.config.js';
import Product from '../models/Product.js';

const products = [
    {
        name: 'Alimento para Pollos Premium',
        description: 'Alimento balanceado de alta calidad para pollos de engorde',
        price: 450.00,
        image: '/assets/productos/pollos.jpg',
        category: 'Aves',
        stock: 100
    },
    {
        name: 'Alimento para Gallos',
        description: 'Nutrición especializada para gallos de pelea',
        price: 520.00,
        image: '/assets/productos/gallos.jpg',
        category: 'Aves',
        stock: 80
    },
    {
        name: 'Alimento para Ponedoras',
        description: 'Alimento optimizado para máxima producción de huevos',
        price: 480.00,
        image: '/assets/productos/ponedoras.jpg',
        category: 'Aves',
        stock: 90
    },
    {
        name: 'Alimento para Patos',
        description: 'Nutrición completa para patos en crecimiento',
        price: 460.00,
        image: '/assets/productos/patos.jpg',
        category: 'Aves',
        stock: 70
    },
    {
        name: 'Alimento para Pavos',
        description: 'Alimento especializado para pavos',
        price: 500.00,
        image: '/assets/productos/pavos.jpg',
        category: 'Aves',
        stock: 60
    },
    {
        name: 'Alimento para Porcinos',
        description: 'Alimento balanceado para cerdos',
        price: 550.00,
        image: '/assets/productos/porcinos.jpg',
        category: 'Porcinos',
        stock: 85
    },
    {
        name: 'Alimento para Mascotas',
        description: 'Nutrición premium para perros y gatos',
        price: 380.00,
        image: '/assets/productos/mascotas.jpg',
        category: 'Mascotas',
        stock: 120
    },
    {
        name: 'Medicamentos Veterinarios',
        description: 'Línea completa de medicamentos para animales',
        price: 250.00,
        image: '/assets/productos/medicamentos.jpg',
        category: 'Medicina',
        stock: 200
    }
];

async function seedProducts() {
    try {
        await sequelize.authenticate();
        console.log('✅ Conectado a la base de datos');

        // Verificar si ya hay productos
        const existingProducts = await Product.count();
        if (existingProducts > 0) {
            console.log(`⚠️  Ya existen ${existingProducts} productos en la base de datos.`);
            console.log('💡 Si quieres reemplazarlos, elimina los productos existentes primero.');
            process.exit(0);
        }

        // Crear productos
        for (const productData of products) {
            await Product.create(productData);
        }

        console.log(`✅ ${products.length} productos creados exitosamente`);
        await sequelize.close();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

seedProducts();

