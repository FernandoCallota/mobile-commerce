import { DataTypes } from 'sequelize';
import sequelize from '../config/db.config.js';
import Order from './Order.js';

const OrderStatusHistory = sequelize.define(
    'OrderStatusHistory',
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        orderId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            field: 'order_id',
            references: { model: 'orders', key: 'id' },
        },
        previousStatus: {
            type: DataTypes.STRING(32),
            allowNull: true,
            field: 'previous_status',
        },
        newStatus: {
            type: DataTypes.STRING(32),
            allowNull: false,
            field: 'new_status',
        },
        actor: {
            type: DataTypes.STRING(16),
            allowNull: false,
            validate: { isIn: [['admin', 'client', 'system']] },
        },
        changedByUserId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'changed_by_user_id',
            references: { model: 'users', key: 'id' },
        },
    },
    {
        tableName: 'order_status_histories',
        timestamps: true,
        updatedAt: false,
        indexes: [{ fields: ['order_id'] }],
    }
);

OrderStatusHistory.belongsTo(Order, { foreignKey: 'orderId', as: 'order' });
Order.hasMany(OrderStatusHistory, { foreignKey: 'orderId', as: 'statusHistory' });

export default OrderStatusHistory;
