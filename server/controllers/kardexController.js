import { Op } from 'sequelize';
import Kardex from '../models/Kardex.js';
import Product from '../models/Product.js';
import User from '../models/User.js';

// Obtener todos los movimientos de kardex
export const getAllKardex = async (req, res) => {
    try {
        const { productId, type, date } = req.query;
        
        const whereClause = {};
        if (productId) whereClause.productId = productId;
        if (type) whereClause.type = type;
        if (date) {
            // Buscar movimientos del día específico (desde las 00:00 hasta las 23:59:59)
            const startOfDay = new Date(date);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(date);
            endOfDay.setHours(23, 59, 59, 999);
            
            whereClause.date = {
                [Op.gte]: startOfDay,
                [Op.lte]: endOfDay
            };
        }

        const kardex = await Kardex.findAll({
            where: whereClause,
            include: [
                {
                    model: Product,
                    as: 'product',
                    attributes: ['id', 'name', 'category']
                },
                {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'names', 'surnames', 'email']
                }
            ],
            order: [['date', 'DESC'], ['createdAt', 'DESC']]
        });

        res.json(kardex);
    } catch (error) {
        console.error('Error al obtener kardex:', error);
        res.status(500).json({ message: 'Error al obtener kardex', error: error.message });
    }
};

// Obtener un movimiento por ID
export const getKardexById = async (req, res) => {
    try {
        const { id } = req.params;
        const kardex = await Kardex.findByPk(id, {
            include: [
                {
                    model: Product,
                    as: 'product',
                    attributes: ['id', 'name', 'category']
                },
                {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'names', 'surnames', 'email']
                }
            ]
        });

        if (!kardex) {
            return res.status(404).json({ message: 'Movimiento no encontrado' });
        }

        res.json(kardex);
    } catch (error) {
        console.error('Error al obtener movimiento:', error);
        res.status(500).json({ message: 'Error al obtener movimiento', error: error.message });
    }
};

// Crear un nuevo movimiento de kardex
export const createKardex = async (req, res) => {
    try {
        const { productId, type, quantity, date, description } = req.body;
        const userId = req.user.id;

        if (!productId || !type || !quantity) {
            return res.status(400).json({ message: 'Producto, tipo y cantidad son requeridos' });
        }

        if (type !== 'entrada' && type !== 'salida') {
            return res.status(400).json({ message: 'Tipo debe ser "entrada" o "salida"' });
        }

        // Obtener el producto
        const product = await Product.findByPk(productId);
        if (!product) {
            return res.status(404).json({ message: 'Producto no encontrado' });
        }

        const stockBefore = product.stock;
        let stockAfter;

        // Calcular nuevo stock
        if (type === 'entrada') {
            stockAfter = stockBefore + parseInt(quantity);
        } else {
            // Salida
            if (stockBefore < quantity) {
                return res.status(400).json({ 
                    message: `Stock insuficiente. Stock actual: ${stockBefore}, solicitado: ${quantity}` 
                });
            }
            stockAfter = stockBefore - parseInt(quantity);
        }

        // Crear el movimiento de kardex
        const kardex = await Kardex.create({
            productId,
            type,
            quantity: parseInt(quantity),
            date: date ? new Date(date) : new Date(),
            description: description || null,
            userId,
            stockBefore,
            stockAfter
        });

        // Actualizar el stock del producto
        product.stock = stockAfter;
        await product.save();

        // Obtener el movimiento con relaciones para devolverlo
        const kardexWithRelations = await Kardex.findByPk(kardex.id, {
            include: [
                {
                    model: Product,
                    as: 'product',
                    attributes: ['id', 'name', 'category']
                },
                {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'names', 'surnames', 'email']
                }
            ]
        });

        res.status(201).json(kardexWithRelations);
    } catch (error) {
        console.error('Error al crear movimiento:', error);
        res.status(500).json({ message: 'Error al crear movimiento', error: error.message });
    }
};

// Eliminar un movimiento de kardex (solo admin, y revertir el stock)
export const deleteKardex = async (req, res) => {
    try {
        const { id } = req.params;

        const kardex = await Kardex.findByPk(id, {
            include: [
                {
                    model: Product,
                    as: 'product'
                }
            ]
        });

        if (!kardex) {
            return res.status(404).json({ message: 'Movimiento no encontrado' });
        }

        // Revertir el stock del producto
        const product = kardex.product;
        if (kardex.type === 'entrada') {
            // Si era entrada, restar la cantidad
            product.stock = product.stock - kardex.quantity;
        } else {
            // Si era salida, sumar la cantidad
            product.stock = product.stock + kardex.quantity;
        }
        await product.save();

        // Eliminar el movimiento
        await kardex.destroy();

        res.json({ message: 'Movimiento eliminado y stock revertido correctamente' });
    } catch (error) {
        console.error('Error al eliminar movimiento:', error);
        res.status(500).json({ message: 'Error al eliminar movimiento', error: error.message });
    }
};

// Obtener resumen de stock por producto
export const getStockSummary = async (req, res) => {
    try {
        const products = await Product.findAll({
            where: { isActive: true },
            attributes: ['id', 'name', 'category', 'stock'],
            order: [['name', 'ASC']]
        });

        res.json(products);
    } catch (error) {
        console.error('Error al obtener resumen de stock:', error);
        res.status(500).json({ message: 'Error al obtener resumen', error: error.message });
    }
};

