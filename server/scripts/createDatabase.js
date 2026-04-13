import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pg;

const config = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'admin',
    port: 5432, 
};

const dbName = process.env.DB_NAME || 'mobile_commerce';

async function createDatabase() {
    const client = new Client(config);
    
    try {
        await client.connect();
        console.log('✅ Conectado a PostgreSQL');
        
        const checkDb = await client.query(
            `SELECT 1 FROM pg_database WHERE datname = $1`,
            [dbName]
        );
        
        if (checkDb.rows.length > 0) {
            console.log(`⚠️  La base de datos "${dbName}" ya existe.`);
        } else {
            await client.query(`CREATE DATABASE "${dbName}"`);
            console.log(`✅ Base de datos "${dbName}" creada exitosamente.`);
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        if (error.code === '3D000') {
            console.log('💡 La base de datos no existe, pero no se pudo crear. Verifica tus credenciales.');
        } else if (error.code === '28P01') {
            console.log('💡 Error de autenticación. Verifica tu usuario y contraseña en el archivo .env');
        } else if (error.code === 'ECONNREFUSED') {
            console.log('💡 No se pudo conectar a PostgreSQL. Verifica que el servicio esté corriendo.');
        }
    } finally {
        await client.end();
    }
}

createDatabase();

