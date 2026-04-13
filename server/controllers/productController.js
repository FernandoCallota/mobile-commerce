import { Op } from 'sequelize';
import Product from '../models/Product.js';
import Category from '../models/Category.js';

const categoryInclude = {
    model: Category,
    as: 'productCategory',
    attributes: ['id', 'slug', 'name', 'bannerImage', 'keywords'],
    required: false,
};

function formatProduct(product) {
    const j = product.toJSON();
    const pc = j.productCategory;
    j.category = pc?.name || j.category || null;
    j.categorySlug = pc?.slug || null;
    j.categoryId = j.categoryId ?? null;
    delete j.productCategory;
    return j;
}

async function resolveCategoryIdAndName(categoryId, categoryString) {
    let catId = categoryId != null ? parseInt(categoryId, 10) : null;
    const name = categoryString != null ? String(categoryString).trim() : '';

    if (catId && !Number.isNaN(catId)) {
        const c = await Category.findByPk(catId);
        if (!c) return { error: 'Categoría no válida' };
        return { categoryId: c.id, category: c.name };
    }

    if (name) {
        const byName = await Category.findOne({
            where: { name: { [Op.iLike]: name } },
        });
        if (byName) return { categoryId: byName.id, category: byName.name };
    }

    return { categoryId: null, category: name || null };
}

// Obtener todos los productos
export const getAllProducts = async (req, res) => {
    try {
        const isAdmin = req.user && req.user.role === 'administrador';
        const whereClause = isAdmin ? {} : { isActive: true };

        const products = await Product.findAll({
            where: whereClause,
            order: [['createdAt', 'DESC']],
            include: [categoryInclude],
        });
        res.json(products.map(formatProduct));
    } catch (error) {
        console.error('Error al obtener productos:', error);
        res.status(500).json({ message: 'Error al obtener productos', error: error.message });
    }
};

// Obtener un producto por ID
export const getProductById = async (req, res) => {
    try {
        const { id } = req.params;
        const product = await Product.findByPk(id, { include: [categoryInclude] });

        if (!product) {
            return res.status(404).json({ message: 'Producto no encontrado' });
        }

        res.json(formatProduct(product));
    } catch (error) {
        console.error('Error al obtener producto:', error);
        res.status(500).json({ message: 'Error al obtener producto', error: error.message });
    }
};

// Crear producto (solo admin)
export const createProduct = async (req, res) => {
    try {
        const { name, description, price, image, category, categoryId, stock, isActive } = req.body;

        if (!name || !price) {
            return res.status(400).json({ message: 'Nombre y precio son requeridos' });
        }

        const resolved = await resolveCategoryIdAndName(categoryId, category);
        if (resolved.error) {
            return res.status(400).json({ message: resolved.error });
        }

        const product = await Product.create({
            name,
            description,
            price,
            image,
            category: resolved.category,
            categoryId: resolved.categoryId,
            stock: 0,
            isActive: isActive !== undefined ? Boolean(isActive) : true,
        });

        const full = await Product.findByPk(product.id, { include: [categoryInclude] });
        res.status(201).json(formatProduct(full));
    } catch (error) {
        console.error('Error al crear producto:', error);
        res.status(500).json({ message: 'Error al crear producto', error: error.message });
    }
};

// Actualizar producto (solo admin)
export const updateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, price, image, category, categoryId, stock, isActive } = req.body;

        const product = await Product.findByPk(id);

        if (!product) {
            return res.status(404).json({ message: 'Producto no encontrado' });
        }

        if (name !== undefined) product.name = name;
        if (description !== undefined) product.description = description;
        if (price !== undefined) product.price = price;
        if (image !== undefined) product.image = image;

        if (categoryId !== undefined || category !== undefined) {
            const resolved = await resolveCategoryIdAndName(
                categoryId !== undefined ? categoryId : product.categoryId,
                category !== undefined ? category : product.category
            );
            if (resolved.error) {
                return res.status(400).json({ message: resolved.error });
            }
            product.categoryId = resolved.categoryId;
            product.category = resolved.category;
        }

        if (isActive !== undefined) product.isActive = isActive;

        await product.save();

        const full = await Product.findByPk(product.id, { include: [categoryInclude] });
        res.json(formatProduct(full));
    } catch (error) {
        console.error('Error al actualizar producto:', error);
        res.status(500).json({ message: 'Error al actualizar producto', error: error.message });
    }
};

// Eliminar producto (solo admin) - Soft delete
export const deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;

        const product = await Product.findByPk(id);

        if (!product) {
            return res.status(404).json({ message: 'Producto no encontrado' });
        }

        product.isActive = false;
        await product.save();

        res.json({ message: 'Producto eliminado correctamente', product: formatProduct(await Product.findByPk(id, { include: [categoryInclude] })) });
    } catch (error) {
        console.error('Error al eliminar producto:', error);
        res.status(500).json({ message: 'Error al eliminar producto', error: error.message });
    }
};
