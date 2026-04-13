import OrderStatusHistory from '../models/OrderStatusHistory.js';
import { normalizeOrderStatus } from '../utils/orderStatus.js';

/**
 * Cambia estado del pedido, actualiza marcas de tiempo (enviado / entregado) y registra historial.
 */
export async function appendOrderStatusChange(order, nextRaw, { actor, userId }) {
    const prev = normalizeOrderStatus(order.status);
    const next = normalizeOrderStatus(nextRaw);
    if (prev === next) {
        return order;
    }

    order.status = next;
    if (next === 'enviado') {
        order.enviadoAt = new Date();
    }
    if (next === 'entregado') {
        order.entregadoAt = new Date();
    }
    await order.save();

    await OrderStatusHistory.create({
        orderId: order.id,
        previousStatus: prev,
        newStatus: next,
        actor,
        changedByUserId: userId ?? null,
    });
    return order;
}

export async function logInitialOrderStatus(orderId, { userId }) {
    await OrderStatusHistory.create({
        orderId,
        previousStatus: null,
        newStatus: 'solicitado',
        actor: 'client',
        changedByUserId: userId,
    });
}
