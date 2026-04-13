import sequelize from '../config/db.config.js';

async function addRoleColumn() {
    try {
        await sequelize.authenticate();
        console.log('✅ Conectado a la base de datos');

        // Verificar si la columna ya existe
        const [results] = await sequelize.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'users' AND column_name = 'role';
        `);

        if (results.length > 0) {
            console.log('⚠️  La columna "role" ya existe en la tabla users.');
            process.exit(0);
        }

        // Crear el tipo ENUM si no existe (PostgreSQL)
        try {
            await sequelize.query(`
                CREATE TYPE user_role AS ENUM ('cliente', 'administrador');
            `);
            console.log('✅ Tipo ENUM "user_role" creado');
        } catch (error) {
            // El tipo ya existe, no hay problema
            if (!error.message.includes('already exists') && !error.message.includes('ya existe')) {
                throw error;
            }
            console.log('ℹ️  Tipo ENUM "user_role" ya existe');
        }

        // Agregar la columna role directamente con el tipo ENUM
        await sequelize.query(`
            ALTER TABLE users 
            ADD COLUMN role user_role DEFAULT 'cliente' NOT NULL;
        `);

        // Actualizar usuarios existentes a 'cliente' si no tienen rol
        await sequelize.query(`
            UPDATE users 
            SET role = 'cliente' 
            WHERE role IS NULL OR role = '';
        `);

        console.log('✅ Columna "role" agregada exitosamente');
        console.log('✅ Todos los usuarios existentes fueron asignados como "cliente"');

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

addRoleColumn();

