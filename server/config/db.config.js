import Sequelize from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

const dbConfig = {
    HOST: process.env.DB_HOST || "localhost",
    USER: process.env.DB_USER || "postgres",
    PASSWORD: process.env.DB_PASSWORD || "admin", // Cambia esto por tu contraseña real
    DB: process.env.DB_NAME || "mobile_commerce",
    dialect: "postgres",
    pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
    }
};

const sequelize = new Sequelize(dbConfig.DB, dbConfig.USER, dbConfig.PASSWORD, {
    host: dbConfig.HOST,
    dialect: dbConfig.dialect,
    logging: false, // Set to true to see SQL queries
    pool: dbConfig.pool
});

export default sequelize;
