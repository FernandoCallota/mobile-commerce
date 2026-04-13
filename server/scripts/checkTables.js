import sequelize from '../config/db.config.js';

async function checkTables() {
    try {
        await sequelize.authenticate();
        console.log('✅ Conectado a la base de datos');
        
        const [results] = await sequelize.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name;
        `);
        
        console.log('\n📊 Tablas en la base de datos:');
        if (results.length === 0) {
            console.log('⚠️  No hay tablas creadas aún');
        } else {
            results.forEach((row, index) => {
                console.log(`${index + 1}. ${row.table_name}`);
            });
        }
        
        await sequelize.close();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

checkTables();

