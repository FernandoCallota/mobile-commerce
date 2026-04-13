import sequelize from '../config/db.config.js';
import User from '../models/User.js';

async function deleteAllUsers() {
    try {
        await sequelize.authenticate();
        console.log('✅ Conectado a la base de datos');

        const users = await User.findAll();
        
        if (users.length === 0) {
            console.log('ℹ️  No hay usuarios para eliminar.');
            process.exit(0);
        }

        console.log(`⚠️  Se eliminarán ${users.length} usuario(s):`);
        users.forEach((user, index) => {
            console.log(`   ${index + 1}. ${user.email} (${user.role})`);
        });

        for (const user of users) {
            await user.destroy();
        }

        console.log(`\n✅ ${users.length} usuario(s) eliminado(s) exitosamente.`);
        console.log('💡 Ahora puedes registrar el primer usuario como administrador.');

        await sequelize.close();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

deleteAllUsers();

