import { DataTypes } from 'sequelize';
import sequelize from '../config/db.config.js';

/** Quejas / consultas / otros — seguimiento para usuarios registrados; invitados solo dejan registro. */
const ContactTicket = sequelize.define(
    'ContactTicket',
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        userId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'user_id',
            references: { model: 'users', key: 'id' },
        },
        guestName: {
            type: DataTypes.STRING(200),
            allowNull: true,
            field: 'guest_name',
        },
        guestEmail: {
            type: DataTypes.STRING(255),
            allowNull: true,
            field: 'guest_email',
        },
        type: {
            type: DataTypes.STRING(16),
            allowNull: false,
        },
        orderId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            field: 'order_id',
            references: { model: 'orders', key: 'id' },
        },
        message: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
        /** pendiente | en_revision | respondido | cerrado */
        status: {
            type: DataTypes.STRING(32),
            allowNull: false,
            defaultValue: 'pendiente',
        },
        adminResponse: {
            type: DataTypes.TEXT,
            allowNull: true,
            field: 'admin_response',
        },
        respondedAt: {
            type: DataTypes.DATE,
            allowNull: true,
            field: 'responded_at',
        },
    },
    {
        tableName: 'contact_tickets',
        indexes: [{ fields: ['user_id'] }, { fields: ['status'] }, { fields: ['createdAt'] }],
    }
);

export default ContactTicket;
