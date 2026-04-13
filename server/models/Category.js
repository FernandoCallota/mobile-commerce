import { DataTypes } from 'sequelize';
import sequelize from '../config/db.config.js';

const Category = sequelize.define(
    'Category',
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        slug: {
            type: DataTypes.STRING(64),
            allowNull: false,
            unique: true,
        },
        name: {
            type: DataTypes.STRING(128),
            allowNull: false,
        },
        /** Palabras para filtrar productos sin categoryId (compatibilidad) */
        keywords: {
            type: DataTypes.JSON,
            allowNull: true,
            defaultValue: [],
        },
        /** Nombre de archivo en client/public/assets/cabeceras/ para el banner del catálogo */
        bannerImage: {
            type: DataTypes.STRING(128),
            allowNull: true,
        },
        sortOrder: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
        },
        isActive: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
        },
    },
    {
        tableName: 'categories',
        timestamps: true,
    }
);

export default Category;
