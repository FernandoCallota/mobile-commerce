import OrderItem from '../models/OrderItem.js';
import Product from '../models/Product.js';
import Kardex from '../models/Kardex.js';

/**
 * Registra salidas en kardex y descuenta stock por cada línea del pedido.
 * Debe ejecutarse dentro de una transacción (marcar enviado).
 */
export async function deductInventoryForEnviado(orderId, { userId, transaction }) {
    if (!transaction) {
        const err = new Error('deductInventoryForEnviado requiere transaction');
        err.statusCode = 500;
        throw err;
    }
    if (userId == null) {
        const err = new Error('Se requiere usuario para registrar movimientos de kardex');
        err.statusCode = 500;
        throw err;
    }

    const items = await OrderItem.findAll({ where: { orderId }, transaction });
    if (!items.length) {
        const err = new Error('El pedido no tiene líneas de producto');
        err.statusCode = 400;
        throw err;
    }

    for (const row of items) {
        const product = await Product.findByPk(row.productId, {
            transaction,
            lock: transaction.LOCK.UPDATE,
        });
        if (!product) {
            const err = new Error(`Producto ${row.productId} no encontrado`);
            err.statusCode = 400;
            throw err;
        }
        const qty = Number(row.quantity);
        const stockBefore = Number(product.stock) || 0;
        if (stockBefore < qty) {
            const err = new Error(
                `Stock insuficiente para "${product.name}". Actual: ${stockBefore}, pedido: ${qty}`
            );
            err.statusCode = 400;
            throw err;
        }
        const stockAfter = stockBefore - qty;

        await Kardex.create(
            {
                productId: row.productId,
                type: 'salida',
                quantity: qty,
                date: new Date(),
                description: `Salida por pedido #${orderId}`,
                userId,
                stockBefore,
                stockAfter,
            },
            { transaction }
        );

        product.stock = stockAfter;
        await product.save({ transaction });
    }
}
