import User from '../models/User.js';

// Obtener todos los usuarios (clientes)
export const getAllUsers = async (req, res) => {
    try {
        const users = await User.findAll({
            attributes: { exclude: ['password'] },
            order: [['createdAt', 'DESC']]
        });
        res.json(users);
    } catch (error) {
        console.error('Error al obtener usuarios:', error);
        res.status(500).json({ message: 'Error al obtener usuarios', error: error.message });
    }
};

// Obtener un usuario por ID
export const getUserById = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await User.findByPk(id, {
            attributes: { exclude: ['password'] }
        });

        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        res.json(user);
    } catch (error) {
        console.error('Error al obtener usuario:', error);
        res.status(500).json({ message: 'Error al obtener usuario', error: error.message });
    }
};

// Crear un nuevo usuario (cliente)
export const createUser = async (req, res) => {
    try {
        const { names, surnames, email, phone, address, password, role } = req.body;

        if (!names || !surnames || !email || !phone || !address || !password) {
            return res.status(400).json({ message: 'Todos los campos son requeridos' });
        }

        // Verificar si el usuario ya existe
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ message: 'El correo electrónico ya está registrado' });
        }

        // Crear usuario (admin puede asignar rol)
        const user = await User.create({
            names,
            surnames,
            email,
            phone,
            address,
            password,
            role: role || 'cliente'
        });

        const userResponse = user.toJSON();
        delete userResponse.password;

        res.status(201).json({
            message: 'Usuario creado exitosamente',
            user: userResponse
        });
    } catch (error) {
        console.error('Error al crear usuario:', error);
        res.status(500).json({ message: 'Error al crear usuario', error: error.message });
    }
};

// Actualizar un usuario
export const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { names, surnames, email, phone, address, role } = req.body;

        const user = await User.findByPk(id);
        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        // Verificar si el email ya está en uso por otro usuario
        if (email && email !== user.email) {
            const existingUser = await User.findOne({ where: { email } });
            if (existingUser) {
                return res.status(400).json({ message: 'El correo electrónico ya está en uso' });
            }
        }

        // Actualizar campos
        if (names) user.names = names;
        if (surnames) user.surnames = surnames;
        if (email) user.email = email;
        if (phone) user.phone = phone;
        if (address) user.address = address;
        if (role) user.role = role;

        await user.save();

        const userResponse = user.toJSON();
        delete userResponse.password;

        res.json({
            message: 'Usuario actualizado exitosamente',
            user: userResponse
        });
    } catch (error) {
        console.error('Error al actualizar usuario:', error);
        res.status(500).json({ message: 'Error al actualizar usuario', error: error.message });
    }
};

// Eliminar un usuario
export const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;

        // No permitir eliminar al propio admin
        if (parseInt(id) === req.user.id) {
            return res.status(400).json({ message: 'No puedes eliminar tu propia cuenta' });
        }

        const user = await User.findByPk(id);
        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        await user.destroy();

        res.json({ message: 'Usuario eliminado exitosamente' });
    } catch (error) {
        console.error('Error al eliminar usuario:', error);
        res.status(500).json({ message: 'Error al eliminar usuario', error: error.message });
    }
};

