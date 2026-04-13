import sequelize from '../config/db.config.js';

async function testConnection() {
    try {
        await sequelize.authenticate();
        console.log('✅ Conexión a la base de datos exitosa!');
        console.log(`📊 Base de datos: ${sequelize.config.database}`);
        console.log(`🖥️  Host: ${sequelize.config.host}`);
        console.log(`👤 Usuario: ${sequelize.config.username}`);
        await sequelize.close();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error al conectar a la base de datos:');
        console.error(error.message);
        if (error.original) {
            console.error('Detalles:', error.original.message);
        }
        process.exit(1);
    }
}

testConnection();

