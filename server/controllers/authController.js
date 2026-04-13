import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User from '../models/User.js';
import RefreshToken from '../models/RefreshToken.js';

/**
 * Duración total de sesión (access + refresh + cookie alineados).
 * Por defecto 2 h; en .env: SESSION_DURATION_MS=7200000
 */
const SESSION_MS = Number(process.env.SESSION_DURATION_MS) || 2 * 60 * 60 * 1000;
const SESSION_SEC = Math.floor(SESSION_MS / 1000);

// JWT de acceso (misma ventana que la sesión)
const generateAccessToken = (userId) => {
    return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: SESSION_SEC });
};

/** Al renovar por refresh: el access no puede vivir más que el refresh restante. */
const generateAccessTokenForRemainder = (userId, expiresAt) => {
    const msLeft = expiresAt.getTime() - Date.now();
    const expiresInSec = Math.max(1, Math.floor(msLeft / 1000));
    return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: expiresInSec });
};

const generateRefreshToken = () => {
    return crypto.randomBytes(40).toString('hex');
};

// Guardar refresh token en la base de datos (misma caducidad que la sesión)
const saveRefreshToken = async (userId, token) => {
    const expiresAt = new Date(Date.now() + SESSION_MS);

    await RefreshToken.update(
        { revoked: true },
        { where: { userId, revoked: false } }
    );

    return await RefreshToken.create({
        token,
        userId,
        expiresAt,
        revoked: false
    });
};

/**
 * Front (p. ej. Vercel) y API (p. ej. Render) en distintos dominios: la cookie de refresh
 * debe usar SameSite=None y Secure o el navegador no la envía en fetch con credentials.
 */
function refreshCookieOptions() {
    const maxAge = SESSION_MS;
    if (process.env.NODE_ENV === 'production') {
        return {
            httpOnly: true,
            secure: true,
            sameSite: 'none',
            maxAge,
        };
    }
    return {
        httpOnly: true,
        secure: false,
        sameSite: 'strict',
        maxAge,
    };
}

function clearRefreshCookieOptions() {
    if (process.env.NODE_ENV === 'production') {
        return { path: '/', secure: true, sameSite: 'none' };
    }
    return { path: '/', sameSite: 'strict' };
}

// Verificar si ya existe un administrador
const hasAdmin = async () => {
    const admin = await User.findOne({ where: { role: 'administrador' } });
    return !!admin;
};

// Registrar usuario
export const register = async (req, res) => {
    try {
        const { names, surnames, email, phone, address, password, role } = req.body;

        // Validar campos requeridos
        if (!names || !surnames || !email || !phone || !address || !password) {
            return res.status(400).json({ message: 'Todos los campos son requeridos' });
        }

        // Verificar si el usuario ya existe
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ message: 'El correo electrónico ya está registrado' });
        }

        // Verificar si ya existe un administrador
        const adminExists = await hasAdmin();

        // Determinar el rol del nuevo usuario
        let userRole = 'cliente'; // Por defecto es cliente

        // Solo permitir crear admin si NO existe ninguno Y el usuario lo solicitó
        if (role === 'administrador' && !adminExists) {
            userRole = 'administrador';
        } else if (role === 'administrador' && adminExists) {
            // Si intentan crear admin pero ya existe uno, ignorar y crear como cliente
            userRole = 'cliente';
        }

        // Crear usuario
        const user = await User.create({
            names,
            surnames,
            email,
            phone,
            address,
            password,
            role: userRole
        });

        // Generar tokens
        const accessToken = generateAccessToken(user.id);
        const refreshToken = generateRefreshToken();
        await saveRefreshToken(user.id, refreshToken);

        res.cookie('refreshToken', refreshToken, refreshCookieOptions());

        res.status(201).json({
            message: 'Usuario registrado exitosamente',
            token: accessToken,
            user: {
                id: user.id,
                names: user.names,
                surnames: user.surnames,
                email: user.email,
                phone: user.phone,
                address: user.address,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Error en registro:', error);
        res.status(500).json({ message: 'Error al registrar usuario', error: error.message });
    }
};

// Endpoint para verificar si ya existe un administrador (para el frontend)
export const checkAdminExists = async (req, res) => {
    try {
        const adminExists = await hasAdmin();
        res.json({ hasAdmin: adminExists });
    } catch (error) {
        console.error('Error al verificar admin:', error);
        res.status(500).json({ message: 'Error al verificar administrador', error: error.message });
    }
};

// Iniciar sesión
export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Correo y contraseña son requeridos' });
        }

        // Buscar usuario
        const user = await User.findOne({ where: { email } });
        if (!user) {
            return res.status(401).json({ message: 'Credenciales inválidas' });
        }

        // Verificar contraseña
        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Credenciales inválidas' });
        }

        // Generar tokens
        const accessToken = generateAccessToken(user.id);
        const refreshToken = generateRefreshToken();
        await saveRefreshToken(user.id, refreshToken);

        res.cookie('refreshToken', refreshToken, refreshCookieOptions());

        res.json({
            message: 'Inicio de sesión exitoso',
            token: accessToken,
            user: {
                id: user.id,
                names: user.names,
                surnames: user.surnames,
                email: user.email,
                phone: user.phone,
                address: user.address,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({ message: 'Error al iniciar sesión', error: error.message });
    }
};

// Obtener perfil del usuario autenticado
export const getProfile = async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id, {
            attributes: { exclude: ['password'] }
        });

        res.json({ user });
    } catch (error) {
        console.error('Error al obtener perfil:', error);
        res.status(500).json({ message: 'Error al obtener perfil', error: error.message });
    }
};

// Actualizar datos del propio perfil (sin cambiar rol)
export const updateProfile = async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        const { names, surnames, email, phone, address } = req.body;

        if (names !== undefined && !String(names).trim()) {
            return res.status(400).json({ message: 'Los nombres son requeridos' });
        }
        if (surnames !== undefined && !String(surnames).trim()) {
            return res.status(400).json({ message: 'Los apellidos son requeridos' });
        }
        if (email !== undefined && !String(email).trim()) {
            return res.status(400).json({ message: 'El correo es requerido' });
        }
        if (address !== undefined && !String(address).trim()) {
            return res.status(400).json({ message: 'La dirección es requerida' });
        }

        const updates = {};
        if (names !== undefined) updates.names = String(names).trim();
        if (surnames !== undefined) updates.surnames = String(surnames).trim();
        if (email !== undefined) {
            const nextEmail = String(email).trim().toLowerCase();
            if (nextEmail !== user.email) {
                const taken = await User.findOne({ where: { email: nextEmail } });
                if (taken) {
                    return res.status(400).json({ message: 'El correo electrónico ya está en uso' });
                }
            }
            updates.email = nextEmail;
        }
        if (phone !== undefined) {
            const digits = String(phone).replace(/\D/g, '').slice(0, 9);
            if (digits.length !== 9) {
                return res.status(400).json({ message: 'El teléfono debe tener 9 dígitos' });
            }
            updates.phone = digits;
        }
        if (address !== undefined) updates.address = String(address).trim();

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ message: 'No hay cambios para guardar' });
        }

        await user.update(updates);

        const fresh = await User.findByPk(user.id, {
            attributes: { exclude: ['password'] },
        });
        return res.json({ user: fresh });
    } catch (error) {
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({ message: 'El correo electrónico ya está registrado' });
        }
        console.error('Error al actualizar perfil:', error);
        res.status(500).json({ message: 'Error al actualizar perfil', error: error.message });
    }
};

// Cambiar contraseña (usuario autenticado)
export const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: 'Contraseña actual y nueva contraseña son requeridas' });
        }
        if (String(newPassword).length < 6) {
            return res.status(400).json({ message: 'La nueva contraseña debe tener al menos 6 caracteres' });
        }

        const user = await User.findByPk(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        const ok = await user.comparePassword(currentPassword);
        if (!ok) {
            return res.status(401).json({ message: 'Contraseña actual incorrecta' });
        }

        await user.update({ password: newPassword });

        return res.json({ message: 'Contraseña actualizada correctamente' });
    } catch (error) {
        console.error('Error al cambiar contraseña:', error);
        res.status(500).json({ message: 'Error al cambiar contraseña', error: error.message });
    }
};

// Refrescar token de acceso
export const refreshToken = async (req, res) => {
    try {
        const { refreshToken: token } = req.cookies;

        if (!token) {
            return res.status(401).json({ message: 'Refresh token no proporcionado' });
        }

        // Buscar el refresh token en la base de datos
        const refreshTokenRecord = await RefreshToken.findOne({
            where: { token, revoked: false }
        });

        if (!refreshTokenRecord) {
            return res.status(403).json({ message: 'Refresh token inválido o revocado' });
        }

        // Verificar si el token expiró
        if (new Date() > refreshTokenRecord.expiresAt) {
            await refreshTokenRecord.update({ revoked: true });
            return res.status(403).json({ message: 'Refresh token expirado' });
        }

        // Verificar que el usuario aún existe
        const user = await User.findByPk(refreshTokenRecord.userId);
        if (!user) {
            await refreshTokenRecord.update({ revoked: true });
            return res.status(403).json({ message: 'Usuario no encontrado' });
        }

        const accessToken = generateAccessTokenForRemainder(
            refreshTokenRecord.userId,
            refreshTokenRecord.expiresAt
        );

        res.json({
            token: accessToken,
            message: 'Token refrescado exitosamente'
        });
    } catch (error) {
        console.error('Error al refrescar token:', error);
        res.status(500).json({ message: 'Error al refrescar token', error: error.message });
    }
};

// Cerrar sesión (revocar refresh token)
export const logout = async (req, res) => {
    try {
        const { refreshToken: token } = req.cookies;

        if (token) {
            await RefreshToken.update(
                { revoked: true },
                { where: { token } }
            );
        }

        res.clearCookie('refreshToken', clearRefreshCookieOptions());

        res.json({ message: 'Sesión cerrada exitosamente' });
    } catch (error) {
        console.error('Error al cerrar sesión:', error);
        res.status(500).json({ message: 'Error al cerrar sesión', error: error.message });
    }
};
