import sequelize from '../config/db.config.js';
import Order from '../models/Order.js';
import OrderItem from '../models/OrderItem.js';
import OrderStatusHistory from '../models/OrderStatusHistory.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import { appendOrderStatusChange } from '../services/orderStatusService.js';
import {
    normalizeOrderStatus,
    ORDER_STATUSES,
    ADMIN_ALLOWED_TRANSITIONS,
} from '../utils/orderStatus.js';

const orderIncludeAdmin = [
    {
        model: User,
        as: 'user',
        attributes: ['id', 'names', 'surnames', 'email', 'phone', 'address'],
    },
    {
        model: OrderItem,
        as: 'items',
        include: [{ model: Product, as: 'product', attributes: ['id', 'name', 'image', 'price'] }],
    },
    {
        model: OrderStatusHistory,
        as: 'statusHistory',
        separate: true,
        order: [['createdAt', 'DESC']],
        limit: 30,
    },
];

async function findOrderAdminFull(id) {
    return Order.findByPk(id, { include: orderIncludeAdmin });
}

export const listOrdersAdmin = async (_req, res) => {
    try {
        const orders = await Order.findAll({
            order: [['createdAt', 'DESC']],
            include: orderIncludeAdmin,
        });
        return res.json(orders);
    } catch (error) {
        console.error('listOrdersAdmin:', error);
        return res.status(500).json({ message: 'Error al listar pedidos' });
    }
};

export const getOrderAdmin = async (req, res) => {
    try {
        const { id } = req.params;
        const order = await findOrderAdminFull(id);
        if (!order) return res.status(404).json({ message: 'Pedido no encontrado' });
        return res.json(order);
    } catch (error) {
        console.error('getOrderAdmin:', error);
        return res.status(500).json({ message: 'Error al obtener pedido' });
    }
};

export const updateOrderStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status: nextStatus } = req.body;
        const next = normalizeOrderStatus(nextStatus);

        if (!ORDER_STATUSES.includes(next)) {
            return res.status(400).json({ message: 'Estado no válido' });
        }

        const t = await sequelize.transaction();
        try {
            const order = await Order.findByPk(id, { transaction: t, lock: t.LOCK.UPDATE });
            if (!order) {
                await t.rollback();
                return res.status(404).json({ message: 'Pedido no encontrado' });
            }

            const current = normalizeOrderStatus(order.status);

            if (current === next) {
                await t.commit();
                const full = await findOrderAdminFull(order.id);
                return res.json(full);
            }

            const transitions = ADMIN_ALLOWED_TRANSITIONS[current] || [];
            if (!transitions.includes(next)) {
                await t.rollback();
                return res.status(400).json({
                    message: `No se puede pasar de "${current}" a "${next}". Permitidos: ${transitions.join(', ') || 'ninguno'}`,
                });
            }

            await appendOrderStatusChange(
                order,
                next,
                {
                    actor: 'admin',
                    userId: req.user?.id ?? null,
                },
                { transaction: t }
            );

            await t.commit();
            const full = await findOrderAdminFull(order.id);
            return res.json(full);
        } catch (innerErr) {
            await t.rollback();
            throw innerErr;
        }
    } catch (error) {
        console.error('updateOrderStatus:', error);
        const code = error.statusCode ?? error.status;
        if (code === 400) {
            return res.status(400).json({ message: error.message });
        }
        return res.status(500).json({ message: 'Error al actualizar pedido', error: error.message });
    }
};
