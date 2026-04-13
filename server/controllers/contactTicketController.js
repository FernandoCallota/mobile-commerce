import ContactTicket from '../models/ContactTicket.js';
import Order from '../models/Order.js';

const ALLOWED_TYPES = ['QUEJA', 'CONSULTA', 'OTRO'];

export const createContactTicket = async (req, res) => {
    try {
        const { type, message, orderId, guestName, guestEmail } = req.body;

        if (!type || !ALLOWED_TYPES.includes(type)) {
            return res.status(400).json({ message: 'Tipo de asunto inválido' });
        }
        if (!message || typeof message !== 'string' || !message.trim()) {
            return res.status(400).json({ message: 'El mensaje es obligatorio' });
        }
        const trimmed = message.trim();
        if (trimmed.length > 8000) {
            return res.status(400).json({ message: 'Mensaje demasiado largo' });
        }

        if (type === 'QUEJA') {
            if (!req.user) {
                return res.status(401).json({ message: 'Debes iniciar sesión para enviar una queja vinculada a un pedido.' });
            }
            const oid = Number(orderId);
            if (!oid) {
                return res.status(400).json({ message: 'Selecciona el pedido relacionado.' });
            }
            const order = await Order.findOne({ where: { id: oid, userId: req.user.id } });
            if (!order) {
                return res.status(400).json({ message: 'Pedido no encontrado o no válido.' });
            }
            const ticket = await ContactTicket.create({
                userId: req.user.id,
                type,
                orderId: oid,
                message: trimmed,
                status: 'pendiente',
            });
            return res.status(201).json(ticket);
        }

        if (req.user) {
            const ticket = await ContactTicket.create({
                userId: req.user.id,
                type,
                orderId: null,
                message: trimmed,
                status: 'pendiente',
            });
            return res.status(201).json(ticket);
        }

        const gn = (guestName || '').trim();
        const ge = (guestEmail || '').trim();
        if (!gn || !ge) {
            return res.status(400).json({ message: 'Indica nombre y correo para poder contactarte.' });
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ge)) {
            return res.status(400).json({ message: 'Correo no válido.' });
        }

        const ticket = await ContactTicket.create({
            userId: null,
            guestName: gn,
            guestEmail: ge,
            type,
            orderId: null,
            message: trimmed,
            status: 'pendiente',
        });
        return res.status(201).json(ticket);
    } catch (error) {
        console.error('createContactTicket:', error);
        return res.status(500).json({ message: 'Error al registrar tu mensaje' });
    }
};

export const listMyContactTickets = async (req, res) => {
    try {
        const rows = await ContactTicket.findAll({
            where: { userId: req.user.id },
            order: [['createdAt', 'DESC']],
            include: [{ model: Order, as: 'order', attributes: ['id', 'status', 'total'] }],
        });
        return res.json(rows);
    } catch (error) {
        console.error('listMyContactTickets:', error);
        return res.status(500).json({ message: 'Error al listar tus consultas' });
    }
};

export const getMyContactTicket = async (req, res) => {
    try {
        const id = Number(req.params.id);
        const row = await ContactTicket.findOne({
            where: { id, userId: req.user.id },
            include: [{ model: Order, as: 'order', attributes: ['id', 'status', 'total'] }],
        });
        if (!row) {
            return res.status(404).json({ message: 'No encontrado' });
        }
        return res.json(row);
    } catch (error) {
        console.error('getMyContactTicket:', error);
        return res.status(500).json({ message: 'Error al obtener el detalle' });
    }
};
