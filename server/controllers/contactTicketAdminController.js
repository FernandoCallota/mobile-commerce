import ContactTicket from '../models/ContactTicket.js';
import Order from '../models/Order.js';
import User from '../models/User.js';

const ALLOWED_STATUS = ['pendiente', 'en_revision', 'respondido', 'cerrado'];

export const listContactTicketsAdmin = async (req, res) => {
    try {
        const { status } = req.query;
        const where = {};
        if (status && status !== 'todos' && ALLOWED_STATUS.includes(status)) {
            where.status = status;
        }
        const rows = await ContactTicket.findAll({
            where,
            order: [['createdAt', 'DESC']],
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'names', 'surnames', 'email', 'phone'],
                },
                { model: Order, as: 'order', attributes: ['id', 'status', 'total'] },
            ],
        });
        return res.json(rows);
    } catch (error) {
        console.error('listContactTicketsAdmin:', error);
        return res.status(500).json({ message: 'Error al listar consultas' });
    }
};

export const getContactTicketAdmin = async (req, res) => {
    try {
        const id = Number(req.params.id);
        const row = await ContactTicket.findByPk(id, {
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'names', 'surnames', 'email', 'phone'],
                },
                { model: Order, as: 'order', attributes: ['id', 'status', 'total', 'shippingAddress'] },
            ],
        });
        if (!row) {
            return res.status(404).json({ message: 'No encontrado' });
        }
        return res.json(row);
    } catch (error) {
        console.error('getContactTicketAdmin:', error);
        return res.status(500).json({ message: 'Error al obtener la consulta' });
    }
};

export const updateContactTicketAdmin = async (req, res) => {
    try {
        const id = Number(req.params.id);
        const { status, adminResponse } = req.body;

        const row = await ContactTicket.findByPk(id);
        if (!row) {
            return res.status(404).json({ message: 'No encontrado' });
        }

        const updates = {};

        if (status !== undefined) {
            if (!ALLOWED_STATUS.includes(status)) {
                return res.status(400).json({ message: 'Estado no válido' });
            }
            updates.status = status;
        }

        if (adminResponse !== undefined) {
            if (typeof adminResponse !== 'string') {
                return res.status(400).json({ message: 'Respuesta inválida' });
            }
            const ar = adminResponse.trim();
            if (ar.length > 12000) {
                return res.status(400).json({ message: 'Respuesta demasiado larga' });
            }
            updates.adminResponse = ar || null;
            if (ar) {
                updates.respondedAt = new Date();
                if (!updates.status) {
                    updates.status = row.status === 'cerrado' ? 'cerrado' : 'respondido';
                }
            }
        }

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ message: 'Nada que actualizar' });
        }

        await row.update(updates);

        const fresh = await ContactTicket.findByPk(id, {
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'names', 'surnames', 'email', 'phone'],
                },
                { model: Order, as: 'order', attributes: ['id', 'status', 'total', 'shippingAddress'] },
            ],
        });

        return res.json(fresh);
    } catch (error) {
        console.error('updateContactTicketAdmin:', error);
        return res.status(500).json({ message: 'Error al actualizar' });
    }
};
