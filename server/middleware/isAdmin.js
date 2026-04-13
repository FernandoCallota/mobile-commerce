// Middleware para verificar que el usuario es administrador
// Debe usarse DESPUÉS de authenticateToken
export const isAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ message: 'Usuario no autenticado' });
    }

    if (req.user.role !== 'administrador') {
        return res.status(403).json({ message: 'Acceso denegado. Se requieren permisos de administrador.' });
    }

    next();
};

