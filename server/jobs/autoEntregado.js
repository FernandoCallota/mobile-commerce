import { Op } from 'sequelize';
import Order from '../models/Order.js';
import { appendOrderStatusChange } from '../services/orderStatusService.js';
import { AUTO_ENTREGADO_AFTER_MS } from '../utils/orderStatus.js';

/** Pedidos en Enviado sin confirmación del cliente: a las 24 h pasa a Entregado (sistema). */
export async function runAutoEntregadoJob() {
    try {
        const cutoff = new Date(Date.now() - AUTO_ENTREGADO_AFTER_MS);
        const orders = await Order.findAll({
            where: {
                status: 'enviado',
                enviadoAt: { [Op.lte]: cutoff },
            },
        });
        for (const order of orders) {
            await appendOrderStatusChange(order, 'entregado', { actor: 'system', userId: null });
        }
        if (orders.length > 0) {
            console.log(`📦 Auto-entregados (24 h sin confirmar): ${orders.length} pedido(s)`);
        }
    } catch (e) {
        console.error('runAutoEntregadoJob:', e);
    }
}
