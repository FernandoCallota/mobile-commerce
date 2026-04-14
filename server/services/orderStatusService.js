import OrderStatusHistory from '../models/OrderStatusHistory.js';
import { normalizeOrderStatus } from '../utils/orderStatus.js';
import { deductInventoryForEnviado } from './orderInventoryService.js';

/**
 * Cambia estado del pedido, actualiza marcas de tiempo (enviado / entregado) y registra historial.
 * Al pasar a "enviado": descuenta stock y registra salidas en kardex (requiere transaction + userId del admin).
 */
export async function appendOrderStatusChange(order, nextRaw, { actor, userId }, options = {}) {
    const { transaction } = options;
    const prev = normalizeOrderStatus(order.status);
    const next = normalizeOrderStatus(nextRaw);
    if (prev === next) {
        return order;
    }

    if (next === 'enviado' && prev !== 'enviado') {
        if (!transaction) {
            const err = new Error(
                'Marcar como enviado requiere transacción de base de datos (descuento de inventario)'
            );
            err.statusCode = 500;
            throw err;
        }
        await deductInventoryForEnviado(order.id, { userId, transaction });
    }

    order.status = next;
    if (next === 'enviado') {
        order.enviadoAt = new Date();
    }
    if (next === 'entregado') {
        order.entregadoAt = new Date();
    }
    await order.save({ transaction });

    await OrderStatusHistory.create(
        {
            orderId: order.id,
            previousStatus: prev,
            newStatus: next,
            actor,
            changedByUserId: userId ?? null,
        },
        { transaction }
    );
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
