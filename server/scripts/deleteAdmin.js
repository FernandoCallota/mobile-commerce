import sequelize from '../config/db.config.js';
import User from '../models/User.js';

async function deleteAdmin() {
    try {
        await sequelize.authenticate();
        console.log('✅ Conectado a la base de datos');

        // Buscar y eliminar todos los administradores
        const admins = await User.findAll({ where: { role: 'administrador' } });
        
        if (admins.length === 0) {
            console.log('ℹ️  No hay administradores para eliminar.');
            process.exit(0);
        }

        for (const admin of admins) {
            await admin.destroy();
            console.log(`✅ Administrador eliminado: ${admin.email}`);
        }

        console.log(`\n✅ ${admins.length} administrador(es) eliminado(s) exitosamente.`);
        console.log('💡 Ahora el primer usuario que se registre podrá elegir ser administrador.');

        await sequelize.close();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        if (error.original) {
            console.error('Detalles:', error.original.message);
        }
        process.exit(1);
    }
}

deleteAdmin();

