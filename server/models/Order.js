import { DataTypes } from 'sequelize';
import sequelize from '../config/db.config.js';
import User from './User.js';

const Order = sequelize.define('Order', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    total: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0
    },
    /** solicitado | confirmado | preparado | enviado | entregado | cancelado */
    status: {
        type: DataTypes.STRING(32),
        allowNull: false,
        defaultValue: 'solicitado'
    },
    enviadoAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'enviado_at',
    },
    entregadoAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: 'entregado_at',
    },
    shippingAddress: {
        type: DataTypes.STRING(500),
        allowNull: true,
        field: 'shipping_address',
    },
    /** yape | cash */
    paymentMethod: {
        type: DataTypes.STRING(10),
        allowNull: false,
        defaultValue: 'cash',
        field: 'payment_method',
    },
    paymentProofUrl: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'payment_proof_url',
    },
    customerNotes: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: 'customer_notes',
    },
    /** camana_motocarga | pickup_tienda | planchada | ... */
    deliveryZoneId: {
        type: DataTypes.STRING(48),
        allowNull: true,
        field: 'delivery_zone',
    },
    shippingFee: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
        field: 'shipping_fee',
    },
}, {
    tableName: 'orders',
    timestamps: true
});

// Relación con User
Order.belongsTo(User, { foreignKey: 'userId', as: 'user' });
User.hasMany(Order, { foreignKey: 'userId', as: 'orders' });

export default Order;

