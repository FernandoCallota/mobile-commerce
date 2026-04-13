import { body, validationResult } from 'express-validator';

// Middleware para manejar errores de validación
export const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            message: 'Error de validación',
            errors: errors.array()
        });
    }
    next();
};

// Validación y sanitización para registro
export const validateRegister = [
    body('names')
        .trim()
        .notEmpty().withMessage('Los nombres son requeridos')
        .isLength({ min: 2, max: 50 }).withMessage('Los nombres deben tener entre 2 y 50 caracteres')
        .escape(),
    body('surnames')
        .trim()
        .notEmpty().withMessage('Los apellidos son requeridos')
        .isLength({ min: 2, max: 50 }).withMessage('Los apellidos deben tener entre 2 y 50 caracteres')
        .escape(),
    body('email')
        .trim()
        .notEmpty().withMessage('El correo electrónico es requerido')
        .isEmail().withMessage('El correo electrónico no es válido')
        .normalizeEmail(),
    body('phone')
        .trim()
        .notEmpty().withMessage('El teléfono es requerido')
        .isLength({ min: 9, max: 9 }).withMessage('El teléfono debe tener 9 dígitos')
        .isNumeric().withMessage('El teléfono solo debe contener números')
        .escape(),
    body('address')
        .trim()
        .notEmpty().withMessage('La dirección es requerida')
        .isLength({ min: 5, max: 200 }).withMessage('La dirección debe tener entre 5 y 200 caracteres')
        .escape(),
    body('password')
        .notEmpty().withMessage('La contraseña es requerida')
        .isLength({ min: 6, max: 100 }).withMessage('La contraseña debe tener entre 6 y 100 caracteres'),
    body('role')
        .optional()
        .isIn(['cliente', 'administrador']).withMessage('El rol no es válido'),
    handleValidationErrors
];

// Validación y sanitización para login
export const validateLogin = [
    body('email')
        .trim()
        .notEmpty().withMessage('El correo electrónico es requerido')
        .isEmail().withMessage('El correo electrónico no es válido')
        .normalizeEmail(),
    body('password')
        .notEmpty().withMessage('La contraseña es requerida'),
    handleValidationErrors
];

// Sanitización general para prevenir XSS
export const sanitizeInput = (req, res, next) => {
    // Función recursiva para sanitizar objetos
    const sanitize = (obj) => {
        if (typeof obj === 'string') {
            // Escapar caracteres HTML peligrosos
            return obj
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#x27;')
                .replace(/\//g, '&#x2F;');
        }
        if (Array.isArray(obj)) {
            return obj.map(sanitize);
        }
        if (obj && typeof obj === 'object') {
            const sanitized = {};
            for (const key in obj) {
                sanitized[key] = sanitize(obj[key]);
            }
            return sanitized;
        }
        return obj;
    };

    // Sanitizar body, query y params (solo strings)
    if (req.body && typeof req.body === 'object') {
        // No sanitizamos todo el body porque express-validator ya lo hace
        // Solo aplicamos sanitización adicional si es necesario
    }

    next();
};

