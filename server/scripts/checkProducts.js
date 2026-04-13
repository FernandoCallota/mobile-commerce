import sequelize from '../config/db.config.js';
import Product from '../models/Product.js';

async function checkProducts() {
    try {
        await sequelize.authenticate();
        const products = await Product.findAll({ limit: 5 });
        
        console.log(`\n📦 Productos en la base de datos: ${await Product.count()}\n`);
        
        if (products.length === 0) {
            console.log('✅ No hay productos. Puedes ejecutar seedProductsWithCloudinary.js');
        } else {
            console.log('=== Primeros productos ===\n');
            products.forEach(p => {
                const hasCloudinary = p.image && p.image.includes('cloudinary.com');
                const hasLocal = p.image && p.image.startsWith('/assets');
                const status = hasCloudinary ? '✅ Cloudinary' : (hasLocal ? '⚠️  Local' : '❌ Sin imagen');
                console.log(`${p.name}:`);
                console.log(`  Estado: ${status}`);
                if (p.image) {
                    console.log(`  URL: ${p.image.substring(0, 80)}...`);
                }
                console.log('');
            });
        }
        
        await sequelize.close();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

checkProducts();

