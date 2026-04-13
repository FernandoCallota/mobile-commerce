import sequelize from '../config/db.config.js';
import Order from '../models/Order.js';
import OrderItem from '../models/OrderItem.js';
import OrderStatusHistory from '../models/OrderStatusHistory.js';
import Product from '../models/Product.js';
import { uploadToCloudinary } from '../middleware/upload.js';
import { logInitialOrderStatus, appendOrderStatusChange } from '../services/orderStatusService.js';
import { normalizeOrderStatus, CANCEL_WINDOW_MS } from '../utils/orderStatus.js';
import { getDeliveryZone, getShippingFeeSoles } from '../utils/deliveryZones.js';

const orderIncludeClient = [
    {
        model: OrderItem,
        as: 'items',
        include: [{ model: Product, as: 'product', attributes: ['id', 'name', 'image', 'description'] }],
    },
    {
        model: OrderStatusHistory,
        as: 'statusHistory',
        separate: true,
        order: [['createdAt', 'DESC']],
        limit: 30,
    },
];

async function findOrderClientFull(id) {
    return Order.findByPk(id, { include: orderIncludeClient });
}

const validateItemsPayload = (items) => {
    if (!Array.isArray(items) || items.length === 0) {
        return 'El pedido debe incluir al menos un producto';
    }
    for (const row of items) {
        const pid = row.productId ?? row.id;
        const qty = row.quantity;
        if (pid == null || !Number.isInteger(Number(qty)) || Number(qty) < 1) {
            return 'Cada línea necesita productId e quantity válidos';
        }
    }
    return null;
};

export const uploadPaymentProof = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'Debes adjuntar una imagen del comprobante Yape' });
        }
        const folder = 'nutrimentos-pavio/payments';
        const result = await uploadToCloudinary(req.file, folder);
        return res.json({
            success: true,
            imageUrl: result.secure_url,
            publicId: result.public_id,
        });
    } catch (error) {
        console.error('uploadPaymentProof:', error);
        return res.status(500).json({ message: 'Error al subir la imagen', error: error.message });
    }
};

export const createOrder = async (req, res) => {
    const userId = req.user.id;
    const { items, shippingAddress, paymentMethod, paymentProofUrl, customerNotes, deliveryZoneId } = req.body;

    const errMsg = validateItemsPayload(items);
    if (errMsg) return res.status(400).json({ message: errMsg });

    const zone = getDeliveryZone(deliveryZoneId);
    if (!zone) {
        return res.status(400).json({ message: 'Selecciona una zona de entrega válida' });
    }
    const feeSoles = getShippingFeeSoles(zone.id);
    if (feeSoles == null) {
        return res.status(400).json({ message: 'Zona de entrega inválida' });
    }

    const method = String(paymentMethod || '').toLowerCase();
    if (method !== 'yape' && method !== 'cash') {
        return res.status(400).json({ message: 'Método de pago inválido (yape o cash)' });
    }
    if (method === 'yape' && (!paymentProofUrl || !String(paymentProofUrl).trim())) {
        return res.status(400).json({ message: 'Para Yape debes subir la foto del pago' });
    }
    if (method === 'cash' && paymentProofUrl) {
        return res.status(400).json({ message: 'En efectivo no se adjunta comprobante' });
    }

    let address = shippingAddress != null ? String(shippingAddress).trim() : '';
    if (zone.kind === 'pickup') {
        address = address || 'Recojo en tienda';
    } else if (zone.requiresAddress && !address) {
        return res.status(400).json({
            message: 'Indica la dirección o referencia de entrega (obligatoria para esta zona)',
        });
    }
    const notes = customerNotes != null ? String(customerNotes).trim() : null;

    const t = await sequelize.transaction();
    try {
        let productsSum = 0;
        const lines = [];

        for (const row of items) {
            const productId = Number(row.productId ?? row.id);
            const quantity = Number(row.quantity);
            const product = await Product.findByPk(productId, { transaction: t });
            if (!product || !product.isActive) {
                await t.rollback();
                return res.status(400).json({ message: `Producto no disponible: ${productId}` });
            }
            if (product.stock != null && Number(product.stock) < quantity) {
                await t.rollback();
                return res.status(400).json({ message: `Stock insuficiente para "${product.name}"` });
            }
            const unit = parseFloat(product.price);
            const lineTotal = unit * quantity;
            productsSum += lineTotal;
            lines.push({ productId, quantity, price: unit, product });
        }

        const orderTotal = productsSum + feeSoles;

        /** Yape y efectivo: queda en Solicitado para revisión / confirmación. */
        const order = await Order.create(
            {
                userId,
                total: orderTotal.toFixed(2),
                status: 'solicitado',
                shippingAddress: address || null,
                paymentMethod: method,
                paymentProofUrl: method === 'yape' ? String(paymentProofUrl).trim() : null,
                customerNotes: notes || null,
                deliveryZoneId: zone.id,
                shippingFee: feeSoles.toFixed(2),
            },
            { transaction: t }
        );

        for (const line of lines) {
            await OrderItem.create(
                {
                    orderId: order.id,
                    productId: line.productId,
                    quantity: line.quantity,
                    price: line.price,
                },
                { transaction: t }
            );
        }

        await t.commit();

        try {
            await logInitialOrderStatus(order.id, { userId });
        } catch (histErr) {
            console.warn('logInitialOrderStatus:', histErr.message);
        }

        const full = await findOrderClientFull(order.id);
        return res.status(201).json(full);
    } catch (error) {
        await t.rollback();
        console.error('createOrder:', error);
        return res.status(500).json({ message: 'Error al crear el pedido', error: error.message });
    }
};

export const listMyOrders = async (req, res) => {
    try {
        const orders = await Order.findAll({
            where: { userId: req.user.id },
            order: [['createdAt', 'DESC']],
            include: orderIncludeClient,
        });
        return res.json(orders);
    } catch (error) {
        console.error('listMyOrders:', error);
        return res.status(500).json({ message: 'Error al listar pedidos' });
    }
};

export const getMyOrder = async (req, res) => {
    try {
        const { id } = req.params;
        const order = await findOrderClientFull(id);
        if (!order || order.userId !== req.user.id) {
            return res.status(404).json({ message: 'Pedido no encontrado' });
        }
        return res.json(order);
    } catch (error) {
        console.error('getMyOrder:', error);
        return res.status(500).json({ message: 'Error al obtener pedido' });
    }
};

/** Cliente: cancelar solo en Solicitado y dentro de 1 h. */
export const cancelMyOrder = async (req, res) => {
    try {
        const id = Number(req.params.id);
        if (Number.isNaN(id)) {
            return res.status(400).json({ message: 'ID inválido' });
        }
        const order = await Order.findByPk(id);
        if (!order || order.userId !== req.user.id) {
            return res.status(404).json({ message: 'Pedido no encontrado' });
        }
        const st = normalizeOrderStatus(order.status);
        if (st !== 'solicitado') {
            return res.status(400).json({ message: 'Solo puedes cancelar un pedido en estado Solicitado' });
        }
        const elapsed = Date.now() - new Date(order.createdAt).getTime();
        if (elapsed > CANCEL_WINDOW_MS) {
            return res.status(400).json({ message: 'Pasó el plazo de 1 hora para cancelar el pedido' });
        }
        await appendOrderStatusChange(order, 'cancelado', { actor: 'client', userId: req.user.id });
        const full = await findOrderClientFull(order.id);
        return res.json(full);
    } catch (error) {
        console.error('cancelMyOrder:', error);
        return res.status(500).json({ message: 'Error al cancelar pedido' });
    }
};

/** Cliente: confirmar recepción cuando está Enviado. */
export const confirmMyDelivery = async (req, res) => {
    try {
        const id = Number(req.params.id);
        if (Number.isNaN(id)) {
            return res.status(400).json({ message: 'ID inválido' });
        }
        const order = await Order.findByPk(id);
        if (!order || order.userId !== req.user.id) {
            return res.status(404).json({ message: 'Pedido no encontrado' });
        }
        const st = normalizeOrderStatus(order.status);
        if (st !== 'enviado') {
            return res.status(400).json({ message: 'Solo puedes marcar entregado cuando el pedido está Enviado' });
        }
        await appendOrderStatusChange(order, 'entregado', { actor: 'client', userId: req.user.id });
        const full = await findOrderClientFull(order.id);
        return res.json(full);
    } catch (error) {
        console.error('confirmMyDelivery:', error);
        return res.status(500).json({ message: 'Error al confirmar entrega' });
    }
};
