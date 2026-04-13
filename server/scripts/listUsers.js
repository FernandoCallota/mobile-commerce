import sequelize from '../config/db.config.js';
import User from '../models/User.js';

async function listUsers() {
    try {
        await sequelize.authenticate();
        console.log('✅ Conectado a la base de datos\n');

        const users = await User.findAll({
            attributes: { exclude: ['password'] },
            order: [['createdAt', 'DESC']]
        });

        if (users.length === 0) {
            console.log('ℹ️  No hay usuarios en la base de datos.');
        } else {
            console.log(`📊 Total de usuarios: ${users.length}\n`);
            users.forEach((user, index) => {
                console.log(`${index + 1}. ${user.names} ${user.surnames}`);
                console.log(`   Email: ${user.email}`);
                console.log(`   Rol: ${user.role}`);
                console.log(`   Creado: ${user.createdAt}`);
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

listUsers();

