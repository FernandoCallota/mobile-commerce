import sequelize from '../config/db.config.js';
import Kardex from '../models/Kardex.js';
import Product from '../models/Product.js';
import User from '../models/User.js';

// Establecer relaciones
Kardex.belongsTo(Product, { foreignKey: 'productId', as: 'product' });
Kardex.belongsTo(User, { foreignKey: 'userId', as: 'user' });

async function createKardexTable() {
    try {
        console.log('🔄 Creando tabla de kardex...');
        
        // Sincronizar solo el modelo Kardex
        await Kardex.sync({ alter: true });
        
        console.log('✅ Tabla de kardex creada/actualizada correctamente');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error al crear tabla de kardex:', error);
        process.exit(1);
    }
}

createKardexTable();

