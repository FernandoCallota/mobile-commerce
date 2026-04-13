import sequelize from '../config/db.config.js';
import User from '../models/User.js';

const adminData = {
    names: 'Admin',
    surnames: 'Sistema',
    email: 'admin@nutrimentospavio.com',
    phone: '999999999',
    address: 'Oficina Principal',
    password: 'admin123', // Cambia esto por una contraseña segura
    role: 'administrador'
};

async function createAdmin() {
    try {
        await sequelize.authenticate();
        console.log('✅ Conectado a la base de datos');

        // Verificar si ya existe un admin con ese email
        const existingAdmin = await User.findOne({ where: { email: adminData.email } });
        if (existingAdmin) {
            console.log('⚠️  Ya existe un administrador con ese correo.');
            console.log('💡 Si quieres actualizarlo, elimínalo primero desde pgAdmin o desde la BD.');
            process.exit(0);
        }

        // Crear administrador
        const admin = await User.create(adminData);
        console.log('✅ Administrador creado exitosamente:');
        console.log(`   Email: ${admin.email}`);
        console.log(`   Contraseña: ${adminData.password}`);
        console.log(`   Rol: ${admin.role}`);
        console.log('\n⚠️  IMPORTANTE: Cambia la contraseña después del primer inicio de sesión.');

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

createAdmin();

