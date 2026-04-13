import Product from '../models/Product.js';

// Obtener todos los productos
export const getAllProducts = async (req, res) => {
    try {
        // Si es admin, puede ver todos los productos (incluidos inactivos) para calcular bajo stock
        // Si no es admin, solo productos activos
        const isAdmin = req.user && req.user.role === 'administrador';
        const whereClause = isAdmin ? {} : { isActive: true };
        
        const products = await Product.findAll({
            where: whereClause,
            order: [['createdAt', 'DESC']]
        });
        res.json(products);
    } catch (error) {
        console.error('Error al obtener productos:', error);
        res.status(500).json({ message: 'Error al obtener productos', error: error.message });
    }
};

// Obtener un producto por ID
export const getProductById = async (req, res) => {
    try {
        const { id } = req.params;
        const product = await Product.findByPk(id);

        if (!product) {
            return res.status(404).json({ message: 'Producto no encontrado' });
        }

        res.json(product);
    } catch (error) {
        console.error('Error al obtener producto:', error);
        res.status(500).json({ message: 'Error al obtener producto', error: error.message });
    }
};

// Crear producto (solo admin)
export const createProduct = async (req, res) => {
    try {
        const { name, description, price, image, category, stock, isActive } = req.body;

        if (!name || !price) {
            return res.status(400).json({ message: 'Nombre y precio son requeridos' });
        }

        const product = await Product.create({
            name,
            description,
            price,
            image, // URL de Cloudinary
            category,
            stock: 0, // Siempre inicia con stock 0, se maneja con kardex
            isActive: isActive !== undefined ? Boolean(isActive) : true,
        });

        res.status(201).json(product);
    } catch (error) {
        console.error('Error al crear producto:', error);
        res.status(500).json({ message: 'Error al crear producto', error: error.message });
    }
};

// Actualizar producto (solo admin)
export const updateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, price, image, category, stock, isActive } = req.body;

        const product = await Product.findByPk(id);

        if (!product) {
            return res.status(404).json({ message: 'Producto no encontrado' });
        }

        // Actualizar solo los campos proporcionados (stock no se actualiza desde aquí, se maneja con kardex)
        if (name !== undefined) product.name = name;
        if (description !== undefined) product.description = description;
        if (price !== undefined) product.price = price;
        if (image !== undefined) product.image = image;
        if (category !== undefined) product.category = category;
        // stock se maneja con kardex, no se actualiza desde aquí
        if (isActive !== undefined) product.isActive = isActive;

        await product.save();

        res.json(product);
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

        // Soft delete: marcar como inactivo
        product.isActive = false;
        await product.save();

        res.json({ message: 'Producto eliminado correctamente', product });
    } catch (error) {
        console.error('Error al eliminar producto:', error);
        res.status(500).json({ message: 'Error al eliminar producto', error: error.message });
    }
};

