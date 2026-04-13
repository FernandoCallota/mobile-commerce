import { Op } from 'sequelize';
import Category from '../models/Category.js';
import Product from '../models/Product.js';

export const listCategories = async (req, res) => {
    try {
        const isAdmin = req.user?.role === 'administrador';
        const where = isAdmin ? {} : { isActive: true };
        const rows = await Category.findAll({
            where,
            order: [
                ['sortOrder', 'ASC'],
                ['id', 'ASC'],
            ],
        });
        res.json(rows);
    } catch (error) {
        console.error('listCategories:', error);
        res.status(500).json({ message: 'Error al listar categorías', error: error.message });
    }
};

export const getCategoryById = async (req, res) => {
    try {
        const row = await Category.findByPk(req.params.id);
        if (!row) return res.status(404).json({ message: 'Categoría no encontrada' });
        res.json(row);
    } catch (error) {
        console.error('getCategoryById:', error);
        res.status(500).json({ message: 'Error al obtener categoría', error: error.message });
    }
};

export const createCategory = async (req, res) => {
    try {
        const { slug, name, sortOrder, bannerImage, keywords, isActive } = req.body;
        if (!slug || !name) {
            return res.status(400).json({ message: 'slug y name son requeridos' });
        }
        const normalizedSlug = String(slug)
            .trim()
            .toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[^a-z0-9-]/g, '');
        const exists = await Category.findOne({ where: { slug: normalizedSlug } });
        if (exists) {
            return res.status(400).json({ message: 'Ya existe una categoría con ese slug' });
        }
        const row = await Category.create({
            slug: normalizedSlug,
            name: String(name).trim(),
            sortOrder: sortOrder != null ? Number(sortOrder) : 0,
            bannerImage: bannerImage || null,
            keywords: Array.isArray(keywords) ? keywords : [],
            isActive: isActive !== undefined ? Boolean(isActive) : true,
        });
        res.status(201).json(row);
    } catch (error) {
        console.error('createCategory:', error);
        res.status(500).json({ message: 'Error al crear categoría', error: error.message });
    }
};

export const updateCategory = async (req, res) => {
    try {
        const row = await Category.findByPk(req.params.id);
        if (!row) return res.status(404).json({ message: 'Categoría no encontrada' });

        const { slug, name, sortOrder, bannerImage, keywords, isActive } = req.body;
        if (slug !== undefined) {
            const normalizedSlug = String(slug)
                .trim()
                .toLowerCase()
                .replace(/\s+/g, '-')
                .replace(/[^a-z0-9-]/g, '');
            const clash = await Category.findOne({
                where: { slug: normalizedSlug, id: { [Op.ne]: row.id } },
            });
            if (clash) return res.status(400).json({ message: 'Ya existe otra categoría con ese slug' });
            row.slug = normalizedSlug;
        }
        if (name !== undefined) row.name = String(name).trim();
        if (sortOrder !== undefined) row.sortOrder = Number(sortOrder);
        if (bannerImage !== undefined) row.bannerImage = bannerImage || null;
        if (keywords !== undefined) row.keywords = Array.isArray(keywords) ? keywords : [];
        if (isActive !== undefined) row.isActive = Boolean(isActive);

        await row.save();
        res.json(row);
    } catch (error) {
        console.error('updateCategory:', error);
        res.status(500).json({ message: 'Error al actualizar categoría', error: error.message });
    }
};

export const deleteCategory = async (req, res) => {
    try {
        const row = await Category.findByPk(req.params.id);
        if (!row) return res.status(404).json({ message: 'Categoría no encontrada' });

        const count = await Product.count({ where: { categoryId: row.id } });
        if (count > 0) {
            row.isActive = false;
            await row.save();
            return res.json({
                message: 'Categoría desactivada (hay productos asociados)',
                category: row,
            });
        }
        await row.destroy();
        res.json({ message: 'Categoría eliminada' });
    } catch (error) {
        console.error('deleteCategory:', error);
        res.status(500).json({ message: 'Error al eliminar categoría', error: error.message });
    }
};
