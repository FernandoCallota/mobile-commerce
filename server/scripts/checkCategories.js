import sequelize from '../config/db.config.js';
import Product from '../models/Product.js';

async function checkCategories() {
    try {
        await sequelize.authenticate();
        const products = await Product.findAll({ attributes: ['id', 'name', 'category'] });
        
        console.log('\n=== Categorías en los productos ===\n');
        const categories = {};
        
        products.forEach(p => {
            const cat = p.category || 'Sin categoría';
            categories[cat] = (categories[cat] || 0) + 1;
            console.log(`${p.name}: ${cat}`);
        });
        
        console.log('\n=== Resumen de categorías ===');
        const uniqueCategories = Object.keys(categories).sort();
        uniqueCategories.forEach(cat => {
            console.log(`${cat}: ${categories[cat]} producto(s)`);
        });
        
        console.log(`\n✅ Total de categorías únicas: ${uniqueCategories.length}`);
        console.log(`📋 Categorías: ${uniqueCategories.join(', ')}`);
        
        await sequelize.close();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

checkCategories();

