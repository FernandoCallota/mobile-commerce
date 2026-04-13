import sequelize from '../config/db.config.js';
import Product from '../models/Product.js';

// Mapeo de nombres de productos a categorías específicas
const productCategoryMap = {
    'Alimento para Pollos Premium': 'Pollos',
    'Alimento para Gallos': 'Gallos',
    'Alimento para Ponedoras': 'Ponedoras',
    'Alimento para Patos': 'Patos',
    'Alimento para Pavos': 'Pavos',
    'Alimento para Porcinos': 'Porcinos',
    'Alimento para Mascotas': 'Mascotas',
    'Medicamentos Veterinarios': 'Medicamentos'
};

async function updateProductCategories() {
    try {
        await sequelize.authenticate();
        console.log('✅ Conectado a la base de datos\n');

        const products = await Product.findAll();
        
        if (products.length === 0) {
            console.log('⚠️  No hay productos para actualizar.');
            process.exit(0);
        }

        console.log(`📝 Actualizando categorías de ${products.length} productos...\n`);

        let updated = 0;
        let skipped = 0;

        for (const product of products) {
            const newCategory = productCategoryMap[product.name];
            
            if (!newCategory) {
                console.log(`⚠️  ${product.name} - No se encontró categoría específica`);
                skipped++;
                continue;
            }

            if (product.category === newCategory) {
                console.log(`⏭️  ${product.name} - Ya tiene la categoría correcta: ${newCategory}`);
                skipped++;
                continue;
            }

            try {
                product.category = newCategory;
                await product.save();
                console.log(`   ✅ ${product.name} - Actualizado: "${product.category}" → "${newCategory}"`);
                updated++;
            } catch (error) {
                console.error(`   ❌ Error al actualizar ${product.name}:`, error.message);
                skipped++;
            }
        }

        console.log(`\n✅ Proceso completado:`);
        console.log(`   Actualizados: ${updated}`);
        console.log(`   Omitidos: ${skipped}`);
        console.log(`   Total: ${products.length}`);

        // Mostrar resumen de categorías
        const updatedProducts = await Product.findAll();
        const categories = [...new Set(updatedProducts.map(p => p.category).filter(c => c))].sort();
        console.log(`\n📋 Categorías actuales: ${categories.join(', ')}`);
        console.log(`📊 Total de categorías: ${categories.length}`);

        await sequelize.close();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

updateProductCategories();

